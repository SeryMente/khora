// @l0 L0-002 · @req LLM-LOCAL/OLLAMA · Módulo cliente para comunicación directa con Ollama local (localhost:11434)
import { MODEL_CATALOG_CONFIG, LocalModelCatalogEntry } from "../config/model_catalog";

export interface OllamaChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
}

export interface OllamaStreamChunk {
  model?: string;
  created_at?: string;
  message?: {
    role?: string;
    content?: string;
  };
  done?: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number; // tokens generados
  eval_duration?: number; // duración en nanosegundos (1e9 ns = 1 sec)
}

export interface OllamaInferenceOptions {
  model: string;
  messages: OllamaChatMessage[];
  baseUrl?: string;
  onChunk?: (chunkText: string, fullText: string, chunkObj: OllamaStreamChunk) => void;
  signal?: AbortSignal;
}

export interface OllamaInferenceResult {
  contenido: string;
  evalCount: number | null;
  evalDurationNs: number | null;
  tps: number | null;
  durationMs: number;
  ttftMs: number | null;
  exactTokens: boolean;
  origenModel: string;
}

export type EstadoConexionOllama = "no_instalado" | "sin_modelo" | "listo" | "error";

export interface DiagnosticoOllamaResult {
  estado: EstadoConexionOllama;
  modelosInstalados: string[];
  modeloBuscado: string;
  mensaje: string;
  accionSugerida: string;
}

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

/**
 * Genera el script ejecutable de PowerShell para instalar/configurar y arrancar Ollama
 * según las especificaciones del documento 91 §6.
 */
export function generarPowerShellInstalacionOllama(
  modeloElegido: string = "qwen3.8:27b",
  origenProduccion?: string
): string {
  const originClean = origenProduccion || (typeof window !== "undefined" ? window.location.origin : "https://khora-web.vercel.app");

  return `$ErrorActionPreference = "Stop"
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id Ollama.Ollama -e --silent --accept-package-agreements --accept-source-agreements
  } else {
    $inst = "$env:TEMP\\OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $inst
    Start-Process -FilePath $inst -ArgumentList "/SP- /VERYSILENT /SUPPRESSMSGBOXES /NORESTART" -Wait
  }
}
$deadline = (Get-Date).AddSeconds(30)
while (-not (Test-NetConnection 127.0.0.1 -Port 11434 -InformationLevel Quiet -WarningAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 1
}
[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "${originClean}", "User")
$env:OLLAMA_ORIGINS = "${originClean}"
ollama pull ${modeloElegido}`;
}

/**
 * Copia una cadena de texto al portapapeles del navegador.
 */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (err) {
    console.warn("[OllamaLocal] Error al copiar al portapapeles:", err);
  }
  return false;
}

/**
 * Diagnostica proactivamente la conexión con Ollama en http://localhost:11434 y clasifica
 * la salud de la conexión en cuatro estados distintos:
 * 1. `no_instalado`: Ollama no responde en localhost:11434.
 * 2. `sin_modelo`: Ollama está corriendo pero el modelo elegido no está descargado en `/api/tags`.
 * 3. `listo`: Ollama está corriendo y el modelo elegido está disponible.
 * 4. `error`: Ollama respondió con error HTTP u otro fallo técnico.
 */
export async function diagnosticarConexionOllama(
  modeloBuscado: string = "qwen3.8:27b",
  baseUrl: string = DEFAULT_OLLAMA_BASE_URL
): Promise<DiagnosticoOllamaResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        estado: "error",
        modelosInstalados: [],
        modeloBuscado,
        mensaje: `Ollama respondió con estatus HTTP ${res.status}.`,
        accionSugerida: "Verifique la configuración o reinicie el servicio Ollama.",
      };
    }

    const data = await res.json().catch(() => ({ models: [] }));
    const modelosInstalados: string[] = Array.isArray(data.models)
      ? data.models.map((m: any) => m.name || m.model || "")
      : [];

    const tieneModelo = modelosInstalados.some((m) =>
      m.toLowerCase().startsWith(modeloBuscado.toLowerCase())
    );

    if (tieneModelo) {
      return {
        estado: "listo",
        modelosInstalados,
        modeloBuscado,
        mensaje: `Ollama está listo y el modelo '${modeloBuscado}' está disponible.`,
        accionSugerida: "Puede enviar consultas inmediatamente.",
      };
    }

    return {
      estado: "sin_modelo",
      modelosInstalados,
      modeloBuscado,
      mensaje: `Ollama está ejecutándose, pero el modelo '${modeloBuscado}' no ha sido descargado.`,
      accionSugerida: `Copie y ejecute el comando de instalación en PowerShell para descargar '${modeloBuscado}'.`,
    };
  } catch (err: any) {
    return {
      estado: "no_instalado",
      modelosInstalados: [],
      modeloBuscado,
      mensaje: "No se pudo conectar a http://localhost:11434. Ollama no está ejecutándose o no está instalado.",
      accionSugerida: "Ejecute el comando de instalación en PowerShell para instalar/arrancar Ollama.",
    };
  }
}

