$ErrorActionPreference = 'Stop'
$desktop = 'C:\Users\fila4\Desktop'
$root = $PSScriptRoot
$authFile = Join-Path $root 'extension\local-auth.js'
$pidFile = Join-Path $root 'collector\service.pid'
$log = Join-Path $desktop 'log.txt'
Start-Transcript -LiteralPath $log -Force | Out-Null
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
