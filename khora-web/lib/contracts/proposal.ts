import { createHash } from "crypto";

export const CURRENT_SCHEMA_VERSION = "1.0.0";
export const KHORA_PROPOSAL_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // Standard DNS namespace UUID

export interface SourceTriplet {
  volcado_id: string;
  version: number;
  sha256: string;
}

export interface Anchor {
  exact_text: string;
  start_char?: number;
  end_char?: number;
  segment_index?: number;
}

export interface ResolutionCandidate {
  canonical_key: string;
  score: number;
  label: string;
  needs_review: boolean;
}

export interface ProposalTriple {
  origen_id: string;
  destino_id: string;
  relacion: string;
}

export interface ProposalItem {
  id: string;
  kind: "entity" | "relation";
  label: string;
  anchor: Anchor;
  candidates: ResolutionCandidate[];
  triple?: ProposalTriple;
  metadata?: Record<string, string>;
}

export type JudgmentDecision = "accept" | "reject" | "modify";

export interface Judgment {
  judgment_id: string;
  item_id: string;
  decision: JudgmentDecision;
  actor: string;
  timestamp: string;
  override_data?: Record<string, unknown>;
}

export type SettlementStatus = "pending" | "approved" | "rejected" | "partially_approved";

export interface SettlementAct {
  act_id: string;
  status: SettlementStatus;
  settled_at: string;
  settled_by: string;
  summary: string;
}

export interface ProposalEnvelope {
  schema_version: string;
  source_triplet: SourceTriplet;
  pipeline_version: string;
  payload_hash: string;
  created_at: string;
  updated_at: string;
  items: ProposalItem[];
  judgments: Judgment[];
  settlement_act: SettlementAct | null;
}

/**
 * Computes a deterministic UUIDv5 matching RFC 4122 (identical to Python uuid.uuid5).
 */
export function computeItemId(triplet: SourceTriplet, contentKey: string): string {
  const name = `${triplet.volcado_id}:${triplet.version}:${triplet.sha256.toLowerCase()}:${contentKey}`;
  const nsHex = KHORA_PROPOSAL_NAMESPACE.replace(/-/g, "");
  const nsBytes = Buffer.from(nsHex, "hex");

  const hash = createHash("sha1")
    .update(nsBytes)
    .update(Buffer.from(name, "utf8"))
    .digest("hex");

  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    ((parseInt(hash.substring(12, 16), 16) & 0x0fff) | 0x5000).toString(16).padStart(4, "0"),
    ((parseInt(hash.substring(16, 20), 16) & 0x3fff) | 0x8000).toString(16).padStart(4, "0"),
    hash.substring(20, 32),
  ].join("-");
}

/**
 * Produces canonical JSON string representation of Derived Zone items (sorted keys, no spaces, omits undefined).
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs: string[] = [];
  for (const key of keys) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== undefined) {
      pairs.push(JSON.stringify(key) + ":" + canonicalizeJson(val));
    }
  }
  return "{" + pairs.join(",") + "}";
}

/**
 * Computes payload_hash (SHA-256 of canonical JSON of Derived Zone items).
 */
export function computePayloadHash(items: ProposalItem[]): string {
  const canonical = canonicalizeJson(items);
  return createHash("sha256").update(canonical, "utf8").digest("hex").toLowerCase();
}

/**
 * Validates a ProposalEnvelope raw object against contract rules.
 */
