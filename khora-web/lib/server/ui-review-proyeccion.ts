// @l0 L0-002 · @req UI-REVIEW/PROYECCION · Estados de UI Review desde datos reales
//
// PROPOSITO
// UI Review muestra por defecto escenarios sinteticos. Este modulo construye los
// mismos estados tipados a partir del corpus real del operador, para que un
// modelo con la integracion MCP autorizada pueda ver la interfaz que su propio
// contenido produce: longitudes verdaderas, titulos ausentes, incidentes reales,
// densidad real de la bandeja.
//
// AUTORIZACION
// Este modulo NO autentica. Solo debe invocarse desde la ruta MCP, que ya valida
// el Bearer OAuth con scope `volcados:read`. La misma autorizacion que permite
// leer un volcado permite ver la interfaz que lo muestra: no concede acceso a
// nada que el llamante no pudiera obtener con `khora_leer_volcado`.
//
// SOLO LECTURA
// Usa el pool de solo lectura `getMcpReadOnlyDb()`. No escribe, no muta estado y
// no ejecuta acciones. Las vistas resultantes son un retrato, no una aplicacion.

import { getMcpReadOnlyDb } from "./mcp-db";
import type { IngresoViewState } from "@/app/components/shared/IngresoView";
import type { PipelineViewState } from "@/app/components/shared/PipelineView";
import type { RegistroViewState } from "@/app/components/shared/RegistroView";
import type { GrafoViewState } from "@/app/components/shared/GrafoView";
import { buildIngresoState, buildPipelineState, buildRegistroState, buildGrafoState } from "@/lib/ui-review/states";

/** Campos del volcado que la interfaz necesita. Lista blanca explicita. */
const CAMPOS_VOLCADO = `
  id, folio, titulo, estado, chars, recibido_en, origen, fuente,
  audio_url, audio_bytes, duracion_seg, session_id,
  version_aprobada, sha256_aprobado, aprobado_en,
  ultimo_error, intentos, ultimo_intento, pulido_aplicado
`;

export type ProyeccionMeta = {
  volcados_totales: number;
  con_titulo: number;
  sin_titulo: number;
  con_audio: number;
  incidentes_abiertos: number;
  chars_maximo: number;
  titulo_mas_largo: number;
};

/**
 * Metadatos de forma del corpus. Sirven para juzgar densidad y desbordamiento
 * sin necesidad de leer el contenido.
 */
export async function obtenerMetaProyeccion(): Promise<ProyeccionMeta> {
  const db = getMcpReadOnlyDb();
  const r = await db.query(`
    SELECT
      count(*)::int AS volcados_totales,
      count(*) FILTER (WHERE titulo IS NOT NULL AND titulo <> '')::int AS con_titulo,
      count(*) FILTER (WHERE titulo IS NULL OR titulo = '')::int AS sin_titulo,
      count(*) FILTER (WHERE audio_url IS NOT NULL)::int AS con_audio,
      coalesce(max(chars), 0)::int AS chars_maximo,
      coalesce(max(length(titulo)), 0)::int AS titulo_mas_largo
    FROM volcado
  `);
  const inc = await db.query(
    `SELECT count(*) FILTER (WHERE ultimo_error IS NOT NULL AND ultimo_error <> '')::int AS n FROM volcado`
  );
  const incidentes = inc.rows[0]?.n ?? 0;
  const f = r.rows[0] ?? {};
  return {
    volcados_totales: f.volcados_totales ?? 0,
    con_titulo: f.con_titulo ?? 0,
    sin_titulo: f.sin_titulo ?? 0,
    con_audio: f.con_audio ?? 0,
    incidentes_abiertos: incidentes,
    chars_maximo: f.chars_maximo ?? 0,
    titulo_mas_largo: f.titulo_mas_largo ?? 0,
  };
}

async function listarVolcados(limite: number): Promise<any[]> {
  const db = getMcpReadOnlyDb();
  const r = await db.query(
    `SELECT ${CAMPOS_VOLCADO} FROM volcado ORDER BY folio DESC NULLS LAST LIMIT $1`,
    [Math.max(1, Math.min(limite, 60))]
  );
  return r.rows;
}

async function leerTextoVolcado(id: string): Promise<string> {
  const db = getMcpReadOnlyDb();
  const r = await db.query(`SELECT texto FROM volcado WHERE id = $1 OR folio::text = $1 LIMIT 1`, [id]);
  return r.rows[0]?.texto ?? "";
}

