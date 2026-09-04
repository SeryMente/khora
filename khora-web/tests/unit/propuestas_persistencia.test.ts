import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import {
  guardarPropuesta,
  registrarJuicio,
  registrarActaAsiento,
  obtenerPropuestaEnvelope,
  obtenerPropuestaPorTerna,
  decisionToAccion,
  accionToDecision,
} from "../../lib/server/propuestasRepo";
import {
  ProposalEnvelope,
  ProposalItem,
  SourceTriplet,
  computeItemId,
  computePayloadHash,
  CURRENT_SCHEMA_VERSION,
} from "../../lib/contracts/proposal";

// Mock In-Memory Database for Postgres testing
class MockPgPool {
  tables: Record<string, any[]> = {
    volcado: [],
    ingesta_propuesta: [],
    ingesta_propuesta_item: [],
    ingesta_juicio: [],
    ingesta_acta_asiento: [],
  };

  async connect() {
    return {
      query: (sql: string, params?: any[]) => this.query(sql, params),
      release: () => {},
    };
  }

  async query(sql: string, params: any[] = []) {
    const trimmed = sql.trim().replace(/\s+/g, " ");

    if (trimmed.startsWith("BEGIN") || trimmed.startsWith("COMMIT") || trimmed.startsWith("ROLLBACK")) {
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.includes("FROM ingesta_propuesta WHERE volcado_id = $1 AND version = $2 AND sha256 = $3 AND payload_hash = $4")) {
      const [volcado_id, version, sha256, payload_hash] = params;
      const rows = this.tables.ingesta_propuesta.filter(
        (p) =>
          p.volcado_id === volcado_id &&
          p.version === Number(version) &&
          p.sha256 === sha256 &&
          p.payload_hash === payload_hash
      );
      return { rows, rowCount: rows.length };
    }

    if (trimmed.includes("FROM ingesta_propuesta WHERE id = $1")) {
      const rows = this.tables.ingesta_propuesta.filter((p) => p.id === params[0]);
      return { rows, rowCount: rows.length };
    }

    if (trimmed.includes("FROM ingesta_propuesta WHERE volcado_id = $1 AND version = $2 AND sha256 = $3 ORDER BY creado_en DESC LIMIT 1")) {
      const [volcado_id, version, sha256] = params;
      const rows = this.tables.ingesta_propuesta.filter(
        (p) => p.volcado_id === volcado_id && p.version === Number(version) && p.sha256 === sha256
      );
      return { rows: rows.slice(0, 1), rowCount: Math.min(rows.length, 1) };
    }

    if (trimmed.includes("FROM volcado WHERE id = $1")) {
      const rows = this.tables.volcado.filter((v) => v.id === params[0]);
      return { rows, rowCount: rows.length };
    }

    if (trimmed.includes("FROM ingesta_propuesta_item WHERE proposal_id = $1 AND id = $2")) {
      const [proposal_id, id] = params;
      const rows = this.tables.ingesta_propuesta_item.filter((i) => i.proposal_id === proposal_id && i.id === id);
      return { rows, rowCount: rows.length };
    }

    if (trimmed.includes("FROM ingesta_propuesta_item WHERE proposal_id = $1")) {
      const rows = this.tables.ingesta_propuesta_item.filter((i) => i.proposal_id === params[0]);
      return { rows, rowCount: rows.length };
    }

    if (trimmed.includes("FROM ingesta_juicio WHERE proposal_id = $1")) {
      const rows = this.tables.ingesta_juicio.filter((j) => j.proposal_id === params[0]);
      return { rows, rowCount: rows.length };
    }

    if (trimmed.includes("FROM ingesta_acta_asiento WHERE proposal_id = $1")) {
      const rows = this.tables.ingesta_acta_asiento.filter((a) => a.proposal_id === params[0]);
      return { rows, rowCount: rows.length };
    }

    if (trimmed.startsWith("INSERT INTO ingesta_propuesta_item")) {
      const [id, proposal_id, kind, label, anchor, candidates, triple, metadata] = params;
      this.tables.ingesta_propuesta_item.push({
        id,
        proposal_id,
        kind,
        label,
        anchor,
        candidates,
        triple,
        metadata,
        creado_en: new Date().toISOString(),
      });
      return { rows: [], rowCount: 1 };
    }

    if (trimmed.startsWith("INSERT INTO ingesta_propuesta")) {
      const [id, schema_version, volcado_id, version, sha256, pipeline_version, payload_hash, estado, expira_en, creado_en, actualizado_en] = params;
      this.tables.ingesta_propuesta.push({
        id,
        schema_version,
        volcado_id,
        version: Number(version),
        sha256,
        pipeline_version,
        payload_hash,
        estado,
        expira_en,
        creado_en,
        actualizado_en,
      });
      return { rows: [], rowCount: 1 };
    }

    if (trimmed.startsWith("INSERT INTO ingesta_juicio")) {
      const [judgment_id, proposal_id, item_id, decision, accion, actor, timestamp, override_data, motivo] = params;
      if (this.tables.ingesta_juicio.some((j) => j.judgment_id === judgment_id)) {
        return { rows: [], rowCount: 0 };
      }
      this.tables.ingesta_juicio.push({
        id: randomUUID(),
        judgment_id,
        proposal_id,
        item_id,
        decision,
        accion,
        actor,
        timestamp,
        override_data,
        motivo: motivo || null,
        creado_en: new Date().toISOString(),
      });
      return { rows: [], rowCount: 1 };
    }

    if (trimmed.startsWith("INSERT INTO ingesta_acta_asiento")) {
      const [act_id, proposal_id, status, settled_at, settled_by, summary, graph_tx_id, io_id, conteos, sello] = params;
      this.tables.ingesta_acta_asiento.push({
        act_id,
        proposal_id,
        status,
        settled_at,
        settled_by,
        summary,
        graph_tx_id,
        io_id,
        conteos,
        sello,
        creado_en: new Date().toISOString(),
      });
      return { rows: [], rowCount: 1 };
    }

    if (trimmed.startsWith("UPDATE ingesta_propuesta SET estado = $1")) {
      const [estado, proposal_id] = params;
      const prop = this.tables.ingesta_propuesta.find((p) => p.id === proposal_id);
      if (prop) {
        prop.estado = estado;
        prop.actualizado_en = new Date().toISOString();
      }
      return { rows: [], rowCount: prop ? 1 : 0 };
    }

    if (trimmed.startsWith("UPDATE ingesta_propuesta SET estado = 'vencida'")) {
      const prop = this.tables.ingesta_propuesta.find((p) => p.id === params[0]);
      if (prop) {
        prop.estado = "vencida";
        prop.actualizado_en = new Date().toISOString();
      }
      return { rows: [], rowCount: prop ? 1 : 0 };
    }

    if (trimmed.startsWith("UPDATE ingesta_propuesta SET estado = 'obsoleta'")) {
      const prop = this.tables.ingesta_propuesta.find((p) => p.id === params[0]);
      if (prop) {
        prop.estado = "obsoleta";
        prop.actualizado_en = new Date().toISOString();
      }
      return { rows: [], rowCount: prop ? 1 : 0 };
    }

    if (trimmed.startsWith("UPDATE ingesta_propuesta SET estado = 'en_revision'")) {
      const prop = this.tables.ingesta_propuesta.find((p) => p.id === params[0] && p.estado === "pendiente");
      if (prop) {
        prop.estado = "en_revision";
        prop.actualizado_en = new Date().toISOString();
      }
      return { rows: [], rowCount: prop ? 1 : 0 };
    }

    return { rows: [], rowCount: 0 };
  }
}

