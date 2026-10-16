/** Durable secondary work. Source capture commits before any external API call.
 * Scheduling is separate: browser heartbeats, authenticated POST, or the opt-in CLI worker.
 */
import { randomUUID } from "node:crypto";
import { getDb } from "./neon";
import { cifrarTexto, descifrarTexto } from "./cripto";
import { generarTituloConGarantia } from "./titulos";
import { espejarVolcado, type DatosEspejo } from "./espejoNotion";
import { generarMp3Sesion } from "./audio-mp3";
import { asegurarCustodiaContinua } from "./custodia-schema";

type Query = { query: (sql: string, params?: any[]) => Promise<any> };
export function esperaReintento(intentos: number): number {
  return Math.min(21600, 30 * 2 ** Math.min(10, Math.max(0, intentos - 1)));
}
export async function encolarTrabajosCaptura(db: Query, data: DatosEspejo & {sessionId:string;usuario:string;tituloAutomatico:boolean}) {
  const base = `${data.volcado_id}:${data.version}:${data.sha256}`;
  for (const tipo of (data.tituloAutomatico && data.texto.trim() ? ["titulo", "espejo"] : ["espejo"])) {
    await db.query(`INSERT INTO dictado_custodia_trabajo(clave,session_id,usuario,tipo,payload)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(clave) DO NOTHING`,
      [`${tipo}:${base}`,data.sessionId,data.usuario,tipo,cifrarTexto(JSON.stringify(data))]);
  }
}
export async function procesarTrabajoCustodia(usuario: string) {
  const db=getDb(), lease=randomUUID();
  const picked=await db.query(`UPDATE dictado_custodia_trabajo SET estado='procesando',lease_id=$2,
    lease_until=now()+interval '10 minutes',intentos=intentos+1,actualizado_en=now()
    WHERE clave=(SELECT clave FROM dictado_custodia_trabajo WHERE usuario=$1 AND estado<>'completo'
      AND siguiente_intento<=now() AND (lease_until IS NULL OR lease_until<now())
      ORDER BY siguiente_intento,creado_en FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,[usuario,lease]);
  if(!picked.rows.length)return false;
  const job=picked.rows[0];
  try {
    const data=JSON.parse(descifrarTexto(job.payload));
    let result: unknown;
    if(job.tipo==='titulo') {
      const title=await generarTituloConGarantia(data.texto);
      if(title.nivel!=='ia')throw new Error('titulo_ia_no_disponible');
      // Compare-and-set: a title supplied/changed by a person always wins.
      const changed=await db.query('UPDATE volcado SET titulo=$2 WHERE id=$1 AND usuario=$3 AND titulo IS NOT DISTINCT FROM $4 RETURNING id',
        [data.volcado_id,title.title,usuario,data.titulo??null]);
      result={aplicado:changed.rowCount===1,titulo_manual_preservado:changed.rowCount===0};
    } else if(job.tipo==='espejo') {
      if(!process.env.NOTION_TOKEN||!process.env.NOTION_DB_VOLCADOS)throw new Error('espejo_no_configurado');
      result=await espejarVolcado(data);
    } else throw new Error('tipo_no_soportado');
    await db.query(`UPDATE dictado_custodia_trabajo SET estado='completo',resultado=$3,ultimo_error=NULL,
      lease_until=NULL,actualizado_en=now() WHERE clave=$1 AND lease_id=$2`,[job.clave,lease,cifrarTexto(JSON.stringify(result??{ok:true}))]);
  } catch(e) {
    const message=String((e as Error)?.message||'trabajo_fallido');
    const code=message.startsWith('titulo_ia_no_disponible')?'titulo_ia_no_disponible':message.startsWith('espejo_no_configurado')?'espejo_no_configurado':'servicio_secundario_fallido';
    await db.query(`UPDATE dictado_custodia_trabajo SET estado='fallido',ultimo_error=$3,lease_until=NULL,
      siguiente_intento=now()+($4::int*interval '1 second'),actualizado_en=now() WHERE clave=$1 AND lease_id=$2`,
      [job.clave,lease,code,esperaReintento(Number(job.intentos))]);
  }
  return true;
}
/** Bounded work per invocation; a durable queue is not itself a running scheduler. */
export async function reconciliarCustodia(usuario: string, maxJobs=2) {
  if(!usuario)throw new Error('propietario_obligatorio');
  await asegurarCustodiaContinua(); const db=getDb();
  // Include old/open sessions with verified originals; never claim or rewrite missing ownership.
  const audio=await db.query(`SELECT s.session_id FROM dictado_session s LEFT JOIN volcado v ON v.id=s.volcado_id
    LEFT JOIN dictado_mp3 m ON m.session_id=s.session_id
    WHERE COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$1
    AND EXISTS(SELECT 1 FROM dictado_audio_parte p WHERE p.session_id=s.session_id AND p.estado_verificacion='verificado')
    AND (m.session_id IS NULL OR (m.siguiente_intento<=now() AND (m.lease_until IS NULL OR m.lease_until<now())
      AND (m.estado<>'disponible' OR m.source_parts IS DISTINCT FROM (SELECT count(*)::int FROM dictado_audio_parte p WHERE p.session_id=s.session_id)
        OR (s.estado='complete' AND NOT m.captura_completa))))
    ORDER BY COALESCE(m.actualizado_en,s.actualizado_en) LIMIT 1`,[usuario]);
  for(const row of audio.rows)await generarMp3Sesion(row.session_id).catch(()=>undefined);
  let processed=0;
  for(let i=0;i<Math.min(5,Math.max(0,maxJobs));i++){if(!await procesarTrabajoCustodia(usuario))break;processed++;}
  const status=await db.query(`SELECT tipo,estado,count(*)::int AS cantidad FROM dictado_custodia_trabajo WHERE usuario=$1 GROUP BY tipo,estado`,[usuario]);
  return {trabajos_procesados:processed,audio_sesiones_intentadas:audio.rows.length,trabajos:status.rows};
}
