import { authenticateEpBearer, getEpAuthFailure, readEpEvents } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } as const;

export async function GET(req: NextRequest) {
  let payload;
  try { payload = await authenticateEpBearer(req, ["ep:logs:read"]); }
  catch (error) { const failure = getEpAuthFailure(error); return NextResponse.json({ error: failure.code, code: failure.code }, { status: failure.status, headers: HEADERS }); }
  const which = req.nextUrl.searchParams.get("which") === "last" ? "last" : "current";
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") || "5000");
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(Math.trunc(requestedLimit), 10_000)) : 5000;
  try {
    const data = await readEpEvents(payload, which, limit);
    if (req.nextUrl.searchParams.get("format") === "ndjson") {
      const lines = [JSON.stringify({ type: "session", ...data.session }), ...data.events.map((event) => JSON.stringify({ type: "event", ...event }))].join("\n") + "\n";
      return new NextResponse(lines, { headers: { ...HEADERS, "Content-Type": "application/x-ndjson; charset=utf-8" } });
    }
    return NextResponse.json(data, { headers: HEADERS });
  } catch { return NextResponse.json({ error: "event_log_unavailable" }, { status: 503, headers: HEADERS }); }
}
