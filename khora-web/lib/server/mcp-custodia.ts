import { getMcpReadOnlyDb } from "./mcp-db";
import { descifrarTexto } from "./cripto";
import { leerBlobVerificado } from "./audio-mp3";

type Db = { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> };
const PAGE = 20, MAX = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/i;
const ARCHIVE = `LEFT JOIN LATERAL (
 SELECT v.id::text AS id, v.folio::text AS folio, v.usuario
 FROM volcado v WHERE v.id=s.volcado_id OR v.session_id=s.session_id
 ORDER BY (v.id=s.volcado_id) DESC LIMIT 1
) v ON TRUE`;
function limitOf(v:unknown,max=MAX):number { if(v===undefined||v===null)return PAGE;const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>max)throw Error("limite_invalido");return n; }
function cursorOf(raw:unknown,uuid=false):[string,string]|null {
 if(raw===undefined||raw===null||raw==="")return null;if(typeof raw!=="string"||raw.length>2048)throw Error("cursor_invalido");
 try{const a=JSON.parse(Buffer.from(raw,"base64url").toString("utf8"));if(!Array.isArray(a)||a.length!==2||typeof a[0]!=="string"||!Number.isFinite(Date.parse(a[0]))||typeof a[1]!=="string"||!a[1]||(uuid&&!UUID.test(a[1])))throw 0;return a;}catch{throw Error("cursor_invalido");}
}
function encode(a:[string,string]){return Buffer.from(JSON.stringify(a)).toString("base64url");}
function iso(v:unknown):string|null{if(v==null)return null;const d=v instanceof Date?v:new Date(String(v));return Number.isNaN(d.getTime())?null:d.toISOString();}
function clientIso(v:unknown):string|null{const n=Number(v);return Number.isSafeInteger(n)&&n>=0?new Date(n).toISOString():null;}
async function owns(db:Db,actor:string,id:string){if(typeof id!=="string"||!id||id.length>200)throw Error("sesion_invalida");const r=await db.query(`SELECT s.session_id FROM dictado_session s ${ARCHIVE} WHERE s.session_id=$1 AND COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$2 LIMIT 1`,[id,actor]);return r.rows.length===1;}

