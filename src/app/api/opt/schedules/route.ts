import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function admin() {
  if (!url || !serviceKey) throw new Error("Supabase server configuration is missing.");
  return createClient(url, serviceKey);
}

async function trainer(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = admin();
  const { data: auth, error } = await supabase.auth.getUser(token);
  if (error || !auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  return profile?.role === "trainer" ? { userId: auth.user.id, supabase } : null;
}

export async function GET(request: NextRequest) {
  const session = await trainer(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await session.supabase
    .from("opt_phase_schedules")
    .select("id,name,description,athlete_type,active,opt_schedule_phases(id,phase_order,weeks,opt_phases(id,phase_number,name,level))")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await trainer(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const athleteType = body.athleteType === "power" ? "power" : "normal";
  const phases = Array.isArray(body.phases) ? body.phases : [];
  if (!name || phases.length < 1) return NextResponse.json({ error: "Name and at least one phase are required." }, { status: 400 });

  const sb = session.supabase;
  const { data: schedule, error } = await sb.from("opt_phase_schedules")
    .insert({ name, description: description || null, athlete_type: athleteType })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = phases.map((p: { phaseId: string; weeks: number }, i: number) => ({
    schedule_id: schedule.id,
    phase_id: p.phaseId,
    phase_order: i + 1,
    weeks: Math.max(1, Math.min(52, Number(p.weeks) || 1)),
  }));
  const { error: phaseError } = await sb.from("opt_schedule_phases").insert(rows);
  if (phaseError) {
    await sb.from("opt_phase_schedules").delete().eq("id", schedule.id);
    return NextResponse.json({ error: phaseError.message }, { status: 400 });
  }
  return NextResponse.json({ id: schedule.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await trainer(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const id = String(body.id ?? "");
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const athleteType = body.athleteType === "power" ? "power" : "normal";
  const phases = Array.isArray(body.phases) ? body.phases : [];
  if (!id || !name || !phases.length) return NextResponse.json({ error: "Schedule, name, and phases are required." }, { status: 400 });

  const sb = session.supabase;
  const { error } = await sb.from("opt_phase_schedules")
    .update({ name, description: description || null, athlete_type: athleteType, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: deleteError } = await sb.from("opt_schedule_phases").delete().eq("schedule_id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const rows = phases.map((p: { phaseId: string; weeks: number }, i: number) => ({
    schedule_id: id,
    phase_id: p.phaseId,
    phase_order: i + 1,
    weeks: Math.max(1, Math.min(52, Number(p.weeks) || 1)),
  }));
  const { error: phaseError } = await sb.from("opt_schedule_phases").insert(rows);
  if (phaseError) return NextResponse.json({ error: phaseError.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await trainer(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Schedule id is required." }, { status: 400 });
  const { error } = await session.supabase.from("opt_phase_schedules").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}