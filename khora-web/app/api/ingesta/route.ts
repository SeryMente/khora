// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,REQ-3,PIPELINE/REQ-3
// @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
//
// Endpoint de ingesta versionada.
//
// Flujo:
// 1. Autenticación.
// 2. Validación de volcado_id + version.
// 3. Validación de estado listo_ingesta.
// 4. Validación de versión aprobada.
// 5. Recuperación de la versión persistida.
// 6. Validación SHA-256 de la versión.
// 7. Validación SHA-256 contra la versión aprobada.
// 8. Envío al kernel.
// 9. Actualización operacional de volcado.
// 10. Registro de auditoría.
// 11. Manejo de errores HTTP, red y timeout.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { auth } from "../../../auth";
import { getDb } from "../../../lib/server/neon";
import {
  listarVersiones,
  sha256de,
} from "../../../lib/server/correcciones";

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

  // ------------------------------------------------------------
  // 1. AUTENTICACIÓN
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // Variables de trabajo
  // ------------------------------------------------------------

  let texto: string | null = null;
  let archivo_base64: string | null = null;
  let mime: string | null = null;

  try {
    // ----------------------------------------------------------
    // 2. LECTURA DEL FORM DATA
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 3. LECTURA DE PROCEDENCIA
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 4. CARRIL DE ARCHIVO
    //
    // Actualmente la ingesta versionada se realiza únicamente
    // mediante la versión textual persistida.
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 5. CARRIL TEXTUAL DIRECTO
    //
    // El texto recibido no sustituye a la versión persistida.
    // La fuente de verdad para esta ruta es listarVersiones().
    // ----------------------------------------------------------

    if (textInput !== null && textInput.trim().length > 0) {
      texto = textInput;
    }

    // ----------------------------------------------------------
    // 6. VALIDACIÓN DE VERSIÓN
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 7. CONEXIÓN A BASE DE DATOS
    // ----------------------------------------------------------

    const db = getDb();

    // ----------------------------------------------------------
    // 8. OBTENER VOLCADO
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 9. VALIDACIÓN ESTRICTA DE ESTADO
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 10. VALIDACIÓN DE VERSIÓN APROBADA
    // ----------------------------------------------------------

    if (
      volcado.version_aprobada === null ||
      volcado.version_aprobada === undefined ||
      volcado.sha256_aprobado === null ||
      volcado.sha256_aprobado === undefined
    ) {
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

    // ----------------------------------------------------------
    // 11. OBTENER VERSION PERSISTIDA
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 12. LA FUENTE DE VERDAD ES LA VERSION PERSISTIDA
    // ----------------------------------------------------------

    texto = String(fila.texto ?? "");

    archivo_base64 = null;
    mime = null;

    // ----------------------------------------------------------
    // 13. VALIDACIÓN DE CONTENIDO
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 14. VALIDACIÓN SHA-256 DE LA VERSIÓN
    // ----------------------------------------------------------

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

    if (!shaVersion) {
      return NextResponse.json(
        {
          error:
            "La version persistida no tiene SHA256",
        },
        {
          status: 409,
        }
      );
    }

    if (!shaAprobado) {
      return NextResponse.json(
        {
          error:
            "El volcado no tiene SHA256 aprobado",
        },
        {
          status: 409,
        }
      );
    }

    // ----------------------------------------------------------
    // 15. INTEGRIDAD DE LA VERSIÓN
    // ----------------------------------------------------------

    if (shaServidor !== shaVersion) {
      return NextResponse.json(
        {
          error:
            "integridad rota: sha256 de la version no coincide",
        },
        {
          status: 409,
        }
      );
    }

    // ----------------------------------------------------------
    // 16. INTEGRIDAD CONTRA APROBACIÓN
    // ----------------------------------------------------------

    if (shaServidor !== shaAprobado) {
      return NextResponse.json(
        {
          error:
            "integridad rota: el SHA256 de la version no coincide con el SHA256 aprobado",
        },
        {
          status: 409,
        }
      );
    }

    // ----------------------------------------------------------
    // 17. CONSTRUIR PAYLOAD
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 18. CONFIGURACIÓN DEL KERNEL
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // 19. TIMEOUT
    // ----------------------------------------------------------

    const abortController =
      new AbortController();

    const timeout = setTimeout(() => {
      abortController.abort();
    }, 60000);

    try {
      // --------------------------------------------------------
      // 20. LLAMADA AL KERNEL
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // 21. PARSEAR RESPUESTA
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // 22. KERNEL EXITOSO
      // --------------------------------------------------------

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

        // ------------------------------------------------------
        // 23. AUDITORÍA DE ÉXITO
        // ------------------------------------------------------

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

        return NextResponse.json(
          data,
          {
            status: apiResponse.status,
          }
        );
      }

      // --------------------------------------------------------
      // 24. ERROR DEVUELTO POR EL KERNEL
      // --------------------------------------------------------

      const errorMsg =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : `Kernel returned HTTP ${apiResponse.status}`;

      // --------------------------------------------------------
      // 25. ESTADO DE FALLO
      // --------------------------------------------------------

      //
      // En este punto la llamada HTTP sí llegó al kernel,
      // pero el kernel rechazó/procesó con error la solicitud.
      //
      // El volcado estaba en listo_ingesta, por lo que pasa
      // a fallido.
      //
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

        // ------------------------------------------------------
        // 26. AUDITORÍA DEL FALLO DEL KERNEL
        // ------------------------------------------------------

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
        // No ocultar el error original del kernel.
        console.error(
          "Error registrando fallo de ingesta en PostgreSQL:",
          dbError
        );
      }

      // --------------------------------------------------------
      // 27. DEVOLVER ERROR DEL KERNEL
      // --------------------------------------------------------

      return NextResponse.json(
        data,
        {
          status: apiResponse.status,
        }
      );
    } catch (fetchError: unknown) {
      // --------------------------------------------------------
      // 28. LIMPIAR TIMEOUT
      // --------------------------------------------------------

      clearTimeout(timeout);

      // --------------------------------------------------------
      // 29. NORMALIZAR ERROR DE RED/TIMEOUT
      // --------------------------------------------------------

      const isAbortError =
        fetchError instanceof Error &&
        fetchError.name === "AbortError";

      const errMsg = isAbortError
        ? "Request to kernel timed out"
        : fetchError instanceof Error
          ? fetchError.message
          : "Kernel request failed";

      // --------------------------------------------------------
      // 30. ESTADO OPERATIVO DE FALLO
      // --------------------------------------------------------

      //
      // Si hubo timeout/error de red no tenemos confirmación
      // de que el kernel haya procesado la solicitud.
      //
      // Por eso se conserva el estado explícito de fallido.
      //
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

        // ------------------------------------------------------
        // 31. AUDITORÍA DEL ERROR DE TRANSPORTE
        // ------------------------------------------------------

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
        // ------------------------------------------------------
        // 32. ERROR SECUNDARIO DE AUDITORÍA/DB
        // ------------------------------------------------------

        console.error(
          "Error registrando fallo de ingesta en PostgreSQL:",
          dbError
        );
      }

      // --------------------------------------------------------
      // 33. RESPUESTA DE TIMEOUT
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // 34. RESPUESTA DE ERROR DE RED
      // --------------------------------------------------------

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
    // ----------------------------------------------------------
    // 35. ERROR GENERAL DE LA RUTA
    // ----------------------------------------------------------

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