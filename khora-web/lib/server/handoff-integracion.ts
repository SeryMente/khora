export type HandoffQueryable = {
  query: (sql: string, values?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
};

export type HandoffIntegracionInput = {
  intentId: string;
  sessionId: string;
  volcadoId: string;
  version: number;
  sourceSha256: string;
  eventTime: string | null;
  capturedAt: string;
  owner: string;
  autoPublish: boolean;
};

export type HandoffIntegracionReceipt = {
  intentId: string;
  sessionId: string;
  volcadoId: string;
  version: number;
  sourceSha256: string;
  eventTime: string | null;
  capturedAt: string;
  owner: string;
  state: "queued" | "disabled";
  autoPublish: boolean;
  publicationAuthorized: boolean;
  mode: "cronica";
};

const DESTINATIONS = ["github_blog", "facebook", "x", "tiktok"] as const;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map(key => JSON.stringify(key) + ":" + stableJson(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function receiptFromRow(row: any): HandoffIntegracionReceipt {
  return {
    intentId: String(row.intent_id),
    sessionId: String(row.session_id),
    volcadoId: String(row.volcado_id),
    version: Number(row.version),
    sourceSha256: String(row.source_sha256).trim().toLowerCase(),
    eventTime: row.event_time == null ? null : String(row.event_time),
    capturedAt: row.captured_at instanceof Date ? row.captured_at.toISOString() : new Date(String(row.captured_at)).toISOString(),
    owner: String(row.owner),
    state: row.state,
    autoPublish: row.auto_publish === true,
    publicationAuthorized: row.publication_authorized === true,
    mode: row.mode,
  };
}

/**
 * Must be called with the same PostgreSQL client and transaction that seals the volcado.
 * No network/provider call is made here; this is a durable Integration outbox record only.
 */
export async function persistirHandoffIntegracion(
  client: HandoffQueryable,
  input: HandoffIntegracionInput,
): Promise<HandoffIntegracionReceipt> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.intentId)) {
    throw new Error("integration_handoff_invalid_intent_id");
  }
  if (!input.sessionId || !input.volcadoId || !input.owner) throw new Error("integration_handoff_missing_identity");
  if (!Number.isSafeInteger(input.version) || input.version < 1) throw new Error("integration_handoff_invalid_version");
  if (!/^[0-9a-f]{64}$/i.test(input.sourceSha256)) throw new Error("integration_handoff_invalid_source_sha256");
  if (input.eventTime !== null && (typeof input.eventTime !== "string" || input.eventTime.length > 180)) throw new Error("integration_handoff_invalid_event_time");
  if (!Number.isFinite(Date.parse(input.capturedAt))) throw new Error("integration_handoff_invalid_captured_at");

  const state = input.autoPublish ? "queued" : "disabled";
  const representations = input.autoPublish
    ? { cronica_sobria: true, microblog: { requested: true, max_characters: 280 } }
    : { cronica_sobria: false, microblog: { requested: false, max_characters: 280 } };
  const destinations = input.autoPublish ? [...DESTINATIONS] : [];
  const values = [
    input.intentId, input.sessionId, input.volcadoId, input.version,
    input.sourceSha256.toLowerCase(), input.eventTime, new Date(input.capturedAt).toISOString(),
    state, input.autoPublish, input.autoPublish, "cronica", JSON.stringify(representations), destinations, input.owner,
  ];

  try {
    const inserted = await client.query(
      `INSERT INTO integration_handoff
        (intent_id, session_id, volcado_id, version, source_sha256, event_time, captured_at, state,
         auto_publish, publication_authorized, mode, representations, destinations, owner)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::text[],$14)
       ON CONFLICT (intent_id, session_id) DO NOTHING
       RETURNING intent_id`,
      values,
    );

    let row: any;
    if (inserted.rowCount === 1 && inserted.rows[0]) {
      const result = await client.query(
        `SELECT intent_id, session_id, volcado_id, version, source_sha256, event_time, captured_at, state,
                auto_publish, publication_authorized, mode, representations, destinations, owner
           FROM integration_handoff WHERE intent_id=$1 AND session_id=$2`,
        [input.intentId, input.sessionId],
      );
      row = result.rows[0];
    } else {
      const existing = await client.query(
        `SELECT intent_id, session_id, volcado_id, version, source_sha256, event_time, captured_at, state,
                auto_publish, publication_authorized, mode, representations, destinations, owner
           FROM integration_handoff WHERE intent_id=$1 AND session_id=$2 FOR UPDATE`,
        [input.intentId, input.sessionId],
      );
      row = existing.rows[0];
    }

    if (!row) throw new Error("integration_handoff_readback_missing");
    const actual = receiptFromRow(row);
    const actualRepresentations = typeof row.representations === "string" ? JSON.parse(row.representations) : row.representations;
    const actualDestinations = Array.isArray(row.destinations) ? row.destinations : [];
    if (
      actual.intentId !== input.intentId ||
      actual.sessionId !== input.sessionId ||
      actual.volcadoId !== input.volcadoId ||
      actual.version !== input.version ||
      actual.sourceSha256 !== input.sourceSha256.toLowerCase() ||
      actual.eventTime !== input.eventTime ||
      actual.capturedAt !== new Date(input.capturedAt).toISOString() ||
      actual.owner !== input.owner ||
      actual.state !== state ||
      actual.autoPublish !== input.autoPublish ||
      actual.publicationAuthorized !== input.autoPublish ||
      actual.mode !== "cronica" ||
      stableJson(actualRepresentations) !== stableJson(representations) ||
      stableJson(actualDestinations) !== stableJson(destinations)
    ) {
      throw new Error("integration_handoff_idempotency_conflict");
    }
    return actual;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("integration_handoff_")) throw error;
    throw new Error("integration_handoff_persist_failed: " + (error instanceof Error ? error.message : String(error)));
  }
}
