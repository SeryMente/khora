import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes that don't need auth
  if (pathname === '/login' || pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  // GitHub webhook
  if (pathname.startsWith('/api/github/webhook')) {
    return NextResponse.next();
  }

  const token = req.cookies.get("khora_session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("expired", "1");
    return NextResponse.redirect(url);
  }

  // Allow bypass for E2E tests specifically ONLY in test environment
  if (process.env.NEXT_PUBLIC_IS_TEST === '1' && token === 'dummy-token') {
    return NextResponse.next();
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
    const secret = new TextEncoder().encode(JWT_SECRET);

    // Verify token
    await jose.jwtVerify(token, secret);

    // Renew the timer by generating a new token on each request
    const SESSION_TTL_MINUTES = parseInt(process.env.SESSION_TTL_MINUTES || '15', 10);
    const alg = 'HS256';
    const newJwt = await new jose.SignJWT({ 'urn:khora:user': true })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL_MINUTES}m`)
      .sign(secret);

    const res = NextResponse.next();
    res.cookies.set({
      name: 'khora_session',
      value: newJwt,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MINUTES * 60
    });

    return res;
  } catch (err) {
    // Si el JWT expiró o es inválido
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("expired", "1");

    const res = NextResponse.redirect(url);
    res.cookies.delete("khora_session");
    return res;
  }
}
