import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function trainer(req:NextRequest){
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!token)return null;
 const admin=createClient(url,key); const {data:{user},error}=await admin.auth.getUser(token); if(error||!user)return null;
 const {data:p}=await admin.from("profiles").select("role").eq("id",user.id).single();
 return p?.role==="trainer"?admin:null;
}
export async function GET(req:NextRequest){
 const db=await trainer(req); if(!db)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data,error}=await db.from("program_builder_templates").select("id,name,goal,duration_weeks,days_per_week,description,opt_schedule_id,updated_at,opt_phase_schedules(name)").eq("active",true).order("updated_at",{ascending:false});
 if(error)return NextResponse.json({error:error.message},{status:500});
 return NextResponse.json({programs:(data||[]).map((p:any)=>({...p,schedule_name:p.opt_phase_schedules?.name||null}))});
}
export async function POST(req:NextRequest){
 const db=await trainer(req); if(!db)return NextResponse.json({error:"Unauthorized"},{status:401});
 const b=await req.json(); const name=String(b.name||"").trim(); if(!name)return NextResponse.json({error:"Program name is required."},{status:400});
 const duration=Math.max(1,Math.min(52,Number(b.duration_weeks)||1)); const days=Math.max(1,Math.min(7,Number(b.days_per_week)||1));
 if(b.schedule_id){const {data:s}=await db.from("opt_phase_schedules").select("id").eq("id",b.schedule_id).eq("active",true).single();if(!s)return NextResponse.json({error:"Selected OPT schedule was not found."},{status:400});}
 const {data,error}=await db.from("program_builder_templates").insert({name,goal:b.goal||null,duration_weeks:duration,days_per_week:days,opt_schedule_id:b.schedule_id||null,description:b.description||null}).select("id").single();
 if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({program:data},{status:201});
}