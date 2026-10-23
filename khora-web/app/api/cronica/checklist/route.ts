import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Criterion = { id: "fecha_hora" | "lugar" | "momento" | "que_pasa"; status: "resolved" | "active" | "pending"; label: string; detail: string; evidence?: string };
type Review = { criteria: Criterion[]; summary: string; moment?: { value: string; category: "general" | "concreto" | "especializado"; justification: string } | null };
const FALLBACK: Review = { criteria: [
 { id: "fecha_hora", status: "active", label: "Fecha y hora", detail: "Menciona fecha y hora exactas si no se pueden verificar." },
 { id: "lugar", status: "active", label: "Lugar", detail: "Indica el lugar del suceso; la IP no demuestra dónde ocurrió." },
 { id: "momento", status: "pending", label: "Momento", detail: "Mañana, madrugada, mediodía, tarde, atardecer, noche o un término específico." },
 { id: "que_pasa", status: "pending", label: "Qué pasa", detail: "Cuenta qué sucede, sin limitar la crónica a una acción." }
], summary: "Análisis semántico no disponible; puedes seguir dictando o escribiendo." };

function trustedRequestMetadata(request: NextRequest) {
 const h = request.headers;
 const ip = h.get("x-real-ip") || h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || null;
 const ipv4 = ip && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) ? ip : null;
 return { receivedAt: new Date().toISOString(), ipv4, ipSource: ipv4 ? (h.has("x-real-ip") ? "x-real-ip" : "x-vercel-forwarded-for") : null, city: h.get("x-vercel-ip-city"), region: h.get("x-vercel-ip-country-region"), country: h.get("x-vercel-ip-country"), timezone: h.get("x-vercel-ip-timezone") };
}
export async function POST(request: NextRequest) {
 let body: { text?: unknown };
 try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
 const text = typeof body.text === "string" ? body.text.slice(0, 12000).trim() : "";
 const metadata = trustedRequestMetadata(request);
 if (!text) return NextResponse.json({ review: FALLBACK, metadata, source: "fallback" }, { headers: { "Cache-Control": "no-store" } });
 const apiKey = process.env.GROQ_API_KEY;
 if (!apiKey) return NextResponse.json({ review: FALLBACK, metadata, source: "fallback" }, { headers: { "Cache-Control": "no-store" } });
 const prompt = `Evalúa una crónica personal y devuelve exclusivamente JSON con forma {criteria:[{id,status,label,detail,evidence?}],summary,moment}. ids: fecha_hora,lugar,momento,que_pasa. status: resolved,active,pending. Fecha/hora solo resolved si el texto aporta fecha/hora explícitas; la recepción del servidor NO es la fecha del suceso. Si faltan, active y pide fecha/hora exactas. Lugar solo resolved si el texto lo identifica; metadatos de red no prueban dónde ocurrió el suceso. Momento: clasifica con evidencia textual suficiente, normaliza a general/concreto/especializado. No inventes. Solo sugiere un término nuevo para Momento si es claramente mejor que los predefinidos, está normalizado y justificas por qué; si no, moment=null. "Qué pasa" acepta hechos, sensaciones, observaciones e ideas, no solo acciones. Español breve. Texto: ${text}`;
 try {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.GROQ_PULIDO_MODEL ?? "llama-3.3-70b-versatile", temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Valida campos de crónica con criterio conservador. No inventes hechos." }, { role: "user", content: prompt }] }), signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
  const payload = await response.json(), raw = payload?.choices?.[0]?.message?.content, parsed = JSON.parse(raw);
  const ids = new Set(["fecha_hora", "lugar", "momento", "que_pasa"]);
  const returned = Array.isArray(parsed.criteria) ? parsed.criteria.filter((c: any) => ids.has(c?.id) && ["resolved", "active", "pending"].includes(c?.status)).slice(0, 4) : [];
  const byId = new Map(returned.map((c: Criterion) => [c.id, c]));
  const review: Review = { criteria: FALLBACK.criteria.map(f => ({ ...f, ...(byId.get(f.id) || {}) })), summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 240) : FALLBACK.summary, moment: parsed.moment && typeof parsed.moment.value === "string" && ["general", "concreto", "especializado"].includes(parsed.moment.category) && typeof parsed.moment.justification === "string" ? parsed.moment : null };
  return NextResponse.json({ review, metadata, source: "groq" }, { headers: { "Cache-Control": "no-store" } });
 } catch { return NextResponse.json({ review: FALLBACK, metadata, source: "fallback" }, { headers: { "Cache-Control": "no-store" } }); }
}
