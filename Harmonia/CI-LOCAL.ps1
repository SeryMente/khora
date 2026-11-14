$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $projectRoot

function Invoke-Check {
  param([string]$Name,[scriptblock]$Action)
  Write-Host ("[HARMONIA CI] " + $Name) -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw ("HARMONIA_CI_FAILED: " + $Name + " (exit " + $LASTEXITCODE + ")")
  }
}

$runtimeFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File |
  Where-Object {
    $_.FullName -notmatch '[\\/]archive[\\/]' -and
    $_.Extension -in '.js','.mjs'
  }
$testFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File |
  Where-Object {
    $_.FullName -notmatch '[\\/]archive[\\/]' -and
    $_.Name -match '\.test\.(js|mjs)$'
  }
$powerShellFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File |
  Where-Object {
    $_.FullName -notmatch '[\\/]archive[\\/]' -and
    $_.Extension -in '.ps1','.psm1'
  }
$jsonFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File |
  Where-Object {
    $_.FullName -notmatch '[\\/]archive[\\/]' -and $_.Extension -eq '.json'
  }

Write-Host ("[HARMONIA CI] Runtime modules: " + $runtimeFiles.Count)
foreach ($file in $runtimeFiles) {
  & node --check $file.FullName
  if ($LASTEXITCODE -ne 0) { throw ("JavaScript syntax failed: " + $file.FullName) }
}

Write-Host ("[HARMONIA CI] Node test files: " + $testFiles.Count)
if ($testFiles.Count -eq 0) { throw 'No Harmonia test files were found.' }
$testPaths = @($testFiles | ForEach-Object { $_.FullName })
& node --test @testPaths
if ($LASTEXITCODE -ne 0) { throw ("Harmonia Node tests failed: " + $LASTEXITCODE) }

Write-Host ("[HARMONIA CI] PowerShell files: " + $powerShellFiles.Count)
foreach ($file in $powerShellFiles) {
  $tokens = $null
  $parseErrors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    $file.FullName,[ref]$tokens,[ref]$parseErrors
  ) | Out-Null
  if ($parseErrors.Count -gt 0) {
    $details = ($parseErrors | ForEach-Object { $_.Message }) -join '; '
    throw ("PowerShell parser failed: " + $file.FullName + " :: " + $details)
  }
}

Write-Host ("[HARMONIA CI] JSON files: " + $jsonFiles.Count)
foreach ($file in $jsonFiles) {
  try {
    Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -ErrorAction Stop | Out-Null
  } catch {
    throw ("JSON invalid: " + $file.FullName + " :: " + $_.Exception.Message)
  }
}

$manifestPath = Join-Path $projectRoot 'Extension\manifest.json'
$buildInfoPath = Join-Path $projectRoot 'Extension\build-info.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$buildInfo = Get-Content -LiteralPath $buildInfoPath -Raw | ConvertFrom-Json
if ($manifest.version -ne $buildInfo.version) {
  throw ("Manifest/build-info version mismatch: " + $manifest.version + " / " + $buildInfo.version)
}
if ($manifest.version -ne '0.6.0') { throw 'This CI contract requires Harmonia 0.6.0.' }
if ($buildInfo.sourceRevision -notmatch '^[a-f0-9]{40}$') { throw 'build-info sourceRevision must be a full hexadecimal Git commit SHA.' }

