import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cargarAudioDialogo } from "@/lib/server/audio-dialogo";
import { transcribirAudioConGroq } from "@/lib/server/transcribir";
import { transcribirPistasDialogo } from "@/lib/dialogo/transcribir";
import { formatearDialogo } from "@/lib/dialogo/contrato";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
  const owner=(await auth())?.user?.email;
  if(!owner)return NextResponse.json({detail:"no_autenticado"},{status:401});
  const body=await req.json().catch(()=>null);
  if(!uuid.test(body?.sessionId||""))return NextResponse.json({detail:"sesion_invalida"},{status:400});
  const parcial=body.parcial===true;
  if(body.parcial!==undefined&&typeof body.parcial!=="boolean"||parcial&&(!Number.isSafeInteger(body.hastaParte)||body.hastaParte<2))return NextResponse.json({detail:"dialogo_corte_invalido"},{status:400});
  try{
    const {pistas,manifest}=await cargarAudioDialogo(body.sessionId,owner,parcial?{parcial:true,hastaParte:body.hastaParte}:{});
    const result=await transcribirPistasDialogo(pistas,p=>transcribirAudioConGroq(Buffer.from(p.bytes),`dialogo-${p.fuente}.webm`,{verboseJson:true,language:null,preserveVerbatim:true,allowEmpty:true}));
    return NextResponse.json({...result,textoFinal:formatearDialogo(result.turnos,manifest.etiquetas),capturaCompleta:!parcial&&manifest.estado==="detenido",parcial,hastaParte:parcial?body.hastaParte:manifest.partesEsperadas,exito:result.fuentesFallidas.length===0},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){
    const code=e instanceof Error?e.message:"dialogo_no_procesable";
    // Do not expose database errors, credentials, URLs or provider response bodies.
    const safe=/^(dialogo_|sesion_no_dialogo|deten_ambas_fuentes)/.test(code)?code:"dialogo_no_procesable";
    return NextResponse.json({detail:safe},{status:409});
  }
}
export async function GET(req:NextRequest){
  const owner=(await auth())?.user?.email;
  if(!owner)return NextResponse.json({detail:"no_autenticado"},{status:401});
  const id=req.nextUrl.searchParams.get("sessionId")||"",fuente=req.nextUrl.searchParams.get("fuente");
  if(!uuid.test(id)||!["microphone","chrome_tab"].includes(fuente||""))return NextResponse.json({detail:"solicitud_invalida"},{status:400});
  try{
    const {pistas}=await cargarAudioDialogo(id,owner);const p=pistas.find(p=>p.fuente===fuente);
    if(!p)return NextResponse.json({detail:"pista_no_disponible"},{status:404});
    return new Response(new Uint8Array(p.bytes),{headers:{"Content-Type":"audio/webm","Content-Disposition":`attachment; filename="dialogo-${fuente}.webm"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch{return NextResponse.json({detail:"original_no_disponible_conserva_copia_local"},{status:409});}
}
