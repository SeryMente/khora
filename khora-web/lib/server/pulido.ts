// @l0 L0-002-R · @req FIX-DICTADO/D1-D4
import glosarioJson from "../transcripcion/glosario.json";
import { aplicarGlosario } from "../transcripcion/ensamblar";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = process.env.GROQ_PULIDO_MODEL ?? "llama-3.3-70b-versatile";

export type ResultadoPulido = {
  texto: string;
  aceptado: boolean;
  motivo: string;
  motivoRechazo: string | null;
};

export function palabrasNormalizadas(t: string): string[] {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 0);
}

export function obtenerGlosario(): Record<string, string> {
  const glosario: Record<string, string> = {};
  for (const [k, v] of Object.entries(glosarioJson)) {
    if (!k.startsWith("_") && typeof v === "string") {
      glosario[k] = v;
    }
  }
  return glosario;
}

export function construirInstruccion(glosario: Record<string, string>): string {
  const base = [
    "Eres un corrector ortotipografico estricto de transcripciones de dictado.",
    "Conserva exactamente el idioma y las palabras del texto de entrada; no traduzcas entre idiomas.",
    "Tu unica tarea es insertar puntuacion, tildes, mayusculas y saltos de parrafo.",
    "PROHIBIDO agregar palabras, quitar palabras, sustituir por sinonimos, traducir, reordenar, resumir o comentar.",
    "No uses vinetas ni listas ni titulos.",
    "Devuelve solo el texto corregido, sin comillas ni explicaciones.",
  ].join(" ");

  const entries = Object.entries(glosario);
  if (entries.length > 0) {
    const glosarioList = entries.map(([key, val]) => `"${key}" -> "${val}"`).join(", ");
    return `${base} Es obligatorio aplicar este glosario para la correccion de nombres propios o terminos tecnicos, reemplazando el termino crudo (a la izquierda) por su correspondiente corregido (a la derecha): ${glosarioList}.`;
  }
  return base;
}

export function guardian(
  crudo: string,
  pulido: string,
  glosario?: Record<string, string>
): ResultadoPulido {
  const g = glosario ?? obtenerGlosario();
  const crudoNormalizadoConGlosario = aplicarGlosario(crudo, g);

  const a = palabrasNormalizadas(crudoNormalizadoConGlosario);
  const b = palabrasNormalizadas(pulido);

  if (a.length !== b.length) {
    const msg = `Invariancia lexical violada: número de palabras difiere (${a.length} vs ${b.length}). Prohibido añadir, eliminar o resumir.`;
    return {
      texto: crudo,
      aceptado: false,
      motivo: msg,
      motivoRechazo: msg,
    };
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      const msg = `Invariancia lexical violada en la palabra ${i + 1}: esperada "${a[i]}", obtenida "${b[i]}". Prohibido parafrasear, reordenar o cambiar palabras.`;
      return {
        texto: crudo,
        aceptado: false,
        motivo: msg,
        motivoRechazo: msg,
      };
    }
  }

  return {
    texto: pulido,
    aceptado: true,
    motivo: "ok",
    motivoRechazo: null,
  };
}

export async function pulir(crudo: string): Promise<ResultadoPulido> {
  const clave = process.env.GROQ_API_KEY;
  if (!clave) {
    return {
      texto: crudo,
      aceptado: false,
      motivo: "GROQ_API_KEY no esta configurada",
      motivoRechazo: "GROQ_API_KEY no esta configurada",
    };
  }

  const glosario = obtenerGlosario();
  const instruccion = construirInstruccion(glosario);

  const cuerpo = {
    model: MODELO,
    temperature: 0,
    max_tokens: 2048,
    messages: [
      { role: "system", content: instruccion },
      { role: "user", content: crudo },
    ],
  };

  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + clave },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(25000),
  });

  if (!r.ok) {
    const t = await r.text();
    const msg = "Groq HTTP " + r.status + ": " + t.slice(0, 200);
    return {
      texto: crudo,
      aceptado: false,
      motivo: msg,
      motivoRechazo: msg,
    };
  }

  const data = await r.json();
  const salida = data?.choices?.[0]?.message?.content;
  if (typeof salida !== "string" || salida.trim().length === 0) {
    return {
      texto: crudo,
      aceptado: false,
      motivo: "respuesta vacia de Groq",
      motivoRechazo: "respuesta vacia de Groq",
    };
  }

  const salidaLimpia = salida.trim();
  const salidaPostGlosario = aplicarGlosario(salidaLimpia, glosario);

  return guardian(crudo, salidaPostGlosario, glosario);
}
