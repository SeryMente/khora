import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import { COOKIE_BOVEDA,desbloqueoVigente } from "@/lib/server/boveda";
import { asegurarCustodiaContinua } from "@/lib/server/custodia-schema";
import { generarMp3Sesion,leerBlobVerificado } from "@/lib/server/audio-mp3";
export const runtime="nodejs";export const maxDuration=300;
async function access(req:NextRequest,id:string){
  const email=(await auth())?.user?.email;if(!email)return {error:NextResponse.json({error:"no_autenticado"},{status:401})};
  if(!desbloqueoVigente(req.cookies.get(COOKIE_BOVEDA)?.value))return {error:NextResponse.json({error:"boveda_cerrada"},{status:423})};
  await asegurarCustodiaContinua();
  const v=await getDb().query("SELECT id,session_id FROM volcado WHERE (id::text=$1 OR folio::text=$1) AND usuario=$2",[id,email]);
  if(!v.rows.length)return {error:NextResponse.json({error:"no_encontrado"},{status:404})};return {row:v.rows[0]};
}
export async function GET(req:NextRequest,ctx:{params:Promise<{id:string}>}){
  const a=await access(req,(await ctx.params).id);if(a.error)return a.error;
  const r=await getDb().query("SELECT * FROM dictado_mp3 WHERE session_id=$1",[a.row.session_id]);const m=r.rows[0];
  if(!m||m.estado!=="disponible")return NextResponse.json({estado:m?.estado||"pendiente",error:m?.ultimo_error||null},{status:409,headers:{"Cache-Control":"no-store"}});
  try {const b=await leerBlobVerificado(m.blob_url,Number(m.bytes),m.sha256);return new NextResponse(new Uint8Array(b),{headers:{"Content-Type":"audio/mpeg","Content-Disposition":`attachment; filename="khora-${a.row.id}.mp3"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Audio-SHA256":m.sha256}});}catch{return NextResponse.json({error:"mp3_integridad_fallida"},{status:502});}
}
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}){
  const a=await access(req,(await ctx.params).id);if(a.error)return a.error;
  if(!a.row.session_id)return NextResponse.json({error:"sin_sesion"},{status:422});
  await getDb().query("INSERT INTO dictado_mp3(session_id) VALUES($1) ON CONFLICT DO NOTHING",[a.row.session_id]);
  after(()=>generarMp3Sesion(a.row.session_id).catch(()=>undefined));return NextResponse.json({estado:"solicitado"},{status:202});
}
