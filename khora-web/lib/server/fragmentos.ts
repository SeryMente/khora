// @l0 L0-002-R · @req PROMPT-8/FRAGMENTOS_ANCLADOS
import { createHash } from "crypto";
import { getDb } from "./neon";
import { asegurarTabla } from "./volcados";
import { construirTerna } from "./propuestasCorreccion";
import { descifrarTexto } from "./cripto";
import { registrarEvento } from "./eventos";
import { computeItemId, KHORA_PROPOSAL_NAMESPACE } from "../contracts/proposal";

export interface FragmentoAnclado {
  id: string;
  volcado_id: string;
  version: number;
  sha256: string;
  terna: string;
  start_pos: number;
  end_pos: number;
  cita_exacta: string;
  hash_fragmento: string;
  sello: string;
  created_at?: string;
}

export interface ResultadoGeneracionFragmentos {
  sello: string;
  terna: string;
  source_triplet: {
    volcado_id: string;
    version: number;
    sha256: string;
  };
  total_fragmentos: number;
  fragmentos: FragmentoAnclado[];
}

export interface DetalleFragmentoInverso {
  fragment_id: string;
  cita: string;
  start: number;
  end: number;
  hash_fragmento: string;
  sello: string;
  terna: {
    volcado_id: string;
    version: number;
    sha256: string;
  };
  volcado: {
    id: string;
    titulo: string | null;
    origen: string;
    estado: string;
  };
}

const FRAGMENTOS_DDL = `
CREATE TABLE IF NOT EXISTS volcado_fragmento_anclado (
  id UUID PRIMARY KEY,
  volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  terna TEXT NOT NULL,
  start_pos INTEGER NOT NULL,
  end_pos INTEGER NOT NULL,
  cita_exacta TEXT NOT NULL,
  hash_fragmento CHAR(64) NOT NULL,
  sello TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS volcado_fragmento_anclado_volcado_ver_idx ON volcado_fragmento_anclado(volcado_id, version);
CREATE INDEX IF NOT EXISTS volcado_fragmento_anclado_terna_idx ON volcado_fragmento_anclado(terna);
CREATE INDEX IF NOT EXISTS volcado_fragmento_anclado_sello_idx ON volcado_fragmento_anclado(sello);
CREATE INDEX IF NOT EXISTS volcado_fragmento_anclado_hash_idx ON volcado_fragmento_anclado(hash_fragmento);
`;

let esquemaFragmentosListo = false;

export async function asegurarEsquemaFragmentos(): Promise<void> {
  if (esquemaFragmentosListo) return;
  await asegurarTabla();
  const db = getDb();
  await db.query(FRAGMENTOS_DDL);
  esquemaFragmentosListo = true;
}

/**
 * Calcula un fragment_id UUIDv5 determinista sobre terna + span + hash_fragmento,
 * de acuerdo con la norma de identificadores del contrato 5-0 (namespace KHORA_PROPOSAL_NAMESPACE).
 */
export function calcularFragmentId(
  volcadoId: string,
  version: number,
  sha256: string,
  start: number,
  end: number,
  cita: string
): string {
  const hashFrag = createHash("sha256").update(cita, "utf8").digest("hex").toLowerCase();
  const contentKey = `${start}:${end}:${hashFrag}`;
  return computeItemId({ volcado_id: volcadoId, version, sha256 }, contentKey);
}

/**
 * Calcula un sello de pipeline único por corrida para preservar la inmutabilidad
 * y permitir corridas append-only.
 */
