import { auth } from "@/auth";
import { createEpSessionToken, getEpSessionSummary, isEpUserAllowed } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } as const;

function psSingleQuoted(value: string): string { return `'${value.replace(/'/g, "''")}'`; }

function buildWindowsLauncherCommand(apiBase: string): string {
  const body = [
    "$k=([string](Get-Clipboard -Raw -ErrorAction Stop)).Trim()",
    "Set-Clipboard -Value ' '",
    "if([string]::IsNullOrWhiteSpace($k)){throw 'KHORA_TOKEN_MISSING'}",
    "if($k -notmatch '^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$'){throw 'KHORA_TOKEN_FORMAT_INVALID'}",
    "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12",
    "$p=Join-Path ([IO.Path]::GetTempPath()) ('khora-bootstrap-'+[guid]::NewGuid().ToString('N')+'.ps1')",
    "$tf=Join-Path ([IO.Path]::GetTempPath()) ('khora-token-'+[guid]::NewGuid().ToString('N')+'.dpapi')",
    "$headers=@{Authorization=('Bearer '+$k);Accept='text/plain';'Cache-Control'='no-cache';'User-Agent'='khora-ep-launcher/1'}",
    "try{$response=Invoke-WebRequest -UseBasicParsing -Uri ($b+'/bootstrap') -Headers $headers -TimeoutSec 120 -ErrorAction Stop}catch{$code='bootstrap_request_failed';$payload=$null;try{if($_.ErrorDetails.Message){$payload=$_.ErrorDetails.Message|ConvertFrom-Json}}catch{};if($payload -and $payload.detail){$code=[string]$payload.detail}elseif($payload -and $payload.code){$code=[string]$payload.code};if($code-eq'bootstrap_request_failed'){try{$stream=$_.Exception.Response.GetResponseStream();if($stream){$reader=New-Object IO.StreamReader($stream);try{$payload=$reader.ReadToEnd()|ConvertFrom-Json;if($payload.detail){$code=[string]$payload.detail}elseif($payload.code){$code=[string]$payload.code}}finally{$reader.Dispose()}}}catch{}};throw ('KHORA_BOOTSTRAP_REJECTED: '+$code)}",
    "$s=([string]$response.Content).TrimStart([char]0xFEFF)",
    "if([string]::IsNullOrWhiteSpace($s) -or $s -notmatch '(?m)^#requires\\s+-Version\\s+5\\.1'){throw 'KHORA_BOOTSTRAP_CONTENT_INVALID'}",
    "[IO.File]::WriteAllText($p,$s,(New-Object Text.UTF8Encoding($true)))",
    "$secure=ConvertTo-SecureString -String $k -AsPlainText -Force",
    "$secure|ConvertFrom-SecureString|Set-Content -LiteralPath $tf -Encoding ASCII",
    "$k=$null",
    "Remove-Variable k,secure -ErrorAction SilentlyContinue",
    "& $p -Bootstrap -KhoraTokenFile $tf -KhoraApiBase $b",
  ].join(";");
  const cleanup = [
    "try{Set-Clipboard -Value ' '}catch{}",
    "foreach($artifact in @($p,$tf)){if($artifact){Remove-Item -LiteralPath $artifact -Force -ErrorAction SilentlyContinue}}",
    "Remove-Variable b,k,p,tf,response,s,headers,payload,reader,stream,code,secure,artifact -ErrorAction SilentlyContinue",
  ].join(";");
  return ["$ErrorActionPreference='Stop'", "$ProgressPreference='SilentlyContinue'", `$b=${psSingleQuoted(apiBase)}`, "$k=$null;$p=$null;$tf=$null;$response=$null;$s=$null;$payload=$null;$reader=$null;$stream=$null", `try{${body}}finally{${cleanup}}`].join(";");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email || "";
  const origin = req.nextUrl.origin;
  if (!email || !isEpUserAllowed(email, origin)) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE_HEADERS });
  try { return NextResponse.json({ sessions: await getEpSessionSummary(email) }, { headers: NO_STORE_HEADERS }); }
  catch { return NextResponse.json({ error: "session_history_unavailable" }, { status: 503, headers: NO_STORE_HEADERS }); }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email || "";
  const origin = req.nextUrl.origin;
  if (!email || !isEpUserAllowed(email, origin)) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE_HEADERS });
  let platform = "windows";
  try {
    if ((req.headers.get("content-type") || "").includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.platform === "string" && body.platform.trim()) platform = body.platform.trim().toLowerCase();
    }
  } catch { platform = "windows"; }
  if (platform !== "windows") return NextResponse.json({ error: "unsupported_platform", message: `Plataforma no soportada: '${platform}'. Solo Windows está soportado.` }, { status: 400, headers: NO_STORE_HEADERS });
  try {
    const issued = await createEpSessionToken(email, origin);
    const apiBase = issued.payload.aud;
    const command = buildWindowsLauncherCommand(apiBase);
    const launcher = { id: "windows-powershell", version: "2", platform: "windows", shell: "powershell", minimumVersion: "5.1", storageBackend: "bitlocker-vhdx", execution: "temporary-ps1-current-process", status: "supported", command };
    return NextResponse.json({ token: issued.token, sessionId: issued.payload.sid, expiresAt: issued.expiresAt, command, apiBase, launcher }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "rate_limit_exceeded") return NextResponse.json({ error: "rate_limit_exceeded", message: "Máximo de cinco emisiones cada quince minutos." }, { status: 429, headers: NO_STORE_HEADERS });
    return NextResponse.json({ error: "token_issue_unavailable", message: "No se pudo emitir el token Khora de forma segura." }, { status: 503, headers: NO_STORE_HEADERS });
  }
}
