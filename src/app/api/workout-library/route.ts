import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function trainer(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = createClient(dbUrl, serviceKey);
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "trainer" ? admin : null;
}

export async function GET(req: NextRequest) {
  const db = await trainer(req);
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workouts, error } = await db.from("master_workouts")
    .select("id,name,goal,opt_phase_number,description,notes,active,master_workout_exercises(id,exercise_id,exercise_order,sets,rep_min,rep_max,target_rir,rest_seconds,notes,exercises(id,name,primary_muscle_group,secondary_muscle_groups,movement_pattern,equipment))")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: exercises, error: ee } = await db.from("exercises")
    .select("id,name,primary_muscle_group,secondary_muscle_groups,movement_pattern,equipment,category,active")
    .eq("active", true)
    .order("name");

  if (ee) return NextResponse.json({ error: ee.message }, { status: 500 });

  const exerciseIds = (exercises || []).map((e: any) => e.id);
  const { data: muscles, error: me } = exerciseIds.length
    ? await db.from("exercise_muscles").select("exercise_id,muscle_group,role,stimulus_weight").in("exercise_id", exerciseIds)
    : { data: [], error: null };

  if (me) return NextResponse.json({ error: me.message }, { status: 500 });

  const { data: equipmentRequirements, error: equipmentError } = exerciseIds.length
    ? await db.from("exercise_equipment").select("exercise_id,equipment_name,required").in("exercise_id", exerciseIds)
    : { data: [], error: null };
  if (equipmentError) return NextResponse.json({ error: equipmentError.message }, { status: 500 });

  const equipmentByExercise = new Map<string, any[]>();
  for (const row of equipmentRequirements || []) {
    if (!equipmentByExercise.has(row.exercise_id)) equipmentByExercise.set(row.exercise_id, []);
    equipmentByExercise.get(row.exercise_id)!.push(row);
  }

  return NextResponse.json({
    workouts: (workouts || []).map((w: any) => ({
      ...w,
      master_workout_exercises: [...(w.master_workout_exercises || [])]
        .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
        .map((row: any) => ({ ...row, equipment_requirements: equipmentByExercise.get(row.exercise_id) || [] })),
    })),
    exercises: exercises || [],
    exercise_muscles: muscles || [],
  });
}

