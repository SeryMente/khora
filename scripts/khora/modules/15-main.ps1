# ================================================================
# KHORA v7 - MODULO 15-main.ps1
# Componente: 15 main
# ================================================================

function Run-Main {
    Cleanup-OldHandoffFiles
    $handoffOk = Invoke-HandoffCheck
    if ($handoffOk) {
        $script:needDraw = $true
        # Jump directly into the main loop without preflight/startup, as we adopted an active session.
        # But first setup basic logging window since we skipped initialization.
        Open-LogWindow
        Start-Sleep -Milliseconds 700
    } else {
        Write-InitHeader
    # Aviso de elevacion mixta (elevacion con cuenta distinta al usuario de trabajo)
    if ($script:REAL_USER_OVERRIDE) {
        Write-Host ""
        Write-Host "  ============================================================" -ForegroundColor Yellow
        Write-Host "   ELEVACION CON CUENTA DISTINTA DETECTADA" -ForegroundColor Yellow
        Write-Host "   Usuario de trabajo : $($script:REAL_USER_NAME)" -ForegroundColor Green
        Write-Host "   Cuenta admin usada : $($script:REAL_USER_ELEVATED_AS)" -ForegroundColor Cyan
        Write-Host "   Perfil de trabajo  : $env:USERPROFILE" -ForegroundColor Green
        Write-Host "   Todas las instalaciones y datos van al perfil de $($script:REAL_USER_NAME)." -ForegroundColor Green
        Write-Host "  ============================================================" -ForegroundColor Yellow
        Write-Host ""
        L "INFO" "Elevacion mixta: usuario=$($script:REAL_USER_NAME) elevado-como=$($script:REAL_USER_ELEVATED_AS) perfil=$env:USERPROFILE"
    }
    Open-LogWindow
    Start-Sleep -Milliseconds 700
    Start-ProactiveDepPrep
    # --- VERSIONADO: auto-archivo + coherencia nombre<->version ---
    Step "Versionado v$SCRIPT_VERSION"
    $verFile = Join-Path $VER_DIR "khora-v$SCRIPT_VERSION.ps1"
    if ($script:NO_SCRIPT_FILE -or -not (Test-Path $SCRIPT_PATH)) {
        # MODO COPY-PASTE (soportado de primera clase): el script que acabas de pegar
        # sigue en el portapapeles -> se auto-guarda a disco, porque guardian,
        # deadline y limpieza externa necesitan un archivo fisico para relanzarse.
        $clip = ""; try { $clip = Get-Clipboard -Raw -ErrorAction Stop } catch {}
        $verMark = '$SCRIPT_VERSION = "' + $SCRIPT_VERSION + '"'
        if ($clip -and $clip.Contains("KHORA - Script de sesion agnostico") -and $clip.Contains("function Invoke-Cleanup") -and $clip.Contains($verMark)) {
            try {
                Set-Content -Path $SCRIPT_PATH -Value $clip -Encoding UTF8
                $script:NO_SCRIPT_FILE = $false
                Ok "Modo copy-paste detectado: script auto-guardado en [$SCRIPT_PATH]."
                # RELANZAR desde el archivo: el pegado directo en consola genera errores
                # cosmeticos de parseo (param(), lineas vacias) imposibles de suprimir
                # desde aqui. La instancia limpia toma el control; esta se cierra sola.
                Info "Relanzando LIMPIO desde el archivo... esta ventana se cierra en 3s."
                if ($script:LOG_WIN_PID) { Stop-Process -Id $script:LOG_WIN_PID -Force -ErrorAction SilentlyContinue }
                Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$SCRIPT_PATH`""
                Start-Sleep -Seconds 3
                return
            } catch { Warn "No pude auto-guardar el script pegado: $_" }
        } else {
            Warn "Modo copy-paste: el portapapeles ya no contiene esta version del script; no puedo auto-guardarlo."
            Warn "Consecuencia: guardian, deadline y limpieza externa quedan DESACTIVADOS esta sesion (necesitan archivo fisico)."
            Warn "Solucion: copia el script (Ctrl+C) y pegalo de inmediato, o guardalo tu como [$SCRIPT_PATH]."
        }
    }
    if (Test-Path $SCRIPT_PATH) {
        if (-not (Test-Path $verFile)) {
            try { Copy-Item $SCRIPT_PATH $verFile -Force; Ok "Version v$SCRIPT_VERSION archivada en versions\." }
            catch { Warn "No pude archivar la version: $_" }
        } else { Ok "Version v$SCRIPT_VERSION ya archivada en versions\." }
        $expected = "khora-v$SCRIPT_VERSION.ps1"
        $actual   = Split-Path $SCRIPT_PATH -Leaf
        if ($actual -ne $expected) { L "INFO" "Nombre de archivo [$actual] no coincide con la version interna (esperado: $expected). Renombralo para mantener coherencia." }
        else { Ok "Nombre de archivo coherente con la version interna." }
    }
    # --- ARRANQUE AUTOMATICO: todo diagnostico read-only corre solo, sin opcion ---
    # Preflight (compatibilidad), escaneo de keyloggers y estado. Ninguno muta nada.
    # Si no hay internet se avisa pero NO se bloquea el menu (limpieza/log siguen disponibles).
    $netOK = Invoke-Preflight
    if (-not $netOK) { Warn "Sin internet: [1] Iniciar sesion fallara hasta que haya conexion." }
    Scan-Keyloggers
    Scan-RemoteAccess | Out-Null
    Show-Estado
    L "INFO" "Diagnostico automatico de arranque completado (preflight + keyloggers + estado)."
Write-Host ""
    Clear-PendingInput   # descartar residuos del pegado antes de esperar tecla real
    Focus-Window         # auto-enfoque de la ventana principal
    L "INFO" "Menu principal activo. La ventana de log ya muestra el diagnostico de arranque."
    }
    # Cierre garantizado si se cierra con la X o error
    try { Register-EngineEvent PowerShell.Exiting -Action { if ($script:SES_ACTIVE) { Invoke-Cleanup "salida-forzada" } } | Out-Null } catch {}
    $nextWip  = (Get-Date).AddMinutes($CFG.autoWipMinutes)
    $nextLiveSync = (Get-Date).AddMinutes(2)
    $needDraw = $true
    while ($true) {
        if ($needDraw) { Show-Banner; $needDraw = $false }
            if ((-not $script:SES_ACTIVE) -and (-not $script:TokSecure) -and ((-not $script:ClipNextCheck) -or ((Get-Date) -gt $script:ClipNextCheck))) { $script:ClipNextCheck = (Get-Date).AddSeconds(2); Watch-ClipboardToken }
        if ([Console]::KeyAvailable) {
            $k = [Console]::ReadKey($true); Write-Host $k.KeyChar
            $key = $k.KeyChar.ToString().ToUpper()
            L "INFO" "Tecla: [$key]"
            switch ($key) {
                "1" { $script:SES_START = Get-Date; Start-Sesion }
                "2" { Invoke-Cleanup "manual" }
                "3" { Show-Estado }
                "4" { Write-Host ""; Write-Host "  ---- LOG DE HOY ----" -ForegroundColor Cyan; if (Test-Path $LOG_FILE) { Get-Content $LOG_FILE | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray } } else { Info "Sin log." } }
                "5" { Write-Host ""; Write-Host "  ---- HISTORIAL REPO ----" -ForegroundColor Cyan; $rl=Join-Path $REPO_DIR "logs\sessions.log"; if (Test-Path $rl) { Get-Content $rl | Select-Object -Last 80 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray } } else { Info "Sin historial." } }
                "6" { Open-LogWindow; Ok "Ventana de log reabierta." }
                "7" { Scan-Keyloggers }
                "8" { Invoke-Preflight | Out-Null }
                "9" { Start-DevServers }
                "S" { Do-AutoWip; Ok "Sincronizacion con el repositorio ejecutada." }
                "E" { $live = Sync-EpLiveLog -Reason 'manual-menu'; if ($live) { Ok 'EP-LIVE-LOG sincronizado y verificado en GitHub.' } else { Warn 'EP-LIVE-LOG no pudo sincronizarse o verificarse.' } }
                "K" { Invoke-KhoraOk }
                "V" { Deploy-Vercel }
                "C" { Invoke-ChromeCleanup }
                "R" { Invoke-RenderOps }
                "T" { Scan-RemoteAccess | Out-Null }
                "W" {
                    if (-not (Test-Path "$REPO_DIR\.git")) { Warn "Sin repo."; break }
                    $unpushed = (git -C $REPO_DIR log --oneline --branches --not --remotes 2>$null | Measure-Object).Count
                    if ($unpushed -gt 0) {
                        $cb = (git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>&1).Trim()
                        Info "Pusheando $unpushed commit(s) pendientes a la rama: $cb"
                        if (Push-Verified -Branch $cb) { Ok "Push completado exitosamente." }
                        else { Fail "Error al hacer push de los commits." }
                    } else { Ok "No hay commits locales pendientes de push." }
                }
                "D" { Show-DiagBundle }
"Q" { Write-Host ""; if ($script:SES_ACTIVE) { Warn "Sesion activa: cierra con [2] antes de salir." } else { Write-Host "  Saliendo. Revoca tu token." -ForegroundColor Yellow; Write-Host ""; L "INFO" "Script cerrado."; break } }
}
if ($key -eq "Q" -and -not $script:SES_ACTIVE) { break }
Write-Host ""
            Clear-PendingInput
            Start-Sleep -Milliseconds 900
            $needDraw = $true
        }
        # EP-LIVE-LOG: respaldo remoto periodico de la sesion activa
        if ((Get-Date) -ge $nextLiveSync) {
            try {
                if ($script:SES_ACTIVE -and $script:TokSecure) {
                    $livePeriodic = Sync-EpLiveLog -Reason 'periodic-active-session'
                    if ($livePeriodic) { L "INFO" "EP-LIVE-LOG periodico publicado y verificado en GitHub." }
                }
            } catch { L "WARN" "EP-LIVE-LOG periodico fallo: $_" }
            $nextLiveSync = (Get-Date).AddMinutes(2)
        }
        # Tareas periodicas sin bloquear
        if ($script:SES_ACTIVE) {
            # Handoff Heartbeat
            if (-not $script:__lastHandoffHeartbeat -or ((Get-Date) - $script:__lastHandoffHeartbeat).TotalSeconds -ge 30) {
                $script:__lastHandoffHeartbeat = Get-Date
                $activeFile = Join-Path $WORK_STATE_DIR "active-session.json"
                if (Test-Path $activeFile) {
                    try {
                        $active = Get-Content $activeFile -Raw | ConvertFrom-Json
                        $active.lastHeartbeat = (Get-Date).ToUniversalTime().ToString("o")
                        $active | ConvertTo-Json -Compress | Set-Content $activeFile -Encoding UTF8
                    } catch {}
                } else {
                    $newMarker = @{
                        pid = $PID
                        version = $SCRIPT_VERSION
                        sessionStartTime = $SES_START.ToUniversalTime().ToString("o")
                        lastHeartbeat = (Get-Date).ToUniversalTime().ToString("o")
                    }
                    $newMarker | ConvertTo-Json -Compress | Set-Content $activeFile -Encoding UTF8
                }
            }

            # Check for handoff requests
            $reqFiles = Get-ChildItem $WORK_STATE_DIR -Filter "handoff-request-*.json" -ErrorAction SilentlyContinue
            if ($reqFiles.Count -gt 0) {
                $reqFile = $reqFiles[0]
                try {
                    $req = Get-Content $reqFile.FullName -Raw | ConvertFrom-Json
                    $reqId = $req.reqId

                    L "INFO" "Detectada solicitud de traspaso (ID $reqId). Preparando estado..."

                    $stateFile = Join-Path $WORK_STATE_DIR "handoff-state-$reqId.json"
                    $state = @{
                        version = $SCRIPT_VERSION
                        guardPid = $script:GUARD_PID
                        wipBranch = $script:WIP_BRANCH
                        efsActive = $script:EFS_ACTIVE
                        sessionStartTime = $SES_START.ToUniversalTime().ToString("o")
                        realUserOverride = $script:REAL_USER_OVERRIDE
                        realUserName = $script:REAL_USER_NAME
                        realUserElevatedAs = $script:REAL_USER_ELEVATED_AS

                        cdpPort = $CDP_PORT
                        repoDir = $REPO_DIR
                        logFile = $LOG_FILE
                    }

                    if ($script:TokSecure) {
                        $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($script:TokSecure)
                        $plainTok = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)

                        $secPass = ConvertTo-SecureString "handoff-$reqId" -AsPlainText -Force
                        $enc = Protect-KhoraToken -PlainToken $plainTok -Passphrase $secPass
                        $state.tokenEncrypted = $enc

                        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
                    }

                    $devServersFile = Join-Path $FLAG_DIR "devservers.json"
                    if (Test-Path $devServersFile) {
                        try { $state.devServerPids = Get-Content $devServersFile -Raw | ConvertFrom-Json } catch {}
                    }

                    $state | ConvertTo-Json -Compress | Set-Content $stateFile -Encoding UTF8

                    $readyFlag = Join-Path $WORK_STATE_DIR "handoff-ready-$reqId.flag"
                    Set-Content $readyFlag "1" -Encoding UTF8


                    L "INFO" "Estado de traspaso escrito. Saliendo limpiamente con codigo 42..."
                    $script:SES_ACTIVE = $false
                    throw "KHORA_HANDOFF_READY"
                } catch {
                    L "WARN" "Error procesando solicitud de traspaso: $_"
                }
            }

            if ((Get-Date) -ge $nextWip) {
                Do-AutoWip
                $nextWip = (Get-Date).AddMinutes($CFG.autoWipMinutes)
            }
        }
        Start-Sleep -Milliseconds 250
    }
}
