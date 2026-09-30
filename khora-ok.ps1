# KHORA · operador rápido de producción
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo = 'SeryMente/khora'
$ProductionUrl = 'https://khora-web.vercel.app'
$ProofPath = '/ep-main-live.json'
$Workflow = 'deploy-production.yml'

function Invoke-Gh {
    param([Parameter(Mandatory=$true)][string[]]$Arguments)
    $output = @(& gh @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw ('gh fallo: ' + (($output | ForEach-Object { [string]$_ }) -join ' '))
    }
    return $output
}

function Invoke-GhJson {
    param([Parameter(Mandatory=$true)][string[]]$Arguments)
    $output = @(& gh @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw ('gh fallo: ' + (($output | ForEach-Object { [string]$_ }) -join ' '))
    }
    $json = ($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
    return ($json | ConvertFrom-Json)
}

$repoRoot = ([string](Invoke-Gh @('repo','view',$Repo,'--json','nameWithOwner','-q','.nameWithOwner'))).Trim()
if ($repoRoot -ne $Repo) { throw 'El repositorio GitHub no coincide con SeryMente/khora.' }

$mainSha = ([string](Invoke-Gh @('api',('repos/{0}/commits/main' -f $Repo),'--jq','.sha'))).Trim()
if ($mainSha -notmatch '^[0-9a-f]{40}$') { throw 'No se pudo fijar un SHA valido de main.' }

$remote = ([string](Invoke-Gh @('api',('repos/{0}/git/ref/heads/main' -f $Repo),'--jq','.object.sha'))).Trim()
if ($remote -ne $mainSha) { throw 'GitHub devolvio SHA inconsistente para main.' }

Write-Host ('KHORA-OK · main ' + $mainSha.Substring(0,12)) -ForegroundColor Cyan
Write-Host 'Preparando deploy de main en Vercel...' -ForegroundColor DarkGray
$rows = @(Invoke-GhJson @('run','list','--repo',$Repo,'--workflow',$Workflow,'--branch','main','--limit','20','--json','databaseId,headSha,status,conclusion,createdAt,url'))
$run = $rows |
    Where-Object {
        $_.headSha -eq $mainSha -and
        @('queued','in_progress') -contains [string]$_.status
    } |
    Sort-Object { [int64]$_.databaseId } -Descending |
    Select-Object -First 1

$dispatchAt = $null
if ($null -eq $run) {
    $dispatchAt = (Get-Date).ToUniversalTime()
    Write-Host 'No hay deploy activo para este SHA; iniciando workflow_dispatch...' -ForegroundColor DarkGray
    Invoke-Gh @('workflow','run',$Workflow,'--repo',$Repo,'--ref','main') | Out-Null
}

for ($attempt = 1; $attempt -le 45; $attempt++) {
    if ($null -ne $run) { break }
    Start-Sleep -Seconds 2
    $rows = @(Invoke-GhJson @('run','list','--repo',$Repo,'--workflow',$Workflow,'--branch','main','--limit','20','--json','databaseId,headSha,status,conclusion,createdAt,url'))
    $run = $rows |
        Where-Object {
            $_.headSha -eq $mainSha -and
            (
                @('queued','in_progress') -contains [string]$_.status -or
                ($null -ne $dispatchAt -and [DateTimeOffset]::Parse([string]$_.createdAt) -ge [DateTimeOffset]$dispatchAt)
            )
        } |
        Sort-Object { [int64]$_.databaseId } -Descending |
        Select-Object -First 1
    if ($null -ne $run) { break }
}
if ($null -eq $run) { throw 'No se pudo localizar el run de deploy correspondiente al SHA capturado.' }

Write-Host ('Run #' + $run.databaseId + ' · ' + $run.url) -ForegroundColor DarkGray
& gh run watch ([string]$run.databaseId) --repo $Repo --exit-status
if ($LASTEXITCODE -ne 0) { throw ('El deploy de main fallo. Run #' + $run.databaseId + '.') }

$afterSha = ([string](Invoke-Gh @('api',('repos/{0}/commits/main' -f $Repo),'--jq','.sha'))).Trim()
if ($afterSha -ne $mainSha) {
    throw ('main cambio durante el deploy (' + $mainSha.Substring(0,12) + ' -> ' + $afterSha.Substring(0,12) + '). No se considera valido; ejecuta khora-ok de nuevo.')
}

$probeFile = Join-Path $env:TEMP ('khora-live-' + [guid]::NewGuid().ToString('N') + '.tmp')
try {
    $probeRaw = @(& npx vercel curl ($ProductionUrl + '/') '-fsS' '-o' $probeFile 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw ('No se pudo consultar la produccion en Vercel: ' + (($probeRaw | ForEach-Object { [string]$_ }) -join ' '))
    }
} finally {
    Remove-Item -LiteralPath $probeFile -Force -ErrorAction SilentlyContinue
}

Write-Host ('✓ KHORA-OK · main ' + $mainSha.Substring(0,12) + ' esta LIVE en ' + $ProductionUrl) -ForegroundColor Green
