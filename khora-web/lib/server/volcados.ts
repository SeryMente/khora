// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
import { createHash, randomUUID } from "crypto";
import { getDb } from "./neon";

export type EstadoVolcado = "archivado" | "ingerido" | "fallido";

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
  const sql = "SELECT id, folio, texto, sha256, chars, titulo, origen, driver, usuario, recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento FROM volcado ORDER BY recibido_en DESC LIMIT $1";
  const res = await db.query(sql, [limite]); res.rows = res.rows.map((f: any) => ({ ...f, texto: descifrarTexto(String(f.texto ?? "")) }));
  return res.rows as Volcado[];
}

export async function resumenVolcados(): Promise<Array<{ estado: string; n: number; chars: number }>> {
  await asegurarTabla();
  const db = getDb();
  const sql = "SELECT estado, count(*)::int AS n, coalesce(sum(chars),0)::int AS chars FROM volcado GROUP BY estado ORDER BY estado";
  const res = await db.query(sql);
  return res.rows as Array<{ estado: string; n: number; chars: number }>;
}
