import { createHash } from "crypto";

export const NORM_CHECK_PROTOCOL = "NORM-CHECK";
export const NORM_CHECK_PROTOCOL_VERSION = "v0.2.0";
export const LEGACY_NORM_CHECK_PROTOCOL_VERSION = "v0.1.0";
export const NORM_CHECK_VERIFIER_VERSION = "norm-check/0.2.0";
const ACCEPTED_PROTOCOL_VERSIONS = new Set([
  LEGACY_NORM_CHECK_PROTOCOL_VERSION,
  NORM_CHECK_PROTOCOL_VERSION,
]);
export const CANONICAL_SI_REPOSITORY = "SeryMente/metodologia";
export const CANONICAL_SI_PATH = "SI-METACOGNITIVO.md";

type ManifestPrinciple = {
  folio: string;
  name: string;
  preponderance: number;
  state: string;
  sha256: string;
};

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
    git_blob_sha: string;
    sha256: string;
    manifest_sha256: string;
  };
  input_sha256: string;
  nonce: string;
  principles: NormativePrincipleEvidence[];
  output_sha256: string;
  evidence_sha256: string;
  created_at: string;
};

export type VerificationResult = {
  status: "VERIFIED" | "INVALID" | "INCOMPLETE";
  reasons: string[];
  cycle_id: string;
  attempt: number;
  si_version: string;
  si_git_blob_sha: string;
  manifest_sha256: string;
  coverage: {
    expected: number;
    evaluated: number;
    missing: number;
    duplicates: number;
    unknown: number;
    percent: number;
  };
  integrity: "PASS" | "FAIL";
};

export type CycleVerificationRecord = {
  schema: "cycle-verification/v1";
  cycle_id: string;
  attempt: number;
  status: "VERIFIED" | "INVALID" | "INCOMPLETE";
  evidence_sha256: string;
  si_version: string;
  si_sha256: string;
  manifest_sha256: string;
  verifier_version: string;
  recorded_at: string;
  receipt_id: string | null;
};

export function buildCycleVerificationRecord(input: {
  cycle_id: string;
  attempt: number;
  status: "VERIFIED" | "INVALID" | "INCOMPLETE";
  evidence_sha256: string;
  si_version: string;
  si_sha256: string;
  manifest_sha256: string;
  verifier_version: string;
  recorded_at: string;
  receipt_id?: string | null;
}): CycleVerificationRecord {
  return {
    schema: "cycle-verification/v1",
    cycle_id: input.cycle_id,
    attempt: input.attempt,
    status: input.status,
    evidence_sha256: input.evidence_sha256,
    si_version: input.si_version,
    si_sha256: input.si_sha256,
    manifest_sha256: input.manifest_sha256,
    verifier_version: input.verifier_version,
    recorded_at: input.recorded_at,
    receipt_id: input.receipt_id ?? null,
  };
}

type ParsedSi = {
  version: string;
  versionName: string;
  lastUpdatedAt: string;
  sha256: string;
  manifest: ManifestPrinciple[];
  manifestSha256: string;
};

const blobCache = new Map<string, Promise<string>>();

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isHex(value: unknown, length: number): value is string {
  return typeof value === "string" && new RegExp("^" + "[a-f0-9]{" + length + "}$").test(value);
}

function parsePrinciples(source: string): ManifestPrinciple[] {
  const sectionStart = source.indexOf("## 4. Principios fundamentales");
  if (sectionStart < 0) throw new Error("SI_SECTION_MISSING");

  const afterStart = source.slice(sectionStart);
  const nextMajor = afterStart.search(/\n##\s+5\./);
  const section = nextMajor >= 0 ? afterStart.slice(0, nextMajor) : afterStart;

  const matches = Array.from(section.matchAll(/^###\s+(P\d{3})\s+·\s+(.+?)\s*$/gm));
  const principles: ManifestPrinciple[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const start = match.index || 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index || section.length) : section.length;
    const block = normalizeText(section.slice(start, end)).trim();
    const stateMatch = block.match(/\*\*Estado:\*\*\s*([^\n]+)/i);
    const preponderanceMatch = block.match(/\*\*Índice de preponderancia:\*\*\s*([0-9]+(?:\.[0-9]+)?)/i);
    const state = stateMatch ? stateMatch[1].trim() : "";
    const preponderance = preponderanceMatch ? Number(preponderanceMatch[1]) : Number.NaN;

    if (state === "CANÓNICO" && Number.isFinite(preponderance)) {
      principles.push({
        folio: match[1],
        name: match[2].trim(),
        preponderance,
        state,
        sha256: sha256(block),
      });
    }
  }

  if (principles.length === 0) throw new Error("SI_NO_CANONICAL_PRINCIPLES");
  principles.sort((a, b) => a.folio.localeCompare(b.folio));
  return principles;
}

function buildManifestHash(manifest: ManifestPrinciple[]): string {
  return sha256(JSON.stringify(manifest));
}

export async function fetchSiBlob(blobSha: string): Promise<string> {
  if (!isHex(blobSha, 40)) throw new Error("SI_BLOB_SHA_INVALID");

  const cached = blobCache.get(blobSha);
  if (cached) return cached;

  const promise = (async () => {
    const response = await fetch(
      "https://api.github.com/repos/" + CANONICAL_SI_REPOSITORY + "/git/blobs/" + blobSha,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Khora-NormCheck/0.2.0",
        },
        cache: "force-cache",
      },
    );

    if (!response.ok) throw new Error("SI_BLOB_FETCH_" + response.status);

    const payload = (await response.json()) as { encoding?: string; content?: string };
    if (payload.encoding !== "base64" || typeof payload.content !== "string") {
      throw new Error("SI_BLOB_ENCODING_INVALID");
    }

    return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
  })();

  blobCache.set(blobSha, promise);
  try {
    return await promise;
  } catch (error) {
    blobCache.delete(blobSha);
    throw error;
  }
}

