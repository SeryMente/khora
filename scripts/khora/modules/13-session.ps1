# ================================================================
# KHORA v7 - MODULO 13-session.ps1
# Componente: 13 session
# ================================================================

function Start-Sesion {
Init-HUD
    Write-Host ""
    L "STEP" "=== INICIO DE SESION === $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') === $env:USERNAME @ $env:COMPUTERNAME ==="
    L "INFO" "Script v$SCRIPT_VERSION | Path: $SCRIPT_PATH"
    L "INFO" "Workdir: $WORK_DIR"
    L "INFO" "Log principal: $LOG_FILE"
    L "INFO" "Log workdir:   $WORK_LOG"
    L "INFO" "Repo destino:  $REPO_DIR"
    L "INFO" "PowerShell: $($PSVersionTable.PSVersion) | OS: $([Environment]::OSVersion.VersionString)"
    L "INFO" "Elevated: $([bool](([Security.Principal.WindowsIdentity]::GetCurrent()).Groups -match 'S-1-5-32-544'))"
    Clear-PendingInput   # sin teclas fantasma antes de los prompts de sesion
    Step "Perfil de trabajo"
    # v6.4.6: bitacora completa de la deteccion multi-metodo al log
    foreach ($__dl in @($script:REAL_USER_DETECT_LOG)) { L "INFO" "DeteccionUsuarioReal $__dl" }
    if ($script:REAL_USER_METHOD) {
        Ok "Deteccion usuario real: metodo con exito = $($script:REAL_USER_METHOD) -> detectado: $($script:REAL_USER_NAME)"
    }
    if ($script:REAL_USER_OVERRIDE) {
        Ok   "Usuario de trabajo : $($script:REAL_USER_NAME) (perfil: $env:USERPROFILE)"
        Info "Elevado como admin : $($script:REAL_USER_ELEVATED_AS) (su perfil NO se usara)"
        Ok   "Workdir, repo, venv, .env -> quedan en el perfil de $($script:REAL_USER_NAME)."
    } elseif ($script:REAL_USER_SAME) {
        Ok   "Usuario real ($($script:REAL_USER_NAME)) == usuario del proceso: mismo usuario, sin redireccion necesaria."
        Ok   "Usuario : $env:USERNAME  |  Perfil : $env:USERPROFILE"
        if ([bool](([Security.Principal.WindowsIdentity]::GetCurrent()).Groups -match 'S-1-5-32-544')) {
            Info "Proceso elevado (admin) con la MISMA cuenta que el usuario de trabajo. OK."
        }
    } elseif ($script:REAL_USER_NO_PROFILE) {
        Warn "Usuario real detectado ($($script:REAL_USER_NO_PROFILE)) pero su perfil NO existe en disco: se trabaja con el contexto elevado ($env:USERNAME)."
        Ok   "Usuario : $env:USERNAME  |  Perfil : $env:USERPROFILE"
    } else {
        Warn "No se pudo determinar el usuario real (ningun metodo tuvo exito): se usa el contexto actual."
        Ok   "Usuario : $env:USERNAME  |  Perfil : $env:USERPROFILE"
    }
if (-not (Invoke-Preflight)) { Fail "Preflight fallo (sin internet). Sesion cancelada."; Write-Host ""; Write-Host "SESIÓN DETENIDA: Preflight falló."; return }
    Step "Politica de ejecucion"
    $ep = Get-ExecutionPolicy -Scope CurrentUser
    if ($ep -in @("Restricted","AllSigned")) {
        try { Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force; Ok "ExecutionPolicy $ep -> RemoteSigned" }
        catch { Warn "No se pudo cambiar (GPO?). El proceso ya corre con Bypass." }
    } else { Ok "ExecutionPolicy OK: $ep" }
    # --- CIFRADO EN REPOSO: el workdir se cifra ANTES de descargar nada ---
    Step "Cifrado en reposo (EFS)"
    $script:EFS_ACTIVE = Protect-KhoraPath $WORK_DIR "workdir de sesion"
    if ($script:EFS_ACTIVE) { Info "Todo lo que se descargue al workdir (repo incluido) nacera CIFRADO en disco." }
    if (-not (Ensure-Git)) { return }
    # --- Autenticacion GitHub: requisito previo a cualquier operacion Git ---
    Step "Autenticacion GitHub / GitHub CLI"
    if (-not (Confirm-GhCliAuth)) { Fail "Autenticacion GitHub no disponible. La sesion se detiene antes de clone/fetch/push."; return }
    Open-LoginTabs
    # --- Credencial API GitHub: heredada de gh, sin pedir PAT al usuario ---
    Step "Credencial API GitHub"
    $valid = $false

    if ($script:TokSecure) {
        Ok "Credencial API GitHub ya disponible en memoria."
        $valid = $true
    } else {
        if (Test-Cmd gh) {
            try {
                $apiToken = @(gh auth token 2>$null)
                $apiCode = $LASTEXITCODE
                if ($apiCode -eq 0 -and $apiToken.Count -gt 0) {
                    $apiToken = ($apiToken -join "").Trim()
                    if ($apiToken -and $apiToken.Length -ge 10) {
                        $script:TokSecure = ConvertTo-SecureString -String $apiToken -AsPlainText -Force
                        $apiToken = $null
                        $valid = $true
                        Ok "Credencial API GitHub recuperada desde gh (sin introducir token manualmente)."
                    } else {
                        $apiToken = $null
                    }
                }
            } catch {
                $apiToken = $null
            }
        }

        if ($valid) {
            try {
                $ok = Invoke-WithToken {
                    param($t)
                    $h = @{ Authorization = "Bearer $t"; "User-Agent" = "khora"; Accept = "application/vnd.github+json" }
                    $r = Invoke-WebRequest "https://api.github.com/repos/$REPO_ORG/$REPO_NAME" -Headers $h -UseBasicParsing -TimeoutSec 12 -ErrorAction Stop
                    return ($r.StatusCode -eq 200)
                }
                if (-not $ok) {
                    $script:TokSecure = $null
                    $valid = $false
                }
            } catch {
                $script:TokSecure = $null
                $valid = $false
            }
        }
    }

    if (-not $valid) {
        Fail "No se pudo recuperar una credencial API válida desde gh."
        Write-Host ""
        Write-Host "SESIÓN DETENIDA: gh está autenticado para Git, pero no pudo proporcionar una credencial API válida." -ForegroundColor Red
        return
    }
    Step "Configuracion Git"
    git config --global user.name  $GIT_NAME  2>&1 | Out-Null; Ok "user.name  = $GIT_NAME"
    git config --global user.email $GIT_EMAIL 2>&1 | Out-Null; Ok "user.email = $GIT_EMAIL"
    # gh auth setup-git configura el helper especifico de github.com; no se fuerza un helper global.
    git config --global core.autocrlf input   2>&1 | Out-Null; Ok "core.autocrlf = input"
    git config --global core.longpaths true   2>&1 | Out-Null; Ok "core.longpaths = true"
    # Git Credential Manager (GCM) puede interceptar la autenticacion con su propio
    # flujo OAuth por navegador ("please complete authentication in your browser"),
    # IGNORANDO nuestro token efimero por header. Lo bloqueamos a nivel de proceso:
    $env:GIT_TERMINAL_PROMPT = "0"      # git: jamas preguntar credenciales interactivas
    Remove-Item Env:GCM_INTERACTIVE -ErrorAction SilentlyContinue
    Ok "Prompts interactivos de Git/GCM deshabilitados (solo token por header)."
    Step "Clonando $REPO_ORG/$REPO_NAME (Git autenticado mediante GitHub CLI)"
    $cloneOK = $false
    $cloneErr = $null

    for ($i=1; $i -le 3; $i++) {
        if (Test-Path $REPO_DIR) {
            Remove-Item -LiteralPath $REPO_DIR -Recurse -Force -ErrorAction SilentlyContinue
        }

        Info ("git clone -- intento {0}/3... [TokSecure/GIT_ASKPASS]" -f $i)
        $askPass = Join-Path $env:TEMP ("khora-git-askpass-" + $PID + ".cmd")
        $askText = "@echo off`r`nif /I `"%~1`"==`"Username for https://github.com:`" (echo x-access-token) else (echo %KHORA_GIT_TOKEN%)"
        [IO.File]::WriteAllText($askPass,$askText,(New-Object System.Text.ASCIIEncoding))
        try {
            $cloneCode = 1
            $cloneErr = ""
            Invoke-WithToken {
                param($t)
                $env:KHORA_GIT_TOKEN = $t
                $env:GIT_ASKPASS = $askPass
                $env:GIT_TERMINAL_PROMPT = "0"
                $cloneOutput = @(git -c credential.helper= -c core.askPass="$askPass" clone "https://github.com/$REPO_ORG/$REPO_NAME.git" $REPO_DIR 2>&1)
                $script:__cloneCode = $LASTEXITCODE
                $script:__cloneErr = (($cloneOutput | Out-String).Trim())
            } | Out-Null
            $cloneCode = $script:__cloneCode
            $cloneErr = $script:__cloneErr
        } catch {
            $cloneCode = 1
            $cloneErr = "$_"
        } finally {
            Remove-Item Env:KHORA_GIT_TOKEN -ErrorAction SilentlyContinue
            Remove-Item Env:GIT_ASKPASS -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath $askPass -Force -ErrorAction SilentlyContinue
        }
        $cloneErr = Mask-Token -Text $cloneErr

        if (($cloneCode -eq 0) -and (Test-Path -LiteralPath (Join-Path $REPO_DIR ".git"))) {
            $cloneOK = $true
            Ok "Repositorio clonado correctamente mediante autenticación GitHub CLI."
            break
        }

        $__diag = if ($cloneErr -match 'Repository not found') {
            "Repo $REPO_ORG/$REPO_NAME no existe o la identidad autenticada no tiene acceso."
        } elseif ($cloneErr -match 'Authentication failed|401|403|bad cred|Invalid username or token|Permission denied') {
            "GitHub rechazó la autenticación de Git. Verifica gh auth status y permisos."
        } elseif ($cloneErr -match 'could not resolve host|SSL|Could not resolve') {
            "Error de red/DNS al contactar github.com."
        } elseif ($cloneErr -match 'already exists and is not an empty') {
            "La carpeta $REPO_DIR no pudo limpiarse."
        } elseif ($cloneErr) {
            "git dijo: $cloneErr"
        } else {
            "git terminó sin salida."
        }

        L "WARN" ("Clone intento {0}/3 FALLIDO. Causa detectada: {1}" -f $i,$__diag)
        Warn ("Intento {0} fallido. Causa: {1}" -f $i,$__diag)
        if ($i -lt 3) { Start-Sleep -Seconds 2 }
    }

    if (-not $cloneOK) {
        Fail "No se pudo clonar tras 3 intentos con la autenticación GitHub CLI."
        Write-Host ""
        Write-Host "SESIÓN DETENIDA: Fallo al clonar repositorio." -ForegroundColor Red
        return
    }
    $branch = git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>&1
    $ultimo = git -C $REPO_DIR log --oneline -1 2>&1
    $nFiles = (Get-ChildItem $REPO_DIR -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    Ok "Repo clonado. Branch: $branch | Archivos: $nFiles"
    Ok "Ultimo commit: $ultimo"

    if (Test-Path (Join-Path $REPO_DIR ".vercel")) {
        L "WARN" "[WARN] .vercel/ presente — será borrada al cerrar sesión."
    }

    $giFile = Join-Path $REPO_DIR ".gitignore"
    if (Test-Path $giFile) {
        $giCount = (Get-Content $giFile -ErrorAction SilentlyContinue | Where-Object { $_.Trim() -ne "" -and -not $_.Trim().StartsWith("#") } | Measure-Object).Count
        Info "Reglas en .gitignore: $giCount. Recuerda 'git add -f' si necesitas forzar algo ignorado."
    }
    # Verificacion: el repo nacio dentro del workdir EFS -> debe estar cifrado
    if ($script:EFS_ACTIVE) {
        $__rf = Get-ChildItem $REPO_DIR -Recurse -File -Force -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($__rf -and (Test-KhoraEncrypted $__rf.FullName)) { Ok "REPO CIFRADO EN DISCO (EFS): ilegible fuera de esta cuenta/sesion." }
        else { Warn "El repo no heredo EFS; aplicando cifrado directo..."; Protect-KhoraPath $REPO_DIR "repo clonado" | Out-Null }
    } else { Warn "Repo SIN cifrado en disco (EFS no disponible). Protegen: limpieza [X] + DeepFreeze." }
    New-Item -ItemType Directory -Force (Join-Path $REPO_DIR "logs") | Out-Null
    $entry = @"

================================================================
 SESION INICIADA
 Fecha:    $DATE_STR $(Get-Date -Format 'HH:mm:ss')
 Host:     $env:COMPUTERNAME
 Usuario:  $env:USERNAME
 Branch:   $branch  |  Commit: $ultimo  |  Archivos: $nFiles
================================================================
"@
    Add-Content (Join-Path $REPO_DIR "logs\sessions.log") $entry -Encoding UTF8 -ErrorAction SilentlyContinue
    Ok "Entrada escrita en repo/logs/sessions.log"
    Ensure-GitignoreHygiene
    Init-Wip
    Restore-ChromeTabsSnapshot
    # Entorno PRIMERO: VS Code abrira con npm/node/render/docker ya en PATH
    Step "Entorno de desarrollo (Python + Node + Docker + Vercel + Render)"
    Wait-DepsPreload -Job $global:DepsPreloadJob
    Ensure-Python311
    Setup-Venv
    Ensure-Node
    Setup-KhoraWeb
    Ensure-VercelCLI
    Ensure-RenderCLI
    # Ensure-Docker desactivado en v7.1.2
    # VS Code abre DESPUES de instalar tools
    # -> su terminal integrada tiene npm, node, python, render, vercel, docker listos
    Step "VS Code"
    $code = Ensure-VSCode
    Sync-VSCodeConfig
    if ($code) { $p = Start-Process -FilePath $code -ArgumentList "`"$REPO_DIR`"" -PassThru; Ok "VS Code abierto (PID $($p.Id))" }
    else { Warn "Abre el repo manualmente: $REPO_DIR" }
    # Navegador (inteligente)
    Step "Navegador (inteligente)"
    Invoke-ChromeIntelligent
    # Guardian + Deadline
    Step "Guardian KHORA (red de seguridad)"
    Start-Guardian
    Register-Deadline
    $script:SES_ACTIVE = $true
    # ===================================================================
    # AUTO-INICIO GARANTIZADO: todo corre solo, sin opcion de menu
    # ===================================================================
    Step "Boveda de entorno (Env Vault)"
    . (Join-Path $REPO_DIR "scripts\khora\env-vault.ps1"); Import-KhoraEnvVault | Out-Null
    Step "Servidores de desarrollo (AUTO-INICIO garantizado)"
    L "INFO" "Arrancando dev servers automaticamente post-token (API + Next.js)..."
    Start-DevServers
    L "INFO" "Dev servers iniciados. Sistema listo para trabajar."
    $dur = [math]::Round(((Get-Date)-$SES_START).TotalSeconds)
    Write-Host ""
    Write-Host "  =============================================================" -ForegroundColor Green
    Write-Host "   SESION LISTA en ${dur}s." -ForegroundColor Green
    $profileTxt = if ($script:REAL_USER_OVERRIDE) { "$($script:REAL_USER_NAME) [elevado como $($script:REAL_USER_ELEVATED_AS)]" } else { $env:USERNAME }
    Write-Host "   Perfil: $profileTxt" -ForegroundColor DarkGray
    Write-Host "   Repo:  $REPO_DIR" -ForegroundColor DarkGray
    Write-Host "   WIP:   $script:WIP_BRANCH (respaldo cada $($CFG.autoWipMinutes)min)" -ForegroundColor DarkGray
    Write-Host "   Guard: inactividad $($CFG.inactivityMinutes)min | deadline $($CFG.deadlineHour):00 | panico Ctrl+Alt+K" -ForegroundColor DarkGray
    Write-Host "   Terminal VS Code: npm node python git vercel render docker" -ForegroundColor DarkGray
    $efsTxt = if ($script:EFS_ACTIVE) { "EFS ACTIVO - repo/secrets ilegibles fuera de esta cuenta" } else { "SIN EFS - respaldo: limpieza [X] + DeepFreeze" }
    Write-Host "   Cifrado: $efsTxt" -ForegroundColor DarkGray
    Write-Host "   Render: render env set KEY=val --service-id <id>  |  render logs --service-id <id> --tail" -ForegroundColor DarkGray
    Write-Host "  =============================================================" -ForegroundColor Green
    L "INFO" "SESION LISTA en ${dur}s"
    $live = Sync-EpLiveLog -Reason 'session-ready'
    if ($live) { Ok 'EP-LIVE-LOG sincronizado y verificado en GitHub.' } else { Warn 'EP-LIVE-LOG no pudo sincronizarse en la instancia inicial.' }
}