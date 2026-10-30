param([string]$Session,[string]$Type,[string]$Since,[int]$Limit=100,[string]$DataRoot,[switch]$Coverage)
$ErrorActionPreference='Stop'
$root = $DataRoot
if (-not $root) { $root = $env:HARMONIA_DATA }
if (-not $root) {
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $windowsProfile = Get-CimInstance -ClassName Win32_UserProfile | Where-Object { $_.SID -eq $sid -and -not $_.Special } | Select-Object -First 1
  if (-not $windowsProfile -or [string]::IsNullOrWhiteSpace($windowsProfile.LocalPath)) { throw 'No se pudo resolver el perfil Windows activo por SID.' }
  $root = Join-Path $windowsProfile.LocalPath 'AppData\Local\Harmonia\surface-index-v0.4.0\data'
}
$root = [IO.Path]::GetFullPath($root)
$indexPath = Join-Path $root 'index.json'
if (-not (Test-Path -LiteralPath $indexPath)) { throw "Índice no disponible: $indexPath" }
$idx = Get-Content -LiteralPath $indexPath -Raw | ConvertFrom-Json
if ($Coverage) {
  if (-not $idx.coverage) { throw 'El índice de completitud aún no contiene barridos de interfaz. Inicie Harmonia y navegue de forma natural.' }
  $idx.coverage | ConvertTo-Json -Depth 10
  return
}
if (-not $Session) {
  $idx.sessions.PSObject.Properties |
    ForEach-Object { [pscustomobject]@{Session=$_.Name;First=$_.Value.firstAt;Last=$_.Value.lastAt;Events=$_.Value.events;Types=($_.Value.types.PSObject.Properties | ForEach-Object { "$($_.Name):$($_.Value)" }) -join ', ';File=$_.Value.file} } |
    Sort-Object Last -Descending | Format-Table -AutoSize
  if ($idx.coverage) {
    Write-Output ''
    Write-Output 'ÍNDICE DE COMPLETITUD'
    Write-Output "Global: $($idx.coverage.combinedPercent)% | Documentación: $($idx.coverage.documentation.percent)% | Observación natural: $($idx.coverage.naturalObservation.percent)%"
    Write-Output "Funciones vistas: $($idx.coverage.naturalObservation.covered)/$($idx.coverage.featureCount) | Barridos: $($idx.coverage.scanCount) | Pendientes por clasificar: $($idx.coverage.unknownControlCount)"
    Write-Output "Último barrido: $($idx.coverage.lastScanAt)"
  }
  return
}
$s = $idx.sessions.$Session
if (-not $s) { throw "Sesión no encontrada: $Session" }
$p = Join-Path $root $s.file
$events = Get-Content -LiteralPath $p |
  ForEach-Object { $_ | ConvertFrom-Json } |
  Where-Object { ((-not $Type) -or ($_.type -like "*$Type*")) -and ((-not $Since) -or ([datetime]$_.capturedAt -ge [datetime]$Since)) } |
  Select-Object -First $Limit
$events | ConvertTo-Json -Depth 20
