import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getDb } from "./neon";
import { cifrarTexto, descifrarTexto } from "./cripto";
import { PIPELINE, METHOD, PROMPT, digest, segment, validateExtraction, project, relationsOf, type Source, type Proposal, type HumanDecision, IDENTITY_PROMPT, pendingIdentities, identityBatch, validateIdentities, type IdentityPair, scopeGraph } from "../graph-twins";

import {graphModel} from "./graph-diagnostic";
import {IDENTITY_REFERENCE_PROMPT,identityReferenceInput,validateIdentityReferences} from "./graph-identity-refs";
const MODEL=graphModel();
const ORIGINALS_OWNER="the.willfreeman@gmail.com"; // Explicit owner authorization, 2026-10-17; no custody approval.
const SOURCE_SQL=`SELECT v.id,COALESCE(v.version_aprobada,1) AS version_aprobada,
 COALESCE(v.sha256_aprobado,vv.sha256) AS sha256_aprobado,v.recibido_en,vv.texto,vv.sha256,v.sha256 AS vigente_sha256,
 CASE WHEN v.version_aprobada IS NULL AND v.sha256_aprobado IS NULL THEN 'original_unreviewed' ELSE 'custody_approved' END AS input_basis
 FROM volcado v LEFT JOIN volcado_version vv ON vv.volcado_id=v.id AND vv.version=COALESCE(v.version_aprobada,1)
 WHERE COALESCE(to_jsonb(v)->>'tipo_entrada','general') <> 'interpretacion_simultanea' AND v.usuario=$1 AND (v.version_aprobada IS NOT NULL OR v.sha256_aprobado IS NOT NULL OR $2::boolean)
 ORDER BY v.recibido_en,v.id`;
