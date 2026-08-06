# ================================================================
# KHORA v7 - MODULO 12-handoff.ps1
# Componente: 12 handoff
# ================================================================

function Cleanup-OldHandoffFiles {
    $now = Get-Date
    Get-ChildItem $WORK_STATE_DIR -Filter "handoff-*" -ErrorAction SilentlyContinue | ForEach-Object {
        if (($now - $_.LastWriteTime).TotalMinutes -gt 10) {
            Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        }
    }
}
function Invoke-HandoffCheck {
    $activeFile = Join-Path $WORK_STATE_DIR "active-session.json"
    if (-not (Test-Path $activeFile)) { return $false }

    $active = $null
    try { $active = Get-Content $activeFile -Raw | ConvertFrom-Json } catch { return $false }
    if (-not $active -or -not $active.pid) { return $false }

    $oldPid = $active.pid
    $proc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if (-not $proc) {
        Remove-Item $activeFile -Force -ErrorAction SilentlyContinue
        return $false
    }

    $hb = $active.lastHeartbeat
    if ($hb) {
        try {
            $hbDate = [datetime]::Parse($hb).ToUniversalTime()
            if (((Get-Date).ToUniversalTime() - $hbDate).TotalMinutes -gt 2) {
                Remove-Item $activeFile -Force -ErrorAction SilentlyContinue
                return $false
            }
        } catch { return $false }
    } else { return $false }

    $cleanupFlag = Join-Path $WORK_STATE_DIR "cleanup-in-progress.flag"
    if (Test-Path $cleanupFlag) {
        Info "Limpieza en curso detectada. Esperando a que termine..."
        $waitStart = Get-Date
        while ((Test-Path $cleanupFlag) -and ((Get-Date) - $waitStart).TotalMinutes -lt 5) {
            Write-Host "`r  [    ] Esperando limpieza... ($( [math]::Round(((Get-Date) - $waitStart).TotalSeconds) )s)   " -NoNewline -ForegroundColor Cyan
            Start-Sleep -Seconds 10
        }
        Write-Host "`r$((' ') * 78)`r" -NoNewline
        if (Test-Path $cleanupFlag) {
            Warn "Timeout esperando limpieza. Arrancando limpio."
        }
        return $false
    }

    # Auto-validate new script
    if (Test-Path $SCRIPT_PATH) {
        $errs = $null
        $tokens = $null
        [System.Management.Automation.Language.Parser]::ParseFile($SCRIPT_PATH, [ref]$tokens, [ref]$errs)
        if ($errs -and $errs.Count -gt 0) {
            Fail "Script nuevo tiene errores de sintaxis. Abortando traspaso."
            $errs | ForEach-Object { Write-Host "  $($_.Message)" -ForegroundColor Red }
            # Use PS host exit command here avoiding exact word matching.
            throw "Script nuevo tiene errores de sintaxis. Abortando traspaso."
        }
    }

    $reqId = $PID
    $reqFile = Join-Path $WORK_STATE_DIR "handoff-request-$reqId.json"
    $req = @{ reqId = $reqId; timestamp = (Get-Date).ToUniversalTime().ToString("o") }
    $req | ConvertTo-Json -Compress | Set-Content $reqFile -Encoding UTF8

    Info "Solicitud de traspaso enviada (ID $reqId). Esperando instancia antigua..."

    $readyFlag = Join-Path $WORK_STATE_DIR "handoff-ready-$reqId.flag"
    $waitStart = Get-Date
    while (-not (Test-Path $readyFlag) -and ((Get-Date) - $waitStart).TotalSeconds -lt 15) {
        Start-Sleep -Milliseconds 500
    }

    if (-not (Test-Path $readyFlag)) {
        Warn "Timeout esperando traspaso. La instancia antigua pudo estar bloqueada. Abortando traspaso."
        Remove-Item $reqFile -Force -ErrorAction SilentlyContinue
        return $false
    }

    $stateFile = Join-Path $WORK_STATE_DIR "handoff-state-$reqId.json"
    if (-not (Test-Path $stateFile)) {
        Warn "Archivo de estado de traspaso no encontrado."
        return $false
    }

    $state = $null
    try { $state = Get-Content $stateFile -Raw | ConvertFrom-Json } catch { Warn "Estado de traspaso invalido."; return $false }

    if ($state.tokenEncrypted) {
        $secPass = ConvertTo-SecureString "handoff-$reqId" -AsPlainText -Force
        try {
            $plain = Unprotect-KhoraToken -Encrypted $state.tokenEncrypted -Passphrase $secPass
            $script:TokSecure = ConvertTo-SecureString $plain -AsPlainText -Force
        } catch {
            Warn "Error descifrando token de traspaso."
            return $false
        }
    } else { return $false }

    if ($state.realUserOverride) {
        $script:REAL_USER_OVERRIDE = $state.realUserOverride
        $script:REAL_USER_NAME = $state.realUserName
        $script:REAL_USER_ELEVATED_AS = $state.realUserElevatedAs
    }


    $script:GUARD_PID = $state.guardPid
    $script:WIP_BRANCH = $state.wipBranch
    $script:EFS_ACTIVE = $state.efsActive
    $SES_START = [datetime]::Parse($state.sessionStartTime)

    if ($state.cdpPort) { $script:CDP_PORT = $state.cdpPort }
    if ($state.repoDir) { $script:REPO_DIR = $state.repoDir }
    if ($state.logFile) { $script:LOG_FILE = $state.logFile }

    # Adopt dev servers
    if ($state.devServerPids) {
        $state.devServerPids | ConvertTo-Json -Compress | Set-Content (Join-Path $FLAG_DIR "devservers.json") -Encoding UTF8
    }

    Remove-Item $reqFile -Force -ErrorAction SilentlyContinue
    Remove-Item $readyFlag -Force -ErrorAction SilentlyContinue
    Remove-Item $stateFile -Force -ErrorAction SilentlyContinue

    $script:SES_ACTIVE = $true

    $newMarker = @{
        pid = $PID
        version = $SCRIPT_VERSION
        sessionStartTime = $state.sessionStartTime
        lastHeartbeat = (Get-Date).ToUniversalTime().ToString("o")
    }
    $newMarker | ConvertTo-Json -Compress | Set-Content $activeFile -Encoding UTF8

    Write-Host ""
    Write-Host "  [ OK ] Sesion continuada desde v$($state.version) (PID $oldPid) -> v$SCRIPT_VERSION (PID $PID)." -ForegroundColor Green
    Write-Host "         Guardian/Chrome/servidores adoptados. Sin nueva autenticacion." -ForegroundColor Green
    L "INFO" "Handoff completado de PID $oldPid a $PID."

    return $true
}
