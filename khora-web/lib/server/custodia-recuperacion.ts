import { NextRequest, NextResponse } from "next/server";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { getDb } from "./neon";
import { cifrarTexto, descifrarTexto } from "./cripto";
import { evaluarCustodiaAudio } from "../audio/custodia";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers});
const uuid=z.string().uuid();
const partesSql=`SELECT part_index AS parte,blob_url AS url,bytes,sha256,fuente_audio AS "fuenteAudio",original_name AS "nombreOriginal",mime_type AS "mimeType",start_ms,end_ms,duracion_ms,(estado_verificacion='verificado') AS verificado FROM dictado_audio_parte WHERE session_id=$1 ORDER BY part_index`;
function cursor(req:NextRequest){
 const raw=req.nextUrl.searchParams.get('cursor');if(!raw)return null;
 try{const c=JSON.parse(Buffer.from(raw,'base64url').toString());if(!Array.isArray(c)||c.length!==2||!Number.isFinite(Date.parse(c[0]))||!uuid.safeParse(c[1]).success)throw 0;return c as [string,string];}catch{throw Error('cursor_invalido');}
}
const encode=(a:unknown)=>Buffer.from(JSON.stringify(a)).toString('base64url');
export async function catalogoRecuperacion(req:NextRequest,email:string){
 try{
 const db=getDb(),c=cursor(req),session=req.nextUrl.searchParams.get('sessionId');
 if(session&&!uuid.safeParse(session).success)return json({error:'sesion_invalida'},400);
 const revisions=req.nextUrl.searchParams.get('revisions')==='1';
 const limit=20;
 if(revisions){
  if(!session)return json({error:'sesion_requerida'},400);
  const owner=await db.query(`SELECT session_id FROM dictado_session WHERE session_id=$1 AND COALESCE(custodia_owner,checkpoint_usuario)=$2`,[session,email]);
  if(!owner.rows.length)return json({error:'no_encontrado'},404);
  const q=await db.query(`SELECT revision_id,creado_en,client_at,snapshot FROM dictado_checkpoint WHERE session_id=$1 AND usuario=$2 AND ($3::timestamptz IS NULL OR (creado_en,revision_id)<($3::timestamptz,$4::uuid)) ORDER BY creado_en DESC,revision_id DESC LIMIT 21`,[session,email,c?.[0]||null,c?.[1]||null]);
  const rows=q.rows.slice(0,limit);return json({owner:email,items:rows.map((x:any)=>{const s=JSON.parse(descifrarTexto(x.snapshot));return {sessionId:session,revisionId:x.revision_id,savedAt:x.creado_en,title:s.titulo||'',preview:(s.texto||s.parcial||'').slice(0,160),chars:(s.texto||'').length+(s.parcial||'').length,duration:s.duracionSeg||0,audioParts:s.audioPartes?.length||0,paired:!!s.corteAudio,throughPart:s.corteAudio?.hastaParte||null};}),nextCursor:q.rows.length>limit?encode([rows.at(-1).creado_en,rows.at(-1).revision_id]):null});
 }
 const q=await db.query(`SELECT s.session_id,COALESCE(s.checkpoint_en,s.actualizado_en) AS saved_at,c.revision_id,c.snapshot,(SELECT count(*)::int FROM dictado_audio_parte a WHERE a.session_id=s.session_id AND a.estado_verificacion='verificado') AS audio_count FROM dictado_session s LEFT JOIN LATERAL(SELECT revision_id,snapshot FROM dictado_checkpoint WHERE session_id=s.session_id AND usuario=$1 ORDER BY client_at DESC,creado_en DESC LIMIT 1)c ON true WHERE COALESCE(s.custodia_owner,s.checkpoint_usuario)=$1 AND s.estado<>'complete' AND ($2::timestamptz IS NULL OR (COALESCE(s.checkpoint_en,s.actualizado_en),s.session_id)<($2::timestamptz,$3::text)) ORDER BY COALESCE(s.checkpoint_en,s.actualizado_en) DESC,s.session_id DESC LIMIT 21`,[email,c?.[0]||null,c?.[1]||null]);
 const rows=q.rows.slice(0,limit);return json({owner:email,items:rows.map((x:any)=>{const s=x.snapshot?JSON.parse(descifrarTexto(x.snapshot)):{};return {sessionId:x.session_id,revisionId:x.revision_id||null,savedAt:x.saved_at,title:s.titulo||'',preview:(s.texto||s.parcial||'').slice(0,160),chars:(s.texto||'').length+(s.parcial||'').length,duration:s.duracionSeg||0,audioParts:s.corteAudio?.hastaParte??(s.audioPartes?.length||0),paired:!!s.corteAudio,throughPart:s.corteAudio?.hastaParte||null};}),nextCursor:q.rows.length>limit?encode([rows.at(-1).saved_at,rows.at(-1).session_id]):null});
 }catch(e){return json({error:e instanceof Error&&e.message==='cursor_invalido'?'cursor_invalido':'catalogo_no_disponible'},e instanceof Error&&e.message==='cursor_invalido'?400:503);}
}
/** Fork an explicitly selected checkpoint, never overwrite the original session/history. */
export async function recuperarCheckpoint(req:NextRequest,email:string){
 if(req.headers.get('origin')!==req.nextUrl.origin)return json({error:'origen_no_permitido'},403);
 const parsed=z.object({sourceSessionId:uuid,revisionId:uuid,sessionId:uuid}).strict().safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json({error:'seleccion_invalida'},400);
 const p=parsed.data;if(p.sessionId===p.sourceSessionId)return json({error:'sesion_nueva_requerida'},400);
 const c=await getDb().connect();
 try{
 await c.query('BEGIN');
 const owner=await c.query(`SELECT session_id,estado,volcado_id FROM dictado_session WHERE session_id=$1 AND COALESCE(custodia_owner,checkpoint_usuario)=$2 FOR UPDATE`,[p.sourceSessionId,email]);
 if(!owner.rows.length){await c.query('ROLLBACK');return json({error:'no_encontrado'},404);}
 if(owner.rows[0].estado==='complete'){await c.query('ROLLBACK');return json({error:'sesion_sellada',id:owner.rows[0].volcado_id},409);}
 const rev=await c.query(`SELECT snapshot FROM dictado_checkpoint WHERE revision_id=$1 AND session_id=$2 AND usuario=$3`,[p.revisionId,p.sourceSessionId,email]);
 if(!rev.rows.length){await c.query('ROLLBACK');return json({error:'revision_no_encontrada'},404);}
 const original=JSON.parse(descifrarTexto(rev.rows[0].snapshot));
 if(original.sessionId!==p.sourceSessionId||original.revisionId!==p.revisionId){await c.query('ROLLBACK');return json({error:'revision_inconsistente'},409);}
 const all=(await c.query(partesSql,[p.sourceSessionId])).rows;
 // Legacy snapshots carry no synchronized cut. Preserve their recorded manifest, never invent alignment.
 const total=original.corteAudio?.hastaParte??(Array.isArray(original.audioPartes)?original.audioPartes.length:0);
 const parts=all.filter((x:any)=>x.parte<=total);
 if(total>0&&!evaluarCustodiaAudio(parts.map((x:any)=>({part_index:x.parte,bytes:x.bytes,sha256:x.sha256,estado_verificacion:x.verificado?'verificado':'pendiente'})),total).ok){await c.query('ROLLBACK');return json({error:'audio_no_verificado'},409);}
 const existing=await c.query(`SELECT custodia_owner,estado FROM dictado_session WHERE session_id=$1 FOR UPDATE`,[p.sessionId]);
 if(existing.rows.length){
  if(existing.rows[0].estado==='complete'){await c.query('ROLLBACK');return json({error:'sesion_sellada'},409);}
  const old=await c.query(`SELECT snapshot FROM dictado_checkpoint WHERE session_id=$1 AND usuario=$2 ORDER BY creado_en LIMIT 1`,[p.sessionId,email]);
  const saved=old.rows[0]?JSON.parse(descifrarTexto(old.rows[0].snapshot)):null;
  if(existing.rows[0].custodia_owner!==email||saved?.recuperadaDe?.sessionId!==p.sourceSessionId||saved?.recuperadaDe?.revisionId!==p.revisionId){await c.query('ROLLBACK');return json({error:'conflicto_recuperacion'},409);}
  await c.query('COMMIT');return json({owner:email,recovery:saved,idempotent:true});
 }
 const snapshot={...original,sessionId:p.sessionId,revisionId:randomUUID(),clientAt:Date.now(),audioPartes:parts,recuperadaDe:{sessionId:p.sourceSessionId,revisionId:p.revisionId}};
 await c.query(`INSERT INTO dictado_session(session_id,estado,custodia_owner,checkpoint_usuario,checkpoint_en,checkpoint_text,checkpoint_sha256) VALUES($1,'checkpoint',$2,$2,now(),$3,$4)`,[p.sessionId,email,cifrarTexto((snapshot.texto||'')+(snapshot.parcial?'\n\n'+snapshot.parcial:'')),createHash('sha256').update((snapshot.texto||'')+(snapshot.parcial?'\n\n'+snapshot.parcial:'')).digest('hex')]);
 // References reuse the existing encrypted originals; no download, recoding or deletion.
 if(total>0)await c.query(`INSERT INTO dictado_audio_parte(session_id,part_index,blob_url,blob_path,bytes,sha256,fuente_audio,original_name,mime_type,estado,start_ms,end_ms,duracion_ms,estado_verificacion) SELECT $2,part_index,blob_url,blob_path,bytes,sha256,fuente_audio,original_name,mime_type,estado,start_ms,end_ms,duracion_ms,estado_verificacion FROM dictado_audio_parte WHERE session_id=$1 AND part_index<=$3`,[p.sourceSessionId,p.sessionId,total]);
 const text=(snapshot.texto||'')+(snapshot.parcial?'\n\n'+snapshot.parcial:'');
 await c.query(`INSERT INTO dictado_checkpoint(revision_id,session_id,usuario,client_at,texto,sha256,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7)`,[snapshot.revisionId,p.sessionId,email,snapshot.clientAt,cifrarTexto(text),createHash('sha256').update(text).digest('hex'),cifrarTexto(JSON.stringify(snapshot))]);
 await c.query('COMMIT');return json({owner:email,recovery:snapshot});
 }catch{await c.query('ROLLBACK').catch(()=>undefined);return json({error:'recuperacion_no_confirmada'},503);}finally{c.release();}
}
