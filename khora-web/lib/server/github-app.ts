import "server-only";
import { createSign } from "node:crypto";

export const EP_GITHUB_REPOSITORIES = [
  "metodologia",
  "otrogranprograma",
  "GDP",
  "CENSUS",
  "signal-interpreter",
  "khora",
] as const;

export type EpGitHubInstallationToken = {
  token: string;
  expiresAt: string;
  repositories: string[];
};

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function appJwt(): string {
  const appId = (process.env.GITHUB_APP_ID || "").trim();
  const privateKey = (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!/^\d{1,20}$/.test(appId) || !privateKey.includes("BEGIN") || !privateKey.includes("PRIVATE KEY")) {
    throw new Error("github_app_not_configured");
  }
  const now = Math.floor(Date.now() / 1000);
  const unsigned = base64UrlJson({ alg: "RS256", typ: "JWT" }) + "." +
    base64UrlJson({ iat: now - 30, exp: now + 8 * 60, iss: appId });
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return unsigned + "." + signer.sign(privateKey).toString("base64url");
}

async function githubJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch("https://api.github.com" + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "khora-ep-github-app/1",
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("github_app_request_failed");
  return response.json() as Promise<T>;
}

export async function createEpGitHubInstallationToken(): Promise<EpGitHubInstallationToken> {
  const installationId = (process.env.GITHUB_APP_INSTALLATION_ID || "").trim();
  if (!/^\d{1,30}$/.test(installationId)) throw new Error("github_app_not_configured");

  const installation = await githubJson<{
    token?: string;
    expires_at?: string;
    repositories?: Array<{ name?: string; full_name?: string }>;
  }>(`/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + appJwt(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repository_names: [...EP_GITHUB_REPOSITORIES],
      permissions: { contents: "write", metadata: "read" },
    }),
  });

  const token = typeof installation.token === "string" ? installation.token : "";
  const expiresAt = typeof installation.expires_at === "string" ? installation.expires_at : "";
  const expiry = Date.parse(expiresAt);
  if (!/^ghs_[A-Za-z0-9_]{20,}$/.test(token) || !Number.isFinite(expiry)) {
    throw new Error("github_app_token_invalid");
  }
  const remaining = expiry - Date.now();
  if (remaining <= 0 || remaining > 61 * 60 * 1000) throw new Error("github_app_token_expiry_invalid");

  // Query the effective token itself: configured App permissions are not sufficient evidence.
  const actual = await githubJson<{ repositories?: Array<{ name?: string; full_name?: string; permissions?: { push?: boolean; pull?: boolean } }> }>(
    "/installation/repositories?per_page=100",
    { method: "GET", headers: { Authorization: "Bearer " + token } },
  );
  const names = new Set((actual.repositories || []).map((repo) => (repo.full_name || (repo.name ? "SeryMente/" + repo.name : "")).toLowerCase()));
  const expected = EP_GITHUB_REPOSITORIES.map((name) => ("SeryMente/" + name).toLowerCase());
  if (expected.some((name) => !names.has(name))) throw new Error("github_app_repository_scope_incomplete");

  const khora = (actual.repositories || []).find((repo) => (repo.full_name || "").toLowerCase() === "serymente/khora");
  if (!khora?.permissions?.push) throw new Error("github_app_write_access_required");
  return { token, expiresAt, repositories: expected };
}
