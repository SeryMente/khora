// @l0 L0-002-R · @req PIPELINE/REQ-3 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getDb } from "../../../../lib/server/neon";
import { descifrarTexto } from "../../../../lib/server/cripto";
import { calcularDelta, asegurarEsquema } from "../../../../lib/server/correcciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");

    if (!id || !fromStr || !toStr) {
      return NextResponse.json({ error: "Faltan parametros id, from, o to" }, { status: 400 });
    }

    const fromVersion = Number(fromStr);
    const toVersion = Number(toStr);

    await asegurarEsquema();
    const db = getDb();

    // Query both versions
    const res = await db.query(
      "SELECT version, texto FROM volcado_version WHERE volcado_id = $1 AND version IN ($2, $3)",
      [id, fromVersion, toVersion]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "No se encontraron las versiones indicadas" }, { status: 404 });
    }

    let fromText = "";
    let toText = "";

    res.rows.forEach((row: any) => {
      const decodedText = descifrarTexto(String(row.texto ?? ""));
      if (row.version === fromVersion) {
        fromText = decodedText;
      }
      if (row.version === toVersion) {
        toText = decodedText;
      }
    });

    // Handle case where they are equal (for example when from === to)
    if (fromVersion === toVersion) {
      const singleRow = res.rows.find((row: any) => row.version === fromVersion);
      if (singleRow) {
        const decodedText = descifrarTexto(String(singleRow.texto ?? ""));
        fromText = decodedText;
        toText = decodedText;
      }
    }

    const pares = calcularDelta(fromText, toText);
    return NextResponse.json({ pares });
  } catch (e: any) {
    return NextResponse.json({ error: "Error calculating delta", details: e.message }, { status: 500 });
  }
}
