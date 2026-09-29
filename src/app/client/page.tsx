"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type TileProps = {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  light?: boolean;
};

function Tile({ eyebrow, title, description, status, light = false }: TileProps) {
  return (
    <section
      className={[
        "rounded-2xl border p-6",
        light
          ? "border-white bg-white text-black"
          : "border-white/10 bg-[#111111] text-white",
      ].join(" ")}
    >
      <div className={light ? "text-black/50" : "text-white/40"}>{eyebrow}</div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
      <p className={light ? "mt-3 text-sm leading-6 text-black/60" : "mt-3 text-sm leading-6 text-white/50"}>
        {description}
      </p>
      {status && (
        <div
          className={[
            "mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-medium",
            light
              ? "border-black/10 bg-black/5 text-black/60"
              : "border-white/10 bg-white/5 text-white/50",
          ].join(" ")}
        >
          {status}
        </div>
      )}
    </section>
  );
}

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
        if (typeof fullName === "string" && fullName.trim()) {
          setName(fullName);
        }
      }
    }

    void loadProfile();
  }, []);

  async function signOut() {
    await getSupabaseClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              Training OS
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome, {name}
            </h1>
            <p className="mt-2 text-sm text-white/45">{email}</p>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="self-start rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white sm:self-auto"
          >
            Sign out
          </button>
        </header>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Client navigation">
          {["Overview", "Program", "Workouts", "Progress", "Check-ins"].map((item, index) => (
            <span
              key={item}
              className={[
                "whitespace-nowrap rounded-lg px-3.5 py-2 text-sm",
                index === 0
                  ? "bg-white font-medium text-black"
                  : "border border-white/10 text-white/55",
              ].join(" ")}
            >
              {item}
            </span>
          ))}
        </nav>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Today
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your training starts here</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                Once your trainer assigns a program, your next workout, exercises, targets, and workout history will appear here.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black px-5 py-4 lg:min-w-48">
              <div className="text-xs uppercase tracking-wider text-white/35">Current status</div>
              <div className="mt-1 text-lg font-semibold">No program assigned</div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Tile
            eyebrow="Training"
            title="Your Program"
            description="Your assigned training plan, weekly schedule, and exercise targets will live here."
            status="Awaiting assignment"
            light
          />
          <Tile
            eyebrow="Workout"
            title="Next Workout"
            description="Start your scheduled session, log every set, and keep your training history in one place."
            status="Not scheduled"
          />
          <Tile
            eyebrow="Progress"
            title="Your Progress"
            description="Track performance, measurements, completed workouts, and progression over time."
            status="No data yet"
          />
          <Tile
            eyebrow="Check-ins"
            title="Weekly Check-in"
            description="Submit your check-in information so your trainer can review how training is going."
            status="Not available yet"
          />
          <Tile
            eyebrow="Nutrition"
            title="Nutrition"
            description="Your nutrition targets and coaching information will appear here when assigned."
            status="Coming next"
          />
          <Tile
            eyebrow="Account"
            title="Client Account"
            description="Your Training OS account is authenticated and separated from the trainer workspace."
            status="Connected"
          />
        </div>
      </div>
    </main>
  );
}