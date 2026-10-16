import { registrarEventoServicio } from "@/lib/server/service-observability";
import { withHttpDiagnostics } from "@/lib/server/mcp-diagnostic-boundary";
// @l0 L0-002 §4 · @req MCP-REV-01/REQ-1
import { auth } from "@/auth";
import { obtenerInfoRevocacionUsuario, revocarAccesoUsuario } from "@/lib/server/oauth";
import { NextResponse } from "next/server";

async function handleGET() {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!session || !userEmail) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const info = await obtenerInfoRevocacionUsuario(userEmail);
  return NextResponse.json(info);
}

async function handlePOST() {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!session || !userEmail) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const res = await revocarAccesoUsuario(userEmail);
  return NextResponse.json({
    exito: true,
    generacion: res.generacion,
    mensaje: "Acceso revocado exitosamente. Todos los access tokens y refresh tokens fueron invalidados.",
  });
}

export const GET = withHttpDiagnostics("mcp.revocacion.GET", handleGET, registrarEventoServicio);

export const POST = withHttpDiagnostics("mcp.revocacion.POST", handlePOST, registrarEventoServicio);
