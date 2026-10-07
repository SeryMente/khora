import { createHash } from "crypto";
import { assertNormativeRuntimeContext, type NormativeRuntimeContext } from "./normative-runtime";

export const NORM_CHECK_PROTOCOL = "NORM-CHECK";
export const NORM_CHECK_PROTOCOL_VERSION = "v0.5.0";
export const NORM_CHECK_VERIFIER_VERSION = "norm-check/0.5.0";
const ACCEPTED_PROTOCOL_VERSIONS = new Set([NORM_CHECK_PROTOCOL_VERSION]);
export const CANONICAL_SI_REPOSITORY = "SeryMente/metodologia";
export const CANONICAL_SI_PATH = "SI-METACOGNITIVO.md";
export const CANONICAL_METHODOLOGY_REPOSITORY = "SeryMente/metodologia";
export const CANONICAL_METHODOLOGY_PATH = "METODOLOGIA.md";

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
  output_sha256: string;
  output_header: string;
  methodology_output_header: string;
  evidence_sha256: string;
  created_at: string;
  runtime: NormativeRuntimeContext;
};

export type VerificationResult = {
  status: "VERIFIED" | "INVALID" | "INCOMPLETE";
  reasons: string[];
  cycle_id: string;
  attempt: number;
  si_version: string;
  si_git_commit_sha: string;
  si_git_blob_sha: string;
  manifest_sha256: string;
  methodology_version: string;
  methodology_git_commit_sha: string;
  coverage: {
    expected: number;
    evaluated: number;
    missing: number;
    duplicates: number;
    unknown: number;
    percent: number;
  };
  order_verified: boolean;
  application_log_sha256: string;
  integrity: "PASS" | "FAIL";
};

export type CycleVerificationRecord = {
  schema: "cycle-verification/v1";
  cycle_id: string;
  attempt: number;
  status: "VERIFIED" | "INVALID" | "INCOMPLETE";
  evidence_sha256: string;
  si_version: string;
  si_git_commit_sha: string;
  si_sha256: string;
  manifest_sha256: string;
  order_verified: boolean;
  application_log_sha256: string;
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
  si_git_commit_sha: string;
  si_sha256: string;
  manifest_sha256: string;
  order_verified: boolean;
  application_log_sha256: string;
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
    si_git_commit_sha: input.si_git_commit_sha,
    si_sha256: input.si_sha256,
    manifest_sha256: input.manifest_sha256,
    order_verified: input.order_verified,
    application_log_sha256: input.application_log_sha256,
    verifier_version: input.verifier_version,
    recorded_at: input.recorded_at,
    receipt_id: input.receipt_id ?? null,
  };
}

type ParsedSi = {
  version: string;
  versionName: string;
  lastUpdatedAt: string;
  canonicalUpdatedAt: string;
  gitCommitSha: string;
  sha256: string;
  manifest: ManifestPrinciple[];
  manifestSha256: string;
};

type ParsedMethodology = {
  version: string;
  versionName: string;
  lastUpdatedAt: string;
  canonicalUpdatedAt: string;
  gitCommitSha: string;
  gitBlobSha: string;
  sha256: string;
};

const blobCache = new Map<string, Promise<string>>();
const methodologyBlobCache = new Map<string, Promise<string>>();

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}


type CanonicalSiHistory = {
  sha: string;
  updatedAt: string;
};

async function fetchCanonicalSiHistory(refSha: string): Promise<CanonicalSiHistory> {
  if (!isHex(refSha, 40)) throw new Error("SI_COMMIT_SHA_INVALID");

  const response = await fetch(
    "https://api.github.com/repos/" + CANONICAL_SI_REPOSITORY + "/commits?path=" +
      encodeURIComponent(CANONICAL_SI_PATH) + "&sha=" + refSha + "&per_page=1",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Khora-NormCheck/0.5.0",
      },
      cache: "force-cache",
    },
  );
  if (!response.ok) throw new Error("SI_HISTORY_FETCH_" + response.status);

  const payload = (await response.json()) as Array<{
    sha?: string;
    commit?: {
      committer?: { date?: string | null } | null;
      author?: { date?: string | null } | null;
    };
  }>;

  const latest = payload[0];
  const updatedAt = latest?.commit?.committer?.date || latest?.commit?.author?.date || "";
  if (!latest || !isHex(latest.sha, 40) || !updatedAt || Number.isNaN(Date.parse(updatedAt))) {
    throw new Error("SI_HISTORY_PAYLOAD_INVALID");
  }

  return { sha: latest.sha, updatedAt };
}

