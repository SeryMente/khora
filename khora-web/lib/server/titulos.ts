// @l0 L0-002-R · @req TITULOS-LLM/REQ-1 · @req TITULOS-LLM/REQ-2
import { z } from "zod";
import { getDb } from "./neon";
import { conTimeout } from "./utils";

export interface EvidenceWithOffset {
  text: string;
  start: number | null;
  end: number | null;
}

export interface IdeaItem {
  label: string;
  evidence: EvidenceWithOffset[];
  keywords: string[];
  importance: number;
}

export interface ThreadCandidate {
  label: string;
  ideas: string[];
  evidence: EvidenceWithOffset[];
}

export interface TitleGenerationResult {
  title: string;
  mode: "single_thread" | "multi_thread";
  ideas: IdeaItem[];
  threads: ThreadCandidate[];
  evidence: EvidenceWithOffset[];
  coverage_score: number;
  specificity_score: number;
  confidence: number;
  model: string;
  prompt_version: string;
  fallback_used: boolean;
}

export interface TituloConGarantiaResult extends TitleGenerationResult {
  nivel: "ia" | "fallback_determinista" | "ultimo_recurso";
}

const GroqResponseSchema = z.object({
  title: z.string().default(""),
  mode: z.enum(["single_thread", "multi_thread"]).default("single_thread"),
  ideas: z
    .array(
      z.object({
        label: z.string(),
        evidence: z.array(z.string()).default([]),
        keywords: z.array(z.string()).default([]),
        importance: z.number().default(0.5),
      })
    )
    .default([]),
  thread_candidates: z
    .array(
      z.object({
        label: z.string(),
        idea_indexes: z.array(z.number()).default([]),
        evidence: z.array(z.string()).default([]),
      })
    )
    .default([]),
  coverage_score: z.number().optional().default(0.9),
  specificity_score: z.number().optional().default(0.85),
  confidence: z.number().optional().default(0.9),
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
 * Busca los offsets exactos (start, end) de una cita literal dentro del texto fuente.
 * Si no existe exactamente, asigna null a los offsets sin inventarlos.
 */
export function buscarOffsetLiteral(textoFuente: string, cita: string): EvidenceWithOffset {
  if (!cita || cita.trim().length === 0 || !textoFuente) {
    return { text: cita || "", start: null, end: null };
  }

  const posExacta = textoFuente.indexOf(cita);
  if (posExacta !== -1) {
    return { text: cita, start: posExacta, end: posExacta + cita.length };
  }

  const citaTrim = cita.trim();
  const posTrim = textoFuente.indexOf(citaTrim);
  if (posTrim !== -1) {
    return { text: citaTrim, start: posTrim, end: posTrim + citaTrim.length };
  }

  // Búsqueda insensible a mayúsculas como fallback de offsets
  const fuenteLower = textoFuente.toLowerCase();
  const citaLower = citaTrim.toLowerCase();
  const posLower = fuenteLower.indexOf(citaLower);
  if (posLower !== -1) {
    const textoExtraido = textoFuente.slice(posLower, posLower + citaTrim.length);
    return { text: textoExtraido, start: posLower, end: posLower + citaTrim.length };
  }

  return { text: cita, start: null, end: null };
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
 * Segmentación Map-Reduce para dividir el texto fuente.
 * Implementa solapamiento real (overlapChars) entre chunks para no perder contexto en fronteras.
 */
export function segmentarTextoEnChunks(texto: string, maxCharsPerChunk = 3000, overlapChars = 400): string[] {
  if (!texto || texto.trim().length === 0) return [];

  const str = texto.trim();
  if (str.length <= maxCharsPerChunk) return [str];

  const chunks: string[] = [];
  let startIdx = 0;

  while (startIdx < str.length) {
    let endIdx = startIdx + maxCharsPerChunk;
    if (endIdx >= str.length) {
      const lastChunk = str.slice(startIdx).trim();
      if (lastChunk) chunks.push(lastChunk);
      break;
    }

    // Buscar límite natural de párrafo, oración o palabra
    let cutIdx = str.lastIndexOf("\n\n", endIdx);
    if (cutIdx <= startIdx) cutIdx = str.lastIndexOf("\n", endIdx);
    if (cutIdx <= startIdx) cutIdx = str.lastIndexOf(". ", endIdx);
    if (cutIdx <= startIdx) cutIdx = str.lastIndexOf(" ", endIdx);
    if (cutIdx <= startIdx) cutIdx = endIdx;

    const chunk = str.slice(startIdx, cutIdx + 1).trim();
    if (chunk) chunks.push(chunk);

    // Calcular el siguiente índice de inicio con solapamiento real
    const nextStart = Math.max(startIdx + 1, cutIdx + 1 - overlapChars);
    if (nextStart < str.length) {
      // Ajustar inicio a espacio para no cortar palabra en el solapamiento
      const cleanNext = str.indexOf(" ", nextStart);
      if (cleanNext !== -1 && cleanNext < cutIdx) {
        startIdx = cleanNext + 1;
      } else {
        startIdx = nextStart;
      }
    } else {
      break;
    }
  }

  return chunks;
}

const FRASES_GENERICAS_PROHIBIDAS = [
  "reflexiones sobre",
  "notas de",
  "resumen del contenido",
  "dictado sin contenido",
  "sin titulo",
  "sin título",
  "contenido del dictado",
  "puntos clave",
  "transcripcion del dictado",
  "transcripción del dictado",
  "resumen del dictado",
  "lista de palabras",
  "resumen general",
];

export function esTituloGenericoOInvalido(titulo: string): boolean {
  if (!titulo || titulo.trim().length < 5) return true;
  const norm = normalizarParaGrounding(titulo);
  if (FRASES_GENERICAS_PROHIBIDAS.some((fg) => norm.includes(fg))) return true;
  if (/^resumen\b/i.test(titulo.trim())) return true;
  return false;
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
 * Fallback determinista basado en análisis del texto COMPLETO por frecuencia de frases,
 * peso posicional distribuido (inicio, medio, final) y stopwords.
 * Prohíbe explícitamente títulos genéricos y sigue la forma del patrón objetivo.
 */
export function generarTituloFallback(texto: string): TitleGenerationResult {
  const stopwords = new Set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "pero", "si", "de", "del", "a",
    "al", "en", "por", "para", "con", "sin", "sobre", "que", "que", "su", "sus", "se", "es", "son",
    "fue", "sido", "este", "esta", "estos", "estas", "como", "mas", "más", "ya", "e", "ni", "nos",
    "les", "ante", "bajo", "cabe", "desde", "hacia", "hasta", "para", "segun", "según", "so", "tras"
  ]);

  const limpio = (texto || "").trim();
  if (!limpio) {
    return {
      title: "",
      mode: "single_thread",
      ideas: [],
      threads: [],
      evidence: [],
      coverage_score: 0.0,
      specificity_score: 0.0,
      confidence: 0.0,
      model: "fallback_invalido",
      prompt_version: "tit-1a-v1",
      fallback_used: true,
    };
  }

  // Segmentar oraciones de todo el documento
  const oracionesRaw = limpio.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const oraciones = oracionesRaw.length > 0 ? oracionesRaw : [limpio];

  // Identificar oraciones clave por regiones distribuidas (Inicio, Medio, Final)
  const n = oraciones.length;
  const regionInicio = oraciones.slice(0, Math.max(1, Math.floor(n * 0.35)));
  const regionMedio = oraciones.slice(Math.floor(n * 0.35), Math.floor(n * 0.70));
  const regionFinal = oraciones.slice(Math.floor(n * 0.70));

  // Ponderar palabras y frases por frecuencia y presencia regional
  const freqMap = new Map<string, { count: number; regions: Set<string>; sampleSentence: string }>();

  const procesarOracion = (oracion: string, regionName: string) => {
    const palabras = oracion
      .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w.toLowerCase()));

    for (let i = 0; i < palabras.length; i++) {
      const p = palabras[i];
      const pNorm = p.toLowerCase();
      if (!freqMap.has(pNorm)) {
        freqMap.set(pNorm, { count: 0, regions: new Set(), sampleSentence: oracion });
      }
      const entry = freqMap.get(pNorm)!;
      entry.count += 1;
      entry.regions.add(regionName);

      // Extraer bigramas (frases de 2 palabras)
      if (i < palabras.length - 1) {
        const p2 = palabras[i + 1];
        const bigrama = `${pNorm} ${p2.toLowerCase()}`;
        if (!freqMap.has(bigrama)) {
          freqMap.set(bigrama, { count: 0, regions: new Set(), sampleSentence: oracion });
        }
        const bEntry = freqMap.get(bigrama)!;
        bEntry.count += 1.5; // mayor peso a bigramas
        bEntry.regions.add(regionName);
      }
    }
  };

  regionInicio.forEach((o) => procesarOracion(o, "inicio"));
  regionMedio.forEach((o) => procesarOracion(o, "medio"));
  regionFinal.forEach((o) => procesarOracion(o, "final"));

  // Buscar oraciones con indicadores de afirmación/decisión/conclusión
  const indicadoresClave = /(?:se acordó|se decidió|conclusión|se determinó|se aprobó|propuesta|en resumen|resultado|objetivo|confirmó|migrar|resolver|implementar|decisión|finalmente)/i;

  let oracionCentral = "";
  let evidenciaCentral = "";

  // 1. Preferir oraciones con palabras indicadoras en la región final o inicio
  const oracionIndicador = [...regionFinal, ...regionInicio, ...regionMedio].find((o) => indicadoresClave.test(o));
  if (oracionIndicador) {
    oracionCentral = oracionIndicador.trim();
    evidenciaCentral = oracionCentral;
  } else {
    // 2. Si no hay indicador explícito, tomar la primera oración sustancial de la región final si es relevante o del inicio
    oracionCentral = (regionFinal[regionFinal.length - 1] || regionInicio[0] || limpio).trim();
    evidenciaCentral = oracionCentral;
  }

  // Extraer las mejores líneas ideacionales (frases o palabras clave con alta frecuencia y cobertura)
  const candidatosOrdenados = Array.from(freqMap.entries())
    .map(([term, data]) => ({
      term,
      score: data.count * data.regions.size * (term.includes(" ") ? 1.8 : 1.0),
      regionsCount: data.regions.size,
      sampleSentence: data.sampleSentence,
    }))
    .sort((a, b) => b.score - a.score);

  // Seleccionar tema central y líneas A, B, C
  const lineasSeleccionadas: string[] = [];
  const evidenciasSeleccionadas: string[] = [evidenciaCentral];

  for (const cand of candidatosOrdenados) {
    if (lineasSeleccionadas.length >= 3) break;
    // Capitalizar adecuadamente
    const terminoFormateado = cand.term
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    if (!lineasSeleccionadas.some((l) => l.toLowerCase().includes(cand.term.toLowerCase()))) {
      lineasSeleccionadas.push(terminoFormateado);
      if (cand.sampleSentence && !evidenciasSeleccionadas.includes(cand.sampleSentence)) {
        evidenciasSeleccionadas.push(cand.sampleSentence);
      }
    }
  }

  // Sintetizar el tema central a partir de la oración central
  let temaCentralLimpio = oracionCentral
    .replace(/^[\s\d.\-–—:=]+/, "")
    .replace(/["'«»]/g, "")
    .trim();

  if (temaCentralLimpio.length > 80) {
    const recorte = temaCentralLimpio.slice(0, 80);
    temaCentralLimpio = recorte.replace(/\s+\S*$/, "") || recorte;
  }

  // Formar el título en el patrón objetivo: "Tema central y afirmación/propósito — líneas A, B y C"
  let lineasTexto = "";
  if (lineasSeleccionadas.length === 1) {
    lineasTexto = lineasSeleccionadas[0];
  } else if (lineasSeleccionadas.length === 2) {
    lineasTexto = `${lineasSeleccionadas[0]} y ${lineasSeleccionadas[1]}`;
  } else if (lineasSeleccionadas.length >= 3) {
    lineasTexto = `${lineasSeleccionadas[0]}, ${lineasSeleccionadas[1]} y ${lineasSeleccionadas[2]}`;
  }

  let tituloFinal = lineasTexto ? `${temaCentralLimpio} — ${lineasTexto}` : temaCentralLimpio;

  // Limpieza de comillas y ajuste estricto de longitud
  tituloFinal = tituloFinal.replace(/["'«»]/g, "").trim();

  if (esTituloGenericoOInvalido(tituloFinal)) {
    // Si aún resulta genérico, reintentar con las oraciones directas sin etiquetas genéricas
    const directa = (oraciones[0] || limpio).slice(0, 100).replace(/["'«»]/g, "").trim();
    tituloFinal = directa.charAt(0).toUpperCase() + directa.slice(1);
  }

  if (tituloFinal.length > 220) {
    tituloFinal = tituloFinal.slice(0, 217) + "...";
  }

  // Construir evidencias con offsets reales
  const evidenciasOffsets: EvidenceWithOffset[] = evidenciasSeleccionadas.map((ev) =>
    buscarOffsetLiteral(texto, ev)
  );

  const ideas: IdeaItem[] = lineasSeleccionadas.map((l) => ({
    label: l,
    evidence: evidenciasOffsets,
    keywords: l.toLowerCase().split(" "),
    importance: 0.8,
  }));

  const threads: ThreadCandidate[] = [
    {
      label: temaCentralLimpio,
      ideas: lineasSeleccionadas,
      evidence: evidenciasOffsets,
    },
  ];

  // Cobertura calculada según el número de regiones representadas
  const coverageScore = Math.min(1.0, Number((evidenciasOffsets.length / Math.max(1, oraciones.length)).toFixed(2)) + 0.5);

  return {
    title: tituloFinal,
    mode: lineasSeleccionadas.length > 1 ? "multi_thread" : "single_thread",
    ideas,
    threads,
    evidence: evidenciasOffsets,
    coverage_score: coverageScore,
    specificity_score: 0.8,
    confidence: 0.7,
    model: "fallback_determinista",
    prompt_version: "tit-1a-v1",
    fallback_used: true,
  };
}

/**
 * Genera un título estructurado usando Map-Reduce con Groq LLM o fallback determinista.
 */
export async function generarTituloEstructurado(texto: string): Promise<TitleGenerationResult> {
  if (!texto || texto.trim().length === 0) {
    return {
      title: "Dictado sin contenido explícito",
      mode: "single_thread",
      ideas: [],
      threads: [],
      evidence: [],
      coverage_score: 0.0,
      specificity_score: 0.0,
      confidence: 0.0,
      model: "none",
      prompt_version: "tit-1a-v1",
      fallback_used: true,
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return generarTituloFallback(texto);
  }

  const chunks = segmentarTextoEnChunks(texto, 3000, 400);

  // Map-Reduce sobre TODOS los chunks del documento sin truncar
  const bloquesChunks = chunks.map((c, idx) => `[CHUNK ${idx + 1}/${chunks.length}]\n${c}`).join("\n\n");

  const prompt = `Analiza el texto completo dividido en chunks y genera un título altamente descriptivo, anclado y estructurado.

REGLAS OBLIGATORIAS DE SÍNTESIS:
1. Examina TODOS los chunks desde el primero hasta el último (1 a ${chunks.length}). La idea central o la decisión final puede estar ubicada al FINAL del texto.
2. Identifica el Tema Central y Afirmación/Propósito principal, junto con hasta 3 líneas ideacionales.
3. Formato del título: "Tema central y afirmación/propósito — líneas A, B y C"
   - Longitud objetivo: 90 a 180 caracteres (máximo 220 caracteres si es multihilo).
   - PRESERVACIÓN DE NOMBRES PROPIOS: Conserva nombres de personas, productos, tecnologías y lugares (ej. Dąbrowski, Groq, PostgreSQL, Juan Pérez).
   - PROHIBIDO: Usar frases genéricas como "Reflexiones sobre", "Notas de", "Resumen", "Dictado sin contenido", listas de palabras sueltas o comillas.
4. EVIDENCIA Y GROUNDING:
   - "evidence": DEBE ser una lista de citas literales contiguas exactas que existan en el texto fuente. No inventes ni alteres ni una palabra.

Devuelve un objeto JSON exactamente con esta estructura:
{
  "title": "Tema central y afirmación/propósito — líneas A, B y C",
  "mode": "single_thread" o "multi_thread",
  "ideas": [
    { "label": "descripción de la idea", "evidence": ["cita literal exacta del texto"], "keywords": ["palabra"], "importance": 0.9 }
  ],
  "thread_candidates": [
    { "label": "Nombre de la línea o hilo", "idea_indexes": [0], "evidence": ["cita literal exacta del texto"] }
  ],
  "coverage_score": 0.95,
  "specificity_score": 0.90,
  "confidence": 0.95
}

Texto completo a analizar:
"""
${bloquesChunks}
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
          { role: "system", content: "Eres un asistente de síntesis editorial especializado en títulos descriptivos anclados en español." },
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

    // Validar grounding literal de evidencias
    const todasLasCitas: string[] = [];
    data.ideas.forEach((i) => todasLasCitas.push(...i.evidence));
    data.thread_candidates.forEach((t) => todasLasCitas.push(...t.evidence));

    const tieneEvidenciaValida = validarGroundingEvidencia(texto, todasLasCitas);
    if (!tieneEvidenciaValida && todasLasCitas.length > 0) {
      // Fallback si detecta alucinación de citas
      return generarTituloFallback(texto);
    }

    let tituloFinal = data.title.replace(/["'«»]/g, "").trim();

    if (esTituloGenericoOInvalido(tituloFinal)) {
      return generarTituloFallback(texto);
    }

    if (tituloFinal.length > 220) {
      tituloFinal = tituloFinal.slice(0, 217) + "...";
    }

    // Convertir evidencias a objetos EvidenceWithOffset
    const ideasProcesadas: IdeaItem[] = data.ideas.map((i) => ({
      label: i.label,
      evidence: i.evidence.map((ev) => buscarOffsetLiteral(texto, ev)),
      keywords: i.keywords,
      importance: i.importance,
    }));

    const threadsProcesados: ThreadCandidate[] = data.thread_candidates.map((t) => ({
      label: t.label,
      ideas: iLabels(data.ideas, t.idea_indexes),
      evidence: t.evidence.map((ev) => buscarOffsetLiteral(texto, ev)),
    }));

    const rootEvidence: EvidenceWithOffset[] = [];
    ideasProcesadas.forEach((i) => rootEvidence.push(...i.evidence));
    threadsProcesados.forEach((t) => rootEvidence.push(...t.evidence));

    return {
      title: tituloFinal,
      mode: data.mode,
      ideas: ideasProcesadas,
      threads: threadsProcesados,
      evidence: rootEvidence,
      coverage_score: data.coverage_score,
      specificity_score: data.specificity_score,
      confidence: data.confidence,
      model: "groq-llama-3.3-70b-versatile",
      prompt_version: "tit-1a-v1",
      fallback_used: false,
    };
  } catch {
    return generarTituloFallback(texto);
  }
}

function iLabels(ideas: { label: string }[], indexes: number[]): string[] {
  if (!indexes || indexes.length === 0) return ideas.map((i) => i.label);
  return indexes.map((idx) => ideas[idx]?.label).filter(Boolean);
}

/**
 * Genera y devuelve un título garantizando que `title` NUNCA sea vacío.
 * No lanza excepciones bajo ninguna circunstancia.
 */
export async function generarTituloConGarantia(
  texto: string,
  folio?: number | null
): Promise<TituloConGarantiaResult> {
  if (!texto || texto.trim().length === 0) {
    const titleUltimo = generarTituloDeUltimoRecurso("", folio);
    const ev = buscarOffsetLiteral("", titleUltimo);
    return {
      title: titleUltimo,
      mode: "single_thread",
      ideas: [],
      threads: [{ label: titleUltimo, ideas: [titleUltimo], evidence: [ev] }],
      evidence: [ev],
      coverage_score: 0.0,
      specificity_score: 0.0,
      confidence: 0.1,
      model: "ultimo_recurso_deterministico",
      prompt_version: "tit-1a-v1",
      fallback_used: true,
      nivel: "ultimo_recurso",
    };
  }

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
  const ev = buscarOffsetLiteral(texto, tituloFinal);
  return {
    title: tituloFinal,
    mode: "single_thread",
    ideas: [{ label: tituloFinal, evidence: [ev], keywords: [], importance: 0.5 }],
    threads: [{ label: tituloFinal, ideas: [tituloFinal], evidence: [ev] }],
    evidence: [ev],
    coverage_score: 0.1,
    specificity_score: 0.1,
    confidence: 0.3,
    model: "ultimo_recurso_deterministico",
    prompt_version: "tit-1a-v1",
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
