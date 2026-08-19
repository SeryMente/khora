// @l0 L0-002-R · @req FIX-DICTADO/AUTHORITATIVE-STT · @req REVISION-COCKPIT/REQ-1
import { obtenerGlosario } from "./pulido";
import { aplicarGlosario } from "../transcripcion/ensamblar";
import { getDb } from "./neon";

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export type FuenteTiming = "word_exact" | "segment_interpolated";

export interface PalabraTiming {
  palabra: string;
  char_inicio: number;
  char_fin: number;
  start_ms: number;
  end_ms: number;
  part_index: number;
  fuente_timing: FuenteTiming;
  confianza: number;
}

export type SegmentoWhisper = {
  id?: number;
  start: number;
  end: number;
  start_ms_global?: number;
  end_ms_global?: number;
  text: string;
};

export type ResultadoTranscripcion = {
  texto: string;
  exito: boolean;
  modelo: string;
  motivo?: string;
  segmentos?: SegmentoWhisper[];
};

export type MetadataChunk = {
  chunk_id: string;
  part_index: number;
  start_ms: number;
  end_ms: number;
  session_id?: string;
  estado: "provisional_asr" | "procesando" | "autoritativo_whisper" | "estabilizado" | "editado_manual" | "pendiente_error";
  texto?: string;
  motivoError?: string;
};

const TIMING_DDL = `
CREATE TABLE IF NOT EXISTS volcado_palabra_timing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  palabra TEXT NOT NULL,
  char_inicio INTEGER NOT NULL,
  char_fin INTEGER NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  part_index INTEGER NOT NULL DEFAULT 1,
  fuente_timing TEXT NOT NULL DEFAULT 'segment_interpolated',
  confianza REAL NOT NULL DEFAULT 0.70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS volcado_palabra_timing_volcado_ver_idx ON volcado_palabra_timing(volcado_id, version, sha256);
`;

let timingDdlListo = false;

export async function asegurarTablaTiming(): Promise<void> {
  if (timingDdlListo) return;
  const db = getDb();
  await db.query(TIMING_DDL);
  timingDdlListo = true;
}

/**
 * Persiste el mapa de palabras y tiempos en volcado_palabra_timing
 */
