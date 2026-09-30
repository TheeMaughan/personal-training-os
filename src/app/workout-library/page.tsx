"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Ex = {
  id: string;
  name: string;
  primary_muscle_group: string | null;
  secondary_muscle_groups: string[] | null;
};

type Muscle = { exercise_id: string; muscle_group: string; role: string; stimulus_weight: number };

type Row = {
  id: string;
  exercise_id: string;
  exercise_order: number;
  sets: number;
  rep_min: number;
  rep_max: number;
  target_rir: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercises: Ex | null;
};

type Workout = {
  id: string;
  name: string;
  goal: string | null;
  opt_phase_number: number | null;
  description: string | null;
  notes: string | null;
  master_workout_exercises: Row[];
};

const nav = [
  ["Dashboard", "/"], ["Clients", "/clients"], ["Programs", "/programs"],
  ["OPT Schedules", "/opt-schedules"], ["Exercises", "/exercises"], ["Equipment", "/equipment"],
  ["Workouts", "/workout-library"], ["Nutrition", "/nutrition"], ["Check-ins", "/check-ins"],
  ["Measurements", "/measurements"],
];

export default function WorkoutLibraryPage() {
  const client = getSupabaseClient();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Ex[]>([]);
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [addEx, setAddEx] = useState("");
  const [sets, setSets] = useState(3);
  const [min, setMin] = useState(8);
  const [max, setMax] = useState(12);
  const [rir, setRir] = useState("2");
  const [rest, setRest] = useState("90");
  const [editing, setEditing] = useState("");
  const [search, setSearch] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [msg, setMsg] = useState("");

  async function token() {
    const { data } = await client.auth.getSession();
    return data.session?.access_token || "";
  }

  async function load() {
    const t = await token();
    const r = await fetch("/api/workout-library", { headers: { Authorization: "Bearer " + t } });
    const d = await r.json();
    if (r.ok) {
      setWorkouts(d.workouts || []);
      setExercises(d.exercises || []);
      setMuscles(d.exercise_muscles || []);
      if (!selected && d.workouts?.[0]) setSelected(d.workouts[0].id);
    }
  }

  useEffect(() => { load(); }, []);

  const chosen = workouts.find(w => w.id === selected);
  const filteredWorkouts = workouts.filter(w =>
    [w.name, w.goal, w.description, w.notes, w.opt_phase_number ? "phase " + w.opt_phase_number : ""]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const filteredExercises = exercises.filter(e =>
    [e.name, e.primary_muscle_group, ...(e.secondary_muscle_groups || [])]
      .filter(Boolean).join(" ").toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const coverage = useMemo(() => {
    const totals: Record<string, number> = {};
    if (!chosen) return [];
    for (const row of chosen.master_workout_exercises) {
      const mapped = muscles.filter(m => m.exercise_id === row.exercise_id);
      if (mapped.length) {
        for (const m of mapped) totals[m.muscle_group] = (totals[m.muscle_group] || 0) + row.sets * Number(m.stimulus_weight || 0);
      } else if (row.exercises?.primary_muscle_group) {
        totals[row.exercises.primary_muscle_group] = (totals[row.exercises.primary_muscle_group] || 0) + row.sets;
      }
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [chosen, muscles]);

  async function post(body: any) {
    const t = await token();
    const r = await fetch("/api/workout-library", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error || "Unable to save."); return false; }
    setMsg("Saved.");
    await load();
    if (d.workout?.id) setSelected(d.workout.id);
    return true;
  }

  async function remove(type: string, id: string) {
    const t = await token();
    await fetch("/api/workout-library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
      body: JSON.stringify({ type, id }),
    });
    if (type === "workout" && selected === id) setSelected("");
    await load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (await post({ action: "workout", name, goal, opt_phase_number: phase ? Number(phase) : null, description, notes })) {
      setName(""); setGoal(""); setPhase(""); setDescription(""); setNotes("");
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !addEx) { setMsg("Select an exercise."); return; }
    await post({ action: "exercise", workout_id: selected, exercise_id: addEx, sets, rep_min: min, rep_max: max, target_rir: rir, rest_seconds: rest });
  }

  async function saveExercise(x: Row) {
    await post({ action: "update_exercise", id: x.id, sets: x.sets, rep_min: x.rep_min, rep_max: x.rep_max, target_rir: x.target_rir, rest_seconds: x.rest_seconds, notes: x.notes });
    setEditing("");
  }

  async function saveWorkout(w: Workout) {
    await post({ action: "update_workout", id: w.id, name: w.name, goal: w.goal, opt_phase_number: w.opt_phase_number, description: w.description, notes: w.notes });
  }

  async function moveExercise(row: Row, direction: -1 | 1) {
    if (!chosen) return;
    const rows = [...chosen.master_workout_exercises].sort((a, b) => a.exercise_order - b.exercise_order);
    const i = rows.findIndex(r => r.id === row.id);
    const j = i + direction;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    await post({ action: "reorder_exercise", workout_id: chosen.id, ordered_ids: rows.map(r => r.id) });
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setWorkouts(ws => ws.map(w => w.id === chosen?.id
      ? { ...w, master_workout_exercises: w.master_workout_exercises.map(r => r.id === id ? { ...r, ...patch } : r) }
      : w
    ));
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-[#0b0b0b] p-5 lg:block">
          <div className="mb-8 text-lg font-semibold">Training OS</div>
          <nav className="space-y-1">{nav.map(([label, href]) =>
            <a key={href} href={href} className={href === "/workout-library" ? "block rounded-lg bg-white px-3 py-2 text-sm font-medium text-black" : "block rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"}>{label}</a>
          )}</nav>
        </aside>

        <section className="min-w-0 flex-1 p-5 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs uppercase tracking-[.2em] text-white/40">Training</p>
            <h1 className="mt-2 text-3xl font-semibold">Master Workout Library</h1>
            <p className="mt-2 text-sm text-white/50">Reusable workouts with editable prescriptions, goals, notes, exercise order, and muscle coverage.</p>

            <div className="mt-8 grid gap-6 xl:grid-cols-[330px_1fr]">
              <section className="space-y-4">
                <form onSubmit={create} className="space-y-3 rounded-2xl border border-white/10 bg-[#111] p-5">
                  <h2 className="font-medium">Create Workout</h2>
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Workout name" className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
                  <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Goal" className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
                  <select value={phase} onChange={e => setPhase(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm">
                    <option value="">OPT phase</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>Phase {n}</option>)}
                  </select>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="min-h-20 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Workout notes" className="min-h-20 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
                  <button className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black">Create</button>
                </form>

                <div className="rounded-2xl border border-white/10 bg-[#111] p-3">
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workouts..." className="mb-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" />
                  <div className="max-h-[55vh] overflow-y-auto">
                    {filteredWorkouts.map(w =>
                      <button key={w.id} type="button" onClick={() => setSelected(w.id)} className={"w-full rounded-xl p-3 text-left " + (selected === w.id ? "bg-white text-black" : "hover:bg-white/5")}>
                        <div className="font-medium">{w.name}</div>
                        <div className={"mt-1 text-xs " + (selected === w.id ? "text-black/50" : "text-white/40")}>{w.opt_phase_number ? "Phase " + w.opt_phase_number + " · " : ""}{w.goal || "No goal"}</div>
                      </button>
                    )}
                    {!filteredWorkouts.length && <p className="p-4 text-sm text-white/40">No matching workouts.</p>}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#111] p-5">
                {!chosen ? <p className="py-16 text-center text-white/40">Create or select a workout.</p> : <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <input value={chosen.name} onChange={e => setWorkouts(ws => ws.map(w => w.id === chosen.id ? { ...w, name: e.target.value } : w))} className="w-full bg-transparent text-2xl font-semibold outline-none" />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input value={chosen.goal || ""} onChange={e => setWorkouts(ws => ws.map(w => w.id === chosen.id ? { ...w, goal: e.target.value } : w))} placeholder="Goal" className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm" />
                        <select value={chosen.opt_phase_number || ""} onChange={e => setWorkouts(ws => ws.map(w => w.id === chosen.id ? { ...w, opt_phase_number: e.target.value ? Number(e.target.value) : null } : w))} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm">
                          <option value="">No phase</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>Phase {n}</option>)}
                        </select>
                        <button onClick={() => saveWorkout(chosen)} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black">Save Workout</button>
                        <button onClick={() => post({ action: "copy", workout_id: chosen.id })} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Copy Workout</button>
                      </div>
                      <textarea value={chosen.description || ""} onChange={e => setWorkouts(ws => ws.map(w => w.id === chosen.id ? { ...w, description: e.target.value } : w))} placeholder="Workout description" className="mt-3 min-h-20 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm" />
                      <textarea value={chosen.notes || ""} onChange={e => setWorkouts(ws => ws.map(w => w.id === chosen.id ? { ...w, notes: e.target.value } : w))} placeholder="Workout notes" className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm" />
                    </div>
                    <button onClick={() => remove("workout", chosen.id)} className="text-xs text-white/40">Delete</button>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="rounded-xl border border-white/10 p-4">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <input value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} placeholder="Search exercise or muscle..." className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm" />
                        <select value={addEx} onChange={e => setAddEx(e.target.value)} className="min-w-[220px] rounded-lg border border-white/10 bg-black px-3 py-2 text-sm">
                          <option value="">Choose exercise</option>{filteredExercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <input type="number" min="1" max="20" value={sets} onChange={e => setSets(Number(e.target.value) || 1)} className="w-16 rounded-lg border border-white/10 bg-black px-2 py-2 text-sm" title="Sets" />
                        <input type="number" min="1" max="100" value={min} onChange={e => setMin(Number(e.target.value) || 1)} className="w-16 rounded-lg border border-white/10 bg-black px-2 py-2 text-sm" title="Min reps" />
                        <input type="number" min="1" max="100" value={max} onChange={e => setMax(Number(e.target.value) || 1)} className="w-16 rounded-lg border border-white/10 bg-black px-2 py-2 text-sm" title="Max reps" />
                        <input type="number" min="0" max="10" value={rir} onChange={e => setRir(e.target.value)} className="w-16 rounded-lg border border-white/10 bg-black px-2 py-2 text-sm" title="RIR" />
                        <input type="number" min="0" max="1800" value={rest} onChange={e => setRest(e.target.value)} className="w-20 rounded-lg border border-white/10 bg-black px-2 py-2 text-sm" title="Rest seconds" />
                        <button onClick={add} className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">Add Exercise</button>
                      </div>
                      <p className="mb-3 text-xs text-white/30">Sets · Min Reps · Max Reps · RIR · Rest seconds.</p>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1150px] text-left text-sm">
                          <thead className="text-xs uppercase tracking-wider text-white/30">
                            <tr><th className="pb-3">Exercise</th><th className="pb-3">Target Muscles</th><th className="pb-3">Sets</th><th className="pb-3">Reps</th><th className="pb-3">RIR</th><th className="pb-3">Rest</th><th className="pb-3">Notes</th><th className="pb-3">Order</th><th className="pb-3">Actions</th></tr>
                          </thead>
                          <tbody>
                            {chosen.master_workout_exercises.map((x, index) => editing === x.id ? (
                              <tr key={x.id} className="border-t border-white/10 align-top">
                                <td className="py-3 font-medium">{x.exercises?.name}</td>
                                <td className="py-3 text-xs text-white/50"><div>{[x.exercises?.primary_muscle_group, ...(x.exercises?.secondary_muscle_groups || [])].filter(Boolean).join(", ") || "—"}</div><div className="mt-2"><span className="text-white/30">Required: </span>{x.equipment_requirements?.filter(e=>e.required).map(e=>e.equipment_name).join(", ") || "None"}</div><div className="mt-1"><span className="text-white/30">Optional: </span>{x.equipment_requirements?.filter(e=>!e.required).map(e=>e.equipment_name).join(", ") || "None"}</div></td>
                                <td className="py-3"><input type="number" min="1" max="20" value={x.sets} onChange={e => updateRow(x.id, { sets: Number(e.target.value) || 1 })} className="w-16 rounded bg-black p-2" /></td>
                                <td className="py-3"><div className="flex gap-1"><input type="number" min="1" max="100" value={x.rep_min} onChange={e => updateRow(x.id, { rep_min: Number(e.target.value) || 1 })} className="w-14 rounded bg-black p-2" /><input type="number" min="1" max="100" value={x.rep_max} onChange={e => updateRow(x.id, { rep_max: Number(e.target.value) || 1 })} className="w-14 rounded bg-black p-2" /></div></td>
                                <td className="py-3"><input type="number" min="0" max="10" value={x.target_rir ?? ""} onChange={e => updateRow(x.id, { target_rir: e.target.value === "" ? null : Number(e.target.value) })} className="w-16 rounded bg-black p-2" /></td>
                                <td className="py-3"><input type="number" min="0" max="1800" value={x.rest_seconds ?? ""} onChange={e => updateRow(x.id, { rest_seconds: e.target.value === "" ? null : Number(e.target.value) })} className="w-20 rounded bg-black p-2" /></td>
                                <td className="py-3"><input value={x.notes || ""} onChange={e => updateRow(x.id, { notes: e.target.value })} className="w-56 rounded bg-black p-2" /></td>
                                <td className="py-3 text-xs text-white/40">{index + 1}</td>
                                <td className="py-3 whitespace-nowrap"><button onClick={() => saveExercise(x)} className="mr-2 text-xs underline">Save</button><button onClick={() => setEditing("")} className="text-xs text-white/40">Cancel</button></td>
                              </tr>
                            ) : (
                              <tr key={x.id} className="border-t border-white/10 align-top">
                                <td className="py-3 font-medium">{x.exercises?.name}</td>
                                <td className="py-3 text-xs text-white/50"><div>{[x.exercises?.primary_muscle_group, ...(x.exercises?.secondary_muscle_groups || [])].filter(Boolean).join(", ") || "—"}</div><div className="mt-2"><span className="text-white/30">Required: </span>{x.equipment_requirements?.filter(e=>e.required).map(e=>e.equipment_name).join(", ") || "None"}</div><div className="mt-1"><span className="text-white/30">Optional: </span>{x.equipment_requirements?.filter(e=>!e.required).map(e=>e.equipment_name).join(", ") || "None"}</div></td>
                                <td className="py-3">{x.sets}</td><td className="py-3">{x.rep_min}-{x.rep_max}</td><td className="py-3">{x.target_rir ?? "—"}</td><td className="py-3">{x.rest_seconds ?? "—"}s</td>
                                <td className="max-w-xs py-3 text-xs text-white/50">{x.notes || "—"}</td>
                                <td className="py-3 whitespace-nowrap"><button disabled={index === 0} onClick={() => moveExercise(x, -1)} className="mr-1 rounded border border-white/10 px-2 py-1 text-xs disabled:opacity-20">↑</button><button disabled={index === chosen.master_workout_exercises.length - 1} onClick={() => moveExercise(x, 1)} className="rounded border border-white/10 px-2 py-1 text-xs disabled:opacity-20">↓</button></td>
                                <td className="py-3 whitespace-nowrap"><button onClick={() => setEditing(x.id)} className="mr-2 text-xs underline">Edit</button><button onClick={() => post({ action: "copy_exercise", id: x.id })} className="mr-2 text-xs underline">Copy</button><button onClick={() => remove("exercise", x.id)} className="text-xs text-white/40">Delete</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!chosen.master_workout_exercises.length && <p className="py-8 text-center text-sm text-white/40">No exercises yet.</p>}
                    </div>

                    <aside className="rounded-xl border border-white/10 p-4">
                      <h3 className="font-medium">Muscle Coverage</h3>
                      <p className="mt-1 text-xs text-white/40">Weighted stimulus across this workout. Direct and secondary mappings are included.</p>
                      <div className="mt-4 space-y-3">
                        {coverage.map(([muscle, value]) =>
                          <div key={muscle}>
                            <div className="flex justify-between text-xs"><span>{muscle}</span><span className="text-white/40">{value.toFixed(1)}</span></div>
                            <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-white" style={{ width: Math.min(100, value * 10) + "%" }} /></div>
                          </div>
                        )}
                        {!coverage.length && <p className="text-sm text-white/40">Add exercises to see coverage.</p>}
                      </div>
                    </aside>
                  </div>
                </>}
              </section>
            </div>

            {msg && <p className="mt-4 text-xs text-white/50">{msg}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