async function fetchCanonicalMethodologyHistory(refSha: string): Promise<CanonicalSiHistory> {
  if (!isHex(refSha, 40)) throw new Error("METHODOLOGY_COMMIT_SHA_INVALID");

  const response = await fetch(
    "https://api.github.com/repos/" + CANONICAL_METHODOLOGY_REPOSITORY + "/commits?path=" +
      encodeURIComponent(CANONICAL_METHODOLOGY_PATH) + "&sha=" + refSha + "&per_page=1",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Khora-NormCheck/0.5.0",
      },
      cache: "force-cache",
    },
  );
  if (!response.ok) throw new Error("METHODOLOGY_HISTORY_FETCH_" + response.status);

  const payload = (await response.json()) as Array<{
    sha?: string;
    commit?: {
      committer?: { date?: string | null } | null;
      author?: { date?: string | null } | null;
    };
  }>;

  const latest = payload[0];
  const updatedAt = latest?.commit?.committer?.date || latest?.commit?.author?.date || "";
  if (!latest || !isHex(latest.sha, 40) || !updatedAt || Number.isNaN(Date.parse(updatedAt))) {
    throw new Error("METHODOLOGY_HISTORY_PAYLOAD_INVALID");
  }

  return { sha: latest.sha, updatedAt };
}

function canonicalSiAge(updatedAt: string, at: string): string {
  const updatedMs = Date.parse(updatedAt);
  const atMs = Date.parse(at);
  if (Number.isNaN(updatedMs) || Number.isNaN(atMs)) throw new Error("SI_OUTPUT_DATE_INVALID");

  const elapsedMs = atMs - updatedMs;
  if (elapsedMs < 0) throw new Error("SI_UPDATED_AT_IN_FUTURE");

  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 60) return minutes === 1 ? "hace 1 minuto" : "hace " + minutes + " minutos";

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "hace 1 hora" : "hace " + hours + " horas";

  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "hace 1 día" : "hace " + days + " días";

  return updatedAt.slice(0, 10);
}

export function buildCanonicalSiOutputHeader(
  snapshot: Pick<ParsedSi, "version" | "versionName" | "canonicalUpdatedAt">,
  at: string | Date,
): string {
  const atIso = at instanceof Date ? at.toISOString() : at;
  if (!snapshot.version || !snapshot.versionName || !snapshot.canonicalUpdatedAt) {
    throw new Error("SI_OUTPUT_IDENTITY_INCOMPLETE");
  }

  return (
    "SI CARGADO · " + snapshot.version +
    " — " + snapshot.versionName +
    " · COMPLETO · ACTIVO · ÚLTIMO CAMBIO: " +
    canonicalSiAge(snapshot.canonicalUpdatedAt, atIso) +
    " | " + snapshot.canonicalUpdatedAt.slice(0, 10)
  );
}


export function buildCanonicalMethodologyOutputHeader(
  snapshot: Pick<ParsedMethodology, "version" | "versionName" | "canonicalUpdatedAt">,
  at: string | Date,
): string {
  const atIso = at instanceof Date ? at.toISOString() : at;
  if (!snapshot.version || !snapshot.versionName || !snapshot.canonicalUpdatedAt) {
    throw new Error("METHODOLOGY_OUTPUT_IDENTITY_INCOMPLETE");
  }

  return (
    "METODOLOGÍA CARGADA · " + snapshot.version +
    " — " + snapshot.versionName +
    " · COMPLETA · ACTIVA · ÚLTIMO CAMBIO: " +
    canonicalSiAge(snapshot.canonicalUpdatedAt, atIso) +
    " | " + snapshot.canonicalUpdatedAt.slice(0, 10)
  );
}

function isHex(value: unknown, length: number): value is string {
  return typeof value === "string" && new RegExp("^" + "[a-f0-9]{" + length + "}$").test(value);
}

