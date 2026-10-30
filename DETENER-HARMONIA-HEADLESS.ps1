$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logsDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
$log = Join-Path $logsDir 'DETENER-HARMONIA-HEADLESS.log'
Start-Transcript -LiteralPath $log -Force | Out-Null
$authFile = Join-Path $root 'extension\local-auth.js'
$pidFile = Join-Path $root 'collector\service.pid'
try {
    if (-not (Test-Path -LiteralPath $authFile -PathType Leaf)) { throw 'No existe la credencial local de Harmonia.' }
    $auth = Get-Content -LiteralPath $authFile -Raw
    $match = [regex]::Match($auth, "HARMONIA_TOKEN\s*=\s*'([0-9a-f]{64})'")
    if (-not $match.Success) { throw 'Formato de credencial no válido.' }
    $token = $match.Groups[1].Value
    if (-not (Test-Path -LiteralPath $pidFile)) { 'SERVICE=PID_FILE_ABSENT'; return }
    $servicePid = [int](Get-Content -LiteralPath $pidFile -Raw).Trim()
    $proc = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $servicePid) -ErrorAction SilentlyContinue
    if (-not $proc) { Remove-Item -LiteralPath $pidFile -Force; 'SERVICE=ALREADY_STOPPED'; return }
    $expectedNode = Join-Path $root 'runtime\node.exe'
    if ($proc.ExecutablePath -ne $expectedNode -or $proc.CommandLine -notlike '*server.js*') {
        throw 'El PID no corresponde al runtime portable de Harmonia de esta carpeta. No se cambió ningún proceso.'
    }
    $data = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Harmonia\surface-index-v0.4.0\data'
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 5
    if (-not $health.ok -or [IO.Path]::GetFullPath($health.root) -ne [IO.Path]::GetFullPath($data)) { throw 'El colector activo no pertenece al almacén de Harmonia de este perfil; no se detuvo.' }
    $null = Invoke-RestMethod -Uri 'http://127.0.0.1:47321/shutdown' -Method Post -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 5
    for ($i=0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 250
        if (-not (Get-Process -Id $servicePid -ErrorAction SilentlyContinue)) { break }
    }
    if (Get-Process -Id $servicePid -ErrorAction SilentlyContinue) { throw 'El colector no terminó por su endpoint autenticado; no se forzó su terminación.' }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    'SERVICE=STOPPED'
    'PID=' + $servicePid
} finally {
    Stop-Transcript | Out-Null
}
