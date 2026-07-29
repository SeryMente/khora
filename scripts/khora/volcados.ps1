function Get-KhoraDir { $d = "$env:USERPROFILE\khora-volcados"; New-Item -ItemType Directory -Force -Path $d | Out-Null; $d }
function Get-KhoraSha([string]$t) { ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($t))) -replace "-","").ToLower() }
function Write-KhoraJson($obj,$path) { [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false))) }
function Add-KhoraBitacora($rec) { Add-Content -Path (Join-Path (Get-KhoraDir) "bitacora.jsonl") -Value ($rec | ConvertTo-Json -Compress -Depth 8) -Encoding utf8 }
function Nuevo-Volcado {
  param([string]$Texto,[string]$Archivo,[switch]$Portapapeles,[string]$Titulo="",[switch]$Enviar)
  if ($Portapapeles) { $Texto = (Get-Clipboard -Raw) }
  if ($Archivo) { $Texto = [IO.File]::ReadAllText($Archivo) }
  if (-not $Texto -or $Texto.Trim().Length -eq 0) { "SIN TEXTO: nada que archivar"; return }
  $dir = Get-KhoraDir; $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"); $sha = Get-KhoraSha $Texto
  $dup = @(Get-ChildItem $dir -Filter "*.json" | Where-Object { $_.Name -like ("*" + $sha.Substring(0,8) + "*") })
  $prov = @{ origen="terminal"; driver="powershell"; timestamp=$ts }
  $rec = [ordered]@{ titulo=$Titulo; texto=$Texto; provenance=$prov; recibido_en=$ts; sha256=$sha; chars=$Texto.Length; io_id=$null; resultado="archivado"; intentos=0; ultimo_error="" }
  $f = Join-Path $dir (($ts -replace "[:\-]","") + "-" + $sha.Substring(0,8) + ".json")
  Write-KhoraJson $rec $f; Add-KhoraBitacora $rec
  "ARCHIVADO: " + (Split-Path $f -Leaf) + "  " + $Texto.Length + " chars"
  if ($dup.Count -gt 0) { "  AVISO texto identico ya archivado: " + ($dup.Name -join ", ") }
  if ($Enviar) { Enviar-Volcado -Ruta $f }
  $f }
function Enviar-Volcado {
  param([Parameter(Mandatory=$true)][string]$Ruta,[int]$TimeoutSec=600)
  $k = $env:X_KHORA_KEY
  if (-not $k -or $k.Length -ne 64) { "  SIN LLAVE EN MEMORIA: carga env-vault.ps1 e Import-KhoraEnvVault"; return }
  $j = Get-Content $Ruta -Raw | ConvertFrom-Json
  $prov = @{ origen=$j.provenance.origen; driver=$j.provenance.driver; timestamp=$j.provenance.timestamp }
  $body = (@{ texto=$j.texto; provenance=$prov } | ConvertTo-Json -Compress -Depth 8)
  $t = Get-Date; $ok = $false; $io = $null; $err = ""; $cod = 0; $txt = ""
  try { $r = Invoke-WebRequest -Uri "https://khora-zy70.onrender.com/api/v1/ingesta" -Method Post -Headers @{ "X-KHORA-KEY"=$k } -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec $TimeoutSec -UseBasicParsing; $ok = $true; $cod = [int]$r.StatusCode; $txt = $r.Content; $io = ($r.Content | ConvertFrom-Json).io_id }
  catch { $cod = [int]$_.Exception.Response.StatusCode; $err = ($_.ErrorDetails.Message -replace "\s+"," "); if (-not $err) { $err = $_.Exception.Message }; $txt = $err }
  $seg = [math]::Round(((Get-Date)-$t).TotalSeconds,1); $n = 1; if ($j.intentos) { $n = [int]$j.intentos + 1 }
  $rec = [ordered]@{ titulo=$j.titulo; texto=$j.texto; provenance=$prov; recibido_en=$j.recibido_en; sha256=$j.sha256; chars=$j.texto.Length; io_id=$io; resultado=$(if($ok){"ok"}else{"fallido"}); intentos=$n; ultimo_intento=(Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"); segundos=$seg; ultimo_error=$err }
  Write-KhoraJson $rec $Ruta; Add-KhoraBitacora $rec
  "  HTTP " + $cod + " en " + $seg + "s :: " + $txt }
function Inventario-Volcados {
  param([switch]$SoloPendientes)
  $dir = Get-KhoraDir
  $items = @(Get-ChildItem $dir -Filter "*.json" | Sort-Object Name | ForEach-Object {
    $j = Get-Content $_.FullName -Raw | ConvertFrom-Json
    $c = $j.chars; if (-not $c) { $c = $j.texto.Length }
    $io = $j.io_id; if (-not $io) { $io = "-" } else { $io = $io.Substring(0,8) }
    $ex = ($j.texto -replace "\s+"," "); if ($ex.Length -gt 44) { $ex = $ex.Substring(0,44) + "..." }
    [pscustomobject]@{ archivo=$_.Name; recibido=$j.recibido_en; chars=$c; estado=$j.resultado; io=$io; extracto=$ex } })
  if ($SoloPendientes) { $items = @($items | Where-Object { $_.estado -ne "ok" }) }
  $items | Format-Table -AutoSize
  "total: " + $items.Count + " volcados | ok: " + @($items | Where-Object { $_.estado -eq "ok" }).Count + " | por enviar: " + @($items | Where-Object { $_.estado -ne "ok" }).Count }
function Reenviar-Pendientes {
  param([int]$Max=5,[int]$TimeoutSec=600)
  $dir = Get-KhoraDir; $n = 0
  foreach ($f in (Get-ChildItem $dir -Filter "*.json" | Sort-Object Name)) {
    $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
    if ($j.resultado -eq "ok") { continue }
    if ($n -ge $Max) { break }
    $n = $n + 1; "REENVIANDO " + $f.Name; Enviar-Volcado -Ruta $f.FullName -TimeoutSec $TimeoutSec }
  if ($n -eq 0) { "nada pendiente" } }