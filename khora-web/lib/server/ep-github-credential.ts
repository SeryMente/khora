import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { getDb } from "@/lib/server/neon";

export const EP_REQUIRED_GITHUB_REPOSITORIES = [
  "CENSUS",
  "GDP",
  "metodologia",
  "otrogranprograma",
  "signal-interpreter",
  "khora",
] as const;

export type EpGitHubCredentialStatus = {
  configured: boolean;
  githubLogin: string | null;
  tokenSuffix: string | null;
  repositories: Array<{ name: string; read: boolean; write: boolean }>;
  updatedAt: string | null;
};

export class EpGitHubCredentialError extends Error {
  constructor(public readonly code: "invalid_token_format" | "github_token_rejected" | "github_repo_access_missing" | "credential_vault_unavailable") {
    super(code);
    this.name = "EpGitHubCredentialError";
  }
}

function encryptionKey(): Buffer {
  const secret = (process.env.EP_BOOTSTRAP_JWT_SECRET || "").trim();
  if (secret.length < 32) throw new EpGitHubCredentialError("credential_vault_unavailable");
  // Domain-separated key derivation keeps the ciphertext separate from JWT signing use.
  return createHmac("sha256", secret).update("khora-ep-github-credential-v1", "utf8").digest();
}

function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptToken(value: string): string {
  const [version, ivText, tagText, ciphertextText, extra] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText || extra !== undefined) {
    throw new EpGitHubCredentialError("credential_vault_unavailable");
  }
  try {
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    const ciphertext = Buffer.from(ciphertextText, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length < 20) throw new Error("invalid_ciphertext");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new EpGitHubCredentialError("credential_vault_unavailable");
  }
}

async function githubRequest<T>(path: string, token: string): Promise<T> {
  const response = await fetch("https://api.github.com" + path, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "khora-ep-credential-vault/1",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    if (path === "/user") throw new EpGitHubCredentialError("github_token_rejected");
    throw new EpGitHubCredentialError("github_repo_access_missing");
  }
  return response.json() as Promise<T>;
}

async function validateToken(token: string) {
  if (!/^(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$/.test(token)) {
    throw new EpGitHubCredentialError("invalid_token_format");
  }
  let user: { login?: unknown };
  try {
    user = await githubRequest<{ login?: unknown }>("/user", token);
  } catch (error) {
    if (error instanceof EpGitHubCredentialError) throw error;
    throw new EpGitHubCredentialError("github_token_rejected");
  }
  if (typeof user.login !== "string" || !/^[A-Za-z0-9-]{1,39}$/.test(user.login)) {
    throw new EpGitHubCredentialError("github_token_rejected");
  }

  const repositories = await Promise.all(EP_REQUIRED_GITHUB_REPOSITORIES.map(async (name) => {
    const repository = await githubRequest<{
      full_name?: unknown;
      permissions?: { pull?: unknown; push?: unknown; maintain?: unknown; admin?: unknown };
    }>("/repos/SeryMente/" + encodeURIComponent(name), token);
    const actualName = typeof repository.full_name === "string" ? repository.full_name.toLowerCase() : "";
    if (actualName !== ("serymente/" + name).toLowerCase()) throw new EpGitHubCredentialError("github_repo_access_missing");
    const permissions = repository.permissions || {};
    const read = permissions.pull === true || permissions.push === true || permissions.maintain === true || permissions.admin === true;
    const write = permissions.push === true || permissions.maintain === true || permissions.admin === true;
    if (!read || !write) throw new EpGitHubCredentialError("github_repo_access_missing");
    return { name, read, write };
  }));
  return { githubLogin: user.login, repositories };
}

export async function saveEpGitHubCredential(tokenInput: string, updatedBy: string): Promise<EpGitHubCredentialStatus> {
  const token = tokenInput.trim();
  const validated = await validateToken(token);
  const encrypted = encryptToken(token);
  try {
    await getDb().query(
      `INSERT INTO ep_github_credential_vault(singleton_id,ciphertext,github_login,token_suffix,repository_access,updated_by,updated_at)
       VALUES(1,$1,$2,$3,$4::jsonb,$5,NOW())
       ON CONFLICT(singleton_id) DO UPDATE SET ciphertext=EXCLUDED.ciphertext,github_login=EXCLUDED.github_login,
       token_suffix=EXCLUDED.token_suffix,repository_access=EXCLUDED.repository_access,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,
      [encrypted, validated.githubLogin, token.slice(-4), JSON.stringify(validated.repositories), updatedBy.trim().toLowerCase()],
    );
  } catch {
    throw new EpGitHubCredentialError("credential_vault_unavailable");
  }
  return getEpGitHubCredentialStatus();
}

export async function getStoredEpGitHubToken(): Promise<string> {
  let result;
  try {
    result = await getDb().query(
      "SELECT ciphertext FROM ep_github_credential_vault WHERE singleton_id=1",
    );
  } catch {
    throw new EpGitHubCredentialError("credential_vault_unavailable");
  }
  if (!result.rowCount || typeof result.rows[0]?.ciphertext !== "string") {
    throw new EpGitHubCredentialError("credential_vault_unavailable");
  }
  return decryptToken(String(result.rows[0].ciphertext));
}

export async function getEpGitHubCredentialStatus(): Promise<EpGitHubCredentialStatus> {
  let result;
  try {
    result = await getDb().query(
      "SELECT github_login,token_suffix,repository_access,updated_at FROM ep_github_credential_vault WHERE singleton_id=1",
    );
  } catch {
    throw new EpGitHubCredentialError("credential_vault_unavailable");
  }
  if (!result.rowCount) return { configured: false, githubLogin: null, tokenSuffix: null, repositories: [], updatedAt: null };
  const row = result.rows[0];
  const repositories = Array.isArray(row.repository_access) ? row.repository_access : [];
  return {
    configured: true,
    githubLogin: String(row.github_login),
    tokenSuffix: String(row.token_suffix),
    repositories: repositories.filter((entry: any) => entry && typeof entry.name === "string").map((entry: any) => ({
      name: String(entry.name),
      read: entry.read === true,
      write: entry.write === true,
    })),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ""),
  };
}

export async function deleteEpGitHubCredential(): Promise<void> {
  try {
    await getDb().query("DELETE FROM ep_github_credential_vault WHERE singleton_id=1");
  } catch {
    throw new EpGitHubCredentialError("credential_vault_unavailable");
  }
}

export async function verifyEpGitHubCredentialStillWorks(): Promise<boolean> {
  try {
    const token = await getStoredEpGitHubToken();
    const user = await githubRequest<{ login?: unknown }>("/user", token);
    const status = await getEpGitHubCredentialStatus();
    return typeof user.login === "string" && user.login === status.githubLogin;
  } catch { return false; }
}
