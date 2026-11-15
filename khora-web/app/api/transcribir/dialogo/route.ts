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
  try{
    const {pistas,manifest}=await cargarAudioDialogo(body.sessionId,owner);
    const requested=Array.isArray(body.fuentes)?body.fuentes as string[]:null;
    if(requested&&(!requested.length||requested.some((source:string)=>!["microphone","chrome_tab"].includes(source))))return NextResponse.json({detail:"fuentes_invalidas"},{status:400});
    const selected=requested?pistas.filter(p=>requested.includes(p.fuente)):pistas;
    const result=await transcribirPistasDialogo(selected,p=>transcribirAudioConGroq(Buffer.from(p.bytes),"dialogo-"+p.fuente+".webm",{verboseJson:true,language:null,preserveVerbatim:true,allowEmpty:true}));
    // A source-scoped fallback reports only requested failures; the other lane may already be complete live.
    const fuentesFallidas=requested?result.fuentesFallidas.filter(source=>requested.includes(source)):result.fuentesFallidas;
    const estadoTranscripcion=fuentesFallidas.length===0?"completo":fuentesFallidas.length===2?"fallido":"parcial";
    return NextResponse.json({...result,fuentesFallidas,estadoTranscripcion,textoFinal:formatearDialogo(result.turnos,manifest.etiquetas),capturaCompleta:manifest.estado==="detenido",exito:fuentesFallidas.length===0},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){
    const code=e instanceof Error?e.message:"dialogo_no_procesable";
    // Do not expose database errors, credentials, URLs or provider response bodies.
    const safe=/^(dialogo_|sesion_no_dialogo|deten_ambas_fuentes)/.test(code)?code:"dialogo_no_procesable";
    return NextResponse.json({detail:safe},{status:409});
  }
}
