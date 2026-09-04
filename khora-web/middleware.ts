// @l0 L0-002 §4 · @req AUTH-F1-01/REQ-1 · @acr ACR-1.2 · @req UI-REVIEW/SECURITY
import { auth } from "@/auth";
import { NextResponse } from "next/server";

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
    return NextResponse.redirect(new URL("/sistema/seguridad#entorno-persistente", req.nextUrl.origin), 308);
  }

  // Skip auth checks when running Playwright E2E tests internally
  if (process.env.PLAYWRIGHT_TEST_RUN === '1' || process.env.PLAYWRIGHT_TEST_BYPASS === 'true') {
    return NextResponse.next();
  }

  // auth() makes the token available on req.auth
  if (!req.auth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    // For UI routes, redirect to Next-Auth's default sign-in flow (which will trigger OIDC).
    const url = new URL("/api/auth/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});
