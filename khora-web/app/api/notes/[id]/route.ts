import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNote, notePatchSchema, permanentlyDeleteNote, updateNote } from "@/lib/server/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function currentOwner(session: unknown): string | null {
  if (!session || typeof session !== "object" || !("user" in session)) return null;
  const user = (session as { user?: { email?: unknown } | null }).user;
  return typeof user?.email === "string" && user.email.length > 0 ? user.email : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const owner = currentOwner(await auth() as unknown);
  if (!owner) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  const { id } = await context.params;
  try {
    const note = await getNote(owner, id);
    return note
      ? NextResponse.json({ note }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ detail: "nota no encontrada" }, { status: 404 });
  } catch {
    return NextResponse.json({ detail: "no se pudo consultar la nota" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const owner = currentOwner(await auth() as unknown);
  if (!owner) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  const { id } = await context.params;
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ detail: "JSON inválido" }, { status: 400 }); }
  const parsed = notePatchSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ detail: "cambios inválidos", issues: parsed.error.issues }, { status: 400 });
  try {
    const note = await updateNote(owner, id, parsed.data);
    return note
      ? NextResponse.json({ note }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ detail: "nota no encontrada o no editable" }, { status: 404 });
  } catch {
    return NextResponse.json({ detail: "no se pudo actualizar la nota" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const owner = currentOwner(await auth() as unknown);
  if (!owner) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  const { id } = await context.params;
  if (new URL(request.url).searchParams.get("confirm") !== "true") {
    return NextResponse.json({ detail: "eliminación permanente requiere confirm=true" }, { status: 400 });
  }
  try {
    const deleted = await permanentlyDeleteNote(owner, id);
    return deleted
      ? NextResponse.json({ deleted: true })
      : NextResponse.json({ detail: "solo se eliminan notas propias que ya están en papelera" }, { status: 404 });
  } catch {
    return NextResponse.json({ detail: "no se pudo eliminar la nota" }, { status: 500 });
  }
}
