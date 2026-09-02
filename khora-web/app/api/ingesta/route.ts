// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,PIPELINE/REQ-3
// @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @req SISTEMA-MENU/E4
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { auth } from "../../../auth";
import { getDb } from "../../../lib/server/neon";
import {
  listarVersiones,
  sha256de,
} from "../../../lib/server/correcciones";
import { registrarEvento } from "../../../lib/server/eventos";

type VolcadoRow = {
  estado: string;
  version_aprobada: number | string | null;
  sha256_aprobado: string | null;
};

type VersionRow = {
  version: number | string;
  texto: string | null;
  sha256: string | null;
};

type KernelResponse = {
  io_id?: string | null;
  error?: string;
  detail?: string;
  [key: string]: unknown;
};

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  let texto: string | null = null;
  let archivo_base64: string | null = null;
  let mime: string | null = null;

  try {
    const formData = await req.formData();

    const fileValue = formData.get("file");
    const textValue = formData.get("text");

    const file =
      fileValue instanceof File
        ? fileValue
        : null;

    const textInput =
      typeof textValue === "string"
        ? textValue
        : null;

    const volcadoIdValue = formData.get("volcado_id");
    const versionValue = formData.get("version");

    const volcadoId =
      typeof volcadoIdValue === "string"
        ? volcadoIdValue.trim()
        : null;

    const versionCruda =
      typeof versionValue === "string"
        ? versionValue.trim()
        : null;

    if (!volcadoId || !versionCruda) {
      await registrarEvento({
        fase: "ingesta",
        eventId: "ING-002",
        estado: "FAIL",
        mensaje: "Rechazo de ingesta por procedencia incompleta (Etapa 6 L0-003)",
        detalle: { volcadoId, versionCruda },
      });
      return NextResponse.json(
        {
          error:
            "procedencia ausente: se exigen volcado_id y version",
        },
        {
          status: 400,
        }
      );
    }

    if (file) {
      mime = file.type || null;

      const arrayBuffer = await file.arrayBuffer();

      archivo_base64 =
        Buffer.from(arrayBuffer).toString("base64");

      return NextResponse.json(
        {
          error:
            "el carril de archivo aun no tiene volcado versionado",
        },
        {
          status: 409,
        }
      );
    }

    if (
      textInput !== null &&
      textInput.trim().length > 0
    ) {
      texto = textInput;
    }

    const versionPedida = Number(versionCruda);

    if (
      !Number.isInteger(versionPedida) ||
      versionPedida < 1
    ) {
      return NextResponse.json(
        {
          error: "version invalida",
        },
        {
          status: 400,
        }
      );
    }

    const db = getDb();

    const vRes = await db.query(
      `
        SELECT
          estado,
          version_aprobada,
          sha256_aprobado
        FROM volcado
        WHERE id = $1
      `,
      [volcadoId]
    );

    if (vRes.rows.length === 0) {
      return NextResponse.json(
        {
          error: "volcado no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    const volcado =
      vRes.rows[0] as VolcadoRow;

    if (volcado.estado !== "listo_ingesta") {
      return NextResponse.json(
        {
          error:
            `La ingesta exige que el volcado este en estado listo_ingesta. ` +
            `Estado actual: ${volcado.estado}`,
        },
        {
          status: 428,
        }
      );
    }

    if (
      volcado.version_aprobada === null ||
      volcado.version_aprobada === undefined ||
      volcado.sha256_aprobado === null ||
      volcado.sha256_aprobado === undefined
    ) {
      await registrarEvento({
        fase: "ingesta",
        eventId: "ING-002",
        estado: "FAIL",
        mensaje: "Rechazo de ingesta por falta de versión/sha256 aprobados (Etapa 6 L0-003)",
        detalle: { volcadoId, versionPedida },
        volcadoId,
        version: versionPedida,
        correlacionId: volcadoId,
      });
      return NextResponse.json(
        {
          error:
            "El volcado no tiene una version aprobada activa",
        },
        {
          status: 428,
        }
      );
    }

    const versionAprobada =
      Number(volcado.version_aprobada);

    if (
      !Number.isInteger(versionAprobada) ||
      versionAprobada < 1
    ) {
      return NextResponse.json(
        {
          error:
            "La version aprobada almacenada en el volcado es invalida",
        },
        {
          status: 500,
        }
      );
    }

    if (versionPedida !== versionAprobada) {
      return NextResponse.json(
        {
          error:
            "La version solicitada no coincide con la version aprobada para este volcado",
        },
        {
          status: 409,
        }
      );
    }

    const versiones =
      await listarVersiones(volcadoId);

    const fila = (
      versiones as VersionRow[]
    ).find(
      (v) =>
        Number(v.version) === versionPedida
    );

    if (!fila) {
      return NextResponse.json(
        {
          error:
            "version inexistente para ese volcado",
        },
        {
          status: 404,
        }
      );
    }

    texto = String(fila.texto ?? "");

    archivo_base64 = null;
    mime = null;

    if (texto.length === 0) {
      return NextResponse.json(
        {
          error:
            "La version aprobada no contiene texto para ingerir",
        },
        {
          status: 422,
        }
      );
    }

    const shaServidor =
      sha256de(texto)
        .trim()
        .toLowerCase();

    const shaVersion =
      String(fila.sha256 ?? "")
        .trim()
        .toLowerCase();

    const shaAprobado =
      String(volcado.sha256_aprobado ?? "")
        .trim()
        .toLowerCase();

    if (!shaVersion || !shaAprobado || shaServidor !== shaVersion || shaServidor !== shaAprobado) {
      await registrarEvento({
        fase: "ingesta",
        eventId: "ING-002",
        estado: "FAIL",
        mensaje: "Rechazo de escritura sin terna de procedencia completa e íntegra (Etapa 6 L0-003)",
        detalle: { shaServidor, shaVersion, shaAprobado, volcadoId, versionPedida },
        volcadoId,
        version: versionPedida,
        sha256: shaServidor,
        correlacionId: volcadoId,
      });
      return NextResponse.json(
        {
          error: "integridad rota: sha256 de la version no coincide",
        },
        {
          status: 409,
        }
      );
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
      },
    };

    const kernelUrl = (
      process.env.KHORA_API_URL ||
      "http://127.0.0.1:8000"
    ).replace(/\/+$/, "");

    const khoraKey =
      process.env.X_KHORA_KEY;

    if (!khoraKey) {
      return NextResponse.json(
        {
          error:
            "Configuracion invalida: falta X_KHORA_KEY",
        },
        {
          status: 500,
        }
      );
    }

    const abortController =
      new AbortController();

    const timeout = setTimeout(() => {
      abortController.abort();
    }, 60000);

    try {
      const apiResponse = await fetch(
        `${kernelUrl}/api/v1/ingesta`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KHORA-KEY": khoraKey,
          },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        }
      );

      clearTimeout(timeout);

      let data: KernelResponse;

      try {
        data =
          (await apiResponse.json()) as KernelResponse;
      } catch {
        data = {
          error:
            "Kernel returned a non-JSON response",
        };
      }

      if (apiResponse.ok) {
        const ioId =
          typeof data.io_id === "string"
            ? data.io_id
            : null;

        await db.query(
          `
            UPDATE volcado
            SET
              estado = 'ingerido',
              io_id = $1,
              ultimo_intento = now(),
              intentos = COALESCE(intentos, 0) + 1,
              ultimo_error = NULL
            WHERE id = $2
          `,
          [
            ioId,
            volcadoId,
          ]
        );

        await db.query(
          `
            INSERT INTO volcado_revision_auditoria
            (
              id,
              volcado_id,
              accion,
              estado_anterior,
              estado_nuevo,
              version,
              sha256,
              usuario
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8
            )
          `,
          [
            randomUUID(),
            volcadoId,
            "ingestado",
            volcado.estado,
            "ingerido",
            versionPedida,
            shaServidor,
            session.user.email,
          ]
        );

        await registrarEvento({
          fase: "ingesta",
          eventId: "ING-001",
          estado: "OK",
          mensaje: `Ingesta ejecutada con éxito en Kernel Python (io_id: ${ioId})`,
          detalle: { ioId, volcadoId, version: versionPedida },
          volcadoId,
          version: versionPedida,
          sha256: shaServidor,
          correlacionId: volcadoId,
        });

        return NextResponse.json(
          data,
          {
            status: apiResponse.status,
          }
        );
      }

      const errorMsg =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : `Kernel returned HTTP ${apiResponse.status}`;

      const nuevoEstado = "fallido";

      try {
        await db.query(
          `
            UPDATE volcado
            SET
              estado = $3,
              ultimo_intento = now(),
              intentos = COALESCE(intentos, 0) + 1,
              ultimo_error = $2
            WHERE id = $1
          `,
          [
            volcadoId,
            errorMsg,
            nuevoEstado,
          ]
        );

        await db.query(
          `
            INSERT INTO volcado_revision_auditoria
            (
              id,
              volcado_id,
              accion,
              estado_anterior,
              estado_nuevo,
              version,
              sha256,
              usuario
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8
            )
          `,
          [
            randomUUID(),
            volcadoId,
            "ingesta_fallida",
            volcado.estado,
            nuevoEstado,
            versionPedida,
            shaServidor,
            session.user.email,
          ]
        );
      } catch (dbError) {
        console.error(
          "Error registrando fallo de ingesta en PostgreSQL:",
          dbError
        );
      }

      await registrarEvento({
        fase: "ingesta",
        eventId: "ING-001",
        estado: "FAIL",
        mensaje: `Fallo de ingesta en Kernel Python (HTTP ${apiResponse.status}): ${errorMsg}`,
        detalle: { errorMsg, status: apiResponse.status, volcadoId, version: versionPedida },
        volcadoId,
        version: versionPedida,
        sha256: shaServidor,
        correlacionId: volcadoId,
      });

      return NextResponse.json(
        data,
        {
          status: apiResponse.status,
        }
      );
    } catch (fetchError: unknown) {
      clearTimeout(timeout);

      const isAbortError =
        fetchError instanceof Error &&
        fetchError.name === "AbortError";

      const errMsg = isAbortError
        ? "Request to kernel timed out"
        : fetchError instanceof Error
          ? fetchError.message
          : "Kernel request failed";

      const nuevoEstado = "fallido";

      try {
        await db.query(
          `
            UPDATE volcado
            SET
              estado = $3,
              ultimo_intento = now(),
              intentos = COALESCE(intentos, 0) + 1,
              ultimo_error = $2
            WHERE id = $1
          `,
          [
            volcadoId,
            errMsg,
            nuevoEstado,
          ]
        );

        await db.query(
          `
            INSERT INTO volcado_revision_auditoria
            (
              id,
              volcado_id,
              accion,
              estado_anterior,
              estado_nuevo,
              version,
              sha256,
              usuario
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8
            )
          `,
          [
            randomUUID(),
            volcadoId,
            "ingesta_fallida",
            volcado.estado,
            nuevoEstado,
            versionPedida,
            shaServidor,
            session.user.email,
          ]
        );
      } catch (dbError) {
        console.error(
          "Error registrando fallo de ingesta en PostgreSQL:",
          dbError
        );
      }

      await registrarEvento({
        fase: "ingesta",
        eventId: "ING-001",
        estado: "FAIL",
        mensaje: `Error de transporte/timeout al invocar ingesta en Kernel Python: ${errMsg}`,
        detalle: { errMsg, isAbortError, volcadoId, version: versionPedida },
        volcadoId,
        version: versionPedida,
        sha256: shaServidor,
        correlacionId: volcadoId,
      });

      if (isAbortError) {
        return NextResponse.json(
          {
            error:
              "Request to kernel timed out",
          },
          {
            status: 504,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Kernel request failed",
          details: errMsg,
        },
        {
          status: 502,
        }
      );
    }
  } catch (err: unknown) {
    console.error(
      "Error en endpoint de ingesta:",
      err
    );

    const details =
      err instanceof Error
        ? err.message
        : String(err);

    return NextResponse.json(
      {
        error: "Bad Request",
        details,
      },
      {
        status: 400,
      }
    );
  }
}
