// @l0 L0-002-R · @req FIX-DICTADO/D3-D4
import { logTelemetryEvent } from "../telemetry";

export type MotivoLimiteParrafo =
  | "cierre_linguistico"
  | "cambio_discursivo"
  | "longitud_segura"
  | "finalizacion_dictado"
  | "recuperacion_error"
  | "decision_manual";

export type Fragmento = {
  id?: string;
  texto: string;
  pausaMsAntes: number;
  start_ms?: number;
  end_ms?: number;
  estabilizado?: boolean;
  motivoLimite?: MotivoLimiteParrafo;
};

export interface OpcionesEnsamblar {
  umbralMs?: number;
  maxPalabrasObjetivo?: number;
  maxPalabrasTecho?: number;
  sessionId?: string;
  emitirTelemetria?: boolean;
}

export interface ResultadoEnsamblado {
  texto: string;
  parrafos: string[];
  motivosLimites: { indiceParrafo: number; motivo: MotivoLimiteParrafo }[];
}

// Conectores subordinantes / de continuidad que indican pausa de respiración o encadenamiento dentro de la misma idea
const RE_CONTINUACION_INICIO = /^(porque|pero|y|o|que|sino|aunque|para|donde|como|si|cuando|pues|mientras|corrijo|más bien|mejor dicho|o sea)\b/i;

// Conectores adversativos / de enlace intra-párrafo que enlazan oraciones dentro del mismo párrafo
const RE_ENLACE_INTRAPARRAFO = /^(sin embargo|por lo tanto|no obstante|entonces|por consiguiente|en consecuencia|de hecho|además|así que)\b/i;

// Expresiones de autocorrección y reinicio que deben conservarse dentro del mismo bloque
const RE_AUTOCORRECCION = /^(corrijo|más bien|mejor dicho|o sea)\b/i;

// Palabras o preposiciones con las que no puede cerrar un párrafo de forma natural
const RE_INCOMPLETO_FINAL = /(?:^|\s)(?:de|del|la|el|los|las|un|una|unos|unas|con|sin|en|por|para|que|porque|pero|y|o|ni|como|si|cuando|donde|a|al|hacia|hasta|sobre|tras|entre|durante|mediante)$/i;

// Conectores de transición o cambio discursivo fuerte (solo separan con evidencia explícita de cambio de tema)
const RE_CAMBIO_DISCURSIVO = /^(por otro lado|cambiando de tema|en otro orden de ideas|por otra parte|en cuanto a)\b/i;

function contarPalabras(texto: string): number {
  const matches = texto.match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.length : 0;
}

/**
 * Evalúa si un fragmento consecutivo debe iniciar un nuevo párrafo.
 *
 * Jerarquía de decisión multiseñal (Regla Invariante Fase 2):
 * 1. Cierre lingüístico y sintáctico verificable (. ? ! …)
 * 2. Continuidad o cambio discursivo (conectores, marcadores discursivos)
 * 3. Relación con la unidad previa
 * 4. Puntuación y estructura sintáctica
 * 5. Salvaguarda de longitud (~180-240 palabras)
 * 6. Silencio únicamente como señal auxiliar (NUNCA es condición suficiente por sí solo)
 */
function evaluarLimiteParrafo(
  textoPrevio: string,
  textoNuevo: string,
  pausaMs: number,
  opciones?: OpcionesEnsamblar
): { esNuevo: boolean; motivo?: MotivoLimiteParrafo } {
  const prevTrim = textoPrevio.trim();
  const nuevoTrim = textoNuevo.trim();

  if (!prevTrim || !nuevoTrim) return { esNuevo: false };

  const maxObjetivo = opciones?.maxPalabrasObjetivo ?? 180;
  const maxTecho = opciones?.maxPalabrasTecho ?? 240;
  const palabrasAcumuladas = contarPalabras(prevTrim);

  const tienePuntuacionTerminal = /[.?!…]$/.test(prevTrim);
  const esComaOIncompleto = /[,;:]$/.test(prevTrim) || RE_INCOMPLETO_FINAL.test(prevTrim);
  const empiezaConContinuacion = RE_CONTINUACION_INICIO.test(nuevoTrim);
  const empiezaConEnlaceIntra = RE_ENLACE_INTRAPARRAFO.test(nuevoTrim);
  const esAutocorreccion = RE_AUTOCORRECCION.test(nuevoTrim);
  const esCambioDiscursivo = RE_CAMBIO_DISCURSIVO.test(nuevoTrim);

  // 1. INVARIANTE DURA: Las autocorrecciones ("Corrijo", "más bien", "mejor dicho", "o sea")
  // pertenecen a la misma unidad discursiva y jamás abren un párrafo por sí solas.
  if (esAutocorreccion) {
    return { esNuevo: false };
  }

  // 2. INVARIANTE DURA: Salvaguarda de longitud
  // Si las palabras acumuladas superan el objetivo (~180) o el techo (~240), se aplica un límite de longitud segura.
  if (palabrasAcumuladas >= maxObjetivo) {
    if (tienePuntuacionTerminal || /[.,;:!?]$/.test(prevTrim) || palabrasAcumuladas >= maxTecho) {
      return { esNuevo: true, motivo: "longitud_segura" };
    }
  }

  // 3. INVARIANTE DURA: Si la frase previa está sintácticamente incompleta o el nuevo texto
  // es una continuación/enlace directo ("porque", "pero", "sin embargo", "por lo tanto", "y", "para", etc.),
  // NO se crea un nuevo párrafo, manteniéndolo en la misma unidad discursiva.
  if ((esComaOIncompleto || empiezaConContinuacion || empiezaConEnlaceIntra) && (!tienePuntuacionTerminal || empiezaConEnlaceIntra)) {
    return { esNuevo: false };
  }

  // 4. Cambio discursivo explícito ("por otro lado", "cambiando de tema")
  if (esCambioDiscursivo && tienePuntuacionTerminal) {
    return { esNuevo: true, motivo: "cambio_discursivo" };
  }

  // 5. Cierre lingüístico / sintáctico: Si la oración anterior cerró con punto o signo terminal
  // y la siguiente oración es una unidad independiente que abre una nueva idea:
  if (tienePuntuacionTerminal) {
    // Si inicia con conector de enlace intra-párrafo ("sin embargo", "por lo tanto"), permanece en el mismo párrafo
    if (empiezaConEnlaceIntra) {
      return { esNuevo: false };
    }

    // Si es un cambio discursivo o unidad independiente
    if (esCambioDiscursivo) {
      return { esNuevo: true, motivo: "cambio_discursivo" };
    }

    // Si hay una pausa significativa o es una oración independiente
    if (pausaMs >= 1000 || !empiezaConContinuacion) {
      return { esNuevo: true, motivo: "cierre_linguistico" };
    }
  }

  // El silencio solo es una evidencia auxiliar secundaria cuando YA existe evidencia de cierre lingüístico previa.
  // El silencio aislado NUNCA produce un nuevo párrafo.
  return { esNuevo: false };
}

