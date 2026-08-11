// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { randomUUID } from "crypto";
import { getDb } from "../../../lib/server/neon";
import { listarVersiones, sha256de } from "../../../lib/server/correcciones";

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

    const db = getDb();
    const vRes = await db.query("SELECT estado, version_aprobada, sha256_aprobado FROM volcado WHERE id = $1", [volcadoId]);
    if (vRes.rows.length === 0) {
      return NextResponse.json({ error: "volcado no encontrado" }, { status: 404 });
    }
    const volcado = vRes.rows[0];

    // Validación de estado de aprobación/reintento
    if (volcado.estado !== "listo_ingesta" && volcado.estado !== "ingerido" && volcado.estado !== "fallido") {
      return NextResponse.json({ error: `La ingesta exige que el volcado este aprobado. Estado actual: ${volcado.estado}` }, { status: 428 });
    }
    if (volcado.version_aprobada === null || volcado.sha256_aprobado === null) {
      return NextResponse.json({ error: "El volcado no tiene una version aprobada activa" }, { status: 428 });
    }
    if (versionPedida !== Number(volcado.version_aprobada)) {
      return NextResponse.json({ error: "La version solicitada no coincide con la version aprobada para este volcado" }, { status: 409 });
    }

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
    if (shaServidor !== String(volcado.sha256_aprobado).trim().toLowerCase()) {
      return NextResponse.json({ error: "integridad rota: el SHA256 de la version no coincide con el SHA256 aprobado" }, { status: 409 });
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

      if (apiResponse.ok) {
        // Éxito: actualizar estado operativo a 'ingerido', registrar io_id y auditoría
        await db.query(
          `UPDATE volcado
           SET estado = 'ingerido',
               io_id = $2,
               ultimo_intento = now(),
               intentos = intentos + 1,
               ultimo_error = NULL
           WHERE id = $1`,
          [volcadoId, data.io_id || null]
        );

        await db.query(
          "INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            randomUUID(),
            volcadoId,
            "ingestado",
            volcado.estado,
            "ingerido",
            versionPedida,
            shaServidor,
            session?.user?.email ?? null,
          ]
        );
      } else {
        // Fallo: actualizar estado operativo (evitando degradar 'ingerido' a 'fallido')
        const nuevoEstado = volcado.estado === "ingerido" ? "ingerido" : "fallido";
        const errMsg = data.error || data.detail || `Kernel returned HTTP ${apiResponse.status}`;

        await db.query(
          `UPDATE volcado
           SET estado = $3,
               ultimo_intento = now(),
               intentos = intentos + 1,
               ultimo_error = $2
           WHERE id = $1`,
          [volcadoId, errMsg, nuevoEstado]
        );

        await db.query(
          "INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            randomUUID(),
            volcadoId,
            nuevoEstado === "ingerido" ? "ingesta_reintento_fallido" : "ingesta_fallida",
            volcado.estado,
            nuevoEstado,
            versionPedida,
            shaServidor,
            session?.user?.email ?? null,
          ]
        );
      }

      return NextResponse.json(data, { status: apiResponse.status });
    } catch (fetchError: any) {
      clearTimeout(timeout);
      const errMsg =
        fetchError.name === "AbortError"
          ? "Request to kernel timed out"
          : (fetchError.message || "Kernel request failed");

      const nuevoEstado = volcado.estado === "ingerido" ? "ingerido" : "fallido";

      await db.query(
        `UPDATE volcado
         SET estado = $3,
             ultimo_intento = now(),
             intentos = intentos + 1,
             ultimo_error = $2
         WHERE id = $1`,
        [volcadoId, errMsg, nuevoEstado]
      );

      await db.query(
        "INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          randomUUID(),
          volcadoId,
          nuevoEstado === "ingerido" ? "ingesta_reintento_fallido" : "ingesta_fallida",
          volcado.estado,
          nuevoEstado,
          versionPedida,
          shaServidor,
          session?.user?.email ?? null,
        ]
      );

      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: "Request to kernel timed out" },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: "Kernel request failed", details: errMsg },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Bad Request", details: err.message }, { status: 400 });
  }
}
