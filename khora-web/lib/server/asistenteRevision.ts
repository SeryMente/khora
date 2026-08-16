// @l0 L0-002-R · @req REVISION/REQ-1 · @acr ACR-1.2
import { randomUUID } from "crypto";
import { obtenerGlosario } from "./pulido";

export type TipoCategoriaSugerencia =
  | "ortografia"
  | "tildes"
  | "puntuacion"
  | "mayusculas"
  | "error_tipografico"
  | "lexico"
  | "semantico";

export type SeveridadSugerencia = "alta" | "media" | "baja";
export type EstadoSugerencia = "pendiente" | "aceptada" | "rechazada";
export type OrigenSugerencia = "ortotipografico" | "llm";

export interface Sugerencia {
  id: string;
  origen: OrigenSugerencia;
  posicion: { inicio: number; fin: number };
  texto_original: string;
  sugerencia: string;
  regla: string;
  tipo_categoria: TipoCategoriaSugerencia;
  severidad: SeveridadSugerencia;
  confianza: number;
  estado: EstadoSugerencia;
  explicacion?: string;
}

const PALABRAS_NEGACION = new Set([
  "no",
  "nunca",
  "jamas",
  "jamás",
  "sin",
  "tampoco",
  "ningun",
  "ningún",
  "ninguno",
  "ninguna",
  "nada",
  "nadie"
]);

const REGLAS_TILDES_COMUNES: Record<string, string> = {
  mas: "más",
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
  esta: "está",
  estan: "están",
  habia: "había",
  tenia: "tenía",
  aqui: "aquí",
  asi: "así",
  arbol: "árbol",
  facil: "fácil",
  dificil: "difícil",
  caracter: "carácter"
};

/**
 * Clasifica si una diferencia entre original y sugerido entraña un cambio semántico,
 * léxico u ortotipográfico.
 */
export function clasificarCambioSemantico(
  original: string,
  sugerido: string
): {
  esCambioSemantico: boolean;
  severidad: SeveridadSugerencia;
  tipo_categoria: TipoCategoriaSugerencia;
} {
  const origNorm = original.trim().toLowerCase();
  const sugNorm = sugerido.trim().toLowerCase();

  // 1. Detección de negación agregada o eliminada
  const esNegOrig = PALABRAS_NEGACION.has(origNorm);
  const esNegSug = PALABRAS_NEGACION.has(sugNorm);
  if (esNegOrig !== esNegSug) {
    return { esCambioSemantico: true, severidad: "alta", tipo_categoria: "semantico" };
  }

  // 2. Detección de alteración de números/dígitos
  const numOrig = original.match(/\d+/g);
  const numSug = sugerido.match(/\d+/g);
  if (JSON.stringify(numOrig) !== JSON.stringify(numSug)) {
    return { esCambioSemantico: true, severidad: "alta", tipo_categoria: "semantico" };
  }

  // 3. Modificaciones sustanciales entre palabras no vacías distintas
  if (origNorm !== sugNorm) {
    // Si la única diferencia son tildes o mayúsculas
    const sinDiacriticoOrig = origNorm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const sinDiacriticoSug = sugNorm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (sinDiacriticoOrig === sinDiacriticoSug) {
      if (origNorm !== sugNorm) {
        return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "tildes" };
      }
      return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "mayusculas" };
    }

    // Si difieren palabras complejas o entintadas
    if (original.length > 3 && sugerido.length > 3) {
      // Cambio de palabra léxica o entidad
      return { esCambioSemantico: true, severidad: "alta", tipo_categoria: "semantico" };
    }

    return { esCambioSemantico: false, severidad: "media", tipo_categoria: "lexico" };
  }

  // Cambios de puntuación o espacios
  if (original.toLowerCase() === sugerido.toLowerCase()) {
    if (/[.,;:!?]/.test(original) || /[.,;:!?]/.test(sugerido)) {
      return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "puntuacion" };
    }
    return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "mayusculas" };
  }

  return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "ortografia" };
}

/**
 * Genera sugerencias ortotipográficas en español basadas en reglas deterministas
 * y consulta opcional a LanguageTool API.
 */
