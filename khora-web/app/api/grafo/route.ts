// @l0 L0-002 §2 · @req VIZ-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3,ACR-1.4,ACR-1.5,ACR-2.1
import { NextResponse } from "next/server";
import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const password = process.env.NEO4J_PASSWORD || "password";

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  const session = driver.session();

  try {
    // We are querying Community supernodes. The task asks for Leiden supernodes labeled with their summary.
    // Also we need provenance + verification state.
    const nodesQuery = `
      MATCH (c:Entity)
      RETURN
        elementId(c) AS id,
        coalesce(c.label_original, c.canonical_key) AS summary,
        c.community_id AS community,
        c.level AS level,
        c.centrality AS centrality,
        c.origen AS origen,
        c.timestamp AS timestamp,
        c.verificacion AS verificacion
    `;

    const edgesQuery = `
      MATCH (c1:Entity)-[r:RELATION]->(c2:Entity)
      RETURN
        elementId(r) AS id,
        elementId(c1) AS source,
        elementId(c2) AS target,
        type(r) AS type,
        r.weight AS weight,
        r.origen AS origen,
        r.timestamp AS timestamp,
        r.verificacion AS verificacion
    `;

    const nodesResult = await session.run(nodesQuery);
    const edgesResult = await session.run(edgesQuery);

    const nodes = nodesResult.records.map((record) => {
      return {
        id: record.get("id"),
        summary: record.get("summary") || "Sin resumen",
        community: record.get("community")?.toNumber ? record.get("community").toNumber() : record.get("community"),
        level: record.get("level")?.toNumber ? record.get("level").toNumber() : record.get("level"),
        centrality: record.get("centrality") || 1,
        origen: record.get("origen") || "Desconocido",
        timestamp: record.get("timestamp") || new Date().toISOString(),
        verificacion: record.get("verificacion") || "Pendiente",
      };
    });

    const edges = edgesResult.records.map((record) => {
      return {
        id: record.get("id"),
        source: record.get("source"),
        target: record.get("target"),
        type: record.get("type"),
        weight: record.get("weight") || 1,
        origen: record.get("origen") || "Desconocido",
        timestamp: record.get("timestamp") || new Date().toISOString(),
        verificacion: record.get("verificacion") || "Pendiente",
      };
    });

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("Neo4j query error:", error);
    return NextResponse.json({ error: "Failed to fetch graph data" }, { status: 500 });
  } finally {
    await session.close();
  }
}