export async function guardarPalabrasTiming(
  volcadoId: string,
  version: number,
  sha256: string,
  palabras: PalabraTiming[]
): Promise<void> {
  await asegurarTablaTiming();
  const db = getDb();

  await db.query("DELETE FROM volcado_palabra_timing WHERE volcado_id = $1 AND version = $2", [volcadoId, version]);

  for (const p of palabras) {
    await db.query(
      `INSERT INTO volcado_palabra_timing
       (volcado_id, version, sha256, palabra, char_inicio, char_fin, start_ms, end_ms, part_index, fuente_timing, confianza)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        volcadoId,
        version,
        sha256,
        p.palabra,
        p.char_inicio,
        p.char_fin,
        p.start_ms,
        p.end_ms,
        p.part_index,
        p.fuente_timing,
        p.confianza,
      ]
    );
  }
}

export async function obtenerPalabrasTiming(volcadoId: string, version: number): Promise<PalabraTiming[]> {
  await asegurarTablaTiming();
  const db = getDb();
  const res = await db.query(
    `SELECT palabra, char_inicio, char_fin, start_ms, end_ms, part_index, fuente_timing, confianza
     FROM volcado_palabra_timing
     WHERE volcado_id = $1 AND version = $2
     ORDER BY char_inicio ASC`,
    [volcadoId, version]
  );
  return res.rows.map((r: any) => ({
    palabra: r.palabra,
    char_inicio: Number(r.char_inicio),
    char_fin: Number(r.char_fin),
    start_ms: Number(r.start_ms),
    end_ms: Number(r.end_ms),
    part_index: Number(r.part_index),
    fuente_timing: r.fuente_timing as FuenteTiming,
    confianza: Number(r.confianza),
  }));
}

/**
 * Interpola determinísticamente tiempos por palabra cuando sólo existen tiempos de segmento.
 */
export function interpolarPalabrasDeSegmentos(
  textoCompleto: string,
  segmentos: SegmentoWhisper[],
  partIndex = 1
): PalabraTiming[] {
  const palabrasTiming: PalabraTiming[] = [];
  if (!textoCompleto || segmentos.length === 0) return palabrasTiming;

  let posTexto = 0;

  for (const seg of segmentos) {
    const textoSeg = seg.text.trim();
    if (!textoSeg) continue;

    const idxSeg = textoCompleto.indexOf(textoSeg, posTexto);
    const charOffsetBase = idxSeg !== -1 ? idxSeg : posTexto;

    const tokens = textoSeg.split(/(\s+)/);
    const tokensPalabras = tokens.filter((t) => t.trim().length > 0);
    const totalPalabras = tokensPalabras.length;

    const segStartMs = seg.start_ms_global ?? Math.round(seg.start * 1000);
    const segEndMs = seg.end_ms_global ?? Math.round(seg.end * 1000);
    const duracionSegMs = Math.max(100, segEndMs - segStartMs);

    let offsetCharLocal = 0;
    tokensPalabras.forEach((tok, i) => {
      const inicioTokLocal = textoSeg.indexOf(tok, offsetCharLocal);
      offsetCharLocal = inicioTokLocal + tok.length;

      const charInicio = charOffsetBase + inicioTokLocal;
      const charFin = charInicio + tok.length;

      const propStart = i / totalPalabras;
      const propEnd = (i + 1) / totalPalabras;

      const startMs = Math.round(segStartMs + propStart * duracionSegMs);
      const endMs = Math.round(segStartMs + propEnd * duracionSegMs);

      palabrasTiming.push({
        palabra: tok,
        char_inicio: charInicio,
        char_fin: charFin,
        start_ms: startMs,
        end_ms: endMs,
        part_index: partIndex,
        fuente_timing: "segment_interpolated",
        confianza: 0.7,
      });
    });

    posTexto = charOffsetBase + textoSeg.length;
  }

  return palabrasTiming;
}

export function construirPromptSTT(glosario: Record<string, string>): string {
  const terminos = Object.values(glosario);
  if (terminos.length === 0) {
    return "Transcripción de dictado en español para el sistema Khora.";
  }
  return `Transcripción de dictado en español para el sistema Khora. Términos clave y nombres propios: ${terminos.join(", ")}.`;
}

/**
 * Realiza una transcripción autoritativa de un buffer/blob de audio usando Groq Whisper (whisper-large-v3).
 */
export async function transcribirAudioConGroq(
  audioBuffer: Buffer,
  filename = "dictado.webm",
  opciones?: { verboseJson?: boolean; windowOffsetMs?: number }
): Promise<ResultadoTranscripcion> {
  const clave = process.env.GROQ_API_KEY;
  const modelo =
    process.env.GROQ_WHISPER_MODEL ??
    process.env.GROQ_STT_MODEL ??
    "whisper-large-v3";

  if (!clave) {
    return {
      texto: "",
      exito: false,
      modelo,
      motivo: "GROQ_API_KEY no está configurada.",
    };
  }

  try {
    const glosario = obtenerGlosario();
    const prompt = construirPromptSTT(glosario);

    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" });
    formData.append("file", audioBlob, filename);
    formData.append("model", modelo);
    formData.append("language", "es");
    formData.append("temperature", "0");
    formData.append("prompt", prompt);
    if (opciones?.verboseJson) {
      formData.append("response_format", "verbose_json");
    }

    const res = await fetch(GROQ_STT_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + clave,
      },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return {
        texto: "",
        exito: false,
        modelo,
        motivo: `Groq STT HTTP ${res.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const textoRaw = typeof data?.text === "string" ? data.text.trim() : "";

    if (!textoRaw) {
      return {
        texto: "",
        exito: false,
        modelo,
        motivo: "Respuesta vacía de transcripción Groq Whisper",
      };
    }

    const offsetMs = opciones?.windowOffsetMs ?? 0;
    const textoConGlosario = aplicarGlosario(textoRaw, glosario);
    const segmentos = Array.isArray(data?.segments)
      ? data.segments.map((s: any) => ({
          id: s.id,
          start: s.start,
          end: s.end,
          start_ms_global: Math.round(s.start * 1000) + offsetMs,
          end_ms_global: Math.round(s.end * 1000) + offsetMs,
          text: aplicarGlosario(String(s.text || "").trim(), glosario),
        }))
      : undefined;

    return {
      texto: textoConGlosario,
      exito: true,
      modelo,
      segmentos,
    };
  } catch (e) {
    return {
      texto: "",
      exito: false,
      modelo,
      motivo: `Error al conectar con Groq STT: ${String(e)}`,
    };
  }
}

/**
 * Normaliza una palabra para comparación en solapamiento (remueve mayúsculas y puntuación).
 */
function normalizarParaOverlap(token: string): string {
  return token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export interface IntervaloTemporal {
  start_ms: number;
  end_ms: number;
}

/**
 * Une dos cadenas consecutivas deduplicando únicamente cuando existe intersección temporal efectiva.
 */
export function unirDosTranscriptsConOverlapTemporal(
  izq: string,
  der: string,
  intervaloIzq?: IntervaloTemporal,
  intervaloDer?: IntervaloTemporal
): string {
  const izqTrim = izq.trim();
  const derTrim = der.trim();

  if (!izqTrim) return derTrim;
  if (!derTrim) return izqTrim;

  if (intervaloIzq && intervaloDer) {
    const inicioInterseccion = Math.max(intervaloIzq.start_ms, intervaloDer.start_ms);
    const finInterseccion = Math.min(intervaloIzq.end_ms, intervaloDer.end_ms);

    if (finInterseccion <= inicioInterseccion) {
      return `${izqTrim} ${derTrim}`;
    }
  }

  const palabrasIzq = izqTrim.split(/\s+/);
  const palabrasDer = derTrim.split(/\s+/);

  const normIzq = palabrasIzq.map(normalizarParaOverlap);
  const normDer = palabrasDer.map(normalizarParaOverlap);

  const maxOverlap = Math.min(palabrasIzq.length, palabrasDer.length, 15);

  for (let len = maxOverlap; len >= 2; len--) {
    const sufijoIzq = normIzq.slice(normIzq.length - len).join(" ");
    const prefijoDer = normDer.slice(0, len).join(" ");

    if (sufijoIzq.length > 0 && sufijoIzq === prefijoDer) {
      const derSinOverlap = palabrasDer.slice(len).join(" ");
      return derSinOverlap ? `${izqTrim} ${derSinOverlap}` : izqTrim;
    }
  }

  return `${izqTrim} ${derTrim}`;
}

export function unirDosTranscriptsConOverlap(izq: string, der: string): string {
  return unirDosTranscriptsConOverlapTemporal(izq, der);
}

export function unirTranscriptsConOverlap(transcripts: string[]): string {
  const validos = transcripts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (validos.length === 0) return "";
  if (validos.length === 1) return validos[0];

  let acumulado = validos[0];
  for (let i = 1; i < validos.length; i++) {
    acumulado = unirDosTranscriptsConOverlap(acumulado, validos[i]);
  }
  return acumulado;
}

export type InputChunkData = {
  buffer: Buffer;
  part_index: number;
  start_ms: number;
  end_ms: number;
  session_id?: string;
};

export async function procesarChunksIncrementalesConTiempos(
  chunks: InputChunkData[],
  opciones?: { filenamePrefix?: string }
): Promise<{
  textoAutoritativo: string;
  exito: boolean;
  partesProcesadas: number;
  fallos: number;
  detallesChunks: MetadataChunk[];
  detallesFallos?: string[];
}> {
  if (!chunks || chunks.length === 0) {
    return {
      textoAutoritativo: "",
      exito: false,
      partesProcesadas: 0,
      fallos: 0,
      detallesChunks: [],
      detallesFallos: ["No se proporcionaron buffers de audio para procesar."],
    };
  }

  const detallesChunks: MetadataChunk[] = [];
  const detallesFallos: string[] = [];
  let exitos = 0;
  let fallos = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkId = `chunk-${chunk.session_id ?? "s"}-${chunk.part_index}`;

    if (!chunk.buffer || chunk.buffer.length === 0) {
      detallesChunks.push({
        chunk_id: chunkId,
        part_index: chunk.part_index,
        start_ms: chunk.start_ms,
        end_ms: chunk.end_ms,
        session_id: chunk.session_id,
        estado: "pendiente_error",
        motivoError: "Buffer de audio vacío",
      });
      fallos++;
      detallesFallos.push(`Chunk parte ${chunk.part_index}: Buffer de audio vacío`);
      continue;
    }

    const nombre = `${opciones?.filenamePrefix ?? "chunk"}-${chunk.part_index}.webm`;
    const res = await transcribirAudioConGroq(chunk.buffer, nombre, {
      verboseJson: true,
      windowOffsetMs: chunk.start_ms,
    });

    if (res.exito && res.texto.trim().length > 0) {
      detallesChunks.push({
        chunk_id: chunkId,
        part_index: chunk.part_index,
        start_ms: chunk.start_ms,
        end_ms: chunk.end_ms,
        session_id: chunk.session_id,
        estado: "autoritativo_whisper",
        texto: res.texto.trim(),
      });
      exitos++;
    } else {
      detallesChunks.push({
        chunk_id: chunkId,
        part_index: chunk.part_index,
        start_ms: chunk.start_ms,
        end_ms: chunk.end_ms,
        session_id: chunk.session_id,
        estado: "pendiente_error",
        motivoError: res.motivo ?? "Respuesta no exitosa de Whisper",
      });
      fallos++;
      detallesFallos.push(`Chunk parte ${chunk.part_index}: ${res.motivo ?? "Respuesta no exitosa"}`);
    }
  }

  const partesValidas: { texto: string; intervalo: IntervaloTemporal }[] = [];
  for (const item of detallesChunks) {
    if (item.estado === "autoritativo_whisper" && item.texto) {
      partesValidas.push({
        texto: item.texto,
        intervalo: { start_ms: item.start_ms, end_ms: item.end_ms },
      });
    } else if (item.estado === "pendiente_error") {
      partesValidas.push({
        texto: `[transcripción pendiente en parte ${item.part_index}]`,
        intervalo: { start_ms: item.start_ms, end_ms: item.end_ms },
      });
    }
  }

  let textoAcumulado = "";
  for (let i = 0; i < partesValidas.length; i++) {
    const item = partesValidas[i];
    if (i === 0) {
      textoAcumulado = item.texto;
    } else {
      const prev = partesValidas[i - 1];
      textoAcumulado = unirDosTranscriptsConOverlapTemporal(
        textoAcumulado,
        item.texto,
        prev.intervalo,
        item.intervalo
      );
    }
  }

  return {
    textoAutoritativo: textoAcumulado,
    exito: exitos > 0,
    partesProcesadas: exitos,
    fallos,
    detallesChunks,
    detallesFallos: detallesFallos.length > 0 ? detallesFallos : undefined,
  };
}

export async function procesarChunksIncrementales(
  audioBuffers: Buffer[],
  opciones?: { filenamePrefix?: string }
): Promise<{
  textoAutoritativo: string;
  exito: boolean;
  partesProcesadas: number;
  fallos: number;
  detallesFallos?: string[];
}> {
  const chunks: InputChunkData[] = audioBuffers.map((buf, i) => ({
    buffer: buf,
    part_index: i + 1,
    start_ms: i * 45000,
    end_ms: (i + 1) * 45000,
  }));

  const res = await procesarChunksIncrementalesConTiempos(chunks, opciones);
  return {
    textoAutoritativo: res.textoAutoritativo,
    exito: res.exito,
    partesProcesadas: res.partesProcesadas,
    fallos: res.fallos,
    detallesFallos: res.detallesFallos,
  };
}

export { reconciliarSegmentos } from "../transcripcion/reconciliar";
export type { EstadoSegmento, SegmentoReconciliado } from "../transcripcion/reconciliar";

export function reconciliarTranscripcion(
  previewBrowser: string,
  textoAutoritativo: string,
  opciones?: { modificadoManualmente?: boolean }
): { textoFinal: string; reconciliado: boolean; motivo: string } {
  const pTrim = previewBrowser.trim();
  const aTrim = textoAutoritativo.trim();

  if (opciones?.modificadoManualmente) {
    return {
      textoFinal: pTrim,
      reconciliado: false,
      motivo: "Protección de edición manual activa: la transcripción autoritativa no sobrescribió la corrección manual del operador.",
    };
  }

  if (!aTrim) {
    return {
      textoFinal: pTrim,
      reconciliado: false,
      motivo: "Sin transcripción autoritativa disponible; conservando previsualización ASR del navegador.",
    };
  }

  if (!pTrim) {
    return {
      textoFinal: aTrim,
      reconciliado: true,
      motivo: "Previsualización vacía; adoptando transcripción autoritativa directamente.",
    };
  }

  return {
    textoFinal: aTrim,
    reconciliado: true,
    motivo: "Reconciliación exitosa: transcripción autoritativa Groq Whisper aplicada sobre previsualización ASR.",
  };
}
