import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { applyNoteAction } from "@/lib/server/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.object({ action: z.enum(["archive", "trash", "restore", "pin", "unpin"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const owner = session?.user?.email;
  if (typeof owner !== "string" || !owner) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });

  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ detail: "JSON inválido" }, { status: 400 }); }
  const parsed = actionSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ detail: "acción inválida" }, { status: 400 });

  const { id } = await context.params;
  try {
    const note = await applyNoteAction(owner, id, parsed.data.action);
    return note
      ? NextResponse.json({ note }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ detail: "nota no encontrada o transición no permitida" }, { status: 404 });
  } catch {
    return NextResponse.json({ detail: "no se pudo ejecutar la acción" }, { status: 500 });
  }
}
