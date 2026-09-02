// @l0 L0-003 · @req GRAFO/TABLAS · @req SISTEMA-MENU/E4
import { getDb } from "./neon";
import neo4j from "neo4j-driver";
import { registrarEvento } from "./eventos";

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
  try {
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
  } catch (err) {
    await registrarEvento({
      fase: "grafo",
      eventId: "GRA-001",
      estado: "FAIL",
      mensaje: `Fallo al leer nodos de la proyección Postgres: ${String(err)}`,
      detalle: { error: String(err) },
    });
    throw err;
  }
}

export interface VerificacionCircuitoResult {
  exists: boolean;
  node_count: number;
  relation_count: number;
  details: {
    io_id: string;
    volcado_id: string | null;
    version: number | null;
    sha256: string | null;
  } | null;
}

export async function verificarCircuitoCompletoNeo4j(ioId: string): Promise<VerificacionCircuitoResult> {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    await registrarEvento({
      fase: "grafo",
      eventId: "GRA-002",
      estado: "SKIP",
      mensaje: `Verificación Neo4j omitida por falta de variables de entorno`,
      detalle: { ioId },
    });
    throw new Error("Missing Neo4j environment variables for verification");
  }

  const driverInstance = neo4j.driver(uri, neo4j.auth.basic(user, password));
  try {
    const session = driverInstance.session();
    try {
      const ioRes = await session.run(
        `MATCH (io:InformationObject {io_id: $ioId})
         RETURN io.volcado_id AS volcado_id, io.version AS version, io.sha256 AS sha256
         LIMIT 1`,
        { ioId }
      );

      if (ioRes.records.length === 0) {
        await registrarEvento({
          fase: "grafo",
          eventId: "GRA-002",
          estado: "FAIL",
          mensaje: `InformationObject con io_id ${ioId} NO existe en Neo4j`,
          detalle: { ioId },
        });
        return {
          exists: false,
          node_count: 0,
          relation_count: 0,
          details: null
        };
      }

      const rec = ioRes.records[0];
      const volcado_id = rec.get("volcado_id") || null;
      const versionRaw = rec.get("version");
      const version = versionRaw !== null && versionRaw !== undefined
        ? (typeof versionRaw === "object" && "toNumber" in versionRaw ? (versionRaw as any).toNumber() : Number(versionRaw))
        : null;
      const sha256 = rec.get("sha256") || null;

      const nodesRes = await session.run(
        `MATCH (:InformationObject {io_id: $ioId})-[m:MENTIONS {io_id: $ioId}]->(e:Entity)
         RETURN count(e) AS node_count`,
        { ioId }
      );
      const node_count = Number(nodesRes.records[0].get("node_count") || 0);

      const relsRes = await session.run(
        `MATCH ()-[r:RELATION {io_id: $ioId}]->()
         RETURN count(r) AS relation_count`,
        { ioId }
      );
      const relation_count = Number(relsRes.records[0].get("relation_count") || 0);

      await registrarEvento({
        fase: "grafo",
        eventId: "GRA-002",
        estado: "OK",
        mensaje: `Verificación en Neo4j exitosa para io_id ${ioId}: ${node_count} nodos, ${relation_count} relaciones`,
        detalle: { ioId, node_count, relation_count, volcado_id, version, sha256 },
        volcadoId: volcado_id,
        version,
        sha256,
        correlacionId: volcado_id || undefined,
      });

      return {
        exists: true,
        node_count,
        relation_count,
        details: {
          io_id: ioId,
          volcado_id,
          version,
          sha256
        }
      };
    } finally {
      await session.close();
    }
  } catch (err) {
    await registrarEvento({
      fase: "grafo",
      eventId: "GRA-002",
      estado: "FAIL",
      mensaje: `Fallo durante la verificación en Neo4j para io_id ${ioId}: ${String(err)}`,
      detalle: { ioId, error: String(err) },
    });
    throw err;
  } finally {
    await driverInstance.close();
  }
}

export async function obtenerAristas(): Promise<AristaPG[]> {
  try {
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
  } catch (err) {
    await registrarEvento({
      fase: "grafo",
      eventId: "GRA-001",
      estado: "FAIL",
      mensaje: `Fallo al leer aristas de la proyección Postgres: ${String(err)}`,
      detalle: { error: String(err) },
    });
    throw err;
  }
}
