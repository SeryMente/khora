import { authenticateEpBearer, getEpAuthFailure, markBootstrapFetched } from "@/lib/server/ep";
import { BOOTSTRAP_PS1_BASE64 } from "@/lib/server/ep-bootstrap-content";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } as const;

export async function GET(req: NextRequest) {
  let payload;
  try { payload = await authenticateEpBearer(req, ["ep:bootstrap"]); }
  catch (error) {
    const failure = getEpAuthFailure(error);
    return NextResponse.json({ error: "Token Khora invalido", code: failure.code, detail: failure.code }, { status: failure.status, headers: NO_STORE_HEADERS });
  }
  try { await markBootstrapFetched(payload); }
  catch { return NextResponse.json({ error: "bootstrap_state_unavailable", code: "bootstrap_state_unavailable", detail: "bootstrap_state_unavailable" }, { status: 503, headers: NO_STORE_HEADERS }); }
  const script = Buffer.from(BOOTSTRAP_PS1_BASE64, "base64").toString("utf8");
  return new NextResponse(script, { status: 200, headers: { ...NO_STORE_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Content-Security-Policy": "default-src 'none'" } });
}
