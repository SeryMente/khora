import { getMcpReadOnlyDb } from "@/lib/server/mcp-db";
import { McpDiagnosticError } from "@/lib/server/mcp-diagnostics";

export type JulesAccessMode = "read" | "write";
export interface JulesSourceGrant { source: string; branch: string }

function validSubject(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 320;
}

function validResource(source: string, branch: string): boolean {
  return typeof source === "string" &&
    /^sources\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(source) &&
    !source.split("/").some(part => part === "." || part === "..") &&
    typeof branch === "string" && branch.length > 0 &&
    branch.length <= 255 && branch === branch.trim();
}

/** Read-only lookup; ACL outages fail closed and are never bypassed. */
export async function listJulesSourceGrants(subject: string, mode: JulesAccessMode): Promise<JulesSourceGrant[]> {
  if (!validSubject(subject)) throw new McpDiagnosticError("JULES_ACCESS_DENIED");
  const allowedColumn = mode === "read" ? "read_allowed" : "write_allowed";
  try {
    const db = getMcpReadOnlyDb();
    const result = await db.query<JulesSourceGrant>(
      "SELECT source, branch FROM khora_private.jules_source_acl " +
      "WHERE subject = $1 AND " + allowedColumn + " IS TRUE AND revoked_at IS NULL " +
      "ORDER BY source, branch",
      [subject],
    );
    return result.rows.filter(row => validResource(row.source, row.branch));
  } catch {
    throw new McpDiagnosticError("JULES_ACL_UNAVAILABLE");
  }
}

export async function requireJulesSourceGrant(subject: string, source: string, branch: string, mode: JulesAccessMode): Promise<void> {
  if (!validSubject(subject) || !validResource(source, branch)) {
    throw new McpDiagnosticError("JULES_RESOURCE_CONTEXT_INVALID");
  }
  const grants = await listJulesSourceGrants(subject, mode);
  if (!grants.some(grant => grant.source === source && grant.branch === branch)) {
    throw new McpDiagnosticError("JULES_ACCESS_DENIED");
  }
}