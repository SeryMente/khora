// @l0 L0-002-R · @req TILDES-AUTO/REQ-1

export interface SustitucionTildeSegura {
  rango: [number, number];
  textoOriginal: string;
  sugerencia: string;
  regla: string;
}

const FORMAS_OBLIGATORIAS_INEQUIVOCAS: Record<string, string> = {
  tambien: "también",
  segun: "según",
  seccion: "sección",
  cancion: "canción",
  version: "versión",
  ultima: "última",
  ultimo: "último",
  codigo: "código",
  numero: "número",
  pagina: "página",
  ademas: "además",
  despues: "después",
  estan: "están",
  habia: "había",
  tenia: "tenía",
  aqui: "aquí",
  asi: "así",
  arbol: "árbol",
  facil: "fácil",
  dificil: "difícil",
  caracter: "carácter",
};

// Formas ambiguas que NUNCA deben autoaplicarse sin intervención del operador
const FORMAS_AMBIGUAS_RESERVADAS = new Set([
  "mas", "mas", "esta", "esta", "si", "el", "tu", "de", "se", "aun",
  "termino", "termino", "solo", "solo"
]);

/**
 * Detecta y autoaplica únicamente tildes inequívocas sin cambiar el sentido del texto.
 */
export function autoaplicarTildesSeguras(texto: string): {
  textoNuevo: string;
  cambioRealizado: boolean;
  sustituciones: SustitucionTildeSegura[];
} {
  if (!texto || texto.trim().length === 0) {
    return { textoNuevo: texto, cambioRealizado: false, sustituciones: [] };
  }

  const sustituciones: SustitucionTildeSegura[] = [];
  const regexWord = /\b[a-zA-ZáéíóúñÁÉÍÓÚÑ]+\b/g;

  let match: RegExpExecArray | null;
  while ((match = regexWord.exec(texto)) !== null) {
    const orig = match[0];
    const origNorm = orig.toLowerCase();

    if (FORMAS_AMBIGUAS_RESERVADAS.has(origNorm)) {
      continue;
    }

    if (FORMAS_OBLIGATORIAS_INEQUIVOCAS[origNorm]) {
      const sugLower = FORMAS_OBLIGATORIAS_INEQUIVOCAS[origNorm];
      const esMayus = orig[0] === orig[0].toUpperCase();
      const sug = esMayus ? sugLower[0].toUpperCase() + sugLower.slice(1) : sugLower;

      if (orig !== sug) {
        sustituciones.push({
          rango: [match.index, match.index + orig.length],
          textoOriginal: orig,
          sugerencia: sug,
          regla: `Tilde ortográfica inequívoca para '${origNorm}'`,
        });
      }
    }
  }

  if (sustituciones.length === 0) {
    return { textoNuevo: texto, cambioRealizado: false, sustituciones: [] };
  }

  // Aplicar reemplazos de derecha a izquierda para no invalidar offsets
  let arrayChars = Array.from(texto);
  for (let i = sustituciones.length - 1; i >= 0; i--) {
    const s = sustituciones[i];
    const [inicio, fin] = s.rango;
    const actualSegmento = texto.slice(inicio, fin);
    if (actualSegmento === s.textoOriginal) {
      arrayChars.splice(inicio, fin - inicio, ...Array.from(s.sugerencia));
    }
  }

  const textoNuevo = arrayChars.join("");
  return {
    textoNuevo,
    cambioRealizado: textoNuevo !== texto,
    sustituciones,
  };
}
