// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2 · @req REVISION-COCKPIT/REQ-1 · @req TITULOS-LLM/REQ-2 · @req SISTEMA-MENU/E4
import { createHash, randomUUID } from "crypto";
import { getDb } from "./neon";
import { reportarIncidente } from "./incidentes";
import { crearVersion } from "./correcciones";
import { cifrarTexto, descifrarTexto } from "./cripto";
import { generarTituloConGarantia, asignarTituloVolcado, esTituloGenericoOInvalido } from "./titulos";
import { autoaplicarTildesSeguras } from "./tildesSeguras";
import { registrarEvento } from "./eventos";

export type EstadoVolcado = "archivado" | "pendiente_revision" | "en_revision" | "listo_ingesta" | "ingerido" | "fallido";

export interface Volcado {
  id: string;
  folio: number;
  texto: string;
  sha256: string;
  chars: number;
  titulo: string | null;
  origen: string;
  driver: string | null;
  usuario: string | null;
  recibido_en: string;
  estado: EstadoVolcado;
  io_id: string | null;
  intentos: number;
  ultimo_error: string | null;
  ultimo_intento: string | null;
  version_aprobada: number | null;
  texto_estructurado?: string | null;
  estructura_ratificada_en?: string | null;
}

const DDL: string[] = [
  "CREATE TABLE IF NOT EXISTS volcado (id UUID PRIMARY KEY, texto TEXT NOT NULL, sha256 CHAR(64) NOT NULL, chars INTEGER NOT NULL, titulo TEXT, origen TEXT NOT NULL, driver TEXT, usuario TEXT, recibido_en TIMESTAMPTZ NOT NULL DEFAULT now(), estado TEXT NOT NULL DEFAULT (%ARCHIVADO%), io_id UUID, intentos INTEGER NOT NULL DEFAULT 0, ultimo_error TEXT, ultimo_intento TIMESTAMPTZ)".replace("(%ARCHIVADO%)", String.fromCharCode(39) + "archivado" + String.fromCharCode(39)),
  "CREATE INDEX IF NOT EXISTS volcado_recibido_idx ON volcado (recibido_en DESC)",
  "CREATE INDEX IF NOT EXISTS volcado_estado_idx ON volcado (estado)",
  "CREATE INDEX IF NOT EXISTS volcado_sha_idx ON volcado (sha256)",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS folio INTEGER",
  "WITH base AS (SELECT COALESCE(max(folio), 0) AS m FROM volcado), ordenados AS (SELECT id, row_number() OVER (ORDER BY recibido_en ASC, id ASC) AS n FROM volcado WHERE folio IS NULL) UPDATE volcado v SET folio = base.m + o.n FROM ordenados o, base WHERE v.id = o.id AND v.folio IS NULL",
  "CREATE SEQUENCE IF NOT EXISTS volcado_folio_seq",
  "SELECT setval('volcado_folio_seq', COALESCE((SELECT max(folio) FROM volcado), 0), true)",
  "ALTER TABLE volcado ALTER COLUMN folio SET DEFAULT nextval('volcado_folio_seq')",
  "ALTER SEQUENCE volcado_folio_seq OWNED BY volcado.folio",
  "CREATE UNIQUE INDEX IF NOT EXISTS volcado_folio_uniq ON volcado (folio)",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS version_aprobada INTEGER",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS sha256_aprobado TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMPTZ",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS aprobador TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS texto_estructurado TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS estructura_ratificada_en TIMESTAMPTZ",
  "CREATE TABLE IF NOT EXISTS volcado_revision_auditoria (id UUID PRIMARY KEY, volcado_id UUID NOT NULL, accion TEXT NOT NULL, estado_anterior TEXT, estado_nuevo TEXT, version INTEGER, sha256 TEXT, usuario TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())",
];

let listo = false;

export async function asegurarTabla(): Promise<void> {
  if (listo) return;
  const db = getDb();
  for (const sentencia of DDL) {
    await db.query(sentencia);
  }
  listo = true;
}

