import { getMcpReadOnlyDb } from "./mcp-db";
import { leerBlobVerificado } from "./audio-mp3";
export async function toolKhoraListarAudios(actor:string,args:{limite?:number;offset?:number}) {
  const r=await getMcpReadOnlyDb().query(`SELECT s.session_id,v.id AS volcado_id,v.folio,v.titulo,s.estado AS estado_captura,s.total_partes,count(p.id)::int AS partes_registradas,COALESCE(sum(p.bytes),0)::bigint AS bytes_originales,COALESCE(m.estado,'pendiente') AS estado_mp3,m.sha256 AS mp3_sha256,m.bytes AS mp3_bytes,m.ultimo_error AS mp3_error FROM dictado_session s LEFT JOIN volcado v ON v.id=s.volcado_id JOIN dictado_audio_parte p ON p.session_id=s.session_id LEFT JOIN dictado_mp3 m ON m.session_id=s.session_id WHERE COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$1 GROUP BY s.session_id,v.id,v.folio,v.titulo,m.estado,m.sha256,m.bytes,m.ultimo_error ORDER BY s.actualizado_en DESC LIMIT $2 OFFSET $3`,[actor,Math.min(100,Math.max(1,args.limite||20)),Math.max(0,args.offset||0)]);
  return {audios:r.rows,limite:args.limite||20,offset:args.offset||0,nota:"El índice describe registros, no sustituye la verificación de bytes que efectúa khora_leer_audio. Incluye capturas aún no archivadas."};
}
export async function toolKhoraLeerAudio(actor:string,args:{id:string;formato?:"original"|"mp3";parte?:number;offset_bytes?:number;limite_bytes?:number}) {
  const db=getMcpReadOnlyDb();
  const s=await db.query("SELECT s.session_id,s.estado,s.total_partes,v.id AS volcado_id,v.folio FROM dictado_session s LEFT JOIN volcado v ON v.id=s.volcado_id WHERE (s.session_id=$1 OR v.id::text=$1 OR v.folio::text=$1) AND COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$2",[args.id,actor]);
  if(!s.rows.length)throw new Error("audio_no_encontrado_o_no_autorizado");
  const capture=s.rows[0];
  const manifest=await db.query("SELECT part_index,bytes,sha256,mime_type,original_name,estado_verificacion FROM dictado_audio_parte WHERE session_id=$1 ORDER BY part_index",[capture.session_id]);
  let asset:any;
  if(args.formato==="mp3") {
    const r=await db.query("SELECT estado,blob_url,sha256,bytes,ultimo_error FROM dictado_mp3 WHERE session_id=$1",[capture.session_id]);
    if(r.rows[0]?.estado!=="disponible")return {captura:capture,partes:manifest.rows,estado_mp3:r.rows[0]?.estado||"pendiente",error:r.rows[0]?.ultimo_error||null,audio_base64:null};
    asset={...r.rows[0],mime_type:"audio/mpeg",original_name:`khora-${capture.session_id}.mp3`};
  } else {
    const r=await db.query("SELECT blob_url,bytes,sha256,mime_type,original_name,estado_verificacion FROM dictado_audio_parte WHERE session_id=$1 AND part_index=$2",[capture.session_id,args.parte||1]);
    asset=r.rows[0];if(!asset||asset.estado_verificacion!=="verificado")throw new Error("parte_no_verificada");
  }
  const bytes=await leerBlobVerificado(asset.blob_url,Number(asset.bytes),asset.sha256);
  const offset=Math.max(0,Math.trunc(args.offset_bytes||0)),size=Math.min(262144,Math.max(1,Math.trunc(args.limite_bytes||65536)));
  if(offset>bytes.length)throw new Error("offset_fuera_de_rango");
  const end=Math.min(bytes.length,offset+size);
  return {captura:capture,partes:manifest.rows,formato:args.formato||"original",parte:args.formato==="mp3"?null:args.parte||1,nombre:asset.original_name||"audio-original",mime_type:asset.mime_type||"application/octet-stream",sha256:asset.sha256,bytes_totales:bytes.length,offset_bytes:offset,siguiente_offset:end<bytes.length?end:null,verificado:true,audio_base64:bytes.subarray(offset,end).toString("base64"),nota:"Bytes reales, no transcripción ni síntesis. Reconstruir en orden y contrastar SHA-256. Nunca incluir estos bytes en logs o documentos."};
}
