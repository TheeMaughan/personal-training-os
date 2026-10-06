"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Exercise = {
  id: string;
  name: string;
  category: string | null;
  primary_muscle_group: string | null;
  secondary_muscle_groups: string[] | null;
  movement_pattern: string | null;
};

type Row = {
  id: string;
  exercise_id: string;
  sets: number;
  rep_min: number;
  rep_max: number;
  target_rir: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise?: Exercise;
};

type Workout = {
  id: string;
  name: string;
  workout_order: number;
  opt_phase_number: number | null;
  program_builder_exercises: Row[];
};

type LibraryRow = {
  exercise_id: string;
  exercise_order: number;
  sets: number;
  rep_min: number;
  rep_max: number;
  target_rir: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise?: Exercise;
};

type LibraryWorkout = {
  id: string;
  name: string;
  goal: string | null;
  opt_phase_number: number | null;
  description: string | null;
  notes: string | null;
  master_workout_exercises: LibraryRow[];
};

type OptPhase = {
  phase_order: number;
  weeks: number;
  phase_number: number;
  name: string;
  level: string;
};

export default function ProgramEditor({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [program, setProgram] = useState<any>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [library, setLibrary] = useState<LibraryWorkout[]>([]);
  const [optPhases, setOptPhases] = useState<OptPhase[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [newWorkout, setNewWorkout] = useState("");
  const [newWorkoutPhase, setNewWorkoutPhase] = useState("");
  const [libraryId, setLibraryId] = useState("");
  const [libraryPhase, setLibraryPhase] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState(3);
  const [repMin, setRepMin] = useState(8);
  const [repMax, setRepMax] = useState(12);
  const [rir, setRir] = useState(2);
  const [rest, setRest] = useState(90);
  const [search, setSearch] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [msg, setMsg] = useState("");

  const client = getSupabaseClient();

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  async function token() {
    const { data } = await client.auth.getSession();
    return data.session?.access_token || "";
  }

  async function load() {
    if (!id) return;
    const t = await token();
    const r = await fetch("/api/programs/" + id, {
      headers: { Authorization: "Bearer " + t },
    });
    const d = await r.json();
    if (r.ok) {
      setProgram(d.program);
      setWorkouts(d.workouts || []);
      setLibrary(d.workout_library || []);
      setOptPhases(d.opt_phases || []);
      setExercises(d.exercises || []);
      if (!selectedWorkout && d.workouts?.[0]) setSelectedWorkout(d.workouts[0].id);
      if (!newWorkoutPhase && d.opt_phases?.[0]) setNewWorkoutPhase(String(d.opt_phases[0].phase_number));
    } else {
      setMsg(d.error || "Unable to load program.");
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const filtered = useMemo(
    () => exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 40),
    [exercises, search]
  );

  const filteredLibrary = useMemo(
    () =>
      library.filter((w) =>
        [w.name, w.goal, w.description, w.notes, w.opt_phase_number ? `phase ${w.opt_phase_number}` : ""]
          .join(" ")
          .toLowerCase()
          .includes(librarySearch.toLowerCase())
      ),
    [library, librarySearch]
  );

  const selectedLibrary = library.find((w) => w.id === libraryId);

  useEffect(() => {
    if (selectedLibrary?.opt_phase_number && optPhases.some((p) => p.phase_number === selectedLibrary.opt_phase_number)) {
      setLibraryPhase(String(selectedLibrary.opt_phase_number));
    } else {
      setLibraryPhase("");
    }
  }, [libraryId, selectedLibrary, optPhases]);

  const coverage = useMemo(() => {
    const m: Record<string, number> = {};
    for (const w of workouts) {
      for (const x of w.program_builder_exercises || []) {
        if (x.exercise?.primary_muscle_group) {
          m[x.exercise.primary_muscle_group] = (m[x.exercise.primary_muscle_group] || 0) + x.sets;
        }
      }
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [workouts]);

  async function post(body: any) {
    const t = await token();
    const r = await fetch("/api/programs/" + id, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) {
      setMsg(d.error || "Unable to save.");
      return false;
    }
    setMsg("Saved.");
    await load();
    return true;
  }

  async function addWorkout(e: React.FormEvent) {
    e.preventDefault();
    if (await post({ action: "workout", name: newWorkout, opt_phase_number: newWorkoutPhase || null })) {
      setNewWorkout("");
    }
  }

  async function importLibrary(e: React.FormEvent) {
    e.preventDefault();
    if (!libraryId) {
      setMsg("Select a master workout.");
      return;
    }
    await post({
      action: "import_library_workout",
      library_workout_id: libraryId,
      opt_phase_number: libraryPhase || null,
    });
  }

  async function addExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkout || !exerciseId) {
      setMsg("Select a workout and exercise.");
      return;
    }
    await post({
      action: "exercise",
      workout_id: selectedWorkout,
      exercise_id: exerciseId,
      sets,
      rep_min: repMin,
      rep_max: repMax,
      target_rir: rir,
      rest_seconds: rest,
    });
  }

  async function remove(type: string, id2: string, wid?: string) {
    const t = await token();
    await fetch("/api/programs/" + id, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
      body: JSON.stringify({ type, id: id2, workout_id: wid }),
    });
    load();
  }

  const phaseLabel = (number: number | null) => {
    if (!number) return "Unassigned";
    const phase = optPhases.find((p) => p.phase_number === number);
    return phase ? `Phase ${phase.phase_number} · ${phase.name}` : `Phase ${number}`;
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl p-5 lg:p-8">
        <a href="/programs" className="text-sm text-white/40 hover:text-white">← Programs</a>
        <header className="mt-6">
          <p className="text-xs uppercase tracking-[.2em] text-white/40">Program Builder</p>
          <h1 className="mt-2 text-3xl font-semibold">{program?.name || "Loading..."}</h1>
          <p className="mt-2 text-sm text-white/50">
            {program?.duration_weeks} weeks · {program?.days_per_week} days/week
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {optPhases.map((p) => (
              <span key={p.phase_number} className="rounded-full border border-white/10 bg-[#111] px-3 py-1 text-xs text-white/60">
                P{p.phase_number} · {p.name} · {p.weeks}w
              </span>
            ))}
            {!optPhases.length && <span className="text-xs text-white/40">No OPT schedule assigned to this program.</span>}
          </div>
        </header>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_300px]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
              <h2 className="font-medium">Add From Workout Library</h2>
              <p className="mt-1 text-xs text-white/40">Imports a snapshot. Future master-workout edits will not change this program.</p>
              <form onSubmit={importLibrary} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr_auto]">
                <input value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} placeholder="Search master workouts..." className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm" />
                <select value={libraryId} onChange={(e) => setLibraryId(e.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm">
                  <option value="">Choose master workout</option>
                  {filteredLibrary.map((w) => <option key={w.id} value={w.id}>{w.name}{w.opt_phase_number ? ` · Phase ${w.opt_phase_number}` : ""}</option>)}
                </select>
                <select value={libraryPhase} onChange={(e) => setLibraryPhase(e.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm">
                  <option value="">Keep library phase / unassigned</option>
                  {optPhases.map((p) => <option key={p.phase_number} value={p.phase_number}>Phase {p.phase_number} · {p.name}</option>)}
                </select>
                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Add To Program</button>
              </form>
              {selectedLibrary && (
                <div className="mt-4 rounded-xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{selectedLibrary.name}</div>
                      <div className="text-xs text-white/40">{selectedLibrary.goal || "No goal"}{selectedLibrary.opt_phase_number ? ` · OPT Phase ${selectedLibrary.opt_phase_number}` : ""} · {selectedLibrary.master_workout_exercises.length} exercises</div>
                    </div>
                    <div className="text-xs text-white/40">Preview</div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {selectedLibrary.master_workout_exercises.slice(0, 8).map((x, i) => (
                      <div key={`${x.exercise_id}-${i}`} className="rounded-lg bg-black p-2 text-xs">
                        <div>{i + 1}. {x.exercise?.name || "Exercise"}</div>
                        <div className="mt-1 text-white/40">{x.sets} sets · {x.rep_min}-{x.rep_max} reps · RIR {x.target_rir ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={addWorkout} className="grid gap-3 rounded-2xl border border-white/10 bg-[#111] p-4 lg:grid-cols-[1fr_1fr_auto]">
              <input required value={newWorkout} onChange={(e) => setNewWorkout(e.target.value)} placeholder="New workout name (e.g. Upper A)" className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm" />
              <select value={newWorkoutPhase} onChange={(e) => setNewWorkoutPhase(e.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm">
                <option value="">No OPT phase</option>
                {optPhases.map((p) => <option key={p.phase_number} value={p.phase_number}>Phase {p.phase_number} · {p.name}</option>)}
              </select>
              <button className="rounded-xl bg-white px-5 text-sm font-semibold text-black">Add Workout</button>
            </form>

            <form onSubmit={addExercise} className="rounded-2xl border border-white/10 bg-[#111] p-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr_repeat(4,90px)]">
                <select value={selectedWorkout} onChange={(e) => setSelectedWorkout(e.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="">Workout</option>{workouts.map((w) => <option key={w.id} value={w.id}>{w.workout_order}. {w.name}</option>)}</select>
                <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"><option value="">Exercise</option>{filtered.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                <input type="number" min="1" max="20" value={sets} onChange={(e) => setSets(+e.target.value || 1)} title="Sets" className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
                <input type="number" min="1" max="100" value={repMin} onChange={(e) => setRepMin(+e.target.value || 1)} title="Min reps" className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
                <input type="number" min="1" max="100" value={repMax} onChange={(e) => setRepMax(+e.target.value || 1)} title="Max reps" className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
                <button className="rounded-xl bg-white px-4 text-sm font-semibold text-black">Add</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter exercises..." className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm" />
                <label className="text-xs text-white/40">RIR<input type="number" min="0" max="10" value={rir} onChange={(e) => setRir(+e.target.value || 0)} className="ml-2 w-16 rounded-lg border border-white/10 bg-black px-2 py-2 text-white" /></label>
                <label className="text-xs text-white/40">Rest<input type="number" min="0" max="1800" value={rest} onChange={(e) => setRest(+e.target.value || 0)} className="ml-2 w-20 rounded-lg border border-white/10 bg-black px-2 py-2 text-white" /></label>
              </div>
            </form>

            {workouts.map((w) => (
              <article key={w.id} className="rounded-2xl border border-white/10 bg-[#111] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-white/40">Workout {w.workout_order}</span>
                    <h2 className="mt-1 text-xl font-medium">{w.name}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">{phaseLabel(w.opt_phase_number)}</span>
                    <button onClick={() => remove("workout", w.id)} className="text-xs text-white/40 hover:text-white">Remove</button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {w.program_builder_exercises?.map((x) => (
                    <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
                      <div><div className="font-medium">{x.exercise?.name || "Exercise"}</div><div className="text-xs text-white/40">{x.sets} sets · {x.rep_min}-{x.rep_max} reps · RIR {x.target_rir ?? "—"} · {x.rest_seconds ?? 0}s rest</div></div>
                      <button onClick={() => remove("exercise", x.id, w.id)} className="text-xs text-white/40 hover:text-white">Remove</button>
                    </div>
                  ))}
                  {!w.program_builder_exercises?.length && <p className="py-4 text-sm text-white/40">No exercises yet.</p>}
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-2xl border border-white/10 bg-[#111] p-5">
            <h2 className="font-medium">OPT Schedule</h2>
            <p className="mt-1 text-xs text-white/40">This program follows the selected schedule. Each workout can be assigned to one of its phases.</p>
            <div className="mt-4 space-y-2">
              {optPhases.map((p) => <div key={p.phase_number} className="rounded-xl border border-white/10 p-3"><div className="text-sm font-medium">Phase {p.phase_number} · {p.name}</div><div className="mt-1 text-xs text-white/40">{p.level} · {p.weeks} weeks</div></div>)}
              {!optPhases.length && <p className="text-sm text-white/40">Assign an OPT schedule to this program to use phase planning.</p>}
            </div>
            <div className="mt-6 border-t border-white/10 pt-5"><h2 className="font-medium">Muscle Coverage</h2><p className="mt-1 text-xs text-white/40">Direct primary-muscle sets across this template.</p><div className="mt-4 space-y-3">{coverage.map(([m, n]) => <div key={m}><div className="flex justify-between text-sm"><span>{m}</span><span className="text-white/40">{n} sets</span></div><div className="mt-1 h-1 rounded bg-white/10"><div className="h-1 rounded bg-white" style={{ width: Math.min(100, n * 5) + "%" }} /></div></div>)}{!coverage.length && <p className="text-sm text-white/40">Add exercises to see coverage.</p>}</div></div>
            {msg && <p className="mt-5 text-xs text-white/50">{msg}</p>}
          </aside>
        </div>
      </div>
    </main>
  );
}
