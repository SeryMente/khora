import { auth } from "@/auth";
import { createEpSessionToken, getEpConfig, getEpSessionSummary, isEpUserAllowed } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } as const;

function psSingleQuoted(value: string): string { return `'${value.replace(/'/g, "''")}'`; }

function buildWindowsLauncherCommand(apiBase: string): string {
  const body = [
    "$wi=[Security.Principal.WindowsIdentity]::GetCurrent();$execIdentity=[string]$wi.Name;$targetTemp=$null;if($execIdentity -match '(?i)(^|\\\\)mantenimientorci$'){$allProfiles=@(Get-CimInstance Win32_UserProfile -ErrorAction Stop|Where-Object{-not $_.Special -and $_.LocalPath -and $_.SID});$profiles=@($allProfiles|Where-Object{$profile=$_;$account='';try{$account=([Security.Principal.SecurityIdentifier]::new([string]$profile.SID)).Translate([Security.Principal.NTAccount]).Value}catch{};if($account -match '(?i)(^|\\\\)fila4$'){return $true};return ((Split-Path -Leaf ([string]$profile.LocalPath))-match '(?i)^fila4$')});if($profiles.Count-ne1){throw 'KHORA_FILA4_PROFILE_NOT_UNIQUE'};$fila4Root=[IO.Path]::GetFullPath([string]$profiles[0].LocalPath).TrimEnd('\\');if(-not(Test-Path -LiteralPath $fila4Root -PathType Container)){throw 'KHORA_FILA4_PROFILE_DIRECTORY_MISSING'};if([string]$profiles[0].SID -eq [string]$wi.User.Value){throw 'KHORA_FILA4_PROFILE_IS_EXECUTION_IDENTITY'};$desktop=Join-Path $fila4Root 'Desktop';$appData=Join-Path $fila4Root 'AppData\\Roaming';$localAppData=Join-Path $fila4Root 'AppData\\Local';$tempRoot=Join-Path $localAppData 'Temp';$rootPrefix=$fila4Root.TrimEnd('\\')+'\\';$guardPaths=@($fila4Root,(Join-Path $fila4Root 'AppData'),$desktop,$appData,$localAppData,$tempRoot);foreach($targetPath in $guardPaths){$full=[IO.Path]::GetFullPath($targetPath);if(($full-ne$fila4Root)-and-not$full.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'KHORA_FILA4_PATH_OUTSIDE_PROFILE'};if(Test-Path -LiteralPath $full){$item=Get-Item -LiteralPath $full -Force -ErrorAction Stop;if(($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw ('KHORA_FILA4_REPARSE_POINT_REFUSED: '+$full)}}};foreach($directory in @($desktop,$appData,$localAppData,$tempRoot)){if(-not(Test-Path -LiteralPath $directory -PathType Container)){New-Item -ItemType Directory -Path $directory -Force -ErrorAction Stop|Out-Null};$item=Get-Item -LiteralPath $directory -Force -ErrorAction Stop;if(($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw ('KHORA_FILA4_REPARSE_POINT_REFUSED: '+$directory)}};$driveRoot=[IO.Path]::GetPathRoot($fila4Root);$env:USERPROFILE=$fila4Root;$env:HOME=$fila4Root;$env:HOMEDRIVE=$driveRoot.TrimEnd('\\');$env:HOMEPATH='\\' + $fila4Root.Substring($driveRoot.Length).TrimStart('\\');$env:APPDATA=$appData;$env:LOCALAPPDATA=$localAppData;$env:TEMP=$tempRoot;$env:TMP=$tempRoot;$env:GH_CONFIG_DIR=Join-Path $appData 'GitHub CLI';$env:GIT_CONFIG_GLOBAL=Join-Path $appData 'gitconfig';$env:NPM_CONFIG_CACHE=Join-Path $localAppData 'npm-cache';$env:XDG_CONFIG_HOME=Join-Path $localAppData 'xdg-config';$env:XDG_DATA_HOME=Join-Path $localAppData 'xdg-data';$machinePath=[Environment]::GetEnvironmentVariable('Path','Machine');$env:Path=(@($machinePath,(Join-Path $env:ProgramFiles 'Git\\cmd'),(Join-Path $env:ProgramFiles 'GitHub CLI'),(Join-Path $env:ProgramFiles 'nodejs'),(Join-Path $localAppData 'Programs\\Git\\cmd'),(Join-Path $localAppData 'Programs\\GitHub CLI'),(Join-Path $localAppData 'Programs\\nodejs'),(Join-Path $localAppData 'Microsoft\\WinGet\\Links'),(Join-Path $appData 'npm'))|Where-Object{-not [string]::IsNullOrWhiteSpace([string]$_)}|Select-Object -Unique)-join ';';$machineModules=[Environment]::GetEnvironmentVariable('PSModulePath','Machine');$env:PSModulePath=(@($machineModules,(Join-Path $fila4Root 'Documents\\WindowsPowerShell\\Modules'))|Where-Object{-not [string]::IsNullOrWhiteSpace([string]$_)}|Select-Object -Unique)-join ';';$targetTemp=$tempRoot}else{$targetTemp=[IO.Path]::GetTempPath()};if([string]::IsNullOrWhiteSpace($targetTemp)-or-not(Test-Path -LiteralPath $targetTemp -PathType Container)){throw 'KHORA_TEMP_DIRECTORY_INVALID'}",
    "$k=([string](Get-Clipboard -Raw -ErrorAction Stop)).Trim()",
    "Set-Clipboard -Value ' '",
    "if([string]::IsNullOrWhiteSpace($k)){throw 'KHORA_TOKEN_MISSING'}",
    "if($k -notmatch '^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$'){throw 'KHORA_TOKEN_FORMAT_INVALID'}",
    "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12",
    "$winps=Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'",
    "$p=Join-Path $targetTemp (\'khora-bootstrap-\'+[guid]::NewGuid().ToString(\'N\')+\'.ps1\')",
    "$tf=Join-Path $targetTemp (\'khora-token-\'+[guid]::NewGuid().ToString(\'N\')+\'.dpapi\')",
    "$headers=@{Authorization=('Bearer '+$k);Accept='text/plain';'Cache-Control'='no-cache';'User-Agent'='khora-ep-launcher/5'}",
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
    version: "5",
    platform: "windows",
    shell: "windows-powershell",
    minimumVersion: "5.1",
    storageBackend: "bitlocker-vhdx",
    execution: "windows-powershell-5.1-dpapi-native-token-fila4-data-root",
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
  let workspaceRepos: unknown = undefined;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        if (typeof body.platform === "string" && body.platform.trim()) platform = body.platform.trim().toLowerCase();
        if ("repositories" in body) workspaceRepos = body.repositories;
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
    const issued = await createEpSessionToken(email, origin, "normal", workspaceRepos);
    const apiBase = issued.payload.aud;
    const launcher = getNormalLauncherDescriptor(apiBase);
    return NextResponse.json({ token: issued.token, sessionId: issued.payload.sid, expiresAt: issued.expiresAt, command: launcher.command, apiBase, mode: "normal", launcher }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "invalid_workspace_repositories") return NextResponse.json({ error: "invalid_workspace_repositories" }, { status: 400, headers: NO_STORE_HEADERS });
    if (message === "workspace_repository_not_found") return NextResponse.json({ error: "workspace_repository_not_found" }, { status: 400, headers: NO_STORE_HEADERS });
    if (message === "github_catalog_unavailable") return NextResponse.json({ error: "workspace_catalog_unavailable" }, { status: 503, headers: NO_STORE_HEADERS });
    if (message === "rate_limit_exceeded") return NextResponse.json({ error: "rate_limit_exceeded", message: "Máximo de cinco emisiones cada quince minutos." }, { status: 429, headers: NO_STORE_HEADERS });
    return NextResponse.json({ error: "token_issue_unavailable", message: "No se pudo emitir el token Khora de forma segura." }, { status: 503, headers: NO_STORE_HEADERS });
  }
}
