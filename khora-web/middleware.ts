import { NextRequest, NextResponse } from "next/server";

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"] };

export function middleware(req: NextRequest) {
  const USER = process.env.BASIC_AUTH_USER;
  const PASS = process.env.BASIC_AUTH_PASS;
  if (!USER || !PASS) return NextResponse.next(); // sin credenciales => sin candado

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const i = decoded.indexOf(":");
    if (decoded.slice(0, i) === USER && decoded.slice(i + 1) === PASS) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Khora", charset="UTF-8"' },
  });
}
