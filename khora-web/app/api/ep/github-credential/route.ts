import { auth } from "@/auth";
import { resolveEpUserEmail } from "@/lib/server/ep";
import {
  deleteEpGitHubCredential,
  EpGitHubCredentialError,
  getEpGitHubCredentialStatus,
  saveEpGitHubCredential,
} from "@/lib/server/ep-github-credential";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } as const;

async function authorizedUser(req: NextRequest): Promise<string> {
  const session = await auth();
  return resolveEpUserEmail(req, session?.user?.email || "");
}

function statusFor(error: unknown): { error: string; status: number } {
  if (error instanceof EpGitHubCredentialError) {
    if (error.code === "invalid_token_format") return { error: error.code, status: 400 };
    if (error.code === "github_token_rejected") return { error: error.code, status: 401 };
    if (error.code === "github_repo_access_missing") return { error: error.code, status: 422 };
  }
  return { error: "credential_vault_unavailable", status: 503 };
}

export async function GET(req: NextRequest) {
  if (!(await authorizedUser(req))) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });
  try {
    return NextResponse.json(await getEpGitHubCredentialStatus(), { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "credential_vault_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(req: NextRequest) {
  const email = await authorizedUser(req);
  if (!email) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });
  if (req.headers.get("origin") !== req.nextUrl.origin || !(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 403, headers: NO_STORE });
  }
  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 16_384) return NextResponse.json({ error: "invalid_request" }, { status: 413, headers: NO_STORE });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }
  const token = body && typeof body === "object" && "token" in body ? (body as { token?: unknown }).token : undefined;
  if (typeof token !== "string" || token.length > 8192 || !token.trim()) {
    return NextResponse.json({ error: "invalid_token_format" }, { status: 400, headers: NO_STORE });
  }
  try {
    const status = await saveEpGitHubCredential(token, email);
    return NextResponse.json(status, { headers: NO_STORE });
  } catch (error) {
    const result = statusFor(error);
    return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
  }
}

export async function DELETE(req: NextRequest) {
  const email = await authorizedUser(req);
  if (!email) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "invalid_request" }, { status: 403, headers: NO_STORE });
  }
  try {
    await deleteEpGitHubCredential();
    return NextResponse.json({ configured: false }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "credential_vault_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
