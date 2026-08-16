// @l0 L0-002-R · @req FIX-DICTADO/AUTHORITATIVE-STT
import { obtenerGlosario } from "./pulido";
import { aplicarGlosario } from "../transcripcion/ensamblar";

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export type SegmentoWhisper = {
  id?: number;
  start: number;
  end: number;
  text: string;
};

export type ResultadoTranscripcion = {
  texto: string;
  exito: boolean;
  modelo: string;
  motivo?: string;
  segmentos?: SegmentoWhisper[];
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
  opciones?: { verboseJson?: boolean }
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

    const textoConGlosario = aplicarGlosario(textoRaw, glosario);
    const segmentos = Array.isArray(data?.segments)
      ? data.segments.map((s: any) => ({
          id: s.id,
          start: s.start,
          end: s.end,
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

/**
 * Une dos cadenas consecutivas deduplicando la zona de solapamiento (overlap).
 * Busca la coincidencia de subsecuencias de palabras entre el final de `izq` y el inicio de `der`.
 */
export function unirDosTranscriptsConOverlap(izq: string, der: string): string {
  const izqTrim = izq.trim();
  const derTrim = der.trim();

  if (!izqTrim) return derTrim;
  if (!derTrim) return izqTrim;

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
      // Coincidencia exacta de tokens normalizados encontrada al inicio de der
      const derSinOverlap = palabrasDer.slice(len).join(" ");
      return derSinOverlap ? `${izqTrim} ${derSinOverlap}` : izqTrim;
    }
  }

  // Si no hay solapamiento al inicio de der, unir de forma segura sin descartar palabras
  return `${izqTrim} ${derTrim}`;
}

/**
 * Une un conjunto ordenado de transcripciones parciales de chunks deduplicando solapamientos.
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

/**
 * Procesa incrementalmente partes/chunks de audio independientes o en secuencia con Groq Whisper.
 * Soporta tolerancia a fallos parciales: si un chunk falla, no destruye los chunks exitosos anteriores ni el preview.
 */
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
  if (!audioBuffers || audioBuffers.length === 0) {
    return {
      textoAutoritativo: "",
      exito: false,
      partesProcesadas: 0,
      fallos: 0,
      detallesFallos: ["No se proporcionaron buffers de audio para procesar."],
    };
  }

  const resultados: string[] = [];
  const detallesFallos: string[] = [];
  let exitos = 0;
  let fallos = 0;

  for (let i = 0; i < audioBuffers.length; i++) {
    const buf = audioBuffers[i];
    if (!buf || buf.length === 0) continue;

    const nombre = `${opciones?.filenamePrefix ?? "chunk"}-${i + 1}.webm`;
    const res = await transcribirAudioConGroq(buf, nombre, { verboseJson: true });

    if (res.exito && res.texto.trim().length > 0) {
      resultados.push(res.texto.trim());
      exitos++;
    } else {
      fallos++;
      detallesFallos.push(`Chunk ${i + 1}: ${res.motivo ?? "Respuesta no exitosa"}`);
    }
  }

  const textoFinal = unirTranscriptsConOverlap(resultados);

  return {
    textoAutoritativo: textoFinal,
    exito: exitos > 0,
    partesProcesadas: exitos,
    fallos,
    detallesFallos: detallesFallos.length > 0 ? detallesFallos : undefined,
  };
}

export type EstadoSegmento = "provisional_asr" | "autoritativo_whisper" | "editado_manual";

export type SegmentoReconciliado = {
  id: string;
  texto: string;
  estado: EstadoSegmento;
  modificadoManualmente?: boolean;
};

/**
 * Reconcilia la lista actual de segmentos (que pueden incluir ediciones manuales del operador)
 * con una nueva transcripción autoritativa de Groq Whisper.
 *
 * Reglas fundamentales:
 * 1. Jamás sobreescribir un segmento con estado `editado_manual` o `modificadoManualmente === true`.
 * 2. Sustituir únicamente segmentos en estado `provisional_asr` con el correspondiente contenido autoritativo.
 * 3. Identificar coincidencias, correcciones y nuevos segmentos sin destruirlos.
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

  // Mapear y alinear respetando ediciones manuales
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
        // Actualizar segmento provisional con el autoritativo
        if (segExistente.texto !== parrafoWhisper) {
          cambios++;
        }
        resultadoSegmentos.push({
          id: segExistente.id,
          texto: parrafoWhisper,
          estado: "autoritativo_whisper",
        });
      } else {
        // Si Whisper devolvió menos párrafos pero el segmento es válido, conservarlo
        resultadoSegmentos.push(segExistente);
      }
    } else if (parrafoWhisper) {
      // Nuevo segmento devuelto por Whisper
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

  // Si son sustancialmente similares o la autoritativa es de mayor calidad, se adopta la autoritativa
  return {
    textoFinal: aTrim,
    reconciliado: true,
    motivo: "Reconciliación exitosa: transcripción autoritativa Groq Whisper aplicada sobre previsualización ASR.",
  };
}
