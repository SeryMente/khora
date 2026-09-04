import { randomUUID } from "crypto";
import { getDb } from "./neon";
import {
  ProposalEnvelope,
  ProposalItem,
  Judgment,
  SettlementAct,
  JudgmentDecision,
  validateProposalEnvelope,
  SourceTriplet,
  CURRENT_SCHEMA_VERSION,
} from "../contracts/proposal";

export type AccionJuicio = "ratificar" | "rechazar" | "enmendar";

export interface RegistrarJuicioParams {
  proposal_id: string;
  item_id: string;
  decision: JudgmentDecision;
  actor: string;
  judgment_id?: string;
  timestamp?: string;
  override_data?: Record<string, unknown>;
  motivo?: string;
}

export interface RegistrarActaAsientoParams {
  proposal_id: string;
  act_id?: string;
  status: SettlementAct["status"];
  settled_by: string;
  summary: string;
  graph_tx_id?: string;
  io_id?: string;
  conteos?: Record<string, number>;
  sello?: string;
  settled_at?: string;
}

export function decisionToAccion(decision: JudgmentDecision): AccionJuicio {
  switch (decision) {
    case "accept":
      return "ratificar";
    case "modify":
      return "enmendar";
    case "reject":
      return "rechazar";
  }
}

export function accionToDecision(accion: AccionJuicio): JudgmentDecision {
  switch (accion) {
    case "ratificar":
      return "accept";
    case "enmendar":
      return "modify";
    case "rechazar":
      return "reject";
  }
}

/**
 * Validates whether a proposal is active and valid.
 * Throws a domain error if proposal is expired or if the volcado active sha256 no longer matches.
 */
export async function validarInvariantePropuestaActiva(proposalId: string): Promise<{
  proposal: {
    id: string;
    volcado_id: string;
    version: number;
    sha256: string;
    estado: string;
    expira_en: string | null;
  };
}> {
  const db = getDb();

  const proposalRes = await db.query(
    `SELECT id, volcado_id, version, sha256, estado, expira_en
     FROM ingesta_propuesta
     WHERE id = $1`,
    [proposalId]
  );

  if (proposalRes.rows.length === 0) {
    throw new Error(`Propuesta no encontrada: ${proposalId}`);
  }

  const prop = proposalRes.rows[0];

  // 1. Check expiration date
  if (prop.expira_en && new Date(prop.expira_en).getTime() < Date.now()) {
    // Mark as expired if not already obsoleta
    await db.query(
      `UPDATE ingesta_propuesta SET estado = 'vencida', actualizado_en = NOW() WHERE id = $1 AND estado != 'vencida'`,
      [proposalId]
    );
    throw new Error(`Propuesta vencida u obsoleta (${proposalId}). Expirtó en ${prop.expira_en}`);
  }

  // 2. Check active volcado sha256
  const volcadoRes = await db.query(
    `SELECT sha256, estado FROM volcado WHERE id = $1`,
    [prop.volcado_id]
  );

  if (volcadoRes.rows.length === 0) {
    throw new Error(`Volcado asociado no encontrado: ${prop.volcado_id}`);
  }

  const currentSha256 = volcadoRes.rows[0].sha256;
  if (currentSha256 !== prop.sha256) {
    await db.query(
      `UPDATE ingesta_propuesta SET estado = 'obsoleta', actualizado_en = NOW() WHERE id = $1 AND estado != 'obsoleta'`,
      [proposalId]
    );
    throw new Error(
      `Propuesta obsoleta por cambio de SHA256 en volcado (${proposalId}). Esperado: ${prop.sha256}, Actual en volcado: ${currentSha256}`
    );
  }

  return { proposal: prop };
}

/**
 * Persists a complete ProposalEnvelope into PostgreSQL.
 * Guarantees idempotency via unique constraints.
 */
