import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createNote, listNotes, noteDraftSchema, noteListQuerySchema } from "@/lib/server/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function currentOwner(session: unknown): string | null {
  if (!session || typeof session !== "object" || !("user" in session)) return null;
  const user = (session as { user?: { email?: unknown } | null }).user;
  return typeof user?.email === "string" && user.email.length > 0 ? user.email : null;
}

export async function GET(request: Request) {
  const owner = currentOwner(await auth() as unknown);
  if (!owner) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = noteListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    context_type: url.searchParams.get("context_type") ?? undefined,
    context_id: url.searchParams.get("context_id") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ detail: "filtros inválidos", issues: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json(await listNotes(owner, parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ detail: "no se pudieron consultar las notas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const owner = currentOwner(await auth() as unknown);
  if (!owner) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ detail: "JSON inválido" }, { status: 400 }); }
  const parsed = noteDraftSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ detail: "nota inválida", issues: parsed.error.issues }, { status: 400 });
  try {
    const note = await createNote(owner, parsed.data);
    return NextResponse.json({ note }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ detail: "no se pudo crear la nota" }, { status: 500 });
  }
}
