// @l0 L0-003 · @req GRAFO/TABLAS
import { getDb } from "./neon";

const DDL = [
  `CREATE TABLE IF NOT EXISTS nodos (
    id UUID PRIMARY KEY,
    summary TEXT NOT NULL DEFAULT 'Sin resumen',
    community INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    centrality NUMERIC NOT NULL DEFAULT 1.0,
    origen TEXT NOT NULL DEFAULT 'Desconocido',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    verificacion TEXT NOT NULL DEFAULT 'Pendiente',
    tipo TEXT,
    volcado_id UUID,
    version INTEGER,
    sha256 CHAR(64),
    posicion_inicio INTEGER,
    posicion_fin INTEGER,
    sello_version_pipeline TEXT,
    marca_temporal_hecho TIMESTAMPTZ,
    marca_captura TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS nodos_volcado_id_idx ON nodos (volcado_id)`,
  `CREATE INDEX IF NOT EXISTS nodos_tipo_idx ON nodos (tipo)`,
  `CREATE TABLE IF NOT EXISTS aristas (
    id UUID PRIMARY KEY,
    source UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
    target UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    weight NUMERIC NOT NULL DEFAULT 1.0,
    origen TEXT NOT NULL DEFAULT 'Desconocido',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    verificacion TEXT NOT NULL DEFAULT 'Pendiente',
    volcado_id UUID,
    version INTEGER,
    sha256 CHAR(64),
    posicion_inicio INTEGER,
    posicion_fin INTEGER,
    sello_version_pipeline TEXT,
    marca_temporal_hecho TIMESTAMPTZ,
    marca_captura TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS aristas_volcado_id_idx ON aristas (volcado_id)`
];

let listo = false;

export async function asegurarGrafoEsquema(): Promise<void> {
  if (listo) return;
  const db = getDb();
  for (const sql of DDL) {
    await db.query(sql);
  }
  listo = true;
}

export interface NodoPG {
  id: string;
  summary: string;
  community: number;
  level: number;
  centrality: number;
  origen: string;
  timestamp: string;
  verificacion: string;
  tipo: string | null;
  volcado_id: string | null;
  version: number | null;
  sha256: string | null;
  posicion_inicio: number | null;
  posicion_fin: number | null;
  sello_version_pipeline: string | null;
  marca_temporal_hecho: string | null;
  marca_captura: string;
}

export interface AristaPG {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  origen: string;
  timestamp: string;
  verificacion: string;
  volcado_id: string | null;
  version: number | null;
  sha256: string | null;
  posicion_inicio: number | null;
  posicion_fin: number | null;
  sello_version_pipeline: string | null;
  marca_temporal_hecho: string | null;
  marca_captura: string;
}

export async function obtenerNodos(): Promise<NodoPG[]> {
  await asegurarGrafoEsquema();
  const db = getDb();
  const res = await db.query(`
    SELECT
      id,
      summary,
      community,
      level,
      coalesce(centrality, 1.0)::float AS centrality,
      origen,
      timestamp,
      verificacion,
      tipo,
      volcado_id,
      version,
      sha256,
      posicion_inicio,
      posicion_fin,
      sello_version_pipeline,
      marca_temporal_hecho,
      marca_captura
    FROM nodos
  `);
  return res.rows.map((row: any) => ({
    ...row,
    id: String(row.id),
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    marca_temporal_hecho: row.marca_temporal_hecho ? new Date(row.marca_temporal_hecho).toISOString() : null,
    marca_captura: row.marca_captura ? new Date(row.marca_captura).toISOString() : new Date().toISOString()
  }));
}

export async function obtenerAristas(): Promise<AristaPG[]> {
  await asegurarGrafoEsquema();
  const db = getDb();
  const res = await db.query(`
    SELECT
      id,
      source,
      target,
      type,
      coalesce(weight, 1.0)::float AS weight,
      origen,
      timestamp,
      verificacion,
      volcado_id,
      version,
      sha256,
      posicion_inicio,
      posicion_fin,
      sello_version_pipeline,
      marca_temporal_hecho,
      marca_captura
    FROM aristas
  `);
  return res.rows.map((row: any) => ({
    ...row,
    id: String(row.id),
    source: String(row.source),
    target: String(row.target),
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    marca_temporal_hecho: row.marca_temporal_hecho ? new Date(row.marca_temporal_hecho).toISOString() : null,
    marca_captura: row.marca_captura ? new Date(row.marca_captura).toISOString() : new Date().toISOString()
  }));
}
