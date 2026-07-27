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
    # --- Autenticacion gh CLI ---
    Step "Autenticacion gh CLI"
    if (-not (Confirm-GhCliAuth)) { Warn "gh CLI fallido. El script seguira pero algunas funciones pueden degradarse." }
    Open-LoginTabs
    # --- Token seguro ---
    Step "Autenticacion GitHub (token en SecureString)"
    $valid = $false
    for ($t=1; $t -le 3; $t++) {
        # Captura robusta: Ctrl+V NO funciona en prompts -AsSecureString (conhost
        # entrega un solo caracter de control 0x16 -> aparece 1 asterisco).
        # Via principal: leer del portapapeles y limpiarlo de inmediato.
        # Fallback: pegar con CLIC DERECHO (QuickEdit) en prompt enmascarado.
        $sec = $null
        Info "Copia el token al portapapeles (Ctrl+C), luego presiona ENTER (intento $t/3)..."
        Write-Host "  >> Lo que teclees/pegues NO aparecera en pantalla <<" -ForegroundColor DarkGray
        Clear-PendingInput   # limpiar buffer antes de esperar
        $Host.UI.RawUI.FlushInputBuffer()
        do {
            if ([Console]::KeyAvailable) {
                $__khk = [Console]::ReadKey($true)
            } else {
                Start-Sleep -Milliseconds 100
                if (Test-Path $global:DepsPreloadLog) {
                    if ($null -eq $global:DepsLogPos) { $global:DepsLogPos = 0 }
                    $__depsLogSize = (Get-Item $global:DepsPreloadLog).Length
                    if ($__depsLogSize -gt $global:DepsLogPos) {
                        try {
                            $__depsLogReader = [System.IO.File]::Open($global:DepsPreloadLog, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
                            $__depsLogReader.Seek($global:DepsLogPos, [System.IO.SeekOrigin]::Begin) | Out-Null
                            $__depsLogStream = New-Object System.IO.StreamReader($__depsLogReader, [System.Text.Encoding]::UTF8)
                            while (($__depsLogLine = $__depsLogStream.ReadLine()) -ne $null) {
                                L "INFO" $__depsLogLine
                            }
                            $global:DepsLogPos = $__depsLogReader.Position
                            $__depsLogStream.Close()
                        } catch {}
                    }
                }
            }
        } while ($null -eq $__khk -or $__khk.Key -ne [ConsoleKey]::Enter)
        $raw = $null
        try { $raw = Get-Clipboard -Raw -ErrorAction Stop } catch {}
        if ($raw) { $raw = $raw.Trim() }
        if ($raw -and $raw.Length -ge 10 -and $raw -notmatch '\s') {
            $sec = ConvertTo-SecureString -String $raw -AsPlainText -Force
            $raw = $null
            try { Set-Clipboard -Value ' ' -ErrorAction Stop; Ok "Token capturado del portapapeles. Portapapeles limpiado." }
            catch { Warn "Token capturado, pero no pude limpiar el portapapeles: limpialo manualmente." }
        } else {
            Warn "Portapapeles vacio o con contenido invalido. Fallback manual:"
            $sec = Read-Host "  Pega el token con CLIC DERECHO (no Ctrl+V) y ENTER" -AsSecureString
        }
        if (-not $sec -or $sec.Length -lt 10) { Fail "Token muy corto."; continue }
        Info "Validando token con la API..."
        $script:TokSecure = $sec
        try {
            $ok = Invoke-WithToken {
                param($t)
                $h = @{ Authorization="Bearer $t"; "User-Agent"="khora" }
                $r = Invoke-WebRequest "https://api.github.com/repos/$REPO_ORG/$REPO_NAME" -Headers $h -UseBasicParsing -TimeoutSec 12 -ErrorAction Stop
                return ($r.StatusCode -eq 200)
            }
            if ($ok) { Ok "Token valido. Acceso confirmado a $REPO_ORG/$REPO_NAME"; $valid=$true; break }
        } catch {
            $code = $_.Exception.Response.StatusCode.value__
            $msg  = switch ($code) {401{"invalido/expirado"} 403{"sin permisos"} 404{"repo no encontrado"} default{"HTTP $code"}}
            Fail "Token rechazado: $msg"
            $script:TokSecure = $null
        }
    }
if (-not $valid) { Fail "3 intentos fallidos. Sesion cancelada."; Write-Host ""; Write-Host "SESIÓN DETENIDA: Fallaron 3 intentos de token."; $script:TokSecure=$null; return }
    Step "Configuracion Git"
    git config --global user.name  $GIT_NAME  2>&1 | Out-Null; Ok "user.name  = $GIT_NAME"
    git config --global user.email $GIT_EMAIL 2>&1 | Out-Null; Ok "user.email = $GIT_EMAIL"
    git config --global credential.helper ""  2>&1 | Out-Null; Ok "credential.helper = vacio (sin credenciales en disco)"
    git config --global core.autocrlf input   2>&1 | Out-Null; Ok "core.autocrlf = input"
    git config --global core.longpaths true   2>&1 | Out-Null; Ok "core.longpaths = true"
    # Git Credential Manager (GCM) puede interceptar la autenticacion con su propio
    # flujo OAuth por navegador ("please complete authentication in your browser"),
    # IGNORANDO nuestro token efimero por header. Lo bloqueamos a nivel de proceso:
    $env:GIT_TERMINAL_PROMPT = "0"      # git: jamas preguntar credenciales interactivas
    $env:GCM_INTERACTIVE     = "Never"  # GCM: prohibido abrir flujo OAuth en el navegador
    Ok "Prompts interactivos de Git/GCM deshabilitados (solo token por header)."
    Step "Clonando $REPO_ORG/$REPO_NAME (metodo: URL-token efimera, token NO queda en disco)"
    $cloneOK = $false
    for ($i=1; $i -le 3; $i++) {
        # Limpiar SIEMPRE antes de cada intento: un intento previo interceptado por GCM
        # puede dejar un .git parcial que rompe el siguiente intento con un error distinto.
        if (Test-Path $REPO_DIR) { Remove-Item -Recurse -Force $REPO_DIR -ErrorAction SilentlyContinue }
        Info "git clone -- intento $i/3... [metodo: x-access-token@github.com | GCM bypaseado por diseno]"
        try {
            Invoke-WithToken {
                param($t)
                # URL-token: bypasea GCM y el bug de quoting de PS con http.extraheader
                # El token NUNCA queda en disco: se elimina del remote URL si el clone tiene exito
                $__cloneUrl = "https://x-access-token:${t}@github.com/$REPO_ORG/$REPO_NAME.git"
                $script:__cloneErr = "$(git clone $__cloneUrl $REPO_DIR 2>&1)"
            }
        } catch { $script:__cloneErr = "$_" }
        if (Test-Path "$REPO_DIR\.git") {
            # LIMPIAR token de la URL remota guardada en .git/config
            git -C $REPO_DIR remote set-url origin "https://github.com/$REPO_ORG/$REPO_NAME.git" 2>&1 | Out-Null
            $cloneOK=$true; break
        }
        $__ce = $script:__cloneErr
        $__diag = if     ($__ce -match 'Repository not found')              { "Repo $REPO_ORG/$REPO_NAME no existe o el token no tiene acceso de lectura." }
                  elseif ($__ce -match 'Authentication failed|401|bad cred') { "Token rechazado por GitHub (expirado, revocado o scope 'repo' faltante)." }
                  elseif ($__ce -match 'could not resolve host|SSL')         { "Error de red/DNS al contactar github.com." }
                  elseif ($__ce -match 'already exists and is not an empty') { "Carpeta $REPO_DIR no se pudo limpiar (antivirus o permisos)." }
                  elseif ($__ce)                                              { "git dijo: $__ce" }
                  else                                                        { "git termino sin salida (posible bloqueo de antivirus o permisos de red)." }
        L "WARN" "Clone intento $i/3 FALLIDO. Causa detectada: $__diag"
        Warn "Intento $i fallido. Causa: $__diag"
        if ($i -lt 3) { Start-Sleep ($i*3) }
    }
if (-not $cloneOK) { Fail "No se pudo clonar tras 3 intentos."; Write-Host ""; Write-Host "SESIÓN DETENIDA: Fallo al clonar repositorio."; return }
    # URL remota limpiada al terminar el clone (remote set-url sin token)
    $branch = git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>&1
    $ultimo = git -C $REPO_DIR log --oneline -1 2>&1
    $nFiles = (Get-ChildItem $REPO_DIR -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    Ok "Repo clonado. Branch: $branch | Archivos: $nFiles"
    Ok "Ultimo commit: $ultimo"
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
    Ensure-Docker
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
    Init-EnvVault

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
}
