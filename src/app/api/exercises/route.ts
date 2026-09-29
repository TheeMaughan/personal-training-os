"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return createClient(url, key);
}

async function requireTrainer(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!token) return null;
  const client = admin();
  const { data } = await client.auth.getUser(token);
  if (!data.user) return null;
  const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return profile?.role === "trainer" ? client : null;
}

export async function GET(request: NextRequest) {
  try {
    const client = await requireTrainer(request);
    if (!client) return NextResponse.json({ error: "Trainer authentication required." }, { status: 401 });
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    let query = client.from("exercises").select("id,name,category,primary_muscle_group,secondary_muscle_groups,equipment,instructions,setup,execution,coaching_cues,common_mistakes,video_url,movement_pattern,difficulty,opt_phases,active").order("name");
    if (q) query = query.ilike("name", "%" + q + "%");
    const { data, error } = await query;
    if (error) throw error;
    const ids = (data || []).map((x) => x.id);
    const muscles = ids.length ? await client.from("exercise_muscles").select("exercise_id,muscle_group,role,stimulus_weight").in("exercise_id", ids) : { data: [], error: null };
    const equipment = ids.length ? await client.from("exercise_equipment").select("exercise_id,equipment_name,required").in("exercise_id", ids) : { data: [], error: null };
    if (muscles.error) throw muscles.error;
    if (equipment.error) throw equipment.error;
    return NextResponse.json({ exercises: (data || []).map((x) => ({ ...x, muscles: (muscles.data || []).filter((m) => m.exercise_id === x.id), equipment_options: (equipment.data || []).filter((e) => e.exercise_id === x.id) })) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load exercises." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await requireTrainer(request);
    if (!client) return NextResponse.json({ error: "Trainer authentication required." }, { status: 401 });
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Exercise name is required." }, { status: 400 });
    const { data: exercise, error } = await client.from("exercises").insert({ name, category: String(body.category || "").trim() || null, primary_muscle_group: String(body.primaryMuscleGroup || "").trim() || null, secondary_muscle_groups: Array.isArray(body.secondaryMuscleGroups) ? body.secondaryMuscleGroups : [], equipment: String(body.equipment || "").trim() || null, instructions: String(body.instructions || "").trim() || null, movement_pattern: String(body.movementPattern || "").trim() || null, difficulty: String(body.difficulty || "").trim() || null, opt_phases: Array.isArray(body.optPhases) ? body.optPhases : [], active: body.active !== false }).select("id").single();
    if (error) throw error;
    const muscles = Array.isArray(body.muscles) ? body.muscles : [];
    if (muscles.length) {
      const { error: e } = await client.from("exercise_muscles").insert(muscles.map((m: { muscleGroup: string; role?: string; stimulusWeight?: number }) => ({ exercise_id: exercise.id, muscle_group: String(m.muscleGroup).trim(), role: m.role === "secondary" ? "secondary" : "primary", stimulus_weight: Math.max(0, Math.min(2, Number(m.stimulusWeight ?? 1))) })));
      if (e) throw e;
    }
    const equipment = Array.isArray(body.equipmentOptions) ? body.equipmentOptions : [];
    if (equipment.length) {
      const { error: e } = await client.from("exercise_equipment").insert(equipment.map((x: { equipmentName: string; required?: boolean }) => ({ exercise_id: exercise.id, equipment_name: String(x.equipmentName).trim(), required: x.required !== false })));
      if (e) throw e;
    }
    return NextResponse.json({ id: exercise.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create exercise." }, { status: 500 });
  }
}
