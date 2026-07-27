# ================================================================
# KHORA v7 - MODULO 10-guardian.ps1
# Componente: 10 guardian
# ================================================================

function Start-Guardian {
    if (-not $CFG.enableGuardian) { Info "Guardian deshabilitado en config."; return }
if (-not (Test-Path $SCRIPT_PATH)) { Fail "Guardian NO lanzado: no existe [$SCRIPT_PATH]. Guarda el script como archivo y reinicia."; Write-Host ""; Write-Host "SESIÓN DETENIDA: Falta archivo script."; return }
    $guardArgs = @("-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File","`"$SCRIPT_PATH`"","-GuardianOnly")
    try {
        $proc = Start-Process powershell -ArgumentList $guardArgs -PassThru -WindowStyle Hidden
        $script:GUARD_PID = $proc.Id
        Set-Content (Join-Path $FLAG_DIR "guardian.pid") $proc.Id -Encoding UTF8
        Ok "Guardian activo (PID $($proc.Id)) - inactividad $($CFG.inactivityMinutes)min + panico Ctrl+Alt+K"
    } catch { Warn "No se pudo lanzar el Guardian: $_" }
}
function Register-Deadline {
    if (-not (Test-Cmd Register-ScheduledTask)) { Warn "ScheduledTask no disponible; deadline cubierto solo por Guardian."; return }
if (-not (Test-Path $SCRIPT_PATH)) { Fail "Deadline NO registrado: no existe [$SCRIPT_PATH]. Guarda el script como archivo y reinicia."; Write-Host ""; Write-Host "SESIÓN DETENIDA: Falta archivo script para deadline."; return }
    try {
        $now = Get-Date
        $dl  = Get-Date -Hour $CFG.deadlineHour -Minute 0 -Second 0
        if ($dl -le $now) { $dl = $dl.AddDays(1) }
        $act = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$SCRIPT_PATH`" -CleanupOnly -Reason deadline"
        $trg = New-ScheduledTaskTrigger -Once -At $dl
        Register-ScheduledTask -TaskName $script:TASK_NAME -Action $act -Trigger $trg -Force -ErrorAction Stop | Out-Null
        Ok "Deadline registrado: limpieza automatica a las $($dl.ToString('HH:mm')) ($($dl.ToString('yyyy-MM-dd')))"
    } catch { Warn "No se pudo registrar deadline: $_" }
}
function Unregister-Deadline {
    try { Unregister-ScheduledTask -TaskName $script:TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue; Ok "Deadline desregistrado." } catch {}
}
function Scan-Keyloggers {
    Step "Escaneo de keyloggers (heuristico)"
    Warn "No reemplaza un antivirus."
    $susp=0
    $known = @("spyrix","ardamax","revealer","refog","keylogger","keystroke","webwatcher","spytech","spyagent","flexispy","mspy","hoverwatch","kidlogger","logixoft","remotespy","aobo","ikeymonitor","sniperspy","starlogger","spousespy")
    Info "Procesos activos..."
    $procs = Get-Process -ErrorAction SilentlyContinue
    foreach ($kl in $known) { $m = $procs | Where-Object { $_.ProcessName -like "*$kl*" }; if ($m) { Fail "SOSPECHOSO: $($m.ProcessName) (PID $($m.Id))"; $susp++ } }
    Info "Entradas de inicio (registro)..."
    foreach ($reg in @("HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run","HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run","HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce")) {
        try {
            $e = Get-ItemProperty $reg -ErrorAction SilentlyContinue
            if ($e) { $e.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
                if ($_.Value -match "keylog|spy|monitor|hook|capture|stealth|hidden") { Fail "STARTUP SOSPECHOSO: $($_.Name)=$($_.Value)"; $susp++ } else { Info "Startup OK: $($_.Name)" }
            } }
        } catch {}
    }
    Info "Filtros de teclado (UpperFilters del driver HID)..."
    try {
        $kbf = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E96B-E325-11CE-BFC1-08002BE10318}" -Name UpperFilters -ErrorAction SilentlyContinue
        if ($kbf -and $kbf.UpperFilters) {
            $f = $kbf.UpperFilters -join ", "
            if ($f -match "kbdclass|kbdhid") { Ok "Filtros normales detectados: $f" }
            else { Warn "Filtros adicionales (revisar): $f"; $susp++ }
        } else { Ok "Sin filtros UpperFilters extra en driver teclado." }
    } catch { L "WARN" "No se pudo leer UpperFilters del registro: $_" }
    Write-Host ""
    if ($susp -eq 0) { Ok "RESULTADO: Sin keyloggers conocidos detectados ($susp sospechosos)." }
    else { Fail "RESULTADO: $susp sospechoso(s) encontrado(s). No ingreses datos sensibles en esta sesion." }
    L "INFO" "Escaneo keyloggers completado: $susp sospechosos"
}
function Get-KnownRemoteTools {
    @("anydesk","teamviewer","tv_w32","tv_x64","rustdesk","winvnc","tvnserver","ultravnc","tightvnc","vncserver","vncviewer","logmein","lmiguardiansvc","gotomypc","g2mcomm","ammyy","aa_v3","supremo","splashtop","srserver","screenconnect","connectwisecontrol","dwservice","dwagent","remoteutilities","rutserv","radmin","dameware","netsupport","client32","bomgar","beyondtrust","meshagent","atera","ateraagent","syncro","kaseya","agentmon","quasar","njrat","remcos","asyncrat","venomrat","nanocore")
}
function Get-ExternalConns {
    $conns = @()
    try {
        $conns = Get-NetTCPConnection -State Established -ErrorAction Stop | Where-Object {
            $_.RemoteAddress -and
            $_.RemoteAddress -notmatch '^(127\.|::1$|0\.0\.0\.0|::$)' -and
            $_.RemoteAddress -notmatch '^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -and
            $_.RemoteAddress -notmatch '^(fe80|fc|fd)'
        }
    } catch { $conns = @() }
    return $conns
}
function Get-NetSentBytes {
    try { return [int64]((Get-NetAdapterStatistics -ErrorAction Stop | Where-Object { $_.SentBytes -gt 0 } | Measure-Object -Property SentBytes -Sum).Sum) } catch {}
    return $null
}
function Scan-RemoteAccess {
    Step "Monitor de acceso remoto / exfiltracion (RAT)"
    Warn "Heuristico: no reemplaza un EDR/antivirus."
    $flags = 0
    $known = Get-KnownRemoteTools
    Info "Buscando software de control remoto en ejecucion..."
    $procs = Get-Process -ErrorAction SilentlyContinue
    $hitProcs = @()
    foreach ($rt in $known) { $procs | Where-Object { $_.ProcessName -like "*$rt*" } | ForEach-Object { $hitProcs += $_ } }
    if ($hitProcs.Count -gt 0) {
        foreach ($hp in ($hitProcs | Sort-Object Id -Unique)) { Fail "CONTROL REMOTO ACTIVO: $($hp.ProcessName) (PID $($hp.Id))"; $flags++ }
        Warn "Hay software de control remoto CORRIENDO: alguien podria ver tu pantalla y copiar archivos."
    } else { Ok "Sin software de control remoto conocido en ejecucion." }
    Info "Sesiones de escritorio remoto (RDP) entrantes..."
    try {
        $q = (query session 2>$null) -join "`n"
        if ($q -match 'rdp-tcp\S*\s+\S+\s+Active') { Fail "SESION RDP ENTRANTE ACTIVA: alguien esta conectado por escritorio remoto."; $flags++ }
        else { Ok "Sin sesiones RDP entrantes activas." }
    } catch { Info "No se pudo consultar sesiones (query.exe no disponible)." }
    Info "Conexiones externas de procesos de control remoto..."
    $ext = Get-ExternalConns
    $extRat = 0
    foreach ($c in $ext) {
        $pn = ""; try { $pn = (Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue).ProcessName } catch {}
        if ($pn -and ($known | Where-Object { $pn -like "*$_*" })) { Fail "CONEXION EXTERNA RAT: $pn -> $($c.RemoteAddress):$($c.RemotePort)"; $extRat++; $flags++ }
    }
    if ($extRat -eq 0) { Ok "Sin conexiones externas atribuibles a control remoto." }
    Info "Conexiones externas establecidas en total: $($ext.Count)"
    $b = Get-NetSentBytes
    if ($null -ne $b) { $script:__netBaseline = $b; $script:__netBaseTime = Get-Date; Ok "Linea base de red registrada ($([math]::Round($b/1MB,1)) MB enviados acumulados)." }
    else { Info "Estadisticas de red no disponibles; monitor por volumen desactivado." }
    Write-Host ""
    $flag = Join-Path $FLAG_DIR "rat_alert.txt"
    if ($flags -eq 0) { Ok "RESULTADO: sin indicios de acceso remoto activo ($flags alertas)."; Remove-Item $flag -Force -ErrorAction SilentlyContinue }
    else { Fail "RESULTADO: $flags alerta(s). Considera NO trabajar aqui; si ya iniciaste, cierra con [2]."; Set-Content $flag "$(Get-Date -Format 'HH:mm:ss') scan manual: $flags alertas" -Encoding UTF8 -ErrorAction SilentlyContinue }
    L "INFO" "Scan-RemoteAccess: $flags alertas, $($ext.Count) conexiones externas"
    return $flags
}
function Invoke-ExfilWatch {
    # Corre dentro del guardian (proceso aparte, ventana oculta). Loguea via L
    # (visible en la ventana de log) y levanta un flag que el menu muestra en rojo.
    if (-not $CFG.watchRemoteAccess) { return }
    $known = Get-KnownRemoteTools
    $alerts = @()
    $ext = Get-ExternalConns
    foreach ($c in $ext) {
        $pn = ""; try { $pn = (Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue).ProcessName } catch {}
        if ($pn -and ($known | Where-Object { $pn -like "*$_*" })) { $alerts += "RAT $pn -> $($c.RemoteAddress):$($c.RemotePort)" }
    }
    $procs = Get-Process -ErrorAction SilentlyContinue
    foreach ($rt in $known) { $procs | Where-Object { $_.ProcessName -like "*$rt*" } | ForEach-Object { $alerts += "proc control remoto: $($_.ProcessName)" } }
    $b = Get-NetSentBytes
    if (($null -ne $b) -and ($null -ne $script:__netBaseline) -and $script:__netBaseTime) {
        $mins = ((Get-Date) - $script:__netBaseTime).TotalMinutes
        if ($mins -ge 0.4) {
            $mb = ($b - $script:__netBaseline) / 1MB
            $rate = if ($mins -gt 0) { $mb / $mins } else { 0 }
            if ($rate -ge [double]$CFG.exfilAlertMBPerMin) { $alerts += "subida sostenida $([math]::Round($rate,1)) MB/min (posible exfiltracion)" }
            $script:__netBaseline = $b; $script:__netBaseTime = Get-Date
        }
    }
    if ($alerts.Count -gt 0) {
        $msg = $alerts -join " | "
        L "FAIL" "ALERTA EXFILTRACION/RAT: $msg"
        $flag = Join-Path $FLAG_DIR "rat_alert.txt"
        Set-Content $flag "$(Get-Date -Format 'HH:mm:ss') $msg" -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($CFG.nukeOnExfil -and ($msg -match 'exfiltracion')) {
            L "FAIL" "Exfiltracion sostenida + nukeOnExfil=ON: disparando limpieza defensiva."
            Trigger-Cleanup "exfiltracion"
        }
    }
}
function Start-GuardianLoop {
    $sig = @"
using System;
using System.Runtime.InteropServices;
public class KhoraN {
    [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
    [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
    public static uint IdleSeconds() {
        LASTINPUTINFO l = new LASTINPUTINFO(); l.cbSize=(uint)Marshal.SizeOf(l);
        GetLastInputInfo(ref l);
        return ((uint)Environment.TickCount - l.dwTime) / 1000;
    }
    public static bool Key(int v){ return (GetAsyncKeyState(v) & 0x8000) != 0; }
}
"@
    try { Add-Type -TypeDefinition $sig -ErrorAction Stop } catch { L "WARN" "Guardian: no se pudo cargar API nativa: $_"; return }
    $inactSec = [int]$CFG.inactivityMinutes * 60
    L "INFO" "Guardian iniciado: inactividad ${inactSec}s, panico Ctrl+Alt+K."
    $script:__lastRatCheck = Get-Date
    $script:__netBaseline  = Get-NetSentBytes
    $script:__netBaseTime  = Get-Date
    L "INFO" "Monitor de exfiltracion/RAT activo (cada 30s, umbral $($CFG.exfilAlertMBPerMin) MB/min)."
    while ($true) {
        try {
            $idle = [KhoraN]::IdleSeconds()
            if ($idle -ge $inactSec) { Trigger-Cleanup "inactividad"; break }
            # Ctrl(0x11)+Alt(0x12)+K(0x4B)
            if ([KhoraN]::Key(0x11) -and [KhoraN]::Key(0x12) -and [KhoraN]::Key(0x4B)) { Trigger-Cleanup "panico"; break }
        } catch { L "WARN" "Guardian error: $_" }
        try {
            if (((Get-Date) - $script:__lastRatCheck).TotalSeconds -ge 30) { $script:__lastRatCheck = Get-Date; Invoke-ExfilWatch }
        } catch { L "WARN" "Guardian exfil-watch error: $_" }
        Start-Sleep -Seconds 2
    }
}
