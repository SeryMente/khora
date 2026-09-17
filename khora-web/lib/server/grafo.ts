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

export class Neo4jNoConfiguradoError extends Error {
  code = "NEO4J_UNCONFIGURED";
  constructor(message = "Credenciales de Neo4j no configuradas en las variables de entorno (NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)") {
    super(message);
    this.name = "Neo4jNoConfiguradoError";
  }
}

export class Neo4jInalcanzableError extends Error {
  code = "NEO4J_UNREACHABLE";
  constructor(message: string) {
    super(message);
    this.name = "Neo4jInalcanzableError";
  }
}

export interface FiltrosGrafoNeo4j {
  ioId?: string | null;
  volcadoId?: string | null;
  limit?: number;
}

export interface NodoGrafo {
  id: string;
  summary: string;
  community: number;
  level: number;
  centrality: number;
  origen: string;
  timestamp: string;
  verificacion: string;
}

export interface AristaGrafo {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  origen: string;
  timestamp: string;
  verificacion: string;
}

export interface GrafoResultado {
  nodes: NodoGrafo[];
  edges: AristaGrafo[];
}

function parseNeo4jNumber(val: any, fallback: number): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number") return val;
  if (typeof val === "object" && typeof val.toNumber === "function") {
    return val.toNumber();
  }
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
}

