import { auth } from "@/auth";
import { createEpSessionToken, getEpConfig, getEpSessionSummary, isEpUserAllowed } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } as const;

function psSingleQuoted(value: string): string { return `'${value.replace(/'/g, "''")}'`; }

function buildWindowsLauncherCommand(apiBase: string): string {
  const body = [
    "$k=([string](Get-Clipboard -Raw -ErrorAction Stop)).Trim()",
    "Set-Clipboard -Value ' '",
    "if([string]::IsNullOrWhiteSpace($k)){throw 'KHORA_TOKEN_MISSING'}",
    "if($k -notmatch '^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$'){throw 'KHORA_TOKEN_FORMAT_INVALID'}",
    "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12",
    "$winps=Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'",
    "if(-not(Test-Path -LiteralPath $winps)){throw 'KHORA_WINDOWS_POWERSHELL_51_MISSING'}",
    "$p=Join-Path ([IO.Path]::GetTempPath()) ('khora-bootstrap-'+[guid]::NewGuid().ToString('N')+'.ps1')",
    "$tf=Join-Path ([IO.Path]::GetTempPath()) ('khora-token-'+[guid]::NewGuid().ToString('N')+'.dpapi')",
    "$headers=@{Authorization=('Bearer '+$k);Accept='text/plain';'Cache-Control'='no-cache';'User-Agent'='khora-ep-launcher/4'}",
    "try{$response=Invoke-WebRequest -UseBasicParsing -Uri ($b+'/bootstrap') -Headers $headers -TimeoutSec 120 -ErrorAction Stop}catch{$code='bootstrap_request_failed';$payload=$null;try{if($_.ErrorDetails.Message){$payload=$_.ErrorDetails.Message|ConvertFrom-Json}}catch{};if($payload -and $payload.detail){$code=[string]$payload.detail}elseif($payload -and $payload.code){$code=[string]$payload.code};if($code-eq'bootstrap_request_failed'){try{$stream=$_.Exception.Response.GetResponseStream();if($stream){$reader=New-Object IO.StreamReader($stream);try{$payload=$reader.ReadToEnd()|ConvertFrom-Json;if($payload.detail){$code=[string]$payload.detail}elseif($payload.code){$code=[string]$payload.code}}finally{$reader.Dispose()}}}catch{}};throw ('KHORA_BOOTSTRAP_REJECTED: '+$code)}",
    "$signedMode=[string]$response.Headers['X-Khora-Launch-Mode']",
    "if($signedMode-ne'normal'){throw 'KHORA_LAUNCH_MODE_MISMATCH'}",
    "$s=([string]$response.Content).TrimStart([char]0xFEFF)",
    "if([string]::IsNullOrWhiteSpace($s) -or $s -notmatch '(?m)^#requires\\s+-Version\\s+5\\.1'){throw 'KHORA_BOOTSTRAP_CONTENT_INVALID'}",
    "[IO.File]::WriteAllText($p,$s,(New-Object Text.UTF8Encoding($true)))",
    "$secure=ConvertTo-SecureString -String $k -AsPlainText -Force",
    "$secure|ConvertFrom-SecureString|Set-Content -LiteralPath $tf -Encoding ASCII",
    "$k=$null",
    "Remove-Variable k,secure -ErrorAction SilentlyContinue",
    "& $winps -NoProfile -ExecutionPolicy Bypass -File $p -Bootstrap -KhoraTokenFile $tf -KhoraApiBase $b",
    "if($LASTEXITCODE-ne0){throw ('KHORA_BOOTSTRAP_EXIT_'+$LASTEXITCODE)}",
  ].join(";");
  const cleanup = [
    "try{Set-Clipboard -Value ' '}catch{}",
    "foreach($artifact in @($p,$tf)){if($artifact){Remove-Item -LiteralPath $artifact -Force -ErrorAction SilentlyContinue}}",
    "Remove-Variable b,k,p,tf,response,s,headers,payload,reader,stream,code,secure,artifact,winps,signedMode -ErrorAction SilentlyContinue",
  ].join(";");
  return [
    "$ErrorActionPreference='Stop'",
    "$ProgressPreference='SilentlyContinue'",
    `$b=${psSingleQuoted(apiBase)}`,
    "$k=$null;$p=$null;$tf=$null;$response=$null;$s=$null;$payload=$null;$reader=$null;$stream=$null;$winps=$null",
    `try{${body}}finally{${cleanup}}`,
  ].join(";");
}

function getNormalLauncherDescriptor(apiBase: string) {
  const command = buildWindowsLauncherCommand(apiBase);
  return {
    id: "windows-powershell",
    version: "4",
    platform: "windows",
    shell: "windows-powershell",
    minimumVersion: "5.1",
    storageBackend: "bitlocker-vhdx",
    execution: "windows-powershell-5.1-child-process-dpapi",
    status: "supported",
    mode: "normal",
    isolation: "fresh-bitlocker-vhdx-per-session",
    hostToolPolicy: "allow-verified-host",
    command,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email || "";
  const origin = req.nextUrl.origin;
  if (!email || !isEpUserAllowed(email, origin)) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE_HEADERS });
  try {
    const apiBase = getEpConfig(origin).audience;
    const launcher = getNormalLauncherDescriptor(apiBase);
    return NextResponse.json({ sessions: await getEpSessionSummary(email), launcher, command: launcher.command, mode: "normal" }, { headers: NO_STORE_HEADERS });
  }
  catch { return NextResponse.json({ error: "session_history_unavailable" }, { status: 503, headers: NO_STORE_HEADERS }); }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email || "";
  const origin = req.nextUrl.origin;
  if (!email || !isEpUserAllowed(email, origin)) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE_HEADERS });

  let platform = "windows";
  let modeExplicit = false;
  let modeVal = "normal";

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        if (typeof body.platform === "string" && body.platform.trim()) platform = body.platform.trim().toLowerCase();
        if ("mode" in body && body.mode !== undefined && body.mode !== null) {
          modeExplicit = true;
          if (typeof body.mode === "string") modeVal = body.mode.trim().toLowerCase();
          else modeVal = String(body.mode);
        }
      }
    } catch {
      return NextResponse.json({ error: "invalid_json", message: "El cuerpo de la solicitud no es un JSON válido." }, { status: 400, headers: NO_STORE_HEADERS });
    }
  }

  if (platform !== "windows") return NextResponse.json({ error: "unsupported_platform", message: `Plataforma no soportada: '${platform}'. Solo Windows está soportado.` }, { status: 400, headers: NO_STORE_HEADERS });

  if (modeExplicit && modeVal !== "normal") {
    return NextResponse.json({ error: "unsupported_launch_mode", message: `Modo de arranque no soportado: '${modeVal}'.` }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    const issued = await createEpSessionToken(email, origin, "normal");
    const apiBase = issued.payload.aud;
    const launcher = getNormalLauncherDescriptor(apiBase);
    return NextResponse.json({ token: issued.token, sessionId: issued.payload.sid, expiresAt: issued.expiresAt, command: launcher.command, apiBase, mode: "normal", launcher }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "rate_limit_exceeded") return NextResponse.json({ error: "rate_limit_exceeded", message: "Máximo de cinco emisiones cada quince minutos." }, { status: 429, headers: NO_STORE_HEADERS });
    return NextResponse.json({ error: "token_issue_unavailable", message: "No se pudo emitir el token Khora de forma segura." }, { status: 503, headers: NO_STORE_HEADERS });
  }
}
