// @l0 L0-002 · @req CORA-02/REQ-1 · @acr ACR-1.2
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "desconocido",
    rama: process.env.VERCEL_GIT_COMMIT_REF ?? "desconocida",
    entorno: process.env.VERCEL_ENV ?? "local",
    rutas: ["/sistema/volcados", "/api/volcado"],
    ahora: new Date().toISOString(),
  });
}
