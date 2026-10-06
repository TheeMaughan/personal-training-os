import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const dbUrl=process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function trainer(req:NextRequest){
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!token)return null;
 const admin=createClient(dbUrl,serviceKey);
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error||!user)return null;
 const {data:p}=await admin.from("profiles").select("role").eq("id",user.id).single();
 return p?.role==="trainer"?admin:null;
}
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const db=await trainer(req); if(!db)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {id}=await params;
 const {data:program,error:pe}=await db.from("program_builder_templates").select("id,name,goal,duration_weeks,days_per_week,opt_schedule_id").eq("id",id).single();
 if(pe||!program)return NextResponse.json({error:"Program not found."},{status:404});
 const {data:workouts,error:we}=await db.from("program_builder_workouts").select("id,name,workout_order,description,program_builder_exercises(id,exercise_id,exercise_order,sets,rep_min,rep_max,target_rir,rest_seconds,notes,exercises(name,primary_muscle_group,secondary_muscle_groups,movement_pattern))").eq("program_id",id).order("workout_order");
 if(we)return NextResponse.json({error:we.message},{status:500});
 const {data:exercises,error:ee}=await db.from("exercises").select("id,name,category,primary_muscle_group,secondary_muscle_groups,movement_pattern,equipment,active").eq("active",true).order("name");
 if(ee)return NextResponse.json({error:ee.message},{status:500});
 const {data:library,error:le}=await db.from("master_workouts").select("id,name,goal,opt_phase_number,description,notes,master_workout_exercises(id,exercise_id,exercise_order,sets,rep_min,rep_max,target_rir,rest_seconds,notes,exercises(name,primary_muscle_group,secondary_muscle_groups,movement_pattern))").eq("active",true).order("name");
 if(le)return NextResponse.json({error:le.message},{status:500});
 return NextResponse.json({program,workouts:workouts||[],exercises:exercises||[],workout_library:(library||[]).map((w:any)=>({...w,master_workout_exercises:[...(w.master_workout_exercises||[])].sort((a:any,b:any)=>a.exercise_order-b.exercise_order)}))});
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const db=await trainer(req); if(!db)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {id}=await params; const b=await req.json(); const action=String(b.action||"");
 const {data:p}=await db.from("program_builder_templates").select("id").eq("id",id).single(); if(!p)return NextResponse.json({error:"Program not found."},{status:404});
 if(action==="workout"){
  const name=String(b.name||"").trim(); if(!name)return NextResponse.json({error:"Workout name is required."},{status:400});
  const {data:max}=await db.from("program_builder_workouts").select("workout_order").eq("program_id",id).order("workout_order",{ascending:false}).limit(1).maybeSingle();
  const {data,error}=await db.from("program_builder_workouts").insert({program_id:id,name,workout_order:(max?.workout_order||0)+1,description:b.description||null}).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({workout:data},{status:201});
 }
 if(action==="import_library_workout"){
  const libraryId=String(b.library_workout_id||"");
  const {data:source,error:se}=await db.from("master_workouts").select("id,name,description,master_workout_exercises(exercise_id,exercise_order,sets,rep_min,rep_max,target_rir,rest_seconds,notes)").eq("id",libraryId).eq("active",true).single();
  if(se||!source)return NextResponse.json({error:"Master workout not found."},{status:404});
  const {data:max}=await db.from("program_builder_workouts").select("workout_order").eq("program_id",id).order("workout_order",{ascending:false}).limit(1).maybeSingle();
  const {data:created,error:ce}=await db.from("program_builder_workouts").insert({program_id:id,name:source.name,workout_order:(max?.workout_order||0)+1,description:source.description||null}).select("id,name,workout_order").single();
  if(ce)return NextResponse.json({error:ce.message},{status:500});
  const rows=(source.master_workout_exercises||[]).sort((a:any,b:any)=>a.exercise_order-b.exercise_order).map((r:any)=>({...r,workout_id:created.id}));
  if(rows.length){const {error:xe}=await db.from("program_builder_exercises").insert(rows);if(xe){await db.from("program_builder_workouts").delete().eq("id",created.id).eq("program_id",id);return NextResponse.json({error:xe.message},{status:500});}}
  return NextResponse.json({workout:created},{status:201});
 }
 if(action==="exercise"){
  const {data:w}=await db.from("program_builder_workouts").select("id,program_id").eq("id",b.workout_id).eq("program_id",id).single();
  if(!w)return NextResponse.json({error:"Workout not found."},{status:404});
  const {data:e}=await db.from("exercises").select("id").eq("id",b.exercise_id).eq("active",true).single(); if(!e)return NextResponse.json({error:"Exercise not found."},{status:404});
  const {data:max}=await db.from("program_builder_exercises").select("exercise_order").eq("workout_id",b.workout_id).order("exercise_order",{ascending:false}).limit(1).maybeSingle();
  const row={workout_id:b.workout_id,exercise_id:b.exercise_id,exercise_order:(max?.exercise_order||0)+1,sets:Math.max(1,Math.min(20,Number(b.sets)||3)),rep_min:Math.max(1,Math.min(100,Number(b.rep_min)||8)),rep_max:Math.max(1,Math.min(100,Number(b.rep_max)||12)),target_rir:b.target_rir===""?null:Number(b.target_rir),rest_seconds:Math.max(0,Math.min(1800,Number(b.rest_seconds)||90)),notes:b.notes||null};
  if(row.rep_max<row.rep_min)row.rep_max=row.rep_min;
  const {data,error}=await db.from("program_builder_exercises").insert(row).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({exercise:data},{status:201});
 }
 return NextResponse.json({error:"Unknown action."},{status:400});
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const db=await trainer(req); if(!db)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {id}=await params; const b=await req.json();
 if(b.type==="workout"){const {error}=await db.from("program_builder_workouts").delete().eq("id",b.id).eq("program_id",id);if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true});}
 if(b.type==="exercise"){const {data:w}=await db.from("program_builder_workouts").select("id").eq("id",b.workout_id).eq("program_id",id).single();if(!w)return NextResponse.json({error:"Workout not found."},{status:404});const {error}=await db.from("program_builder_exercises").delete().eq("id",b.id).eq("workout_id",b.workout_id);if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true});}
 return NextResponse.json({error:"Unknown delete type."},{status:400});
}