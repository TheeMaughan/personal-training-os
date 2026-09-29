"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Equipment = { id:string; name:string; category:string|null; available:boolean; notes:string };
type Preference = "favorite" | "neutral" | "avoid";
type Exercise = { id:string; name:string; category:string|null; primary_muscle_group:string|null; secondary_muscle_groups:string[]|null; movement_pattern:string|null; preference:Preference; notes:string };

export default function ClientPage() {
  const params = useParams<{id:string}>();
  const [tab,setTab]=useState<"equipment"|"preferences">("equipment");
  const [equipment,setEquipment]=useState<Equipment[]>([]);
  const [exercises,setExercises]=useState<Exercise[]>([]);
  const [search,setSearch]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);

  async function headers() {
    const {data}=await getSupabaseClient().auth.getSession();
    if(!data.session) throw new Error("Trainer session expired.");
    return {Authorization:"Bearer "+data.session.access_token,"Content-Type":"application/json"};
  }

  async function load() {
    try {
      setLoading(true); setMessage("");
      const h=await headers();
      const [er,pr]=await Promise.all([
        fetch("/api/clients/"+params.id+"/equipment",{headers:h,cache:"no-store"}),
        fetch("/api/clients/"+params.id+"/exercise-preferences",{headers:h,cache:"no-store"})
      ]);
      const ej=await er.json(), pj=await pr.json();
      if(!er.ok) throw new Error(ej.error);
      if(!pr.ok) throw new Error(pj.error);
      setEquipment(ej.equipment||[]);
      setExercises(pj.exercises||[]);
    } catch(e) {
      setMessage(e instanceof Error?e.message:"Unable to load client settings.");
    } finally { setLoading(false); }
  }

  useEffect(()=>{if(params.id) void load();},[params.id]);

  async function toggleEquipment(item:Equipment) {
    try {
      const r=await fetch("/api/clients/"+params.id+"/equipment",{method:"PUT",headers:await headers(),body:JSON.stringify({equipmentId:item.id,available:!item.available,notes:item.notes})});
      if(!r.ok) throw new Error((await r.json()).error);
      setEquipment(x=>x.map(i=>i.id===item.id?{...i,available:!i.available}:i));
    } catch(e) { setMessage(e instanceof Error?e.message:"Unable to save equipment."); }
  }

  async function setPreference(item:Exercise, preference:Preference) {
    try {
      const r=await fetch("/api/clients/"+params.id+"/exercise-preferences",{method:"PUT",headers:await headers(),body:JSON.stringify({exerciseId:item.id,preference,notes:item.notes})});
      if(!r.ok) throw new Error((await r.json()).error);
      setExercises(x=>x.map(i=>i.id===item.id?{...i,preference}:i));
    } catch(e) { setMessage(e instanceof Error?e.message:"Unable to save exercise preference."); }
  }

  const filteredEquipment=useMemo(()=>equipment.filter(e=>(e.name+" "+(e.category||"")).toLowerCase().includes(search.toLowerCase())),[equipment,search]);
  const filteredExercises=useMemo(()=>exercises.filter(e=>(e.name+" "+(e.category||"")+" "+(e.primary_muscle_group||"")+" "+(e.movement_pattern||"")).toLowerCase().includes(search.toLowerCase())),[exercises,search]);

  return <main className="min-h-screen bg-black text-white">
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
      <a href="/clients" className="text-sm text-white/45 hover:text-white">← Clients</a>
      <div className="mt-6 border-b border-white/10 pb-7">
        <p className="text-sm text-white/50">Client Profile</p>
        <h1 className="mt-1 text-3xl font-semibold">Training Preferences</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">Set the equipment this client can use and the exercises they prefer. Favorites will receive a higher selection priority when the program engine builds future workouts; avoids will be filtered unless you override them.</p>
      </div>

      {message&&<div className="mt-5 rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white/70">{message}</div>}

      <div className="mt-6 flex gap-2 border-b border-white/10">
        {(["equipment","preferences"] as const).map(t=><button key={t} type="button" onClick={()=>{setTab(t);setSearch("");}} className={"px-4 py-3 text-sm font-medium border-b-2 "+(tab===t?"border-white text-white":"border-transparent text-white/45 hover:text-white")}>{t==="equipment"?"Equipment":"Exercise Preferences"}</button>)}
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">{tab==="equipment"?"Equipment availability":"Exercise preferences"}</div>
          <div className="mt-1 text-sm text-white/40">{loading?"Loading...":tab==="equipment"?equipment.filter(e=>e.available).length+" of "+equipment.length+" available":exercises.filter(e=>e.preference==="favorite").length+" favorites • "+exercises.filter(e=>e.preference==="avoid").length+" avoids"}</div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==="equipment"?"Search equipment...":"Search exercises..."} className="w-full max-w-xs rounded-lg border border-white/15 bg-[#111] px-3 py-2.5 text-sm outline-none placeholder:text-white/30"/>
      </div>

      {tab==="equipment" ? <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
        {filteredEquipment.length===0?<div className="px-5 py-12 text-center text-sm text-white/40">No master equipment matches your search.</div>:filteredEquipment.map(e=><button type="button" key={e.id} onClick={()=>void toggleEquipment(e)} className="flex w-full items-center justify-between border-b border-white/10 px-5 py-4 text-left last:border-0 hover:bg-white/5">
          <div><div className="font-medium">{e.name}</div><div className="mt-1 text-xs text-white/40">{e.category||"Uncategorized"}</div></div>
          <span className={"rounded-full border px-3 py-1 text-xs font-medium "+(e.available?"border-white bg-white text-black":"border-white/15 text-white/45")}>{e.available?"Available":"Unavailable"}</span>
        </button>)}
      </div> : <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
        {filteredExercises.length===0?<div className="px-5 py-12 text-center text-sm text-white/40">No exercises match your search.</div>:filteredExercises.map(e=><div key={e.id} className="border-b border-white/10 px-5 py-4 last:border-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="font-medium">{e.name}</div><div className="mt-1 text-xs text-white/40">{e.primary_muscle_group||"Muscle not set"}{e.movement_pattern?" • "+e.movement_pattern:""}{e.category?" • "+e.category:""}</div></div>
            <div className="flex shrink-0 gap-2">
              {(["favorite","neutral","avoid"] as Preference[]).map(p=><button type="button" key={p} onClick={()=>void setPreference(e,p)} className={"rounded-lg border px-3 py-2 text-xs font-medium "+(e.preference===p?"border-white bg-white text-black":"border-white/15 text-white/50 hover:border-white/30 hover:text-white")}>{p==="favorite"?"★ Favorite":p==="avoid"?"Avoid":"Neutral"}</button>)}
            </div>
          </div>
        </div>)}
      </div>}

      <p className="mt-4 text-xs text-white/30">{tab==="equipment"?"The master list is controlled from the Equipment tab. This page only changes this client's availability.":"Favorites influence future exercise selection, but they never override OPT phase suitability, equipment availability, assessment constraints, or trainer overrides."}</p>
    </div>
  </main>;
}
