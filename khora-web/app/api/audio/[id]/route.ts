// @l0 L0-002-R · @req TRACE-SESSION/010 · @req AUD-04
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDb } from "../../../../lib/server/neon";
import { descifrarBytes } from "../../../../lib/server/cripto";
import { COOKIE_BOVEDA, desbloqueoVigente } from "../../../../lib/server/boveda";

export const runtime = "nodejs";

export async function GET(pedido: NextRequest, contexto: { params: Promise<{ id: string }> }) {
  try {
    if (!desbloqueoVigente(pedido.cookies.get(COOKIE_BOVEDA)?.value)) {
      return NextResponse.json({ error: "boveda_cerrada", detail: "Bóveda cerrada: introduce el PIN" }, { status: 423 });
    }

    const { id } = await contexto.params;
    const isNumeric = /^\d+$/.test(id.trim());

    const db = getDb();
    const volcadoRes = await db.query(
      isNumeric
        ? "SELECT id, audio_url, audio_partes, session_id FROM volcado WHERE folio = $1"
        : "SELECT id, audio_url, audio_partes, session_id FROM volcado WHERE id::text = $1",
      [isNumeric ? parseInt(id.trim(), 10) : id.trim()]
    );

    if (volcadoRes.rows.length === 0) {
      return NextResponse.json({ error: "volcado_inexistente", detail: "El volcado especificado no existe." }, { status: 404 });
    }

    const volcado = volcadoRes.rows[0];
    const volcadoId = volcado.id;
    const sessionId = volcado.session_id ? String(volcado.session_id).trim() : null;

    // 1. Intentar resolver por dictado_audio_parte
    let partesDb: any[] = [];
    if (sessionId || volcadoId) {
      const dbPartesRes = await db.query(
        "SELECT part_index, blob_url, bytes, sha256 FROM dictado_audio_parte WHERE session_id = $1 OR volcado_id = $2 ORDER BY part_index ASC",
        [sessionId, volcadoId]
      );
      partesDb = dbPartesRes.rows;
    }

    if (sessionId) {
      const sessionRes = await db.query("SELECT estado, total_partes FROM dictado_session WHERE session_id = $1", [sessionId]);
      if (sessionRes.rows.length > 0) {
        const totalPartes = sessionRes.rows[0].total_partes;
        if (typeof totalPartes === "number" && partesDb.length < totalPartes) {
          return NextResponse.json({ error: "audio_parcial", detail: `Faltan partes de audio: ${partesDb.length}/${totalPartes}` }, { status: 422 });
        }
      }
    }

    if (partesDb.length > 0) {
      const bufferArrayList: Buffer[] = [];
      for (const p of partesDb) {
        const url = p.blob_url;
        let remoto: Response;
        try {
          remoto = await fetch(url, { cache: "no-store" });
        } catch (fetchErr) {
          return NextResponse.json({ error: "blob_inexistente", detail: `Blob inaccesible: ${url}` }, { status: 502 });
        }
        if (!remoto.ok) {
          return NextResponse.json({ error: "blob_inexistente", detail: `Blob respondió con status ${remoto.status}` }, { status: 502 });
        }

        const cifrado = Buffer.from(await remoto.arrayBuffer());
        let claro: Buffer;
        try {
          claro = descifrarBytes(cifrado);
        } catch (decErr) {
          return NextResponse.json({ error: "blob_corrupto", detail: "No se pudo descifrar el blob de audio." }, { status: 500 });
        }

        if (p.sha256) {
          const hashCalculado = createHash("sha256").update(claro).digest("hex");
          if (hashCalculado !== p.sha256) {
            return NextResponse.json({ error: "blob_corrupto", detail: `Fallo de verificación SHA256 en parte ${p.part_index}` }, { status: 500 });
          }
        }

        bufferArrayList.push(claro);
      }

      const audioTotal = Buffer.concat(bufferArrayList);
      return new NextResponse(new Uint8Array(audioTotal), {
        status: 200,
        headers: {
          "content-type": "audio/webm",
          "cache-control": "no-store",
          "content-length": String(audioTotal.length),
        },
      });
    }

    // 2. Intentar resolver por audio_partes (columna JSON en volcado)
    let jsonPartes: any[] = [];
    if (volcado.audio_partes) {
      try {
        jsonPartes = typeof volcado.audio_partes === "string" ? JSON.parse(volcado.audio_partes) : volcado.audio_partes;
      } catch (e) {
        jsonPartes = [];
      }
    }

    if (Array.isArray(jsonPartes) && jsonPartes.length > 0) {
      const ordenadas = [...jsonPartes].sort((a, b) => (a.parte ?? 0) - (b.parte ?? 0));
      const bufferArrayList: Buffer[] = [];
      for (const p of ordenadas) {
        const url = p.url;
        if (!url) continue;
        let remoto: Response;
        try {
          remoto = await fetch(url, { cache: "no-store" });
        } catch (e) {
          return NextResponse.json({ error: "blob_inexistente", detail: `Blob inaccesible: ${url}` }, { status: 502 });
        }
        if (!remoto.ok) {
          return NextResponse.json({ error: "blob_inexistente", detail: `Blob respondió con status ${remoto.status}` }, { status: 502 });
        }
        const cifrado = Buffer.from(await remoto.arrayBuffer());
        const claro = descifrarBytes(cifrado);
        bufferArrayList.push(claro);
      }

      if (bufferArrayList.length > 0) {
        const audioTotal = Buffer.concat(bufferArrayList);
        return new NextResponse(new Uint8Array(audioTotal), {
          status: 200,
          headers: {
            "content-type": "audio/webm",
            "cache-control": "no-store",
            "content-length": String(audioTotal.length),
          },
        });
      }
    }

    // 3. Fallback a audio_url directo
    const url = volcado.audio_url ? String(volcado.audio_url).trim() : "";
    if (url) {
      let remoto: Response;
      try {
        remoto = await fetch(url, { cache: "no-store" });
      } catch (e) {
        return NextResponse.json({ error: "blob_inexistente", detail: `Blob inaccesible: ${url}` }, { status: 502 });
      }
      if (!remoto.ok) {
        return NextResponse.json({ error: "blob_inexistente", detail: `Blob respondió con status ${remoto.status}` }, { status: 502 });
      }
      const cifrado = Buffer.from(await remoto.arrayBuffer());
      const claro = descifrarBytes(cifrado);
      return new NextResponse(new Uint8Array(claro), {
        status: 200,
        headers: {
          "content-type": "audio/webm",
          "cache-control": "no-store",
          "content-length": String(claro.length),
        },
      });
    }

    // 4. Si no se encontró audio por ninguna vía
    return NextResponse.json({ error: "audio_no_vinculado", detail: "El volcado no tiene un audio registrado o vinculado." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "error_interno", detail: String(error) }, { status: 500 });
  }
}
