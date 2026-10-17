import { test } from "node:test";
import assert from "node:assert/strict";
import neo4j from "neo4j-driver";
import { GET } from "../../app/api/grafo/route";

const envKeys = ["NEO4J_URI", "NEO4J_USER", "NEO4J_PASSWORD"] as const;
function withEnv(values: Record<string, string | undefined>) {
  const original = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) values[key] === undefined ? delete process.env[key] : process.env[key] = values[key]!;
  return () => { for (const key of envKeys) original[key] === undefined ? delete process.env[key] : process.env[key] = original[key]!; };
}
function record(data: Record<string, unknown>) { return { get: (key: string) => data[key] }; }
function mockDriver(run: (query: string, params: Record<string, unknown>) => Promise<unknown[]> | unknown[]) {
  const previous = neo4j.driver;
  (neo4j as any).driver = () => ({ session: () => ({ run: async (query: string, params: Record<string, unknown>) => ({ records: await run(query, params) }), close: async () => {} }), close: async () => {} });
  return () => { (neo4j as any).driver = previous; };
}
const io = (id: string) => record({ id, volcadoId: "v1", version: 1, sha256: "a".repeat(64), timestamp: "2026-09-22T00:00:00Z" });
const entity = (id: string) => record({ id, summary: id, community: 0, level: 0, centrality: 1, origen: "test", timestamp: "2026-09-22T00:00:00Z", verificacion: "Verificado" });
const mention = (source: string, target: string) => record({ id: `${source}->${target}:MENTIONS`, source, target, type: "MENTIONS" });
const relation = (source: string, target: string) => record({ id: `${source}->${target}:R`, source, target, type: "RELATED", weight: 1, origen: "test", timestamp: "2026-09-22T00:00:00Z", verificacion: "Verificado" });

function rowsFor(query: string) {
  if (query.includes("UNWIND $ioIds")) return [mention("io-1", "e-1"), mention("io-1", "missing")];
  if (query.includes("MATCH (io:InformationObject)-[:MENTIONS]->(e:Entity)")) return [entity("e-1"), entity("e-2")];
  if (query.includes("r:RELATION")) return [relation("e-1", "e-2"), relation("e-1", "missing")];
  if (query.includes("MATCH (io:InformationObject)")) return [io("io-1")];
  return [];
}

test("/api/grafo exposes filtered InformationObject and MENTIONS without dangling edges", async () => {
  const restoreEnv = withEnv({ NEO4J_URI: "bolt://localhost:7687", NEO4J_USER: "neo4j", NEO4J_PASSWORD: "test" });
  const restoreDriver = mockDriver(async (query) => rowsFor(query));
  try {
    const res = await GET(new Request("http://localhost:3000/api/grafo?io_id=io-1&limit=10"));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.informationObjects[0].id, "io-1");
    assert.deepEqual(body.mentions.map((edge: any) => [edge.source, edge.target]), [["io-1", "e-1"]]);
    assert.equal(body.nodes.length, 2);
    assert.deepEqual(body.edges.map((edge: any) => [edge.source, edge.target]), [["e-1", "e-2"]]);
    assert.equal(body.truncated, false);
  } finally { restoreDriver(); restoreEnv(); }
});

test("/api/grafo declares truncation and clamps large limits", async () => {
  const restoreEnv = withEnv({ NEO4J_URI: "bolt://localhost:7687", NEO4J_USER: "neo4j", NEO4J_PASSWORD: "test" });
  const restoreDriver = mockDriver(async (query) => query.includes("MATCH (io:InformationObject)") ? [io("io-1"), io("io-2")] : []);
  try {
    const res = await GET(new Request("http://localhost:3000/api/grafo?limit=2501"));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.limit, 2000);
    assert.equal(body.truncated, true);
    assert.equal(body.truncation.limit, true);
    assert.equal(body.truncation.informationObjects, false);
  } finally { restoreDriver(); restoreEnv(); }
});

test("/api/grafo rejects invalid limits instead of silently defaulting", async () => {
  const res = await GET(new Request("http://localhost:3000/api/grafo?limit=10oops"));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "INVALID_LIMIT");
});

test("/api/grafo distinguishes unavailable Neo4j (503) from query defects (500)", async () => {
  const restoreEnv = withEnv({ NEO4J_URI: "bolt://localhost:7687", NEO4J_USER: "neo4j", NEO4J_PASSWORD: "test" });
  let unavailable = true;
  const restoreDriver = mockDriver(async () => { if (unavailable) throw Object.assign(new Error("offline"), { code: "ServiceUnavailable" }); throw new Error("invalid Cypher"); });
  try {
    let res = await GET(new Request("http://localhost:3000/api/grafo"));
    assert.equal(res.status, 503);
    unavailable = false;
    res = await GET(new Request("http://localhost:3000/api/grafo"));
    assert.equal(res.status, 500);
    assert.equal((await res.json()).code, "GRAPH_QUERY_FAILED");
  } finally { restoreDriver(); restoreEnv(); }
});