export async function obtenerSugerenciasOrtotipograficas(texto: string): Promise<Sugerencia[]> {
  const sugerencias: Sugerencia[] = [];
  if (!texto || texto.trim().length === 0) return sugerencias;

  // Rule 1: Múltiples espacios seguidos
  const regexEspacios = / {2,}/g;
  let match: RegExpExecArray | null;
  while ((match = regexEspacios.exec(texto)) !== null) {
    sugerencias.push({
      id: randomUUID(),
      origen: "ortotipografico",
      posicion: { inicio: match.index, fin: match.index + match[0].length },
      texto_original: match[0],
      sugerencia: " ",
      regla: "Espacios múltiples duplicados",
      tipo_categoria: "puntuacion",
      severidad: "baja",
      confianza: 0.99,
      estado: "pendiente",
      explicacion: "Eliminar espacios consecutivos innecesarios"
    });
  }

  // Rule 2: Falta de espacio tras coma o punto (ej. "hola,mundo" -> "hola, mundo")
  const regexPuntuacionEspacio = /([a-záéíóúñA-ZÁÉÍÓÚÑ0-9])([.,;:!?])([a-záéíóúñA-ZÁÉÍÓÚÑ0-9])/g;
  while ((match = regexPuntuacionEspacio.exec(texto)) !== null) {
    const orig = match[0];
    const sug = `${match[1]}${match[2]} ${match[3]}`;
    sugerencias.push({
      id: randomUUID(),
      origen: "ortotipografico",
      posicion: { inicio: match.index, fin: match.index + orig.length },
      texto_original: orig,
      sugerencia: sug,
      regla: "Puntuación seguida de palabra sin espacio",
      tipo_categoria: "puntuacion",
      severidad: "baja",
      confianza: 0.95,
      estado: "pendiente",
      explicacion: `Insertar espacio tras la puntuación '${match[2]}'`
    });
  }

  // Rule 3: Mayúscula inicial tras punto y seguido o al inicio
  if (/^[a-z]/.test(texto)) {
    sugerencias.push({
      id: randomUUID(),
      origen: "ortotipografico",
      posicion: { inicio: 0, fin: 1 },
      texto_original: texto[0],
      sugerencia: texto[0].toUpperCase(),
      regla: "Mayúscula al inicio del texto",
      tipo_categoria: "mayusculas",
      severidad: "baja",
      confianza: 0.9,
      estado: "pendiente",
      explicacion: "Comenzar el texto con letra mayúscula"
    });
  }

  const regexTrasPunto = /(\.\s+)([a-z])/g;
  while ((match = regexTrasPunto.exec(texto)) !== null) {
    const orig = match[0];
    const sug = `${match[1]}${match[2].toUpperCase()}`;
    sugerencias.push({
      id: randomUUID(),
      origen: "ortotipografico",
      posicion: { inicio: match.index, fin: match.index + orig.length },
      texto_original: orig,
      sugerencia: sug,
      regla: "Mayúscula tras punto",
      tipo_categoria: "mayusculas",
      severidad: "baja",
      confianza: 0.95,
      estado: "pendiente",
      explicacion: "Iniciar la oración con mayúscula tras punto"
    });
  }

  // Rule 4: Tildes comunes en español
  const palabras = texto.split(/(\s+|[.,;:!?()]+)/);
  let idx = 0;
  for (const token of palabras) {
    const tokenNorm = token.toLowerCase();
    if (REGLAS_TILDES_COMUNES[tokenNorm] && token !== REGLAS_TILDES_COMUNES[tokenNorm]) {
      const sugerido = REGLAS_TILDES_COMUNES[tokenNorm];
      const sugFinal = token[0] === token[0].toUpperCase() ? sugerido[0].toUpperCase() + sugerido.slice(1) : sugerido;
      sugerencias.push({
        id: randomUUID(),
        origen: "ortotipografico",
        posicion: { inicio: idx, fin: idx + token.length },
        texto_original: token,
        sugerencia: sugFinal,
        regla: `Acentuación/Tilde ortográfica para '${tokenNorm}'`,
        tipo_categoria: "tildes",
        severidad: "baja",
        confianza: 0.92,
        estado: "pendiente",
        explicacion: `Se sugiere acentuar '${token}' como '${sugFinal}'`
      });
    }
    idx += token.length;
  }

  // Integración opcional / de respaldo con LanguageTool
  const ltUrl = process.env.LANGUAGETOOL_URL ?? "https://api.languagetool.org/v2/check";
  try {
    const params = new URLSearchParams();
    params.append("text", texto);
    params.append("language", "es");
    const rLT = await fetch(ltUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(3000)
    });
    if (rLT.ok) {
      const data = await rLT.json();
      if (Array.isArray(data?.matches)) {
        for (const m of data.matches) {
          const orig = texto.substring(m.offset, m.offset + m.length);
          const sug = m.replacements?.[0]?.value;
          if (!sug || orig === sug) continue;

          // Evitar sugerencias duplicadas en la misma posición
          const yaExiste = sugerencias.some(s => s.posicion.inicio === m.offset && s.posicion.fin === m.offset + m.length);
          if (yaExiste) continue;

          const clasif = clasificarCambioSemantico(orig, sug);
          sugerencias.push({
            id: randomUUID(),
            origen: "ortotipografico",
            posicion: { inicio: m.offset, fin: m.offset + m.length },
            texto_original: orig,
            sugerencia: sug,
            regla: m.rule?.description ?? "Regla ortotipográfica LanguageTool",
            tipo_categoria: clasif.tipo_categoria,
            severidad: clasif.severidad,
            confianza: 0.88,
            estado: "pendiente",
            explicacion: m.message ?? "Sugerencia del corrector lingüístico"
          });
        }
      }
    }
  } catch {
    // Si LanguageTool no responde o falla por timeout, se usan las reglas Khora internas.
  }

  return sugerencias;
}