function extractPrincipleSection(source: string): string {
  const normalized = normalizeText(source);
  const titledStart = normalized.search(/^##\s+4\.\s+Principios fundamentales\s*$/im);

  if (titledStart >= 0) {
    const afterStart = normalized.slice(titledStart);
    const firstLineBreak = afterStart.indexOf("\n");
    const body = firstLineBreak >= 0 ? afterStart.slice(firstLineBreak + 1) : "";
    const nextMajor = body.search(/^##\s+/m);
    if (nextMajor >= 0) {
      return afterStart.slice(0, firstLineBreak + 1 + nextMajor);
    }
    return afterStart;
  }

  // Evolución tolerante: si el SI cambia la numeración/nombre de la sección,
  // localizar directamente el primer bloque de principios y cerrar en el
  // siguiente heading de nivel 2. Nunca se infiere normativa desde narrativa.
  const firstPrinciple = normalized.search(/^###\s+P\d{3}\s+·\s+.+$/m);
  if (firstPrinciple < 0) throw new Error("SI_SECTION_MISSING");

  const afterFirst = normalized.slice(firstPrinciple);
  const firstLineBreak = afterFirst.indexOf("\n");
  const body = firstLineBreak >= 0 ? afterFirst.slice(firstLineBreak + 1) : "";
  const nextMajor = body.search(/^##\s+/m);
  if (nextMajor >= 0) {
    return afterFirst.slice(0, firstLineBreak + 1 + nextMajor);
  }
  return afterFirst;
}

export function parsePrinciples(source: string): ManifestPrinciple[] {
  const section = extractPrincipleSection(source);
  const matches = Array.from(section.matchAll(/^###\s+(P\d{3})\s+·\s+(.+?)\s*$/gm));
  const principles: ManifestPrinciple[] = [];
  const seenFolios = new Set<string>();

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const folio = match[1];
    if (seenFolios.has(folio)) throw new Error("SI_PRINCIPLES_DUPLICATED:" + folio);
    seenFolios.add(folio);

    const start = match.index || 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index || section.length) : section.length;
    const block = normalizeText(section.slice(start, end)).trim();
    const stateMatch = block.match(/\*\*Estado:\*\*\s*([^\n]+)/i);
    const preponderanceMatch = block.match(/\*\*Índice de preponderancia:\*\*\s*([0-9]+(?:\.[0-9]+)?)/i);
    const state = stateMatch ? stateMatch[1].trim() : "";
    const preponderance = preponderanceMatch ? Number(preponderanceMatch[1]) : Number.NaN;

    if (state !== "CANÓNICO") {
      throw new Error("SI_PRINCIPLE_STATE_INVALID:" + folio);
    }
    if (!Number.isFinite(preponderance) || preponderance < 0 || preponderance > 1) {
      throw new Error("SI_PREPONDERANCE_INVALID:" + folio);
    }

    principles.push({
      folio,
      name: match[2].trim(),
      preponderance,
      state,
      sha256: sha256(block),
    });
  }

  if (principles.length === 0) throw new Error("SI_NO_CANONICAL_PRINCIPLES");

  const folios = new Set(principles.map((principle) => principle.folio));
  if (folios.size !== principles.length) throw new Error("SI_PRINCIPLES_DUPLICATED");

  principles.sort(
    (a, b) => b.preponderance - a.preponderance || a.folio.localeCompare(b.folio),
  );
  return principles;
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalizeJson(record[key])])
    );
  }
  return value;
}

function canonicalJsonString(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value));
}

function buildManifestHash(manifest: ManifestPrinciple[]): string {
  return sha256(canonicalJsonString(manifest));
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
          "User-Agent": "Khora-NormCheck/0.5.0",
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


async function fetchMethodologyBlob(blobSha: string): Promise<string> {
  if (!isHex(blobSha, 40)) throw new Error("METHODOLOGY_BLOB_SHA_INVALID");

  const cached = methodologyBlobCache.get(blobSha);
  if (cached) return cached;

  const promise = (async () => {
    const response = await fetch(
      "https://api.github.com/repos/" + CANONICAL_METHODOLOGY_REPOSITORY + "/git/blobs/" + blobSha,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Khora-NormCheck/0.5.0",
        },
        cache: "force-cache",
      },
    );

    if (!response.ok) throw new Error("METHODOLOGY_BLOB_FETCH_" + response.status);

    const payload = (await response.json()) as { encoding?: string; content?: string };
    if (payload.encoding !== "base64" || typeof payload.content !== "string") {
      throw new Error("METHODOLOGY_BLOB_ENCODING_INVALID");
    }

    return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
  })();

  methodologyBlobCache.set(blobSha, promise);
  try {
    return await promise;
  } catch (error) {
    methodologyBlobCache.delete(blobSha);
    throw error;
  }
}