export async function toolKhoraCustodiaCatalogo(actor:string,args:{limite?:number;cursor?:string},db:Db=getMcpReadOnlyDb()){
 const limit=limitOf(args.limite),cursor=cursorOf(args.cursor),activity="COALESCE(s.creado_en,to_timestamp(0))",owner="COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$1";
 const [total,page]=await Promise.all([
  db.query(`SELECT count(*)::int AS total FROM dictado_session s ${ARCHIVE} WHERE ${owner}`,[actor]),
  db.query(`SELECT s.session_id,s.estado,s.total_partes,s.creado_en,s.actualizado_en,s.cerrado_en,v.id AS volcado_id,v.folio,
   lr.revision_id,lr.creado_en AS revision_en,rc.total AS revisiones,pa.total AS partes,pa.verificadas,pa.pendientes,pa.bytes,
   m.estado AS mp3_estado,m.captura_completa,m.source_parts,m.actualizado_en AS mp3_en,${activity} AS actividad
   FROM dictado_session s ${ARCHIVE}
   LEFT JOIN LATERAL(SELECT revision_id::text AS revision_id,creado_en FROM dictado_checkpoint WHERE session_id=s.session_id AND usuario=$1 ORDER BY client_at DESC,creado_en DESC,revision_id DESC LIMIT 1) lr ON TRUE
   LEFT JOIN LATERAL(SELECT count(*)::int AS total FROM dictado_checkpoint WHERE session_id=s.session_id AND usuario=$1) rc ON TRUE
   LEFT JOIN LATERAL(SELECT count(*)::int AS total,count(*) FILTER(WHERE estado_verificacion='verificado')::int AS verificadas,
    count(*) FILTER(WHERE estado_verificacion IS DISTINCT FROM 'verificado')::int AS pendientes,COALESCE(sum(bytes),0)::bigint AS bytes
    FROM dictado_audio_parte WHERE session_id=s.session_id) pa ON TRUE
   LEFT JOIN dictado_mp3 m ON m.session_id=s.session_id
   WHERE ${owner} AND ($2::timestamptz IS NULL OR (${activity},s.session_id)<($2::timestamptz,$3::text))
   ORDER BY ${activity} DESC,s.session_id DESC LIMIT $4`,[actor,cursor?.[0]??null,cursor?.[1]??null,limit+1])
 ]);
 const hasMore=page.rows.length>limit,rows=page.rows.slice(0,limit),last=rows.at(-1);
 return {items:rows.map((r:any)=>({
  sessionId:String(r.session_id),state:String(r.estado),createdAt:iso(r.creado_en),updatedAt:iso(r.actualizado_en),closedAt:iso(r.cerrado_en),
  archive:r.volcado_id?{id:String(r.volcado_id),folio:r.folio==null?null:String(r.folio)}:null,
  latestRevision:r.revision_id?{revisionId:String(r.revision_id),savedAt:iso(r.revision_en)}:null,revisionCount:Number(r.revisiones||0),
  declaredTotalParts:r.total_partes==null?null:Number(r.total_partes),
  audio:{storedParts:Number(r.partes||0),verifiedParts:Number(r.verificadas||0),pendingParts:Number(r.pendientes||0),bytesTotal:Number(r.bytes||0)},
  mp3:r.mp3_estado?{state:String(r.mp3_estado),captureComplete:r.captura_completa===true,sourceParts:r.source_parts==null?null:Number(r.source_parts),updatedAt:iso(r.mp3_en)}:{state:"NOT_REGISTERED",captureComplete:false,sourceParts:null,updatedAt:null}
 })),page:{limit,totalItems:Number(total.rows[0]?.total||0),hasMore,nextCursor:hasMore&&last?encode([iso(last.actividad)||new Date(0).toISOString(),String(last.session_id)]):null},
 universe:{includes:["incomplete","sealed_linked_to_archive","without_checkpoint","without_audio_parts"],ownerRule:"COALESCE(custodia_owner,checkpoint_usuario,linked_archive_owner)=authenticated_actor",excludes:["title","preview","text","snapshot","blob_url","audio_bytes","credentials"]}};
}
function declaredParts(s:any):number|null{if(!s||typeof s!=="object"||Array.isArray(s))return null;const n=s.corteAudio&&typeof s.corteAudio==="object"?Number(s.corteAudio.hastaParte):Array.isArray(s.audioPartes)?s.audioPartes.length:0;return Number.isSafeInteger(n)&&n>=0?n:null;}
function syncStatus(n:number|null,parts:any[]):string{
 if(n===null)return "UNVERIFIABLE";if(n===0)return parts.length===0?"NO_AUDIO":"UNEXPECTED_STORED_PARTS";const prefix=parts.filter(p=>Number(p.part_index)<=n),indices=new Set(prefix.map(p=>Number(p.part_index)));
 for(let i=1;i<=n;i++)if(!indices.has(i))return "PENDING_UPLOAD";
 return prefix.filter(p=>p.estado_verificacion==="verificado").length===n?"SYNCED":"INTEGRITY_PENDING";
}
export async function toolKhoraCustodiaRevisiones(actor:string,args:{session_id:string;limite?:number;cursor?:string},db:Db=getMcpReadOnlyDb()){
 const id=args.session_id;if(!(await owns(db,actor,id)))throw Error("sesion_no_encontrada_o_no_autorizada");const limit=limitOf(args.limite),cursor=cursorOf(args.cursor,true);
 const [count,rev,parts]=await Promise.all([
  db.query("SELECT count(*)::int AS total FROM dictado_checkpoint WHERE session_id=$1 AND usuario=$2",[id,actor]),
  db.query(`SELECT revision_id::text AS revision_id,creado_en,client_at,snapshot FROM dictado_checkpoint
   WHERE session_id=$1 AND usuario=$2 AND ($3::timestamptz IS NULL OR (creado_en,revision_id)<($3::timestamptz,$4::uuid))
   ORDER BY creado_en DESC,revision_id DESC LIMIT $5`,[id,actor,cursor?.[0]??null,cursor?.[1]??null,limit+1]),
  db.query("SELECT part_index,estado_verificacion FROM dictado_audio_parte WHERE session_id=$1 ORDER BY part_index",[id])
 ]);
 const hasMore=rev.rows.length>limit,rows=rev.rows.slice(0,limit),items=rows.map((r:any)=>{
  let n:number|null=null;try{n=declaredParts(JSON.parse(descifrarTexto(String(r.snapshot))))}catch{}
  const prefix=n===null?[]:parts.rows.filter((p:any)=>Number(p.part_index)<=n!);
  return {revisionId:String(r.revision_id),savedAt:iso(r.creado_en),clientAt:clientIso(r.client_at),declaredParts:n,
   storedParts:n===null?null:prefix.length,verifiedParts:n===null?null:prefix.filter((p:any)=>p.estado_verificacion==="verificado").length,syncStatus:syncStatus(n,parts.rows)};
 });
 const last=rows.at(-1);
 return {sessionId:id,items,page:{limit,totalItems:Number(count.rows[0]?.total||0),hasMore,nextCursor:hasMore&&last?encode([iso(last.creado_en)||new Date(0).toISOString(),String(last.revision_id)]):null},
  excludes:["title","preview","text","snapshot","blob_url","audio_bytes","credentials"]};
}
function integrityReason(code:string){switch(code){
 case "audio_integridad_rota":return "SHA256_OR_LENGTH_MISMATCH";case "blob_host_no_permitido":return "BLOB_HOST_NOT_ALLOWED";
 case "audio_manifest_invalido":return "METADATA_INVALID";case "audio_demasiado_grande":return "OBJECT_EXCEEDS_VERIFICATION_LIMIT";
 case "blob_no_encontrado":return "BLOB_NOT_FOUND";case "blob_inaccesible":return "BLOB_ACCESS_UNAVAILABLE_OR_TRANSIENT";default:return "BLOB_READ_FAILED";}}
