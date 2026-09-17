// @l0 L0-002 §4 · @req AUTH-F1-01/REQ-1 · @acr ACR-1.2 · @req UI-REVIEW/SECURITY
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { resolverGeneracion } from "./lib/server/generacion";

const RUTAS_OS = new Set<string>(["/"]);
// Una ruta entra aquí solo cuando su espejo en app/os/ está terminado
// y su prueba de contrato pasa en verde. Ver GEN-OS/RESOLVER-01.

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/version|api/mcp|api/ep/(?:bootstrap|events|logs)|\\.well-known|api/oauth/token).*)",
  ],
};

export default auth((req) => {
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
