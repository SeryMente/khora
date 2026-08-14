// @l0 L0-002-R · @req UI-04/INGRESO-INTEGRADO
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = process.env.GROQ_PULIDO_MODEL ?? "llama-3.3-70b-versatile";

export async function POST(req: Request) {
  try {
    const cuerpo = await req.json();
    const texto = typeof cuerpo?.texto === "string" ? cuerpo.texto : "";

    if (texto.trim().length === 0) {
      return NextResponse.json({ detail: "El texto para generar el título está vacío" }, { status: 400 });
    }

    const clave = process.env.GROQ_API_KEY;
    if (!clave) {
      return NextResponse.json({ detail: "GROQ_API_KEY no está configurada" }, { status: 500 });
    }

    const payload = {
      model: MODELO,
      temperature: 0.3,
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content: "Eres un asistente de Khora. Tu única tarea es generar un título descriptivo y muy corto (máximo 4 palabras) en español basado en el texto proporcionado. No uses comillas, ni tildes innecesarias, ni signos de puntuación, ni explicaciones de ningún tipo."
        },
        {
          role: "user",
          content: texto.slice(0, 4000) // limit context size slightly
        }
      ]
    };

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${clave}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ detail: `Error de Groq: ${r.status}`, causa: t }, { status: r.status });
    }

    const data = await r.json();
    let titulo = data?.choices?.[0]?.message?.content;
    if (typeof titulo === "string") {
      titulo = titulo.replace(/["'“”«»]/g, "").trim();
    }

    return NextResponse.json({ titulo: titulo || "Sin título" });
  } catch (e: any) {
    return NextResponse.json({ detail: "Fallo la generación del título", causa: String(e) }, { status: 500 });
  }
}
