"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Schedule = {
  id: string; name: string; description: string | null;
  athlete_type: "normal" | "power"; active: boolean;
  opt_schedule_phases: { id:string; phase_order:number; weeks:number; opt_phases:{phase_number:number;name:string} }[];
};

type Program = {
  id:string; name:string; goal:string|null; duration_weeks:number;
  days_per_week:number; description:string|null; schedule_name:string|null;
};

const nav=[["Dashboard","/"],["Clients","/clients"],["Programs","/programs"],["OPT Schedules","/opt-schedules"],["Exercises","/exercises"],["Equipment","/equipment"],["Workouts","/workouts"],["Nutrition","/nutrition"],["Check-ins","/check-ins"],["Measurements","/measurements"]];

export default function ProgramsPage(){
 const [schedules,setSchedules]=useState<Schedule[]>([]),[programs,setPrograms]=useState<Program[]>([]);
 const [form,setForm]=useState({name:"",goal:"",duration:12,days:4,scheduleId:"",description:""});
 const [msg,setMsg]=useState(""); const [loading,setLoading]=useState(true);
 const client=getSupabaseClient();
 async function token(){const {data}=await client.auth.getSession(); return data.session?.access_token||"";}
 async function load(){setLoading(true);const t=await token();const h={Authorization:`Bearer ${t}`};const [s,p]=await Promise.all([fetch("/api/opt/schedules",{headers:h}),fetch("/api/programs",{headers:h})]); if(s.ok){const d=await s.json();setSchedules(d.schedules||[])} if(p.ok){const d=await p.json();setPrograms(d.programs||[])}setLoading(false)}
 useEffect(()=>{load()},[]);
 const selected=schedules.find(s=>s.id===form.scheduleId);
 const scheduleWeeks=selected?.opt_schedule_phases.reduce((n,p)=>n+p.weeks,0)||0;
 useEffect(()=>{if(selected&&scheduleWeeks>0)setForm(f=>({...f,duration:scheduleWeeks}))},[form.scheduleId]);
 async function create(e:React.FormEvent){e.preventDefault();setMsg("");const t=await token();const res=await fetch("/api/programs",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({name:form.name,goal:form.goal,duration_weeks:form.duration,days_per_week:form.days,schedule_id:form.scheduleId||null,description:form.description})});const d=await res.json();if(!res.ok){setMsg(d.error||"Unable to create program.");return}setMsg("Program template created.");setForm({name:"",goal:"",duration:12,days:4,scheduleId:"",description:""});load()}
 return <main className="min-h-screen bg-black text-white"><div className="flex min-h-screen">
 <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-[#0b0b0b] p-5 lg:block"><div className="mb-8 text-lg font-semibold">Training OS</div><nav className="space-y-1">{nav.map(([label,href])=><a key={href} href={href} className={href==="/programs"?"block rounded-lg bg-white px-3 py-2 text-sm font-medium text-black":"block rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"}>{label}</a>)}</nav></aside>
 <section className="min-w-0 flex-1 p-5 lg:p-8"><div className="mx-auto max-w-6xl">
 <div className="mb-8"><p className="text-xs uppercase tracking-[0.2em] text-white/40">Training</p><h1 className="mt-2 text-3xl font-semibold">Program Builder</h1><p className="mt-2 text-sm text-white/50">Create reusable master templates and attach an OPT phase schedule.</p></div>
 <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
 <form onSubmit={create} className="rounded-2xl border border-white/10 bg-[#111] p-6 space-y-5">
 <h2 className="text-lg font-medium">New Program Template</h2>
 <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Program name" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"/>
 <div className="grid gap-4 sm:grid-cols-2"><input value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} placeholder="Goal" className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"/><select value={form.scheduleId} onChange={e=>setForm({...form,scheduleId:e.target.value})} className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"><option value="">No OPT schedule</option>{schedules.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
 <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-white/60">Duration (weeks)<input type="number" min="1" max="52" value={form.duration} onChange={e=>setForm({...form,duration:Math.max(1,Math.min(52,Number(e.target.value)||1))})} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"/></label><label className="text-sm text-white/60">Days / week<input type="number" min="1" max="7" value={form.days} onChange={e=>setForm({...form,days:Math.max(1,Math.min(7,Number(e.target.value)||1))})} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"/></label></div>
 <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Program description" rows={4} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"/>
 {selected&&<div className="rounded-xl border border-white/10 p-4"><div className="text-xs uppercase tracking-wider text-white/40">OPT Timeline</div><div className="mt-3 flex flex-wrap gap-2">{selected.opt_schedule_phases.map(p=><div key={p.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">Phase {p.opt_phases.phase_number} · {p.opt_phases.name}<span className="ml-2 text-white/40">{p.weeks}w</span></div>)}</div><p className="mt-3 text-xs text-white/40">{scheduleWeeks} total weeks. Selecting this schedule sets the program duration to its phase total.</p></div>}
 <button disabled={loading} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">Create Program Template</button>{msg&&<p className="text-sm text-white/60">{msg}</p>}
 </form>
 <section className="rounded-2xl border border-white/10 bg-[#111] p-6"><h2 className="text-lg font-medium">Master Templates</h2><div className="mt-5 space-y-3">{programs.map(p=><article key={p.id} className="rounded-xl border border-white/10 p-4"><div className="flex justify-between gap-4"><div><a href={"/programs/"+p.id} className="font-medium hover:underline">{p.name}</a><div className="mt-1 text-xs text-white/40">{p.duration_weeks} weeks · {p.days_per_week} days/week{p.schedule_name&&` · ${p.schedule_name}`}</div></div></div>{p.goal&&<p className="mt-3 text-sm text-white/60">{p.goal}</p>}</article>)}{!loading&&!programs.length&&<p className="py-8 text-center text-sm text-white/40">No program templates yet.</p>}</div></section>
 </div></div></section></div></main>
}