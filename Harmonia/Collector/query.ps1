param(
  [string]$Session,
  [string]$Type,
  [string]$Since,
  [int]$Limit=100,
  [switch]$Coverage,
  [switch]$Cycles,
  [switch]$Activity
)
$ErrorActionPreference='Stop'
$root=$env:HARMONIA_DATA
if(-not $root){$root='C:\Users\fila4\AppData\Local\Harmonia\surface-index-v0.4.0\data'}
$indexPath=Join-Path $root 'index.json'
if(-not(Test-Path -LiteralPath $indexPath)){throw "Índice no disponible: $indexPath"}
$idx=Get-Content -LiteralPath $indexPath -Raw | ConvertFrom-Json

$forbiddenTemporalKeys=@(
 'durationMs','duration_ms','legacyDurationMs','legacy_duration_ms',
 'elapsed_ms','elapsedMs','monotonic_ms','monotonicMs',
 'clock_precision_ms','clockPrecisionMs','settle_window_ms','settleWindowMs',
 'meanMs','medianMs','p90Ms','legacyMedianMs','legacyP90Ms',
 'latency','latencyMs','waitMs','processingDuration','processing_ms'
)
$legacyTemporalTypes=@('client.cycle.started','client.cycle.completed','diag.cycle.trace')

function Remove-TemporalFields {
 param([AllowNull()][object]$Value)
 if($null -eq $Value){return $null}
 if($Value -is [System.Array]){
  $items=@()
  foreach($item in $Value){$items+=,(Remove-TemporalFields -Value $item)}
  return ,$items
 }
 if($Value -is [System.Management.Automation.PSCustomObject]){
  $result=[ordered]@{}
  foreach($property in $Value.PSObject.Properties){
   if($forbiddenTemporalKeys -contains $property.Name){continue}
   $result[$property.Name]=Remove-TemporalFields -Value $property.Value
  }
  return [pscustomobject]$result
 }
 if($Value -is [System.Collections.IDictionary]){
  $result=[ordered]@{}
  foreach($key in $Value.Keys){
   if($forbiddenTemporalKeys -contains [string]$key){continue}
   $result[[string]$key]=Remove-TemporalFields -Value $Value[$key]
  }
  return [pscustomobject]$result
 }
 return $Value
}
function Read-HarmoniaEvents {
 param([string]$Directory,[string]$SessionId)
 if(-not(Test-Path -LiteralPath $Directory)){throw "Directorio JSONL no disponible: $Directory"}
 $events=New-Object System.Collections.Generic.List[object]
 foreach($file in (Get-ChildItem -LiteralPath $Directory -Recurse -File -Filter '*.jsonl')){
  foreach($line in [System.IO.File]::ReadLines($file.FullName)){
   if([string]::IsNullOrWhiteSpace($line)){continue}
   try{$event=ConvertFrom-Json -InputObject $line -ErrorAction Stop}catch{continue}
   if($SessionId -and $event.sessionId -ne $SessionId){continue}
   if($legacyTemporalTypes -contains [string]$event.type){continue}
   $events.Add($event)
  }
 }
 return $events
}

if($Cycles){
 throw 'temporal-metrics-disabled-by-metacanon-52: la consulta de ciclos/duración está deshabilitada; use -Activity para estados estructurales.'
}
if($Activity){
 $originalsDir=Join-Path $root 'originals'
 $events=Read-HarmoniaEvents -Directory $originalsDir -SessionId $Session
 $activityEvents=@($events | Where-Object {$_.type -eq 'ui.activity.state' -and ((-not $Since) -or ([datetime]$_.capturedAt -ge [datetime]$Since))})
 $summary=[ordered]@{
  schema='harmonia.activity-summary.v1'
  totalCount=$activityEvents.Count
  activeStates=@($activityEvents | Where-Object {$_.payload.state -eq 'ACTIVE'}).Count
  inactiveStates=@($activityEvents | Where-Object {$_.payload.state -eq 'INACTIVE'}).Count
  transitions=[ordered]@{
   INITIALIZED=@($activityEvents | Where-Object {$_.payload.transition -eq 'INITIALIZED'}).Count
   ACTIVATED=@($activityEvents | Where-Object {$_.payload.transition -eq 'ACTIVATED'}).Count
   DEACTIVATED=@($activityEvents | Where-Object {$_.payload.transition -eq 'DEACTIVATED'}).Count
  }
  lastState=$null
  lastTransition=$null
  lastCapturedAt=$null
 }
 $latest=$activityEvents | Sort-Object { [string]$_.capturedAt } -Descending | Select-Object -First 1
 if($latest){$summary.lastState=$latest.payload.state;$summary.lastTransition=$latest.payload.transition;$summary.lastCapturedAt=$latest.capturedAt}
 [pscustomobject]$summary | ConvertTo-Json -Depth 8
 return
}
if($Coverage){
 if(-not $idx.coverage){throw 'El índice de completitud aún no contiene barridos de interfaz. Inicie Harmonia y navegue de forma natural.'}
 Remove-TemporalFields -Value $idx.coverage | ConvertTo-Json -Depth 10
 return
}
if(-not $Session){
 $sessionRows=@()
 foreach($property in $idx.sessions.PSObject.Properties){
  $types=$property.Value.types.PSObject.Properties |
   Where-Object {$legacyTemporalTypes -notcontains $_.Name} |
   ForEach-Object {"$($_.Name):$($_.Value)"}
  $sessionRows += [pscustomobject]@{
   Session=$property.Name;First=$property.Value.firstAt;Last=$property.Value.lastAt;
   Events=$property.Value.events;Types=($types -join ', ');File=$property.Value.file
  }
 }
 $sessionRows | Sort-Object Last -Descending | Format-Table -AutoSize
 if($idx.coverage){
  Write-Output ''
  Write-Output 'ÍNDICE DE COMPLETITUD'
  Write-Output "Global: $($idx.coverage.combinedPercent)% | Documentación: $($idx.coverage.documentation.percent)% | Observación natural: $($idx.coverage.naturalObservation.percent)%"
  Write-Output "Funciones vistas: $($idx.coverage.naturalObservation.covered)/$($idx.coverage.featureCount) | Barridos: $($idx.coverage.scanCount) | Pendientes por clasificar: $($idx.coverage.unknownControlCount)"
  Write-Output "Último barrido: $($idx.coverage.lastScanAt)"
 }
 return
}
$session=$idx.sessions.$Session
if(-not $session){throw "Sesión no encontrada: $Session"}
$filePath=Join-Path $root $session.file
$events=Get-Content -LiteralPath $filePath |
 ForEach-Object {$_ | ConvertFrom-Json} |
 Where-Object {
  ($legacyTemporalTypes -notcontains [string]$_.type) -and
  ((-not $Type) -or ($_.type -like "*$Type*")) -and
  ((-not $Since) -or ([datetime]$_.capturedAt -ge [datetime]$Since))
 } |
 Select-Object -First $Limit |
 ForEach-Object {Remove-TemporalFields -Value $_}
$events | ConvertTo-Json -Depth 20
