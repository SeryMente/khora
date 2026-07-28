# ================================================================
# KHORA v7 - MODULO 04-ui.ps1
# Componente: 04 ui
# ================================================================

function Test-Cmd { param([string]$name) [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Clear-PendingInput {
    try { while ([Console]::KeyAvailable) { [Console]::ReadKey($true) | Out-Null } } catch {}
}
function Get-Cim { param([string]$class)
    try { return Get-CimInstance -ClassName $class -ErrorAction Stop }
    catch { try { return Get-WmiObject -Class $class -ErrorAction Stop } catch { return $null } }
}
function Resolve-Exe {
    param([string]$exeName, [string[]]$knownPaths, [string]$appPathsKey)
    if ($appPathsKey) {
        foreach ($hive in @("HKCU:","HKLM:")) {
            try {
                $p = Get-ItemProperty "$hive\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$appPathsKey" -ErrorAction SilentlyContinue
                if ($p -and $p.'(default)' -and (Test-Path $p.'(default)')) { return $p.'(default)' }
            } catch {}
        }
    }
    $cmd = Get-Command $exeName -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -and (Test-Path $cmd.Source)) { return $cmd.Source }
    foreach ($k in $knownPaths) { if ($k -and (Test-Path $k)) { return $k } }
    return $null
}
function Write-InitHeader {
    $os      = Get-Cim Win32_OperatingSystem
    $cpu     = (Get-Cim Win32_Processor | Select-Object -First 1)
    $ramTot  = if ($os) { [math]::Round($os.TotalVisibleMemorySize/1MB,1) } else { "?" }
    $ramFree = if ($os) { [math]::Round($os.FreePhysicalMemory/1MB,1) }    else { "?" }
    $sysPS   = Split-Path $SYS_DRIVE -Qualifier
    $drv     = Get-PSDrive ($SYS_DRIVE.TrimEnd(":")) -ErrorAction SilentlyContinue
    $diskFree= if ($drv) { [math]::Round($drv.Free/1GB,1) } else { "?" }
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    $ep      = Get-ExecutionPolicy -Scope CurrentUser
    $gitV    = if (Test-Cmd git) { (git --version 2>&1 | Select-Object -First 1) } else { "NO INSTALADO" }
    $net     = try { $p=Test-Connection github.com -Count 1 -ErrorAction Stop; "OK ($($p.ResponseTime)ms)" } catch { "SIN INTERNET" }
    $code    = Resolve-Exe "code" (Get-CodePaths) "Code.exe"
    $vs      = if ($code) { "SI" } else { "no (se instalara)" }
    $header = @"
================================================================
 KHORA v$SCRIPT_VERSION  --  LOG DE SESION (agnostico)
================================================================
 Fecha:           $DATE_STR  $(Get-Date -Format 'HH:mm:ss')
 Usuario:         $env:USERNAME
 Equipo:          $env:COMPUTERNAME
 Dominio:         $env:USERDOMAIN
 OS:              $(if($os){$os.Caption+' build '+$os.BuildNumber}else{'?'})
 CPU:             $(if($cpu){$cpu.Name}else{'?'})
 RAM:             $ramTot GB total / $ramFree GB libre
 Disco $SYS_DRIVE       $diskFree GB libres
 Admin:           $isAdmin
 PowerShell:      $($PSVersionTable.PSVersion)
 Git:             $gitV
 VS Code:         $vs
 ExecutionPolicy: $ep
 Internet:        $net
 Proyecto:        $REPO_ORG/$REPO_NAME
 Version:         v$SCRIPT_VERSION
 Raiz proyecto:   $ROOT_DIR
 Workdir (tmp):   $WORK_DIR
 Logs:            $LOG_DIR
 Versiones:       $VER_DIR
 Log de hoy:      $LOG_FILE
----------------------------------------------------------------
 SCRIPT ARRANCADO. Esperando accion del usuario...
================================================================
"@
    Add-Content $LOG_FILE $header -Encoding UTF8 -ErrorAction SilentlyContinue
}
function Open-LogWindow {
    $inner = @"
`$lf = '$LOG_FILE'
New-Item -ItemType File -Force `$lf | Out-Null
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
`$Host.UI.RawUI.WindowTitle = 'KHORA LOG'
`$Host.UI.RawUI.BackgroundColor = 'Black'
Clear-Host
Write-Host ''
Write-Host '  =============================================================' -ForegroundColor DarkCyan
Write-Host '   KHORA -- LOG EN VIVO (desde arranque, incluye diagnostico)' -ForegroundColor DarkCyan
Write-Host "   `$lf" -ForegroundColor DarkGray
Write-Host '  =============================================================' -ForegroundColor DarkCyan
Write-Host ''
if ([string]::IsNullOrWhiteSpace(`$lf) -or -not (Test-Path `$lf)) {
    Write-Host '  [FAIL] Ruta de log vacia o inexistente. Corre el script desde su archivo .ps1.' -ForegroundColor Red
    Read-Host 'ENTER para cerrar'; exit 1
}
while (`$true) {
  try {
    Get-Content -Path `$lf -Wait -Encoding UTF8 | ForEach-Object {
        `$c = switch -Regex (`$_) {
            '\[ OK' {'Green'} '\[FAIL' {'Red'} '\[WARN' {'Yellow'}
            '\[STEP' {'Magenta'} '\[INFO' {'Cyan'}
            '^=|^-{3}|^ [A-Z]' {'DarkCyan'} default {'Gray'}
        }
        Write-Host "  `$_" -ForegroundColor `$c
    }
  } catch { Start-Sleep -Milliseconds 800 }
}
"@
    $tmp = Join-Path $WORK_DIR "logwin.ps1"
    Set-Content $tmp $inner -Encoding UTF8
    try {
        $proc = Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File","`"$tmp`"" -PassThru
    } catch {
        $enc  = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($inner))
        $proc = Start-Process powershell -ArgumentList "-NoProfile","-NoExit","-EncodedCommand",$enc -PassThru
    }
    $script:LOG_WIN_PID = $proc.Id
}
function Invoke-Preflight {
    Step "PREFLIGHT - diagnostico de compatibilidad"
    $psOK = $PSVersionTable.PSVersion.Major -ge 5
    if ($psOK) { Ok "PowerShell $($PSVersionTable.PSVersion)" } else { Warn "PowerShell viejo: $($PSVersionTable.PSVersion)" }
    $net = $false
    foreach ($t in @("github.com","8.8.8.8","1.1.1.1")) {
        try { $p=Test-Connection $t -Count 1 -ErrorAction Stop; Ok "Internet -> $t ($($p.ResponseTime)ms)"; $net=$true; break } catch {}
    }
    if (-not $net) { Fail "Sin internet." }
    if (Test-Cmd git) { Ok "Git: $(git --version 2>&1 | Select-Object -First 1)" } else { Warn "Git ausente -> se instalara al iniciar." }
    if (Test-Cmd winget) { Ok "winget disponible." } else { Warn "winget ausente -> usare instaladores oficiales." }
    Confirm-GhCliAuth -CheckOnly | Out-Null
    try { $test = Join-Path $WORK_DIR ".wtest"; Set-Content $test "x"; Remove-Item $test -Force; Ok "Escritura en workdir OK ($WORK_DIR)" } catch { Fail "No se puede escribir en workdir." }
    if (Resolve-Exe "chrome" (Get-ChromePaths) "chrome.exe") { Ok "Chrome detectado." } else { Warn "Chrome no detectado -> usare navegador por defecto." }
    if (Resolve-Exe "code" (Get-CodePaths) "Code.exe") { Ok "VS Code detectado." } else { Warn "VS Code ausente -> se instalara al iniciar." }
    $ep = Get-ExecutionPolicy -Scope CurrentUser
    if ($ep -in @("Restricted","AllSigned")) { Warn "ExecutionPolicy $ep -> el lanzador usa -Bypass en proceso." } else { Ok "ExecutionPolicy: $ep" }
    return $net
}
function Spin-Job {
    param(
        [string]$Label,
        [scriptblock]$Block,
        [object[]]$ArgList = @(),
        [string[]]$Tips = @('procesando...','un momento...','casi listo...','trabajando...')
    )
    $job = Start-Job -ScriptBlock $Block -ArgumentList $ArgList
    $fr  = @('[    ]','[=   ]','[==  ]','[=== ]','[====]','[ ===]','[  ==]','[   =]')
    $i = 0; $ti = 0
    $sw  = [System.Diagnostics.Stopwatch]::StartNew()
    while ($job.State -eq 'Running') {
        $f = $fr[$i % $fr.Length]
        $e = $sw.Elapsed.ToString('mm\:ss')
        $t = $Tips[$ti % $Tips.Count]
        $mL = Mask-Token -Text $Label
        $t = Mask-Token -Text $t
        Write-Host "`r  $f  $mL  [$e]  $t   " -NoNewline -ForegroundColor Cyan
        Start-Sleep -Milliseconds 180
        $i++
        if ($i % 22 -eq 0) { $ti++ }
    }
    Write-Host "`r$((' ') * 78)`r" -NoNewline
    $out = Receive-Job $job 2>&1
    Remove-Job $job -Force
    $sw.Stop()
    $mL = Mask-Token -Text $Label
    L "INFO" "$mL completado en $($sw.Elapsed.ToString('mm\:ss'))"
    return $out
}
function Focus-Window {
    try {
        if (-not ([System.Management.Automation.PSTypeName]'WinFocus').Type) {
            Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WinFocus {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
}
'@ -ErrorAction SilentlyContinue
        }
        [WinFocus]::SetForegroundWindow([WinFocus]::GetConsoleWindow()) | Out-Null
    } catch {}
}
function Show-DiagBundle {
    Write-Host ""
    Write-Host "====" -ForegroundColor DarkGray
    $diag_gh = if (Test-Cmd gh) {
        gh auth status 2>$null
        if ($LASTEXITCODE -eq 0) { "PASS" } else { "FAIL" }
    } else { "WARN" }
    Write-Host "gh_auth=$diag_gh" -ForegroundColor $(if($diag_gh -eq 'PASS'){'Green'}elseif($diag_gh -eq 'WARN'){'Yellow'}else{'Red'})

    $diag_repo = if (Test-Path "$REPO_DIR\.git") { "PASS" } else { "FAIL" }
    Write-Host "repo=$diag_repo" -ForegroundColor $(if($diag_repo -eq 'PASS'){'Green'}else{'Red'})

    $diag_branch = if (Test-Path "$REPO_DIR\.git") {
        $cb = (git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>&1).Trim()
        if ($cb -eq "main" -or $cb.StartsWith("wip/")) { "PASS ($cb)" } else { "WARN ($cb)" }
    } else { "FAIL" }
    Write-Host "branch=$diag_branch" -ForegroundColor $(if($diag_branch -match 'PASS'){'Green'}elseif($diag_branch -match 'WARN'){'Yellow'}else{'Red'})

    $diag_dirty = if (Test-Path "$REPO_DIR\.git") {
        $dirty = (git -C $REPO_DIR status --porcelain 2>&1 | Measure-Object).Count
        if ($dirty -eq 0) { "PASS" } else { "WARN ($dirty)" }
    } else { "FAIL" }
    Write-Host "dirty_files=$diag_dirty" -ForegroundColor $(if($diag_dirty -eq 'PASS'){'Green'}elseif($diag_dirty -match 'WARN'){'Yellow'}else{'Red'})

    $diag_unpushed = if (Test-Path "$REPO_DIR\.git") {
        $up = (git -C $REPO_DIR log --oneline --branches --not --remotes 2>$null | Measure-Object).Count
        if ($up -eq 0) { "PASS" } else { "WARN ($up)" }
    } else { "FAIL" }
    Write-Host "unpushed_commits=$diag_unpushed" -ForegroundColor $(if($diag_unpushed -eq 'PASS'){'Green'}elseif($diag_unpushed -match 'WARN'){'Yellow'}else{'Red'})

    $diag_efs = if ($script:EFS_ACTIVE) { "PASS" } else { "WARN" }
    Write-Host "efs=$diag_efs" -ForegroundColor $(if($diag_efs -eq 'PASS'){'Green'}else{'Yellow'})

    $diag_guardian = if ($script:GUARD_PID -and (Get-Process -Id $script:GUARD_PID -ErrorAction SilentlyContinue)) { "PASS" } else { "WARN" }
    Write-Host "guardian=$diag_guardian" -ForegroundColor $(if($diag_guardian -eq 'PASS'){'Green'}else{'Yellow'})
    Write-Host "====" -ForegroundColor DarkGray
    Write-Host ""
}
function Show-Estado {
    Write-Host ""; Write-Host "  ---- ESTADO ----" -ForegroundColor Cyan
    $os=Get-Cim Win32_OperatingSystem; $drv=Get-PSDrive ($SYS_DRIVE.TrimEnd(":")) -ErrorAction SilentlyContinue
    Info "RAM libre: $(if($os){[math]::Round($os.FreePhysicalMemory/1MB,1)}else{'?'})GB | Disco: $(if($drv){[math]::Round($drv.Free/1GB,1)}else{'?'})GB"
    try { Test-Connection github.com -Count 1 -ErrorAction Stop | Out-Null; Ok "Internet OK" } catch { Warn "Sin internet" }
    if (Test-Path "$REPO_DIR\.git") {
        $cb = (git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>&1).Trim()
        Ok "Repo: $cb | pendientes: $((git -C $REPO_DIR status --porcelain 2>&1 | Measure-Object).Count)"
        if ($cb -ne "main" -and -not $cb.StartsWith("wip/")) {
            Info "Rama actual: $cb (si viene de 'gh pr checkout', el sufijo numérico es el ID de sesión de Jules; ES la rama correcta del PR aunque el nombre no coincida con lo esperado)."
        }
        $unpushedCount = (git -C $REPO_DIR log --oneline --branches --not --remotes 2>$null | Measure-Object).Count
        if ($unpushedCount -gt 0) { Warn "Commits locales sin push: $unpushedCount (usa [W] para pushear)" }
    } else { Warn "Sin repo." }
    if (git config --global user.name 2>$null) { Warn "Git user.name activo." } else { Ok "Git user.name limpio." }
    if ($script:TokSecure) { Warn "Token en memoria (sesion activa)." } else { Ok "Sin token en memoria." }
    if ($script:GUARD_PID -and (Get-Process -Id $script:GUARD_PID -ErrorAction SilentlyContinue)) { Ok "Guardian activo (PID $script:GUARD_PID)." } else { Info "Guardian inactivo." }
    Write-Host ""
}
function Show-Banner {
Write-Host ""
    Clear-Host
    $r = if (Test-Path "$REPO_DIR\.git") { "[REPO OK]" } else { "[sin repo]" }
    $c = if (Get-Process "Code" -ErrorAction SilentlyContinue) { "[Code ON]" } else { "[Code OFF]" }
    $g = if ($script:GUARD_PID -and (Get-Process -Id $script:GUARD_PID -ErrorAction SilentlyContinue)) { "[Guard ON]" } else { "[Guard OFF]" }
    $ratAlert = $null; $__rf = Join-Path $FLAG_DIR "rat_alert.txt"; if (Test-Path $__rf) { try { $ratAlert = (Get-Content $__rf -Raw -ErrorAction SilentlyContinue).Trim() } catch {} }

    $cleanupAlert = $null
    $stateFile = Join-Path $WORK_DIR "session-state\last-cleanup.json"
    if (Test-Path $stateFile) {
        try {
            $lastState = Get-Content $stateFile -Raw | ConvertFrom-Json
            if ($lastState.result -ne "TODO OK") {
                $pList = ($lastState.pendings) -join ", "
                $cleanupAlert = "Última sesión (cerrada por: $($lastState.reason), el $($lastState.timestamp)): limpieza [$($lastState.result): $pList]"
            } else {
                $cleanupAlert = "Última sesión (cerrada por: $($lastState.reason), el $($lastState.timestamp)): limpieza [OK]"
            }
        } catch {}
    }

    Write-Host ""
    Write-Host "  =============================================================" -ForegroundColor Cyan
    Write-Host "   KHORA  v$SCRIPT_VERSION (agnostico)  --  $DATE_STR $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "   $env:USERNAME @ $env:COMPUTERNAME  |  $r $c $g" -ForegroundColor DarkGray
    if ($ratAlert) { Write-Host "   [!!] ALERTA RAT/EXFIL: $ratAlert" -ForegroundColor Red; Write-Host "        Revisa con [T]; si es real, cierra con [2]." -ForegroundColor Yellow }
    Write-Host "  =============================================================" -ForegroundColor Cyan
    if ($cleanupAlert) {
        $color = if ($cleanupAlert -match "\[OK\]") { "Green" } else { "Yellow" }
        Write-Host "   * $cleanupAlert" -ForegroundColor $color
        Write-Host "  =============================================================" -ForegroundColor Cyan
    }
    Write-Host ""
    if (-not $script:SES_ACTIVE) {
        Write-Host "   [1] INICIAR SESION  <- empieza aqui" -ForegroundColor Green
    } else {
        Write-Host "   >> Sesion ACTIVA: todo corre automaticamente <<" -ForegroundColor Green
    }
    Write-Host "   [2] Cerrar + limpieza NUCLEAR   [3] Estado" -ForegroundColor White
    Write-Host "   [K] khora-ok (tests locales)    [V] Deploy Vercel" -ForegroundColor White
    Write-Host "   [R] Render ops                  [T] Monitor RAT/exfil" -ForegroundColor White
    Write-Host "   [W] Push WIP pendiente          [D] Diag bundle                 [Q] Salir" -ForegroundColor DarkGray
    Write-Host "   Avanzado: [4]log [5]hist [6]logwin [7]keylog [8]preflight [9]servers [C]chrome" -ForegroundColor DarkGray
    Write-Host ""
    if ($script:SES_ACTIVE -and $CFG.enableAutoWip) { Write-Host "   (auto-WIP cada $($CFG.autoWipMinutes)min activo)" -ForegroundColor DarkGray }
    Write-Host "   Escuchando... presiona una tecla: " -NoNewline -ForegroundColor White
}