export function hashTexto(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

export async function prepararVolcadoParaRevision(
  volcadoId: string,
  actor?: string | null,
  options?: { onFailure?: "keep_captura" | "mark_fallido" }
): Promise<Volcado> {
  await asegurarTabla();
  const db = getDb();

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const selRes = await client.query("SELECT * FROM volcado WHERE id = $1 FOR UPDATE", [volcadoId]);
    if (selRes.rows.length === 0) {
      throw new Error(`Volcado no encontrado: ${volcadoId}`);
    }

    const v = selRes.rows[0];
    const estadoAnterior = v.estado;

    let textoClaro = descifrarTexto(String(v.texto ?? ""));
    const verRes = await client.query("SELECT version FROM volcado_version WHERE volcado_id = $1 AND version = 1", [volcadoId]);
    const tieneV1 = verRes.rows.length > 0;

    if (v.estado === "ingerido" || v.estado === "listo_ingesta" || (v.estado === "en_revision" && tieneV1)) {
      await client.query("COMMIT");
      return {
        ...v,
        texto: textoClaro,
      } as Volcado;
    }

    if (v.estado !== "en_revision") {
      await client.query("UPDATE volcado SET estado = 'pendiente_revision' WHERE id = $1", [volcadoId]);
      await client.query(
        "INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, usuario) VALUES ($1, $2, $3, $4, $5, $6)",
        [randomUUID(), volcadoId, "transicion_pendiente_revision", estadoAnterior, "pendiente_revision", actor ?? null]
      );
    }

    if (!tieneV1) {
      if (!textoClaro) {
        throw new Error("Transcripción vacía al preparar versión v1");
      }
      await crearVersion(volcadoId, textoClaro, "transcripcion original del dictado");
    }

    if (!textoClaro.trim()) {
      await reportarIncidente({
        volcadoId,
        tipo: "transcripcion_ausente",
        severidad: "alta",
        origen: "detector_preparacion",
        evidencia: { motivo: "El texto transcrito está totalmente vacío." },
      });
    }

    if (!v.titulo || esTituloGenericoOInvalido(v.titulo)) {
      const resGarantia = await generarTituloConGarantia(textoClaro, v.folio);
      await asignarTituloVolcado(volcadoId, resGarantia.title, actor || "prepararVolcadoParaRevision");

      if (resGarantia.nivel === "ultimo_recurso") {
        await reportarIncidente({
          volcadoId,
          tipo: "titulo_ausente",
          severidad: "baja",
          origen: "prepararVolcadoParaRevision",
          evidencia: { motivo: "El generador de títulos cayó a último recurso determinístico." },
        });
      }
    }

    const updRes = await client.query(
      "UPDATE volcado SET estado = 'en_revision' WHERE id = $1 RETURNING id, folio, texto, sha256, chars, titulo, origen, driver, usuario, recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento, version_aprobada",
      [volcadoId]
    );

    const vFinalCheck = updRes.rows[0];
    if (vFinalCheck.sha256 !== v.sha256 || vFinalCheck.texto !== v.texto || Number(vFinalCheck.chars) !== Number(v.chars)) {
      throw new Error(`Barrera de integridad violada en volcado ID ${volcadoId}: sha256/texto/chars alterado antes de COMMIT`);
    }

    await client.query(
      "INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, usuario) VALUES ($1, $2, $3, $4, $5, $6)",
      [randomUUID(), volcadoId, "preparacion_revision_completada", "pendiente_revision", "en_revision", actor ?? null]
    );

    await client.query("COMMIT");

    await registrarEvento({
      fase: "revision",
      eventId: "REV-001",
      estado: "OK",
      mensaje: `Transición de estado del volcado: ${estadoAnterior} -> en_revision`,
      detalle: { estadoAnterior, estadoNuevo: "en_revision", actor },
      volcadoId,
      version: 1,
      sha256: v.sha256,
      correlacionId: volcadoId,
    });

    const volcadoFinal = updRes.rows[0];
    return {
      ...volcadoFinal,
      texto: descifrarTexto(String(volcadoFinal.texto ?? "")),
    } as Volcado;
  } catch (err: any) {
    await client.query("ROLLBACK");

    const mode = options?.onFailure ?? "mark_fallido";

    if (mode === "keep_captura") {
      await db.query(
        "UPDATE volcado SET estado = 'archivado', ultimo_error = $2, ultimo_intento = NOW() WHERE id = $1",
        [volcadoId, String(err?.message ?? err)]
      );

      console.error(
        JSON.stringify({
          evento: "promocion_revision_fallida",
          volcadoId,
          error: String(err?.message ?? err),
          actor: actor ?? null,
          politica: "keep_captura",
        })
      );

      await registrarEvento({
        fase: "revision",
        eventId: "REV-001",
        estado: "FAIL",
        mensaje: `Promoción a revisión fallida (keep_captura): ${String(err?.message ?? err)}`,
        detalle: { error: String(err?.message ?? err), politica: "keep_captura", actor },
        volcadoId,
        correlacionId: volcadoId,
      });

      const rollbackRes = await db.query(
        "SELECT id, folio, texto, sha256, chars, titulo, origen, driver, usuario, recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento, version_aprobada FROM volcado WHERE id = $1",
        [volcadoId]
      );
      if (rollbackRes.rows.length > 0) {
        const vRec = rollbackRes.rows[0];
        return {
          ...vRec,
          texto: descifrarTexto(String(vRec.texto ?? "")),
        } as Volcado;
      } else {
        throw err;
      }
    }

    await db.query(
      "UPDATE volcado SET estado = 'fallido', ultimo_error = $2, ultimo_intento = NOW() WHERE id = $1",
      [volcadoId, String(err?.message ?? err)]
    );

    await reportarIncidente({
      volcadoId,
      tipo: "preparacion_revision_fallida",
      severidad: "alta",
      origen: "prepararVolcadoParaRevision",
      evidencia: { error: String(err?.message ?? err) },
    });

    await db.query(
      "INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, usuario) VALUES ($1, $2, $3, $4, $5, $6)",
      [randomUUID(), volcadoId, "preparacion_revision_fallida", "pendiente_revision", "fallido", actor ?? null]
    );

    await registrarEvento({
      fase: "revision",
      eventId: "REV-001",
      estado: "FAIL",
      mensaje: `Promoción a revisión fallida (mark_fallido): ${String(err?.message ?? err)}`,
      detalle: { error: String(err?.message ?? err), politica: "mark_fallido", actor },
      volcadoId,
      correlacionId: volcadoId,
    });

    throw err;
  } finally {
    client.release();
  }
}