export async function guardarPropuesta(
  envelope: ProposalEnvelope,
  options?: { expira_en?: string }
): Promise<{ proposal_id: string; created: boolean }> {
  const validation = validateProposalEnvelope(envelope);
  if (!validation.valid) {
    throw new Error(`Envelope de propuesta inválido: ${validation.errors.join("; ")}`);
  }

  const db = getDb();
  const proposalId = randomUUID();

  // Begin transaction
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Check existing proposal by terna + payload_hash
    const existing = await client.query(
      `SELECT id FROM ingesta_propuesta
       WHERE volcado_id = $1 AND version = $2 AND sha256 = $3 AND payload_hash = $4`,
      [
        envelope.source_triplet.volcado_id,
        envelope.source_triplet.version,
        envelope.source_triplet.sha256,
        envelope.payload_hash,
      ]
    );

    if (existing.rows.length > 0) {
      await client.query("COMMIT");
      return { proposal_id: existing.rows[0].id, created: false };
    }

    // Insert proposal
    await client.query(
      `INSERT INTO ingesta_propuesta (
        id, schema_version, volcado_id, version, sha256, pipeline_version, payload_hash, estado, expira_en, creado_en, actualizado_en
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        proposalId,
        envelope.schema_version || CURRENT_SCHEMA_VERSION,
        envelope.source_triplet.volcado_id,
        envelope.source_triplet.version,
        envelope.source_triplet.sha256,
        envelope.pipeline_version,
        envelope.payload_hash,
        "pendiente",
        options?.expira_en || null,
        envelope.created_at || new Date().toISOString(),
        envelope.updated_at || new Date().toISOString(),
      ]
    );

    // Insert items
    for (const item of envelope.items) {
      await client.query(
        `INSERT INTO ingesta_propuesta_item (
          id, proposal_id, kind, label, anchor, candidates, triple, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          item.id,
          proposalId,
          item.kind,
          item.label,
          JSON.stringify(item.anchor),
          JSON.stringify(item.candidates || []),
          item.triple ? JSON.stringify(item.triple) : null,
          item.metadata ? JSON.stringify(item.metadata) : null,
        ]
      );
    }

    // Insert initial judgments if present
    for (const j of envelope.judgments || []) {
      const accion = decisionToAccion(j.decision);
      await client.query(
        `INSERT INTO ingesta_juicio (
          judgment_id, proposal_id, item_id, decision, accion, actor, timestamp, override_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (judgment_id) DO NOTHING`,
        [
          j.judgment_id || randomUUID(),
          proposalId,
          j.item_id,
          j.decision,
          accion,
          j.actor,
          j.timestamp || new Date().toISOString(),
          j.override_data ? JSON.stringify(j.override_data) : null,
        ]
      );
    }

    // Insert settlement act if present
    if (envelope.settlement_act) {
      const act = envelope.settlement_act;
      await client.query(
        `INSERT INTO ingesta_acta_asiento (
          act_id, proposal_id, status, settled_at, settled_by, summary
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (act_id) DO NOTHING`,
        [
          act.act_id || randomUUID(),
          proposalId,
          act.status,
          act.settled_at || new Date().toISOString(),
          act.settled_by,
          act.summary,
        ]
      );
      await client.query(
        `UPDATE ingesta_propuesta SET estado = $1, actualizado_en = NOW() WHERE id = $2`,
        [act.status === "approved" ? "asentada" : "rechazada", proposalId]
      );
    }

    await client.query("COMMIT");
    return { proposal_id: proposalId, created: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Registers an append-only judgment for a proposal item.
 */
export async function registrarJuicio(params: RegistrarJuicioParams): Promise<Judgment> {
  // Validate active invariants
  await validarInvariantePropuestaActiva(params.proposal_id);

  const db = getDb();
  const judgmentId = params.judgment_id || randomUUID();
  const timestamp = params.timestamp || new Date().toISOString();
  const accion = decisionToAccion(params.decision);

  // Verify item exists for proposal
  const itemCheck = await db.query(
    `SELECT id FROM ingesta_propuesta_item WHERE proposal_id = $1 AND id = $2`,
    [params.proposal_id, params.item_id]
  );

  if (itemCheck.rows.length === 0) {
    throw new Error(`El ítem ${params.item_id} no pertenece a la propuesta ${params.proposal_id}`);
  }

  await db.query(
    `INSERT INTO ingesta_juicio (
      judgment_id, proposal_id, item_id, decision, accion, actor, timestamp, override_data, motivo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      judgmentId,
      params.proposal_id,
      params.item_id,
      params.decision,
      accion,
      params.actor,
      timestamp,
      params.override_data ? JSON.stringify(params.override_data) : null,
      params.motivo || null,
    ]
  );

  await db.query(
    `UPDATE ingesta_propuesta SET estado = 'en_revision', actualizado_en = NOW() WHERE id = $1 AND estado = 'pendiente'`,
    [params.proposal_id]
  );

  return {
    judgment_id: judgmentId,
    item_id: params.item_id,
    decision: params.decision,
    actor: params.actor,
    timestamp,
    override_data: params.override_data,
  };
}

/**
 * Settles a proposal by inserting a settlement act (ingesta_acta_asiento).
 * Double settlement on the same proposal throws a domain conflict error.
 */
export async function registrarActaAsiento(params: RegistrarActaAsientoParams): Promise<SettlementAct> {
  await validarInvariantePropuestaActiva(params.proposal_id);

  const db = getDb();
  const actId = params.act_id || randomUUID();
  const settledAt = params.settled_at || new Date().toISOString();

  // Verify no prior settlement act exists for this proposal
  const existingAct = await db.query(
    `SELECT act_id FROM ingesta_acta_asiento WHERE proposal_id = $1`,
    [params.proposal_id]
  );

  if (existingAct.rows.length > 0) {
    throw new Error(`La propuesta ${params.proposal_id} ya posee un acta de asiento registrada (${existingAct.rows[0].act_id})`);
  }

  await db.query(
    `INSERT INTO ingesta_acta_asiento (
      act_id, proposal_id, status, settled_at, settled_by, summary, graph_tx_id, io_id, conteos, sello
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      actId,
      params.proposal_id,
      params.status,
      settledAt,
      params.settled_by,
      params.summary,
      params.graph_tx_id || null,
      params.io_id || null,
      params.conteos ? JSON.stringify(params.conteos) : null,
      params.sello || null,
    ]
  );

  const nuevoEstado = params.status === "approved" || params.status === "partially_approved" ? "asentada" : "rechazada";
  await db.query(
    `UPDATE ingesta_propuesta SET estado = $1, actualizado_en = NOW() WHERE id = $2`,
    [nuevoEstado, params.proposal_id]
  );

  return {
    act_id: actId,
    status: params.status,
    settled_at: settledAt,
    settled_by: params.settled_by,
    summary: params.summary,
  };
}

/**
 * Reconstructs a complete ProposalEnvelope from PostgreSQL DB without querying Neo4j.
 */
export async function obtenerPropuestaEnvelope(proposalId: string): Promise<ProposalEnvelope | null> {
  const db = getDb();

  const propRes = await db.query(
    `SELECT id, schema_version, volcado_id, version, sha256, pipeline_version, payload_hash, creado_en, actualizado_en
     FROM ingesta_propuesta
     WHERE id = $1`,
    [proposalId]
  );

  if (propRes.rows.length === 0) {
    return null;
  }

  const p = propRes.rows[0];

  // Retrieve items
  const itemsRes = await db.query(
    `SELECT id, kind, label, anchor, candidates, triple, metadata
     FROM ingesta_propuesta_item
     WHERE proposal_id = $1
     ORDER BY creado_en ASC`,
    [proposalId]
  );

  const items: ProposalItem[] = itemsRes.rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: row.label,
    anchor: typeof row.anchor === "string" ? JSON.parse(row.anchor) : row.anchor,
    candidates: typeof row.candidates === "string" ? JSON.parse(row.candidates) : row.candidates || [],
    triple: row.triple ? (typeof row.triple === "string" ? JSON.parse(row.triple) : row.triple) : undefined,
    metadata: row.metadata ? (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) : undefined,
  }));

  // Retrieve judgments in sequence order
  const judgmentsRes = await db.query(
    `SELECT judgment_id, item_id, decision, actor, timestamp, override_data
     FROM ingesta_juicio
     WHERE proposal_id = $1
     ORDER BY timestamp ASC, creado_en ASC`,
    [proposalId]
  );

  const judgments: Judgment[] = judgmentsRes.rows.map((row) => ({
    judgment_id: row.judgment_id,
    item_id: row.item_id,
    decision: row.decision as JudgmentDecision,
    actor: row.actor,
    timestamp: new Date(row.timestamp).toISOString(),
    override_data: row.override_data ? (typeof row.override_data === "string" ? JSON.parse(row.override_data) : row.override_data) : undefined,
  }));

  // Retrieve settlement act
  const actRes = await db.query(
    `SELECT act_id, status, settled_at, settled_by, summary
     FROM ingesta_acta_asiento
     WHERE proposal_id = $1`,
    [proposalId]
  );

  let settlement_act: SettlementAct | null = null;
  if (actRes.rows.length > 0) {
    const act = actRes.rows[0];
    settlement_act = {
      act_id: act.act_id,
      status: act.status,
      settled_at: new Date(act.settled_at).toISOString(),
      settled_by: act.settled_by,
      summary: act.summary,
    };
  }

  return {
    schema_version: p.schema_version,
    source_triplet: {
      volcado_id: p.volcado_id,
      version: Number(p.version),
      sha256: p.sha256,
    },
    pipeline_version: p.pipeline_version,
    payload_hash: p.payload_hash,
    created_at: new Date(p.creado_en).toISOString(),
    updated_at: new Date(p.actualizado_en).toISOString(),
    items,
    judgments,
    settlement_act,
  };
}

/**
 * Retrieves the latest proposal for a given source triplet (volcado_id, version, sha256).
 */
export async function obtenerPropuestaPorTerna(triplet: SourceTriplet): Promise<ProposalEnvelope | null> {
  const db = getDb();
  const res = await db.query(
    `SELECT id FROM ingesta_propuesta
     WHERE volcado_id = $1 AND version = $2 AND sha256 = $3
     ORDER BY creado_en DESC LIMIT 1`,
    [triplet.volcado_id, triplet.version, triplet.sha256]
  );

  if (res.rows.length === 0) {
    return null;
  }

  return obtenerPropuestaEnvelope(res.rows[0].id);
}
