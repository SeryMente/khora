import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getDb } from "./neon";
import { cifrarTexto, descifrarTexto } from "./cripto";
import { PIPELINE, METHOD, PROMPT, digest, segment, validateExtraction, project, relationsOf, type Source, type Proposal, type HumanDecision } from "../graph-twins";

const MODEL=process.env.GROQ_GRAPH_MODEL||process.env.GROQ_PULIDO_MODEL||"llama-3.3-70b-versatile";
const SOURCE_SQL=`SELECT v.id,v.version_aprobada,v.sha256_aprobado,v.recibido_en,vv.texto,vv.sha256,v.sha256 AS vigente_sha256
 FROM volcado v LEFT JOIN volcado_version vv ON vv.volcado_id=v.id AND vv.version=v.version_aprobada
 WHERE v.usuario=$1 AND (v.version_aprobada IS NOT NULL OR v.sha256_aprobado IS NOT NULL)
 ORDER BY v.recibido_en,v.id`;
type DbSource={id:string;version_aprobada:number;sha256_aprobado:string;recibido_en:Date|string;texto:string;sha256:string;vigente_sha256:string};
async function sources(db:PoolClient,owner:string):Promise<DbSource[]>{const rows=(await db.query(SOURCE_SQL,[owner])).rows as DbSource[];for(const r of rows)if(!r.texto||!r.version_aprobada||!r.sha256_aprobado||r.sha256?.trim()!==r.sha256_aprobado.trim()||r.vigente_sha256?.trim()!==r.sha256_aprobado.trim())throw new Error("approved_source_integrity_mismatch_no_silent_omission");return rows;}
function sourceStamp(rows:DbSource[]){return digest(JSON.stringify(rows.map(r=>[r.id,r.version_aprobada,r.sha256_aprobado])));}
function approvedSource(r:DbSource):Source{return {volcado_id:r.id,version:Number(r.version_aprobada),sha256:r.sha256_aprobado.trim(),captured_at:new Date(r.recibido_en).toISOString()};}
async function proposals(db:PoolClient,owner:string){
 const r=await db.query(`SELECT p.payload_cifrado FROM grafo_par_propuesta p JOIN volcado v ON v.id=p.volcado_id
 WHERE p.owner=$1 AND v.usuario=$1 AND p.pipeline=$2 AND p.version=v.version_aprobada
 AND p.sha256=v.sha256_aprobado AND p.sha256=v.sha256 ORDER BY p.volcado_id`,[owner,PIPELINE]);
 return r.rows.map(r=>JSON.parse(descifrarTexto(r.payload_cifrado)) as Proposal);
}
async function decisions(db:PoolClient,owner:string):Promise<HumanDecision[]>{
 const r=await db.query("SELECT proposal_id,item_id,decision,actor,origin,creado_en AS created_at FROM grafo_par_juicio WHERE owner=$1 ORDER BY sequence",[owner]);
 return r.rows;
}
async function snapshot(db:PoolClient,owner:string){
 const all=await proposals(db,owner),judgments=await decisions(db,owner),rows=await sources(db,owner);
 const automatic=project(all,judgments,"automatic",owner),curated=project(all,judgments,"curated",owner);
 const completed=all.filter(p=>p.next===p.length).length;
 const payload={revision:randomUUID(),source_stamp:sourceStamp(rows),pipeline:PIPELINE,method:METHOD,prompt_hash:digest(PROMPT),prompt:PROMPT,
 model:MODEL,temperature:0,provider:"Groq (existing configured provider)",release:process.env.VERCEL_GIT_COMMIT_SHA||null,
 created_at:new Date().toISOString(),source_count:rows.length,completed,pending:rows.length-completed,
 automatic,curated,proposals:all,judgments,
 limitations:["Sin cotejo de originalidad/repetición para Ideación Asíncrona Recuperable.","Nodos léxicos locales a cada fuente: coincidencia de escritura no prueba identidad. No hay fusiones entre fuentes.","Un ancla verificada prueba procedencia, no fidelidad semántica. Revisión humana aún necesaria.","Los intervalos sin propuesta quedan pendientes de revisión, no descartados como carentes de contenido."]};
 await db.query(`INSERT INTO grafo_par_snapshot(owner,revision,payload_cifrado) VALUES($1,$2,$3)
 ON CONFLICT(owner) DO UPDATE SET revision=EXCLUDED.revision,payload_cifrado=EXCLUDED.payload_cifrado,actualizado_en=now()`,[owner,payload.revision,cifrarTexto(JSON.stringify(payload))]);
 return payload;
}
export async function readPair(owner:string){
 const db=await getDb().connect();try{
  const rows=await sources(db,owner),r=await db.query("SELECT payload_cifrado FROM grafo_par_snapshot WHERE owner=$1",[owner]);
  if(!r.rows.length)return {empty:true,source_count:rows.length,pending:rows.length,limitations:["Aún no se ha generado ninguna de las dos proyecciones."]};
  const payload=JSON.parse(descifrarTexto(r.rows[0].payload_cifrado));
  if(payload.source_stamp!==sourceStamp(rows))return {empty:true,stale:true,source_count:rows.length,pending:rows.length,limitations:["Cambió el conjunto de versiones aprobadas. Actualiza ambas proyecciones antes de consultar datos anteriores."]};
  return payload;
 }finally{db.release();}
}
export async function nextChunk(owner:string){
 const db=await getDb().connect();
 let job:{proposal:Proposal;revision:number;text:string;stamp:string}|null=null;
 try{
  await db.query("BEGIN");await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",["graph-twins:"+owner]);
  const rows=await sources(db,owner),all=await proposals(db,owner);
  for(const r of rows){
   const source=approvedSource(r),previous=all.find(p=>p.source.volcado_id===r.id);
   if(previous&&previous.next===previous.length)continue;
   const text=descifrarTexto(r.texto);if(digest(text)!==source.sha256)throw new Error("approved_source_hash_mismatch");
   const proposal=previous||{id:randomUUID(),source,pipeline:PIPELINE,chunks:[],next:0,length:text.length,model:MODEL};
   if(!previous)await db.query("INSERT INTO grafo_par_propuesta(id,owner,volcado_id,version,sha256,pipeline,payload_cifrado) VALUES($1,$2,$3,$4,$5,$6,$7)",[proposal.id,owner,r.id,source.version,source.sha256,PIPELINE,cifrarTexto(JSON.stringify(proposal))]);
   const rev=await db.query("SELECT revision FROM grafo_par_propuesta WHERE id=$1",[proposal.id]);
   job={proposal,revision:Number(rev.rows[0].revision),text,stamp:sourceStamp(rows)};break;
  }
  if(!job){const result=await snapshot(db,owner);await db.query("COMMIT");return {...result,finished:true};}
  await db.query("COMMIT");
 }catch(e){await db.query("ROLLBACK").catch(()=>undefined);throw e;}finally{db.release();}
 // No database transaction is held across provider latency. CAS below prevents overwrites.
 const key=process.env.GROQ_API_KEY;if(!key)throw new Error("graph_provider_not_configured");
 if(job.proposal.model!==MODEL)throw new Error("extractor_model_changed_requires_new_pipeline");
 const chunk=segment(job.text,job.proposal.next);
 const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},
 body:JSON.stringify({model:MODEL,temperature:0,max_tokens:6000,response_format:{type:"json_object"},messages:[{role:"system",content:PROMPT},{role:"user",content:JSON.stringify({source:job.proposal.source,start_utf16:chunk.start,end_utf16:chunk.end,text:chunk.text})}]}),signal:AbortSignal.timeout(35000)});
 if(!response.ok)throw new Error("graph_provider_http_"+response.status);
 const completion=await response.json();const choice=completion.choices?.[0];if(choice?.finish_reason!=="stop")throw new Error("graph_provider_incomplete_response");
 const extraction=validateExtraction(JSON.parse(choice.message.content),job.text,job.proposal.source,job.proposal.next);
 extraction.model=String(completion.model||MODEL);extraction.provider_response_id=completion.id||null;
 job.proposal.chunks.push(extraction);job.proposal.next=chunk.next;
 const writer=await getDb().connect();try{
  await writer.query("BEGIN");await writer.query("SELECT pg_advisory_xact_lock(hashtext($1))",["graph-twins:"+owner]);
  if(sourceStamp(await sources(writer,owner))!==job.stamp)throw new Error("approved_sources_changed_retry");
  const updated=await writer.query("UPDATE grafo_par_propuesta SET payload_cifrado=$1,cursor_actual=$2,revision=revision+1,actualizado_en=now() WHERE id=$3 AND owner=$4 AND revision=$5 RETURNING id",[cifrarTexto(JSON.stringify(job.proposal)),job.proposal.next,job.proposal.id,owner,job.revision]);
  if(!updated.rows.length)throw new Error("concurrent_chunk_retry");
  const result=await snapshot(writer,owner);await writer.query("COMMIT");return {...result,finished:result.pending===0};
 }catch(e){await writer.query("ROLLBACK").catch(()=>undefined);throw e;}finally{writer.release();}
}
export async function judge(owner:string,proposalId:string,itemId:string,decision:"accept"|"reject",requestId:string){
 const db=await getDb().connect();try{
  await db.query("BEGIN");await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",["graph-twins:"+owner]);
  const all=await proposals(db,owner),p=all.find(p=>p.id===proposalId);
  if(!p||!relationsOf([p]).some(r=>r.id===itemId))throw new Error("active_proposal_item_not_found");
  const existing=await db.query("SELECT owner,proposal_id,item_id,decision FROM grafo_par_juicio WHERE id=$1",[requestId]);
  if(existing.rows.length){const e=existing.rows[0];if(e.owner!==owner||e.proposal_id!==proposalId||e.item_id!==itemId||e.decision!==decision)throw new Error("judgment_request_conflict");}
  else await db.query("INSERT INTO grafo_par_juicio(id,owner,proposal_id,item_id,decision,actor,origin) VALUES($1,$2,$3,$4,$5,$2,'graph-twins-review-v1')",[requestId,owner,proposalId,itemId,decision]);
  const result=await snapshot(db,owner);await db.query("COMMIT");return result;
 }catch(e){await db.query("ROLLBACK").catch(()=>undefined);throw e;}finally{db.release();}
}
