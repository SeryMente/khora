// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generarYPersistirHallazgos, listarHallazgos } from "@/lib/server/asistenteRevision";
import { getDb } from "@/lib/server/neon";
import { descifrarTexto } from "@/lib/server/cripto";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const versionParam = url.searchParams.get("version");

    const db = getDb();
    let version = versionParam ? parseInt(versionParam, 10) : 1;

    if (!versionParam) {
      const verRes = await db.query(
        "SELECT version, sha256, texto FROM volcado_version WHERE volcado_id = $1 ORDER BY version DESC LIMIT 1",
        [id]
      );
      if (verRes.rows.length > 0) {
        version = Number(verRes.rows[0].version);
      }
    }

    const verRow = await db.query(
      "SELECT version, sha256, texto FROM volcado_version WHERE volcado_id = $1 AND version = $2",
      [id, version]
    );

    if (verRow.rows.length === 0) {
      return NextResponse.json({ hallazgos: [] });
    }

    const sha256 = verRow.rows[0].sha256;
    const texto = descifrarTexto(verRow.rows[0].texto || "");

    let hallazgos = await listarHallazgos(id, version);
    if (hallazgos.length === 0 && texto.trim().length > 0) {
      hallazgos = await generarYPersistirHallazgos(id, version, sha256, texto);
    }

    return NextResponse.json({ hallazgos });
  } catch (e: any) {
    return NextResponse.json({ detail: String(e?.message ?? e) }, { status: 500 });
  }
}