export async function getCurrentSiSnapshot(): Promise<ParsedSi & { gitBlobSha: string }> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const commitResponse = await fetch(
      "https://api.github.com/repos/" + CANONICAL_SI_REPOSITORY + "/commits/main",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Khora-NormCheck/0.5.0",
        },
        cache: "no-store",
      },
    );
    if (!commitResponse.ok) throw new Error("SI_MAIN_FETCH_" + commitResponse.status);
    const commitPayload = (await commitResponse.json()) as { sha?: string };
    if (!isHex(commitPayload.sha, 40)) throw new Error("SI_MAIN_SHA_INVALID");
    const mainSha = commitPayload.sha;

    const response = await fetch(
      "https://api.github.com/repos/" + CANONICAL_SI_REPOSITORY + "/contents/" + CANONICAL_SI_PATH + "?ref=" + mainSha,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Khora-NormCheck/0.5.0",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("SI_CURRENT_FETCH_" + response.status);
    const payload = (await response.json()) as { sha?: string; encoding?: string; content?: string };
    if (!isHex(payload.sha, 40) || payload.encoding !== "base64" || typeof payload.content !== "string") {
      throw new Error("SI_CURRENT_PAYLOAD_INVALID");
    }

    const confirmResponse = await fetch(
      "https://api.github.com/repos/" + CANONICAL_SI_REPOSITORY + "/commits/main",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Khora-NormCheck/0.5.0",
        },
        cache: "no-store",
      },
    );
    if (!confirmResponse.ok) throw new Error("SI_MAIN_CONFIRM_FETCH_" + confirmResponse.status);
    const confirmPayload = (await confirmResponse.json()) as { sha?: string };
    if (!isHex(confirmPayload.sha, 40)) throw new Error("SI_MAIN_CONFIRM_SHA_INVALID");

    if (confirmPayload.sha !== mainSha) {
      if (attempt === 3) throw new Error("SI_MAIN_CHANGED_DURING_SNAPSHOT");
      continue;
    }

    const source = normalizeText(Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8"));
    const versionMatch = source.match(/^\*\*Versión:\*\*\s*(v\d+\.\d+\.\d+)/mi);
    if (!versionMatch) throw new Error("SI_VERSION_MISSING");
    const versionNameMatch = source.match(/^\*\*Nombre de versión:\*\*\s*(.+)$/mi);
    if (!versionNameMatch) throw new Error("SI_VERSION_NAME_MISSING");
    const lastUpdatedMatch = source.match(/^\*\*Última actualización canónica:\*\*\s*(.+)$/mi);
    if (!lastUpdatedMatch) throw new Error("SI_LAST_UPDATED_MISSING");
    const history = await fetchCanonicalSiHistory(mainSha);

    const manifest = parsePrinciples(source);
    return {
      version: versionMatch[1],
      versionName: versionNameMatch[1].trim(),
      lastUpdatedAt: lastUpdatedMatch[1].trim(),
      canonicalUpdatedAt: history.updatedAt,
      gitCommitSha: mainSha,
      sha256: sha256(source),
      manifest,
      manifestSha256: buildManifestHash(manifest),
      gitBlobSha: payload.sha,
    };
  }

  throw new Error("SI_SNAPSHOT_FAILED");
}