async function volcadoParaLectura(folioOId?: string): Promise<any | null> {
  const db = getMcpReadOnlyDb();
  if (folioOId) {
    const r = await db.query(
      `SELECT ${CAMPOS_VOLCADO} FROM volcado WHERE id::text = $1 OR folio::text = $1 LIMIT 1`,
      [folioOId]
    );
    return r.rows[0] ?? null;
  }
  // Sin seleccion explicita: el volcado mas extenso, que es el caso limite util.
  const r = await db.query(`SELECT ${CAMPOS_VOLCADO} FROM volcado ORDER BY chars DESC NULLS LAST LIMIT 1`);
  return r.rows[0] ?? null;
}

export async function proyectarIngreso(folioOId?: string): Promise<IngresoViewState> {
  const base = buildIngresoState("idle");
  const v = await volcadoParaLectura(folioOId);
  if (!v) return base;
  const texto = await leerTextoVolcado(v.id);
  return {
    ...base,
    titulo: v.titulo || "",
    texto,
    conAudio: !!v.audio_url,
    partesContador: v.audio_url ? 1 : 0,
    bytesAcumulados: v.audio_bytes || 0,
    error: v.ultimo_error || "",
    reconciliacionMensaje: v.titulo ? "" : "Legibilidad: este volcado no tiene titulo.",
  };
}

export async function proyectarPipeline(
  screen: string,
  folioOId?: string
): Promise<PipelineViewState> {
  const base = buildPipelineState(screen === "archivo" ? "list" : "reading");
  const items = await listarVolcados(40);
  const seleccion = (await volcadoParaLectura(folioOId)) || items[0] || null;
  const texto = seleccion ? await leerTextoVolcado(seleccion.id) : "";

  const porEstado = (e: string) => items.filter((i) => i.estado === e).length;

  return {
    ...base,
    pipelineItems: items,
    selectedId: seleccion?.id ?? null,
    selectedItem: seleccion,
    editableTexto: texto,
    duracionTotalMs: (seleccion?.duracion_seg ?? 0) * 1000,
    currentTimeMs: 0,
    isPlaying: false,
    audioError: seleccion && !seleccion.audio_url ? "Audio no vinculado a la sesion" : null,
    manifiestoPartes: seleccion?.audio_url
      ? [
          {
            part_index: 1,
            start_ms: 0,
            end_ms: (seleccion.duracion_seg ?? 0) * 1000,
            duracion_ms: (seleccion.duracion_seg ?? 0) * 1000,
            bytes: seleccion.audio_bytes ?? 0,
            download_path: "",
          },
        ]
      : [],
    resumen: {
      total: items.length,
      en_revision: porEstado("en_revision"),
      pendiente_revision: porEstado("pendiente_revision"),
      listo_ingesta: porEstado("listo_ingesta"),
      ingerido: porEstado("ingerido"),
      anomalies: items.filter((i) => i.ultimo_error).length,
      sin_audio: items.filter((i) => !i.audio_url).length,
    },
  };
}

export async function proyectarRegistro(): Promise<RegistroViewState> {
  const base = buildRegistroState("timeline");
  const db = getMcpReadOnlyDb();
  try {
    const r = await db.query(
      `SELECT id, fase, event_id, estado, mensaje, detalle, volcado_id,
              version, sha256, correlacion_id, servidor_en, cliente_en,
              hash_anterior, event_hash
       FROM eventos_sistema ORDER BY servidor_en DESC LIMIT 60`
    );
    return { ...base, eventos: r.rows as RegistroViewState["eventos"] };
  } catch {
    return base;
  }
}

export async function proyectarGrafo(): Promise<GrafoViewState> {
  const base = buildGrafoState("populated");
  const db = getMcpReadOnlyDb();
  try {
    const r = await db.query(
      `SELECT id, titulo, chars, recibido_en FROM volcado ORDER BY folio DESC NULLS LAST LIMIT 40`
    );
    const nodes = r.rows.map((v: any) => ({
      id: String(v.id).slice(0, 8),
      summary: v.titulo || "(sin titulo)",
      community: 1,
      level: 1,
      centrality: Math.min(1, (v.chars ?? 0) / 20000),
      origen: "volcado",
      timestamp: String(v.recibido_en),
      verificacion: "real",
    }));
    return { ...base, nodes: nodes as GrafoViewState["nodes"], edges: [] };
  } catch {
    return base;
  }
}
