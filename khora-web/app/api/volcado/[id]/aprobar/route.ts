// @l0 L0-002-R · @req ING-03/REQ-1,API-00/REQ-1 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { aprobarVersion } from "../../../../../lib/server/correcciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON invalido en el cuerpo de la peticion" }, { status: 400 });
    }

    const version = typeof body?.version === "number" ? body.version : Number(body?.version);
    if (!Number.isInteger(version) || version < 1) {
      return NextResponse.json({ error: "version invalida o ausente" }, { status: 400 });
    }

    const result = await aprobarVersion(id, version, session.user.email);
    return NextResponse.json({ version: result.version, sha256: result.sha256 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 409 });
  }
}