/**
 * Mantiene compatibilidad con chequeo de conectividad básico.
 */
export async function verificarOllamaConectividad(
  baseUrl: string = DEFAULT_OLLAMA_BASE_URL
): Promise<{ disponible: boolean; errorMsg?: string }> {
  const diag = await diagnosticarConexionOllama("qwen3.8:27b", baseUrl);
  if (diag.estado === "listo" || diag.estado === "sin_modelo") {
    return { disponible: true };
  }
  return { disponible: false, errorMsg: diag.mensaje };
}

/**
 * Calcula el TPS real a partir de eval_count y eval_duration (en nanosegundos).
 * Fórmula: eval_count / (eval_duration / 1e9)
 */
export function calcularTpsOllama(
  evalCount?: number | null,
  evalDurationNs?: number | null
): number | null {
  if (
    typeof evalCount === "number" &&
    evalCount > 0 &&
    typeof evalDurationNs === "number" &&
    evalDurationNs > 0
  ) {
    const duracionSegundos = evalDurationNs / 1e9;
    if (duracionSegundos > 0) {
      return evalCount / duracionSegundos;
    }
  }
  return null;
}

/**
 * Inferencia directa Navegador -> http://localhost:11434/api/chat
 * Excepción arquitectónica deliberada (sin pasar por /api/chat del servidor).
 */
export async function ejecutarInferenciaOllamaLocal(
  opts: OllamaInferenceOptions
): Promise<OllamaInferenceResult> {
  const baseUrl = opts.baseUrl || DEFAULT_OLLAMA_BASE_URL;
  const t0 = performance.now();
  let firstTokenTime: number | null = null;
  let lastChunkTime: number | null = null;
  let fullContent = "";
  let evalCountFinal: number | null = null;
  let evalDurationNsFinal: number | null = null;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
      }),
      signal: opts.signal,
    });
  } catch (err: any) {
    throw new Error(
      `No se pudo conectar con Ollama en ${baseUrl}. Error de red: ${err.message || "desconocido"}. Asegúrese de que Ollama está corriendo y el origen CORS ${typeof window !== "undefined" ? window.location.origin : ""} esté permitido en OLLAMA_ORIGINS.`
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Ollama retornó HTTP ${response.status}: ${errorText || response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error("Respuesta de Ollama sin cuerpo ejecutable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let bufferAcc = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bufferAcc += decoder.decode(value, { stream: true });
    const lineas = bufferAcc.split("\n");
    bufferAcc = lineas.pop() || "";

    for (const linea of lineas) {
      const lineaLimpia = linea.trim();
      if (!lineaLimpia) continue;

      try {
        const chunkObj: OllamaStreamChunk = JSON.parse(lineaLimpia);
        const chunkText = chunkObj.message?.content || "";

        if (chunkText) {
          const now = performance.now();
          if (firstTokenTime === null) {
            firstTokenTime = now;
          }
          lastChunkTime = now;
          fullContent += chunkText;

          if (opts.onChunk) {
            opts.onChunk(chunkText, fullContent, chunkObj);
          }
        }

        if (chunkObj.done) {
          if (typeof chunkObj.eval_count === "number") {
            evalCountFinal = chunkObj.eval_count;
          }
          if (typeof chunkObj.eval_duration === "number") {
            evalDurationNsFinal = chunkObj.eval_duration;
          }
        }
      } catch (pErr) {
        console.warn("[OllamaLocal] Error al parsear NDJSON chunk:", pErr);
      }
    }
  }

  // Procesar cualquier remanente en el buffer
  if (bufferAcc.trim()) {
    try {
      const chunkObj: OllamaStreamChunk = JSON.parse(bufferAcc.trim());
      const chunkText = chunkObj.message?.content || "";
      if (chunkText) {
        fullContent += chunkText;
      }
      if (chunkObj.done) {
        if (typeof chunkObj.eval_count === "number") {
          evalCountFinal = chunkObj.eval_count;
        }
        if (typeof chunkObj.eval_duration === "number") {
          evalDurationNsFinal = chunkObj.eval_duration;
        }
      }
    } catch {}
  }

  const tf = performance.now();
  const totalDurationMs = Math.round(tf - t0);
  const ttftMsFinal = firstTokenTime
    ? Math.round(firstTokenTime - t0)
    : totalDurationMs;

  const tpsFinal = calcularTpsOllama(evalCountFinal, evalDurationNsFinal);
  const exactTokens = evalCountFinal !== null && evalDurationNsFinal !== null;

  return {
    contenido: fullContent,
    evalCount: evalCountFinal,
    evalDurationNs: evalDurationNsFinal,
    tps: tpsFinal,
    durationMs: totalDurationMs,
    ttftMs: ttftMsFinal,
    exactTokens,
    origenModel: `ollama:${opts.model}`,
  };
}
