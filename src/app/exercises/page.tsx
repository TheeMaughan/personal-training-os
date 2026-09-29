"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const nav = [["Dashboard","/"],["Clients","/clients"],["Programs","/programs"],["Exercises","/exercises"],["Workouts","/workouts"],["Nutrition","/nutrition"],["Check-ins","/check-ins"],["Measurements","/measurements"]];

type Exercise = {
  id:string; name:string; category:string|null; primary_muscle_group:string|null;
  secondary_muscle_groups:string[]|null; movement_pattern:string|null; difficulty:string|null;
  opt_phases:string[]; muscles:{muscle_group:string;role:string;stimulus_weight:number}[];
  equipment_options:{equipment_name:string;required:boolean}[];
};

const empty = {name:"",category:"Strength",primaryMuscleGroup:"",secondaryMuscleGroups:"",equipment:"",movementPattern:"",difficulty:"",optPhases:["Phase 1"],equipmentOptions:"",instructions:""};

export default function ExercisesPage() {
  const [items,setItems]=useState<Exercise[]>([]);
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(empty);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  async function headers() {
    const {data,error}=await getSupabaseClient().auth.getSession();
    if(error || !data.session) throw new Error("Your trainer session has expired. Please sign in again.");
    return {Authorization:"Bearer "+data.session.access_token,"Content-Type":"application/json"};
  }
  async function load() {
    try {
      const r=await fetch("/api/exercises",{cache:"no-store",headers:await headers()});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error || "Unable to load exercises.");
      setItems(j.exercises || []);
    } catch(e) { setMessage(e instanceof Error ? e.message : "Unable to load exercises."); }
  }
  useEffect(()=>{void load();},[]);
  const filtered=useMemo(()=>{const n=q.trim().toLowerCase();return n?items.filter(x=>(x.name+" "+(x.primary_muscle_group||"")+" "+(x.movement_pattern||"")).toLowerCase().includes(n)):items;},[items,q]);

  async function save(e:React.FormEvent) {
    e.preventDefault();
    if(!form.name.trim()) {setMessage("Exercise name is required.");return;}
    setSaving(true);setMessage("");
    try {
      const secondary=form.secondaryMuscleGroups.split(",").map(x=>x.trim()).filter(Boolean);
      const muscles=[form.primaryMuscleGroup.trim(),...secondary].filter(Boolean).map((x,i)=>({muscleGroup:x,role:i===0?"primary":"secondary",stimulusWeight:i===0?1:0.5}));
      const equipmentOptions=form.equipmentOptions.split(",").map(x=>x.trim()).filter(Boolean).map(x=>({equipmentName:x,required:true}));
      const r=await fetch("/api/exercises",{method:"POST",headers:await headers(),body:JSON.stringify({...form,muscles,equipmentOptions})});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error || "Unable to create exercise.");
      setForm(empty);setOpen(false);setMessage("Exercise added to the library.");await load();
    } catch(e) {setMessage(e instanceof Error?e.message:"Unable to create exercise.");}
    finally {setSaving(false);}
  }

  return <main className="min-h-screen bg-black text-white">
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-black px-5 py-7 lg:block">
      <div className="mb-10"><div className="text-xs font-semibold uppercase tracking-[.22em] text-white/50">Personal Training</div><div className="mt-1 text-2xl font-semibold">Training OS</div></div>
      <nav className="space-y-1">{nav.map(([label,href])=><a key={label} href={href} className={"block rounded-lg px-3 py-2.5 text-sm "+(label==="Exercises"?"bg-white text-black":"text-white/65 hover:bg-white/10 hover:text-white")}>{label}</a>)}</nav>
    </aside>
    <div className="lg:pl-64">
      <div className="border-b border-white/10 px-5 py-3 lg:hidden"><div className="text-lg font-semibold">Training OS</div><div className="mt-3 flex gap-2 overflow-x-auto">{nav.map(([label,href])=><a key={label} href={href} className="whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80">{label}</a>)}</div></div>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm text-white/50">Programming Foundation</p><h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Exercise Library</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Every exercise becomes structured data for muscle analysis, equipment filtering, client preferences, and NASM OPT programming.</p></div>
          <button type="button" onClick={()=>{setOpen(true);setMessage("");}} className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black">+ Add Exercise</button>
        </header>
        {message&&<div className="mb-5 rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white/70">{message}</div>}
        {open&&<section className="mb-5 rounded-2xl border border-white/10 bg-[#111] p-5">
          <h2 className="text-xl font-semibold">Add exercise</h2>
          <p className="mt-1 text-xs text-white/40">Use one equipment or muscle name per comma-separated entry.</p>
          <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([["name","Exercise name"],["category","Category"],["primaryMuscleGroup","Primary muscle group"],["secondaryMuscleGroups","Secondary muscles"],["equipment","Equipment"],["movementPattern","Movement pattern"],["difficulty","Difficulty"],["equipmentOptions","Equipment required"]] as const).map(([k,l])=><label key={k} className="text-xs text-white/50">{l}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white"/></label>)}
            <label className="text-xs text-white/50">OPT phases<select multiple value={form.optPhases} onChange={e=>setForm({...form,optPhases:Array.from(e.target.selectedOptions).map(x=>x.value)})} className="mt-2 h-28 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"><option>Phase 1</option><option>Phase 2</option><option>Phase 3</option><option>Phase 4</option><option>Phase 5</option></select></label>
            <label className="text-xs text-white/50 sm:col-span-2 lg:col-span-2">Instructions<textarea value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} rows={4} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white"/></label>
            <div className="flex justify-end gap-3 sm:col-span-2 lg:col-span-3"><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/60">Cancel</button><button disabled={saving} className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40">{saving?"Saving...":"Save Exercise"}</button></div>
          </form>
        </section>}
        <section className="rounded-2xl border border-white/10 bg-[#111] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Library</h2><p className="mt-1 text-sm text-white/45">{filtered.length} exercise{filtered.length===1?"":"s"}</p></div><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search exercises, muscles, movement..." className="w-full max-w-sm rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white"/></div>
          <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
            {filtered.length===0?<div className="px-6 py-14 text-center text-sm text-white/40">No exercises yet. Add the first exercise to start the programming engine.</div>:filtered.map(x=><div key={x.id} className="grid gap-3 border-b border-white/10 bg-black px-4 py-4 last:border-b-0 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:items-center"><div><div className="font-medium">{x.name}</div><div className="mt-1 text-xs text-white/40">{x.category||"Uncategorized"}{x.difficulty?" • "+x.difficulty:""}</div></div><div className="text-xs text-white/60"><span className="text-white/35">Muscles </span>{[x.primary_muscle_group,...(x.secondary_muscle_groups||[])].filter(Boolean).join(", ")||"Not mapped"}</div><div className="text-xs text-white/60"><span className="text-white/35">Movement </span>{x.movement_pattern||"Not set"}</div><div className="flex flex-wrap gap-1">{(x.opt_phases||[]).map(p=><span key={p} className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/60">{p}</span>)}</div></div>)}
          </div>
        </section>
      </section>
    </div>
  </main>;
}
