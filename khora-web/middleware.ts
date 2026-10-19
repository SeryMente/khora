// @l0 L0-002 §4 · @req AUTH-F1-01/REQ-1 · @acr ACR-1.2 · @req UI-REVIEW/SECURITY
import { auth } from "@/auth";
import { openWebUIPath } from "./lib/chat-routes";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { resolverGeneracion } from "./lib/server/generacion";

const RUTAS_OS = new Set<string>(["/"]);
// Una ruta entra aquí solo cuando su espejo en app/os/ está terminado
// y su prueba de contrato pasa en verde. Ver GEN-OS/RESOLVER-01.

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ep-main-live\\.json$|auth/signin|api/auth|api/eventos|\\.well-known).*)",
  ],
};

const authMiddleware = auth((req) => {
  const pathname = req.nextUrl.pathname;

  // Fail-closed security for /ui-review
  if (pathname.startsWith("/ui-review")) {
    if (process.env.KHORA_UI_REVIEW_MODE !== "1") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.next();
  }

  if (pathname === "/sistema/entorno-persistente") {
    return NextResponse.redirect(new URL("/sistema/seguridad?tab=entorno-persistente", req.nextUrl.origin), 308);
  }

  const servicioConAutenticacionPropia =
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/api/ep/") ||
    pathname.startsWith("/api/oauth/") ||
    pathname.startsWith("/.well-known");

  if (servicioConAutenticacionPropia) {
    return NextResponse.next();
  }

  const esBypassDePruebas =
    process.env.PLAYWRIGHT_TEST_RUN === '1' || process.env.PLAYWRIGHT_TEST_BYPASS === 'true';
  // El bypass salta la autenticación real (OIDC), nunca la resolución
  // de generación: así un proyecto Playwright futuro con KHORA_SHELL=os
  // puede ejercer la reescritura sin necesitar sesión OIDC real.
  if (!esBypassDePruebas && !req.auth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }
    const url = new URL("/api/auth/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Native chat is explicit opt-in; never expose the bridge key in an external rewrite.
  // The Node route independently rechecks the real session (test bypass is not authority).
  if (process.env.KHORA_CHAT_ENABLED === "1" && openWebUIPath(pathname)) {
    const destino = req.nextUrl.clone();
    destino.pathname = "/api/khora-chat/proxy";
    destino.searchParams.set("path", pathname);
    return NextResponse.rewrite(destino);
  }

  const generacion = resolverGeneracion(pathname, process.env.KHORA_SHELL, RUTAS_OS);
  if (generacion === "os") {
    const destino = req.nextUrl.clone();
    destino.pathname = `/os${pathname}`;
    const headers = new Headers(req.headers);
    headers.set("x-khora-generacion", "os");
    return NextResponse.rewrite(destino, { request: { headers } });
  }
  return NextResponse.next();
});

async function emitBoundaryEvent(req: NextRequest, correlationId: string, response: Response, durationMs: number) {
  const key = process.env.KHORA_API_KEY;
  if (!key || req.nextUrl.pathname === "/api/eventos") return;

  const statusCode = response.status;
  const now = new Date().toISOString();
  const payload = [{
    event_uuid: crypto.randomUUID(),
    schema_version: "2.0",
    event_name: "SERVICE_HTTP",
    phase: statusCode === 401 || statusCode === 403 ? "autorizacion" : "manejo",
    severity: statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO",
    outcome: statusCode >= 400 ? "FAILURE" : "SUCCESS",
    component: "khora-web-middleware",
    correlation_id: correlationId,
    causation_id: null,
    attempt_id: null,
    sequence: null,
    session_id: null,
    release_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    client_time: now,
    server_time: now,
    duration_ms: durationMs,
    metrics: { status_code: statusCode, method: req.method, route: req.nextUrl.pathname },
    reason_code: statusCode >= 400 ? "HTTP_" + statusCode : null,
    privacy_class: "SYSTEM_AUDIT",
  }];

  await fetch(new URL("/api/eventos", req.nextUrl.origin), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Khora-Key": key },
    body: JSON.stringify(payload),
  });
}

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const correlationId = req.headers.get("x-khora-correlation-id") || crypto.randomUUID();
  const startedAt = Date.now();

  let response: Response;
  try {
    const authResult = await (authMiddleware as (request: NextRequest) => Response | void | Promise<Response | void>)(req);
    response = authResult instanceof Response ? authResult : NextResponse.next();
  } catch (error) {
    const failureResponse = NextResponse.json({ error: "internal" }, { status: 500 });
    event.waitUntil(emitBoundaryEvent(req, correlationId, failureResponse, Date.now() - startedAt).catch(() => {}));
    throw error;
  }


  try {
    response.headers.set("X-Khora-Correlation-Id", correlationId);
  } catch {
    // Do not let immutable response headers break the service.
  }

  event.waitUntil(
    emitBoundaryEvent(req, correlationId, response, Date.now() - startedAt).catch(() => {})
  );

  return response;
}