/**
 * Une fragmentos de transcripción en párrafos estructurados por unidades discursivas y sintácticas.
 * Cumple el estándar Clean Verbatim Semántico de Khora.
 */
export function ensamblarParrafos(
  fragmentos: Fragmento[],
  opciones?: OpcionesEnsamblar
): string {
  return ensamblarParrafosEstructurado(fragmentos, opciones).texto;
}

/**
 * Versión estructurada del ensamblador que devuelve el texto, el desglose de párrafos y los motivos de cada límite.
 */
export function ensamblarParrafosEstructurado(
  fragmentos: Fragmento[],
  opciones?: OpcionesEnsamblar
): ResultadoEnsamblado {
  if (!fragmentos || fragmentos.length === 0) {
    return { texto: "", parrafos: [], motivosLimites: [] };
  }

  const parrafos: string[][] = [];
  const motivosLimites: { indiceParrafo: number; motivo: MotivoLimiteParrafo }[] = [];
  let parrafoActual: string[] = [];

  for (let i = 0; i < fragmentos.length; i++) {
    const frag = fragmentos[i];
    if (i === 0) {
      parrafoActual = [frag.texto];
      continue;
    }

    const textoPrevio = parrafoActual.join(" ");
    const evaluacion = evaluarLimiteParrafo(textoPrevio, frag.texto, frag.pausaMsAntes, opciones);

    if (evaluacion.esNuevo) {
      if (parrafoActual.length > 0) {
        parrafos.push(parrafoActual);
        motivosLimites.push({
          indiceParrafo: parrafos.length - 1,
          motivo: evaluacion.motivo ?? "cierre_linguistico",
        });
      }
      parrafoActual = [frag.texto];
    } else {
      parrafoActual.push(frag.texto);
    }
  }

  if (parrafoActual.length > 0) {
    parrafos.push(parrafoActual);
  }

  const parrafosFormateados = parrafos.map((p) => {
    let text = p.join(" ");

    // Normalizar espacios dobles o múltiples
    text = text.replace(/\s+/g, " ");

    // Normalizar espacio antes de signo de puntuación: , . : ; ? !
    text = text.replace(/\s+([.,;:?!])/g, "$1");

    // Limpiar espacios iniciales y finales
    text = text.trim();

    // Capitalizar inicio de oraciones dentro del párrafo (después de . ? !)
    text = text.replace(/(^|[.?!]\s+)(\p{L})/gu, (match, prefix, char) => prefix + char.toUpperCase());

    return text;
  });

  const textoFinal = parrafosFormateados.filter((p) => p.length > 0).join("\n\n");

  // Registrar telemetría estructurada sin texto ni audio si está activada
  if (opciones?.emitirTelemetria !== false && motivosLimites.length > 0 && typeof window !== "undefined") {
    for (const item of motivosLimites) {
      void logTelemetryEvent({
        moduleId: "ensamblador_semantico",
        sessionId: opciones?.sessionId ?? "session-ensamblar",
        action: "LIMITE_PARRAFO_DETECTADO",
        severity: "INFO",
        payload: {
          indiceParrafo: item.indiceParrafo,
          motivo: item.motivo,
          cantidadPalabrasParrafo: contarPalabras(parrafosFormateados[item.indiceParrafo] ?? ""),
        },
      });
    }
  }

  return {
    texto: textoFinal,
    parrafos: parrafosFormateados,
    motivosLimites,
  };
}

/**
 * Reemplazo insensible a mayúsculas, solo en límites de palabra completa.
 * El glosario se inyecta como parámetro.
 */
export function aplicarGlosario(
  texto: string,
  glosario: Record<string, string>
): string {
  if (!texto || !glosario || Object.keys(glosario).length === 0) {
    return texto;
  }

  // Ordenar llaves por longitud descendente para evitar reemplazos parciales que invaliden frases más largas
  const sortedKeys = Object.keys(glosario).sort((a, b) => b.length - a.length);

  let resultado = texto;

  for (const key of sortedKeys) {
    const valor = glosario[key];

    // Escapar caracteres especiales de regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Construir regex insensible a mayúsculas usando límites Unicode de palabra completa (lookbehinds/lookaheads)
    const regex = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapedKey}(?![\\p{L}\\p{N}_])`,
      "giu"
    );

    resultado = resultado.replace(regex, valor);
  }

  return resultado;
}
