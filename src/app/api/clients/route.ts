import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing from the server deployment.");
  }

  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, goal, active, current_weight")
      .order("last_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ clients: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from("clients")
      .insert({
        first_name: body.firstName?.trim(),
        last_name: body.lastName?.trim(),
        date_of_birth: body.dateOfBirth || null,
        height_inches:
          body.heightFeet || body.heightInches
            ? Number(body.heightFeet || 0) * 12 + Number(body.heightInches || 0)
            : null,
        starting_weight: body.startingWeight ? Number(body.startingWeight) : null,
        current_weight: body.startingWeight ? Number(body.startingWeight) : null,
        goal: body.goal?.trim() || null,
        training_experience: body.trainingExperience?.trim() || null,
        activity_level: body.activityLevel?.trim() || null,
        notes: body.notes?.trim() || null,
        active: true,
      })
      .select("id, first_name, last_name, goal, active, current_weight")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ client: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
