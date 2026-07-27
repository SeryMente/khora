# ================================================================
# KHORA v7 - MODULO 08-deps.ps1
# Componente: 08 deps
# ================================================================

function Get-CodePaths {
    @(
        (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\Code.exe"),
        (Join-Path ${env:ProgramFiles} "Microsoft VS Code\Code.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Microsoft VS Code\Code.exe")
    )
}
function Ensure-Git {
    if (Test-Cmd git) { return $true }
    Warn "Git no encontrado. Instalando..."
    if (Test-Cmd winget) {
        try {
            winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements 2>&1 | ForEach-Object { Info "winget: $_" }
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            if (Test-Cmd git) { Ok "Git instalado via winget."; return $true }
        } catch { Warn "winget fallo: $_" }
    }
    try {
        Info "Descargando PortableGit..."
        $api = Invoke-RestMethod "https://api.github.com/repos/git-for-windows/git/releases/latest" -Headers @{ "User-Agent"="khora" } -TimeoutSec 20
        $asset = $api.assets | Where-Object { $_.name -match "PortableGit.*64-bit\.7z\.exe$" } | Select-Object -First 1
        if ($asset) {
            $dst = Join-Path $WORK_DIR "PortableGit.exe"
            Invoke-WebRequest $asset.browser_download_url -OutFile $dst -UseBasicParsing -TimeoutSec 600
            $gitDir = Join-Path $WORK_DIR "PortableGit"
            Start-Process $dst -ArgumentList "-o`"$gitDir`"","-y" -Wait
            $gitCmd = Join-Path $gitDir "cmd"
            if (Test-Path (Join-Path $gitCmd "git.exe")) {
                $env:Path = "$gitCmd;$env:Path"
                Remove-Item $dst -Force -ErrorAction SilentlyContinue
                if (Test-Cmd git) { Ok "PortableGit listo."; return $true }
            }
        }
    } catch { Warn "PortableGit fallo: $_" }
    Fail "No se pudo instalar Git. Instalalo manualmente y reintenta."
    return $false
}
function Confirm-GhCliAuth {
    param([switch]$CheckOnly)
    if (-not (Test-Cmd gh)) { Warn "gh CLI no encontrado."; return $false }
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        if ($CheckOnly) { Warn "gh CLI no autenticado."; return $false }
        Info "Iniciando autenticacion en gh CLI (se abrira el navegador)..."
        gh auth login --hostname github.com --git-protocol https --web 2>&1 | ForEach-Object { Info "gh: $_" }
        gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "gh CLI no pudo autenticarse."; Write-Host ""; Write-Host "SESIÓN DETENIDA: gh CLI falló."; return $false }
    }
    if (-not $CheckOnly) {
        gh auth setup-git 2>&1 | Out-Null
    }
    Ok "gh CLI autenticado."
    return $true
}
function Ensure-VSCode {
    $code = Resolve-Exe "code" (Get-CodePaths) "Code.exe"
    if ($code) { Ok "VS Code encontrado: $code"; return $code }
if (Wait-ProactiveDepPrep -Key 'vscode' -Label 'VS Code') {
    $code = Resolve-Exe "code" (Get-CodePaths) "Code.exe"
    if ($code) { Ok "VS Code OK (tras instalacion proactiva): $code"; return $code }
}
    Warn "VS Code no encontrado. Intentando winget..."
    if (Test-Cmd winget) {
        try {
            winget install --id Microsoft.VisualStudioCode -e --scope user --silent --accept-package-agreements --accept-source-agreements 2>&1 | ForEach-Object { Info "winget: $_" }
            $code = Resolve-Exe "code" (Get-CodePaths) "Code.exe"
            if ($code) { Ok "VS Code instalado via winget."; return $code }
        } catch { Warn "winget fallo: $_" }
    }
    Warn "Descargando instalador oficial de VS Code (user setup)..."
    $installer = Join-Path $WORK_DIR "VSCodeSetup.exe"
    $url  = "https://update.code.visualstudio.com/latest/win32-x64-user/stable"
    $expectedHash = $null
    try {
        $meta = Invoke-RestMethod "https://update.code.visualstudio.com/api/update/win32-x64-user/stable/latest" -TimeoutSec 20
        if ($meta.sha256hash) { $expectedHash = $meta.sha256hash; Info "SHA256 esperado obtenido de la API." }
    } catch { Warn "No se pudo obtener SHA256 de la API (continuo sin verificar)." }
    for ($i=1; $i -le 3; $i++) {
        try {
            Info "Descargando VS Code (intento $i/3)..."
            Invoke-WebRequest $url -OutFile $installer -UseBasicParsing -TimeoutSec 900
            $sz = (Get-Item $installer -ErrorAction SilentlyContinue).Length
            if (-not $sz -or $sz -lt 1000000) { throw "Archivo invalido: $sz bytes" }
            Ok "Descarga: $([math]::Round($sz/1MB,1)) MB"
            if ($expectedHash) {
                $actual = (Get-FileHash $installer -Algorithm SHA256).Hash
                if ($actual -ieq $expectedHash) { Ok "SHA256 verificado. Instalador integro." }
else { Remove-Item $installer -Force -ErrorAction SilentlyContinue; Fail "SHA256 NO coincide. Instalador descartado por seguridad."; Write-Host ""; Write-Host "SESIÓN DETENIDA: SHA256 no coincide."; return $null }
            }
            Info "Instalando VS Code (modo usuario, sin admin)..."
            $p = Start-Process $installer -ArgumentList "/VERYSILENT","/NORESTART","/MERGETASKS=!runcode,addtopath" -PassThru -Wait
            Remove-Item $installer -Force -ErrorAction SilentlyContinue
            if ($p.ExitCode -eq 0) {
                $code = Resolve-Exe "code" (Get-CodePaths) "Code.exe"
                if ($code) { Ok "VS Code instalado: $code"; return $code }
            } else { throw "exit code $($p.ExitCode)" }
        } catch {
            Warn "Intento $i fallido: $_"
            if (Test-Path $installer) { Remove-Item $installer -Force -ErrorAction SilentlyContinue }
            Start-Sleep ($i*3)
        }
    }
    Fail "No se pudo instalar VS Code."
    return $null
}
function Get-CodeCli {
    if (Test-Cmd code) { return "code" }
    foreach ($exe in (Get-CodePaths)) {
        if ($exe -and (Test-Path $exe)) {
            $cli = Join-Path (Split-Path $exe -Parent) "bin\code.cmd"
            if (Test-Path $cli) { return $cli }
            return $exe
        }
    }
    return $null
}
function Sync-VSCodeConfig {
    Step "VS Code: importando configuracion desde el repo"
    $dir = Join-Path $REPO_DIR "tools\vscode"
    $extFile = Join-Path $dir "extensions.txt"
    $setFile = Join-Path $dir "settings.user.json"
    if (-not (Test-Path $extFile) -and -not (Test-Path $setFile)) {
        New-Item -ItemType Directory -Force $dir | Out-Null
        Set-Content $extFile "# Un ID de extension por linea (ej. ms-python.python)" -Encoding UTF8
        Set-Content $setFile "{}" -Encoding UTF8
        Info "Primera vez: cree tools\vscode\ en el repo; al cierre se exportara tu config real y quedara respaldada."
        return
    }
    if (Test-Path $setFile) {
        $dst = Join-Path $env:APPDATA "Code\User\settings.json"
        try {
            New-Item -ItemType Directory -Force (Split-Path $dst -Parent) | Out-Null
            Copy-Item $setFile $dst -Force
            Ok "settings.json aplicado desde el repo."
        } catch { Warn "No pude aplicar settings.json: $_" }
    }
    $cli = Get-CodeCli
    if (-not $cli) { Warn "CLI de VS Code no disponible; extensiones no sincronizadas."; return }
    if (Test-Path $extFile) {
        $wanted = @(Get-Content $extFile -ErrorAction SilentlyContinue | Where-Object { $_ -and $_ -notmatch '^\s*#' } | ForEach-Object { $_.Trim() })
        if ($wanted.Count -eq 0) { Info "Lista de extensiones vacia."; return }
        $have = @(& $cli --list-extensions 2>$null)
        $n = 0
        foreach ($e in $wanted) {
            if ($have -notcontains $e) {
                & $cli --install-extension $e --force 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) { $n++; Ok "Extension instalada: $e" } else { Warn "No se pudo instalar: $e" }
            }
        }
        Ok "Extensiones sincronizadas: $($wanted.Count) en lista, $n instalada(s) ahora."
    }
}
function Export-VSCodeConfig {
    if (-not (Test-Path "$REPO_DIR\.git")) { return }
    $dir = Join-Path $REPO_DIR "tools\vscode"
    New-Item -ItemType Directory -Force $dir | Out-Null
    $src = Join-Path $env:APPDATA "Code\User\settings.json"
    if (Test-Path $src) { Copy-Item $src (Join-Path $dir "settings.user.json") -Force -ErrorAction SilentlyContinue; Ok "VS Code: settings.json exportado al repo." }
    $cli = Get-CodeCli
    if ($cli) {
        $ext = @(& $cli --list-extensions 2>$null)
        if ($ext.Count -gt 0) { Set-Content (Join-Path $dir "extensions.txt") ($ext -join "`r`n") -Encoding UTF8; Ok "VS Code: $($ext.Count) extension(es) exportadas al repo." }
    }
}
function Start-ProactiveDepPrep {
    if ($script:PrepJobsStarted) { return }
    $script:PrepJobsStarted = $true
    $script:PrepJobs = @{}
L "INFO" "Iniciando comprobacion de dependencias proactiva en segundo plano..."

# Python
$py = $null
foreach ($cmd in @('python','python3','python3.11')) {
$c = Get-Command $cmd -ErrorAction SilentlyContinue
if ($c) {
$v = & $c --version 2>&1
if ("$v" -match '3\.(1[1-9]|[2-9]\d)') { $py = $c; break }
}
}
if (-not $py) {
L "INFO" "Lanzando instalacion proactiva: Python 3.11"
$script:PrepJobs['python'] = Start-Job -ScriptBlock { winget install --id Python.Python.3.11 -e --silent 2>&1 }
}

# Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
L "INFO" "Lanzando instalacion proactiva: Node.js LTS"
$script:PrepJobs['node'] = Start-Job -ScriptBlock { winget install --id OpenJS.NodeJS.LTS -e --silent 2>&1 }
}

# Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
L "INFO" "Lanzando instalacion proactiva: Docker Desktop"
$script:PrepJobs['docker'] = Start-Job -ScriptBlock { winget install --id Docker.DockerDesktop -e --silent 2>&1 }
}

# VS Code
$code = Resolve-Exe "code" (Get-CodePaths) "Code.exe"
if (-not $code) {
L "INFO" "Lanzando instalacion proactiva: VS Code"
$script:PrepJobs['vscode'] = Start-Job -ScriptBlock { winget install --id Microsoft.VisualStudioCode -e --scope user --silent --accept-package-agreements --accept-source-agreements 2>&1 }
    }
}
function Wait-ProactiveDepPrep {
    param([string]$Key, [string]$Label)
if ($script:PrepJobs -and $script:PrepJobs.ContainsKey($Key)) {
$job = $script:PrepJobs[$Key]
if ($job) {
L "INFO" "Esperando instalacion proactiva en progreso para: $Label"
$out = Spin-Job "Finalizando instalacion de $Label (ya en progreso)" -ArgList @($job) -Tips @('esperando job en segundo plano...','casi listo...') -Block {
param($j)
Receive-Job -Job $j -Wait -AutoRemoveJob 2>&1
}
$out | ForEach-Object { L "INFO" "winget proactivo ($Key): $*" }
$script:PrepJobs.Remove($Key)

# Refrescar PATH
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
return $true
}
}
return $false
}
function Ensure-Python311 {
    L "INFO" "=== Ensure-Python311: buscando Python 3.11+ ==="
    foreach ($cmd in @('python','python3','python3.11')) {
        $c = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($c) {
            $v = & $c --version 2>&1
            L "INFO" "  Candidato $cmd en $($c.Source): $v"
            if ("$v" -match '3\.(1[1-9]|[2-9]\d)') { Ok "Python OK: $v ($($c.Source))"; return $c.Source }
        } else { L "INFO" "  ${cmd}: no en PATH" }
    }

    if (Wait-ProactiveDepPrep -Key 'python' -Label 'Python 3.11') {
        $c = Get-Command python -ErrorAction SilentlyContinue
        if ($c) {
            $v = & $c --version 2>&1
if ("$v" -match '3\.(1[1-9]|[2-9]\d)') { Ok "Python OK (tras instalacion proactiva): $v ($($c.Source))"; return $c.Source }
}
}
    Info "Python 3.11+ no encontrado. Instalando con animacion (puede tardar)..."
    $out = Spin-Job "Instalando Python 3.11" -Tips @('descargando instalador...','verificando firma...','instalando componentes...','actualizando PATH...','casi listo...') -Block {
        winget install --id Python.Python.3.11 -e --silent 2>&1
    }
    $out | ForEach-Object { L "INFO" "winget: $_" }
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
    $c = Get-Command python -ErrorAction SilentlyContinue
    if ($c) { $v = & $c --version 2>&1; Ok "Python instalado: $v"; return $c.Source }
    Warn "Python 3.11+ no disponible tras instalacion. Instala manualmente."; return $null
}
function Setup-Venv {
    L "INFO" "=== Setup-Venv: configurando entorno virtual Python ==="
    $vDir  = Join-Path $WORK_DIR 'venv'
    $pyExe = Join-Path $vDir 'Scripts\python.exe'
    if (-not (Test-Path $pyExe)) {
        $py = Ensure-Python311
        if ($py) {
            $out = Spin-Job "Creando entorno virtual Python" -ArgList @($vDir, $py) -Tips @('inicializando venv...','copiando interprete...','configurando pip...','preparando stdlib...') -Block {
                param($vd, $pe); & $pe -m venv $vd 2>&1
            }
            $out | ForEach-Object { L "INFO" "venv: $_" }
        }
    }
    if (Test-Path $pyExe) {
        $out = Spin-Job "pip install -e . (dependencias Python)" -ArgList @($REPO_DIR, $pyExe) -Tips @('leyendo pyproject.toml...','descargando paquetes...','instalando FastAPI...','instalando uvicorn...','instalando neo4j driver...','instalando cryptography...','resolviendo dependencias...','compilando extensiones...','casi listo...') -Block {
            param($rd, $pe); & $pe -m pip install -e $rd -q 2>&1
        }
        $out | ForEach-Object { L "INFO" "pip: $_" }
        Ok "Venv Python listo: $vDir"
    } else { Warn "Venv no creado. Verifica Python 3.11+." }
}
function Ensure-Node {
    L "INFO" "=== Ensure-Node: verificando Node.js ==="
    $n = Get-Command node -ErrorAction SilentlyContinue
    if ($n) { $v = & node --version 2>&1; L "INFO" "Node en PATH: $($n.Source) v$v"; Ok "Node OK: $v"; return $n.Source }

if (Wait-ProactiveDepPrep -Key 'node' -Label 'Node.js LTS') {
$n = Get-Command node -ErrorAction SilentlyContinue
if ($n) { $v = & node --version 2>&1; Ok "Node OK (tras instalacion proactiva): $v"; return $n.Source }
}

    Info "Node.js no encontrado. Instalando con animacion..."
    $out = Spin-Job "Instalando Node.js LTS" -Tips @('descargando Node.js...','instalando NPM...','configurando entorno...','actualizando PATH...','casi listo...') -Block {
        winget install --id OpenJS.NodeJS.LTS -e --silent 2>&1
    }
    $out | ForEach-Object { L "INFO" "winget: $_" }
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
    $n = Get-Command node -ErrorAction SilentlyContinue
    if ($n) { $v = & node --version 2>&1; Ok "Node instalado: $v"; return $n.Source }
    Warn "Node.js no disponible. Instala manualmente."; return $null
}
function Ensure-Docker {
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        if (Wait-ProactiveDepPrep -Key 'docker' -Label 'Docker Desktop') {
            $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
        }
    }

    if (-not $dockerCmd) {
        Info "Docker Desktop no encontrado. Instalando (puede tardar varios minutos)..."
        $out = Spin-Job "Instalando Docker Desktop" -Tips @('descargando Docker Desktop...','extrayendo componentes...','instalando WSL2 backend...','configurando servicios...','registrando Docker Engine...','casi listo...','ultimo paso...') -Block {
            winget install --id Docker.DockerDesktop -e --silent 2>&1
        }
        $out | ForEach-Object { L "INFO" "winget: $_" }
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
        $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
        if (-not $dockerCmd) { Warn "Docker no disponible post-instalacion. Puede requerir reinicio."; return }
    }
    # Verificar daemon activo
    $test = & docker ps 2>&1
    if ($LASTEXITCODE -eq 0) { Ok "Docker daemon corriendo."; return }
    Info "Docker instalado pero daemon inactivo. Iniciando Docker Desktop..."
    $ddExe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $ddExe) { Start-Process $ddExe } else { Start-Process 'Docker Desktop' -ErrorAction SilentlyContinue }
    # Spinner esperando daemon (max 90s)
    $fr = @('[    ]','[=   ]','[==  ]','[=== ]','[====]','[ ===]','[  ==]','[   =]')
    $i = 0; $sw = [System.Diagnostics.Stopwatch]::StartNew(); $ready = $false
    while ($sw.Elapsed.TotalSeconds -lt 90 -and -not $ready) {
        $f = $fr[$i % $fr.Length]; $e = $sw.Elapsed.ToString('mm\:ss')
        Write-Host "`r  $f  Esperando Docker daemon...  [$e] (max 90s)  " -NoNewline -ForegroundColor Cyan
        $test2 = & docker ps 2>&1
        if ($LASTEXITCODE -eq 0) { $ready = $true } else { Start-Sleep -Seconds 2; $i++ }
    }
    Write-Host "`r$((' ') * 78)`r" -NoNewline
    if ($ready) { Ok "Docker daemon listo en $($sw.Elapsed.ToString('mm\:ss'))." }
    else { Warn "Docker daemon no respondio en 90s. Verifica Docker Desktop manualmente." }
}
function Setup-KhoraWeb {
    $wd = Join-Path $REPO_DIR 'khora-web'
    if (-not (Test-Path $wd))  { Warn "khora-web/ no existe en el repo."; return }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Warn "Node no disponible; omitiendo npm ci."; return }
    $out = Spin-Job "npm ci (khora-web)" -ArgList @($wd) -Tips @('leyendo package-lock.json...','descargando paquetes npm...','instalando Next.js...','instalando Playwright...','instalando dependencias dev...','instalando TypeScript...','resolviendo arbol de modulos...','casi listo...') -Block {
        param($webDir); & cmd /c "cd /d `"`"$webDir`"`" && npm ci 2>&1"
    }
    $out | ForEach-Object { L "INFO" "npm: $_" }
    Ok "khora-web: dependencias instaladas (npm ci)."
}
function Ensure-VercelCLI {
    if (Get-Command vercel -ErrorAction SilentlyContinue) { Ok "Vercel CLI disponible."; return }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Warn "npm no disponible; no se puede instalar Vercel CLI."; return }
    $out = Spin-Job "Instalando Vercel CLI" -Tips @('descargando vercel...','instalando dependencias CLI...','configurando binario...') -Block {
        & npm install -g vercel 2>&1
    }
    $out | ForEach-Object { L "INFO" "npm: $_" }
    if (Get-Command vercel -ErrorAction SilentlyContinue) { Ok "Vercel CLI instalado." }
    else { Warn "Vercel CLI no pudo instalarse." }
}
function Ensure-RenderCLI {
    if (Get-Command render -ErrorAction SilentlyContinue) { Ok "Render CLI disponible."; return }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Warn "npm no disponible; no se puede instalar Render CLI."; return }
    $out = Spin-Job "Instalando Render CLI" -Tips @('descargando @render-com/cli...','instalando dependencias...','configurando binario...') -Block {
        & npm install -g @render-com/cli 2>&1
    }
    $out | ForEach-Object { L "INFO" "npm: $_" }
    if (Get-Command render -ErrorAction SilentlyContinue) { Ok "Render CLI instalado." }
    else { Warn "Render CLI no pudo instalarse. Intenta: npm install -g @render-com/cli" }
}
