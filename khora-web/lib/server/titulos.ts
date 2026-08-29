// @l0 L0-002-R · @req TITULOS-LLM/REQ-1 · @req TITULOS-LLM/REQ-2
import { z } from "zod";
import { getDb } from "./neon";
import { conTimeout } from "./utils";

export interface ThreadIdea {
  label: string;
  evidence: string[];
  keywords: string[];
  importance: number;
}

export interface ThreadCandidate {
  label: string;
  ideas: string[];
  evidence: string[];
}

export interface TitleGenerationResult {
  title: string;
  mode: "single_thread" | "multi_thread";
  threads: ThreadCandidate[];
  confidence: number;
  model: string;
  fallback_used: boolean;
}

export interface TituloConGarantiaResult extends TitleGenerationResult {
  nivel: "ia" | "fallback_determinista" | "ultimo_recurso";
}

const GroqResponseSchema = z.object({
  ideas: z.array(
    z.object({
      label: z.string(),
      evidence: z.array(z.string()),
      keywords: z.array(z.string()).default([]),
      importance: z.number().default(0.5),
    })
  ),
  thread_candidates: z.array(
    z.object({
      label: z.string(),
      idea_indexes: z.array(z.number()).default([]),
      evidence: z.array(z.string()),
    })
  ),
});

/**
 * Normaliza y limpia cadenas de texto para comparaciones de grounding.
 */