type DbSource={id:string;version_aprobada:number;sha256_aprobado:string;recibido_en:Date|string;texto:string;sha256:string;vigente_sha256:string;input_basis:string};
async function sources(db:PoolClient,owner:string):Promise<DbSource[]>{
 const rows=(await db.query(SOURCE_SQL,[owner,owner===ORIGINALS_OWNER])).rows as DbSource[],valid:DbSource[]=[];
 for(const r of rows){let ok=Boolean(r.texto&&r.version_aprobada&&r.sha256_aprobado&&r.sha256?.trim()===r.sha256_aprobado?.trim()&&r.vigente_sha256?.trim()===r.sha256_aprobado?.trim());
  if(ok){try{ok=digest(descifrarTexto(r.texto))===r.sha256_aprobado.trim();}catch{ok=false;}}
  if(!ok){if(r.input_basis==='original_unreviewed')continue;throw new Error("approved_source_integrity_mismatch_no_silent_omission");}valid.push(r);
 }return valid;
}
async function custodyStatus(db:PoolClient,owner:string,eligible:number){const r=await db.query("SELECT count(*)::int AS total FROM volcado WHERE usuario=$1",[owner]);const total=Number(r.rows[0].total);return {total,eligible,excluded:total-eligible,editorial_exclusion:"interpretacion_simultanea (preserved in custody, excluded from personal graph)",policy:owner===ORIGINALS_OWNER?"owner-authorized-original-v1-verified-hash-no-custody-approval":"approved-version-with-matching-hash"};}
function sourceStamp(rows:DbSource[]){return digest(JSON.stringify(["exclude-simultaneous-interpretation-v1",rows.map(r=>[r.id,r.version_aprobada,r.sha256_aprobado,r.input_basis])]));}
function approvedSource(r:DbSource):Source{return {volcado_id:r.id,version:Number(r.version_aprobada),sha256:r.sha256_aprobado.trim(),captured_at:new Date(r.recibido_en).toISOString()};}
async function proposals(db:PoolClient,owner:string){
 const selected=await sources(db,owner);
 const r=await db.query(`SELECT p.payload_cifrado FROM grafo_par_propuesta p JOIN volcado v ON v.id=p.volcado_id
 WHERE p.owner=$1 AND v.usuario=$1 AND p.pipeline=$2 ORDER BY p.volcado_id`,[owner,PIPELINE]);
 return r.rows.map(r=>JSON.parse(descifrarTexto(r.payload_cifrado)) as Proposal).filter(p=>selected.some(s=>s.id===p.source.volcado_id&&s.version_aprobada===p.source.version&&s.sha256_aprobado.trim()===p.source.sha256));
}
async function decisions(db:PoolClient,owner:string):Promise<HumanDecision[]>{
 const r=await db.query("SELECT proposal_id,item_id,decision,actor,origin,creado_en AS created_at FROM grafo_par_juicio WHERE owner=$1 ORDER BY sequence",[owner]);
 return r.rows;
}
async function snapshot(db:PoolClient,owner:string){
 const all=await proposals(db,owner),judgments=await decisions(db,owner),rows=await sources(db,owner);
 const automatic=project(all,judgments,"automatic",owner),curated=project(all,judgments,"curated",owner);
 const identityPending=pendingIdentities(all).length;
 const completed=all.filter(p=>p.next===p.length).length;
 const payload={revision:randomUUID(),source_stamp:sourceStamp(rows),pipeline:PIPELINE,method:METHOD,prompt_hash:digest(PROMPT),prompt:PROMPT,
 model:MODEL,temperature:0,provider:"Groq (existing configured provider)",release:process.env.VERCEL_GIT_COMMIT_SHA||process.env.KHORA_RELEASE_SHA||null,
 created_at:new Date().toISOString(),custody:await custodyStatus(db,owner,rows.length),source_count:rows.length,completed,pending:rows.length-completed+identityPending,pending_sources:rows.length-completed,pending_identity_pairs:identityPending,identity_prompt:IDENTITY_REFERENCE_PROMPT,identity_prompt_hash:digest(IDENTITY_REFERENCE_PROMPT),identity_evidence_binding:"source-context-reference-v1",identity_candidates_policy:"exact lexical candidates plus grounded relation endpoint pairs; aliases without lexical/explicit relation bridge may remain unresolved",
 automatic,curated,proposals:all,judgments,
 input_policy:owner===ORIGINALS_OWNER?"Originales v1 autorizados por el propietario; integridad verificada; sin aprobar Custodia ni ratificar relaciones.":"Solo versiones aprobadas en Custodia",
 limitations:["Sin cotejo de originalidad/repetición para Ideación Asíncrona Recuperable.","Las identidades entre fuentes son propuestas del sistema con sustento textual; no equivalen a ratificación humana ni garantía semántica. Las coincidencias de nombre solo generan candidatos; pueden quedar alias sin resolver.","Un ancla verificada prueba procedencia, no fidelidad semántica. Revisión humana aún necesaria.","Los intervalos sin propuesta quedan pendientes de revisión, no descartados como carentes de contenido."]};
 await db.query(`INSERT INTO grafo_par_snapshot(owner,revision,payload_cifrado) VALUES($1,$2,$3)
 ON CONFLICT(owner) DO UPDATE SET revision=EXCLUDED.revision,payload_cifrado=EXCLUDED.payload_cifrado,actualizado_en=now()`,[owner,payload.revision,cifrarTexto(JSON.stringify(payload))]);
 return payload;
}
export async function readPair(owner:string){
 const db=await getDb().connect();try{
  const rows=await sources(db,owner),r=await db.query("SELECT payload_cifrado FROM grafo_par_snapshot WHERE owner=$1",[owner]);
  const custody=await custodyStatus(db,owner,rows.length);
  if(!r.rows.length)return {custody,empty:true,source_count:rows.length,pending:rows.length,limitations:["Aún no se ha generado ninguna de las dos proyecciones."]};
  const payload=JSON.parse(descifrarTexto(r.rows[0].payload_cifrado));
  if(payload.pipeline!==PIPELINE||payload.model!==MODEL||payload.source_stamp!==sourceStamp(rows))return {custody,empty:true,stale:true,source_count:rows.length,pending:rows.length,limitations:["Cambió el conjunto de fuentes verificadas. Actualiza ambas proyecciones antes de consultar datos anteriores."]};
  return {...payload,custody};
 }finally{db.release();}
}
export async function nextChunk(owner:string){
 const db=await getDb().connect();
 let job:{proposal:Proposal;revision:number;text:string;stamp:string}|null=null;
 let identityJob:{pairs:IdentityPair[];proposals:Proposal[];stamp:string}|null=null;
 try{
  await db.query("BEGIN");await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",["graph-twins:"+owner]);
  const rows=await sources(db,owner),all=await proposals(db,owner);
  if(all.some(p=>p.model!==MODEL))throw new Error("extractor_model_changed_requires_new_pipeline");
  for(const r of rows){
   const source=approvedSource(r),previous=all.find(p=>p.source.volcado_id===r.id);
   if(previous&&previous.next===previous.length)continue;
   const text=descifrarTexto(r.texto);if(digest(text)!==source.sha256)throw new Error("approved_source_hash_mismatch");
   const proposal=previous||{id:randomUUID(),source,pipeline:PIPELINE,chunks:[],next:0,length:text.length,model:MODEL};
   if(!previous)await db.query("INSERT INTO grafo_par_propuesta(id,owner,volcado_id,version,sha256,pipeline,payload_cifrado) VALUES($1,$2,$3,$4,$5,$6,$7)",[proposal.id,owner,r.id,source.version,source.sha256,PIPELINE,cifrarTexto(JSON.stringify(proposal))]);
   const rev=await db.query("SELECT revision FROM grafo_par_propuesta WHERE id=$1",[proposal.id]);
   job={proposal,revision:Number(rev.rows[0].revision),text,stamp:sourceStamp(rows)};break;
  }
  if(!job){const pending=pendingIdentities(all);if(pending.length)identityJob={pairs:identityBatch(pending),proposals:all,stamp:sourceStamp(rows)};else{const result=await snapshot(db,owner);await db.query("COMMIT");return {...result,finished:true};}}
  await db.query("COMMIT");
 }catch(e){await db.query("ROLLBACK").catch(()=>undefined);throw e;}finally{db.release();}
 if(identityJob)return processIdentities(owner,identityJob);
 if(!job)throw new Error("graph_job_missing");
 // No database transaction is held across provider latency. CAS below prevents overwrites.
 const key=process.env.GROQ_API_KEY;if(!key)throw new Error("graph_provider_not_configured");
 if(job.proposal.model!==MODEL)throw new Error("extractor_model_changed_requires_new_pipeline");
 const chunk=segment(job.text,job.proposal.next);
 const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},
 body:JSON.stringify({model:MODEL,temperature:0,max_completion_tokens:10000,...(MODEL.startsWith("openai/gpt-oss-")?{reasoning_effort:"medium",include_reasoning:false}:{}),response_format:{type:"json_object"},messages:[{role:"system",content:PROMPT},{role:"user",content:JSON.stringify({source:job.proposal.source,start_utf16:chunk.start,end_utf16:chunk.end,text:chunk.text})}]}),signal:AbortSignal.timeout(35000)});
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
  if(!p||(!relationsOf([p]).some(r=>r.id===itemId)&&!(p.identities||[]).some(i=>i.id===itemId)))throw new Error("active_proposal_item_not_found");
  const existing=await db.query("SELECT owner,proposal_id,item_id,decision FROM grafo_par_juicio WHERE id=$1",[requestId]);
  if(existing.rows.length){const e=existing.rows[0];if(e.owner!==owner||e.proposal_id!==proposalId||e.item_id!==itemId||e.decision!==decision)throw new Error("judgment_request_conflict");}
  else await db.query("INSERT INTO grafo_par_juicio(id,owner,proposal_id,item_id,decision,actor,origin) VALUES($1,$2,$3,$4,$5,$2,'graph-twins-review-v1')",[requestId,owner,proposalId,itemId,decision]);
  const result=await snapshot(db,owner);await db.query("COMMIT");return result;
 }catch(e){await db.query("ROLLBACK").catch(()=>undefined);throw e;}finally{db.release();}
}

