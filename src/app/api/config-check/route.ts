import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return NextResponse.json({
    supabaseUrlPresent: Boolean(url),
    supabaseKeyPresent: Boolean(key),
    supabaseUrlLength: url?.length ?? 0,
    supabaseKeyLength: key?.length ?? 0,
    nodeEnv: process.env.NODE_ENV,
  });
}
