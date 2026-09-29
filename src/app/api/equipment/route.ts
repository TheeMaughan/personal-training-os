import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase server configuration is missing.");return createClient(url,key);}
async function trainer(request:NextRequest){const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return null;const c=admin(),{data}=await c.auth.getUser(token);if(!data.user)return null;const {data:p}=await c.from("profiles").select("role").eq("id",data.user.id).maybeSingle();return p?.role==="trainer"?c:null;}

export async function GET(request:NextRequest){
 try{const c=await trainer(request);if(!c)return NextResponse.json({error:"Trainer authentication required."},{status:401});const {data,error}=await c.from("equipment").select("id,name,category,active").order("category").order("name");if(error)throw error;return NextResponse.json({equipment:data||[]});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to load equipment."},{status:500});}
}
export async function POST(request:NextRequest){
 try{const c=await trainer(request);if(!c)return NextResponse.json({error:"Trainer authentication required."},{status:401});const b=await request.json(),name=String(b.name||"").trim();if(!name)return NextResponse.json({error:"Equipment name is required."},{status:400});const {data,error}=await c.from("equipment").insert({name,category:String(b.category||"").trim()||null}).select("id,name,category,active").single();if(error)throw error;return NextResponse.json({equipment:data},{status:201});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to add equipment."},{status:500});}
}
export async function PATCH(request:NextRequest){
 try{const c=await trainer(request);if(!c)return NextResponse.json({error:"Trainer authentication required."},{status:401});const b=await request.json(),id=String(b.id||"");if(!id)return NextResponse.json({error:"Equipment ID is required."},{status:400});const {data,error}=await c.from("equipment").update({name:String(b.name||"").trim(),category:String(b.category||"").trim()||null,active:b.active!==false,updated_at:new Date().toISOString()}).eq("id",id).select("id,name,category,active").single();if(error)throw error;return NextResponse.json({equipment:data});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update equipment."},{status:500});}
}
