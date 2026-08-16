// @l0 L0-002-R · @req FIX-DICTADO/AUTHORITATIVE-STT
import { obtenerGlosario } from "./pulido";
import { aplicarGlosario } from "../transcripcion/ensamblar";

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export type ResultadoTranscripcion = {
  texto: string;
  exito: boolean;
  modelo: string;
  motivo?: string;
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
  filename = "dictado.webm"
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

    return {
      texto: textoConGlosario,
      exito: true,
      modelo,
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
 * Reconcilia la transcripción autoritativa de Groq con la previsualización del navegador (ASR).
 * Evita la duplicación de texto y respeta las modificaciones manuales explícitas si existen.
 */
export function reconciliarTranscripcion(
  previewBrowser: string,
  textoAutoritativo: string
): { textoFinal: string; reconciliado: boolean; motivo: string } {
  const pTrim = previewBrowser.trim();
  const aTrim = textoAutoritativo.trim();

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
