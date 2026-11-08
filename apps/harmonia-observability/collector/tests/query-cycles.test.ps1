$ErrorActionPreference = 'Stop'
$queryPath = Join-Path $PSScriptRoot '..\query.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('harmonia-cycles-' + [guid]::NewGuid().ToString('N'))
$oldRoot = $env:HARMONIA_DATA
try {
  $env:HARMONIA_DATA = $tempRoot
  $jsonlDir = Join-Path $tempRoot 'originals\2026-11-08'
  New-Item -ItemType Directory -Path $jsonlDir -Force | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $tempRoot 'index.json'), '{"schema":"harmonia.index.v1"}', [System.Text.UTF8Encoding]::new($false))
  $session = '123e4567-e89b-42d3-a456-426614174000'
  $conversation = '018bcfe5-6800-7000-8000-000000000001'
  $conversationOther = '018bcfe5-6800-7000-8000-000000000002'
  $events = New-Object System.Collections.Generic.List[object]
  function New-CycleEvent($type,$cycle,$phase,$utc,$mono,$duration,$eventId,$conv) {
    $payload=[ordered]@{conversation_id=$conv;cycle_id=$cycle;phase=$phase;timestamp_utc=$utc;monotonic_ms=$mono;clock_source='performance.now';clock_precision_ms=0.001;coverage='new-dom-node-v1';settle_window_ms=1500}
    if($type -eq 'client.cycle.completed'){$payload['duration_ms']=$duration}
    [pscustomobject]@{schema='harmonia.event.v1';eventId=$eventId;sessionId=$session;type=$type;source='cycle-observer';capturedAt=$utc;payload=[pscustomobject]$payload}
  }
  $events.Add((New-CycleEvent 'client.cycle.started' '018bcfe5-6800-7000-8000-000000000101' 'started' '2026-11-08T16:00:00.100Z' 100 $null '123e4567-e89b-42d3-a456-426614174001' $conversation))
  $events.Add((New-CycleEvent 'client.cycle.completed' '018bcfe5-6800-7000-8000-000000000101' 'completed' '2026-11-08T16:00:00.900Z' 900 800 '123e4567-e89b-42d3-a456-426614174002' $conversation))
  $events.Add((New-CycleEvent 'client.cycle.started' '018bcfe5-6800-7000-8000-000000000102' 'started' '2026-11-08T16:00:01.100Z' 1100 $null '123e4567-e89b-42d3-a456-426614174003' $conversation))
  $events.Add((New-CycleEvent 'client.cycle.started' '018bcfe5-6800-7000-8000-000000000103' 'started' '2026-11-08T16:00:01.200Z' 1200 $null '123e4567-e89b-42d3-a456-426614174004' $conversation))
  $events.Add([pscustomobject]@{schema='harmonia.event.v1';eventId='123e4567-e89b-42d3-a456-426614174005';sessionId=$session;type='capture.stopped';source='extension';capturedAt='2026-11-08T16:00:01.700Z';payload=[pscustomobject]@{reason='tab-closed';durationMs=1700}})
  $events.Add((New-CycleEvent 'client.cycle.started' '018bcfe5-6800-7000-000000000104' 'started' '2026-11-08T16:00:01.800Z' 1800 $null '123e4567-e89b-42d3-a456-426614174006' $conversationOther))
  $jsonLines=@($events|ForEach-Object{$_|ConvertTo-Json -Compress -Depth 8})
  [System.IO.File]::WriteAllLines((Join-Path $jsonlDir ($session+'.jsonl')),$jsonLines,[System.Text.UTF8Encoding]::new($false))
  $rows=@((& $queryPath -Cycles -Limit 20|Out-String)|ConvertFrom-Json)
  $completed=$rows|Where-Object{$_.cycle_id -eq '018bcfe5-6800-7000-000000000101'}
  if($completed.status -ne 'COMPLETED' -or [double]$completed.duration_ms -ne 800){throw 'completed cycle query fixture failed'}
  $replaced=$rows|Where-Object{$_.cycle_id -eq '018bcfe5-6800-7000-000000000102'}
  if($replaced.status -ne 'NOT_MEASURED' -or $replaced.reason -ne 'new_user_turn_replaced_previous' -or $null -ne $replaced.duration_ms){throw 'replaced cycle query fixture failed'}
  $closed=$rows|Where-Object{$_.cycle_id -eq '018bcfe5-6800-7000-000000000103'}
  if($closed.status -ne 'NOT_MEASURED' -or $closed.reason -ne 'tab_closed'){throw 'tab close query fixture failed'}
  $unknown=$rows|Where-Object{$_.cycle_id -eq '018bcfe5-6800-000000000104'}
  if($unknown.status -ne 'NOT_MEASURED' -or $unknown.reason -ne 'no_verified_final_event_cause_undetermined'){throw 'unknown-cause query fixture failed'}
  Write-Output 'synthetic cycle query fixtures: PASS'
}
finally {
  if($null -eq $oldRoot){Remove-Item Env:HARMONIA_DATA -ErrorAction SilentlyContinue}else{$env:HARMONIA_DATA=$oldRoot}
  if(Test-Path -LiteralPath $tempRoot){Remove-Item -LiteralPath $tempRoot -Recurse -Force}
}