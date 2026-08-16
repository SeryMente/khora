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
    // Un fragmento inicia un párrafo nuevo si es el primero de todos, o si su pausaMsAntes >= umbralMs
    if (i === 0 || frag.pausaMsAntes >= umbralMs) {
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
