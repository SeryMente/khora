import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { generarFragmentosAnclados } from "../../../../lib/server/fragmentos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { volcado_id, version } = body;

    if (!volcado_id || typeof volcado_id !== "string") {
      return NextResponse.json(
        { detail: "El parámetro volcado_id es obligatorio y debe ser una cadena." },
        { status: 400 }
      );
    }

    if (version !== undefined && (!Number.isInteger(version) || version < 1)) {
      return NextResponse.json(
        { detail: "El parámetro version debe ser un entero mayor o igual a 1." },
        { status: 400 }
      );
    }

    const resultado = await generarFragmentosAnclados(
      volcado_id,
      version ? Number(version) : undefined,
      { actor: session.user.email }
    );

    return NextResponse.json({
      success: true,
      sello: resultado.sello,
      terna: resultado.terna,
      source_triplet: resultado.source_triplet,
      total_fragmentos: resultado.total_fragmentos,
      fragmentos: resultado.fragmentos,
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    let status = 500;
    if (errorMsg.includes("no encontrado") || errorMsg.includes("no encontrada")) {
      status = 404;
    } else if (
      errorMsg.includes("Violación") ||
      errorMsg.includes("Incoincidencia") ||
      errorMsg.includes("Cobertura incompleta")
    ) {
      status = 409;
    }
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}