$starter = Get-Content -LiteralPath (Join-Path $projectRoot 'INICIAR-HARMONIA.ps1') -Raw
foreach ($required in @('activity-observer.js','activity-telemetry.js',"manifest.version -ne '0.6.0'","collectorVersion -eq '0.6.0'")) {
  if (-not $starter.Contains($required)) { throw ("Initializer contract mismatch: " + $required) }
}
if ($starter.Contains('cycle-observer.js') -or $starter.Contains("manifest.version -ne '0.5.0'") -or $starter.Contains("collectorVersion -eq '0.5.0'")) {
  throw 'Initializer still requires the retired 0.5.0 temporal contract.'
}
$stopper = Get-Content -LiteralPath (Join-Path $projectRoot 'DETENER-HARMONIA.ps1') -Raw
foreach ($required in @('CENTRAL\fila4','CENTRAL\MantenimientoRCI',"C:\Users\fila4\AppData\Local")) {
  if (-not $stopper.Contains($required)) { throw ("Stopper identity/profile contract mismatch: " + $required) }
}
if ($stopper.Contains('$env:LOCALAPPDATA')) { throw 'Stopper must resolve the fila4-owned state path explicitly.' }
$gitIgnoreText = Get-Content -LiteralPath (Join-Path $projectRoot '.gitignore') -Raw
if (-not $gitIgnoreText.Contains('/Extension/local-auth.js')) { throw 'Local authentication file is not excluded from Git.' }

$scriptFiles = @($manifest.content_scripts | ForEach-Object { $_.js }) | Select-Object -Unique
foreach ($script in $scriptFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path (Split-Path $manifestPath -Parent) $script))) {
    throw ("Manifest references missing content script: " + $script)
  }
}
if ($scriptFiles -notcontains 'activity-observer.js') { throw 'Manifest does not load activity-observer.js.' }
if ($scriptFiles -contains 'cycle-observer.js') { throw 'Manifest still loads retired cycle-observer.js.' }

$runtimeCode = Get-ChildItem -LiteralPath $projectRoot -Recurse -File |
  Where-Object {
    $_.FullName -notmatch '[\\/]archive[\\/]' -and
    $_.Name -notmatch '\.test\.(js|mjs)$' -and
    $_.Extension -in '.js','.mjs'
  }
$forbiddenRuntimePatterns = @(
  'performance\.now\s*\(',
  'Date\.now\s*\(\)\s*[-+]',
  '\bdurationMs\s*:',
  '\bduration_ms\s*:',
  '\belapsed_ms\s*:',
  '\bmonotonic_ms\s*:',
  '\bmeanMs\s*:',
  '\bmedianMs\s*:',
  '\bp90Ms\s*:'
)
foreach ($file in $runtimeCode) {
  $matches = Select-String -LiteralPath $file.FullName -Pattern $forbiddenRuntimePatterns -AllMatches
  if ($matches) {
    $detail = ($matches | ForEach-Object { $_.Line.Trim() }) -join ' | '
    throw ("Temporal metric producer pattern found in runtime: " + $file.FullName + " :: " + $detail)
  }
}

$server = Get-Content -LiteralPath (Join-Path $projectRoot 'Collector\server.js') -Raw
if (-not $server.Contains("temporal-metrics-disabled-by-metacanon-52")) {
  throw 'Collector does not reject the retired temporal API.'
}
if (-not $server.Contains("req.url==='/activity'")) { throw 'Collector /activity endpoint missing.' }
if (-not $server.Contains("req.url==='/activity-diagnostics'")) { throw 'Collector /activity-diagnostics endpoint missing.' }

$query = Get-Content -LiteralPath (Join-Path $projectRoot 'Collector\query.ps1') -Raw
if (-not $query.Contains('temporal-metrics-disabled-by-metacanon-52')) {
  throw 'PowerShell -Cycles query is not blocked.'
}
if (-not $query.Contains('if($Activity)')) { throw 'PowerShell -Activity query missing.' }

Write-Host ''
Write-Host 'HARMONIA_CI_RESULT=PASS' -ForegroundColor Green
Write-Host ("RuntimeModules=" + $runtimeFiles.Count)
Write-Host ("NodeTestFiles=" + $testFiles.Count)
Write-Host ("PowerShellFiles=" + $powerShellFiles.Count)
Write-Host ("JsonFiles=" + $jsonFiles.Count)
Write-Host ("ExtensionVersion=" + $manifest.version)
Write-Host 'TemporalMetricProducerScan=PASS'
