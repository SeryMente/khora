// @l0 L0-002 · @req HARNESS-01/REQ-1 · Script de "Primer Vínculo Harness"
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { v5 as uuidv5 } from "uuid";

import { getDb } from "../lib/server/neon";
import { descifrarTexto } from "../lib/server/cripto";
import { sha256de, listarVersiones } from "../lib/server/correcciones";
import { registrarEvento } from "../lib/server/eventos";
import { verificarCircuitoCompletoNeo4j } from "../lib/server/grafo";

const UUID_NAMESPACE_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

export function calcularIoId(volcadoId: string, version: number): string {
  return uuidv5(`khora:volcado:${volcadoId}:v${version}`, UUID_NAMESPACE_URL);
}

function extraerMensajeError(data: Record<string, any>, status: number): string {
  if (typeof data.error === "string") return data.error;
  if (typeof data.detail === "string") return data.detail;
  if (data.detail && typeof data.detail === "object") {
    if (typeof data.detail.error === "string" && typeof data.detail.causa === "string") {
      return `${data.detail.error}: ${data.detail.causa}`;
    }
    if (typeof data.detail.error === "string") return data.detail.error;
    if (typeof data.detail.causa === "string") return data.detail.causa;
  }
  return `El Kernel retornó HTTP ${status}`;
}

