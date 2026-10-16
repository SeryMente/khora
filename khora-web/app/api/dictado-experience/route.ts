import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordSchema, summarize } from "@/lib/contracts/dictado-experience";
import { experienceOwner, saveExperience, readExperience, deleteExperience, RETENTION_DAYS } from "@/lib/server/dictado-experience";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers }); }
function sameOrigin(req: NextRequest) {
  try { return new URL(req.headers.get("origin") || "").origin === req.nextUrl.origin; } catch { return false; }
}
export async function GET() {
  const session = await auth(); const owner = experienceOwner(session?.user);
  if (!owner) return json({ error: "Inicia sesión para consultar tus mediciones y opiniones." }, 401);
  try { const result = await readExperience(owner); return json({ ...result, summary: summarize(result.records), profileKey: owner, retentionDays: RETENTION_DAYS }); }
  catch { return json({ error: "No se pudieron leer tus datos. No se interpretará este fallo como ausencia de mediciones." }, 503); }
}
export async function POST(req: NextRequest) {
  const session = await auth(); const owner = experienceOwner(session?.user);
  if (!owner) return json({ error: "Inicia sesión para guardar tu opinión." }, 401);
  if (!sameOrigin(req)) return json({ error: "Origen no permitido." }, 403);
  if (req.headers.get("x-khora-experience-profile") !== owner) return json({ error: "La sesión cambió. Actualiza el panel antes de enviar." }, 409);
  try {
    const raw = await req.text(); if (Buffer.byteLength(raw, "utf8") > 16_384) return json({ error: "Entrada demasiado grande." }, 413);
    let body: unknown; try { body = JSON.parse(raw); } catch { return json({ error: "Entrada no válida." }, 400); }
    const parsed = recordSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Revisa la valoración y el comentario (máximo 1000 caracteres)." }, 400);
    const result = await saveExperience(owner, parsed.data);
    if (result === "conflict") return json({ error: "Este identificador ya pertenece a otro envío. Tu comentario no se sobrescribió." }, 409);
    if (result === "limited") return json({ error: "Límite temporal de envíos alcanzado; inténtalo más tarde." }, 429);
    return json({ ok: true, status: result, id: parsed.data.id });
  } catch { return json({ error: "No se pudo guardar. Conserva esta pantalla y reintenta; no se declara enviado." }, 503); }
}
export async function DELETE(req: NextRequest) {
  const session = await auth(); const owner = experienceOwner(session?.user);
  if (!owner) return json({ error: "Inicia sesión." }, 401);
  if (!sameOrigin(req)) return json({ error: "Origen no permitido." }, 403);
  if (req.headers.get("x-khora-experience-profile") !== owner) return json({ error: "La sesión cambió. Actualiza el panel antes de enviar." }, 409);
  try { await deleteExperience(owner); return json({ ok: true }); }
  catch { return json({ error: "No se pudo confirmar el borrado. Reintenta." }, 503); }
}
