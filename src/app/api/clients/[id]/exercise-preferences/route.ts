import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return createClient(url, key);
}

async function trainer(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = admin();
  const { data } = await client.auth.getUser(token);
  if (!data.user) return null;
  const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return profile?.role === "trainer" ? client : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await trainer(request);
    if (!client) return NextResponse.json({ error: "Trainer authentication required." }, { status: 401 });
    const { id } = await params;
    const [{ data: exercises, error: exerciseError }, { data: preferences, error: preferenceError }] = await Promise.all([
      client.from("exercises").select("id,name,category,primary_muscle_group,secondary_muscle_groups,movement_pattern,active").eq("active", true).order("name"),
      client.from("client_exercise_preferences").select("exercise_id,preference,notes").eq("client_id", id),
    ]);
    if (exerciseError) throw exerciseError;
    if (preferenceError) throw preferenceError;
    const map = new Map((preferences || []).map((item) => [item.exercise_id, item]));
    return NextResponse.json({
      exercises: (exercises || []).map((exercise) => ({
        ...exercise,
        preference: map.get(exercise.id)?.preference ?? "neutral",
        notes: map.get(exercise.id)?.notes ?? "",
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load exercise preferences." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await trainer(request);
    if (!client) return NextResponse.json({ error: "Trainer authentication required." }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const exerciseId = String(body.exerciseId || "");
    const preference = String(body.preference || "neutral");
    if (!exerciseId) return NextResponse.json({ error: "Exercise ID is required." }, { status: 400 });
    if (!["favorite", "neutral", "avoid"].includes(preference)) return NextResponse.json({ error: "Invalid preference." }, { status: 400 });
    const { data, error } = await client.from("client_exercise_preferences").upsert({
      client_id: id,
      exercise_id: exerciseId,
      preference,
      notes: String(body.notes || "").trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "client_id,exercise_id" }).select("exercise_id,preference,notes").single();
    if (error) throw error;
    return NextResponse.json({ preference: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save exercise preference." }, { status: 500 });
  }
}