export async function archivarVolcado(args: { texto: string; titulo?: string | null; origen: string; driver?: string | null; usuario?: string | null }): Promise<Volcado> {
  await asegurarTabla();
  const db = getDb();
  const id = randomUUID();
  const sha = hashTexto(args.texto);
  const sql = "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado, intentos) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0) RETURNING id, folio, texto, sha256, chars, titulo, origen, driver, usuario, recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento";
  const res = await db.query(sql, [id, cifrarTexto(args.texto), sha, args.texto.length, args.titulo ?? null, args.origen, args.driver ?? null, args.usuario ?? null, "archivado"]);

  const volcadoArchivado = res.rows[0] as Volcado;

  return await prepararVolcadoParaRevision(volcadoArchivado.id, args.usuario, { onFailure: "keep_captura" });
}

export async function listarVolcados(limite: number = 200): Promise<Volcado[]> {
  await asegurarTabla();
  const db = getDb();
  const sql = "SELECT id, folio, texto, sha256, chars, titulo, origen, driver, usuario, recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento, version_aprobada FROM volcado ORDER BY recibido_en DESC LIMIT $1";
  const res = await db.query(sql, [limite]);
  res.rows = res.rows.map((f: any) => ({ ...f, texto: descifrarTexto(String(f.texto ?? "")) }));
  return res.rows as Volcado[];
}

export async function marcarPendienteRevision(volcadoId: string): Promise<void> {
  await asegurarTabla();
  const db = getDb();
  await db.query("UPDATE volcado SET estado = 'pendiente_revision' WHERE id = $1", [volcadoId]);
  await registrarEvento({
    fase: "revision",
    eventId: "REV-001",
    estado: "OK",
    mensaje: "Volcado marcado como pendiente_revision",
    volcadoId,
    correlacionId: volcadoId,
  });
}

