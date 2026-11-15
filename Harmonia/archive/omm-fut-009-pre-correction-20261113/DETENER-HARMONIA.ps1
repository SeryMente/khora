$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
if ($identity -ne 'CENTRAL\fila4') { throw "Ejecute desde CENTRAL\fila4. Identidad actual: $identity" }
$authFile = Join-Path $PSScriptRoot 'Extension\local-auth.js'
$state = Join-Path $env:LOCALAPPDATA 'Harmonia\surface-index-v0.4.0\state'
$pidFile = Join-Path $state 'collector.pid'
if (-not (Test-Path -LiteralPath $authFile -PathType Leaf)) { throw 'No existe la credencial local. No se detuvo ningún proceso.' }
$auth = Get-Content -LiteralPath $authFile -Raw
$match = [regex]::Match($auth, "HARMONIA_TOKEN\s*=\s*'([0-9a-f]{64})'")
if (-not $match.Success) { throw 'Formato de credencial incorrecto. No se detuvo ningún proceso.' }
$token = $match.Groups[1].Value
if (-not (Test-Path -LiteralPath $pidFile -PathType Leaf)) { 'SERVICE=PID_FILE_ABSENT'; return }
$servicePid = [int](Get-Content -LiteralPath $pidFile -Raw).Trim()
$null = Invoke-RestMethod -Uri 'http://127.0.0.1:47321/shutdown' -Method Post -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 5
for ($i=0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    if (-not (Get-Process -Id $servicePid -ErrorAction SilentlyContinue)) { break }
}
if (Get-Process -Id $servicePid -ErrorAction SilentlyContinue) { throw 'El colector no confirmó el cierre. No se forzó la terminación.' }
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
'SERVICE=STOPPED'
'PID=' + $servicePid
'DATA_PRESERVED=TRUE'
'LOCAL_AUTH_PRESERVED=TRUE'
