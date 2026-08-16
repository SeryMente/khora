// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
import { createHash, randomUUID } from "crypto";
import { getDb } from "./neon";

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

import { cifrarTexto, descifrarTexto } from "./cripto";

export function hashTexto(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

export async function archivarVolcado(args: { texto: string; titulo?: string | null; origen: string; driver?: string | null; usuario?: string | null }): Promise<Volcado> {
  await asegurarTabla();
  const db = getDb();
  const id = randomUUID();
  const sha = hashTexto(args.texto);
  const sql = "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado, intentos) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0) RETURNING id, folio, texto, sha256, chars, titulo, origen, driver, usuario, recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento";
  const res = await db.query(sql, [id, cifrarTexto(args.texto), sha, args.texto.length, args.titulo ?? null, args.origen, args.driver ?? null, args.usuario ?? null, "archivado"]);
  return res.rows[0] as Volcado;
}

export async function listarVolcados(limite: number = 200): Promise<Volcado[]> {
  await asegurarTabla();
  const db = getDb();
  const sql = "SELECT id, folio, texto, sha256, chars, titulo, origen, driver, usuario, recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento, version_aprobada FROM volcado ORDER BY recibido_en DESC LIMIT $1";
  const res = await db.query(sql, [limite]); res.rows = res.rows.map((f: any) => ({ ...f, texto: descifrarTexto(String(f.texto ?? "")) }));
  return res.rows as Volcado[];
}

export async function marcarPendienteRevision(volcadoId: string): Promise<void> {
  await asegurarTabla();
  const db = getDb();
  await db.query("UPDATE volcado SET estado = 'pendiente_revision' WHERE id = $1", [volcadoId]);
}

export async function iniciarRevision(volcadoId: string): Promise<void> {
  await asegurarTabla();
  const db = getDb();
  await db.query("UPDATE volcado SET estado = 'en_revision' WHERE id = $1", [volcadoId]);
}

export async function aprobarVersion(volcadoId: string, version: number, aprobador?: string | null): Promise<{ version: number; sha256: string }> {
  await asegurarTabla();
  const db = getDb();

  // 1. Validar que el volcado existe y su estado es exactamente 'en_revision'
  const vRes = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  if (vRes.rows.length === 0) {
    throw new Error("Volcado no encontrado");
  }
  const estadoAnteriorReal = String(vRes.rows[0].estado ?? "");
  if (estadoAnteriorReal !== "en_revision") {
    throw new Error(`Solo se puede aprobar un volcado en estado 'en_revision'. Estado actual: '${estadoAnteriorReal}'`);
  }

  // 2. Validar que la versión sea la versión vigente más reciente
  const maxRes = await db.query("SELECT COALESCE(MAX(version), 0)::int AS ultima FROM volcado_version WHERE volcado_id = $1", [volcadoId]);
  const versionVigente = Number(maxRes.rows[0]?.ultima ?? 0);
  if (version !== versionVigente) {
    throw new Error(`La versión a aprobar debe ser la versión vigente más reciente (${versionVigente}). Se solicitó la versión ${version}`);
  }

  // 3. Obtener la versión y validar integridad de SHA256
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

  // 4. Transición de estado: en_revision -> listo_ingesta
  await db.query("UPDATE volcado SET estado = 'listo_ingesta', version_aprobada = $2, sha256_aprobado = $3, aprobado_en = now(), aprobador = $4 WHERE id = $1", [volcadoId, version, sha256, aprobador ?? null]);

  // 5. Registro de auditoría con estado anterior real
  await db.query("INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [randomUUID(), volcadoId, "version_aprobada", estadoAnteriorReal, "listo_ingesta", version, sha256, aprobador ?? null]);

  return { version, sha256 };
}

export async function reabrirRevision(volcadoId: string, usuario?: string | null): Promise<void> {
  await asegurarTabla();
  const db = getDb();
  const vRes = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  const estadoAnteriorReal = vRes.rows.length > 0 ? String(vRes.rows[0].estado ?? "listo_ingesta") : "listo_ingesta";

  await db.query("UPDATE volcado SET estado = 'en_revision', version_aprobada = NULL, sha256_aprobado = NULL, aprobado_en = NULL, aprobador = NULL WHERE id = $1", [volcadoId]);
  await db.query("INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, usuario) VALUES ($1,$2,$3,$4,$5,$6)", [randomUUID(), volcadoId, "revision_reabierta", estadoAnteriorReal, "en_revision", usuario ?? null]);
}

export async function resumenVolcados(): Promise<Array<{ estado: string; n: number; chars: number }>> {
  await asegurarTabla();
  const db = getDb();
  const sql = "SELECT estado, count(*)::int AS n, coalesce(sum(chars),0)::int AS chars FROM volcado GROUP BY estado ORDER BY estado";
  const res = await db.query(sql);
  return res.rows as Array<{ estado: string; n: number; chars: number }>;
}
