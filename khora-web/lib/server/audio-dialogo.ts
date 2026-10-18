import { leerBlobVerificado } from "./audio-mp3";
import { getDb } from "./neon";
import { descifrarTexto } from "./cripto";
import type { FuenteDialogo, ManifiestoDialogo } from "../dialogo/contrato";
/** Authorize BEFORE accessing blob locations. The client cannot supply blob URLs or owner IDs. */
export async function cargarAudioDialogo(sessionId:string,owner:string){
  const db=getDb();
  const s=await db.query(`SELECT s.estado,c.snapshot FROM dictado_session s LEFT JOIN LATERAL (SELECT snapshot FROM dictado_checkpoint WHERE session_id=s.session_id AND usuario=$2 ORDER BY client_at DESC,creado_en DESC LIMIT 1)c ON true WHERE s.session_id=$1 AND COALESCE(s.custodia_owner,s.checkpoint_usuario)=$2`,[sessionId,owner]);
  if(!s.rows.length)throw Error("dialogo_no_disponible");
  const snapshot=JSON.parse(descifrarTexto(s.rows[0].snapshot||""));
  const manifest=snapshot.dialogo as ManifiestoDialogo|undefined;
  if(snapshot.fuenteEntrada!=="dialogo"||manifest?.version!==1)throw Error("sesion_no_dialogo");
  if(manifest.estado!=="detenido"&&manifest.estado!=="interrumpido")throw Error("deten_ambas_fuentes_antes_de_procesar");
  const rows=await db.query(`SELECT part_index,blob_url,bytes,sha256,fuente_audio,start_ms,end_ms,estado_verificacion FROM dictado_audio_parte WHERE session_id=$1 ORDER BY part_index`,[sessionId]);
  if(rows.rows.length!==manifest.partesEsperadas||!rows.rows.length)throw Error("dialogo_partes_pendientes");
  const groups=new Map<FuenteDialogo,{bytes:Buffer[];offsetMs:number}>();
  let size=0;
  for(let i=0;i<rows.rows.length;i++){
    const r=rows.rows[i];
    if(Number(r.part_index)!==i+1||r.estado_verificacion!=="verificado"||!["microphone","chrome_tab"].includes(r.fuente_audio)||!Number.isFinite(Number(r.start_ms))||Number(r.start_ms)<0)throw Error("dialogo_parte_no_verificada");
    size+=Number(r.bytes);if(size>40_000_000)throw Error("dialogo_excede_limite_de_procesamiento_exporta_originales");
    const bytes=await leerBlobVerificado(r.blob_url,Number(r.bytes),r.sha256);
    const fuente=r.fuente_audio as FuenteDialogo;
    const group=groups.get(fuente)??{bytes:[],offsetMs:Number(r.start_ms)};
    group.bytes.push(bytes);groups.set(fuente,group);
  }
  const pistas=[...groups].map(([fuente,g])=>({fuente,bytes:Buffer.concat(g.bytes),offsetMs:g.offsetMs}));
  if(pistas.some(p=>p.bytes.length>20_000_000))throw Error("dialogo_pista_excede_20MB_exporta_original");
  return {pistas,manifest};
}
