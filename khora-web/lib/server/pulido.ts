// @l0 L0-002 · @req CORA-02/REQ-1 · @acr ACR-1.2
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = process.env.GROQ_PULIDO_MODEL ?? "llama-3.3-70b-versatile";

const INSTRUCCION = [
  "Eres un corrector ortotipografico estricto de transcripciones de dictado en espanol.",
  "Tu unica tarea es insertar puntuacion, tildes, mayusculas y saltos de parrafo.",
  "PROHIBIDO agregar palabras, quitar palabras, sustituir por sinonimos, reordenar, resumir o comentar.",
  "No uses vinetas ni listas ni titulos.",
  "Devuelve solo el texto corregido, sin comillas ni explicaciones.",
].join(" ");

export type ResultadoPulido = { texto: string; aceptado: boolean; motivo: string };

export function palabrasNormalizadas(t: string): string[] {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 0);
}

export function guardian(crudo: string, pulido: string): ResultadoPulido {
  const a = palabrasNormalizadas(crudo);
  const b = palabrasNormalizadas(pulido);
  if (a.length !== b.length) {
    return { texto: crudo, aceptado: false, motivo: "numero de palabras alterado: " + a.length + " -> " + b.length };
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return { texto: crudo, aceptado: false, motivo: "palabra alterada en posicion " + (i + 1) + ": " + a[i] + " -> " + b[i] };
    }
  }
  return { texto: pulido, aceptado: true, motivo: "ok" };
}

export async function pulir(crudo: string): Promise<ResultadoPulido> {
  const clave = process.env.GROQ_API_KEY;
  if (!clave) return { texto: crudo, aceptado: false, motivo: "GROQ_API_KEY no esta configurada" };
  const cuerpo = {
    model: MODELO,
    temperature: 0,
    max_tokens: 2048,
    messages: [
      { role: "system", content: INSTRUCCION },
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
    return { texto: crudo, aceptado: false, motivo: "Groq HTTP " + r.status + ": " + t.slice(0, 200) };
  }
  const data = await r.json();
  const salida = data?.choices?.[0]?.message?.content;
  if (typeof salida !== "string" || salida.trim().length === 0) {
    return { texto: crudo, aceptado: false, motivo: "respuesta vacia de Groq" };
  }
  return guardian(crudo, salida.trim());
}