export async function getCurrentMethodologySnapshot(): Promise<ParsedMethodology> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const commitResponse = await fetch(
      "https://api.github.com/repos/" + CANONICAL_METHODOLOGY_REPOSITORY + "/commits/main",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Khora-NormCheck/0.5.0",
        },
        cache: "no-store",
      },
    );
    if (!commitResponse.ok) throw new Error("METHODOLOGY_MAIN_FETCH_" + commitResponse.status);
    const commitPayload = (await commitResponse.json()) as { sha?: string };
    if (!isHex(commitPayload.sha, 40)) throw new Error("METHODOLOGY_MAIN_SHA_INVALID");
    const mainSha = commitPayload.sha;

    const response = await fetch(
      "https://api.github.com/repos/" + CANONICAL_METHODOLOGY_REPOSITORY + "/contents/" + CANONICAL_METHODOLOGY_PATH + "?ref=" + mainSha,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Khora-NormCheck/0.5.0",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("METHODOLOGY_CURRENT_FETCH_" + response.status);
    const payload = (await response.json()) as { sha?: string; encoding?: string; content?: string };
    if (!isHex(payload.sha, 40) || payload.encoding !== "base64" || typeof payload.content !== "string") {
      throw new Error("METHODOLOGY_CURRENT_PAYLOAD_INVALID");
    }

    const confirmResponse = await fetch(
      "https://api.github.com/repos/" + CANONICAL_METHODOLOGY_REPOSITORY + "/commits/main",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Khora-NormCheck/0.5.0",
        },
        cache: "no-store",
      },
    );
    if (!confirmResponse.ok) throw new Error("METHODOLOGY_MAIN_CONFIRM_FETCH_" + confirmResponse.status);
    const confirmPayload = (await confirmResponse.json()) as { sha?: string };
    if (!isHex(confirmPayload.sha, 40)) throw new Error("METHODOLOGY_MAIN_CONFIRM_SHA_INVALID");

    if (confirmPayload.sha !== mainSha) {
      if (attempt === 3) throw new Error("METHODOLOGY_MAIN_CHANGED_DURING_SNAPSHOT");
      continue;
    }

    const source = normalizeText(Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8"));
    const versionMatch = source.match(/^- \\*\\*Versión:\\*\\*\\s*(v\\d+\\.\\d+\\.\\d+)/mi);
    if (!versionMatch) throw new Error("METHODOLOGY_VERSION_MISSING");
    const versionNameMatch = source.match(/^- \\*\\*Nombre de versión:\\*\\*\\s*(.+)$/mi);
    if (!versionNameMatch) throw new Error("METHODOLOGY_VERSION_NAME_MISSING");
    const lastUpdatedMatch = source.match(/^- \\*\\*Última actualización canónica:\\*\\*\\s*(.+)$/mi);
    if (!lastUpdatedMatch) throw new Error("METHODOLOGY_LAST_UPDATED_MISSING");
    const history = await fetchCanonicalMethodologyHistory(mainSha);

    return {
      version: versionMatch[1],
      versionName: versionNameMatch[1].trim(),
      lastUpdatedAt: lastUpdatedMatch[1].trim(),
      canonicalUpdatedAt: history.updatedAt,
      gitCommitSha: mainSha,
      gitBlobSha: payload.sha,
      sha256: sha256(source),
    };
  }

  throw new Error("METHODOLOGY_SNAPSHOT_FAILED");
}

export async function loadMethodologySnapshot(blobSha: string, gitCommitSha: string): Promise<ParsedMethodology> {
  const source = normalizeText(await fetchMethodologyBlob(blobSha));
  const versionMatch = source.match(/^- \\*\\*Versión:\\*\\*\\s*(v\\d+\\.\\d+\\.\\d+)/mi);
  if (!versionMatch) throw new Error("METHODOLOGY_VERSION_MISSING");
  const versionNameMatch = source.match(/^- \\*\\*Nombre de versión:\\*\\*\\s*(.+)$/mi);
  if (!versionNameMatch) throw new Error("METHODOLOGY_VERSION_NAME_MISSING");
  const lastUpdatedMatch = source.match(/^- \\*\\*Última actualización canónica:\\*\\*\\s*(.+)$/mi);
  if (!lastUpdatedMatch) throw new Error("METHODOLOGY_LAST_UPDATED_MISSING");
  const history = await fetchCanonicalMethodologyHistory(gitCommitSha);

  return {
    version: versionMatch[1],
    versionName: versionNameMatch[1].trim(),
    lastUpdatedAt: lastUpdatedMatch[1].trim(),
    canonicalUpdatedAt: history.updatedAt,
    gitCommitSha,
    gitBlobSha: blobSha,
    sha256: sha256(source),
  };
}

