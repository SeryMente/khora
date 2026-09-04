// @l0 L0-002-R · @req PROMPT-3A/PROPUESTAS
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import {
  generarYPersistirPropuestas,
  listarPropuestasCorreccion,
} from "../../../../../lib/server/propuestasCorreccion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const verParam = url.searchParams.get("version");
    const version = verParam ? Number(verParam) : undefined;

    const propuestas = await listarPropuestasCorreccion(id, version);
    return NextResponse.json({
      success: true,
      volcado_id: id,
      propuestas,
      total: propuestas.length,
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    const status = errorMsg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const propuestas = await generarYPersistirPropuestas(id);

    return NextResponse.json({
      success: true,
      volcado_id: id,
      propuestas,
      total: propuestas.length,
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    const status = errorMsg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}
