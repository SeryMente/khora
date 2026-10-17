import { z } from "zod";
import { BOUND_OUTPUT_FORMAT_VERSION } from "./mcp-client-identity";
import { REASONING_MODES, REQUIRED_OUTPUT_FORMAT_VERSION, REQUIRED_PLATFORM, type NormativeRuntimeContext } from "./normative-runtime";

export const NORM_CHECK_PROTOCOL = "NORM-CHECK";
export const NORM_CHECK_PROTOCOL_VERSION = "v0.5.0";

const hex = (length: number) => z.string().regex(new RegExp(`^[a-f0-9]{${length}}$`));
const anchor = z.string().regex(/^[A-Za-z][A-Za-z0-9._:-]{0,63}$/);
const reasonCode = z.string().regex(/^[A-Z0-9_:-]{1,32}$/);

// Extra receipt fields remain allowed, as before. Never strip signed evidence.
const principle = z.union([
  z.object({
    folio: z.string(), status: z.enum(["A", "C"]),
    anchor, reason_code: z.string().nullable().optional(),
  }).passthrough(),
  z.object({
    folio: z.string(), status: z.literal("N"),
    reason_code: reasonCode, anchor: z.string().nullable().optional(),
  }).passthrough(),
]);

// Structural contract shared by tools/list, the tool handler and the verifier.
// Snapshot, hashes, dates, ledger/order and cycle state remain semantic checks.
const historicalNormativeReceiptSchema = z.object({
  protocol: z.literal(NORM_CHECK_PROTOCOL),
  protocol_version: z.literal(NORM_CHECK_PROTOCOL_VERSION),
  cycle: z.object({ id: z.string().min(1), attempt: z.number().int().min(1) }).passthrough(),
  si: z.object({
    version: z.string(), git_commit_sha: hex(40), git_blob_sha: hex(40),
    sha256: hex(64), manifest_sha256: hex(64),
  }).passthrough(),
  methodology: z.object({
    version: z.string(), git_commit_sha: hex(40), git_blob_sha: hex(40), sha256: hex(64),
  }).passthrough(),
  input_sha256: hex(64),
  nonce: z.string().min(16).max(128),
  principles: z.array(principle).min(1),
  output: z.string().min(1).describe("Texto completo candidato; no es una prueba de verificación."),
  output_sha256: hex(64),
  output_header: z.string().min(32),
  methodology_output_header: z.string().min(32),
  evidence_sha256: hex(64),
  created_at: z.string().min(10).describe("Fecha interpretable por Date.parse; se comprueba también en el verificador."),
  runtime: z.object({
    platform: z.literal(REQUIRED_PLATFORM),
    reasoning_mode: z.enum(REASONING_MODES),
    output_format_version: z.literal(REQUIRED_OUTPUT_FORMAT_VERSION),
  }).passthrough(),
}).passthrough();

const boundIdentitySchema = z.object({
  version: z.literal("mcp-client-identity/v1"),
  client_id: z.string().min(1).max(2048).regex(/^[^\u0000-\u001F\u007F]+$/).refine(value => value.trim() === value),
  grant_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
  platform: z.enum(["ChatGPT", "Notion"]),
  assurance: z.literal("owner-configured"),
}).strict();
const boundNormativeReceiptSchema = historicalNormativeReceiptSchema.extend({
  protocol_version: z.literal("v0.6.0"),
  runtime: z.object({ platform: z.enum(["ChatGPT", "Notion"]), reasoning_mode: z.enum(REASONING_MODES), output_format_version: z.literal(BOUND_OUTPUT_FORMAT_VERSION), client_identity: boundIdentitySchema }).strict(),
}).superRefine((value, ctx) => {
  if (value.runtime.platform !== value.runtime.client_identity.platform) ctx.addIssue({code:"custom", message:"Client profile mismatch"});
});
export const normativeReceiptSchema = z.union([
  historicalNormativeReceiptSchema.superRefine((value,ctx) => {
    if (Object.hasOwn(value.runtime,"client_identity")) ctx.addIssue({code:"custom", message:"Historical receipt cannot carry bound identity"});
  }), boundNormativeReceiptSchema,
]);

// Preserve the exported TypeScript surface; runtime validation remains strict.
export type NormativePrincipleEvidence = {
  folio: string;
  status: "A" | "N" | "C";
  anchor?: string | null;
  reason_code?: string | null;
};

export type NormativeReceipt = {
  protocol: typeof NORM_CHECK_PROTOCOL;
  protocol_version: string;
  cycle: { id: string; attempt: number };
  si: {
    version: string;
    git_commit_sha: string;
    git_blob_sha: string;
    sha256: string;
    manifest_sha256: string;
  };
  methodology: {
    version: string;
    git_commit_sha: string;
    git_blob_sha: string;
    sha256: string;
  };
  input_sha256: string;
  nonce: string;
  principles: NormativePrincipleEvidence[];
  output: string;
  output_sha256: string;
  output_header: string;
  methodology_output_header: string;
  evidence_sha256: string;
  created_at: string;
  runtime: NormativeRuntimeContext;
};

export function isNormativeReceipt(value: unknown): value is NormativeReceipt {
  const parsed = normativeReceiptSchema.safeParse(value);
  if (!parsed.success) return false;
  const receipt = parsed.data;
  return receipt.cycle.id.trim().length > 0 &&
    receipt.output_header.trim().length >= 32 &&
    receipt.methodology_output_header.trim().length >= 32 &&
    !Number.isNaN(Date.parse(receipt.created_at));
}
