// @l0 L0-002 §4 · @req AUTH-F1-01/REQ-1 · @acr ACR-1.2
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/version).*)"] };

export default auth((req) => {
  // Skip auth checks when running Playwright E2E tests
  if (process.env.PLAYWRIGHT_TEST_RUN === '1' || process.env.PLAYWRIGHT_TEST_BYPASS === 'true') {
    return NextResponse.next();
  }

  // auth() makes the token available on req.auth
  if (!req.auth) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    // For UI routes, redirect to Next-Auth's default sign-in flow (which will trigger OIDC).
    // The signIn flow redirects to /api/auth/signin which is excluded in the matcher.
    const url = new URL("/api/auth/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});