export async function loadSiSnapshot(blobSha: string, gitCommitSha: string): Promise<ParsedSi> {
  const source = normalizeText(await fetchSiBlob(blobSha));
  const versionMatch = source.match(/^\*\*Versión:\*\*\s*(v\d+\.\d+\.\d+)/mi);
  if (!versionMatch) throw new Error("SI_VERSION_MISSING");
  const versionNameMatch = source.match(/^\*\*Nombre de versión:\*\*\s*(.+)$/mi);
  if (!versionNameMatch) throw new Error("SI_VERSION_NAME_MISSING");
  const lastUpdatedMatch = source.match(/^\*\*Última actualización canónica:\*\*\s*(.+)$/mi);
  if (!lastUpdatedMatch) throw new Error("SI_LAST_UPDATED_MISSING");
  const history = await fetchCanonicalSiHistory(gitCommitSha);

  const manifest = parsePrinciples(source);
  return {
    version: versionMatch[1],
    versionName: versionNameMatch[1].trim(),
    lastUpdatedAt: lastUpdatedMatch[1].trim(),
    canonicalUpdatedAt: history.updatedAt,
    gitCommitSha,
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
  if (!si || typeof si.version !== "string" || !isHex(si.git_commit_sha, 40) || !isHex(si.git_blob_sha, 40) || !isHex(si.sha256, 64) || !isHex(si.manifest_sha256, 64)) return false;
  const methodology = value.methodology as Record<string, unknown> | undefined;
  if (!methodology || typeof methodology.version !== "string" || !isHex(methodology.git_commit_sha, 40) || !isHex(methodology.git_blob_sha, 40) || !isHex(methodology.sha256, 64)) return false;
  if (!isHex(value.input_sha256, 64) || !isHex(value.output_sha256, 64)) return false;
  if (typeof value.nonce !== "string" || value.nonce.length < 16 || value.nonce.length > 128) return false;
  if (!isHex(value.evidence_sha256, 64)) return false;
  if (!Array.isArray(value.principles) || value.principles.length === 0) return false;
  if (typeof value.created_at !== "string" || value.created_at.length < 10 || Number.isNaN(Date.parse(value.created_at))) return false;
  if (typeof value.output_header !== "string" || value.output_header.trim().length < 32) return false;
  if (typeof value.methodology_output_header !== "string" || value.methodology_output_header.trim().length < 32) return false;
  try {
    assertNormativeRuntimeContext(value.runtime);
  } catch {
    return false;
  }

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
      git_commit_sha: receipt.si.git_commit_sha,
      git_blob_sha: receipt.si.git_blob_sha,
      sha256: receipt.si.sha256,
      manifest_sha256: receipt.si.manifest_sha256,
    },
    input_sha256: receipt.input_sha256,
    methodology: {
      version: receipt.methodology.version,
      git_commit_sha: receipt.methodology.git_commit_sha,
      git_blob_sha: receipt.methodology.git_blob_sha,
      sha256: receipt.methodology.sha256,
    },
    nonce: receipt.nonce,
    principles: receipt.principles.map((item) => ({
      folio: item.folio,
      status: item.status,
      anchor: item.anchor || null,
      reason_code: item.reason_code || null,
    })),
    output_sha256: receipt.output_sha256,
    output_header: receipt.output_header,
    methodology_output_header: receipt.methodology_output_header,
    created_at: receipt.created_at,
    runtime: {
      platform: receipt.runtime.platform,
      reasoning_mode: receipt.runtime.reasoning_mode,
      output_format_version: receipt.runtime.output_format_version,
    },
  };
  return sha256(canonicalJsonString(canonical));
}

