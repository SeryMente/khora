$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root "KhoraLiveCaptionBridge.csproj"
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  throw "No se encontró dotnet en PATH."
}
if (-not (Test-Path -LiteralPath $project)) {
  throw "No se encontró el proyecto del bridge: $project"
}

Write-Host "Khora Live Caption Bridge"
Write-Host "WebSocket: ws://127.0.0.1:8788/"
Write-Host "Health:    http://127.0.0.1:8788/health"
Write-Host "Sondeo:    150 ms"
Write-Host "Estabilidad: 750 ms"
Write-Host ""

dotnet run --project $project -- --interval-ms 150 --stability-ms 750 --port 8788
