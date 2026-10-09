import { authenticateEpBearer, getEpAuthFailure, reserveEpGitHubTokenIssue } from "@/lib/server/ep";
import { createEpGitHubInstallationToken } from "@/lib/server/github-app";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function POST(req: NextRequest) {
  let payload;
  try {
    payload = await authenticateEpBearer(req, ["ep:github:session"]);
  } catch (error) {
    const failure = getEpAuthFailure(error);
    return NextResponse.json({ error: "not_authorized", code: failure.code }, { status: failure.status, headers: NO_STORE });
  }

  try {
    const reserved = await reserveEpGitHubTokenIssue(payload.sid);
    if (!reserved) {
      return NextResponse.json({ error: "github_token_rate_limited" }, { status: 429, headers: NO_STORE });
    }
    const issued = await createEpGitHubInstallationToken();
    return NextResponse.json({
      token: issued.token,
      expiresAt: issued.expiresAt,
      repositories: issued.repositories,
      permissionProfile: "ep-bootstrap-repository-write",
    }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "github_token_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