test("/api/grafo returns 503 when Neo4j credentials are missing", async () => {
  const restoreEnv = withEnv({ NEO4J_URI: undefined, NEO4J_USER: undefined, NEO4J_PASSWORD: undefined });
  try {
    const res = await GET(new Request("http://localhost:3000/api/grafo"));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, "NEO4J_UNCONFIGURED");
  } finally { restoreEnv(); }
});

test("/api/grafo retries routing discovery once through the equivalent direct Bolt URI", async () => {
  const restoreEnv = withEnv({ NEO4J_URI: "neo4j+s://example.databases.neo4j.io", NEO4J_USER: "neo4j", NEO4J_PASSWORD: "test" });
  const previous = neo4j.driver;
  const attemptedUris: string[] = [];
  (neo4j as any).driver = (uri: string) => {
    attemptedUris.push(uri);
    return {
      session: () => ({
        run: async (query: string, params: Record<string, unknown>) => {
          if (uri.startsWith("neo4j+s://")) {
            throw Object.assign(new Error("Could not perform discovery. No routing servers available."), { code: "ServiceUnavailable" });
          }
          return { records: await rowsFor(query) };
        },
        close: async () => {},
      }),
      close: async () => {},
    };
  };
  try {
    const res = await GET(new Request("http://localhost:3000/api/grafo?io_id=io-1&limit=10"));
    assert.equal(res.status, 200);
    assert.deepEqual(attemptedUris, [
      "neo4j+s://example.databases.neo4j.io",
      "bolt+s://example.databases.neo4j.io",
    ]);
    const body = await res.json();
    assert.equal(body.informationObjects[0].id, "io-1");
    assert.deepEqual(body.mentions.map((edge: any) => [edge.source, edge.target]), [["io-1", "e-1"]]);
  } finally {
    (neo4j as any).driver = previous;
    restoreEnv();
  }
});


test("/api/grafo timestamp fallbacks use valid Cypher in global and filtered queries", async () => {
  const restoreEnv = withEnv({ NEO4J_URI: "bolt://localhost:7687", NEO4J_USER: "neo4j", NEO4J_PASSWORD: "test" });
  const seen = new Set<string>();
  const restoreDriver = mockDriver(async (query) => {
    assert.doesNotMatch(query, /datetime\(\)\.toString\(/);
    if (query.includes(" AS timestamp")) assert.ok(query.includes("toString(datetime())"));
    seen.add(query);
    if (query.includes("MATCH (e:Entity)")) return [entity("e-1"), entity("e-2")];
    return rowsFor(query);
  });
  try {
    for (const suffix of ["?limit=10", "?io_id=io-1&limit=10"]) {
      const res = await GET(new Request("http://localhost:3000/api/grafo" + suffix));
      assert.equal(res.status, 200);
    }
    assert.equal(seen.size, 6);
  } finally { restoreDriver(); restoreEnv(); }
});


test("/api/grafo reads published Leiden membership rather than stale entity properties", async () => {
  const restoreEnv = withEnv({ NEO4J_URI: "bolt://localhost:7687", NEO4J_USER: "neo4j", NEO4J_PASSWORD: "test" });
  const restoreDriver = mockDriver(async (query) => {
    if (query.includes(" AS summary")) {
      assert.ok(query.includes(":IN_COMMUNITY"));
      assert.ok(query.includes("membership.published = true AND c.published = true"));
      assert.ok(query.includes("NOT e:User AND NOT e:InformationObject"));
      assert.doesNotMatch(query, /e\.community/);
      return [record({ id: "e-1", summary: "Alba", community: 999, communityId: "L0_real", communityRevision: "revision-a" }),
        record({ id: "e-2", summary: "Bruno", communityId: "L0_real", communityRevision: "revision-a" }),
        record({ id: "e-3", summary: "Delta", communityId: "L0_other", communityRevision: "revision-a" })];
    }
    return rowsFor(query);
  });
  try {
    const response = await GET(new Request("http://localhost/api/grafo"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.nodes[0].communityId, "L0_real");
    assert.equal(body.nodes[0].communityRevision, "revision-a");
    assert.equal(body.nodes[0].community, body.nodes[1].community);
    assert.notEqual(body.nodes[0].community, body.nodes[2].community);
    assert.notEqual(body.nodes[0].community, 999);
  } finally { restoreDriver(); restoreEnv(); }
});


test("/api/grafo preserves edge provenance and unique identities across source versions", async () => {
  const restoreEnv = withEnv({ NEO4J_URI: "bolt://localhost:7687", NEO4J_USER: "neo4j", NEO4J_PASSWORD: "test" });
  const restoreDriver = mockDriver(async (query) => {
    if (query.includes("r:RELATION")) {
      assert.ok(query.includes("coalesce(toString(r.io_id), 'legacy')"));
      assert.ok(query.includes("r.invalid_at IS NULL"));
      assert.ok(query.includes("r.io_id = io.io_id"));
    }
    return rowsFor(query);
  });
  try { assert.equal((await GET(new Request("http://localhost/api/grafo?io_id=io-1"))).status, 200); }
  finally { restoreDriver(); restoreEnv(); }
});