export async function getCurrentSiSnapshot(): Promise<ParsedSi & { gitBlobSha: string }> {
  const response = await fetch(
    "https://api.github.com/repos/" + CANONICAL_SI_REPOSITORY + "/contents/" + CANONICAL_SI_PATH + "?ref=main",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Khora-NormCheck/0.2.0",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("SI_CURRENT_FETCH_" + response.status);
  const payload = (await response.json()) as { sha?: string; encoding?: string; content?: string };
  if (!isHex(payload.sha, 40) || payload.encoding !== "base64" || typeof payload.content !== "string") {
    throw new Error("SI_CURRENT_PAYLOAD_INVALID");
  }
  const source = normalizeText(Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8"));
  const versionMatch = source.match(/^\*\*Versión:\*\*\s*(v\d+\.\d+\.\d+)/mi);
  if (!versionMatch) throw new Error("SI_VERSION_MISSING");
  const versionNameMatch = source.match(/^\*\*Nombre de versión:\*\*\s*(.+)$/mi);
  const lastUpdatedMatch = source.match(/^\*\*Última actualización canónica:\*\*\s*(.+)$/mi);
  const manifest = parsePrinciples(source);
  return {
    version: versionMatch[1],
    versionName: versionNameMatch ? versionNameMatch[1].trim() : "",
    lastUpdatedAt: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : "",
    sha256: sha256(source),
    manifest,
    manifestSha256: buildManifestHash(manifest),
    gitBlobSha: payload.sha,
  };
}

export async function loadSiSnapshot(blobSha: string): Promise<ParsedSi> {
  const source = normalizeText(await fetchSiBlob(blobSha));
  const versionMatch = source.match(/^\*\*Versión:\*\*\s*(v\d+\.\d+\.\d+)/mi);
  if (!versionMatch) throw new Error("SI_VERSION_MISSING");
  const versionNameMatch = source.match(/^\*\*Nombre de versión:\*\*\s*(.+)$/mi);
  const lastUpdatedMatch = source.match(/^\*\*Última actualización canónica:\*\*\s*(.+)$/mi);

  const manifest = parsePrinciples(source);
  return {
    version: versionMatch[1],
    versionName: versionNameMatch ? versionNameMatch[1].trim() : "",
    lastUpdatedAt: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : "",
    sha256: sha256(source),
    manifest,
    manifestSha256: buildManifestHash(manifest),
  };
}

function validateBasicReceipt(receipt: unknown): receipt is NormativeReceipt {
  if (!receipt || typeof receipt !== "object") return false;
  const value = receipt as Record<string, unknown>;
  const cycle = value.cycle as Record<string, unknown> | undefined;
  const si = value.si as Record<string, unknown> | undefined;

  if (value.protocol !== NORM_CHECK_PROTOCOL || typeof value.protocol_version !== "string" || !ACCEPTED_PROTOCOL_VERSIONS.has(value.protocol_version)) return false;
  if (!cycle || typeof cycle.id !== "string" || cycle.id.trim().length === 0) return false;
  if (!Number.isInteger(cycle.attempt) || Number(cycle.attempt) < 1) return false;
  if (!si || typeof si.version !== "string" || !isHex(si.git_blob_sha, 40) || !isHex(si.sha256, 64) || !isHex(si.manifest_sha256, 64)) return false;
  if (!isHex(value.input_sha256, 64) || !isHex(value.output_sha256, 64)) return false;
  if (typeof value.nonce !== "string" || value.nonce.length < 16 || value.nonce.length > 128) return false;
  if (!isHex(value.evidence_sha256, 64)) return false;
  if (!Array.isArray(value.principles) || value.principles.length === 0) return false;
  if (typeof value.created_at !== "string" || value.created_at.length < 10) return false;

  for (const raw of value.principles) {
    if (!raw || typeof raw !== "object") return false;
    const principle = raw as Record<string, unknown>;
    if (typeof principle.folio !== "string") return false;
    if (principle.status !== "A" && principle.status !== "N" && principle.status !== "C") return false;
    if ((principle.status === "A" || principle.status === "C") &&
      (typeof principle.anchor !== "string" || !/^[A-Za-z][A-Za-z0-9._:-]{0,63}$/.test(principle.anchor))) return false;
    if (principle.status === "N" &&
      (typeof principle.reason_code !== "string" || !/^[A-Z0-9_:-]{1,32}$/.test(principle.reason_code))) return false;
  }

  return true;
}

function computeEvidenceHash(receipt: NormativeReceipt): string {
  const canonical = {
    protocol: receipt.protocol,
    protocol_version: receipt.protocol_version,
    cycle: { id: receipt.cycle.id, attempt: receipt.cycle.attempt },
    si: {
      version: receipt.si.version,
      git_blob_sha: receipt.si.git_blob_sha,
      sha256: receipt.si.sha256,
      manifest_sha256: receipt.si.manifest_sha256,
    },
    input_sha256: receipt.input_sha256,
    nonce: receipt.nonce,
    principles: [...receipt.principles]
      .map((item) => ({
        folio: item.folio,
        status: item.status,
        anchor: item.anchor || null,
        reason_code: item.reason_code || null,
      }))
      .sort((a, b) => a.folio.localeCompare(b.folio)),
    output_sha256: receipt.output_sha256,
    created_at: receipt.created_at,
  };
  return sha256(JSON.stringify(canonical));
}

export async function verifyNormativeReceipt(input: unknown): Promise<VerificationResult> {
  if (!validateBasicReceipt(input)) {
    return {
      status: "INVALID",
      reasons: ["RECEIPT_SCHEMA_INVALID"],
      cycle_id: "UNKNOWN",
      attempt: 0,
      si_version: "",
      si_git_blob_sha: "",
      manifest_sha256: "",
      coverage: { expected: 0, evaluated: 0, missing: 0, duplicates: 0, unknown: 0, percent: 0 },
      integrity: "FAIL",
    };
  }

  const receipt = input as NormativeReceipt;
  let snapshot: ParsedSi;
  try {
    snapshot = await loadSiSnapshot(receipt.si.git_blob_sha);
  } catch (error) {
    return {
      status: "INVALID",
      reasons: [error instanceof Error ? error.message : "SI_SNAPSHOT_UNAVAILABLE"],
      cycle_id: receipt.cycle.id,
      attempt: receipt.cycle.attempt,
      si_version: receipt.si.version,
      si_git_blob_sha: receipt.si.git_blob_sha,
      manifest_sha256: receipt.si.manifest_sha256,
      coverage: { expected: 0, evaluated: 0, missing: 0, duplicates: 0, unknown: 0, percent: 0 },
      integrity: "FAIL",
    };
  }

  const reasons: string[] = [];
  if (receipt.si.version !== snapshot.version) reasons.push("SI_VERSION_MISMATCH");
  if (receipt.si.sha256 !== snapshot.sha256) reasons.push("SI_SHA256_MISMATCH");
  if (receipt.si.manifest_sha256 !== snapshot.manifestSha256) reasons.push("MANIFEST_SHA256_MISMATCH");

  const expectedFolios = new Set(snapshot.manifest.map((p) => p.folio));
  const seen = new Set<string>();
  let duplicates = 0;
  let unknown = 0;

  for (const evidence of receipt.principles) {
    if (seen.has(evidence.folio)) {
      duplicates += 1;
      continue;
    }
    seen.add(evidence.folio);
    if (!expectedFolios.has(evidence.folio)) unknown += 1;
  }

  const missing = snapshot.manifest.filter((p) => !seen.has(p.folio)).length;
  const evaluated = seen.size;
  const expected = snapshot.manifest.length;
  const percent = expected === 0 ? 0 : Math.round((evaluated / expected) * 10000) / 100;

  if (missing > 0) reasons.push("PRINCIPLES_MISSING");
  if (duplicates > 0) reasons.push("PRINCIPLES_DUPLICATED");
  if (unknown > 0) reasons.push("PRINCIPLES_UNKNOWN");

  if (computeEvidenceHash(receipt) !== receipt.evidence_sha256) reasons.push("EVIDENCE_SHA256_MISMATCH");

  const integrity: "PASS" | "FAIL" =
    reasons.some((reason) => reason.indexOf("SHA256") >= 0) ? "FAIL" : "PASS";

  const status: "VERIFIED" | "INVALID" | "INCOMPLETE" =
    reasons.length === 0 ? "VERIFIED" : (missing > 0 || duplicates > 0 || unknown > 0 ? "INCOMPLETE" : "INVALID");

  return {
    status,
    reasons,
    cycle_id: receipt.cycle.id,
    attempt: receipt.cycle.attempt,
    si_version: receipt.si.version,
    si_git_blob_sha: receipt.si.git_blob_sha,
    manifest_sha256: receipt.si.manifest_sha256,
    coverage: { expected, evaluated, missing, duplicates, unknown, percent },
    integrity,
  };
}

export function getCurrentVerifierInfo() {
  return {
    protocol: NORM_CHECK_PROTOCOL,
    protocol_version: NORM_CHECK_PROTOCOL_VERSION,
    verifier_version: NORM_CHECK_VERIFIER_VERSION,
    si_repository: CANONICAL_SI_REPOSITORY,
    si_path: CANONICAL_SI_PATH,
    si_version_name: "Identidad Versionada y Vigencia Canónica",
    si_last_updated_at: "2026-10-06T16:42:13-06:00",
  };
}
