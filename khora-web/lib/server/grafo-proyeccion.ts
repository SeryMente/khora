import neo4j from "neo4j-driver";
import { Neo4jInalcanzableError, Neo4jNoConfiguradoError } from "./grafo";
import { ejecutarConFallbackNeo4j } from "./neo4j-conexion";

const MAX_LIMIT = 2000;
const DEFAULT_LIMIT = 500;

type Filtros = { ioId?: string | null; volcadoId?: string | null; limit?: number };
type Registro = { get: (key: string) => unknown };
type Seccion<T> = { rows: T[]; truncated: boolean };

export interface InformationObjectGrafo {
  id: string;
  volcadoId: string | null;
  version: number | null;
  sha256: string | null;
  timestamp: string;
}

export interface MencionGrafo {
  id: string;
  source: string;
  target: string;
  type: "MENTIONS";
}

export interface ProyeccionGrafo {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  informationObjects: InformationObjectGrafo[];
  mentions: MencionGrafo[];
  limit: number;
  truncated: boolean;
  truncation: { limit: boolean; informationObjects: boolean; nodes: boolean; mentions: boolean; edges: boolean };
}

function str(value: unknown, fallback = ""): string {
  return value === null || value === undefined ? fallback : String(value);
}

function num(value: unknown, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value && typeof value.toNumber === "function") return value.toNumber();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function limitada<T>(session: { run: (query: string, params: Record<string, unknown>) => Promise<{ records: T[] }> }, query: string, params: Record<string, unknown>, limit: number): Promise<Seccion<T>> {
  const result = await session.run(query, { ...params, fetchLimit: neo4j.int(limit + 1) });
  return { rows: result.records.slice(0, limit), truncated: result.records.length > limit };
}

function esIndisponibilidad(error: any): boolean {
  const code = String(error?.code ?? "");
  const name = String(error?.name ?? "");
  return code.startsWith("Neo.TransientError.") || [
    "ServiceUnavailable", "SessionExpired", "ConnectionAcquisitionTimeout", "Neo.ClientError.Security.Unauthorized",
    "Neo.ClientError.Security.AuthenticationRateLimit", "Neo.ClientError.Security.CredentialsExpired",
  ].includes(code) || ["ServiceUnavailable", "SessionExpired", "ConnectionAcquisitionTimeout"].includes(name);
}

