# ================================================================
# KHORA v7 - MODULO 02-logging.ps1
# Componente: 02 logging
# ================================================================

function Mask-Token {
    param([string]$Text)
    if (-not $Text) { return $Text }

    # 1. Regex general para tokens de github
    $Text = $Text -replace 'gh[pousr]_[A-Za-z0-9]{36}', '***'
    $Text = $Text -replace 'github_pat_[A-Za-z0-9_]{82}', '***'
    $Text = $Text -replace '\b[0-9a-fA-F]{40}\b', '***'

    # 2. Regex para URLs de github con auth: https://xxx@github.com -> https://github.com
    $Text = $Text -replace 'https://[^@]+@github\.com', 'https://github.com'

    return $Text
}

function Sync-EpLiveLog {
    param([string]$Reason = "manual")
    if (-not $REPO_DIR -or -not (Test-Path (Join-Path $REPO_DIR ".git"))) {
        L "WARN" "EP-LIVE-LOG: sin repositorio local."
        return $false
    }
    if (-not $script:TokSecure) {
        L "WARN" "EP-LIVE-LOG: sin token en memoria; publicacion omitida."
        return $false
    }
    try {
        $target = Join-Path $REPO_DIR "EP-LIVE-LOG.md"
        $branch = "$(git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>$null)".Trim()
        if (-not $branch -or $branch -eq "HEAD") { $branch = "main" }
        $head = "$(git -C $REPO_DIR rev-parse HEAD 2>$null)".Trim()
        $status = if ($script:SES_ACTIVE) { "ACTIVE" } else { "CLOSING/CLOSED" }
        $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $eventLines = @()
        if (Test-Path $LOG_FILE) {
            $eventLines += @(Get-Content -LiteralPath $LOG_FILE -Tail 240 -ErrorAction SilentlyContinue)
        }
        $sessionHistory = Join-Path $REPO_DIR "logs\sessions.log"
        if (Test-Path $sessionHistory) {
            $eventLines += @("","--- HISTORIAL DE SESIONES (ULTIMAS LINEAS) ---")
            $eventLines += @(Get-Content -LiteralPath $sessionHistory -Tail 80 -ErrorAction SilentlyContinue)
        }
        $safe = foreach ($line in $eventLines) {
            $s = Mask-Token -Text ([string]$line)
            if ($env:USERNAME) { $s = $s.Replace($env:USERNAME,"<USER>") }
            if ($env:COMPUTERNAME) { $s = $s.Replace($env:COMPUTERNAME,"<HOST>") }
            if ($env:USERPROFILE) { $s = $s.Replace($env:USERPROFILE,"<USERPROFILE>") }
            $s = $s -replace '(?i)C:\\Users\\[^\\\s]+','C:\Users\<USER>'
            $s = $s -replace '(?i)\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b','<EMAIL>'
            $s = $s -replace '\b(?:\d{1,3}\.){3}\d{1,3}\b','<IP>'
            $s = $s -replace '(?i)Bearer\s+[A-Za-z0-9._~+/=-]+','Bearer [REDACTED]'
            $s
        }
        $body = @(
            "# KHORA EP — LIVE LOG"
            ""
            "**Propósito:** registro operativo público y sanitizado del Entorno Persistente."
            "**Versión:** KHORA v$SCRIPT_VERSION"
            "**Estado:** $status"
            "**Última sincronización:** $now"
            "**Motivo:** $Reason"
            "**Branch publicado:** $branch"
            "**HEAD observado:** $head"
            ""
            "> Este archivo es un registro operativo, no sustituye `EP-ARCHITECTURE.md`."
            "> Se actualiza bajo demanda, al quedar lista una sesión y al iniciar el cierre de sesión."
            ""
            "## Eventos recientes"
            ""
        ) + $safe
        [IO.File]::WriteAllText($target,($body -join "`r`n"),(New-Object System.Text.UTF8Encoding($false)))
        git -C $REPO_DIR add -- "EP-LIVE-LOG.md" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "git add EP-LIVE-LOG.md fallo." }
        $staged = @(git -C $REPO_DIR diff --cached --name-only 2>$null)
        if (($staged.Count -ne 1) -or ($staged[0] -ne "EP-LIVE-LOG.md")) {
            git -C $REPO_DIR reset -- "EP-LIVE-LOG.md" 2>$null | Out-Null
            throw "EP-LIVE-LOG: el staging no contiene exclusivamente EP-LIVE-LOG.md."
        }
        git -C $REPO_DIR diff --cached --quiet -- "EP-LIVE-LOG.md"
        if ($LASTEXITCODE -eq 0) {
            git -C $REPO_DIR reset -- "EP-LIVE-LOG.md" 2>$null | Out-Null
            return $true
        }
        $msg = "ep-live-log: $Reason $(Get-Date -Format 'HH:mm:ss')"
        git -C $REPO_DIR commit -m $msg 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            git -C $REPO_DIR reset -- "EP-LIVE-LOG.md" 2>$null | Out-Null
            throw "commit EP-LIVE-LOG fallo."
        }
        if (Push-Verified -Branch $branch -Retries 3) { return $true }
        $script:WIP_UNPUSHED = $true
        Warn "EP-LIVE-LOG: commit creado pero push no verificado."
        return $false
    }
    catch {
        Warn "EP-LIVE-LOG: $_"
        return $false
    }
}
function L {
    param([string]$level, [string]$msg)
    $msg = Mask-Token -Text $msg
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
function Ok   { param([string]$m) $m = Mask-Token $m; $script:HUD_OK++; Update-HUD "OK  " $m "Green"; L "OK  " $m }
function Fail { param([string]$m) $m = Mask-Token $m; $script:HUD_FAIL++; Update-HUD "FAIL" $m "Red"; L "FAIL" $m }
function Info { param([string]$m) $m = Mask-Token $m; Update-HUD "INFO" $m "Cyan"; L "INFO" $m }
function Warn { param([string]$m) $m = Mask-Token $m; $script:HUD_WARN++; Update-HUD "WARN" $m "Yellow"; L "WARN" $m }
function Step { param([string]$m)
    $m = Mask-Token $m
    $script:HUD_STEP = $m
    Update-HUD "STEP" $m "Magenta"
    L "STEP" $m
}
