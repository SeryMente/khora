# ================================================================
# KHORA v7 - MODULO 02-logging.ps1
# Componente: 02 logging
# ================================================================

function L {
    param([string]$level, [string]$msg)
    $ts   = Get-Date -Format "HH:mm:ss"
    $line = "[$ts][$level] $msg"
    Add-Content $LOG_FILE $line -Encoding UTF8 -ErrorAction SilentlyContinue
    Add-Content $WORK_LOG $line -Encoding UTF8 -ErrorAction SilentlyContinue
    $j = [ordered]@{ t=(Get-Date -Format o); level=$level.Trim(); msg=$msg } | ConvertTo-Json -Compress
    Add-Content $JSON_LOG $j -Encoding UTF8 -ErrorAction SilentlyContinue
    $repoLog = Join-Path $REPO_DIR "logs\sessions.log"
    if (Test-Path (Split-Path $repoLog -Parent)) {
        Add-Content $repoLog $line -Encoding UTF8 -ErrorAction SilentlyContinue
    }
}
function Ok   { param([string]$m) $script:HUD_OK++; Update-HUD "OK  " $m "Green"; L "OK  " $m }
function Fail { param([string]$m) $script:HUD_FAIL++; Update-HUD "FAIL" $m "Red"; L "FAIL" $m }
function Info { param([string]$m) Update-HUD "INFO" $m "Cyan"; L "INFO" $m }
function Warn { param([string]$m) $script:HUD_WARN++; Update-HUD "WARN" $m "Yellow"; L "WARN" $m }
function Step { param([string]$m)
    $script:HUD_STEP = $m
    Update-HUD "STEP" $m "Magenta"
    L "STEP" $m
}