function cargarEntorno() {
  const cargarArchivo = (ruta: string) => {
    if (!fs.existsSync(ruta)) return;
    const contenido = fs.readFileSync(ruta, "utf-8");
    for (const linea of contenido.split("\n")) {
      const trimmed = linea.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  };

  cargarArchivo(path.join(process.cwd(), ".env.local"));
  cargarArchivo(path.join(process.cwd(), ".env"));
  cargarArchivo(path.join(process.cwd(), "../.env"));
}

cargarEntorno();

export type VerificadorNeo4j = typeof verificarCircuitoCompletoNeo4j;

export interface OpcionesPrimerVinculo {
  volcadoId: string;
  dryRun?: boolean;
  verificarNeo4j?: VerificadorNeo4j;
}

export interface ReportePrimerVinculo {
  ok: boolean;
  volcado_id?: string;
  version?: number;
  sha256?: string;
  io_id?: string | null;
  metodo_ingesta?: string;
  estado_volcado?: string;
  idempotent?: boolean;
  dry_run?: boolean;
  kernel_salud?: { ok: boolean; neo4j: boolean; [key: string]: unknown } | null;
  verificacion_neo4j?: {
    ok: boolean;
    node_count: number;
    relation_count: number;
  } | null;
  needs_review_count?: number;
  ratificacion?: string | null;
  timestamp: string;
  error?: string;
  details?: unknown;
}

export async function ejecutarPrimerVinculo(opciones: OpcionesPrimerVinculo): Promise<ReportePrimerVinculo> {
  const { volcadoId, dryRun = false, verificarNeo4j = verificarCircuitoCompletoNeo4j } = opciones;
  const ts = new Date().toISOString();

  if (!volcadoId || typeof volcadoId !== "string" || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(volcadoId.trim())) {
    return {
      ok: false,
      timestamp: ts,
      error: "Se requiere un --volcado-id válido (UUID canónico).",
    };
  }

  const uuidNormalizado = volcadoId.trim();
  const db = getDb();

  const vRes = await db.query(
    `
      SELECT
        id,
        estado,
        version_aprobada,
        sha256_aprobado,
        io_id
      FROM volcado
      WHERE id = $1
    `,
    [uuidNormalizado]
  );

  if (vRes.rows.length === 0) {
    return {
      ok: false,
      volcado_id: uuidNormalizado,
      timestamp: ts,
      error: "volcado no encontrado en PostgreSQL",
    };
  }

  const volcado = vRes.rows[0];

  // Caso 1: Idempotencia - el volcado ya está ingerido o ya tiene io_id
  if (volcado.estado === "ingerido" || volcado.io_id) {
    if (volcado.version_aprobada === null || volcado.version_aprobada === undefined) {
      return {
        ok: false,
        volcado_id: uuidNormalizado,
        estado_volcado: volcado.estado,
        timestamp: ts,
        error: "El volcado ingerido carece de version_aprobada; no se puede reconstruir su io_id idempotente",
      };
    }
    const ioId = String(volcado.io_id || calcularIoId(uuidNormalizado, Number(volcado.version_aprobada)));
    let verif;
    try {
      verif = await verificarNeo4j(ioId, {
        volcadoId: uuidNormalizado,
        version: Number(volcado.version_aprobada),
        sha256: volcado.sha256_aprobado ? String(volcado.sha256_aprobado) : null,
      });
    } catch (err: any) {
      verif = { exists: false, node_count: 0, relation_count: 0, details: null };
    }
    const ioIdCanonico = typeof verif.details?.io_id === "string" ? verif.details.io_id : ioId;

    return {
      ok: verif.exists,
      volcado_id: uuidNormalizado,
      version: volcado.version_aprobada ? Number(volcado.version_aprobada) : undefined,
      sha256: volcado.sha256_aprobado || undefined,
      io_id: ioIdCanonico,
      metodo_ingesta: "kernel_directo (/api/v1/ingesta)",
      estado_volcado: "ingerido",
      idempotent: true,
      dry_run: dryRun,
      verificacion_neo4j: {
        ok: verif.exists,
        node_count: verif.node_count,
        relation_count: verif.relation_count,
      },
      needs_review_count: verif.needs_review_count,
      ratificacion: null,
      timestamp: ts,
    };
  }

  // Caso 2: El volcado no está en estado listo_ingesta
  if (volcado.estado !== "listo_ingesta" && volcado.estado !== "fallido") {
    return {
      ok: false,
      volcado_id: uuidNormalizado,
      estado_volcado: volcado.estado,
      timestamp: ts,
      error: `La ingesta exige que el volcado esté en estado listo_ingesta o fallido recuperable. Estado actual: ${volcado.estado}`,
    };
  }

  // Comprobar versión aprobada y sha256
  if (volcado.version_aprobada === null || volcado.sha256_aprobado === null) {
    return {
      ok: false,
      volcado_id: uuidNormalizado,
      estado_volcado: volcado.estado,
      timestamp: ts,
      error: "El volcado no tiene una versión/sha256 aprobada activa en PostgreSQL",
    };
  }

  const versionAprobada = Number(volcado.version_aprobada);
  const ioIdPostgres = calcularIoId(uuidNormalizado, versionAprobada);

  const versiones = await listarVersiones(uuidNormalizado);
  const filaVersion = (versiones as Array<{ version: number | string; texto: string | null; sha256: string | null }>).find(
    (v) => Number(v.version) === versionAprobada
  );

  if (!filaVersion) {
    return {
      ok: false,
      volcado_id: uuidNormalizado,
      estado_volcado: volcado.estado,
      timestamp: ts,
      error: `Versión aprobada v${versionAprobada} inexistente en volcado_version`,
    };
  }

  const textoClaro = descifrarTexto(String(filaVersion.texto ?? ""));
  if (textoClaro.trim().length === 0) {
    return {
      ok: false,
      volcado_id: uuidNormalizado,
      estado_volcado: volcado.estado,
      timestamp: ts,
      error: "La versión aprobada no contiene texto para ingerir",
    };
  }

  const shaServidor = sha256de(textoClaro).trim().toLowerCase();
  const shaAprobado = String(volcado.sha256_aprobado).trim().toLowerCase();

  if (shaServidor !== shaAprobado) {
    return {
      ok: false,
      volcado_id: uuidNormalizado,
      estado_volcado: volcado.estado,
      timestamp: ts,
      error: `Integridad rota: sha256 calculated (${shaServidor}) no coincide con sha256_aprobado (${shaAprobado})`,
    };
  }

  const kernelUrl = (process.env.KHORA_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const khoraKey = process.env.X_KHORA_KEY || process.env.KHORA_API_KEY;

  if (!khoraKey) {
    return {
      ok: false,
      volcado_id: uuidNormalizado,
      timestamp: ts,
      error: "Configuración inválida: falta X_KHORA_KEY o KHORA_API_KEY en variables de entorno",
    };
  }

  // Caso 3: Dry run
  if (dryRun) {
    let salud: { ok: boolean; neo4j: boolean; [key: string]: unknown } = { ok: false, neo4j: false, error: "Healthcheck no realizado" };
    try {
      const saludRes = await fetch(`${kernelUrl}/health`, {
        headers: { "X-KHORA-KEY": khoraKey },
      });
      if (saludRes.ok) {
        salud = await saludRes.json();
      } else {
        salud = { ok: false, neo4j: false, status: saludRes.status };
      }
    } catch (err: any) {
      salud = { ok: false, neo4j: false, error: String(err?.message ?? err) };
    }

    const saludOk = salud.ok === true && salud.neo4j === true;
    return {
      ok: saludOk,
      volcado_id: uuidNormalizado,
      version: versionAprobada,
      sha256: shaServidor,
      io_id: null,
      metodo_ingesta: "kernel_directo (/api/v1/ingesta)",
      estado_volcado: volcado.estado,
      idempotent: false,
      dry_run: true,
      kernel_salud: salud,
      verificacion_neo4j: null,
      ratificacion: "ratificación automática (bypass temporal, ver 5C-FIX)",
      error: saludOk ? undefined : "Dry-run bloqueado: kernel o Neo4j no están saludables",
      timestamp: ts,
    };
  }

  // Caso 4: Ingesta Real llamando al bridge FastAPI
  const payload = {
    texto: textoClaro,
    archivo_base64: null,
    mime: null,
    provenance: {
      origen: "khora-cli",
      driver: "primer_vinculo",
      timestamp: ts,
      volcado_id: uuidNormalizado,
      version: versionAprobada,
      sha256: shaServidor,
    },
  };

  const controller = new AbortController();
  const timeoutMs = Number.parseInt(process.env.KHORA_INGEST_TIMEOUT_MS ?? "300000", 10);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    throw new Error("KHORA_INGEST_TIMEOUT_MS inválido");
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const apiResponse = await fetch(`${kernelUrl}/api/v1/ingesta`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KHORA-KEY": khoraKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let data: Record<string, any> = {};
    try {
      data = await apiResponse.json();
    } catch {
      data = { error: "El Kernel Python retornó una respuesta que no es JSON" };
    }

    if (apiResponse.ok) {
      const ioId = typeof data.io_id === "string" && data.io_id.trim().length > 0
        ? data.io_id.trim()
        : null;
      const esIdempotente = Boolean(data.idempotent);

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
        [ioIdPostgres, uuidNormalizado]
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
            $1, $2, $3, $4, $5, $6, $7, $8
          )
        `,
        [
          randomUUID(),
          uuidNormalizado,
          "ingestado",
          volcado.estado,
          "ingerido",
          versionAprobada,
          shaServidor,
          "cli:primer_vinculo",
        ]
      );

      await registrarEvento({
        fase: "ingesta",
        eventId: "ING-001",
        estado: "OK",
        mensaje: `Ingesta ejecutada con éxito vía CLI Primer Vínculo (io_id: ${ioId})`,
        detalle: { ioId, volcadoId: uuidNormalizado, version: versionAprobada },
        volcadoId: uuidNormalizado,
        version: versionAprobada,
        sha256: shaServidor,
        correlacionId: uuidNormalizado,
      });

      // Verificación independiente en Neo4j Aura
      let verif;
      try {
        verif = await verificarNeo4j(ioId, {
          volcadoId: uuidNormalizado,
          version: versionAprobada,
          sha256: shaServidor,
        });
      } catch (err: any) {
        verif = { exists: false, node_count: 0, relation_count: 0, details: null };
      }
      const ioIdCanonico = typeof verif.details?.io_id === "string" ? verif.details.io_id : ioId;

      return {
        ok: verif.exists,
        volcado_id: uuidNormalizado,
        version: versionAprobada,
        sha256: shaServidor,
        io_id: ioIdCanonico,
        metodo_ingesta: "kernel_directo (/api/v1/ingesta)",
        estado_volcado: "ingerido",
        idempotent: esIdempotente,
        dry_run: false,
        verificacion_neo4j: {
          ok: verif.exists,
          node_count: verif.node_count,
          relation_count: verif.relation_count,
        },
        needs_review_count: verif.needs_review_count,
        ratificacion: esIdempotente ? null : "ratificación automática (bypass temporal, ver 5C-FIX)",
        timestamp: ts,
      };
    }

    // Manejo de respuesta HTTP no exitosa
    const errorMsg = extraerMensajeError(data, apiResponse.status);

    await db.query(
      `
        UPDATE volcado
        SET
          estado = 'fallido',
          ultimo_intento = now(),
          intentos = COALESCE(intentos, 0) + 1,
          ultimo_error = $2
        WHERE id = $1
      `,
      [uuidNormalizado, errorMsg]
    );

    await db.query(
      `
        INSERT INTO volcado_revision_auditoria
        (
          id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario
        )
        VALUES
        (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
      `,
      [
        randomUUID(),
        uuidNormalizado,
        "ingesta_fallida",
        volcado.estado,
        "fallido",
        versionAprobada,
        shaServidor,
        "cli:primer_vinculo",
      ]
    );

    await registrarEvento({
      fase: "ingesta",
      eventId: "ING-001",
      estado: "FAIL",
      mensaje: `Fallo de ingesta en Kernel Python vía CLI: ${errorMsg}`,
      detalle: { errorMsg, status: apiResponse.status, volcadoId: uuidNormalizado },
      volcadoId: uuidNormalizado,
      version: versionAprobada,
      sha256: shaServidor,
      correlacionId: uuidNormalizado,
    });

    return {
      ok: false,
      volcado_id: uuidNormalizado,
      estado_volcado: "fallido",
      timestamp: ts,
      error: errorMsg,
      details: data,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    const errorMsg = err?.name === "AbortError" ? "Tiempo de espera agotado (timeout) llamando al kernel" : String(err?.message ?? err);

    await db.query(
      `
        UPDATE volcado
        SET
          estado = 'fallido',
          ultimo_intento = now(),
          intentos = COALESCE(intentos, 0) + 1,
          ultimo_error = $2
        WHERE id = $1
      `,
      [uuidNormalizado, errorMsg]
    );

    await db.query(
      `
        INSERT INTO volcado_revision_auditoria
        (
          id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario
        )
        VALUES
        (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
      `,
      [
        randomUUID(),
        uuidNormalizado,
        "ingesta_fallida",
        volcado.estado,
        "fallido",
        versionAprobada,
        shaServidor,
        "cli:primer_vinculo",
      ]
    );

    await registrarEvento({
      fase: "ingesta",
      eventId: "ING-001",
      estado: "FAIL",
      mensaje: `Error de transporte al llamar al Kernel Python vía CLI: ${errorMsg}`,
      detalle: { errorMsg, volcadoId: uuidNormalizado },
      volcadoId: uuidNormalizado,
      version: versionAprobada,
      sha256: shaServidor,
      correlacionId: uuidNormalizado,
    });

    return {
      ok: false,
      volcado_id: uuidNormalizado,
      estado_volcado: "fallido",
      timestamp: ts,
      error: errorMsg,
    };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let volcadoId = "";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--volcado-id" && i + 1 < args.length) {
      volcadoId = args[i + 1];
      i++;
    } else if (args[i].startsWith("--volcado-id=")) {
      volcadoId = args[i].split("=")[1];
    }
  }

  if (!volcadoId) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: "El argumento --volcado-id <UUID> es obligatorio.",
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  ejecutarPrimerVinculo({ volcadoId, dryRun })
    .then((reporte) => {
      console.log(JSON.stringify(reporte, null, 2));
      process.exit(reporte.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: `Error no capturado: ${String(err?.message ?? err)}`,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );
      process.exit(1);
    });
}
