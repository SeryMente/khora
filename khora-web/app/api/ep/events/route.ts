import { appendEpEvents, authenticateEpBearer, getEpAuthFailure, IncomingEpEvent } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } as const;

export async function POST(req: NextRequest) {
  let payload;
  try { payload = await authenticateEpBearer(req, ["ep:logs:write"]); }
  catch (error) { const failure = getEpAuthFailure(error); return NextResponse.json({ error: failure.code, code: failure.code }, { status: failure.status, headers: HEADERS }); }
  let events: IncomingEpEvent[];
  try { const body = await req.json(); events = (Array.isArray(body) ? body : body?.events || [body]) as IncomingEpEvent[]; }
  catch { return NextResponse.json({ error: "invalid_event_payload" }, { status: 400, headers: HEADERS }); }
  try { const inserted = await appendEpEvents(payload, events); return NextResponse.json({ ok: true, sessionId: payload.sid, inserted }, { headers: HEADERS }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    const invalid = /^(lote de eventos invalido|event_id invalido|estado invalido)/.test(message);
    return NextResponse.json({ error: invalid ? "invalid_event_batch" : "event_store_unavailable" }, { status: invalid ? 400 : 503, headers: HEADERS });
  }
}
