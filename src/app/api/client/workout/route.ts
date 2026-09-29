"use server";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server configuration is missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authenticate(request: Request) {
  const token = request.headers.get("authorization")?.startsWith("Bearer ")
    ? request.headers.get("authorization")!.slice(7)
    : null;
  if (!token) return null;
  const supabase = admin();
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const db = admin();
    const { data: client, error: clientError } = await db
      .from("clients")
      .select("id, first_name, last_name")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 400 });
    if (!client) return NextResponse.json({ error: "Client profile not found." }, { status: 404 });

    const { data: session, error: sessionError } = await db
      .from("workout_sessions")
      .select("id, workout_name, scheduled_date, status, completed_at, session_notes")
      .eq("client_id", client.id)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 400 });
    if (!session) return NextResponse.json({ client, workout: null });

    const { data: exercises, error: exerciseError } = await db
      .from("workout_exercises")
      .select("id, exercise_id, exercise_name_snapshot, exercise_order, prescribed_sets, prescribed_rep_min, prescribed_rep_max, prescribed_rir, prescribed_rest_seconds, notes")
      .eq("workout_session_id", session.id)
      .order("exercise_order", { ascending: true });

    if (exerciseError) return NextResponse.json({ error: exerciseError.message }, { status: 400 });

    const ids = (exercises ?? []).map((e) => e.id);
    const { data: sets, error: setsError } = ids.length
      ? await db.from("workout_sets").select("id, workout_exercise_id, set_number, weight, reps, rir, rpe, completed, notes").in("workout_exercise_id", ids).order("set_number", { ascending: true })
      : { data: [], error: null };

    if (setsError) return NextResponse.json({ error: setsError.message }, { status: 400 });

    return NextResponse.json({
      client,
      workout: {
        ...session,
        exercises: (exercises ?? []).map((exercise) => ({
          ...exercise,
          sets: (sets ?? []).filter((set) => set.workout_exercise_id === exercise.id),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load workout." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    const workoutExerciseId = typeof body.workoutExerciseId === "string" ? body.workoutExerciseId : "";
    const setNumber = Number(body.setNumber);
    if (!workoutExerciseId || !Number.isInteger(setNumber) || setNumber < 1) {
      return NextResponse.json({ error: "Workout exercise and set number are required." }, { status: 400 });
    }

    const db = admin();
    const { data: client } = await db.from("clients").select("id").eq("profile_id", user.id).maybeSingle();
    if (!client) return NextResponse.json({ error: "Client profile not found." }, { status: 404 });

    const { data: exercise } = await db.from("workout_exercises").select("id, workout_session_id").eq("id", workoutExerciseId).maybeSingle();
    if (!exercise) return NextResponse.json({ error: "Workout exercise not found." }, { status: 404 });

    const { data: session } = await db.from("workout_sessions").select("id").eq("id", exercise.workout_session_id).eq("client_id", client.id).maybeSingle();
    if (!session) return NextResponse.json({ error: "Workout access denied." }, { status: 403 });

    const payload = {
      workout_exercise_id: workoutExerciseId,
      set_number: setNumber,
      weight: body.weight === "" || body.weight == null ? null : Number(body.weight),
      reps: body.reps === "" || body.reps == null ? null : Number(body.reps),
      rir: body.rir === "" || body.rir == null ? null : Number(body.rir),
      completed: Boolean(body.completed),
    };

    const { data, error } = await db.from("workout_sets").upsert(payload, { onConflict: "workout_exercise_id,set_number" }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ set: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save set." }, { status: 500 });
  }
}