async function processIdentities(owner:string,job:{pairs:IdentityPair[];proposals:Proposal[];stamp:string}){
 const key=process.env.GROQ_API_KEY;if(!key)throw new Error("graph_provider_not_configured");
 const repair="\nLa respuesta previa no pasó validación. Usa pair_id exactamente como se recibió y left_context_ref=left y right_context_ref=right. No copies ni inventes fragmentos. Conserva el criterio estricto de identidad; omite el match incierto.";
 const attempts:Record<string,unknown>[]=[];const began=Date.now();let completion:{model?:string;id?:string}={};let identities:ReturnType<typeof validateIdentities>=[];
 for(let attempt=0;attempt<2;attempt++){
  const prompt=IDENTITY_REFERENCE_PROMPT+(attempt?repair:"");
  const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:MODEL,temperature:0,max_completion_tokens:10000,...(MODEL.startsWith("openai/gpt-oss-")?{reasoning_effort:"medium",include_reasoning:false}:{}),response_format:{type:"json_object"},messages:[{role:"system",content:prompt},{role:"user",content:JSON.stringify(identityReferenceInput(job.pairs))}]}),signal:AbortSignal.timeout(Math.max(1,Math.min(25000,45000-(Date.now()-began))))});
  if(!response.ok){const failed=await response.json().catch(()=>({}));const code=typeof failed?.error?.code==="string"&&/^[a-z0-9_]{1,60}$/.test(failed.error.code)?failed.error.code:"unknown";attempts.push({prompt_hash:digest(prompt),status:"provider_http_"+response.status,provider_code:code});if(response.status===400&&code==="json_validate_failed"&&attempt===0)continue;throw new Error("graph_identity_provider_http_"+response.status+"_"+code);}
  const body=await response.json(),choice=body.choices?.[0];completion={model:body.model,id:body.id};
  if(choice?.finish_reason!=="stop"){const code="graph_identity_provider_incomplete_response_"+(/^[a-z_]{1,40}$/.test(choice?.finish_reason||"")?choice.finish_reason:"unknown");attempts.push({prompt_hash:digest(prompt),provider_response_id:body.id||null,status:code});if(attempt===0)continue;throw new Error(code);}
  try{identities=validateIdentityReferences(JSON.parse(choice.message.content),job.pairs,job.proposals);attempts.push({prompt_hash:digest(prompt),provider_response_id:body.id||null,status:"validated"});break;}
  catch(e){const code=e instanceof SyntaxError?"invalid_extraction_identity_json":e instanceof Error?e.message:"invalid_extraction_identity_unknown";if(!/^invalid_extraction_identity_/.test(code))throw e;attempts.push({prompt_hash:digest(prompt),provider_response_id:body.id||null,status:code});if(attempt===1)throw new Error(code);}
 }
 const db=await getDb().connect();try{await db.query("BEGIN");await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",["graph-twins:"+owner]);if(sourceStamp(await sources(db,owner))!==job.stamp)throw new Error("approved_sources_changed_retry");const current=await proposals(db,owner);
 for(const p of current){const pairs=job.pairs.filter(i=>i.left.relation.source.volcado_id===p.source.volcado_id&&i.left.relation.source.sha256===p.source.sha256),examined=new Set(p.identity_examined||[]),fresh=pairs.filter(i=>!examined.has(i.id));if(!fresh.length)continue;
 p.identity_examined=[...examined,...fresh.map(i=>i.id)];p.identities=[...(p.identities||[]),...identities.filter(i=>i.proposal_id===p.id&&fresh.some(x=>x.id===i.id))];p.identity_runs=[...(p.identity_runs||[]),{created_at:new Date().toISOString(),prompt_hash:digest(IDENTITY_REFERENCE_PROMPT),evidence_binding:"source-context-reference-v1",model:completion.model||MODEL,provider_response_id:completion.id||null,attempts,temperature:0,candidates:fresh.length,proposed:identities.filter(i=>i.proposal_id===p.id).length}];
 await db.query("UPDATE grafo_par_propuesta SET payload_cifrado=$1,revision=revision+1,actualizado_en=now() WHERE id=$2 AND owner=$3",[cifrarTexto(JSON.stringify(p)),p.id,owner]);}
 const result=await snapshot(db,owner);await db.query("COMMIT");return {...result,finished:result.pending===0};}catch(e){await db.query("ROLLBACK").catch(()=>undefined);throw e;}finally{db.release();}
}

export async function scopedPair(owner:string,payload:Awaited<ReturnType<typeof readPair>>,ioId:string|null,volcadoId:string|null,limit:number){
 let source=volcadoId;
 if(ioId){const db=await getDb().connect();try{const r=await db.query("SELECT id FROM volcado WHERE usuario=$1 AND io_id=$2",[owner,ioId]);if(r.rows.length!==1||(source&&source!==r.rows[0].id))throw new Error("graph_scope_not_found");source=r.rows[0].id;}finally{db.release();}}
 if(source){const db=await getDb().connect();try{const r=await db.query("SELECT id FROM volcado WHERE usuario=$1 AND id=$2",[owner,source]);if(!r.rows.length)throw new Error("graph_scope_not_found");}finally{db.release();}}
 if(!("automatic" in payload))return {...payload,scope:{volcado_id:source,io_id:ioId,limit}};
 return {...payload,scope:{volcado_id:source,io_id:ioId,limit},automatic:scopeGraph(payload.automatic,source,limit),curated:scopeGraph(payload.curated,source,limit)};
}
