import { authenticateEpBearer, getEpAuthFailure } from "@/lib/server/ep";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } as const;

export async function GET(req: Request) {
  try {
    const payload = await authenticateEpBearer(req, ["ep:bootstrap"]);
    return NextResponse.json({ sessionId: payload.sid, repositories: payload.workspaceRepos || [] }, { headers: NO_STORE });
  } catch (error) {
    const failure = getEpAuthFailure(error);
    return NextResponse.json({ error: failure.code }, { status: failure.status, headers: NO_STORE });
  }
}
