import { authenticateEpBearer, getEpAuthFailure, getEpRepoCatalog } from "@/lib/server/ep";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } as const;

export async function GET(req: Request) {
  try {
    const payload = await authenticateEpBearer(req, ["ep:bootstrap"]);
    const selected = new Set(payload.workspaceRepos || []);
    const catalog = await getEpRepoCatalog();
    const repositories = catalog.filter((repo) => selected.has(repo.name));
    return NextResponse.json({ sessionId: payload.sid, repositories }, { headers: NO_STORE });
  } catch (error) {
    const failure = getEpAuthFailure(error);
    return NextResponse.json({ error: failure.code }, { status: failure.status, headers: NO_STORE });
  }
}