export async function POST(req: NextRequest) {
  const db = await trainer(req);
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json();
  const action = String(b.action || "");


  if (action === "import_csv") {
    const rows = Array.isArray(b.rows) ? b.rows.slice(0, 5000) : [];
    if (!rows.length) return NextResponse.json({ error: "No CSV rows were supplied." }, { status: 400 });

    const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
    const { data: existingWorkouts } = await db.from("master_workouts").select("id,name");
    const { data: existingExercises } = await db.from("exercises").select("id,name").eq("active", true);

    const workoutMap = new Map<string, string>();
    for (const w of existingWorkouts || []) workoutMap.set(normalize(w.name), w.id);

    const exerciseMap = new Map<string, { id: string; name: string }[]>();
    for (const e of existingExercises || []) {
      const key = normalize(e.name);
      const list = exerciseMap.get(key) || [];
      list.push({ id: e.id, name: e.name });
      exerciseMap.set(key, list);
    }

    const createdWorkouts: Record<string, string> = {};
    const skippedWorkouts: string[] = [];
    const unmatchedExercises: { workout: string; exercise: string; row: number }[] = [];
    const ambiguousExercises: { workout: string; exercise: string; row: number; matches: string[] }[] = [];
    const invalidRows: { row: number; reason: string }[] = [];
    let importedExercises = 0;

    const grouped = new Map<string, any[]>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const workoutName = String(r.workout ?? r.Workout ?? "").trim();
      const exerciseName = String(r.exercise ?? r.Exercise ?? "").trim();
      if (!workoutName || !exerciseName) {
        invalidRows.push({ row: i + 2, reason: "Workout and Exercise are required." });
        continue;
      }
      const key = normalize(workoutName);
      const list = grouped.get(key) || [];
      list.push({ ...r, workoutName, exerciseName, sourceRow: i + 2 });
      grouped.set(key, list);
    }

    for (const [workoutKey, workoutRows] of grouped) {
      const first = workoutRows[0];
      if (workoutMap.has(workoutKey)) {
        skippedWorkouts.push(first.workoutName);
        continue;
      }

      const phaseRaw = Number(first.opt_phase ?? first.OPT_Phase ?? first.phase ?? "");
      const phase = Number.isFinite(phaseRaw) && phaseRaw >= 1 && phaseRaw <= 5 ? phaseRaw : null;
      const { data: workout, error: workoutError } = await db.from("master_workouts").insert({
        name: first.workoutName,
        goal: String(first.goal ?? first.Goal ?? "").trim() || null,
        opt_phase_number: phase,
        description: String(first.description ?? first.Description ?? "").trim() || null,
        notes: String(first.workout_notes ?? first.Workout_Notes ?? first.notes ?? first.Notes ?? "").trim() || null,
      }).select("id").single();

      if (workoutError || !workout) {
        invalidRows.push({ row: first.sourceRow, reason: workoutError?.message || "Could not create workout." });
        continue;
      }

      createdWorkouts[first.workoutName] = workout.id;
      workoutMap.set(workoutKey, workout.id);

      const exerciseRows: any[] = [];
      for (let i = 0; i < workoutRows.length; i++) {
        const r = workoutRows[i];
        const matches = exerciseMap.get(normalize(r.exerciseName)) || [];
        if (!matches.length) {
          unmatchedExercises.push({ workout: first.workoutName, exercise: r.exerciseName, row: r.sourceRow });
          continue;
        }
        if (matches.length > 1) {
          ambiguousExercises.push({ workout: first.workoutName, exercise: r.exerciseName, row: r.sourceRow, matches: matches.map(m => m.name) });
          continue;
        }

        const sets = Math.max(1, Math.min(20, Number(r.sets ?? r.Sets) || 3));
        const repMin = Math.max(1, Math.min(100, Number(r.rep_min ?? r.Rep_Min ?? r.min_reps ?? r.Min_Reps) || 8));
        const repMax = Math.max(repMin, Math.min(100, Number(r.rep_max ?? r.Rep_Max ?? r.max_reps ?? r.Max_Reps) || 12));
        const rirValue = r.rir ?? r.RIR ?? r.target_rir ?? r.Target_RIR;
        const restValue = r.rest_seconds ?? r.Rest_Seconds ?? r.rest ?? r.Rest;
        const rir = rirValue === "" || rirValue == null ? null : Math.max(0, Math.min(10, Number(rirValue)));
        const rest = restValue === "" || restValue == null ? null : Math.max(0, Math.min(1800, Number(restValue)));

        exerciseRows.push({
          workout_id: workout.id,
          exercise_id: matches[0].id,
          exercise_order: i + 1,
          sets,
          rep_min: repMin,
          rep_max: repMax,
          target_rir: Number.isFinite(rir as number) ? rir : null,
          rest_seconds: Number.isFinite(rest as number) ? rest : null,
          notes: String(r.exercise_notes ?? r.Exercise_Notes ?? r.notes ?? r.Notes ?? "").trim() || null,
        });
      }

      if (exerciseRows.length) {
        const { error } = await db.from("master_workout_exercises").insert(exerciseRows);
        if (error) {
          invalidRows.push({ row: first.sourceRow, reason: `Workout created but exercises could not be imported: ${error.message}` });
        } else {
          importedExercises += exerciseRows.length;
        }
      }
    }

    return NextResponse.json({
      createdWorkouts: Object.keys(createdWorkouts).length,
      importedExercises,
      skippedWorkouts,
      unmatchedExercises,
      ambiguousExercises,
      invalidRows,
    });
  }

  if (action === "workout") {
    const name = String(b.name || "").trim();
    if (!name) return NextResponse.json({ error: "Workout name is required." }, { status: 400 });

    const { data, error } = await db.from("master_workouts").insert({
      name,
      goal: b.goal?.trim() || null,
      opt_phase_number: b.opt_phase_number ? Math.max(1, Math.min(5, Number(b.opt_phase_number))) : null,
      description: b.description?.trim() || null,
      notes: b.notes?.trim() || null,
    }).select("id").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ workout: data }, { status: 201 });
  }

  if (action === "exercise") {
    const wid = String(b.workout_id || "");
    const eid = String(b.exercise_id || "");

    const { data: w } = await db.from("master_workouts").select("id").eq("id", wid).single();
    if (!w) return NextResponse.json({ error: "Workout not found." }, { status: 404 });

    const { data: e } = await db.from("exercises").select("id").eq("id", eid).eq("active", true).single();
    if (!e) return NextResponse.json({ error: "Exercise not found." }, { status: 404 });

    const { data: max } = await db.from("master_workout_exercises")
      .select("exercise_order").eq("workout_id", wid).order("exercise_order", { ascending: false }).limit(1).maybeSingle();

    let row: any = {
      workout_id: wid,
      exercise_id: eid,
      exercise_order: (max?.exercise_order || 0) + 1,
      sets: Math.max(1, Math.min(20, Number(b.sets) || 3)),
      rep_min: Math.max(1, Math.min(100, Number(b.rep_min) || 8)),
      rep_max: Math.max(1, Math.min(100, Number(b.rep_max) || 12)),
      target_rir: b.target_rir === "" || b.target_rir == null ? null : Math.max(0, Math.min(10, Number(b.target_rir))),
      rest_seconds: b.rest_seconds === "" || b.rest_seconds == null ? null : Math.max(0, Math.min(1800, Number(b.rest_seconds))),
      notes: b.notes?.trim() || null,
    };
    if (row.rep_max < row.rep_min) row.rep_max = row.rep_min;

    const { data, error } = await db.from("master_workout_exercises").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ exercise: data }, { status: 201 });
  }

  if (action === "copy") {
    const { data: source } = await db.from("master_workouts")
      .select("id,name,goal,opt_phase_number,description,notes")
      .eq("id", b.workout_id).single();
    if (!source) return NextResponse.json({ error: "Workout not found." }, { status: 404 });

    const { data: copy, error: ce } = await db.from("master_workouts").insert({
      name: source.name + " Copy",
      goal: source.goal,
      opt_phase_number: source.opt_phase_number,
      description: source.description,
      notes: source.notes,
    }).select("id").single();

    if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });

    const { data: rows } = await db.from("master_workout_exercises")
      .select("exercise_id,exercise_order,sets,rep_min,rep_max,target_rir,rest_seconds,notes")
      .eq("workout_id", b.workout_id).order("exercise_order");

    if (rows?.length) {
      const { error } = await db.from("master_workout_exercises")
        .insert(rows.map((r: any) => ({ ...r, workout_id: copy.id })));
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workout: copy }, { status: 201 });
  }

  if (action === "copy_exercise") {
    const { data: source } = await db.from("master_workout_exercises")
      .select("workout_id,exercise_id,sets,rep_min,rep_max,target_rir,rest_seconds,notes")
      .eq("id", b.id).single();
    if (!source) return NextResponse.json({ error: "Exercise row not found." }, { status: 404 });

    const { data: max } = await db.from("master_workout_exercises")
      .select("exercise_order").eq("workout_id", source.workout_id)
      .order("exercise_order", { ascending: false }).limit(1).maybeSingle();

    const { data, error } = await db.from("master_workout_exercises").insert({
      ...source,
      exercise_order: (max?.exercise_order || 0) + 1,
    }).select("id").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ exercise: data }, { status: 201 });
  }

  if (action === "reorder_exercise") {
    const workoutId = String(b.workout_id || "");
    const orderedIds = Array.isArray(b.ordered_ids) ? b.ordered_ids.map(String) : [];
    if (!workoutId || !orderedIds.length) return NextResponse.json({ error: "Workout order is required." }, { status: 400 });

    const { data: rows, error: re } = await db.from("master_workout_exercises")
      .select("id,workout_id").eq("workout_id", workoutId);
    if (re) return NextResponse.json({ error: re.message }, { status: 500 });

    const valid = new Set((rows || []).map((r: any) => r.id));
    if (orderedIds.length !== valid.size || orderedIds.some((id: string) => !valid.has(id))) {
      return NextResponse.json({ error: "Invalid workout exercise order." }, { status: 400 });
    }

    // Use temporary negative orders first to avoid unique(workout_id, exercise_order) collisions.
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await db.from("master_workout_exercises")
        .update({ exercise_order: -(i + 1) }).eq("id", orderedIds[i]).eq("workout_id", workoutId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await db.from("master_workout_exercises")
        .update({ exercise_order: i + 1, updated_at: new Date().toISOString() })
        .eq("id", orderedIds[i]).eq("workout_id", workoutId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "update_workout") {
    const { error } = await db.from("master_workouts").update({
      name: String(b.name || "").trim(),
      goal: b.goal?.trim() || null,
      opt_phase_number: b.opt_phase_number ? Math.max(1, Math.min(5, Number(b.opt_phase_number))) : null,
      description: b.description?.trim() || null,
      notes: b.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update_exercise") {
    let row: any = {
      sets: Math.max(1, Math.min(20, Number(b.sets) || 1)),
      rep_min: Math.max(1, Math.min(100, Number(b.rep_min) || 1)),
      rep_max: Math.max(1, Math.min(100, Number(b.rep_max) || 1)),
      target_rir: b.target_rir === "" || b.target_rir == null ? null : Math.max(0, Math.min(10, Number(b.target_rir))),
      rest_seconds: b.rest_seconds === "" || b.rest_seconds == null ? null : Math.max(0, Math.min(1800, Number(b.rest_seconds))),
      notes: b.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (row.rep_max < row.rep_min) row.rep_max = row.rep_min;
    const { error } = await db.from("master_workout_exercises").update(row).eq("id", b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const db = await trainer(req);
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json();
  const table = b.type === "workout" ? "master_workouts" : b.type === "exercise" ? "master_workout_exercises" : null;
  if (!table) return NextResponse.json({ error: "Unknown delete type." }, { status: 400 });

  const { error } = await db.from(table).delete().eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
