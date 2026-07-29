// @l0 L0-002 · @req CORA-02/REQ-1 · @acr ACR-1.2
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const conValor = (valor?: string) => (typeof valor === "string" && valor.trim().length > 0 ? valor.trim() : null);

export async function GET() {
  const sha = conValor(process.env.VERCEL_GIT_COMMIT_SHA) ?? conValor(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
  return NextResponse.json({
    commit: sha ?? "sin-metadatos-de-git",
    rama: conValor(process.env.VERCEL_GIT_COMMIT_REF) ?? "sin-metadatos-de-git",
    desplegado_desde_git: sha !== null,
    entorno: conValor(process.env.VERCEL_ENV) ?? "local",
    rutas: ["/sistema/volcados", "/api/volcado"],
    ahora: new Date().toISOString(),
  });
}
