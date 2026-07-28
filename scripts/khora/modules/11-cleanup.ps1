# ================================================================
# KHORA v7 - MODULO 11-cleanup.ps1
# Componente: 11 cleanup
# ================================================================

function Invoke-Cleanup {
    param([string]$reason = "manual")

    if ($REPO_DIR -and (Test-Path (Join-Path $REPO_DIR ".vercel"))) {
        L "WARN" "[WARN] .vercel/ presente — será borrada al cerrar sesión."
    }

    # Evitar limpieza concurrente
    $mtx = New-Object System.Threading.Mutex($false, "Global\KHORA_Cleanup")
    $owns = $false
    try { $owns = $mtx.WaitOne(0) }
    catch [System.Threading.AbandonedMutexException] { $owns = $true }  # heredamos un mutex dejado por una limpieza que murio
    if (-not $owns) { L "WARN" "Limpieza ya en curso; omito."; $mtx.Dispose(); return }
    try {
        Write-Host ""
        L "STEP" "=== LIMPIEZA NUCLEAR (motivo: $reason) === $(Get-Date -Format 'HH:mm:ss') ==="
        # Push final del log + WIP si hay token disponible
        $repoLog = Join-Path $REPO_DIR "logs\sessions.log"
        if (Test-Path $repoLog) {
            Step "Respaldo final al repo"
            $durMin = [math]::Round(((Get-Date)-$SES_START).TotalMinutes,1)
            Add-Content $repoLog "`n--- SESION CERRADA --- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') --- motivo:$reason --- dur:${durMin}min ---" -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($script:TokSecure) {
                try {
                    Export-VSCodeConfig
                    Save-ChromeTabsSnapshot
                    Do-AutoWip
                    $pend = (git -C $REPO_DIR status --porcelain 2>$null | Measure-Object).Count
                    if ($pend -gt 0) {
                        git -C $REPO_DIR add -A 2>&1 | Out-Null
                        git -C $REPO_DIR commit -m "session: cierre $DATE_STR ($reason)" 2>&1 | Out-Null
                    }
                    $curBranch = "$(git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>$null)".Trim()
                    if (Push-Verified -Branch $curBranch) { Ok "Respaldo final VERIFICADO en remoto ($curBranch)." }
                    else { Fail "Respaldo final NO VERIFICADO: el remoto no confirma el ultimo commit." }
                } catch { Warn "No se pudo hacer push final: $_" }
            } else { Info "Sin token en memoria (limpieza externa): push omitido; la compuerta de borrado revisara si quedo trabajo sin respaldo." }
        }
        # Cerrar apps
        Step "Cerrando aplicaciones"
        $cp = Get-Process "Code" -ErrorAction SilentlyContinue
        if ($cp) { $cp | ForEach-Object { $_.CloseMainWindow() | Out-Null }; Start-Sleep 3; Get-Process "Code" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Ok "VS Code cerrado." }
        Get-Process "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Ok "Chrome cerrado."
        # Deadline + Guardian off
        Step "Deteniendo red de seguridad"
        Unregister-Deadline
        $gp = Join-Path $FLAG_DIR "guardian.pid"
        $gpid = $null
        if (Test-Path $gp) {
            try {
                $gpid = Get-Content $gp -ErrorAction SilentlyContinue
                if ($gpid) {
                    Stop-Process -Id $gpid -Force -ErrorAction SilentlyContinue
                    if (-not (Get-Process -Id $gpid -ErrorAction SilentlyContinue)) { Ok "Guardian detenido." }
                }
            } catch {}
            Remove-Item $gp -Force -ErrorAction SilentlyContinue
        }
        # Borrar workdir (repo + logwin + portables)
        Step "Borrando datos de trabajo"
        # Secrets PRIMERO: sobrescritura aleatoria antes de borrar (anti-forense)
        foreach ($__envF in @((Join-Path $ROOT_DIR ".khora.env"), (Join-Path $WORK_DIR ".khora.env"))) {
            if (Test-Path $__envF) { Invoke-SecureDeleteFile $__envF; Ok "Secret DESTRUIDO de forma segura: $__envF" }
        }
        Info "Vars LLM .khora.env destruidas: ahora gestionadas por boveda."
        Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -eq $script:LOG_WIN_PID } | Stop-Process -Force -ErrorAction SilentlyContinue
        # COMPUERTA FAIL-CLOSED: jamas destruir trabajo sin respaldo remoto VERIFICADO.
        # Si queda trabajo sin push, el repo se mueve a cuarentena local en vez de borrarse.
        $unpushed = Test-UnpushedWork
        if ((Test-Path $REPO_DIR) -and $unpushed -and $CFG.protectUnpushedWork) {
            $quarantine = Join-Path $WORK_DIR ("repo-SIN-RESPALDO-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
            try {
                Move-Item $REPO_DIR $quarantine -Force -ErrorAction Stop
                Fail "TRABAJO SIN RESPALDO VERIFICADO: repo preservado en cuarentena -> $quarantine"
                L "FAIL" "Cuarentena de repo: $quarantine (motivo limpieza: $reason). Recuperalo y haz push manual."
            } catch { Fail "No pude mover el repo a cuarentena ($_). Repo NO borrado para no perder trabajo." }
        } elseif (Test-Path $REPO_DIR) {
            Remove-Item -Recurse -Force -LiteralPath $REPO_DIR -ErrorAction SilentlyContinue
            if (Test-Path $REPO_DIR) {
                $empty = Join-Path $env:TEMP "khe-$(Get-Random)"; New-Item -ItemType Directory -Force $empty | Out-Null
                if (Test-Cmd robocopy) { robocopy $empty $REPO_DIR /purge /njh /njs /nc /ns /np 2>&1 | Out-Null }
                Remove-Item -Recurse -Force -LiteralPath $REPO_DIR -ErrorAction SilentlyContinue
                Remove-Item -Force -LiteralPath $empty -ErrorAction SilentlyContinue
            }
            if (-not (Test-Path $REPO_DIR)) { Ok "Repo local eliminado (trabajo previamente respaldado y verificado)." } else { Warn "Repo no se pudo borrar del todo." }
        }
        # Git config global
        Step "Git config global"
        git config --global --unset user.name  2>&1 | Out-Null
        git config --global --unset user.email 2>&1 | Out-Null
        git config --global credential.helper "" 2>&1 | Out-Null
        $gitcfg = Join-Path $env:USERPROFILE ".gitconfig"
        if (Test-Path $gitcfg) {
            (Get-Content $gitcfg | Where-Object { $_ -notmatch '(name|email|helper)\s*=' }) | Set-Content $gitcfg -Encoding UTF8 -ErrorAction SilentlyContinue
        }
        if (-not (git config --global user.name 2>$null) -and -not (git config --global user.email 2>$null)) { Ok "Git config limpiado (user/email/helper)." }
        # Credential Manager
        Step "Credential Manager"
        $found=0
        $all = cmdkey /list 2>$null
        foreach ($term in @("git","github","visualstudio","vscode")) {
            $all | Select-String $term | ForEach-Object {
                $tg = ($_ -split "=")[-1].Trim()
                if ($tg) { cmdkey /delete:$tg 2>$null | Out-Null; $found++ }
            }
        }
        $stillThere = (cmdkey /list 2>$null | Select-String "git|github|visualstudio|vscode")
        if (-not $stillThere) { Ok "$found credencial(es) eliminada(s) verificadas." }
        # Historial PowerShell de TODOS los perfiles (agnostico)
        Step "Historial PowerShell (todos los perfiles)"
        $h_cleared = $false
        Get-ChildItem (Join-Path $SYS_DRIVE "Users") -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $h = Join-Path $_.FullName "AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt"
            if (Test-Path $h) {
                Clear-Content $h -ErrorAction SilentlyContinue
                if ((Get-Item $h -ErrorAction SilentlyContinue).length -eq 0) { Ok "PS history: $($_.Name)"; $h_cleared = $true }
            }
        }
        try { [Microsoft.PowerShell.PSConsoleReadLine]::ClearHistory() } catch {}
        # VS Code datos (usuario actual)
        Step "VS Code - datos y cache"
        @("Backups","User\workspaceStorage","User\History","User\settings.json","logs","CachedData","CachedExtensionVSIXs") | ForEach-Object {
            $d = Join-Path $env:APPDATA "Code\$_"
            if (Test-Path $d) {
                Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue
                if (-not (Test-Path $d)) { Ok "VS Code: $_" }
            }
        }
        $sf = Join-Path $env:APPDATA "Code\User\globalStorage\storage.json"
        $allEmpty = $true
        if (Test-Path $sf) {
            try {
                $j = Get-Content $sf -Raw | ConvertFrom-Json
                $j.PSObject.Properties | Where-Object { $_.Name -match "recent|opened|lastUsed" } | ForEach-Object { $j.($_.Name)=@() }
                $j | ConvertTo-Json -Depth 10 | Set-Content $sf -Encoding UTF8
                $checkJ = Get-Content $sf -Raw | ConvertFrom-Json
                $checkJ.PSObject.Properties | Where-Object { $_.Name -match "recent|opened|lastUsed" } | ForEach-Object { if ($_.Value.Count -gt 0) { $allEmpty = $false } }
                if ($allEmpty) { Ok "VS Code storage.json: recientes limpiados." }
            } catch {}
        }
        # Chrome - TODOS los perfiles del usuario actual
        Step "Chrome - limpieza total (todos los perfiles)"
        $chromeBase = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
        $items = @("History","History-journal","Cookies","Cookies-journal","Login Data","Login Data-journal","Login Data For Account","Web Data","Visited Links","Cache","Code Cache","GPUCache","Sessions","Session Storage","Local Storage","IndexedDB","Service Worker","Network","Preferences","Top Sites","Shortcuts","Current Tabs","Current Session","Last Tabs","Last Session")
        $cleared=0
        if (Test-Path $chromeBase) {
            $profiles = Get-ChildItem $chromeBase -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq "Default" -or $_.Name -match "^Profile" }
            foreach ($pf in $profiles) {
                foreach ($it in $items) {
                    $path = Join-Path $pf.FullName $it
                    if (Test-Path $path) {
                        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
                        if (-not (Test-Path $path)) { $cleared++ }
                    }
                }
            }
            foreach ($sh in @("ShaderCache","GrShaderCache")) {
                $p=Join-Path $chromeBase $sh
                if (Test-Path $p){
                    Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
                    if (-not (Test-Path $p)) { $cleared++ }
                }
            }
            if ($cleared -gt 0) { Ok "Chrome: $cleared elementos borrados en $($profiles.Count) perfil(es)." }
        } else { Info "Sin datos de Chrome." }
        # Temporales + caches dev
        Step "Temporales y caches"
        $sweepPaths = @($env:TEMP, $env:APPDATA, $env:LOCALAPPDATA, (Join-Path $env:USERPROFILE "Documents"))
        $checkedPaths = @()
        foreach ($sp in $sweepPaths) {
            if (Test-Path $sp) {
                $checkedPaths += $sp
                Get-ChildItem -Path $sp -Filter "khora*" -ErrorAction SilentlyContinue | ForEach-Object {
                    L "STEP" "[CLEANUP] Residuo detectado y eliminado: $($_.FullName)"
                    Remove-Item -Recurse -Force -LiteralPath $_.FullName -ErrorAction SilentlyContinue
                }
                Get-ChildItem -Path $sp -Filter "khor~*" -ErrorAction SilentlyContinue | ForEach-Object {
                    L "STEP" "[CLEANUP] Residuo detectado y eliminado: $($_.FullName)"
                    Remove-Item -Recurse -Force -LiteralPath $_.FullName -ErrorAction SilentlyContinue
                }
                @(".env", "secrets.*", "*.token", "*.pat") | ForEach-Object {
                    Get-ChildItem -Path $sp -Filter $_ -File -ErrorAction SilentlyContinue | ForEach-Object {
                        L "STEP" "[CLEANUP] Residuo detectado y eliminado: $($_.FullName)"
                        Remove-Item -Force -LiteralPath $_.FullName -ErrorAction SilentlyContinue
                    }
                }
            }
        }

        if ($REPO_DIR) {
            $vDir = Join-Path $REPO_DIR ".vercel"
            if (Test-Path $vDir) {
                Remove-Item -Recurse -Force -LiteralPath $vDir -ErrorAction SilentlyContinue
            }
        }

        @("git*","vscode*","*token*","khe-*") | ForEach-Object {
            Get-Item (Join-Path $env:TEMP $_) -ErrorAction SilentlyContinue | ForEach-Object {
                Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        $npmOk = $true
        $pipOk = $true
        if (Test-Cmd npm)    { try { $p = Start-Process npm -ArgumentList "cache clean --force" -Wait -PassThru -NoNewWindow; if ($p.ExitCode -eq 0) { Ok "npm cache limpio." } else { $npmOk=$false } } catch {} }
        if (Test-Cmd python) { try { $p = Start-Process python -ArgumentList "-m pip cache purge" -Wait -PassThru -NoNewWindow; if ($p.ExitCode -eq 0) { Ok "pip cache limpio." } else { $pipOk=$false } } catch {} }
        $tempOk = (-not (Get-ChildItem (Join-Path $env:TEMP "khe-*") -ErrorAction SilentlyContinue))
        if ($tempOk) { Ok "Temporales borrados." }
        # Recientes de Windows + RunMRU
        Step "Recientes de Windows"
        $rec = Join-Path $env:APPDATA "Microsoft\Windows\Recent"
        if (Test-Path $rec) {
            Get-ChildItem $rec -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            if ((Get-ChildItem $rec -ErrorAction SilentlyContinue).Count -eq 0) { Ok "Archivos recientes borrados." }
        }
        try {
            Remove-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\RunMRU" -Name * -ErrorAction SilentlyContinue
            if (-not (Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\RunMRU" -ErrorAction SilentlyContinue).PSObject.Properties.Where({$_.Name -match '^[a-zA-Z]$'})) { Ok "RunMRU limpiado." }
        } catch {}
        # Borrado seguro del espacio libre del workdir
        Step "Borrado seguro (sobrescritura de espacio libre)"
        $cipherStatus = "NO VERIFICABLE"
        if (Test-Cmd cipher) {
            try {
                $p = Start-Process cipher -ArgumentList "/w:$WORK_DIR" -WindowStyle Hidden -Wait -PassThru
                if ($p.ExitCode -eq 0) {
                    Ok "cipher /w completado."
                    $cipherStatus = "VERIFICADO"
                } else {
                    Warn "cipher /w termino con codigo no cero."
                    $cipherStatus = "PENDIENTE"
                }
            } catch { Warn "cipher fallo: $_"; $cipherStatus = "PENDIENTE" }
        } else { Info "cipher no disponible; omitido." }
        # Revocacion de token (best-effort)
        Step "Token"
        Info "Los PAT de usuario no se pueden revocar por API sin credenciales de app."
        $script:TokSecure = $null; [GC]::Collect()
        Ok "Token eliminado de la memoria de este proceso."
        # --- VERIFICACION POST-LIMPIEZA ---
        Step "VERIFICACION POST-LIMPIEZA"
        $checks = @()
        $checks += @{ n="Repo local eliminado"; ok=(-not (Test-Path $REPO_DIR)) }
        $checks += @{ n="Sin trabajo perdido (respaldado o en cuarentena)"; ok=(-not (Test-UnpushedWork)) }
        $checks += @{ n="Git user.name ausente"; ok=([string]::IsNullOrWhiteSpace((git config --global user.name 2>$null))) }
        $checks += @{ n="Git user.email ausente"; ok=([string]::IsNullOrWhiteSpace((git config --global user.email 2>$null))) }
        $checks += @{ n="Sin credenciales git en Cred.Manager"; ok=(-not (cmdkey /list 2>$null | Select-String "git|github")) }
        $checks += @{ n="Token fuera de memoria"; ok=($null -eq $script:TokSecure) }
        $checks += @{ n="Secrets .khora.env destruidos"; ok=(-not ((Test-Path (Join-Path $ROOT_DIR ".khora.env")) -or (Test-Path (Join-Path $WORK_DIR ".khora.env")))) }
        $checks += @{ n="Deadline desregistrado"; ok=(-not (Get-ScheduledTask -TaskName $script:TASK_NAME -ErrorAction SilentlyContinue)) }
        $checks += @{ n="Guardian detenido"; ok=(-not (Get-Process -Id $gpid -ErrorAction SilentlyContinue)) }
        $checks += @{ n="VS Code storage y caches borrados"; ok=($allEmpty) }
        $checks += @{ n="Chrome limpio"; ok=($cleared -gt 0 -or -not (Test-Path $chromeBase)) }
        $checks += @{ n="Temporales borrados"; ok=($tempOk -and $npmOk -and $pipOk) }
        $checks += @{ n="PS history borrado"; ok=($h_cleared) }

        $allOK = $true
        $pendings = @()
        foreach ($c in $checks) {
            if ($c.ok) {
                Ok "VERIFICADO: $($c.n)"
            } else {
                Fail "PENDIENTE: $($c.n)"
                $allOK=$false
                $pendings += $c.n
            }
        }

        if ($cipherStatus -eq "VERIFICADO") {
            Ok "VERIFICADO: cipher /w espacio libre"
        } elseif ($cipherStatus -eq "PENDIENTE") {
            Fail "PENDIENTE: cipher /w espacio libre"
            $allOK=$false
            $pendings += "cipher /w espacio libre"
        } else {
            Info "NO VERIFICABLE: cipher /w espacio libre"
            $pendings += "cipher /w espacio libre (NO VERIFICABLE)"
        }

        $script:SES_ACTIVE = $false

        $lastState = @{
            reason = $reason
            timestamp = (Get-Date -Format 'o')
            result = if ($allOK) { "TODO OK" } else { "CON PENDIENTES" }
            pendings = $pendings
        } | ConvertTo-Json -Depth 5 -Compress
        $stateFile = Join-Path $WORK_DIR "session-state\last-cleanup.json"
        if (-not (Test-Path (Split-Path $stateFile -Parent))) { New-Item -ItemType Directory -Force (Split-Path $stateFile -Parent) | Out-Null }
        Set-Content $stateFile $lastState -Encoding UTF8

        L "STEP" "[CLEANUP] Limpieza completa. Rutas verificadas: $($checkedPaths -join ', ')."
        L "STEP" "=== LIMPIEZA NUCLEAR COMPLETA (motivo:$reason) === verificacion:$(if($allOK){'TODO OK'}else{'CON PENDIENTES'}) ==="
        Write-Host ""
        Write-Host "  =============================================================" -ForegroundColor Green
        Write-Host "   LIMPIEZA NUCLEAR COMPLETA.  Verificacion: $(if($allOK){'TODO OK'}else{'REVISAR PENDIENTES'})" -ForegroundColor $(if($allOK){'Green'}else{'Yellow'})
        Write-Host "  =============================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "   ACCION REQUERIDA: revoca tu token en GitHub AHORA:" -ForegroundColor Red
        Write-Host "   Settings -> Developer settings -> Tokens" -ForegroundColor Yellow
        Write-Host ""
    } finally {
        $cleanupFlag = Join-Path $WORK_STATE_DIR "cleanup-in-progress.flag"
        Remove-Item $cleanupFlag -Force -ErrorAction SilentlyContinue
        $mtx.ReleaseMutex(); $mtx.Dispose()
    }
}
function Trigger-Cleanup {
    param([string]$why)
    L "STEP" "GUARDIAN DISPARA LIMPIEZA: $why"
    try { Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File","`"$SCRIPT_PATH`"","-CleanupOnly","-Reason",$why -WindowStyle Hidden } catch { L "FAIL" "No se pudo lanzar limpieza: $_" }
}
