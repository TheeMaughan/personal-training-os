"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type WorkoutSet = {
  id?: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  completed: boolean;
};

type WorkoutExercise = {
  id: string;
  exercise_name_snapshot: string;
  exercise_order: number;
  prescribed_sets: number;
  prescribed_rep_min: number;
  prescribed_rep_max: number;
  prescribed_rir: number | null;
  prescribed_rest_seconds: number | null;
  notes: string | null;
  sets: WorkoutSet[];
};

type Workout = {
  id: string;
  workout_name: string;
  scheduled_date: string | null;
  status: string;
  exercises: WorkoutExercise[];
};

export default function ClientDashboard() {
  const [name, setName] = useState("Client");
  const [email, setEmail] = useState("");
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [startedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restUntil, setRestUntil] = useState<number | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function load() {
      const [{ data: userData }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);

      if (userData.user) {
        setEmail(userData.user.email ?? "");
        const fullName = userData.user.user_metadata?.full_name;
        if (typeof fullName === "string" && fullName.trim()) setName(fullName);
      }

      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/client/workout", {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load workout.");
        setWorkout(result.workout);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load workout.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    if (!restUntil) return;
    const interval = window.setInterval(() => {
      if (Date.now() >= restUntil) setRestUntil(null);
    }, 250);
    return () => window.clearInterval(interval);
  }, [restUntil]);

  const completedCount = useMemo(
    () => workout?.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0) ?? 0,
    [workout]
  );
  const totalSets = useMemo(
    () => workout?.exercises.reduce((sum, exercise) => sum + exercise.prescribed_sets, 0) ?? 0,
    [workout]
  );

  async function saveSet(exercise: WorkoutExercise, set: WorkoutSet) {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    setSaving(set.id ?? `${exercise.id}-${set.set_number}`);
    try {
      const response = await fetch("/api/client/workout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workoutExerciseId: exercise.id,
          setNumber: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rir: set.rir,
          completed: set.completed,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save set.");
      set.id = result.set.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save set.");
      set.completed = !set.completed;
    } finally {
      setSaving("");
    }
  }

  function updateSet(exerciseId: string, setNumber: number, field: keyof WorkoutSet, value: string) {
    setWorkout((current) => current ? ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id !== exerciseId ? exercise : {
          ...exercise,
          sets: exercise.sets.map((set) =>
            set.set_number !== setNumber ? set : {
              ...set,
              [field]: field === "completed" ? value === "true" : value === "" ? null : Number(value),
            }
          ),
        }
      ),
    }) : current);
  }

  async function toggleSet(exercise: WorkoutExercise, set: WorkoutSet) {
    const next = !set.completed;
    updateSet(exercise.id, set.set_number, "completed", String(next));
    const updated = { ...set, completed: next };
    await saveSet(exercise, updated);
    if (next && exercise.prescribed_rest_seconds) setRestUntil(Date.now() + exercise.prescribed_rest_seconds * 1000);
  }

  async function signOut() {
    await getSupabaseClient().auth.signOut();
    window.location.href = "/login";
  }

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const restSeconds = restUntil ? Math.max(0, Math.ceil((restUntil - Date.now()) / 1000)) : 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Training OS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{workout ? workout.workout_name : `Welcome, ${name}`}</h1>
            <p className="mt-2 text-sm text-white/45">{email}</p>
          </div>
          <div className="flex items-center gap-3">
            {workout && <div className="rounded-lg border border-white/10 bg-[#111111] px-4 py-2 text-right"><div className="text-[10px] uppercase tracking-wider text-white/35">Workout time</div><div className="text-lg font-semibold">{formatTime(elapsed)}</div></div>}
            <button type="button" onClick={signOut} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75">Sign out</button>
          </div>
        </header>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Client navigation">
          {["Overview", "Program", "Workouts", "Progress", "Check-ins"].map((item, index) => (
            <span key={item} className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm ${index === 0 ? "bg-white font-medium text-black" : "border border-white/10 text-white/55"}`}>{item}</span>
          ))}
        </nav>

        {error && <div className="mt-6 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">{error}</div>}

        {loading ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-[#111111] p-8 text-sm text-white/50">Loading your workout...</section>
        ) : workout ? (
          <>
            <section className="mt-8 rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Today's Workout</div><h2 className="mt-2 text-2xl font-semibold tracking-tight">Log every set</h2><p className="mt-2 text-sm text-white/50">{completedCount} / {totalSets} sets completed</p></div>
                <div className="rounded-xl border border-white/10 bg-black px-5 py-4"><div className="text-xs uppercase tracking-wider text-white/35">Rest timer</div><div className="mt-1 text-xl font-semibold">{restSeconds ? formatTime(restSeconds) : "Ready"}</div></div>
              </div>
            </section>

            <div className="mt-5 space-y-4">
              {workout.exercises.map((exercise) => (
                <section key={exercise.id} className="rounded-2xl border border-white/10 bg-[#111111] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="text-lg font-semibold">{exercise.exercise_name_snapshot}</div><div className="mt-1 text-xs text-white/40">{exercise.prescribed_sets} sets · {exercise.prescribed_rep_min}–{exercise.prescribed_rep_max} reps{exercise.prescribed_rir != null ? ` · RIR ${exercise.prescribed_rir}` : ""}{exercise.prescribed_rest_seconds ? ` · Rest ${exercise.prescribed_rest_seconds}s` : ""}</div></div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <div className="grid grid-cols-[34px_1fr_1fr_48px] gap-2 px-1 text-[10px] uppercase tracking-wider text-white/30 sm:grid-cols-[42px_1fr_1fr_48px]"><span>Set</span><span>Weight</span><span>Reps</span><span></span></div>
                    {Array.from({ length: exercise.prescribed_sets }, (_, index) => {
                      const existing = exercise.sets.find((set) => set.set_number === index + 1);
                      const set = existing ?? { set_number: index + 1, weight: null, reps: null, rir: exercise.prescribed_rir, completed: false };
                      return (
                        <div key={set.set_number} className="grid grid-cols-[34px_1fr_1fr_48px] items-center gap-2 sm:grid-cols-[42px_1fr_1fr_48px]">
                          <span className="text-sm text-white/40">{set.set_number}</span>
                          <input type="number" step="0.5" value={set.weight ?? ""} onChange={(e) => updateSet(exercise.id, set.set_number, "weight", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white/30" placeholder="lbs" aria-label={`Set ${set.set_number} weight`} />
                          <input type="number" value={set.reps ?? ""} onChange={(e) => updateSet(exercise.id, set.set_number, "reps", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white/30" placeholder="reps" aria-label={`Set ${set.set_number} reps`} />
                          <button type="button" disabled={saving === (set.id ?? `${exercise.id}-${set.set_number}`)} onClick={() => void toggleSet(exercise, set)} className={`rounded-lg border px-2 py-2.5 text-sm font-semibold ${set.completed ? "border-white bg-white text-black" : "border-white/15 text-white/55"}`}>{saving === (set.id ?? `${exercise.id}-${set.set_number}`) ? "…" : "✓"}</button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-white/40">Training OS saves completed sets to your workout history.</div>
              <button type="button" onClick={() => setRestUntil(Date.now() + 120000)} className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black">{restSeconds ? `Rest ${restSeconds}s` : "Start 120s Rest"}</button>
            </div>
          </>
        ) : (
          <section className="mt-8 rounded-2xl border border-white/10 bg-[#111111] p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">No workout assigned</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">You're ready to train.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">When your trainer assigns your first workout, it will appear here with your prescribed sets, reps, RIR, rest periods, and set-by-set logging.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-black p-4"><div className="text-xs text-white/35">1</div><div className="mt-1 font-medium">Get assigned</div></div><div className="rounded-xl border border-white/10 bg-black p-4"><div className="text-xs text-white/35">2</div><div className="mt-1 font-medium">Log each set</div></div><div className="rounded-xl border border-white/10 bg-black p-4"><div className="text-xs text-white/35">3</div><div className="mt-1 font-medium">Progress over time</div></div></div>
          </section>
        )}
      </div>
    </main>
  );
}
