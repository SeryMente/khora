import { registrarEventoServicio } from "@/lib/server/service-observability";
import { withHttpDiagnostics } from "@/lib/server/mcp-diagnostic-boundary";
import { auth } from "@/auth";
import {
  createManualMcpToken,
  listManualMcpTokens,
  revokeManualMcpToken,
} from "@/lib/server/mcp-manual-token";
import { MANUAL_MCP_DEFAULT_EXPIRY_DAYS, MANUAL_MCP_SCOPES } from "@/lib/server/mcp-manual-token";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function getUserEmail() {
  const session = await auth();
  const userEmail = session?.user?.email;
  return typeof userEmail === "string" && userEmail.trim() ? userEmail : null;
}

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}

function noStore() {
  return {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };
}

async function handleGET() {
  const userEmail = await getUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: noStore() });
  }

  const tokens = await listManualMcpTokens(userEmail);
  return NextResponse.json(
    {
      scopes_supported: MANUAL_MCP_SCOPES,
      default_expiry_days: MANUAL_MCP_DEFAULT_EXPIRY_DAYS,
      tokens,
    },
    { headers: noStore() },
  );
}

async function handlePOST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403, headers: noStore() });
  }

  const userEmail = await getUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: noStore() });
  }

  let body: { scopes?: unknown; expires_in_days?: unknown; etiqueta?: unknown; client_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: noStore() });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: noStore() });

  try {
    const result = await createManualMcpToken({
      usuario: userEmail,
      scopes: body.scopes,
      expiresInDays: body.expires_in_days,
      label: body.etiqueta,
      clientId: body.client_id,
    });

    return NextResponse.json(
      {
        ok: true,
        token: result.token,
        bearer: result.bearer,
        token_prefix: result.record.token_prefix,
        scopes: result.record.scope.split(/\s+/).filter(Boolean),
        expires_at: result.record.expira_en,
        warning: "Este secreto se muestra una sola vez. KHORA solo conserva su hash.",
      },
      { headers: noStore() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "MANUAL_TOKEN_CREATE_FAILED";
    const status = message.endsWith("_INVALID") || message.endsWith("_REQUIRED") ? 400 : 500;
    return NextResponse.json({ error: message }, { status, headers: noStore() });
  }
}

async function handleDELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403, headers: noStore() });
  }

  const userEmail = await getUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: noStore() });
  }

  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: noStore() });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: noStore() });

  if (typeof body.id !== "string") {
    return NextResponse.json({ error: "MANUAL_TOKEN_ID_REQUIRED" }, { status: 400, headers: noStore() });
  }

  try {
    const revoked = await revokeManualMcpToken(userEmail, body.id);
    return NextResponse.json(
      { ok: revoked, revoked },
      { status: revoked ? 200 : 404, headers: noStore() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "MANUAL_TOKEN_REVOKE_FAILED";
    return NextResponse.json({ error: message }, { status: 400, headers: noStore() });
  }
}

export const GET = withHttpDiagnostics("mcp.manual-token.GET", handleGET, registrarEventoServicio);

export const POST = withHttpDiagnostics("mcp.manual-token.POST", handlePOST, registrarEventoServicio);

export const DELETE = withHttpDiagnostics("mcp.manual-token.DELETE", handleDELETE, registrarEventoServicio);