export function validateProposalEnvelope(raw: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["El envelope debe ser un objeto JSON válido."] };
  }

  const env = raw as Partial<ProposalEnvelope>;

  // 1. Schema version
  if (typeof env.schema_version !== "string" || !env.schema_version.startsWith("1.")) {
    errors.push(`Versión de esquema desconocida o incompatible: ${String(env.schema_version)}.`);
  }

  // 2. Source triplet
  if (!env.source_triplet || typeof env.source_triplet !== "object") {
    errors.push("Terna de procedencia (source_triplet) ausente o no es un objeto.");
  } else {
    const t = env.source_triplet;
    if (typeof t.volcado_id !== "string" || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(t.volcado_id)) {
      errors.push("source_triplet.volcado_id debe ser un UUID válido.");
    }
    if (typeof t.version !== "number" || !Number.isInteger(t.version) || t.version < 1) {
      errors.push("source_triplet.version debe ser un entero >= 1.");
    }
    if (typeof t.sha256 !== "string" || !/^[0-9a-fA-F]{64}$/.test(t.sha256)) {
      errors.push("source_triplet.sha256 debe ser un digest hexadecimal de 64 caracteres.");
    }
  }

  // 3. Pipeline version
  if (typeof env.pipeline_version !== "string" || env.pipeline_version.trim().length === 0) {
    errors.push("pipeline_version es obligatorio y no puede estar vacío.");
  }

  // 4. Timestamps
  if (typeof env.created_at !== "string" || isNaN(Date.parse(env.created_at))) {
    errors.push("created_at debe ser un timestamp ISO 8601 válido.");
  }
  if (typeof env.updated_at !== "string" || isNaN(Date.parse(env.updated_at))) {
    errors.push("updated_at debe ser un timestamp ISO 8601 válido.");
  }

  // 5. Items validation
  if (!Array.isArray(env.items)) {
    errors.push("items debe ser un arreglo.");
  } else {
    env.items.forEach((item, idx) => {
      if (!item || typeof item !== "object") {
        errors.push(`items[${idx}] debe ser un objeto.`);
        return;
      }
      if (typeof item.id !== "string" || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(item.id)) {
        errors.push(`items[${idx}].id debe ser un UUID válido.`);
      }
      if (item.kind !== "entity" && item.kind !== "relation") {
        errors.push(`items[${idx}].kind debe ser 'entity' o 'relation'.`);
      }
      if (typeof item.label !== "string" || item.label.trim().length === 0) {
        errors.push(`items[${idx}].label es obligatorio.`);
      }
      // Anchor validation
      if (!item.anchor || typeof item.anchor !== "object") {
        errors.push(`items[${idx}].anchor es obligatorio.`);
      } else {
        if (typeof item.anchor.exact_text !== "string" || item.anchor.exact_text.trim().length === 0) {
          errors.push(`items[${idx}].anchor.exact_text es obligatorio y no puede estar vacío.`);
        }
        if (item.anchor.start_char !== undefined && (typeof item.anchor.start_char !== "number" || item.anchor.start_char < 0)) {
          errors.push(`items[${idx}].anchor.start_char debe ser un entero >= 0.`);
        }
        if (item.anchor.end_char !== undefined && (typeof item.anchor.end_char !== "number" || item.anchor.end_char < 0)) {
          errors.push(`items[${idx}].anchor.end_char debe ser un entero >= 0.`);
        }
      }
      // Candidates validation
      if (!Array.isArray(item.candidates)) {
        errors.push(`items[${idx}].candidates debe ser un arreglo.`);
      }
    });
  }

  // 6. Payload hash integrity verification
  if (typeof env.payload_hash !== "string" || !/^[0-9a-fA-F]{64}$/.test(env.payload_hash)) {
    errors.push("payload_hash debe ser un digest SHA-256 hexadecimal de 64 caracteres.");
  } else if (Array.isArray(env.items)) {
    const computedHash = computePayloadHash(env.items as ProposalItem[]);
    if (env.payload_hash.toLowerCase() !== computedHash) {
      errors.push(`Integridad alterada: payload_hash recibido (${env.payload_hash}) no coincide con el calculated (${computedHash}).`);
    }
  }

  // 7. Judgments validation
  if (!Array.isArray(env.judgments)) {
    errors.push("judgments debe ser un arreglo.");
  }

  // 8. Settlement act validation
  if (env.settlement_act !== null && env.settlement_act !== undefined) {
    if (typeof env.settlement_act !== "object") {
      errors.push("settlement_act debe ser null u objeto.");
    } else {
      const act = env.settlement_act as Partial<SettlementAct>;
      if (!act.act_id || !act.status || !act.settled_at || !act.settled_by) {
        errors.push("settlement_act incompleto: requiere act_id, status, settled_at y settled_by.");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