export async function verifyNormativeReceipt(
  input: unknown,
  serverApplicationVector?: NormativePrincipleEvidence[],
  outputHeaderAt?: string,
): Promise<VerificationResult> {
  if (!validateBasicReceipt(input)) {
    return {
      status: "INVALID",
      reasons: ["RECEIPT_SCHEMA_INVALID"],
      cycle_id: "UNKNOWN",
      attempt: 0,
      si_version: "",
      si_git_commit_sha: "",
      si_git_blob_sha: "",
      manifest_sha256: "",
      methodology_version: "",
      methodology_git_commit_sha: "",
      coverage: { expected: 0, evaluated: 0, missing: 0, duplicates: 0, unknown: 0, percent: 0 },
      order_verified: false,
      application_log_sha256: "",
      integrity: "FAIL",
    };
  }

  const receipt = input as NormativeReceipt;
  let snapshot: ParsedSi;
  let methodologySnapshot: ParsedMethodology;
  try {
    snapshot = await loadSiSnapshot(receipt.si.git_blob_sha, receipt.si.git_commit_sha);
    methodologySnapshot = await loadMethodologySnapshot(receipt.methodology.git_blob_sha, receipt.methodology.git_commit_sha);
  } catch (error) {
    return {
      status: "INVALID",
      reasons: [error instanceof Error ? error.message : "SI_SNAPSHOT_UNAVAILABLE"],
      cycle_id: receipt.cycle.id,
      attempt: receipt.cycle.attempt,
      si_version: receipt.si.version,
      si_git_commit_sha: receipt.si.git_commit_sha,
      si_git_blob_sha: receipt.si.git_blob_sha,
      manifest_sha256: receipt.si.manifest_sha256,
      coverage: { expected: 0, evaluated: 0, missing: 0, duplicates: 0, unknown: 0, percent: 0 },
      order_verified: false,
      application_log_sha256: "",
      integrity: "FAIL",
    };
  }

  const reasons: string[] = [];
  const headerAt = outputHeaderAt || receipt.created_at;
  const expectedOutputHeader = buildCanonicalSiOutputHeader(snapshot, headerAt);
  const expectedMethodologyOutputHeader = buildCanonicalMethodologyOutputHeader(methodologySnapshot, headerAt);
  if (receipt.output_header !== expectedOutputHeader) reasons.push("OUTPUT_HEADER_MISMATCH");
  if (receipt.methodology_output_header !== expectedMethodologyOutputHeader) reasons.push("METHODOLOGY_OUTPUT_HEADER_MISMATCH");
  if (receipt.si.version !== snapshot.version) reasons.push("SI_VERSION_MISMATCH");
  if (receipt.si.sha256 !== snapshot.sha256) reasons.push("SI_SHA256_MISMATCH");
  if (receipt.si.manifest_sha256 !== snapshot.manifestSha256) reasons.push("MANIFEST_SHA256_MISMATCH");
  if (receipt.methodology.version !== methodologySnapshot.version) reasons.push("METHODOLOGY_VERSION_MISMATCH");
  if (receipt.methodology.sha256 !== methodologySnapshot.sha256) reasons.push("METHODOLOGY_SHA256_MISMATCH");

  const expectedFolios = new Set(snapshot.manifest.map((p) => p.folio));
  const seen = new Set<string>();
  let duplicates = 0;
  let unknown = 0;
  let evaluated = 0;

  for (const evidence of receipt.principles) {
    if (seen.has(evidence.folio)) {
      duplicates += 1;
      continue;
    }
    seen.add(evidence.folio);
    if (expectedFolios.has(evidence.folio)) {
      evaluated += 1;
    } else {
      unknown += 1;
    }
  }

  const expected = snapshot.manifest.length;
  const missing = expected - evaluated;
  const percent = expected === 0 ? 0 : Math.round((evaluated / expected) * 10000) / 100;
  const expectedOrder = snapshot.manifest.map((principle) => principle.folio);
  const actualOrder = receipt.principles.map((principle) => principle.folio);
  const receiptOrderVerified =
    actualOrder.length === expectedOrder.length &&
    actualOrder.every((folio, index) => folio === expectedOrder[index]);

  const serverOrderVerified = serverApplicationVector
    ? serverApplicationVector.length === expectedOrder.length &&
      serverApplicationVector.every((item, index) => item.folio === expectedOrder[index])
    : false;

  const serverMatchesReceipt = serverApplicationVector
    ? serverApplicationVector.length === receipt.principles.length &&
      serverApplicationVector.every((item, index) => {
        const received = receipt.principles[index];
        return item.folio === received.folio &&
          item.status === received.status &&
          (item.anchor || null) === (received.anchor || null) &&
          (item.reason_code || null) === (received.reason_code || null);
      })
    : false;

  const orderVerified = receiptOrderVerified && (!serverApplicationVector || (serverOrderVerified && serverMatchesReceipt));

  if (missing > 0) reasons.push("PRINCIPLES_MISSING");
  if (duplicates > 0) reasons.push("PRINCIPLES_DUPLICATED");
  if (unknown > 0) reasons.push("PRINCIPLES_UNKNOWN");
  if (!orderVerified) reasons.push("PRINCIPLES_ORDER_MISMATCH");

  const applicationLogSha256 = serverApplicationVector
    ? sha256(canonicalJsonString(serverApplicationVector))
    : "";

  if (serverApplicationVector && serverApplicationVector.length < expected) reasons.push("APPLICATION_LOG_INCOMPLETE");
  if (serverApplicationVector && !serverMatchesReceipt) reasons.push("APPLICATION_LOG_MISMATCH");

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
    si_git_commit_sha: receipt.si.git_commit_sha,
    si_git_blob_sha: receipt.si.git_commit_sha,
    manifest_sha256: receipt.si.manifest_sha256,
    methodology_version: receipt.methodology.version,
    methodology_git_commit_sha: receipt.methodology.git_commit_sha,
    coverage: { expected, evaluated, missing, duplicates, unknown, percent },
    order_verified: orderVerified,
    application_log_sha256: applicationLogSha256,
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
  };
}
