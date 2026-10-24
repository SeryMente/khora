import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth/options";
import { capturarHuellaServidor } from "../../../lib/custodia/huella";
import { VOCABULARIO_MOMENTO } from "../../../lib/ingreso/momento-categorias";

export const runtime = "nodejs";

const MAX_BYTES = 64 * 1024; // Strict 64 KiB payload limit
const MAX_TEXT_CHARS = 12000;
const GROQ_TIMEOUT_MS = 9000;

export async function POST(req: NextRequest) {
  // 1. Session authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "No autorizado. Inicie sesión para analizar la crónica." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 2. Read headers and capture server footprint (including IPv4)
  const headerObj: Record<string, string> = {};
  req.headers.forEach((val, key) => {
    headerObj[key] = val;
  });
  const huellaServidor = capturarHuellaServidor(headerObj);

  // 3. Strict payload size limit check
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "Payload demasiado grande (límite 64 KiB)." },
      { status: 413, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Read stream enforcing max 64 KiB
  let bodyText = "";
  try {
    const reader = req.body?.getReader();
    if (reader) {
      let totalRead = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalRead += value.length;
        if (totalRead > MAX_BYTES) {
          return NextResponse.json(
            { error: "Cuerpo superó el límite real de 64 KiB." },
            { status: 413, headers: { "Cache-Control": "no-store" } }
          );
        }
        bodyText += new TextDecoder().decode(value);
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Error leyendo el cuerpo de la solicitud." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: any = {};
  try {
    body = JSON.parse(bodyText || "{}");
  } catch {
    return NextResponse.json(
      { error: "JSON inválido." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const userText = typeof body.texto === "string" ? body.texto.trim() : "";
  if (!userText) {
    return NextResponse.json(
      { error: "Texto requerido." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const truncatedText = userText.slice(0, MAX_TEXT_CHARS);
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    // Safe fallback when Groq key is absent
    return NextResponse.json(
      {
        fallback: true,
        reason: "GROQ_API_KEY_MISSING",
        huellaServidor,
        analisis: null,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 4. Call Groq API with user text treated purely as DATA, separated from system instructions
  const systemPrompt = `Eres un analizador de crónica personal. Tu tarea es analizar el texto suministrado como DATO y determinar si contiene evidencias sobre:
1. "datetime": Fecha y hora exactas de los hechos.
2. "when": Momento o momento del día (mañana, tarde, noche, etc.).
3. "where": Lugar del suceso.
4. "what": Actividad o qué pasa.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "criterios": {
    "datetime": { "covered": boolean, "evidence": string | null },
    "when": { "covered": boolean, "evidence": string | null, "categoria": "general" | "concreta" | "especializada" | null, "termino": string | null },
    "where": { "covered": boolean, "evidence": string | null },
    "what": { "covered": boolean, "evidence": string | null }
  }
}
IMPORTANTE: El campo 'evidence' debe ser una cita LITERAL idéntica tomada de la entrada del usuario. Si no hay evidencia literal, 'covered' debe ser false y 'evidence' null.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: truncatedText },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    clearTimeout(timeout);

    if (!groqRes.ok) {
      return NextResponse.json(
        {
          fallback: true,
          reason: `GROQ_HTTP_${groqRes.status}`,
          huellaServidor,
          analisis: null,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || "{}");

    return NextResponse.json(
      {
        fallback: false,
        huellaServidor,
        analisis: parsed,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        fallback: true,
        reason: err?.name === "AbortError" ? "GROQ_TIMEOUT" : "GROQ_ERROR",
        huellaServidor,
        analisis: null,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
