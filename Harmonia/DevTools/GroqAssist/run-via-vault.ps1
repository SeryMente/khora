<#
.SYNOPSIS
Run Harmonia Groq Assist through EP Vault with an explicit GROQ_API_KEY allowlist.
The deterministic local fallback is used when Vault is missing/inactive or Groq is unavailable.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputPath
)
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$node = (Get-Command node -ErrorAction Stop).Source
$assist = Join-Path $PSScriptRoot 'assist.mjs'
if (-not (Test-Path -LiteralPath $InputPath -PathType Leaf)) { throw 'TRIAGE_INPUT_NOT_FOUND' }
$vaultCandidates = @()
if (-not [string]::IsNullOrWhiteSpace($env:EP_VAULT_CLI)) { $vaultCandidates += $env:EP_VAULT_CLI }
if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
    $vaultCandidates += (Join-Path $env:LOCALAPPDATA 'EP\MOD-EPVAULT\1.0.1\EPVault-CLI.cmd')
}
$vaultCli = $vaultCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
$useGroq = $false
if ($vaultCli) {
    try {
        $statusText = & $vaultCli Status 2>$null
        $status = $statusText | ConvertFrom-Json
        $useGroq = ($status.sessionActive -eq $true)
    } catch { $useGroq = $false }
}
if (-not $useGroq) {
    & $node $assist $InputPath '--output' $OutputPath '--local-only'
    if ($LASTEXITCODE -ne 0) { throw 'LOCAL_TRIAGE_FAILED' }
    Write-Output 'GROQ_ASSIST_LOCAL_FALLBACK_VAULT_UNAVAILABLE'
    return
}
& $vaultCli Run -ExecutablePath $node -ArgumentList @($assist, $InputPath, '--output', $OutputPath) -Names @('GROQ_API_KEY') -DurationSeconds 60 | Out-Null
if ($LASTEXITCODE -ne 0) {
    & $node $assist $InputPath '--output' $OutputPath '--local-only'
    if ($LASTEXITCODE -ne 0) { throw 'LOCAL_TRIAGE_FALLBACK_FAILED' }
    Write-Output 'GROQ_ASSIST_LOCAL_FALLBACK_VAULT_RUN_FAILED'
    return
}
$runResult = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
if ($runResult.provider -eq 'groq') {
    Write-Output 'GROQ_ASSIST_REAL_API_COMPLETED'
} else {
    Write-Output ('GROQ_ASSIST_LOCAL_FALLBACK_' + [string]$runResult.fallbackReason)
}