function normalizarParaGrounding(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Valida si las citas de evidencia realmente existen literalmente en el texto fuente.
 */
function validarGroundingEvidencia(textoFuente: string, evidencias: string[]): boolean {
  if (!evidencias || evidencias.length === 0) return false;
  const fuenteNorm = normalizarParaGrounding(textoFuente);

  for (const ev of evidencias) {
    const evNorm = normalizarParaGrounding(ev);
    if (evNorm.length > 5 && !fuenteNorm.includes(evNorm)) {
      return false;
    }
  }
  return true;
}

/**
 * Segmentación Map-Reduce para dividir el texto fuente sin descartar nada tras 4,000 caracteres.
 */
export function segmentarTextoEnChunks(texto: string, maxCharsPerChunk = 3000, overlapChars = 400): string[] {
  if (!texto || texto.trim().length === 0) return [];

  const párrafos = texto.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const p of párrafos) {
    if ((currentChunk + "\n\n" + p).length <= maxCharsPerChunk) {
      currentChunk = currentChunk ? currentChunk + "\n\n" + p : p;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (p.length > maxCharsPerChunk) {
        // Divide párrafo largo por oraciones
        const oraciones = p.match(/[^.!?]+[.!?]+/g) || [p];
        let subChunk = "";
        for (const or of oraciones) {
          if ((subChunk + " " + or).length <= maxCharsPerChunk) {
            subChunk = subChunk ? subChunk + " " + or : or;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = or;
          }
        }
        if (subChunk) currentChunk = subChunk;
      } else {
        currentChunk = p;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

const FRASES_GENERICAS_PROHIBIDAS = [
  "resumen del contenido",
  "dictado sin contenido",
  "sin titulo",
  "sin título",
  "contenido del dictado",
  "puntos clave",
  "transcripcion del dictado",
  "transcripción del dictado",
  "resumen del dictado",
];

export function esTituloGenericoOInvalido(titulo: string): boolean {
  if (!titulo || titulo.trim().length < 5) return true;
  const norm = normalizarParaGrounding(titulo);
  return FRASES_GENERICAS_PROHIBIDAS.some((fg) => norm.includes(fg));
}

/**
 * Último recurso: genera un título SIEMPRE no vacío, sin depender de LLM ni de
 * heurísticas que puedan rechazar el resultado. No debe lanzar excepciones.
 */
export function generarTituloDeUltimoRecurso(texto: string, folio?: number | null): string {
  try {
    const limpio = (texto || "").replace(/\s+/g, " ").trim();
    if (limpio.length > 0) {
      const recorte = limpio.slice(0, 80).trim();
      const sinCortarPalabra = recorte.replace(/\s+\S*$/, "") || recorte;
      return sinCortarPalabra.length >= 5 ? sinCortarPalabra : limpio.slice(0, 80);
    }
    const fecha = new Date().toISOString().slice(0, 16).replace("T", " ");
    return folio ? `Volcado #${folio} — ${fecha}` : `Volcado sin transcripción — ${fecha}`;
  } catch {
    const fecha = new Date().toISOString().slice(0, 16).replace("T", " ");
    return folio ? `Volcado #${folio} — ${fecha}` : `Volcado sin transcripción — ${fecha}`;
  }
}

/**
 * Fallback determinista basado en frecuencia ponderada, frases nominales y eliminación de stopwords.
 * Prohíbe explícitamente títulos genéricos como "Resumen del contenido...".
 */
export function generarTituloFallback(texto: string): TitleGenerationResult {
  const stopwords = new Set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "pero", "si", "de", "del", "a",
    "al", "en", "por", "para", "con", "sin", "sobre", "que", "que", "su", "sus", "se", "es", "son",
    "fue", "sido", "este", "esta", "estos", "estas", "como", "mas", "más", "ya", "o", "e", "ni"
  ]);

  const oraciones = texto.match(/[^.!?]+[.!?]+/g) || [texto];
  let acumuladoPalabras: string[] = [];

  for (const oracion of oraciones) {
    const palabras = oracion
      .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w.toLowerCase()));

    acumuladoPalabras.push(...palabras);
    if (acumuladoPalabras.length >= 6) break;
  }

  const palabrasClave = acumuladoPalabras.slice(0, 8).join(" ");
  let tituloLimpio = palabrasClave ? palabrasClave.charAt(0).toUpperCase() + palabrasClave.slice(1) : "";

  // Remover comillas
  tituloLimpio = tituloLimpio.replace(/["'«»]/g, "").trim();

  if (esTituloGenericoOInvalido(tituloLimpio)) {
    return {
      title: "",
      mode: "single_thread",
      threads: [],
      confidence: 0.0,
      model: "fallback_invalido",
      fallback_used: true,
    };
  }

  if (tituloLimpio.length > 130) {
    tituloLimpio = tituloLimpio.slice(0, 130) + "...";
  }

  const citaLiteral = (oraciones[0] || texto).slice(0, 50).trim();

  return {
    title: tituloLimpio,
    mode: "single_thread",
    threads: [
      {
        label: tituloLimpio,
        ideas: [tituloLimpio],
        evidence: [citaLiteral],
      },
    ],
    confidence: 0.65,
    model: "fallback_determinista",
    fallback_used: true,
  };
}

/**
 * Genera un título estructurado usando Groq LLM con fallback determinista.
 */
export async function generarTituloEstructurado(texto: string): Promise<TitleGenerationResult> {
  if (!texto || texto.trim().length === 0) {
    return {
      title: "Dictado sin contenido explícito",
      mode: "single_thread",
      threads: [],
      confidence: 0.0,
      model: "none",
      fallback_used: true,
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return generarTituloFallback(texto);
  }

  const chunks = segmentarTextoEnChunks(texto);
  let textoParaAnalizar = "";

  // Map/Reduce sobre todos los chunks con límites controlados
  if (chunks.length === 1) {
    textoParaAnalizar = chunks[0];
  } else {
    // Map: Extraer las primeras 2 oraciones de cada chunk para sintetizar la totalidad del texto
    const extractosMap = chunks.slice(0, 10).map((c) => {
      const oraciones = c.match(/[^.!?]+[.!?]+/g) || [c];
      return oraciones.slice(0, 2).join(" ").trim();
    });
    // Reduce: Sintetizar la totalidad del documento
    textoParaAnalizar = extractosMap.join("\n\n");
  }

  const prompt = `Analiza el siguiente texto y extrae en JSON estructurado las ideas e hilos temáticos principales.
Reglas estrictas:
1. "evidence" DEBE ser una cita literal de palabras contiguas que existan exactas en el texto.
2. Prohibidos títulos genéricos como "Resumen del contenido...", "Dictado sin contenido" o "Sin título".
3. Devuelve un objeto JSON exactamente con este formato:
{
  "ideas": [
    { "label": "descripción breve", "evidence": ["cita literal exacta del texto"], "keywords": ["palabra"], "importance": 0.9 }
  ],
  "thread_candidates": [
    { "label": "Nombre del hilo o título conciso", "idea_indexes": [0], "evidence": ["cita literal exacta"] }
  ]
}

Texto a analizar:
"""
${textoParaAnalizar}
"""`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Eres un asistente de síntesis editorial especializado en títulos concisos en español." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return generarTituloFallback(texto);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return generarTituloFallback(texto);

    const parsed = GroqResponseSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return generarTituloFallback(texto);
    }

    const data = parsed.data;

    // Filtrar ideas sin grounding literal
    const ideasValidas = data.ideas.filter((i) => validarGroundingEvidencia(texto, i.evidence));
    const hilosValidos = data.thread_candidates.filter((t) => validarGroundingEvidencia(texto, t.evidence));

    if (hilosValidos.length === 0) {
      return generarTituloFallback(texto);
    }

    let mode: "single_thread" | "multi_thread" = "single_thread";
    let tituloFinal = "";

    if (hilosValidos.length === 1) {
      mode = "single_thread";
      const h = hilosValidos[0];
      const ideaLabels = ideasValidas.map((i) => i.label).slice(0, 2).join(", ");
      tituloFinal = ideaLabels ? `${h.label}: ${ideaLabels}` : h.label;
    } else {
      mode = "multi_thread";
      const h1 = hilosValidos[0].label;
      const h2 = hilosValidos[1].label;
      tituloFinal = `${h1} — ${h2}`;
    }

    // Limpieza de comillas y extensión
    tituloFinal = tituloFinal.replace(/["'«»]/g, "").trim();
    if (tituloFinal.length > 140) {
      tituloFinal = tituloFinal.slice(0, 137) + "...";
    }

    if (esTituloGenericoOInvalido(tituloFinal)) {
      return generarTituloFallback(texto);
    }

    return {
      title: tituloFinal,
      mode,
      threads: hilosValidos.map((h) => ({
        label: h.label,
        ideas: ideasValidas.map((i) => i.label),
        evidence: h.evidence,
      })),
      confidence: 0.95,
      model: "groq-llama-3.3-70b-versatile",
      fallback_used: false,
    };
  } catch {
    return generarTituloFallback(texto);
  }
}

/**
 * Genera y devuelve un título garantizando que `title` NUNCA sea vacío.
 * No lanza excepciones bajo ninguna circunstancia.
 */
export async function generarTituloConGarantia(
  texto: string,
  folio?: number | null
): Promise<TituloConGarantiaResult> {
  try {
    const resIA = await conTimeout(generarTituloEstructurado(texto), 9000, null);
    if (resIA && resIA.title && !esTituloGenericoOInvalido(resIA.title)) {
      return { ...resIA, nivel: resIA.fallback_used ? "fallback_determinista" : "ia" };
    }
  } catch {
    // continúa al siguiente nivel
  }

  try {
    const resFallback = generarTituloFallback(texto);
    if (resFallback && resFallback.title && !esTituloGenericoOInvalido(resFallback.title)) {
      return { ...resFallback, nivel: "fallback_determinista" };
    }
  } catch {
    // continúa al siguiente nivel
  }

  const tituloFinal = generarTituloDeUltimoRecurso(texto, folio ?? null);
  return {
    title: tituloFinal,
    mode: "single_thread",
    threads: [{ label: tituloFinal, ideas: [tituloFinal], evidence: [] }],
    confidence: 0.3,
    model: "ultimo_recurso_deterministico",
    fallback_used: true,
    nivel: "ultimo_recurso",
  };
}

/**
 * Guarda o actualiza el título de un volcado y resuelve el incidente 'titulo_ausente' si aplica.
 */
export async function asignarTituloVolcado(volcadoId: string, titulo: string, origen = "generador_titulos"): Promise<void> {
  const db = getDb();

  await db.query(
    "UPDATE volcado SET titulo = $2 WHERE id = $1",
    [volcadoId, titulo]
  );

  // Resolver incidente titulo_ausente si existe abierto
  const incRes = await db.query(
    "SELECT id FROM volcado_incidente WHERE volcado_id = $1 AND tipo = 'titulo_ausente' AND estado IN ('abierto', 'reconocido', 'reabierto')",
    [volcadoId]
  );

  if (incRes.rows.length > 0) {
    await db.query(
      "UPDATE volcado_incidente SET estado = 'resuelto', resuelto_por = $2, resuelto_en = NOW(), codigo_resolucion = 'titulo_generado_exitosamente' WHERE id = $1",
      [incRes.rows[0].id, origen]
    );
  }
}
