import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ObservationBatchSchema } from "@/lib/contracts/observation-batch";
import { persistObservationBatchRuntime } from "@/lib/server/observation-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_000_000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  if (req.headers.get("x-khora-observation-source") !== "harmonia-extension") {
    return NextResponse.json({ ok: false, error: "Fuente de observaciones no autorizada" }, { status: 403 });
  }

  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Batch demasiado grande" }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const parsed = ObservationBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "ObservationBatch inválido", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await persistObservationBatchRuntime(parsed.data);
    return NextResponse.json(
      { ok: result.persisted, runtime: result },
      {
        status: result.persisted ? 200 : 502,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Error persistiendo ObservationBatch en runtime:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo persistir el batch en el almacén de runtime",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
