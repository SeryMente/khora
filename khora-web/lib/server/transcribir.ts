// @l0 L0-002-R · @req FIX-DICTADO/AUTHORITATIVE-STT
import { obtenerGlosario } from "./pulido";
import { aplicarGlosario } from "../transcripcion/ensamblar";

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

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
 * REGLA INVARIANTE FASE 2:
 * - Mismo texto + intervalo temporal solapado = candidato a deduplicación.
 * - Mismo texto + intervalos temporales distintos = repetición oral genuina que DEBE conservarse.
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

  // Si se proporcionan intervalos temporales, verificar si hay intersección temporal efectiva
  if (intervaloIzq && intervaloDer) {
    const inicioInterseccion = Math.max(intervaloIzq.start_ms, intervaloDer.start_ms);
    const finInterseccion = Math.min(intervaloIzq.end_ms, intervaloDer.end_ms);

    // Si NO hay solapamiento temporal entre las ventanas de audio (intersección <= 0),
    // se trata de un intervalo temporal distinto: CONSERVAR ambas partes intactas.
    if (finInterseccion <= inicioInterseccion) {
      return `${izqTrim} ${derTrim}`;
    }
  }

  const palabrasIzq = izqTrim.split(/\s+/);
  const palabrasDer = derTrim.split(/\s+/);

  const normIzq = palabrasIzq.map(normalizarParaOverlap);
  const normDer = palabrasDer.map(normalizarParaOverlap);

  // Buscar el mayor solapamiento de N palabras al inicio de `der` (de maxOverlap a 2)
  const maxOverlap = Math.min(palabrasIzq.length, palabrasDer.length, 15);

  for (let len = maxOverlap; len >= 2; len--) {
    const sufijoIzq = normIzq.slice(normIzq.length - len).join(" ");
    const prefijoDer = normDer.slice(0, len).join(" ");

    if (sufijoIzq.length > 0 && sufijoIzq === prefijoDer) {
      // Coincidencia exacta de tokens normalizados encontrada en la zona de solapamiento
      const derSinOverlap = palabrasDer.slice(len).join(" ");
      return derSinOverlap ? `${izqTrim} ${derSinOverlap}` : izqTrim;
    }
  }

  // Si no hay coincidencia de palabras al inicio de der, unir conservando todo el texto
  return `${izqTrim} ${derTrim}`;
}

export function unirDosTranscriptsConOverlap(izq: string, der: string): string {
  return unirDosTranscriptsConOverlapTemporal(izq, der);
}

/**
 * Une un conjunto ordenado de transcripciones parciales de chunks deduplicando solapamientos temporales.
 */
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

/**
 * Procesa incrementalmente partes/chunks de audio independientes o en secuencia con Groq Whisper.
 *
 * TOLERANCIA A FALLOS (REGLA INVARIANTE FASE 2):
 * Si un chunk intermedio falla (ej. chunk 2 de [1, 2, 3]), no destruye ni compacta la secuencia:
 * - Conserva el texto exitoso del chunk 1.
 * - Marca la posición del chunk 2 como `pendiente_error` sin unir falsamente chunk 1 y chunk 3.
 * - Conserva el texto exitoso del chunk 3.
 * - Permite un reintento idempotente posterior por `part_index`.
 */
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

  // Ensamblar texto autoritativo conservando huecos de fallos pendientes
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

export type EstadoSegmento =
  | "provisional_asr"
  | "whisper_provisional"
  | "autoritativo_whisper"
  | "estable_whisper"
  | "editado_manual"
  | "pendiente_error";

export type SegmentoReconciliado = {
  id: string;
  texto: string;
  estado: EstadoSegmento;
  modificadoManualmente?: boolean;
  start_ms_global?: number;
  end_ms_global?: number;
};

