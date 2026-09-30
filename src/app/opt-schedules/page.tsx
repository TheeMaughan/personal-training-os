"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const nav = [["Dashboard","/"],["Clients","/clients"],["Programs","/programs"],["OPT Schedules","/opt-schedules"],["Exercises","/exercises"],["Equipment","/equipment"],["Workouts","/workouts"],["Nutrition","/nutrition"],["Check-ins","/check-ins"],["Measurements","/measurements"]];

type Phase = { id: string; phase_number: number; name: string; level: string };
type SchedulePhase = { id: string; phase_order: number; weeks: number; opt_phases: Phase };
type Schedule = { id: string; name: string; description: string | null; athlete_type: "normal" | "power"; active: boolean; opt_schedule_phases: SchedulePhase[] };

export default function OptSchedulesPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [athleteType, setAthleteType] = useState<"normal" | "power">("normal");
  const [rows, setRows] = useState<{ phaseId: string; weeks: number }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = getSupabaseClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const [phaseRes, scheduleRes] = await Promise.all([
      supabase.from("opt_phases").select("id,phase_number,name,level").eq("active", true).order("phase_number"),
      fetch("/api/opt/schedules", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const phaseData = phaseRes.data ?? [];
    setPhases(phaseData);
    if (scheduleRes.ok) setSchedules((await scheduleRes.json()).schedules ?? []);
    else setError("Unable to load OPT schedules.");
  };

  useEffect(() => { load(); }, []);

  const totalWeeks = useMemo(() => rows.reduce((sum, r) => sum + Math.max(1, Number(r.weeks) || 1), 0), [rows]);

  const reset = () => {
    setEditing(null); setName(""); setDescription(""); setAthleteType("normal"); setRows([]);
  };

  const edit = (s: Schedule) => {
    setEditing(s); setName(s.name); setDescription(s.description ?? ""); setAthleteType(s.athlete_type);
    setRows([...s.opt_schedule_phases].sort((a,b) => a.phase_order-b.phase_order).map(p => ({ phaseId: p.opt_phases.id, weeks: p.weeks })));
  };

  const save = async () => {
    setError("");
    if (!name.trim() || !rows.length) { setError("Enter a schedule name and add at least one phase."); return; }
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired.");
      const response = await fetch("/api/opt/schedules", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editing?.id, name, description, athleteType, phases: rows }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save schedule.");
      reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save schedule."); }
    finally { setSaving(false); }
  };

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this OPT schedule?")) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch(`/api/opt/schedules?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) await load(); else setError("Unable to deactivate schedule.");
  };

  const addPhase = () => {
    const used = new Set(rows.map(r => r.phaseId));
    const next = phases.find(p => !used.has(p.id));
    if (next) setRows([...rows, { phaseId: next.id, weeks: 4 }]);
  };

  return <main className="min-h-screen bg-black text-white"><aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-black px-5 py-7 lg:block"><div className="mb-10"><div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Personal Training</div><div className="mt-1 text-2xl font-semibold">Training OS</div></div><nav className="space-y-1">{nav.map(([label,href])=><a key={label} href={href} className={`block rounded-lg px-3 py-2.5 text-sm ${href==="/opt-schedules"?"bg-white text-black":"text-white/65 hover:bg-white/10 hover:text-white"}`}>{label}</a>)}</nav></aside><div className="lg:pl-64 px-6 py-8 md:px-10">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs uppercase tracking-[0.2em] text-white/45">Training Methodology</p><h1 className="mt-2 text-3xl font-semibold">OPT Schedules</h1><p className="mt-2 max-w-2xl text-sm text-white/55">Build reusable phase sequences and set how many weeks each OPT phase lasts.</p></div>
        <button onClick={reset} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black">New Schedule</button>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5"><h2 className="text-lg font-semibold">{editing ? "Edit Schedule" : "Create Schedule"}</h2><p className="mt-1 text-xs text-white/45">Phase order and duration are trainer-controlled.</p></div>
          <div className="space-y-4">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Schedule name" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"/>
            <select value={athleteType} onChange={e=>setAthleteType(e.target.value as "normal"|"power")} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm"><option value="normal">Normal Lifter</option><option value="power">Power Lifter</option></select>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"/>
            <div className="space-y-3">
              {rows.map((row,i)=><div key={i} className="flex gap-2">
                <select value={row.phaseId} onChange={e=>setRows(rows.map((r,j)=>j===i?{...r,phaseId:e.target.value}:r))} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm">{phases.map(p=><option key={p.id} value={p.id}>Phase {p.phase_number} — {p.name}</option>)}</select>
                <label className="flex w-28 items-center gap-2 rounded-xl border border-white/10 bg-black px-3 text-xs text-white/50"><input type="number" min={1} max={52} value={row.weeks} onChange={e=>setRows(rows.map((r,j)=>j===i?{...r,weeks:Math.max(1,Math.min(52,Number(e.target.value)||1))}:r))} className="w-12 bg-transparent text-sm text-white outline-none"/><span>weeks</span></label>
                <button type="button" onClick={()=>setRows(rows.filter((_,j)=>j!==i))} className="rounded-xl border border-white/10 px-3 text-white/45 hover:text-white">×</button>
              </div>)}
              <button type="button" onClick={addPhase} disabled={rows.length>=phases.length} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 disabled:opacity-30">+ Add Phase</button>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm"><span className="text-white/45">Total program duration</span><strong>{totalWeeks} weeks</strong></div>
            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</div>}
            <div className="flex gap-2"><button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{saving ? "Saving…" : editing ? "Save Changes" : "Create Schedule"}</button>{editing&&<button onClick={reset} className="rounded-xl border border-white/10 px-4 py-3 text-sm">Cancel</button>}</div>
          </div>
        </div>

        <div className="space-y-4">
          {schedules.filter(s=>s.active).map(s=><article key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{s.name}</h2><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">{s.athlete_type === "power" ? "Power" : "Normal"}</span></div><p className="mt-1 text-sm text-white/45">{s.description || "No description."}</p></div><button onClick={()=>edit(s)} className="text-sm text-white/60 hover:text-white">Edit</button></div>
            <div className="mt-5 space-y-2">{[...s.opt_schedule_phases].sort((a,b)=>a.phase_order-b.phase_order).map(p=><div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"><span className="text-sm">Phase {p.opt_phases.phase_number} — {p.opt_phases.name}</span><span className="text-sm text-white/50">{p.weeks} weeks</span></div>)}</div>
            <div className="mt-4 flex items-center justify-between text-xs text-white/40"><span>{s.opt_schedule_phases.reduce((n,p)=>n+p.weeks,0)} total weeks</span><button onClick={()=>deactivate(s.id)} className="text-white/40 hover:text-white">Deactivate</button></div>
          </article>)}
          {!schedules.filter(s=>s.active).length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No active schedules yet.</div>}
        </div>
      </section>
    </div>
    </div>
  </main>;
}
