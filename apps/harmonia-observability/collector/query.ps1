param([string]$Session,[string]$Type,[string]$Since,[int]$Limit=100,[switch]$Coverage,[switch]$Cycles)
$ErrorActionPreference='Stop'
$root = $env:HARMONIA_DATA
if (-not $root) { $root = 'C:\Users\fila4\AppData\Local\Harmonia\surface-index-v0.3.0\data' }
$indexPath = Join-Path $root 'index.json'
if (-not (Test-Path -LiteralPath $indexPath)) { throw "Índice no disponible: $indexPath" }
$idx = Get-Content -LiteralPath $indexPath -Raw | ConvertFrom-Json
if ($Cycles) {
  $originalsDir = Join-Path $root 'originals'
  if (-not (Test-Path -LiteralPath $originalsDir)) { throw "Directorio JSONL no disponible: $originalsDir" }
  $starts = New-Object System.Collections.Generic.List[object]
  $groups = @{}
  $stops = New-Object System.Collections.Generic.List[object]
  $files = Get-ChildItem -LiteralPath $originalsDir -Recurse -File -Filter '*.jsonl'
  foreach ($file in $files) {
    foreach ($line in [System.IO.File]::ReadLines($file.FullName)) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      try { $event = ConvertFrom-Json -InputObject $line -ErrorAction Stop } catch { continue }
      if ($Session -and $event.sessionId -ne $Session) { continue }
      if ($event.type -eq 'client.cycle.started' -or $event.type -eq 'client.cycle.completed') {
        $payload = $event.payload
        if (-not $payload -or -not $payload.conversation_id -or -not $payload.cycle_id) { continue }
        $key = [string]$payload.conversation_id + '|' + [string]$payload.cycle_id
        if (-not $groups.ContainsKey($key)) { $groups[$key] = [pscustomobject]@{ Start = $null; Complete = $null; Conflict = $false } }
        if ($event.type -eq 'client.cycle.started') {
          if ($groups[$key].Start) { $groups[$key].Conflict = $true } else { $groups[$key].Start = $event; $starts.Add($event) }
        } else {
          if ($groups[$key].Complete) { $groups[$key].Conflict = $true } else { $groups[$key].Complete = $event }
        }
      } elseif ($event.type -eq 'capture.stopped') { $stops.Add($event) }
    }
  }
  $results = New-Object System.Collections.Generic.List[object]
  foreach ($key in $groups.Keys) {
    $group = $groups[$key]; $startEvent = $group.Start; $completeEvent = $group.Complete
    if (-not $startEvent) { continue }
    if ($Since -and ([datetime]$startEvent.capturedAt -lt [datetime]$Since)) { continue }
    $p = $startEvent.payload; $status = 'NOT_MEASURED'; $duration = $null; $completedAt = $null; $reason = $null
    if ($group.Conflict) {
      $reason = 'conflicting_duplicate_cycle_events'
    } elseif ($completeEvent) {
      $q = $completeEvent.payload; $delta = [double]$q.monotonic_ms - [double]$p.monotonic_ms
      $validPair = ($completeEvent.sessionId -eq $startEvent.sessionId) -and
        ($q.conversation_id -eq $p.conversation_id) -and ($q.cycle_id -eq $p.cycle_id) -and
        ($q.clock_source -eq $p.clock_source) -and ($q.clock_precision_ms -eq $p.clock_precision_ms) -and
        ($delta -ge 0) -and ([math]::Abs($delta - [double]$q.duration_ms) -le 0.001)
      if ($validPair) { $status = 'COMPLETED'; $duration = [double]$q.duration_ms; $completedAt = [string]$completeEvent.capturedAt }
      else { $reason = 'cycle_pair_or_monotonic_duration_mismatch' }
    } else {
      $replacement = @($starts | Where-Object {
        $_.payload.conversation_id -eq $p.conversation_id -and $_.sessionId -eq $startEvent.sessionId -and
        [double]$_.payload.monotonic_ms -gt [double]$p.monotonic_ms
      } | Sort-Object { [double]$_.payload.monotonic_ms } | Select-Object -First 1)
      if ($replacement.Count -gt 0) { $reason = 'new_user_turn_replaced_previous' }
      else {
        $stopEvent = @($stops | Where-Object {
          $_.sessionId -eq $startEvent.sessionId -and ([datetime]$_.capturedAt -ge [datetime]$startEvent.capturedAt)
        } | Sort-Object { [datetime]$_.capturedAt } | Select-Object -First 1)
        if ($stopEvent.Count -gt 0) {
          switch ([string]$stopEvent[0].payload.reason) {
            'tab-closed' { $reason = 'tab_closed' }
            'tab-left-chatgpt' { $reason = 'navigation_away_from_chatgpt' }
            'automatic-capture-paused' { $reason = 'automatic_observation_paused' }
            default { $reason = 'no_verified_final_event_cause_undetermined' }
          }
        } else { $reason = 'no_verified_final_event_cause_undetermined' }
      }
    }
    $results.Add([pscustomobject]@{
      conversation_id = [string]$p.conversation_id
      cycle_id = [string]$p.cycle_id
      session_id = [string]$startEvent.sessionId
      status = $status
      duration_ms = $duration
      started_at_utc = [string]$p.timestamp_utc
      completed_at_utc = $completedAt
      reason = $reason
    })
  }
  $output = @($results | Sort-Object { [datetime]$_.started_at_utc } -Descending | Select-Object -First $Limit)
  $output | ConvertTo-Json -Depth 8
  return
}
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