export async function obtenerGrafoNeo4j(filtros: FiltrosGrafoNeo4j = {}): Promise<GrafoResultado> {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    await registrarEvento({
      fase: "grafo",
      eventId: "GRA-003",
      estado: "FAIL",
      mensaje: "Falta configuración de variables de entorno para conectar a Neo4j Aura",
      detalle: { missing: { uri: !uri, user: !user, password: !password } },
    });
    throw new Neo4jNoConfiguradoError();
  }

  const limitParam = typeof filtros.limit === "number" && filtros.limit > 0 ? Math.min(filtros.limit, 2000) : 500;
  const ioId = filtros.ioId?.trim() || null;
  const volcadoId = filtros.volcadoId?.trim() || null;

  const driverInstance = neo4j.driver(uri, neo4j.auth.basic(user, password));
  try {
    const session = driverInstance.session();
    try {
      let queryNodes: string;
      let queryEdges: string;
      const params: Record<string, any> = { limit: neo4j.int(limitParam) };

      if (ioId) {
        params.ioId = ioId;
        queryNodes = `
          MATCH (io:InformationObject {io_id: $ioId})-[m:MENTIONS]->(e:Entity)
          RETURN DISTINCT
            e.canonical_key AS id,
            coalesce(e.label_original, e.canonical_key, 'Sin resumen') AS summary,
            coalesce(e.community, 0) AS community,
            coalesce(e.level, 0) AS level,
            coalesce(e.centrality, 1.0) AS centrality,
            coalesce(e.provenance[0], 'Neo4j Aura') AS origen,
            coalesce(toString(e.created_at), toString(e.valid_at), datetime().toString()) AS timestamp,
            CASE WHEN e.needs_review = true THEN 'Pendiente' ELSE 'Verificado' END AS verificacion
          LIMIT $limit
        `;
        queryEdges = `
          MATCH (e1:Entity)-[r:RELATION {io_id: $ioId}]->(e2:Entity)
          RETURN DISTINCT
            coalesce(r.id, e1.canonical_key + '->' + e2.canonical_key + ':' + coalesce(r.type, 'RELATION')) AS id,
            e1.canonical_key AS source,
            e2.canonical_key AS target,
            coalesce(r.type, 'RELATION') AS type,
            coalesce(r.weight, 1.0) AS weight,
            coalesce(r.provenance[0], 'Neo4j Aura') AS origen,
            coalesce(toString(r.created_at), toString(r.valid_at), datetime().toString()) AS timestamp,
            'Verificado' AS verificacion
          LIMIT $limit
        `;
      } else if (volcadoId) {
        params.volcadoId = volcadoId;
        queryNodes = `
          MATCH (io:InformationObject {volcado_id: $volcadoId})-[m:MENTIONS]->(e:Entity)
          RETURN DISTINCT
            e.canonical_key AS id,
            coalesce(e.label_original, e.canonical_key, 'Sin resumen') AS summary,
            coalesce(e.community, 0) AS community,
            coalesce(e.level, 0) AS level,
            coalesce(e.centrality, 1.0) AS centrality,
            coalesce(e.provenance[0], 'Neo4j Aura') AS origen,
            coalesce(toString(e.created_at), toString(e.valid_at), datetime().toString()) AS timestamp,
            CASE WHEN e.needs_review = true THEN 'Pendiente' ELSE 'Verificado' END AS verificacion
          LIMIT $limit
        `;
        queryEdges = `
          MATCH (io:InformationObject {volcado_id: $volcadoId})-[m:MENTIONS]->(e1:Entity)-[r:RELATION]->(e2:Entity)<-[:MENTIONS]-(io)
          RETURN DISTINCT
            coalesce(r.id, e1.canonical_key + '->' + e2.canonical_key + ':' + coalesce(r.type, 'RELATION')) AS id,
            e1.canonical_key AS source,
            e2.canonical_key AS target,
            coalesce(r.type, 'RELATION') AS type,
            coalesce(r.weight, 1.0) AS weight,
            coalesce(r.provenance[0], 'Neo4j Aura') AS origen,
            coalesce(toString(r.created_at), toString(r.valid_at), datetime().toString()) AS timestamp,
            'Verificado' AS verificacion
          LIMIT $limit
        `;
      } else {
        queryNodes = `
          MATCH (e:Entity)
          RETURN DISTINCT
            e.canonical_key AS id,
            coalesce(e.label_original, e.canonical_key, 'Sin resumen') AS summary,
            coalesce(e.community, 0) AS community,
            coalesce(e.level, 0) AS level,
            coalesce(e.centrality, 1.0) AS centrality,
            coalesce(e.provenance[0], 'Neo4j Aura') AS origen,
            coalesce(toString(e.created_at), toString(e.valid_at), datetime().toString()) AS timestamp,
            CASE WHEN e.needs_review = true THEN 'Pendiente' ELSE 'Verificado' END AS verificacion
          LIMIT $limit
        `;
        queryEdges = `
          MATCH (e1:Entity)-[r:RELATION]->(e2:Entity)
          RETURN DISTINCT
            coalesce(r.id, e1.canonical_key + '->' + e2.canonical_key + ':' + coalesce(r.type, 'RELATION')) AS id,
            e1.canonical_key AS source,
            e2.canonical_key AS target,
            coalesce(r.type, 'RELATION') AS type,
            coalesce(r.weight, 1.0) AS weight,
            coalesce(r.provenance[0], 'Neo4j Aura') AS origen,
            coalesce(toString(r.created_at), toString(r.valid_at), datetime().toString()) AS timestamp,
            'Verificado' AS verificacion
          LIMIT $limit
        `;
      }

      const resNodes = await session.run(queryNodes, params);
      const resEdges = await session.run(queryEdges, params);

      const nodes: NodoGrafo[] = resNodes.records.map((rec) => ({
        id: String(rec.get("id") || ""),
        summary: String(rec.get("summary") || "Sin resumen"),
        community: parseNeo4jNumber(rec.get("community"), 0),
        level: parseNeo4jNumber(rec.get("level"), 0),
        centrality: parseNeo4jNumber(rec.get("centrality"), 1.0),
        origen: String(rec.get("origen") || "Neo4j Aura"),
        timestamp: String(rec.get("timestamp") || new Date().toISOString()),
        verificacion: String(rec.get("verificacion") || "Verificado"),
      }));

      const edges: AristaGrafo[] = resEdges.records.map((rec) => ({
        id: String(rec.get("id") || ""),
        source: String(rec.get("source") || ""),
        target: String(rec.get("target") || ""),
        type: String(rec.get("type") || "RELATION"),
        weight: parseNeo4jNumber(rec.get("weight"), 1.0),
        origen: String(rec.get("origen") || "Neo4j Aura"),
        timestamp: String(rec.get("timestamp") || new Date().toISOString()),
        verificacion: String(rec.get("verificacion") || "Verificado"),
      }));

      await registrarEvento({
        fase: "grafo",
        eventId: "GRA-003",
        estado: "OK",
        mensaje: `Consulta de grafo en Neo4j exitosa: ${nodes.length} nodos, ${edges.length} aristas`,
        detalle: { ioId, volcadoId, limit: limitParam, nodeCount: nodes.length, edgeCount: edges.length },
      });

      return { nodes, edges };
    } finally {
      await session.close();
    }
  } catch (err: any) {
    if (err instanceof Neo4jNoConfiguradoError) {
      throw err;
    }
    const mensaje = `Error al consultar grafo en Neo4j: ${err?.message || String(err)}`;
    await registrarEvento({
      fase: "grafo",
      eventId: "GRA-003",
      estado: "FAIL",
      mensaje,
      detalle: { error: String(err) },
    });
    throw new Neo4jInalcanzableError(mensaje);
  } finally {
    await driverInstance.close();
  }
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

/**
 * @deprecated Usar obtenerGrafoNeo4j en su lugar.
 * Esta función consulta Postgres y se conserva únicamente por compatibilidad de código heredado.
 */
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

/**
 * @deprecated Usar obtenerGrafoNeo4j en su lugar.
 * Esta función consulta Postgres y se conserva únicamente por compatibilidad de código heredado.
 */
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