export async function toolKhoraCustodiaVerificarIntegridad(actor:string,args:{session_id:string;limite?:number;despues_de_parte?:number},db:Db=getMcpReadOnlyDb(),readBlob:typeof leerBlobVerificado=leerBlobVerificado){
 const id=args.session_id;if(!(await owns(db,actor,id)))throw Error("sesion_no_encontrada_o_no_autorizada");const limit=limitOf(args.limite,50),after=args.despues_de_parte===undefined?0:Number(args.despues_de_parte);
 if(!Number.isSafeInteger(after)||after<0)throw Error("cursor_invalido");
 const [count,parts]=await Promise.all([
  db.query("SELECT count(*)::int AS total FROM dictado_audio_parte WHERE session_id=$1",[id]),
  db.query("SELECT part_index,bytes,sha256,blob_url FROM dictado_audio_parte WHERE session_id=$1 AND part_index>$2 ORDER BY part_index LIMIT $3",[id,after,limit+1])
 ]);
 const hasMore=parts.rows.length>limit,rows=parts.rows.slice(0,limit),items=[];
 for(const p of rows){
  const partIndex=Number(p.part_index),bytes=Number(p.bytes),sha=typeof p.sha256==="string"?p.sha256.toLowerCase():null;
  if(typeof p.blob_url!=="string"||!p.blob_url.trim()){items.push({partIndex,expectedBytes:Number.isFinite(bytes)?bytes:null,expectedSha256:sha,status:"MISSING",reason:"BLOB_REFERENCE_MISSING"});continue;}
  if(!Number.isSafeInteger(bytes)||bytes<=0||!sha||!SHA.test(sha)){items.push({partIndex,expectedBytes:Number.isFinite(bytes)?bytes:null,expectedSha256:sha,status:"UNVERIFIABLE",reason:"METADATA_INVALID"});continue;}
  let clear:Buffer|null=null;
  try{clear=await readBlob(p.blob_url,bytes,sha);items.push({partIndex,expectedBytes:bytes,expectedSha256:sha,status:"VERIFIED",reason:null});}
  catch(e){const code=e instanceof Error?e.message:"";items.push({partIndex,expectedBytes:bytes,expectedSha256:sha,status:code==="audio_integridad_rota"?"MISMATCH":code==="blob_no_encontrado"?"MISSING":"UNVERIFIABLE",reason:integrityReason(code)});}
  finally{clear?.fill(0);}
 }
 const last=rows.at(-1);
 return {sessionId:id,checkedAt:new Date().toISOString(),items,
  page:{limit,totalParts:Number(count.rows[0]?.total||0),afterPart:after,hasMore,nextAfterPart:hasMore&&last?Number(last.part_index):null},
  legend:{VERIFIED:"Blob leído, descifrado y longitud/SHA-256 coincidentes",MISSING:"Referencia Blob no registrada o el origen respondió 404",
   MISMATCH:"Bytes actuales no coinciden con longitud o SHA-256 declarados",UNVERIFIABLE:"No se pudo demostrar integridad; incluye fallos transitorios o metadatos inválidos"},
  excludes:["blob_url","clear_bytes","audio_base64","credentials"]};
}