let mockPool: MockPgPool;

beforeEach(() => {
  mockPool = new MockPgPool();
  setDbForTesting(mockPool);
});

afterEach(() => {
  resetDbForTesting();
});

const VOLCADO_ID = "11111111-2222-3333-4444-555555555555";
const SAMPLE_SHA = "a".repeat(64);

const SAMPLE_TRIPLET: SourceTriplet = {
  volcado_id: VOLCADO_ID,
  version: 1,
  sha256: SAMPLE_SHA,
};

function createSampleEnvelope(): ProposalEnvelope {
  const itemId = computeItemId(SAMPLE_TRIPLET, "entity-1");
  const items: ProposalItem[] = [
    {
      id: itemId,
      kind: "entity",
      label: "Persona Ejemplo",
      anchor: { exact_text: "Persona Ejemplo", start_char: 0, end_char: 15 },
      candidates: [{ canonical_key: "persona_ejemplo", score: 0.99, label: "Persona Ejemplo", needs_review: false }],
    },
  ];

  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    source_triplet: SAMPLE_TRIPLET,
    pipeline_version: "5b-v1.0",
    payload_hash: computePayloadHash(items),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items,
    judgments: [],
    settlement_act: null,
  };
}

test("propuestasRepo: mapping between JudgmentDecision and AccionJuicio is bidirectional and exact", () => {
  assert.equal(decisionToAccion("accept"), "ratificar");
  assert.equal(decisionToAccion("modify"), "enmendar");
  assert.equal(decisionToAccion("reject"), "rechazar");

  assert.equal(accionToDecision("ratificar"), "accept");
  assert.equal(accionToDecision("enmendar"), "modify");
  assert.equal(accionToDecision("rechazar"), "reject");
});

test("propuestasRepo: guardarPropuesta y reconstrucción offline idéntica (sin Neo4j)", async () => {
  // Pre-populate volcado state
  mockPool.tables.volcado.push({ id: VOLCADO_ID, sha256: SAMPLE_SHA, estado: "listo_ingesta" });

  const env = createSampleEnvelope();
  const res = await guardarPropuesta(env);
  assert.equal(res.created, true);

  // Retrieve proposal
  const retrieved = await obtenerPropuestaEnvelope(res.proposal_id);
  assert.notEqual(retrieved, null);
  assert.equal(retrieved?.payload_hash, env.payload_hash);
  assert.equal(retrieved?.items.length, 1);
  assert.equal(retrieved?.items[0].id, env.items[0].id);

  // Retrieve by source triplet
  const retrievedByTriplet = await obtenerPropuestaPorTerna(SAMPLE_TRIPLET);
  assert.notEqual(retrievedByTriplet, null);
  assert.equal(retrievedByTriplet?.payload_hash, env.payload_hash);
});

