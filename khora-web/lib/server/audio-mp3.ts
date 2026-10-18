/** Original -> verified encrypted MP3 derivative. Never replaces the original. */
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { put } from "@vercel/blob";
import { getDb } from "./neon";
import { cifrarBytes, descifrarBytes } from "./cripto";
import { asegurarCustodiaContinua } from "./custodia-schema";
import { evaluarCustodiaAudio } from "../audio/custodia";
export const MAX_AUDIO_BYTES=128*1024*1024;
export const hashAudio=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
export async function leerBlobVerificado(url:string,bytes:number,sha:string):Promise<Buffer>{
  const u=new URL(url);
  if(u.protocol!=="https:"||!u.hostname.endsWith(".blob.vercel-storage.com"))throw new Error("blob_host_no_permitido");
  if(!Number.isSafeInteger(bytes)||bytes<=0||bytes>MAX_AUDIO_BYTES||!/^[a-f0-9]{64}$/i.test(sha))throw new Error("audio_manifest_invalido");
  const r=await fetch(u,{cache:"no-store",signal:AbortSignal.timeout(30000),redirect:"error"});
  if(!r.ok||!r.body)throw new Error("blob_inaccesible");
  const reader=r.body.getReader();const chunks:Buffer[]=[];let total=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_AUDIO_BYTES+1024){await reader.cancel();throw new Error("audio_demasiado_grande");}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
  const clear=descifrarBytes(Buffer.concat(chunks));
  if(clear.length!==bytes||hashAudio(clear)!==sha.toLowerCase())throw new Error("audio_integridad_rota");
  return clear;
}
async function ffmpeg(args:string[]):Promise<number>{
  const executable=ffmpegPath;
  if(!executable)throw new Error("ffmpeg_no_disponible");
  return new Promise((resolve,reject)=>{
    const p=spawn(executable,["-hide_banner","-nostdin","-xerror","-v","error","-progress","pipe:1",...args],{windowsHide:true,shell:false});
    let stdout="";let err="";let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;p.kill();},90000);
    p.stdout.on("data",b=>{stdout=(stdout+b).slice(-20000);});p.stderr.on("data",b=>{err=(err+b).slice(-1000);});
    p.on("error",e=>{clearTimeout(timeout);reject(e);});p.on("close",code=>{clearTimeout(timeout);if(timedOut)return reject(new Error("mp3_conversion_timeout"));if(code!==0)return reject(new Error("mp3_codec_failed:"+err));const times=[...stdout.matchAll(/out_time_us=(\d+)/g)].map(m=>Number(m[1])/1e6);resolve(Math.max(0,...times));});
  });
}
export function agruparPartesAudio(parts:Buffer[]):Buffer[]{
  const groups:Buffer[][]=[];
  for(const p of parts){const newHeader=p.length>=4&&p.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));if(!groups.length||newHeader)groups.push([]);groups[groups.length-1].push(p);}
  return groups.map(g=>Buffer.concat(g));
}
export async function convertirAudioMp3(source:Buffer|Buffer[]):Promise<{bytes:Buffer;duracionSeg:number}>{
  const groups=Array.isArray(source)?source:[source];
  if(!groups.length||groups.some(b=>!b.length)||groups.reduce((n,b)=>n+b.length,0)>MAX_AUDIO_BYTES)throw new Error("mp3_fuente_vacia_o_grande");
  const dir=await mkdtemp(join(tmpdir(),"khora-mp3-"));
  try {
    let sourceDuration=0;const list:string[]=[];
    for(let i=0;i<groups.length;i++){
      const input=join(dir,`source-${i}.bin`),pcm=join(dir,`part-${i}.wav`);await writeFile(input,groups[i]);
      sourceDuration+=await ffmpeg(["-i",input,"-map","0:a:0","-vn","-c:a","pcm_s16le","-ar","48000","-ac","2","-y",pcm]);
      list.push(`file 'part-${i}.wav'`);
    }
    const playlist=join(dir,"parts.txt"),output=join(dir,"acceso.mp3");await writeFile(playlist,list.join("\n"));
    const encoded=await ffmpeg(["-f","concat","-safe","1","-i",playlist,"-map","0:a:0","-vn","-c:a","libmp3lame","-b:a","192k","-y",output]);
    const decoded=await ffmpeg(["-i",output,"-map","0:a:0","-f","null","-"]);
    if(sourceDuration<=0||encoded<=0||decoded<=0||Math.abs(sourceDuration-decoded)>0.25)throw new Error("mp3_duracion_no_verificada");
    const bytes=await readFile(output);if(!bytes.length)throw new Error("mp3_vacio");return {bytes,duracionSeg:decoded};
  }finally{await rm(dir,{recursive:true,force:true});}
}
/** Fingerprint pins a verified prefix; an open prefix is NEVER labelled a complete recording. */
export function firmaManifiestoAudio(sessionId:string, parts:{part_index:number;bytes:number;sha256:string}[], completo:boolean):string {
  return hashAudio(Buffer.from(JSON.stringify({sessionId,completo,partes:parts.map(p=>({indice:Number(p.part_index),bytes:Number(p.bytes),sha256:p.sha256.toLowerCase()}))})));
}
export async function generarMp3Sesion(sessionId:string){
  await asegurarCustodiaContinua();const db=getDb();
  const session=await db.query("SELECT estado,total_partes FROM dictado_session WHERE session_id=$1",[sessionId]);
  if(!session.rows.length)throw new Error("sesion_inexistente");
  const r=await db.query("SELECT part_index,blob_url,bytes,sha256,estado_verificacion,fuente_audio FROM dictado_audio_parte WHERE session_id=$1 ORDER BY part_index",[sessionId]);
  if(new Set(r.rows.map(p=>p.fuente_audio).filter(Boolean)).size>1)throw new Error("dialogo_exporta_pistas_separadas_no_mp3_secuencial");
  const complete=session.rows[0].estado==="complete";
  const expected=complete?Number(session.rows[0].total_partes):r.rows.length;
  const custody=evaluarCustodiaAudio(r.rows,expected);if(!custody.ok)throw new Error(custody.motivo);
  const manifest=firmaManifiestoAudio(sessionId,r.rows,complete);
  await db.query("INSERT INTO dictado_mp3(session_id) VALUES($1) ON CONFLICT DO NOTHING",[sessionId]);
  const leaseId=randomUUID();
  const lease=await db.query(`UPDATE dictado_mp3 SET lease_id=$3,estado='procesando',intentos=intentos+1,
    lease_until=now()+interval '10 minutes',actualizado_en=now()
    WHERE session_id=$1 AND (estado<>'disponible' OR source_manifest IS DISTINCT FROM $2)
      AND siguiente_intento<=now() AND (lease_until IS NULL OR lease_until<now()) RETURNING lease_id,intentos`,[sessionId,manifest,leaseId]);
  if(!lease.rows.length)return;
  const stamp=leaseId;
  try {
    if(r.rows.reduce((a,p)=>a+Number(p.bytes),0)>MAX_AUDIO_BYTES)throw new Error("mp3_limite_128MiB_requiere_proceso_largo");
    const parts:Buffer[]=[];for(const p of r.rows)parts.push(await leerBlobVerificado(p.blob_url,Number(p.bytes),p.sha256));
    const sourceSha=hashAudio(Buffer.concat(parts));
    const converted=await convertirAudioMp3(agruparPartesAudio(parts));const mp3=converted.bytes,sha=hashAudio(mp3);
    const blob=await put(`dictado/${sessionId}/acceso-${randomUUID()}.mp3.khc`,cifrarBytes(mp3),{access:"public",contentType:"application/octet-stream",addRandomSuffix:true});
    await leerBlobVerificado(blob.url,mp3.length,sha);
    // Retain older derivatives: pagination/recovery must never mix two MP3 revisions.
    await db.query(`INSERT INTO dictado_mp3_historial(id,session_id,source_manifest,source_parts,captura_completa,blob_url,sha256,bytes,duracion_seg)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(session_id,source_manifest) DO NOTHING`,
      [randomUUID(),sessionId,manifest,r.rows.length,complete,blob.url,sha,mp3.length,converted.duracionSeg]);
    await db.query(`UPDATE dictado_mp3 SET estado='disponible',source_sha256=$2,blob_url=$3,sha256=$4,bytes=$5,
      duracion_seg=$6,ultimo_error=NULL,lease_until=NULL,actualizado_en=now(),source_manifest=$8,source_parts=$9,
      captura_completa=$10,siguiente_intento=now() WHERE session_id=$1 AND lease_id=$7`,
      [sessionId,sourceSha,blob.url,sha,mp3.length,converted.duracionSeg,stamp,manifest,r.rows.length,complete]);
  } catch(e) {
    const message=String((e as Error)?.message||"mp3_fallido");
    const code=message.startsWith('mp3_limite_128MiB')?'mp3_limite_128MiB_requiere_proceso_largo':message.startsWith('mp3_conversion_timeout')?'mp3_conversion_timeout':'mp3_verificacion_o_conversion_fallida';
    const wait=Math.min(21600,30*2**Math.min(10,Math.max(0,Number(lease.rows[0].intentos)-1)));
    await db.query(`UPDATE dictado_mp3 SET estado='fallido',ultimo_error=$2,lease_until=NULL,actualizado_en=now(),
      siguiente_intento=now()+($4::int*interval '1 second') WHERE session_id=$1 AND lease_id=$3`,[sessionId,code,stamp,wait]);
    throw e;
  }
}
