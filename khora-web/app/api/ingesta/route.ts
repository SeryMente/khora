// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
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

    const db = getDb();
    const volRes = await db.query("SELECT estado, version_aprobada FROM volcado WHERE id = $1", [volcadoId]);
    if (volRes.rows.length === 0) {
      return NextResponse.json({ error: "volcado no encontrado" }, { status: 404 });
    }
    const vol = volRes.rows[0];
    if (vol.estado !== "listo_ingesta" && vol.estado !== "ingerido" && vol.estado !== "fallido") {
      return NextResponse.json({ error: "el volcado debe estar aprobado para ingesta" }, { status: 400 });
    }
    if (vol.version_aprobada !== versionPedida) {
      return NextResponse.json({ error: `la versión pedida (${versionPedida}) no coincide con la versión aprobada (${vol.version_aprobada})` }, { status: 400 });
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

      if (apiResponse.ok && data.io_id) {
        await db.query(
          `UPDATE volcado
           SET io_id = $2,
               estado = 'ingerido',
               ultimo_intento = now(),
               intentos = intentos + 1,
               ultimo_error = null
           WHERE id = $1`,
          [volcadoId, data.io_id]
        );
      } else {
        const errMsg = data.error || data.causa || data.detail || "Error desconocido en kernel";
        await db.query(
          `UPDATE volcado
           SET estado = 'fallido',
               ultimo_intento = now(),
               intentos = intentos + 1,
               ultimo_error = $2
           WHERE id = $1`,
          [volcadoId, typeof errMsg === "object" ? JSON.stringify(errMsg) : String(errMsg)]
        );
      }

      return NextResponse.json(data, { status: apiResponse.status });
    } catch (fetchError: any) {
      clearTimeout(timeout);

      const errMsg = fetchError.name === "AbortError" ? "Request to kernel timed out" : (fetchError.message || "Kernel request failed");
      await db.query(
        `UPDATE volcado
         SET estado = 'fallido',
             ultimo_intento = now(),
             intentos = intentos + 1,
             ultimo_error = $2
         WHERE id = $1`,
        [volcadoId, errMsg]
      );

      if (fetchError.name === "AbortError") {
        return NextResponse.json({ error: "Request to kernel timed out" }, { status: 504 });
      }
      return NextResponse.json({ error: "Kernel request failed", details: fetchError.message }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Bad Request", details: err.message }, { status: 400 });
  }
}
