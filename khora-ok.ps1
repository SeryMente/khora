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
Write-Host 'Iniciando deploy de main en Vercel...' -ForegroundColor DarkGray
Invoke-Gh @('workflow','run',$Workflow,'--repo',$Repo,'--ref','main') | Out-Null

$beforeRows = @(Invoke-GhJson @('run','list','--repo',$Repo,'--workflow',$Workflow,'--branch','main','--limit','20','--json','databaseId,headSha,status,conclusion,createdAt,url'))
$beforeMaxId = ($beforeRows | Where-Object { $_.headSha -eq $mainSha } | ForEach-Object { [int64]$_.databaseId } | Measure-Object -Maximum).Maximum
if ($null -eq $beforeMaxId) { $beforeMaxId = 0 }

$run = $null
for ($attempt = 1; $attempt -le 45; $attempt++) {
    Start-Sleep -Seconds 2
    $rows = @(Invoke-GhJson @('run','list','--repo',$Repo,'--workflow',$Workflow,'--branch','main','--limit','20','--json','databaseId,headSha,status,conclusion,createdAt,url'))
    $run = $rows |
        Where-Object {
            $_.headSha -eq $mainSha -and
            ([int64]$_.databaseId) -gt [int64]$beforeMaxId
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

$proof = Invoke-RestMethod -Uri ($ProductionUrl + $ProofPath + '?sha=' + $mainSha) -Headers @{ 'Cache-Control'='no-cache'; Pragma='no-cache' } -TimeoutSec 30
if ([string]$proof.branch -ne 'main' -or [string]$proof.commitSha -ne $mainSha) {
    throw 'Vercel no acredita el SHA exacto de main.'
}

Write-Host ('✓ KHORA-OK · main ' + $mainSha.Substring(0,12) + ' esta LIVE en ' + $ProductionUrl) -ForegroundColor Green
