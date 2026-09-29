"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export default function ClientDashboard() {
  const [name, setName] = useState("Client");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setEmail(data.user.email ?? "");
        const fullName = data.user.user_metadata?.full_name;
        if (typeof fullName === "string" && fullName.trim()) setName(fullName);
      }
    }
    void loadProfile();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="border-b border-white/10 pb-7">
          <p className="text-sm font-medium text-white/50">Client Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {name}</h1>
          <p className="mt-2 text-sm text-white/50">{email}</p>
        </header>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Training</p>
            <h2 className="mt-1 text-xl font-semibold">Your program</h2>
            <p className="mt-3 text-sm leading-6 text-white/50">Your assigned workouts and training history will appear here as those features are built.</p>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white p-6 text-black">
            <p className="text-xs font-semibold uppercase tracking-wider text-black/50">Account</p>
            <h2 className="mt-1 text-xl font-semibold">You’re connected</h2>
            <p className="mt-3 text-sm leading-6 text-black/60">Your client account is authenticated and separated from the trainer workspace.</p>
            <button
              type="button"
              onClick={async () => {
                await getSupabaseClient().auth.signOut();
                window.location.href = "/login";
              }}
              className="mt-6 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
            >
              Sign out
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
