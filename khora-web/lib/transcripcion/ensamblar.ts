// @l0 L0-002-R · @req FIX-DICTADO/D3-D4

export type Fragmento = {
  texto: string;
  pausaMsAntes: number;
};

export interface OpcionesEnsamblar {
  umbralMs?: number;
}

/**
 * Une fragmentos de transcripción en párrafos de redacción normal (estándar "clean verbatim").
 * El salto de párrafo lo produce el cambio de tema / pausa mayor o igual al umbral.
 */
// Palabras y conectores subordinantes / de continuidad que indican pausa de respiración dentro de una misma idea
const RE_CONTINUACION_INICIO = /^(porque|pero|y|o|que|sino|aunque|para|donde|como|si|cuando|pues|mientras)\b/i;

// Palabras o preposiciones con las que no puede cerrar un párrafo de forma natural
const RE_INCOMPLETO_FINAL = /(?:^|\s)(?:de|del|la|el|los|las|un|una|unos|unas|con|sin|en|por|para|que|porque|pero|y|o|ni|como|si|cuando|donde|a|al|hacia|hasta|sobre|tras|entre|durante|mediante)$/i;

/**
 * Evalúa si un fragmento consecutivo debe iniciar un nuevo párrafo.
 * Prioridad conceptual:
 * 1. Cierre de unidad lingüística / terminal de oración (. ? ! ...)
 * 2. Estructura y contexto de subordinación vs independencia discursiva
 * 3. Silencio / pausa únicamente como señal auxiliar
 */
function esNuevoParrafo(
  textoPrevio: string,
  textoNuevo: string,
  pausaMs: number,
  umbralMs: number
): boolean {
  const prevTrim = textoPrevio.trim();
  const nuevoTrim = textoNuevo.trim();

  if (!prevTrim || !nuevoTrim) return false;

  const tienePuntuacionTerminal = /[.?!…]$/.test(prevTrim);
  const esComaOFinalIncompleto = /[,;:]$/.test(prevTrim) || RE_INCOMPLETO_FINAL.test(prevTrim);
  const empiezaConContinuacion = RE_CONTINUACION_INICIO.test(nuevoTrim);

  // Si el texto previo termina con coma, preposición o el nuevo empieza con conector de continuidad (porque, pero, y, etc.)
  // se trata de una pausa de respiración dentro de la misma idea, a menos que el silencio sea extremadamente largo (>= 12000ms)
  if ((esComaOFinalIncompleto || empiezaConContinuacion) && !tienePuntuacionTerminal) {
    return pausaMs >= 12000;
  }

  // 1. Si la oración anterior cerró formalmente con punto/signo terminal:
  if (tienePuntuacionTerminal) {
    // Si hay una pausa razonable (>= 1000ms) o la pausa por defecto o el nuevo texto es una nueva oración independiente
    return pausaMs >= 1000 || pausaMs >= umbralMs;
  }

  // 2. Si no hay puntuación terminal explícita pero hay una pausa auxiliar fuerte (>= umbralMs)
  // y la unidad previa no está sintácticamente incompleta ni la nueva es subordinada:
  if (pausaMs >= umbralMs) {
    return true;
  }

  return false;
}

/**
 * Une fragmentos de transcripción en párrafos de redacción normal (estándar "clean verbatim").
 * El salto de párrafo responde prioritariamente a la clausura sintáctica y discursiva.
 */
export function ensamblarParrafos(
  fragmentos: Fragmento[],
  opciones?: OpcionesEnsamblar
): string {
  if (!fragmentos || fragmentos.length === 0) {
    return "";
  }

  const umbralMs = opciones?.umbralMs ?? 3500;
  const parrafos: string[][] = [];
  let parrafoActual: string[] = [];

  for (let i = 0; i < fragmentos.length; i++) {
    const frag = fragmentos[i];
    if (i === 0) {
      parrafoActual = [frag.texto];
      continue;
    }

    const textoPrevio = parrafoActual.join(" ");
    if (esNuevoParrafo(textoPrevio, frag.texto, frag.pausaMsAntes, umbralMs)) {
      if (parrafoActual.length > 0) {
        parrafos.push(parrafoActual);
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

  return parrafosFormateados.filter((p) => p.length > 0).join("\n\n");
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
