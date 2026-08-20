import { auth } from "@/auth";
import { createEpSessionToken, getEpSessionSummary, isEpUserAllowed } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const session = await auth();const email = session?.user?.email || "";const origin = req.nextUrl.origin;
  if (!email || !isEpUserAllowed(email,origin)) return NextResponse.json({error:"No autorizado"},{status:401});
  return NextResponse.json({sessions:await getEpSessionSummary(email)},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req: NextRequest) {
  const session = await auth();const email = session?.user?.email || "";const origin = req.nextUrl.origin;
  if (!email || !isEpUserAllowed(email,origin)) return NextResponse.json({error:"No autorizado"},{status:401});
  try {
    const issued = await createEpSessionToken(email,origin);
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
    return NextResponse.json({token:issued.token,sessionId:issued.payload.sid,expiresAt:issued.expiresAt,command,apiBase:api},{headers:{"Cache-Control":"no-store, no-store","Pragma":"no-cache"}});
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No se pudo emitir token"},{status:500});}
}
