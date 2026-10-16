import { McpDiagnosticError } from "./mcp-diagnostics";

// Dedicated credential: fine-grained token, Contents: read, selected normative repository only.
// Never reuse a user's MCP Bearer or a broad GITHUB_TOKEN; never send credentials across redirects.
export async function fetchNormativeGithub(url: string, operation: string): Promise<Response> {
  const token = process.env.KHORA_NORM_GITHUB_TOKEN?.trim();
  if (!token) throw new McpDiagnosticError("NORM_GITHUB_CREDENTIAL_MISSING", { authentication: "missing", operation });
  const parsed = new URL(url);
  if (parsed.origin !== "https://api.github.com" || !parsed.pathname.startsWith("/repos/SeryMente/metodologia/") || parsed.username || parsed.password) {
    throw new McpDiagnosticError("NORM_GITHUB_RESPONSE_INVALID");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(parsed, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Khora-NormCheck/0.5.0", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store", redirect: "error", signal: controller.signal });
    if (response.ok) {
      // Consume under the same timeout, cap size, and detach from the aborted fetch before returning.
      const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      if (reader) try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
        if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new McpDiagnosticError("NORM_GITHUB_RESPONSE_INVALID"); } chunks.push(value); }
      } finally { reader.releaseLock(); }
      const body = Buffer.concat(chunks);
      try { JSON.parse(body.toString("utf8")); } catch { throw new McpDiagnosticError("NORM_GITHUB_RESPONSE_INVALID", { authentication: "sent", operation }); }
      return new Response(body, { status: response.status, headers: response.headers });
    }
    const status = response.status;
    const code = status === 401 ? "NORM_GITHUB_CREDENTIAL_REJECTED" : status === 404 ? "NORM_GITHUB_NOT_FOUND_OR_INACCESSIBLE"
      : status === 429 || (status === 403 && (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after"))) ? "NORM_GITHUB_RATE_LIMITED"
      : status === 403 ? "NORM_GITHUB_FORBIDDEN" : status >= 500 ? "NORM_GITHUB_UNAVAILABLE" : "NORM_GITHUB_HTTP_ERROR";
    await response.body?.cancel();
    throw new McpDiagnosticError(code, { upstream_status: status, authentication: "sent", operation });
  } catch (error) {
    if (error instanceof McpDiagnosticError) throw error;
    throw new McpDiagnosticError(controller.signal.aborted ? "NORM_GITHUB_TIMEOUT" : "NORM_GITHUB_NETWORK", { authentication: "sent", operation });
  } finally { clearTimeout(timer); }
}
