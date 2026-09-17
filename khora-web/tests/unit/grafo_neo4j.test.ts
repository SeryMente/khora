import { test } from "node:test";
import assert from "node:assert/strict";
import neo4j from "neo4j-driver";
import {
  obtenerGrafoNeo4j,
  Neo4jNoConfiguradoError,
  Neo4jInalcanzableError,
} from "../../lib/server/grafo";
import { GET } from "../../app/api/grafo/route";

test("grafo_neo4j: throws Neo4jNoConfiguradoError when env vars are missing", async () => {
  const origUri = process.env.NEO4J_URI;
  const origUser = process.env.NEO4J_USER;
  const origPass = process.env.NEO4J_PASSWORD;

  try {
    delete process.env.NEO4J_URI;
    delete process.env.NEO4J_USER;
    delete process.env.NEO4J_PASSWORD;

    await assert.rejects(
      async () => {
        await obtenerGrafoNeo4j();
      },
      (err: any) => {
        assert.ok(err instanceof Neo4jNoConfiguradoError);
        assert.equal(err.code, "NEO4J_UNCONFIGURED");
        return true;
      }
    );
  } finally {
    if (origUri) process.env.NEO4J_URI = origUri;
    if (origUser) process.env.NEO4J_USER = origUser;
    if (origPass) process.env.NEO4J_PASSWORD = origPass;
  }
});

test("grafo_neo4j: /api/grafo returns 503 NEO4J_UNCONFIGURED when credentials missing", async () => {
  const origUri = process.env.NEO4J_URI;
  const origUser = process.env.NEO4J_USER;
  const origPass = process.env.NEO4J_PASSWORD;

  try {
    delete process.env.NEO4J_URI;
    delete process.env.NEO4J_USER;
    delete process.env.NEO4J_PASSWORD;

    const req = new Request("http://localhost:3000/api/grafo");
    const res = await GET(req);

    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.code, "NEO4J_UNCONFIGURED");
    assert.ok(body.error.includes("Credenciales de Neo4j no configuradas"));
  } finally {
    if (origUri) process.env.NEO4J_URI = origUri;
    if (origUser) process.env.NEO4J_USER = origUser;
    if (origPass) process.env.NEO4J_PASSWORD = origPass;
  }
});

test("grafo_neo4j: Cypher queries are strictly READ-ONLY and contain no mutations", async () => {
  const capturedQueries: string[] = [];

  const originalDriver = neo4j.driver;

  (neo4j as any).driver = () => ({
    session: () => ({
      run: async (query: string, params: any) => {
        capturedQueries.push(query);
        return { records: [] };
      },
      close: async () => {},
    }),
    close: async () => {},
  });

  const origUri = process.env.NEO4J_URI;
  const origUser = process.env.NEO4J_USER;
  const origPass = process.env.NEO4J_PASSWORD;

  try {
    process.env.NEO4J_URI = "bolt://localhost:7687";
    process.env.NEO4J_USER = "neo4j";
    process.env.NEO4J_PASSWORD = "password";

    // Call without filters
    await obtenerGrafoNeo4j();

    // Call with io_id
    await obtenerGrafoNeo4j({ ioId: "io-test-123" });

    // Call with volcado_id
    await obtenerGrafoNeo4j({ volcadoId: "volcado-test-456" });

    assert.ok(capturedQueries.length >= 6);

    const mutatingClauseRegex = /\b(CREATE|MERGE|DELETE|SET|REMOVE|DETACH)\b/i;

    for (const query of capturedQueries) {
      assert.equal(
        mutatingClauseRegex.test(query),
        false,
        `Query contains mutating Cypher clause: ${query}`
      );
      const upper = query.toUpperCase();
      assert.ok(upper.includes("MATCH"), "Query must contain MATCH");
      assert.ok(upper.includes("RETURN"), "Query must contain RETURN");
    }
  } finally {
    (neo4j as any).driver = originalDriver;
    if (origUri) process.env.NEO4J_URI = origUri; else delete process.env.NEO4J_URI;
    if (origUser) process.env.NEO4J_USER = origUser; else delete process.env.NEO4J_USER;
    if (origPass) process.env.NEO4J_PASSWORD = origPass; else delete process.env.NEO4J_PASSWORD;
  }
});

test("grafo_neo4j: /api/grafo maps mock Neo4j nodes and edges into expected JSON structure", async () => {
  const originalDriver = neo4j.driver;

  const mockNodeRecord = {
    get: (key: string) => {
      const data: Record<string, any> = {
        id: "ent:persona_juan",
        summary: "Juan Pérez",
        community: 2,
        level: 1,
        centrality: 0.95,
        origen: "asentamiento=p5b",
        timestamp: "2026-03-01T12:00:00Z",
        verificacion: "Verificado",
      };
      return data[key];
    },
  };

  const mockEdgeRecord = {
    get: (key: string) => {
      const data: Record<string, any> = {
        id: "ent:persona_juan->ent:org_khora:TRABAJA_EN",
        source: "ent:persona_juan",
        target: "ent:org_khora",
        type: "TRABAJA_EN",
        weight: 1.0,
        origen: "asentamiento=p5b",
        timestamp: "2026-03-01T12:00:00Z",
        verificacion: "Verificado",
      };
      return data[key];
    },
  };

  (neo4j as any).driver = () => ({
    session: () => ({
      run: async (query: string) => {
        if (query.includes("e.canonical_key AS id")) {
          return { records: [mockNodeRecord] };
        }
        return { records: [mockEdgeRecord] };
      },
      close: async () => {},
    }),
    close: async () => {},
  });

  const origUri = process.env.NEO4J_URI;
  const origUser = process.env.NEO4J_USER;
  const origPass = process.env.NEO4J_PASSWORD;

  try {
    process.env.NEO4J_URI = "bolt://localhost:7687";
    process.env.NEO4J_USER = "neo4j";
    process.env.NEO4J_PASSWORD = "password";

    const req = new Request("http://localhost:3000/api/grafo?io_id=io-123&limit=50");
    const res = await GET(req);

    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.nodes.length, 1);
    assert.equal(body.nodes[0].id, "ent:persona_juan");
    assert.equal(body.nodes[0].summary, "Juan Pérez");
    assert.equal(body.nodes[0].community, 2);

    assert.equal(body.edges.length, 1);
    assert.equal(body.edges[0].source, "ent:persona_juan");
    assert.equal(body.edges[0].target, "ent:org_khora");
    assert.equal(body.edges[0].type, "TRABAJA_EN");
  } finally {
    (neo4j as any).driver = originalDriver;
    if (origUri) process.env.NEO4J_URI = origUri; else delete process.env.NEO4J_URI;
    if (origUser) process.env.NEO4J_USER = origUser; else delete process.env.NEO4J_USER;
    if (origPass) process.env.NEO4J_PASSWORD = origPass; else delete process.env.NEO4J_PASSWORD;
  }
});
