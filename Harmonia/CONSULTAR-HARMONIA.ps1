param([string]$Session,[string]$Type,[string]$Since,[int]$Limit=100,[switch]$Coverage,[switch]$Cycles)
$ErrorActionPreference = 'Stop'
$env:HARMONIA_DATA = Join-Path $env:LOCALAPPDATA 'Harmonia\surface-index-v0.4.0\data'
$script = Join-Path $PSScriptRoot 'Collector\query.ps1'
& $script -Session $Session -Type $Type -Since $Since -Limit $Limit -Coverage:$Coverage -Cycles:$Cycles
