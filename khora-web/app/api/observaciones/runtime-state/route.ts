import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RuntimeStateSnapshotSchema } from "@/lib/contracts/runtime-state";
import { persistRuntimeState } from "@/lib/server/runtime-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 128_000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  if (req.headers.get("x-khora-runtime-source") !== "khora-ui") {
    return NextResponse.json({ ok: false, error: "Fuente de runtime no autorizada" }, { status: 403 });
  }

  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Snapshot demasiado grande" }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const parsed = RuntimeStateSnapshotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Snapshot de runtime inválido", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await persistRuntimeState(parsed.data);
    return NextResponse.json(
      { ok: true, runtime: result },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error persistiendo estado de runtime:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo persistir el estado de runtime" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