/**
 * Reconcilia la lista actual de segmentos (respetando estrictamente las ediciones manuales)
 * con la transcripción autoritativa de Groq Whisper.
 *
 * REGLAS INVARIANTES DE RECONCILIACIÓN FASE 2:
 * 1. Jamás sobreescribir un segmento con estado `editado_manual` o `modificadoManualmente === true`.
 * 2. Sustituir únicamente segmentos provisionales (`provisional_asr`, `whisper_provisional`) con contenido autoritativo.
 * 3. Identificar coincidencias y nuevos segmentos sin destruirlos ni alterar el foco.
 */
export function reconciliarSegmentos(
  segmentosExistentes: SegmentoReconciliado[],
  nuevoTextoWhisper: string
): {
  segmentos: SegmentoReconciliado[];
  textoFinal: string;
  cambiosAplicados: number;
  motivo: string;
} {
  const whisperTrim = nuevoTextoWhisper.trim();
  if (!whisperTrim) {
    const textoActual = segmentosExistentes.map((s) => s.texto).join("\n\n");
    return {
      segmentos: segmentosExistentes,
      textoFinal: textoActual,
      cambiosAplicados: 0,
      motivo: "Transcripción autoritativa vacía; conservando segmentos existentes.",
    };
  }

  const parrafosWhisper = whisperTrim
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (!segmentosExistentes || segmentosExistentes.length === 0) {
    const nuevosSegmentos: SegmentoReconciliado[] = parrafosWhisper.map((p, idx) => ({
      id: `seg-${idx + 1}-${Date.now()}`,
      texto: p,
      estado: "autoritativo_whisper",
    }));

    return {
      segmentos: nuevosSegmentos,
      textoFinal: nuevosSegmentos.map((s) => s.texto).join("\n\n"),
      cambiosAplicados: nuevosSegmentos.length,
      motivo: "Aceptación completa de transcripción autoritativa en inicialización.",
    };
  }

  let cambios = 0;
  const resultadoSegmentos: SegmentoReconciliado[] = [];
  const maxLen = Math.max(segmentosExistentes.length, parrafosWhisper.length);

  for (let i = 0; i < maxLen; i++) {
    const segExistente = segmentosExistentes[i];
    const parrafoWhisper = parrafosWhisper[i];

    if (segExistente) {
      if (segExistente.estado === "editado_manual" || segExistente.modificadoManualmente) {
        // PROTECCIÓN ESTRICTA: La edición manual del operador prevalece
        resultadoSegmentos.push(segExistente);
      } else if (parrafoWhisper) {
        if (segExistente.texto !== parrafoWhisper) {
          cambios++;
        }
        resultadoSegmentos.push({
          id: segExistente.id,
          texto: parrafoWhisper,
          estado: "autoritativo_whisper",
          start_ms_global: segExistente.start_ms_global,
          end_ms_global: segExistente.end_ms_global,
        });
      } else {
        resultadoSegmentos.push(segExistente);
      }
    } else if (parrafoWhisper) {
      cambios++;
      resultadoSegmentos.push({
        id: `seg-${i + 1}-${Date.now()}`,
        texto: parrafoWhisper,
        estado: "autoritativo_whisper",
      });
    }
  }

  const textoFinal = resultadoSegmentos.map((s) => s.texto).join("\n\n");

  return {
    segmentos: resultadoSegmentos,
    textoFinal,
    cambiosAplicados: cambios,
    motivo: `Reconciliación completada: ${cambios} segmentos actualizados, ediciones manuales protegidas.`,
  };
}

/**
 * Reconcilia la transcripción autoritativa de Groq con la previsualización del navegador (ASR).
 * Evita la duplicación de texto y respeta las modificaciones manuales explícitas si existen.
 */
export function reconciliarTranscripcion(
  previewBrowser: string,
  textoAutoritativo: string,
  opciones?: { modificadoManualmente?: boolean }
): { textoFinal: string; reconciliado: boolean; motivo: string } {
  const pTrim = previewBrowser.trim();
  const aTrim = textoAutoritativo.trim();

  // Si el texto de entrada fue editado manualmente, PROTEGERLO
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