/**
 * Genera sugerencias lingüísticas basadas en el glosario KHORA
 * y opcionalmente mediante Groq LLM para nombres propios o errores de transcripción.
 */
export async function obtenerSugerenciasLLM(
  texto: string,
  glosarioArg?: Record<string, string>
): Promise<Sugerencia[]> {
  const sugerencias: Sugerencia[] = [];
  if (!texto || texto.trim().length === 0) return sugerencias;

  const glosario = glosarioArg ?? obtenerGlosario();

  // 1. Aplicación de sugerencias de glosario Khora
  for (const [clave, valor] of Object.entries(glosario)) {
    if (!clave || !valor || clave === valor) continue;
    const regex = new RegExp(`\\b${clave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(texto)) !== null) {
      const orig = match[0];
      if (orig !== valor) {
        const clasif = clasificarCambioSemantico(orig, valor);
        sugerencias.push({
          id: randomUUID(),
          origen: "llm",
          posicion: { inicio: match.index, fin: match.index + orig.length },
          texto_original: orig,
          sugerencia: valor,
          regla: "Término de Glosario KHORA",
          tipo_categoria: clasif.tipo_categoria,
          severidad: clasif.severidad,
          confianza: 0.96,
          estado: "pendiente",
          explicacion: `El glosario canónico establece '${valor}'`
        });
      }
    }
  }

  // 2. Capa LLM Groq (si GROQ_API_KEY está configurada)
  const claveGroq = process.env.GROQ_API_KEY;
  if (claveGroq) {
    try {
      const modelo = process.env.GROQ_PULIDO_MODEL ?? "llama-3.3-70b-versatile";
      const promptSistema = [
        "Eres un asistente lingüístico especializado en auditar transcripciones de dictado en español.",
        "Tu tarea es detectar nombres propios mal reconocidos, términos técnicos o errores de transcripción evidentes.",
        "ESTÁ ESTRICTAMENTE PROHIBIDO reescribir el texto libremente, resumir o cambiar el estilo.",
        "Debes responder EXCLUSIVAMENTE con un JSON conteniendo una lista de objetos con las sugerencias discretas.",
        'Formato JSON: [ { "texto_original": "...", "sugerencia": "...", "explicacion": "..." } ]',
        "Si no hay errores evidentes, devuelve []"
      ].join(" ");

      const cuerpo = {
        model: modelo,
        temperature: 0,
        messages: [
          { role: "system", content: promptSistema },
          { role: "user", content: texto }
        ]
      };

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveGroq}` },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        const contenido = data?.choices?.[0]?.message?.content ?? "";
        const jsonMatch = contenido.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const arraySugerencias = JSON.parse(jsonMatch[0]);
          if (Array.isArray(arraySugerencias)) {
            for (const item of arraySugerencias) {
              const orig = item.texto_original;
              const sug = item.sugerencia;
              if (typeof orig === "string" && typeof sug === "string" && orig.length > 0 && orig !== sug) {
                const idx = texto.indexOf(orig);
                if (idx !== -1) {
                  const yaExiste = sugerencias.some(s => s.posicion.inicio === idx && s.texto_original === orig);
                  if (!yaExiste) {
                    const clasif = clasificarCambioSemantico(orig, sug);
                    sugerencias.push({
                      id: randomUUID(),
                      origen: "llm",
                      posicion: { inicio: idx, fin: idx + orig.length },
                      texto_original: orig,
                      sugerencia: sug,
                      regla: "Sugerencia Lingüística KHORA LLM",
                      tipo_categoria: clasif.tipo_categoria,
                      severidad: clasif.severidad,
                      confianza: 0.85,
                      estado: "pendiente",
                      explicacion: item.explicacion ?? "Nombre propio o término mal reconocido"
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // Si la llamada a Groq falla o expira, se preservan las sugerencias de glosario y reglas Khora.
    }
  }

  return sugerencias;
}

/**
 * Función principal que consolida sugerencias ortotipográficas y lingüísticas.
 */
export async function obtenerTodasSugerencias(texto: string): Promise<Sugerencia[]> {
  const [orto, llm] = await Promise.all([
    obtenerSugerenciasOrtotipograficas(texto),
    obtenerSugerenciasLLM(texto)
  ]);

  const consolidadas: Sugerencia[] = [...orto];

  for (const item of llm) {
    const solapada = consolidadas.some(
      s => Math.max(s.posicion.inicio, item.posicion.inicio) < Math.min(s.posicion.fin, item.posicion.fin)
    );
    if (!solapada) {
      consolidadas.push(item);
    }
  }

  consolidadas.sort((a, b) => a.posicion.inicio - b.posicion.inicio);
  return consolidadas;
}
