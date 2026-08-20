import { auth } from "@/auth";
import { createEpSessionToken, getEpSessionSummary, isEpUserAllowed } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const session = await auth(); const email = session?.user?.email || ""; const origin = req.nextUrl.origin;
  if (!email || !isEpUserAllowed(email, origin)) return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
  return NextResponse.json({ sessions: await getEpSessionSummary(email) }, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
}
export async function POST(req: NextRequest) {
  const session = await auth(); const email = session?.user?.email || ""; const origin = req.nextUrl.origin;
  if (!email || !isEpUserAllowed(email, origin)) return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });

  let platform = "windows";
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.platform === "string" && body.platform.trim() !== "") {
        platform = body.platform.trim().toLowerCase();
      }
    }
  } catch {
    // If parsing fails or body is empty, platform remains "windows"
  }

  if (platform !== "windows") {
    return NextResponse.json(
      { error: "unsupported_platform", message: `Plataforma no soportada: '${platform}'. Solo 'windows' está soportada.` },
      { status: 400, headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } }
    );
  }

  try {
    const issued = await createEpSessionToken(email, origin);
    const api = origin + "/api/ep";
    const command = [
      `$b='${api}'`,
      "$k=([string](Get-Clipboard -Raw)).Trim()",
      "Set-Clipboard -Value ' '",
      "if([string]::IsNullOrWhiteSpace($k)){throw 'El portapapeles no contiene el token Khora'}",
      "$s=Invoke-RestMethod -Uri ($b+'/bootstrap') -Headers @{Authorization=('Bearer '+$k)}",
      "& ([ScriptBlock]::Create([string]$s)) -Bootstrap -KhoraToken $k -KhoraApiBase $b",
      "Remove-Variable k,s -ErrorAction SilentlyContinue"
    ].join(";");

    const launcher = {
      id: "windows-powershell",
      platform: "windows",
      shell: "powershell",
      minimumVersion: "5.1",
      storageBackend: "bitlocker-vhdx",
      status: "supported",
      command
    };

    return NextResponse.json(
      {
        token: issued.token,
        sessionId: issued.payload.sid,
        expiresAt: issued.expiresAt,
        command,
        apiBase: api,
        launcher
      },
      { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "No se pudo emitir token";
    if (msg.includes("rate_limit_exceeded")) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Límite de emisión alcanzado (máximo 5 tokens cada 15 minutos)" },
        { status: 429, headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500, headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
  }
}
