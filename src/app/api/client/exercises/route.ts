import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return createClient(url, key);
}

async function clientContext(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const db = admin();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "client") return null;
  const { data: client } = await db.from("clients").select("id").eq("profile_id", user.id).maybeSingle();
  return client ? { db, clientId: client.id } : null;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await clientContext(req);
    if (!ctx) return NextResponse.json({ error: "Client authentication required." }, { status: 401 });

    const { db, clientId } = ctx;
    const [{ data: exercises, error: ee }, { data: equipment, error: ae }, { data: requirements, error: re }, { data: preferences, error: pe }] = await Promise.all([
      db.from("exercises").select("id,name,category,primary_muscle_group,secondary_muscle_groups,movement_pattern,difficulty,instructions,setup,execution,coaching_cues,video_url").eq("active", true).order("name"),
      db.from("client_equipment").select("equipment_id,available").eq("client_id", clientId),
      db.from("exercise_equipment").select("exercise_id,equipment_name,required").in("exercise_id", (await db.from("exercises").select("id").eq("active", true)).data?.map((x: any) => x.id) || []),
      db.from("client_exercise_preferences").select("exercise_id,preference").eq("client_id", clientId),
    ]);

    if (ee) throw ee;
    if (ae) throw ae;
    if (re) throw re;
    if (pe) throw pe;

    const availableEquipmentIds = new Set((equipment || []).filter((x: any) => x.available).map((x: any) => x.equipment_id));
    const masterEquipment = await db.from("equipment").select("id,name").eq("active", true);
    if (masterEquipment.error) throw masterEquipment.error;
    const availableNames = new Set((masterEquipment.data || []).filter((x: any) => availableEquipmentIds.has(x.id)).map((x: any) => x.name.toLowerCase()));
    const prefMap = new Map((preferences || []).map((x: any) => [x.exercise_id, x.preference]));

    const byExercise = new Map<string, any[]>();
    for (const row of requirements || []) {
      if (!byExercise.has(row.exercise_id)) byExercise.set(row.exercise_id, []);
      byExercise.get(row.exercise_id)!.push(row);
    }

    const result = (exercises || []).map((exercise: any) => {
      const reqs = byExercise.get(exercise.id) || [];
      const required = reqs.filter((x: any) => x.required);
      const optional = reqs.filter((x: any) => !x.required);
      const missingRequired = required.filter((x: any) => !availableNames.has(String(x.equipment_name).toLowerCase()));
      const availableOptional = optional.filter((x: any) => availableNames.has(String(x.equipment_name).toLowerCase()));
      const status = missingRequired.length === 0 ? "available" : missingRequired.length <= 2 ? "near_match" : "unavailable";
      return {
        ...exercise,
        preference: prefMap.get(exercise.id) || "neutral",
        equipment: {
          required: required.map((x: any) => x.equipment_name),
          optional: optional.map((x: any) => x.equipment_name),
          missing: missingRequired.map((x: any) => x.equipment_name),
          availableOptional: availableOptional.map((x: any) => x.equipment_name),
        },
        availability: status,
      };
    });

    return NextResponse.json({
      available: result.filter(x => x.availability === "available"),
      nearMatches: result.filter(x => x.availability === "near_match"),
      unavailable: result.filter(x => x.availability === "unavailable"),
      availableEquipment: [...availableNames],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load exercise availability." }, { status: 500 });
  }
}