export async function obtenerProyeccionGrafo(filtros: Filtros = {}): Promise<ProyeccionGrafo> {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) throw new Neo4jNoConfiguradoError();

  const solicitados = Number.isSafeInteger(filtros.limit) && Number(filtros.limit) > 0 ? Number(filtros.limit) : DEFAULT_LIMIT;
  const limit = Math.min(solicitados, MAX_LIMIT);
  const ioId = filtros.ioId?.trim() || null;
  const volcadoId = filtros.volcadoId?.trim() || null;
  try {
    return await ejecutarConFallbackNeo4j(uri, user, password, async (driver) => {
      const session = driver.session();
    try {
      const ioQuery = `
        MATCH (io:InformationObject)
        WHERE ($ioId IS NULL OR toString(io.io_id) = $ioId)
          AND ($volcadoId IS NULL OR toString(io.volcado_id) = $volcadoId)
        RETURN DISTINCT toString(io.io_id) AS id, toString(io.volcado_id) AS volcadoId,
          io.version AS version, io.sha256 AS sha256,
          coalesce(toString(io.created_at), toString(io.valid_at), datetime().toString()) AS timestamp
        ORDER BY id ASC LIMIT $fetchLimit`;
      const ioResult = await limitada<Registro>(session, ioQuery, { ioId, volcadoId }, limit);
      const informationObjects: InformationObjectGrafo[] = ioResult.rows
        .map((row) => ({
          id: str(row.get("id")),
          volcadoId: row.get("volcadoId") == null ? null : str(row.get("volcadoId")),
          version: row.get("version") == null ? null : num(row.get("version"), 0),
          sha256: row.get("sha256") == null ? null : str(row.get("sha256")),
          timestamp: str(row.get("timestamp")),
        }))
        .filter((io) => io.id.length > 0);
      const ioIds = informationObjects.map((io) => io.id);

      const entityQuery = ioId || volcadoId
        ? `MATCH (io:InformationObject)-[:MENTIONS]->(e:Entity)
           WHERE toString(io.io_id) IN $ioIds AND e.canonical_key IS NOT NULL
           RETURN DISTINCT e.canonical_key AS id,
             coalesce(e.label_original, e.canonical_key, 'Sin resumen') AS summary,
             coalesce(e.community, 0) AS community, coalesce(e.level, 0) AS level,
             coalesce(e.centrality, 1.0) AS centrality,
             coalesce(e.provenance[0], 'Neo4j Aura') AS origen,
             coalesce(toString(e.created_at), toString(e.valid_at), datetime().toString()) AS timestamp,
             CASE WHEN e.needs_review = true THEN 'Pendiente' ELSE 'Verificado' END AS verificacion
           ORDER BY id ASC LIMIT $fetchLimit`
        : `MATCH (e:Entity) WHERE e.canonical_key IS NOT NULL
           RETURN DISTINCT e.canonical_key AS id,
             coalesce(e.label_original, e.canonical_key, 'Sin resumen') AS summary,
             coalesce(e.community, 0) AS community, coalesce(e.level, 0) AS level,
             coalesce(e.centrality, 1.0) AS centrality,
             coalesce(e.provenance[0], 'Neo4j Aura') AS origen,
             coalesce(toString(e.created_at), toString(e.valid_at), datetime().toString()) AS timestamp,
             CASE WHEN e.needs_review = true THEN 'Pendiente' ELSE 'Verificado' END AS verificacion
           ORDER BY id ASC LIMIT $fetchLimit`;
      const nodeResult = await limitada<Registro>(session, entityQuery, { ioIds }, limit);
      const nodes = nodeResult.rows.map((row) => ({
        id: str(row.get("id")), summary: str(row.get("summary"), "Sin resumen"),
        community: num(row.get("community"), 0), level: num(row.get("level"), 0),
        centrality: num(row.get("centrality"), 1), origen: str(row.get("origen"), "Neo4j Aura"),
        timestamp: str(row.get("timestamp")), verificacion: str(row.get("verificacion"), "Verificado"),
      })).filter((node) => node.id.length > 0);
      const nodeIds = nodes.map((node) => node.id);

      const mentionQuery = `
        UNWIND $ioIds AS ioId
        MATCH (io:InformationObject)-[m:MENTIONS]->(e:Entity)
        WHERE toString(io.io_id) = ioId AND e.canonical_key IN $nodeIds
        RETURN DISTINCT coalesce(toString(m.id), ioId + '->' + e.canonical_key + ':MENTIONS') AS id,
          ioId AS source, e.canonical_key AS target, 'MENTIONS' AS type
        ORDER BY id ASC LIMIT $fetchLimit`;
      const mentionResult = ioIds.length && nodeIds.length
        ? await limitada<Registro>(session, mentionQuery, { ioIds, nodeIds }, limit)
        : { rows: [] as Registro[], truncated: false };
      const ioIdSet = new Set(ioIds);
      const nodeIdSet = new Set(nodeIds);
      const mentions: MencionGrafo[] = mentionResult.rows.map((row) => ({
        id: str(row.get("id")), source: str(row.get("source")), target: str(row.get("target")), type: "MENTIONS" as const,
      })).filter((edge) => ioIdSet.has(edge.source) && nodeIdSet.has(edge.target));

      const edgeQuery = ioId || volcadoId
        ? `MATCH (io:InformationObject)-[:MENTIONS]->(e1:Entity)-[r:RELATION]->(e2:Entity)<-[:MENTIONS]-(io)
           WHERE toString(io.io_id) IN $ioIds AND e1.canonical_key IN $nodeIds AND e2.canonical_key IN $nodeIds
           RETURN DISTINCT coalesce(toString(r.id), e1.canonical_key + '->' + e2.canonical_key + ':' + coalesce(r.type, 'RELATION')) AS id,
             e1.canonical_key AS source, e2.canonical_key AS target, coalesce(r.type, 'RELATION') AS type,
             coalesce(r.weight, 1.0) AS weight, coalesce(r.provenance[0], 'Neo4j Aura') AS origen,
             coalesce(toString(r.created_at), toString(r.valid_at), datetime().toString()) AS timestamp,
             'Verificado' AS verificacion
           ORDER BY id ASC LIMIT $fetchLimit`
        : `MATCH (e1:Entity)-[r:RELATION]->(e2:Entity)
           WHERE e1.canonical_key IN $nodeIds AND e2.canonical_key IN $nodeIds
           RETURN DISTINCT coalesce(toString(r.id), e1.canonical_key + '->' + e2.canonical_key + ':' + coalesce(r.type, 'RELATION')) AS id,
             e1.canonical_key AS source, e2.canonical_key AS target, coalesce(r.type, 'RELATION') AS type,
             coalesce(r.weight, 1.0) AS weight, coalesce(r.provenance[0], 'Neo4j Aura') AS origen,
             coalesce(toString(r.created_at), toString(r.valid_at), datetime().toString()) AS timestamp,
             'Verificado' AS verificacion
           ORDER BY id ASC LIMIT $fetchLimit`;
      const edgeResult = nodeIds.length
        ? await limitada<Registro>(session, edgeQuery, { ioIds, nodeIds }, limit)
        : { rows: [] as Registro[], truncated: false };
      const edges = edgeResult.rows.map((row) => ({
        id: str(row.get("id")), source: str(row.get("source")), target: str(row.get("target")),
        type: str(row.get("type"), "RELATION"), weight: num(row.get("weight"), 1),
        origen: str(row.get("origen"), "Neo4j Aura"), timestamp: str(row.get("timestamp")),
        verificacion: str(row.get("verificacion"), "Verificado"),
      })).filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target));

      const truncation = {
        limit: solicitados > MAX_LIMIT,
        informationObjects: ioResult.truncated,
        nodes: nodeResult.truncated,
        mentions: mentionResult.truncated,
        edges: edgeResult.truncated,
      };
      return {
        nodes, edges, informationObjects, mentions, limit, truncation,
        truncated: Object.values(truncation).some(Boolean),
      };
      } finally {
        await session.close();
      }
    });
  } catch (error) {
    if (error instanceof Neo4jNoConfiguradoError || error instanceof Neo4jInalcanzableError) throw error;
    if (esIndisponibilidad(error)) throw new Neo4jInalcanzableError(`Neo4j no está disponible: ${String((error as any)?.message ?? error)}`);
    throw error;
  }
}