test("propuestasRepo: guardarPropuesta es idempotente para la misma terna y payload_hash", async () => {
  mockPool.tables.volcado.push({ id: VOLCADO_ID, sha256: SAMPLE_SHA, estado: "listo_ingesta" });

  const env = createSampleEnvelope();
  const res1 = await guardarPropuesta(env);
  assert.equal(res1.created, true);

  const res2 = await guardarPropuesta(env);
  assert.equal(res2.created, false);
  assert.equal(res2.proposal_id, res1.proposal_id);
});

test("propuestasRepo: registrarJuicio es append-only y no modifica payload_hash ni elimina dictámenes previos", async () => {
  mockPool.tables.volcado.push({ id: VOLCADO_ID, sha256: SAMPLE_SHA, estado: "listo_ingesta" });

  const env = createSampleEnvelope();
  const { proposal_id } = await guardarPropuesta(env);

  // 1. First judgment
  const j1 = await registrarJuicio({
    proposal_id,
    item_id: env.items[0].id,
    decision: "accept",
    actor: "operador_1",
  });

  // 2. Second judgment (append-only override/amendment)
  const j2 = await registrarJuicio({
    proposal_id,
    item_id: env.items[0].id,
    decision: "modify",
    actor: "operador_2",
    override_data: { canonical_key: "nuevo_concepto" },
    motivo: "Corrección requerida por contexto",
  });

  const reconstructed = await obtenerPropuestaEnvelope(proposal_id);
  assert.equal(reconstructed?.judgments.length, 2);
  assert.equal(reconstructed?.judgments[0].judgment_id, j1.judgment_id);
  assert.equal(reconstructed?.judgments[1].judgment_id, j2.judgment_id);
  assert.equal(reconstructed?.judgments[1].decision, "modify");

  // Verify payload_hash remains immutable
  assert.equal(reconstructed?.payload_hash, env.payload_hash);
});

test("propuestasRepo: RECHAZA dictamen o asiento si la propuesta está vencida", async () => {
  mockPool.tables.volcado.push({ id: VOLCADO_ID, sha256: SAMPLE_SHA, estado: "listo_ingesta" });

  const env = createSampleEnvelope();
  const pastDate = new Date(Date.now() - 3600000).toISOString();
  const { proposal_id } = await guardarPropuesta(env, { expira_en: pastDate });

  await assert.rejects(
    async () => {
      await registrarJuicio({
        proposal_id,
        item_id: env.items[0].id,
        decision: "accept",
        actor: "operador_1",
      });
    },
    (err: Error) => err.message.includes("Propuesta vencida")
  );

  // Verify proposal state transitioned to 'vencida'
  const prop = mockPool.tables.ingesta_propuesta.find((p) => p.id === proposal_id);
  assert.equal(prop.estado, "vencida");
});

test("propuestasRepo: RECHAZA dictamen o asiento si el SHA256 del volcado cambió (propuesta obsoleta)", async () => {
  // Volcado has a DIFFERENT sha256
  const NEW_SHA = "b".repeat(64);
  mockPool.tables.volcado.push({ id: VOLCADO_ID, sha256: NEW_SHA, estado: "listo_ingesta" });

  const env = createSampleEnvelope();
  const { proposal_id } = await guardarPropuesta(env);

  await assert.rejects(
    async () => {
      await registrarJuicio({
        proposal_id,
        item_id: env.items[0].id,
        decision: "accept",
        actor: "operador_1",
      });
    },
    (err: Error) => err.message.includes("Propuesta obsoleta por cambio de SHA256")
  );

  const prop = mockPool.tables.ingesta_propuesta.find((p) => p.id === proposal_id);
  assert.equal(prop.estado, "obsoleta");
});

test("propuestasRepo: reintento de registrarActaAsiento en propuesta ya asentada lanza conflicto", async () => {
  mockPool.tables.volcado.push({ id: VOLCADO_ID, sha256: SAMPLE_SHA, estado: "listo_ingesta" });

  const env = createSampleEnvelope();
  const { proposal_id } = await guardarPropuesta(env);

  await registrarActaAsiento({
    proposal_id,
    status: "approved",
    settled_by: "operador_1",
    summary: "Asiento aprobado correctamente",
  });

  await assert.rejects(
    async () => {
      await registrarActaAsiento({
        proposal_id,
        status: "approved",
        settled_by: "operador_1",
        summary: "Segundo asiento no permitido",
      });
    },
    (err: Error) => err.message.includes("ya posee un acta de asiento registrada")
  );
});
