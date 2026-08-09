// @l0 L0-002-R · @req PIPELINE-OBSERVABILITY/REQ-1
import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { obtenerPipelineAggregated } from "../../../lib/server/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const data = await obtenerPipelineAggregated();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { detail: "lectura del pipeline fallida", causa: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
