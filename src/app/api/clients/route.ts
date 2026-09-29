import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServerSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing from the server deployment.");
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("The Supabase service role key is not configured on the server.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getAuthenticatedClient(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!accessToken) {
    return { supabase: null, user: null, error: "Authentication required." };
  }

  const supabase = getServerSupabase(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return { supabase: null, user: null, error: "Authentication required." };
  }

  return { supabase, user: data.user, error: null };
}

async function requireTrainer(request: Request) {
  const auth = await getAuthenticatedClient(request);

  if (auth.error || !auth.supabase || !auth.user) {
    return { ...auth, error: auth.error ?? "Authentication required." };
  }

  const admin = getAdminSupabase();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) {
    return {
      ...auth,
      error: `Trainer profile lookup failed: ${error.message}`,
    };
  }

  if (!profile) {
    return {
      ...auth,
      error: `No trainer profile found for authenticated user ${auth.user.id}.`,
    };
  }

  if (profile.role !== "trainer") {
    return {
      ...auth,
      error: `Authenticated user ${auth.user.id} has profile role "${profile.role}".`,
    };
  }

  return { ...auth, error: null };
}

export async function GET(request: Request) {
  try {
    const { supabase, error: authError } = await requireTrainer(request);

    if (authError || !supabase) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

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
    const { supabase, user, error: authError } = await requireTrainer(request);

    if (authError || !supabase || !user) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    const body = await request.json();
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required to invite a client." },
        { status: 400 }
      );
    }

    const admin = getAdminSupabase();
    // Build the invite redirect from the live app request so a stale localhost
    // NEXT_PUBLIC_SITE_URL value can never send production invites to localhost.
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
      "https://personal-training-os.vercel.app";

    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        role: "client",
      },
      redirectTo: `${siteUrl}/set-password`,
    });

    if (inviteError || !invite.user) {
      return NextResponse.json(
        { error: inviteError?.message || "Unable to send the client invitation." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: invite.user.id,
        full_name: `${firstName} ${lastName}`.trim(),
        email,
        role: "client",
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: profileError?.message || "Client account was invited, but the profile could not be created." },
        { status: 500 }
      );
    }

    const { data: client, error: clientError } = await admin
      .from("clients")
      .insert({
        profile_id: profile.id,
        first_name: firstName,
        last_name: lastName,
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

    if (clientError || !client) {
      return NextResponse.json(
        { error: clientError?.message || "Client account was invited, but the client profile could not be created." },
        { status: 500 }
      );
    }

    return NextResponse.json({ client, invitationSent: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
