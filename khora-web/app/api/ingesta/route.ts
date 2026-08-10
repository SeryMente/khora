// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,REQ-3,PIPELINE/REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { listarVersiones, sha256de } from "../../../lib/server/correcciones";
import { getDb } from "../../../lib/server/neon";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let texto: string | null = null;
  let archivo_base64: string | null = null;
  let mime: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const textInput = formData.get("text") as string | null;

    if (file) {
      mime = file.type;
      const arrayBuffer = await file.arrayBuffer();
      archivo_base64 = Buffer.from(arrayBuffer).toString("base64");
    } else if (textInput) {
      texto = textInput;
    }

    const volcadoId = (formData.get("volcado_id") as string | null) ?? null;
    const versionCruda = (formData.get("version") as string | null) ?? null;
    if (!volcadoId || !versionCruda) {
      return NextResponse.json({ error: "procedencia ausente: se exigen volcado_id y version" }, { status: 400 });
    }
    if (file) {
      return NextResponse.json({ error: "el carril de archivo aun no tiene volcado versionado" }, { status: 409 });
    }
    const versionPedida = Number(versionCruda);
    const versiones = await listarVersiones(volcadoId);
    const fila: any = versiones.find((v: any) => Number(v.version) === versionPedida);
    if (!fila) {
      return NextResponse.json({ error: "version inexistente para ese volcado" }, { status: 404 });
    }
    texto = String(fila.texto ?? "");
    archivo_base64 = null;
    mime = null;
    const shaServidor = sha256de(texto);
    if (shaServidor !== String(fila.sha256).toLowerCase()) {
      return NextResponse.json({ error: "integridad rota: sha256 de la version no coincide" }, { status: 409 });
    }

    const payload = {
      texto,
      archivo_base64,
      mime,
      provenance: {
        origen: "khora-ui",
        driver: "web",
        timestamp: new Date().toISOString(),
        volcado_id: volcadoId,
        version: versionPedida,
        sha256: shaServidor,
      }
    };

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 60000); // 60s timeout

    const kernelUrl = process.env.KHORA_API_URL || "http://127.0.0.1:8000";
    const khoraKey = process.env.X_KHORA_KEY || "dummy-key"; // JAMÁS NEXT_PUBLIC

    try {
      const apiResponse = await fetch(`${kernelUrl}/api/v1/ingesta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KHORA-KEY": khoraKey,
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      clearTimeout(timeout);

      const data = await apiResponse.json();

      // Persist status and io_id in PostgreSQL
      try {
        const db = getDb();
        if (apiResponse.status === 200 || apiResponse.status === 201) {
          const ioId = data.io_id || null;
          await db.query(
            "UPDATE volcado SET estado = 'ingerido', io_id = $1, ultimo_error = NULL, ultimo_intento = NOW(), intentos = intentos + 1 WHERE id = $2",
            [ioId, volcadoId]
          );
        } else {
          const errorMsg = data.error || data.detail || JSON.stringify(data) || "Kernel returned error";
          await db.query(
            "UPDATE volcado SET estado = 'fallido', ultimo_error = $1, ultimo_intento = NOW(), intentos = intentos + 1 WHERE id = $2",
            [errorMsg, volcadoId]
          );
        }
      } catch (dbErr: any) {
        console.error("Failed to update volcado state in DB:", dbErr);
      }

      return NextResponse.json(data, { status: apiResponse.status });
    } catch (fetchError: any) {
      clearTimeout(timeout);

      // Update volcado to fallido state on fetch error
      try {
        const db = getDb();
        await db.query(
          "UPDATE volcado SET estado = 'fallido', ultimo_error = $1, ultimo_intento = NOW(), intentos = intentos + 1 WHERE id = $2",
          [fetchError.message || "Fetch to kernel failed", volcadoId]
        );
      } catch (dbErr) {
        console.error("Failed to update volcado state in DB on fetch error:", dbErr);
      }

      if (fetchError.name === "AbortError") {
        return NextResponse.json({ error: "Request to kernel timed out" }, { status: 504 });
      }
      return NextResponse.json({ error: "Kernel request failed", details: fetchError.message }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Bad Request", details: err.message }, { status: 400 });
  }
}