export function calcularSelloRun(
  terna: string,
  fragmentos: Array<{ id: string; start: number; end: number; hash_fragmento: string }>,
  runTimestamp?: string
): string {
  const ts = runTimestamp ?? new Date().toISOString();
  const raw = `${terna}:${ts}:${fragmentos.map((f) => `${f.id}:${f.start}:${f.end}:${f.hash_fragmento}`).join("|")}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Fragmenta un texto fuente en unidades contiguas garantizando cobertura 100% byte a byte
 * sin huecos ni solapes no declarados.
 */
export function segmentarTextoContiguo(sourceText: string): Array<{ start: number; end: number; cita: string }> {
  if (!sourceText || sourceText.length === 0) {
    return [];
  }

  const spans: Array<{ start: number; end: number; cita: string }> = [];

  // Dividir por saltos de párrafo (\n\n o \n) adjuntando los delimitadores para mantener contigüidad
  const regex = /(\n\n+|\n)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sourceText)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    // Fragmento de contenido previo si existió
    if (matchStart > lastIndex) {
      const cita = sourceText.slice(lastIndex, matchEnd);
      spans.push({
        start: lastIndex,
        end: matchEnd,
        cita,
      });
    } else {
      // Delimitador al inicio o consecutivo
      const cita = sourceText.slice(lastIndex, matchEnd);
      spans.push({
        start: lastIndex,
        end: matchEnd,
        cita,
      });
    }
    lastIndex = matchEnd;
  }

  // Fragmento final si restan caracteres
  if (lastIndex < sourceText.length) {
    const cita = sourceText.slice(lastIndex, sourceText.length);
    spans.push({
      start: lastIndex,
      end: sourceText.length,
      cita,
    });
  }

  return spans;
}

/**
 * Genera y persiste fragmentos literales anclados para un volcado y versión.
 * Prioriza `texto_estructurado` (párrafos ratificados) si existe; si no, utiliza `volcado_version.texto`.
 */
export async function generarFragmentosAnclados(
  volcadoId: string,
  versionObj?: number,
  options?: { actor?: string | null; mockRunTimestamp?: string }
): Promise<ResultadoGeneracionFragmentos> {
  await asegurarEsquemaFragmentos();
  const db = getDb();

  // Consultar volcado
  const vRes = await db.query(
    "SELECT id, texto, sha256, estado, texto_estructurado FROM volcado WHERE id = $1",
    [volcadoId]
  );
  if (vRes.rows.length === 0) {
    throw new Error(`Volcado no encontrado: ${volcadoId}`);
  }

  const volcadoRow = vRes.rows[0];

  // Determinar versión objetivo
  let versionActual: number;
  let sha256Version: string;
  let textoFuente: string;

  if (versionObj) {
    versionActual = versionObj;
    const verRes = await db.query(
      "SELECT version, texto, sha256 FROM volcado_version WHERE volcado_id = $1 AND version = $2",
      [volcadoId, versionObj]
    );
    if (verRes.rows.length === 0) {
      throw new Error(`Versión ${versionObj} no encontrada para el volcado ${volcadoId}`);
    }
    sha256Version = String(verRes.rows[0].sha256 ?? "");
    const rawTexto = descifrarTexto(String(verRes.rows[0].texto ?? ""));
    // Si la versión solicitada coincide con la activa y hay texto_estructurado, priorizarlo
    if (volcadoRow.texto_estructurado && String(volcadoRow.sha256) === sha256Version) {
      textoFuente = String(volcadoRow.texto_estructurado);
    } else {
      textoFuente = rawTexto;
    }
  } else {
    const verRes = await db.query(
      "SELECT COALESCE(MAX(version), 1)::int AS ultima FROM volcado_version WHERE volcado_id = $1",
      [volcadoId]
    );
    versionActual = Number(verRes.rows[0]?.ultima ?? 1);

    if (volcadoRow.texto_estructurado) {
      textoFuente = String(volcadoRow.texto_estructurado);
      sha256Version = String(volcadoRow.sha256 ?? "");
    } else {
      const verActiveRes = await db.query(
        "SELECT texto, sha256 FROM volcado_version WHERE volcado_id = $1 AND version = $2",
        [volcadoId, versionActual]
      );
      if (verActiveRes.rows.length > 0) {
        textoFuente = descifrarTexto(String(verActiveRes.rows[0].texto ?? ""));
        sha256Version = String(verActiveRes.rows[0].sha256 ?? "");
      } else {
        textoFuente = descifrarTexto(String(volcadoRow.texto ?? ""));
        sha256Version = String(volcadoRow.sha256 ?? "");
      }
    }
  }

  const ternaStr = construirTerna(volcadoId, versionActual, sha256Version);

  // Manejo de texto vacío
  if (!textoFuente || textoFuente.length === 0) {
    const runTimestamp = options?.mockRunTimestamp ?? new Date().toISOString();
    const selloVacio = createHash("sha256").update(`${ternaStr}:${runTimestamp}:empty`, "utf8").digest("hex");
    return {
      sello: selloVacio,
      terna: ternaStr,
      source_triplet: {
        volcado_id: volcadoId,
        version: versionActual,
        sha256: sha256Version,
      },
      total_fragmentos: 0,
      fragmentos: [],
    };
  }

  // Segmentar texto en unidades contiguas
  const rawSpans = segmentarTextoContiguo(textoFuente);

  // GUARDIANES DE INTEGRIDAD DE COBERTURA 100% Y OFFSETS UTF-16
  let posAcumulada = 0;
  const borradorFragmentos: Array<{
    id: string;
    start: number;
    end: number;
    cita: string;
    hash_fragmento: string;
  }> = [];

  for (let i = 0; i < rawSpans.length; i++) {
    const s = rawSpans[i];

    // Guardián 1: Contigüidad sin huecos ni solapes
    if (s.start !== posAcumulada) {
      throw new Error(
        `Violación de contigüidad en el fragmento ${i}: se esperaba start_pos=${posAcumulada}, obtenido ${s.start}`
      );
    }

    // Guardián 2: Verificación estricta de slice UTF-16
    const sliceReal = textoFuente.slice(s.start, s.end);
    if (sliceReal !== s.cita) {
      throw new Error(
        `Incoincidencia de cita en span [${s.start}, ${s.end}]: el slice de texto no coincide con la cita esperada.`
      );
    }

    posAcumulada = s.end;

    const hashFrag = createHash("sha256").update(s.cita, "utf8").digest("hex").toLowerCase();
    const fragId = calcularFragmentId(volcadoId, versionActual, sha256Version, s.start, s.end, s.cita);

    borradorFragmentos.push({
      id: fragId,
      start: s.start,
      end: s.end,
      cita: s.cita,
      hash_fragmento: hashFrag,
    });
  }

  // Guardián 3: Cobertura total del rango [0, textoFuente.length]
  if (posAcumulada !== textoFuente.length) {
    throw new Error(
      `Cobertura incompleta: se procesaron ${posAcumulada} caracteres de un total de ${textoFuente.length}`
    );
  }

  // Guardián 4: Reconstrucción 100% concatenada
  const textoReconstruido = borradorFragmentos.map((f) => f.cita).join("");
  if (textoReconstruido !== textoFuente) {
    throw new Error("Violación de reconstrucción byte a byte: la concatenación de fragmentos no coincide con el texto fuente.");
  }

  // Calcular sello de pipeline para esta corrida
  const runTimestamp = options?.mockRunTimestamp ?? new Date().toISOString();
  const selloPipeline = calcularSelloRun(ternaStr, borradorFragmentos, runTimestamp);

  // Persistir fragmentos en BD (append-only)
  const result: FragmentoAnclado[] = [];
  for (const f of borradorFragmentos) {
    const insertRes = await db.query(
      `INSERT INTO volcado_fragmento_anclado
       (id, volcado_id, version, sha256, terna, start_pos, end_pos, cita_exacta, hash_fragmento, sello)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, volcado_id, version, sha256, terna, start_pos, end_pos, cita_exacta, hash_fragmento, sello, created_at`,
      [
        f.id,
        volcadoId,
        versionActual,
        sha256Version,
        ternaStr,
        f.start,
        f.end,
        f.cita,
        f.hash_fragmento,
        selloPipeline,
      ]
    );

    const r = insertRes.rows[0];
    result.push({
      id: r.id,
      volcado_id: r.volcado_id,
      version: Number(r.version),
      sha256: r.sha256,
      terna: r.terna,
      start_pos: Number(r.start_pos),
      end_pos: Number(r.end_pos),
      cita_exacta: r.cita_exacta,
      hash_fragmento: r.hash_fragmento,
      sello: r.sello,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    });
  }

  await registrarEvento({
    fase: "revision",
    eventId: "REV-006",
    estado: "OK",
    mensaje: "Fragmentos literales anclados generados y persistidos bajo sello de pipeline",
    detalle: {
      total_fragmentos: result.length,
      sello: selloPipeline,
      version: versionActual,
      actor: options?.actor ?? null,
    },
    volcadoId,
    version: versionActual,
    sha256: sha256Version,
    correlacionId: volcadoId,
  });

  return {
    sello: selloPipeline,
    terna: ternaStr,
    source_triplet: {
      volcado_id: volcadoId,
      version: versionActual,
      sha256: sha256Version,
    },
    total_fragmentos: result.length,
    fragmentos: result,
  };
}

/**
 * Resuelve un fragment_id para obtener la cita exacta, terna y volcado asociado.
 */
export async function obtenerFragmentoPorId(fragmentId: string): Promise<DetalleFragmentoInverso | null> {
  await asegurarEsquemaFragmentos();
  const db = getDb();

  const res = await db.query(
    `SELECT f.id, f.volcado_id, f.version, f.sha256, f.terna, f.start_pos, f.end_pos, f.cita_exacta, f.hash_fragmento, f.sello, f.created_at,
            v.titulo, v.origen, v.estado
     FROM volcado_fragmento_anclado f
     JOIN volcado v ON v.id = f.volcado_id
     WHERE f.id = $1
     ORDER BY f.created_at DESC
     LIMIT 1`,
    [fragmentId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const r = res.rows[0];
  return {
    fragment_id: r.id,
    cita: r.cita_exacta,
    start: Number(r.start_pos),
    end: Number(r.end_pos),
    hash_fragmento: r.hash_fragmento,
    sello: r.sello,
    terna: {
      volcado_id: r.volcado_id,
      version: Number(r.version),
      sha256: r.sha256,
    },
    volcado: {
      id: r.volcado_id,
      titulo: r.titulo ?? null,
      origen: r.origen,
      estado: r.estado,
    },
  };
}

/**
 * Lista todos los fragmentos anclados para un volcado y versión específicos.
 */
export async function listarFragmentosPorVersion(
  volcadoId: string,
  version: number,
  sello?: string
): Promise<FragmentoAnclado[]> {
  await asegurarEsquemaFragmentos();
  const db = getDb();

  let query = `
    SELECT id, volcado_id, version, sha256, terna, start_pos, end_pos, cita_exacta, hash_fragmento, sello, created_at
    FROM volcado_fragmento_anclado
    WHERE volcado_id = $1 AND version = $2
  `;
  const params: any[] = [volcadoId, version];

  if (sello) {
    query += ` AND sello = $3`;
    params.push(sello);
  }

  query += ` ORDER BY start_pos ASC, created_at DESC`;

  const res = await db.query(query, params);

  return res.rows.map((r: any) => ({
    id: r.id,
    volcado_id: r.volcado_id,
    version: Number(r.version),
    sha256: r.sha256,
    terna: r.terna,
    start_pos: Number(r.start_pos),
    end_pos: Number(r.end_pos),
    cita_exacta: r.cita_exacta,
    hash_fragmento: r.hash_fragmento,
    sello: r.sello,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
  }));
}