export async function iniciarRevision(volcadoId: string): Promise<void> {
  await prepararVolcadoParaRevision(volcadoId);
}

export async function aprobarVersion(volcadoId: string, version: number, aprobador?: string | null): Promise<{ version: number; sha256: string }> {
  await asegurarTabla();
  const db = getDb();

  const vRes = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  if (vRes.rows.length === 0) {
    throw new Error("Volcado no encontrado");
  }
  const estadoAnteriorReal = String(vRes.rows[0].estado ?? "");
  if (estadoAnteriorReal !== "en_revision") {
    throw new Error(`Solo se puede aprobar un volcado en estado 'en_revision'. Estado actual: '${estadoAnteriorReal}'`);
  }

  const maxRes = await db.query("SELECT COALESCE(MAX(version), 0)::int AS ultima FROM volcado_version WHERE volcado_id = $1", [volcadoId]);
  const versionVigente = Number(maxRes.rows[0]?.ultima ?? 0);
  if (version !== versionVigente) {
    throw new Error(`La versión a aprobar debe ser la versión vigente más reciente (${versionVigente}). Se solicitó la versión ${version}`);
  }

  const res = await db.query("SELECT sha256, texto FROM volcado_version WHERE volcado_id = $1 AND version = $2", [volcadoId, version]);
  if (res.rows.length === 0) {
    throw new Error("La versión solicitada no existe");
  }
  const versionRow = res.rows[0];
  const sha256 = versionRow.sha256;
  const texto = descifrarTexto(versionRow.texto || "");
  const shaCalculado = hashTexto(texto);
  if (shaCalculado !== sha256) {
    throw new Error("Integridad rota: el SHA256 no coincide");
  }

  await db.query("UPDATE volcado SET estado = 'listo_ingesta', version_aprobada = $2, sha256_aprobado = $3, aprobado_en = now(), aprobador = $4 WHERE id = $1", [volcadoId, version, sha256, aprobador ?? null]);

  await db.query("INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [randomUUID(), volcadoId, "version_aprobada", estadoAnteriorReal, "listo_ingesta", version, sha256, aprobador ?? null]);

  await registrarEvento({
    fase: "autorizacion",
    eventId: "AUT-001",
    estado: "OK",
    mensaje: `Versión v${version} ratificada e independizada formalmente para ingesta por el operador`,
    detalle: { version, sha256, aprobador },
    volcadoId,
    version,
    sha256,
    correlacionId: volcadoId,
  });

  return { version, sha256 };
}

export async function reabrirRevision(volcadoId: string, usuario?: string | null): Promise<void> {
  await asegurarTabla();
  const db = getDb();
  const vRes = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  const estadoAnteriorReal = vRes.rows.length > 0 ? String(vRes.rows[0].estado ?? "listo_ingesta") : "listo_ingesta";

  await db.query("UPDATE volcado SET estado = 'en_revision', version_aprobada = NULL, sha256_aprobado = NULL, aprobado_en = NULL, aprobador = NULL WHERE id = $1", [volcadoId]);
  await db.query("INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, usuario) VALUES ($1,$2,$3,$4,$5,$6)", [randomUUID(), volcadoId, "revision_reabierta", estadoAnteriorReal, "en_revision", usuario ?? null]);

  await registrarEvento({
    fase: "revision",
    eventId: "REV-001",
    estado: "OK",
    mensaje: "Revisión reabierta para el volcado",
    detalle: { estadoAnterior: estadoAnteriorReal, estadoNuevo: "en_revision", usuario },
    volcadoId,
    correlacionId: volcadoId,
  });
}

export async function resumenVolcados(): Promise<Array<{ estado: string; n: number; chars: number }>> {
  await asegurarTabla();
  const db = getDb();
  const sql = "SELECT estado, count(*)::int AS n, coalesce(sum(chars),0)::int AS chars FROM volcado GROUP BY estado ORDER BY estado";
  const res = await db.query(sql);
  return res.rows as Array<{ estado: string; n: number; chars: number }>;
}
