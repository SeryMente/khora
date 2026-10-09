import { authenticateEpBearer, getEpAuthFailure } from "@/lib/server/ep";
import { getStoredEpGitHubToken } from "@/lib/server/ep-github-credential";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } as const;

export async function GET(req: NextRequest) {
  let payload;
  try {
    payload = await authenticateEpBearer(req, ["ep:github:token"]);
  } catch (error) {
    const failure = getEpAuthFailure(error);
    return NextResponse.json({ error: "not_authorized", code: failure.code }, { status: failure.status, headers: NO_STORE });
  }
  try {
    const token = await getStoredEpGitHubToken();
    return NextResponse.json({ token, purpose: "ep-bootstrap", sessionId: payload.sid }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "github_credential_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
