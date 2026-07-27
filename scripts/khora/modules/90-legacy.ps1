# ================================================================
#  KHORA - Script de sesion agnostico
#  VERSIONADO: $SCRIPT_VERSION es la unica fuente de verdad;
#    el archivo se nombra khora-v<version>.ps1 y cada version
# REGLA PERMANENTE (v7): El único punto de entrada es khora.ps1 (gate). PROHIBIDO crear scripts de entrada paralelos o copias khora-v*.ps1. Un componente = un archivo en modules/; el orden de carga lo define khora.barrel.ps1. Toda modificación sube $SCRIPT_VERSION en el mismo commit.
#    ejecutada se auto-archiva en .\versions\
#  ESTRUCTURA (raiz = carpeta del script, p.ej. persistente en Escritorio):
#    .\logs\ (logging diario) | .\versions\ (historico) | config.json
#  - Portable: cero rutas/usuarios/PC hardcodeados
#  - Seguridad: token en SecureString, sin token en disco
#  - Guardian: dead-man switch por inactividad + deadline + panico
#  - Auto-WIP: respaldo continuo del trabajo al remoto
#  - Limpieza NUCLEAR verificada + auto-diagnostico
#  - Cifrado en reposo (EFS): repo y secrets ilegibles en el disco publico (v6.4.2)
#  - Monitor de exfiltracion/RAT: guardian vigila control remoto y subida de red (v6.4.3)
#  - Elevacion con cuenta distinta: rutas siempre en el perfil del usuario real (v6.4.4)
#  - Endurecimiento: finales de linea unificados a CRLF; mutex de limpieza
#    a prueba de abandono; variable $args renombrada en Start-Guardian (v6.4.8)
#  - EFS fail-fast (sonda 1 archivo); ventana de log con auto-reconexion (v6.4.9)
#  - Autenticacion gh CLI; higiene auto-wip logs; push WIP menu; diag bundle (v6.5.0)
#  - Snapshot tabs de Chrome por CDP (auto-wip/restore); deteccion LastPass (v6.6.0)
#  - Verificacion estricta en limpieza; last-cleanup.json; cipher verificable (v6.6.1)
#  - Boveda centralizada de entorno con sincronizacion automatica Vercel/Render (v6.8.0)
#  - v7.0.0: arquitectura gate+barril+modulos; monolito preservado como 90-legacy.ps1 (F0)
# ================================================================
# --- Encoding agnostico (acentos/codepage) ---
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$HOST_WIDTH = try { [Math]::Max(60, $Host.UI.RawUI.WindowSize.Width - 2) } catch { 78 }
# ================================================================
#  RUTAS AGNOSTICAS  (nada fijo a una PC)
# ================================================================
$SCRIPT_VERSION = "7.0.0"   # <- UNICA fuente de verdad de la version
$SYS_DRIVE   = if ($env:SystemDrive) { $env:SystemDrive } else { "C:" }
# ================================================================
#  DETECCION DE USUARIO REAL (elevacion con cuenta distinta) v6.4.6
#  Cuando PS se eleva con una cuenta admin DISTINTA a la del usuario
#  logueado, $env:USERNAME y $env:LOCALAPPDATA apuntan al perfil del
#  ADMIN. v6.4.4 detectaba SOLO via WMI y se observo que puede fallar
#  SILENCIOSAMENTE (UserName vacio) dejando todo en el perfil del admin.
#  v6.4.6: Resolve-RealUserPaths prueba MULTIPLES metodos en orden de
#  confiabilidad; el primero con candidato valido gana. Cada intento
#  queda en $script:REAL_USER_DETECT_LOG (el log formal aun no existe
#  en este punto; Start-Sesion vuelca la bitacora).
#    1) WMI Win32_ComputerSystem.UserName (con fallback Get-WmiObject)
#    2) query session / qwinsta -> usuario de la sesion 'console'
#    3) explorer.exe -> GetOwner() via WMI Win32_Process
#    4) cadena de procesos padre -> GetOwner() de cada ancestro
#    5) Registro HKLM LogonUI -> LastLoggedOnUser (ultimo login visto)
#    F) Fallback: contexto actual + aviso de indeterminacion
#  Limite: si el usuario real no ha iniciado sesion interactiva (perfil
#  inexistente en disco) se usa el contexto elevado y se avisa.
# ================================================================
$script:REAL_USER_OVERRIDE    = $false   # $true si se redirecciono al usuario real
$script:REAL_USER_NAME        = $null    # nombre del usuario real detectado
$script:REAL_USER_ELEVATED_AS = $null    # cuenta admin usada para elevar
$script:REAL_USER_METHOD      = $null    # metodo que detecto al usuario real
$script:REAL_USER_SAME        = $false   # $true si usuario real == usuario del proceso
$script:REAL_USER_NO_PROFILE  = $null    # usuario real detectado pero sin perfil en disco
$script:REAL_USER_DETECT_LOG  = @()      # bitacora de deteccion (se vuelca al log en Start-Sesion)

function Test-KhoraRealUserName {
    # Filtra candidatos que NO son un usuario interactivo plausible.
    param([string]$Name)
    if (-not $Name) { return $false }
    $__n = $Name.Trim()
    if (-not $__n) { return $false }
    if ($__n -match '^(?i)(SYSTEM|LOCAL SERVICE|NETWORK SERVICE|SERVICIO LOCAL|SERVICIO DE RED|ANONYMOUS LOGON)$') { return $false }
    if ($__n -match '^(?i)(DWM-|UMFD-|defaultuser)') { return $false }
    if ($__n.EndsWith('$')) { return $false }   # cuenta de maquina
    return $true
}

function Resolve-RealUserPaths {
    # Detecta al usuario REAL de la sesion interactiva probando multiples
    # metodos en orden de confiabilidad; el primer candidato valido gana.
    # - real == proceso : loguea "mismo usuario, sin redireccion necesaria".
    # - real != proceso : redirige env vars de perfil (si el perfil existe).
    # - indeterminado   : contexto actual + aviso (fallback).
    $__procUser  = $env:USERNAME
    $__candidate = $null
    $__method    = $null

    # ---- Metodo 1: WMI Win32_ComputerSystem.UserName (puede venir vacio) ----
    try {
        $__u = (Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).UserName
        if (-not $__u) { try { $__u = (Get-WmiObject Win32_ComputerSystem -ErrorAction Stop).UserName } catch {} }
        if ($__u) {
            $__short = ($__u -split '\\')[-1].Trim()
            if (Test-KhoraRealUserName $__short) {
                $__candidate = $__short; $__method = "M1: WMI Win32_ComputerSystem.UserName"
                $script:REAL_USER_DETECT_LOG += "[M1 WMI ComputerSystem] EXITO -> '$__u' (corto: '$__short')"
            } else {
                $script:REAL_USER_DETECT_LOG += "[M1 WMI ComputerSystem] devolvio '$__u': no es usuario interactivo valido"
            }
        } else {
            $script:REAL_USER_DETECT_LOG += "[M1 WMI ComputerSystem] UserName VACIO (fallo silencioso: sin usuario en consola o WMI degradado)"
        }
    } catch { $script:REAL_USER_DETECT_LOG += "[M1 WMI ComputerSystem] ERROR: $($_.Exception.Message)" }

    # ---- Metodo 2: query session / qwinsta -> sesion 'console' ----
    # El estado varia con el idioma (Active/Activo), por eso se ancla en el
    # nombre de sesion 'console' + presencia de usuario (columna USERNAME).
    # Limite conocido: usuarios con espacios en el nombre no matchean (\S+).
    if (-not $__candidate) {
        try {
            $__q = $null
            try { $__q = & query session 2>$null } catch { $__q = $null }
            if (-not $__q) { try { $__q = & qwinsta 2>$null } catch { $__q = $null } }
            if ($__q) {
                $__hit = $null
                foreach ($__ln in @($__q)) {
                    $__t = ("$__ln" -replace '^[>\s]+','')
                    if ($__t -match '^(?i)console\s+(\S+)\s+(\d+)') { $__hit = $Matches[1]; break }
                }
                if (Test-KhoraRealUserName $__hit) {
                    $__candidate = $__hit.Trim(); $__method = "M2: query session (sesion console)"
                    $script:REAL_USER_DETECT_LOG += "[M2 query session] EXITO -> '$__candidate' en sesion console"
                } else {
                    $script:REAL_USER_DETECT_LOG += "[M2 query session] salida presente pero sin usuario en sesion console"
                }
            } else {
                $script:REAL_USER_DETECT_LOG += "[M2 query session] sin salida (query/qwinsta no disponibles)"
            }
        } catch { $script:REAL_USER_DETECT_LOG += "[M2 query session] ERROR: $($_.Exception.Message)" }
    }

    # ---- Metodo 3: explorer.exe -> GetOwner() via WMI Win32_Process ----
    # Elevar con otra cuenta NO cambia de sesion de Windows: se prefiere el
    # explorer de NUESTRA misma sesion (su dueno es el usuario real del escritorio).
    if (-not $__candidate) {
        try {
            $__mySes  = ([System.Diagnostics.Process]::GetCurrentProcess()).SessionId
            $__owners = @()
            $__exps   = @(Get-CimInstance Win32_Process -Filter "Name='explorer.exe'" -ErrorAction Stop)
            foreach ($__p in $__exps) {
                try {
                    $__o = Invoke-CimMethod -InputObject $__p -MethodName GetOwner -ErrorAction Stop
                    if ($__o -and $__o.User) {
                        $__sid = $null; try { $__sid = (Get-Process -Id $__p.ProcessId -ErrorAction Stop).SessionId } catch {}
                        $__owners += [pscustomobject]@{ User = $__o.User; SessionId = $__sid }
                    }
                } catch {}
            }
            $__pick = $__owners | Where-Object { $_.SessionId -eq $__mySes } | Select-Object -First 1
            if (-not $__pick) { $__pick = $__owners | Select-Object -First 1 }
            if ($__pick -and (Test-KhoraRealUserName $__pick.User)) {
                $__candidate = $__pick.User.Trim(); $__method = "M3: explorer.exe GetOwner (Win32_Process)"
                $script:REAL_USER_DETECT_LOG += "[M3 explorer GetOwner] EXITO -> '$__candidate' (sesion explorer: $($__pick.SessionId) | sesion proceso: $__mySes | explorers: $(@($__owners).Count))"
            } elseif (@($__exps).Count -eq 0) {
                $script:REAL_USER_DETECT_LOG += "[M3 explorer GetOwner] no hay explorer.exe corriendo"
            } else {
                $script:REAL_USER_DETECT_LOG += "[M3 explorer GetOwner] sin owner valido ($(@($__exps).Count) explorer encontrados)"
            }
        } catch { $script:REAL_USER_DETECT_LOG += "[M3 explorer GetOwner] ERROR: $($_.Exception.Message)" }
    }

    # ---- Metodo 4: cadena de procesos padre -> GetOwner() de cada ancestro ----
    # Leer las env vars reales de otro proceso exige P/Invoke al PEB; el dueno
    # de la cadena de padres es el proxy practico: primer ancestro con dueno
    # interactivo DISTINTO al usuario del proceso elevado.
    if (-not $__candidate) {
        try {
            $__depth = 0; $__pidCur = $PID; $__found = $null; $__chain = @()
            while ($__pidCur -and ($__depth -lt 8)) {
                $__proc = Get-CimInstance Win32_Process -Filter "ProcessId=$__pidCur" -ErrorAction Stop
                if (-not $__proc) { break }
                $__own = $null
                try { $__own = (Invoke-CimMethod -InputObject $__proc -MethodName GetOwner -ErrorAction Stop).User } catch {}
                $__chain += "$($__proc.Name):$__own"
                if ($__own -and ($__own -ine $__procUser) -and (Test-KhoraRealUserName $__own)) { $__found = $__own; break }
                $__pidCur = $__proc.ParentProcessId; $__depth++
            }
            if ($__found) {
                $__candidate = $__found.Trim(); $__method = "M4: cadena de procesos padre (GetOwner)"
                $script:REAL_USER_DETECT_LOG += "[M4 cadena padre] EXITO -> '$__candidate' | cadena: $($__chain -join ' <- ')"
            } else {
                $script:REAL_USER_DETECT_LOG += "[M4 cadena padre] sin ancestro con dueno interactivo distinto | cadena: $($__chain -join ' <- ')"
            }
        } catch { $script:REAL_USER_DETECT_LOG += "[M4 cadena padre] ERROR: $($_.Exception.Message)" }
    }

    # ---- Metodo 5: Registro LogonUI -> LastLoggedOnUser ----
    # Menos confiable: es el ULTIMO login/desbloqueo visto por LogonUI, no
    # necesariamente la sesion actual. Por eso va al final.
    if (-not $__candidate) {
        try {
            $__k = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI" -ErrorAction Stop
            $__raw = $null
            foreach ($__prop in @("LastLoggedOnUser", "LastLoggedOnSAMUser")) {
                $__v = $null; try { $__v = $__k.$__prop } catch { $__v = $null }
                if ($__v) { $__raw = $__v; break }
            }
            if ($__raw) {
                $__short = ("$__raw" -split '\\')[-1].Trim()
                if (Test-KhoraRealUserName $__short) {
                    $__candidate = $__short; $__method = "M5: registro LogonUI LastLoggedOnUser"
                    $script:REAL_USER_DETECT_LOG += "[M5 registro LogonUI] EXITO -> '$__raw' (corto: '$__short') [ultimo login registrado; puede no ser la sesion actual]"
                } else {
                    $script:REAL_USER_DETECT_LOG += "[M5 registro LogonUI] valor '$__raw' no valido como usuario interactivo"
                }
            } else {
                $script:REAL_USER_DETECT_LOG += "[M5 registro LogonUI] clave presente pero sin LastLoggedOnUser/LastLoggedOnSAMUser"
            }
        } catch { $script:REAL_USER_DETECT_LOG += "[M5 registro LogonUI] ERROR: $($_.Exception.Message)" }
    }

    # ---- Decision ----
    if (-not $__candidate) {
        $script:REAL_USER_DETECT_LOG += "[FALLBACK] Ningun metodo determino al usuario real; se usa el contexto actual ('$__procUser')."
        return
    }
    $script:REAL_USER_METHOD = $__method
    if ($__candidate -ieq $__procUser) {
        $script:REAL_USER_SAME = $true
        $script:REAL_USER_NAME = $__candidate
        $script:REAL_USER_DETECT_LOG += "[DECISION] usuario real '$__candidate' == usuario del proceso '$__procUser': mismo usuario, sin redireccion necesaria."
        return
    }
    # Usuario real DISTINTO al del proceso elevado -> redirigir perfil
    $__realProfile = Join-Path $env:SystemDrive "Users\$__candidate"
    if (Test-Path $__realProfile) {
        $script:REAL_USER_ELEVATED_AS = $__procUser
        $script:REAL_USER_NAME        = $__candidate
        # Redirigir env vars ANTES de cualquier Join-Path con ellos
        $env:USERNAME     = $__candidate
        $env:USERPROFILE  = $__realProfile
        $env:LOCALAPPDATA = Join-Path $__realProfile "AppData\Local"
        $env:APPDATA      = Join-Path $__realProfile "AppData\Roaming"
        $env:HOMEDRIVE    = $env:SystemDrive
        $env:HOMEPATH     = "\Users\$__candidate"
        $script:REAL_USER_OVERRIDE = $true
        $script:REAL_USER_DETECT_LOG += "[DECISION] REDIRECCION: usuario real '$__candidate' != proceso elevado '$__procUser' -> perfil $__realProfile"
    } else {
        # Perfil no existe en disco: primer login o perfil movil;
        # se trabaja con el contexto elevado y se avisa en Start-Sesion.
        $script:REAL_USER_NO_PROFILE = $__candidate
        $script:REAL_USER_DETECT_LOG += "[DECISION] usuario real '$__candidate' detectado pero su perfil NO existe en disco ($__realProfile); se usa el contexto elevado ('$__procUser')."
    }
}

Resolve-RealUserPaths
# ================================================================
#  RUTAS (calculadas DESPUES de detectar al usuario real)
#  Si hay redireccion, ROOT_DIR = Escritorio del usuario REAL.
# ================================================================
$script:NO_SCRIPT_FILE = $false
    $SCRIPT_PATH = $script:GATE_PATH   # v7.0.0: el gate es el unico punto de entrada
if ($script:REAL_USER_OVERRIDE) {
    # Elevado con cuenta distinta: ROOT_DIR = Escritorio del usuario REAL
    # (no la carpeta del .ps1, que puede estar en el Desktop del admin)
    $__rDesktop = Join-Path $env:USERPROFILE "Desktop"
    if (-not (Test-Path $__rDesktop)) { $__rDesktop = $env:USERPROFILE }
    $ROOT_DIR = Join-Path $__rDesktop "khora"
    if (-not $SCRIPT_PATH) {
        $script:NO_SCRIPT_FILE = $true
        $SCRIPT_PATH = Join-Path $ROOT_DIR "khora-v$SCRIPT_VERSION.ps1"
    }
    $script:REAL_USER_DETECT_LOG += "[ROOT_DIR] -> $ROOT_DIR (Desktop de $env:USERNAME)"
} elseif ($SCRIPT_PATH) {
    $ROOT_DIR = Split-Path -Parent $SCRIPT_PATH
} else {
    $script:NO_SCRIPT_FILE = $true
    $ROOT_DIR    = Join-Path (Join-Path $env:USERPROFILE "Desktop") "khora"
    $SCRIPT_PATH = Join-Path $ROOT_DIR "khora-v$SCRIPT_VERSION.ps1"
}
New-Item -ItemType Directory -Force $ROOT_DIR | Out-Null
# ================================================================
# Workdir en LOCALAPPDATA (nunca sincronizado a OneDrive, siempre escribible)
# NOTA: $env:LOCALAPPDATA ya fue redirigido si se detecto elevacion mixta.
$WORK_DIR    = Join-Path $env:LOCALAPPDATA "khora-session"
$REPO_DIR    = Join-Path $WORK_DIR "repo"
$CDP_PORT    = 9333
$ROOT_STATE_DIR = Join-Path $ROOT_DIR "session-state"
$WORK_STATE_DIR = Join-Path $WORK_DIR "session-state"
$TAB_SNAPSHOT_PATH = Join-Path $ROOT_STATE_DIR "chrome-tabs.json"
$TAB_EXCLUDE_PATTERNS = @('access_token','id_token','[?&]code=','otp','password','chrome://','chrome-extension://','devtools://','about:blank')
$TAB_SNAPSHOT_MAX = 30
# Estructura persistente del proyecto (junto al script):
#   ROOT\logs\      -> logging diario (texto + jsonl)
#   ROOT\versions\  -> archivo historico de cada version ejecutada
#   ROOT\config.json -> configuracion
$LOG_DIR     = Join-Path $ROOT_DIR "logs"
$VER_DIR     = Join-Path $ROOT_DIR "versions"
$CFG_FILE    = Join-Path $ROOT_DIR "config.json"
$FLAG_DIR    = Join-Path $WORK_DIR "flags"
$DATE_STR    = Get-Date -Format "yyyy-MM-dd"
$LOG_FILE    = Join-Path $LOG_DIR "$DATE_STR.log"
$JSON_LOG    = Join-Path $LOG_DIR "$DATE_STR.jsonl"
# Log adicional en WORK_DIR: persiste aunque el script se corra desde otra carpeta
$WORK_LOG    = Join-Path $WORK_DIR "session-$DATE_STR.log"
$SES_START   = Get-Date
New-Item -ItemType Directory -Force $WORK_DIR | Out-Null
New-Item -ItemType Directory -Force $LOG_DIR  | Out-Null
New-Item -ItemType Directory -Force $VER_DIR  | Out-Null
New-Item -ItemType Directory -Force $FLAG_DIR | Out-Null
New-Item -ItemType Directory -Force $ROOT_STATE_DIR | Out-Null
New-Item -ItemType Directory -Force $WORK_STATE_DIR | Out-Null
# Migracion silenciosa: config previa en LOCALAPPDATA -> raiz del proyecto
if (-not (Test-Path $CFG_FILE)) {
    $oldCfg = Join-Path $WORK_DIR "config.json"
    if (Test-Path $oldCfg) { Copy-Item $oldCfg $CFG_FILE -Force -ErrorAction SilentlyContinue }
}
$script:LOG_WIN_PID  = $null
$script:GUARD_PID    = $null
$script:TokSecure    = $null
$script:TASK_NAME    = "KHORA_Deadline_$PID"
$script:SES_ACTIVE   = $false
$script:WIP_UNPUSHED = $false   # true => hay trabajo local sin respaldo remoto verificado
$script:EFS_ACTIVE   = $false   # true => workdir/repo cifrados en reposo con EFS
# ================================================================
#  CONFIG (externa, autogenerada -> agnostico de proyecto)
# ================================================================
$DEFAULT_CFG = [ordered]@{
    repoOrg           = "SeryMente"
    repoName          = "khora"
    gitName           = "Black Sheep"
    gitEmail          = "blacksheepsup@gmail.com"
    openUrls          = @("https://accounts.google.com/signin/chrome/sync","https://mail.google.com")
    inactivityMinutes = 15
    deadlineHour      = 20
    autoWipMinutes    = 5
    enableAutoWip     = $true
    enableGuardian    = $true
    protectUnpushedWork = $true  # fail-closed: la limpieza JAMAS destruye trabajo sin push VERIFICADO (lo pone en cuarentena)
    exfilAlertMBPerMin  = 25     # umbral de subida sostenida (MB/min) que alerta de posible exfiltracion
    watchRemoteAccess   = $true  # el guardian vigila RAT/control remoto y conexiones externas
    nukeOnExfil         = $false # si $true, una exfiltracion sostenida dispara limpieza nuclear automatica
}
function Load-Config {
    if (Test-Path $CFG_FILE) {
        try {
            $raw = Get-Content $CFG_FILE -Raw | ConvertFrom-Json
            $cfg = [ordered]@{}
            foreach ($k in $DEFAULT_CFG.Keys) {
                if ($raw.PSObject.Properties.Name -contains $k -and $null -ne $raw.$k) { $cfg[$k] = $raw.$k }
                else { $cfg[$k] = $DEFAULT_CFG[$k] }
            }
            return $cfg
        } catch { }
    }
    ($DEFAULT_CFG | ConvertTo-Json -Depth 5) | Set-Content $CFG_FILE -Encoding UTF8
    return $DEFAULT_CFG
}
$CFG       = Load-Config
$REPO_ORG  = $CFG.repoOrg
$REPO_NAME = $CFG.repoName
$GIT_NAME  = $CFG.gitName
$GIT_EMAIL = $CFG.gitEmail
# ================================================================
#  LOGGING (texto legible + jsonl estructurado + repo)
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
# ================================================================
#  HELPERS AGNOSTICOS
# ================================================================
function Test-Cmd { param([string]$name) [bool](Get-Command $name -ErrorAction SilentlyContinue) }
# Drena teclas/lineas fantasma que quedaron en el buffer de la consola (residuo
# de pegados grandes o inyeccion de teclado en PCs publicas). Evita que un ENTER
# o caracter viejo se coma un prompt o dispare acciones solas.
function Clear-PendingInput {
    try { while ([Console]::KeyAvailable) { [Console]::ReadKey($true) | Out-Null } } catch {}
}
function Get-Cim { param([string]$class)
    try { return Get-CimInstance -ClassName $class -ErrorAction Stop }
    catch { try { return Get-WmiObject -Class $class -ErrorAction Stop } catch { return $null } }
}
# Ejecuta un scriptblock con el token en texto plano SOLO por un instante
function Invoke-WithToken {
    param([ScriptBlock]$Action)
    if (-not $script:TokSecure) { throw "No hay token en memoria." }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($script:TokSecure)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        & $Action $plain
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        [GC]::Collect()
    }
}
#  Test de extensión
function Test-LastPassInstalled {
    $lpId = "hdokiejnpimakedhajhdlcegeplioahd"
    $chromeUserData = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
    if (-not (Test-Path $chromeUserData)) { return $false }
    $profiles = Get-ChildItem -Path $chromeUserData -Directory -Filter "*"
    foreach ($prof in $profiles) {
        $extPath = Join-Path $prof.FullName "Extensions\$lpId"
        if (Test-Path $extPath) { return $true }
    }
    return $false
}
# Resolver ejecutable en cascada: registro -> PATH -> rutas conocidas
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
function Get-CodePaths {
    @(
        (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\Code.exe"),
        (Join-Path ${env:ProgramFiles} "Microsoft VS Code\Code.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Microsoft VS Code\Code.exe")
    )
}
function Get-ChromePaths {
    @(
        (Join-Path ${env:ProgramFiles} "Google\Chrome\Application\chrome.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
        (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
    )
}
function Open-LoginTabs {
    $hasLp = Test-LastPassInstalled
    if (-not $hasLp) { Warn "LastPass no detectado. Las pestañas de login se abrirán pero no tendrán autofill." }
    $chromeExe = Resolve-Exe "chrome" (Get-ChromePaths) "chrome.exe"
    if (-not $chromeExe) { Warn "Chrome no detectado, omitiendo pestañas de login."; return }
    $urls = @(
        "https://accounts.google.com/ServiceLogin?continue=https://mail.google.com/",
        "https://www.notion.so/login",
        "chrome://settings/people"
    )
    foreach ($u in $urls) {
        try { Start-Process -FilePath $chromeExe -ArgumentList "--remote-debugging-port=$CDP_PORT", "`"$u`"" -ErrorAction SilentlyContinue } catch {}
    }
    Ok "Abiertas 3 pestañas iniciales de login (CDP port: $CDP_PORT)."
}
# ================================================================
#  CABECERA DE ARRANQUE  (se escribe ANTES de abrir la ventana log)
# ================================================================
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
# ================================================================
#  VENTANA DE LOG EN VIVO (muestra TODO desde la primera linea)
# ================================================================
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
# ================================================================
#  PREFLIGHT (tablero de compatibilidad, agnostico)
# ================================================================
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
# ================================================================
#  ASEGURAR GIT (auto-instala si falta -> agnostico)
# ================================================================
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
# ================================================================
#  AUTENTICACION GH CLI (agnostico)
# ================================================================
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
# ================================================================
#  ASEGURAR VS CODE (instalado, no portable; verifica SHA256)
# ================================================================
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
# ================================================================
#  PERSISTENCIA DE CONFIG DE VS CODE (via repo, agnostico de maquina)
#    repo\tools\vscode\extensions.txt     -> un ID de extension por linea
#    repo\tools\vscode\settings.user.json -> settings.json de usuario
# ================================================================
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
# Exporta la config local de VS Code al repo (viaja con el push final verificado)
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
# ================================================================
#  GUARDIAN: lanzar proceso vigilante (inactividad + panico)
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
# ================================================================
#  DEADLINE: tarea programada que sobrevive todo
# ================================================================
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
function Save-ChromeTabsSnapshot {
    $res = Invoke-RestMethod "http://localhost:$CDP_PORT/json" -ErrorAction SilentlyContinue
    if (-not $res) { Warn "Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas."; return }
    $validUrls = @()
    foreach ($tab in $res) {
        if ($tab.type -ne "page") { continue }
        if ([string]::IsNullOrWhiteSpace($tab.url)) { continue }
        $url = $tab.url
        $exclude = $false
        foreach ($pat in $TAB_EXCLUDE_PATTERNS) {
            if ($url -match $pat) { $exclude = $true; break }
        }
        if (-not $exclude) { $validUrls += $url }
    }
    if ($validUrls.Count -gt $TAB_SNAPSHOT_MAX) {
        $validUrls = $validUrls[0..($TAB_SNAPSHOT_MAX - 1)]
    }
    $snap = @{
        "capturedAt" = (Get-Date).ToString("o")
        "tabs"       = $validUrls
    }
    $snapDir = Split-Path $TAB_SNAPSHOT_PATH -Parent
    if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Force $snapDir | Out-Null }
    $snap | ConvertTo-Json -Compress | Set-Content $TAB_SNAPSHOT_PATH -Encoding UTF8
    Info "Snapshot de pestañas guardado ($($validUrls.Count) tabs)."
}

function Restore-ChromeTabsSnapshot {
    if (-not (Test-Path $TAB_SNAPSHOT_PATH)) {
        Info "Sin snapshot previo de pestañas."
        return
    }
    $snap = Get-Content $TAB_SNAPSHOT_PATH -Raw | ConvertFrom-Json
    if (-not $snap.tabs -or $snap.tabs.Count -eq 0) {
        Info "Snapshot de pestañas vacio."
        return
    }
    $chromeExe = Resolve-Exe "chrome" (Get-ChromePaths) "chrome.exe"
    if (-not $chromeExe) { Warn "Chrome no detectado, no se pueden restaurar pestañas."; return }
    foreach ($url in $snap.tabs) {
        try { Start-Process -FilePath $chromeExe -ArgumentList "`"$url`"" -ErrorAction SilentlyContinue } catch {}
    }
    Ok "Restauradas $($snap.tabs.Count) pestaña(s) de la sesión anterior."
}

# ================================================================
#  AUTO-WIP: respaldo continuo al remoto (rama wip/auto-*)
# ================================================================
$script:WIP_BRANCH = $null
# Ejecuta git en el repo con token efimero, capturando salida y exit code REALES
function Invoke-GitTokenCmd {
    param([string[]]$GitArgs)
    $script:__gitArgs = $GitArgs; $script:__gitOut = $null; $script:__gitCode = 1
    Invoke-WithToken {
        param($t)
        $ga = $script:__gitArgs
        # URL-token temporal: set -> ejecutar -> restaurar (token no queda en .git/config)
        $__cmdUrl = "https://x-access-token:${t}@github.com/$REPO_ORG/$REPO_NAME.git"
        git -C $REPO_DIR remote set-url origin $__cmdUrl 2>&1 | Out-Null
        $script:__gitOut  = git -C $REPO_DIR @ga 2>&1
        $script:__gitCode = $LASTEXITCODE
        git -C $REPO_DIR remote set-url origin "https://github.com/$REPO_ORG/$REPO_NAME.git" 2>&1 | Out-Null
    }
    return @{ code = $script:__gitCode; out = (("$($script:__gitOut)" | Out-String)).Trim() }
}
# Push VERIFICADO (anti-simulacion): reintentos con backoff + cotejo SHA local vs remoto
function Push-Verified {
    param([string]$Branch, [int]$Retries = 3)
    if (-not $script:TokSecure) { L "WARN" "Push-Verified: sin token en memoria."; return $false }
    if (-not $Branch -or $Branch -eq "HEAD") { L "WARN" "Push-Verified: rama invalida [$Branch]."; return $false }
    $localSha = "$(git -C $REPO_DIR rev-parse HEAD 2>$null)".Trim()
    if (-not $localSha) { L "WARN" "Push-Verified: no hay HEAD local."; return $false }
    for ($i=1; $i -le $Retries; $i++) {
        $r = Invoke-GitTokenCmd -GitArgs @("push","-u","origin",$Branch)
        if ($r.code -eq 0) {
            # VERIFICACION REAL: el remoto debe reportar EXACTAMENTE el SHA local
            $lr = Invoke-GitTokenCmd -GitArgs @("ls-remote","origin","refs/heads/$Branch")
            $remoteSha = if ($lr.code -eq 0 -and $lr.out) { ($lr.out -split "\s+")[0] } else { "" }
            if ($remoteSha -eq $localSha) { return $true }
            L "WARN" "Push-Verified: push OK pero remoto[$remoteSha] != local[$localSha] (intento $i/$Retries)."
        } else {
            L "WARN" "Push-Verified: push fallo (intento $i/$Retries): $($r.out)"
        }
        if ($i -lt $Retries) { Start-Sleep -Seconds ($i * 5) }
    }
    return $false
}
# Hay trabajo local NO respaldado? Solo lectura local: funciona incluso sin token
function Test-UnpushedWork {
    if (-not (Test-Path "$REPO_DIR\.git")) { return $false }
    $dirty = (git -C $REPO_DIR status --porcelain 2>$null | Measure-Object).Count
    if ($dirty -gt 0) { return $true }
    $ahead = (git -C $REPO_DIR log --oneline --branches --not --remotes 2>$null | Measure-Object).Count
    return ($ahead -gt 0)
}
function Ensure-GitignoreHygiene {
    $gi = Join-Path $REPO_DIR ".gitignore"
    $pat = "logs/*.log"
    $patRe = "^logs/\*\.log$"
    $needsAdd = $true
    if (Test-Path $gi) {
        $lines = Get-Content $gi -ErrorAction SilentlyContinue
        if ($lines -match $patRe) { $needsAdd = $false }
    }
    if ($needsAdd) {
        Add-Content $gi "`n$pat" -Encoding UTF8 -ErrorAction SilentlyContinue
        Ok "$pat agregado a .gitignore"
    }
    # Obtener lista real de archivos log trackeados
    $tracked = @(git -C $REPO_DIR ls-files -- "logs/*.log" 2>$null)
    if ($tracked.Count -gt 0) {
        foreach ($tf in $tracked) {
            git -C $REPO_DIR rm --cached $tf 2>&1 | Out-Null
            Ok "Archivo trackeado removido del indice: $tf"
        }
    }
}
function Init-Wip {
    if (-not $CFG.enableAutoWip) { return }
    $script:WIP_BRANCH = "wip/auto-$DATE_STR-$PID"
    git -C $REPO_DIR checkout -b $script:WIP_BRANCH 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Ok "Rama de respaldo creada: $script:WIP_BRANCH"
        # Publicar de inmediato: el remoto conoce la rama desde el minuto cero
        if (Push-Verified -Branch $script:WIP_BRANCH -Retries 2) { Ok "Rama WIP publicada y VERIFICADA en remoto." }
        else { Warn "Rama WIP aun sin publicar; el auto-WIP reintentara en el proximo ciclo." }
    } else { Warn "No se pudo crear rama WIP (exit $LASTEXITCODE). Auto-WIP deshabilitado esta sesion."; $script:WIP_BRANCH = $null }
}
function Do-AutoWip {
    if (-not $CFG.enableAutoWip -or -not $script:WIP_BRANCH -or -not (Test-Path "$REPO_DIR\.git")) { return }
    $curBranch = (git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>$null).Trim()
    if ($curBranch -ne $script:WIP_BRANCH) {
        L "INFO" "Auto-WIP en pausa: rama actual distinta de la rama WIP (checkout/merge manual en curso)"
        return
    }
    Save-ChromeTabsSnapshot
    $changes = (git -C $REPO_DIR status --porcelain 2>&1 | Measure-Object).Count
    # Corre si hay cambios nuevos O si quedo un push pendiente de un ciclo anterior
    # Sin cambios en codigo: igual sincronizar logs si crecieron
    if ($changes -eq 0 -and -not $script:WIP_UNPUSHED) {
        $__rld = Join-Path $REPO_DIR "logs"
        New-Item -ItemType Directory -Force $__rld | Out-Null
        foreach ($__lf in @($LOG_FILE, $WORK_LOG)) {
            if (Test-Path $__lf) {
                $__dst = Join-Path $__rld (Split-Path $__lf -Leaf)
                $__srcSz = (Get-Item $__lf).Length
                $__dstSz = if (Test-Path $__dst) { (Get-Item $__dst).Length } else { 0 }
                if ($__srcSz -gt $__dstSz) { Copy-Item $__lf $__dst -Force -EA SilentlyContinue; L "INFO" "Log sincronizado a repo: $(Split-Path $__lf -Leaf)" }
            }
        }
        return
    }
    try {
        if ($changes -gt 0) {
            # Copiar logs al repo para que el commit los incluya
            $__rld = Join-Path $REPO_DIR "logs"
            New-Item -ItemType Directory -Force $__rld | Out-Null
            foreach ($__lf in @($LOG_FILE, $WORK_LOG)) {
                if (Test-Path $__lf) { Copy-Item $__lf (Join-Path $__rld (Split-Path $__lf -Leaf)) -Force -EA SilentlyContinue }
            }
            L "INFO" "Auto-WIP: logs copiados a repo/logs/ (incluidos en el commit)"
            $__addOut = git -C $REPO_DIR add -A 2>&1
            L "INFO" "git add: $(if($LASTEXITCODE -eq 0){'OK'}else{'EXIT '+ $LASTEXITCODE}) $__addOut"
            if ($LASTEXITCODE -ne 0) { throw "git add fallo (exit $LASTEXITCODE)" }
            $__cmtOut = git -C $REPO_DIR commit -m "wip: auto-guardado $(Get-Date -Format 'HH:mm:ss')" 2>&1
            L "INFO" "git commit: $(if($LASTEXITCODE -eq 0){'OK'}else{'EXIT '+ $LASTEXITCODE}) $__cmtOut"
            if ($LASTEXITCODE -ne 0) { throw "git commit fallo (exit $LASTEXITCODE)" }
        }
        if (Push-Verified -Branch $script:WIP_BRANCH) {
            $script:WIP_UNPUSHED = $false
            L "INFO" "Auto-WIP VERIFICADO: $changes cambio(s) respaldados en $script:WIP_BRANCH"
        } else {
            $script:WIP_UNPUSHED = $true
            Warn "Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo)."
        }
    } catch { $script:WIP_UNPUSHED = $true; L "WARN" "Auto-WIP fallo: $_" }
}
# ================================================================
#  ANIMACION TDAH-FRIENDLY (sin pantallas congeladas)
# ================================================================
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
        Write-Host "`r  $f  $Label  [$e]  $t   " -NoNewline -ForegroundColor Cyan
        Start-Sleep -Milliseconds 180
        $i++
        if ($i % 22 -eq 0) { $ti++ }
    }
    Write-Host "`r$((' ') * 78)`r" -NoNewline
    $out = Receive-Job $job 2>&1
    Remove-Job $job -Force
    $sw.Stop()
    L "INFO" "$Label completado en $($sw.Elapsed.ToString('mm\:ss'))"
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
# ================================================================
#  CIFRADO EN REPOSO (EFS) - v6.4.2
#  El workdir se cifra ANTES del clone: todo lo que nace dentro
#  (repo, .env, secrets, flags) HEREDA el cifrado y es ilegible
#  desde otras cuentas de Windows o por extraccion fisica del disco.
#  Limite honesto: en la MISMA cuenta el contenido se lee transparente
#  (asi trabajan git/VS Code/node sin friccion); por eso la limpieza
#  nuclear [X] sigue siendo la capa final. Windows Home NO trae EFS:
#  en ese caso se avisa y protegen limpieza + DeepFreeze.
# ================================================================
function Test-KhoraEncrypted {
    param([string]$path)
    try {
        $it = Get-Item $path -Force -ErrorAction Stop
        return (($it.Attributes -band [IO.FileAttributes]::Encrypted) -ne 0)
    } catch { return $false }
}
function Protect-KhoraPath {
    param([string]$path, [string]$label = "carpeta")
    if (-not (Test-Path $path)) { Warn "Ruta inexistente, no se puede cifrar: $path"; return $false }
    if (-not (Test-Cmd cipher)) { Warn "cipher.exe no disponible: sin EFS para $label."; return $false }
    # Sonda rapida: probar EFS en UN archivo temporal sin recorrer todo el arbol.
    # Evita colgarse durante minutos si EFS esta bloqueado por directiva de dominio.
    $probe = Join-Path $path (".efsprobe_$PID.tmp")
    $canEfs = $false
    try {
        Set-Content -LiteralPath $probe -Value "efs-probe" -Encoding ASCII -ErrorAction Stop
        $pout = cipher /e /a "$probe" 2>&1
        $canEfs = (Test-KhoraEncrypted $probe)
        if (-not $canEfs) {
            $joined = ($pout | Out-String)
            if ($joined -match "recuperaci" -or $joined -match "recovery") {
                Warn "EFS deshabilitado por directiva del dominio (cert. de recuperacion no valido)."
            } else {
                Warn "EFS no disponible (Windows Home o GPO restrictiva)."
            }
        }
    } catch {
        Warn "No se pudo probar EFS: $_"
    } finally {
        Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
    }
    if (-not $canEfs) {
        Warn "  Respaldo vigente: limpieza nuclear [X] + DeepFreeze del cyber."
        return $false
    }
    # EFS funciona: marcar solo el directorio raiz SIN /s.
    # Los archivos nuevos dentro heredaran cifrado; el arbol existente no se toca.
    cipher /e "$path" 2>&1 | Out-Null
    Ok "EFS ACTIVO: $label marcado. Nuevos archivos heredaran cifrado."
    return $true
}
function Invoke-SecureDeleteFile {
    # Anti-forense: sobrescribe con bytes aleatorios criptograficos antes de borrar,
    # para que el contenido original no sea recuperable del disco.
    param([string]$file)
    if (-not (Test-Path $file)) { return }
    try {
        $len = [Math]::Max([int](Get-Item $file -Force).Length, 4096)
        $rnd = New-Object byte[] $len
        $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
        $rng.GetBytes($rnd)
        [IO.File]::WriteAllBytes($file, $rnd)
        $rng.Dispose()
    } catch {}
    Remove-Item $file -Force -ErrorAction SilentlyContinue
}
# ================================================================
#  INSTALACION PROACTIVA EN SEGUNDO PLANO (Background Jobs)
# ================================================================
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
# ================================================================
#  ENTORNO DE DESARROLLO (Python + Node + Docker + Vercel)
# ================================================================
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
function Get-Hash {
    param([string]$inputString)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($inputString)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha256.ComputeHash($bytes)
    return [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()
}


function Get-VaultMasterKey {
    $lpKey = "khora-env-vault-key"
    # Wait, the user said "recupéralo de LastPass CLI primero; Read-Host solo como fallback."
    # Wait! Earlier versions of Khora didn't use `lpass` CLI. The user said: "reutilizando la integración de LastPass ya construida en v6.5.2".
    # Wait, I previously found that the only LastPass integration in the script was `Test-LastPassInstalled` for Chrome extensions.
    # Ah, the "integración de LastPass ya construida en v6.5.2" might refer to something else? Wait, no, v6.5.3 had Get-PersistedToken, but it didn't fetch from LastPass, it fetched from a local file ($localTok = Join-Path $ROOT_DIR "khe-token.json").
    # The prompt explicitly says: "Master key: correcto, recupéralo de LastPass CLI primero; Read-Host solo como fallback."

    $masterKey = $null
    # Try lpass if available
    if (Get-Command lpass -ErrorAction SilentlyContinue) {
        # Check login status (lpass status doesn't always exist, so we just try to show the password)
        $masterKey = lpass show --password $lpKey 2>$null
        if ($masterKey) {
            $masterKey = $masterKey.Trim()
            return (ConvertTo-SecureString -String $masterKey -AsPlainText -Force)
        }
    }

    $msg = "Se requiere el passphrase maestro de la boveda (guardalo en LastPass como '$lpKey')."
    Write-Host " [Vault] $msg" -ForegroundColor Cyan
    return Read-Host "  Passphrase" -AsSecureString
}

function Save-Vault {
    param($Vault, [string]$Path, [System.Security.SecureString]$Key)
    $json = $Vault | ConvertTo-Json -Depth 10 -Compress
    $enc = Protect-KhoraToken -PlainToken $json -Passphrase $Key
    $enc.format = "aes-cbc-hmac-v1"
    $encJson = $enc | ConvertTo-Json -Compress
    Set-Content -Path $Path -Value $encJson -Force
}

function Load-Vault {
    param([string]$Path, [System.Security.SecureString]$Key)
    if (-not (Test-Path $Path)) { return @{} }

    try {
        $encJson = Get-Content $Path -Raw | ConvertFrom-Json
        $jsonStr = Unprotect-KhoraToken -Encrypted $encJson -Passphrase $Key
        $psObj = $jsonStr | ConvertFrom-Json
        # Convert PSObject to Hashtable (PS 5.1 compatible)
        $hash = @{}
        foreach ($prop in $psObj.psobject.properties) {
            # each property is a key. The value might be a PSCustomObject, convert that to Hashtable too.
            $val = $prop.Value
            if ($val -is [System.Management.Automation.PSCustomObject]) {
                $subHash = @{}
                foreach ($subProp in $val.psobject.properties) {
                    $subHash[$subProp.Name] = $subProp.Value
                }
                $val = $subHash
            }
            $hash[$prop.Name] = $val
        }
        return $hash
    } catch {
        Warn "Fallo al cargar la boveda (contrasena incorrecta o corrupta): $_"
        return @{}
    }
}

function Sync-Render {
    param([string]$Key, [string]$Value, [string]$Token, [string]$ServiceId)
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Accept" = "application/json"
        "Content-Type" = "application/json"
    }

    $json = @{ value = $Value } | ConvertTo-Json -Compress
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)

    $url = "https://api.render.com/v1/services/$ServiceId/env-vars/$Key"
    try {
        Invoke-RestMethod -Uri $url -Method Put -Headers $headers -Body $body | Out-Null
        Ok "Render: $Key sincronizada."
    } catch {
        Warn "Render: Fallo al sincronizar $Key. Error: $_"
    }
}

function Sync-Vercel {
    param([string]$Key, [string]$Value, [string]$Token)
    Ensure-VercelCLI

    $webDir = Join-Path $REPO_DIR "khora-web"
    $tmpFile = Join-Path $env:TEMP "vercel-env-val-$([guid]::NewGuid().ToString()).txt"
    try {
        [System.IO.File]::WriteAllText($tmpFile, $Value)

        # vercel env rm first to avoid "already exists" errors, then add
        & cmd /c "cd /d `"$webDir`" && vercel env rm $Key production preview development --token $Token -y >nul 2>&1"
        & cmd /c "cd /d `"$webDir`" && vercel env add $Key production preview development --token $Token < `"$tmpFile`" >nul 2>&1"
        if ($LASTEXITCODE -eq 0) {
            Ok "Vercel: $Key sincronizada."
        } else {
            Warn "Vercel: Fallo al sincronizar $Key (ExitCode: $LASTEXITCODE)."
        }
    } catch {
        Warn "Vercel: Fallo al sincronizar $Key. Error: $_"
    } finally {
        if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue }
    }
}

$EnvManifest = @(
    # Core Infrastructure
    @{ Name="KHORA_API_KEY"; IsSecret=$true; Targets=@("Vercel", "Render"); Aliases=@("X_KHORA_KEY") }
    @{ Name="NEO4J_URI"; IsSecret=$true; Targets=@("Vercel", "Render") }
    @{ Name="NEO4J_USER"; IsSecret=$true; Targets=@("Vercel", "Render") }
    @{ Name="NEO4J_PASSWORD"; IsSecret=$true; Targets=@("Vercel", "Render") }

    # Render API / Config
    @{ Name="RENDER_API_KEY"; IsSecret=$true; Targets=@() }
    @{ Name="RENDER_SERVICE_ID"; IsSecret=$false; Targets=@() }

    # Vercel Config
    @{ Name="VERCEL_TOKEN"; IsSecret=$true; Targets=@() }

    # LLM Settings
    @{ Name="KHORA_LLM_API_URL"; IsSecret=$false; Targets=@("Render"); Aliases=@("LLM_CHEAP_API_URL") }
    @{ Name="KHORA_LLM_API_KEY"; IsSecret=$true; Targets=@("Render"); Aliases=@("LLM_CHEAP_API_KEY") }
    @{ Name="KHORA_LLM_MODEL"; IsSecret=$false; Targets=@("Render"); Aliases=@("LLM_CHEAP_MODEL") }
    @{ Name="KHORA_WEB_ORIGIN"; IsSecret=$false; Targets=@("Render") }

    # Khora Web (Vercel)
    @{ Name="AUTH_SECRET"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="DATABASE_URL"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="GEMINI_API_KEY"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="GITHUB_WEBHOOK_SECRET"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="GROQ_API_KEY"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="INTERNAL_TRIGGER_SECRET"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="JULES_API_KEY"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="KHORA_API_URL"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="MAX_CONCURRENT_JULES_SESSIONS"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="MEDICAL_INTERP_MONTHLY_GOAL"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="META_MINUTES_MONTH"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="NEXT_PUBLIC_API_URL"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="NEXT_PUBLIC_APP_VERSION"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="NODE_ENV"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="NOTION_API_KEY"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="NOTION_DATABASE_ID"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="NOTION_ROADMAP_DATABASE_ID"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="NOTION_TOKEN"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="OIDC_CLIENT_ID"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="OIDC_CLIENT_SECRET"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="OIDC_ISSUER_URL"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="PLAYWRIGHT_TEST_RUN"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="SMTP_HOST"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="SMTP_PASS"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="SMTP_PORT"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="SMTP_SECURE"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="SMTP_USER"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="TODOIST_TOKEN"; IsSecret=$true; Targets=@("Vercel") }
)

function Init-EnvVault {
    $vaultPath = Join-Path $REPO_DIR "secrets\env-vault.enc.json"
    $secretsDir = Join-Path $REPO_DIR "secrets"
    if (-not (Test-Path $secretsDir)) { New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null }

    $masterKey = Get-VaultMasterKey
if (-not $masterKey) { Fail "Se cancelo el inicio: Passphrase maestro requerido."; Write-Host ""; Write-Host "SESIÓN DETENIDA: Passphrase requerida."; return }

    $vault = Load-Vault -Path $vaultPath -Key $masterKey
    $vaultChanged = $false

    $renderApiToken = if ($vault.ContainsKey("RENDER_API_KEY")) { $vault["RENDER_API_KEY"].Value } else { $null }
    $renderSvcId = if ($vault.ContainsKey("RENDER_SERVICE_ID")) { $vault["RENDER_SERVICE_ID"].Value } else { $null }
    $vercelToken = if ($vault.ContainsKey("VERCEL_TOKEN")) { $vault["VERCEL_TOKEN"].Value } else { $null }

    foreach ($v in $EnvManifest) {
        $name = $v.Name
        $isSecret = $v.IsSecret
        $targets = $v.Targets

        $value = $null

        if ($vault.ContainsKey($name)) {
            $value = $vault[$name].Value
        } else {
            # BOOTSTRAP: Intentar recuperar desde Vercel o Render primero si aplica
            $foundInCloud = $false

            if ($vercelToken -and $targets -contains "Vercel") {
                $webDir = Join-Path $REPO_DIR "khora-web"
                $tmpEnv = [System.IO.Path]::GetTempFileName()
                try {
                    & cmd /c "cd /d `"$webDir`" && vercel env pull `"$tmpEnv`" --environment=production --token $vercelToken --yes >nul 2>&1"
                    if (Test-Path $tmpEnv) {
                        $envLines = Get-Content $tmpEnv -ErrorAction SilentlyContinue
                        foreach ($line in $envLines) {
                            $line = $line.Trim()
                            if ([string]::IsNullOrEmpty($line) -or $line.StartsWith("#")) { continue }
                            $idx = $line.IndexOf('=')
                            if ($idx -gt 0) {
                                $k = $line.Substring(0, $idx)
                                if ($k -eq $name) {
                                    $v = $line.Substring($idx + 1)
                                    if ($v.StartsWith("`"") -and $v.EndsWith("`"") -and $v.Length -ge 2) {
                                        $v = $v.Substring(1, $v.Length - 2)
                                    }
                                    $value = $v
                                    $foundInCloud = $true
                                    break
                                }
                            }
                        }
                    }
                } finally {
                    if (Test-Path $tmpEnv) { Remove-Item $tmpEnv -Force -ErrorAction SilentlyContinue }
                }
            }

            if (-not $foundInCloud -and $renderApiToken -and $renderSvcId -and $targets -contains "Render") {
                $headers = @{ "Authorization" = "Bearer $renderApiToken"; "Accept" = "application/json" }
                $url = "https://api.render.com/v1/services/$renderSvcId/env-vars?limit=100"
                try {
                    $renderEnvVars = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ErrorAction Stop
                    foreach ($rVar in $renderEnvVars) {
                        if ($rVar.envVar.key -eq $name) {
                            $value = $rVar.envVar.value
                            $foundInCloud = $true
                            break
                        }
                    }
                } catch {}
            }

            if (-not $foundInCloud) {
                Write-Host " [Vault] Variable requerida faltante: $name" -ForegroundColor Yellow
                if ($isSecret) {
                    $sec = Read-Host "  $name" -AsSecureString
                    $value = [System.Net.NetworkCredential]::new("", $sec).Password
                } else {
                    $value = Read-Host "  $name"
                }
            }

            $vault[$name] = @{ Value=$value; SyncState=@{} }
            $vaultChanged = $true

            # Actualizar tokens de bootstrap si fueron los que acabamos de capturar
            if ($name -eq "RENDER_API_KEY") { $renderApiToken = $value }
            if ($name -eq "RENDER_SERVICE_ID") { $renderSvcId = $value }
            if ($name -eq "VERCEL_TOKEN") { $vercelToken = $value }
        }

        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')

        # Sincronizacion
        foreach ($target in $targets) {
            $targetNames = @($name)
            if ($v.Aliases) { $targetNames += $v.Aliases }

            foreach ($tname in $targetNames) {
                $expectedHash = (Get-Hash $value)
                $syncState = $vault[$name].SyncState["$target|$tname"]
                if ($syncState -ne $expectedHash) {
                    Info "Sincronizando $tname hacia $target..."
                    if ($target -eq "Vercel" -and $vercelToken) {
                        Sync-Vercel -Key $tname -Value $value -Token $vercelToken
                    } elseif ($target -eq "Render" -and $renderApiToken -and $renderSvcId) {
                        Sync-Render -Key $tname -Value $value -Token $renderApiToken -ServiceId $renderSvcId
                    }
                    $vault[$name].SyncState["$target|$tname"] = $expectedHash
                    $vaultChanged = $true
                }
            }
        }
    }

    if ($script:TokSecure) {
        $ghTok = [System.Net.NetworkCredential]::new("", $script:TokSecure).Password
        [System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $ghTok, 'Process')
    }

    if ($vaultChanged) {
        Save-Vault -Vault $vault -Path $vaultPath -Key $masterKey
        Ok "Boveda de entorno actualizada."
    } else {
        Ok "Boveda de entorno verificada y en sincronia."
    }
}

function Invoke-RenderOps {
    $svcId = [System.Environment]::GetEnvironmentVariable('RENDER_SERVICE_ID', 'Process')
    if (-not (Get-Command render -ErrorAction SilentlyContinue)) {
        Warn "Render CLI no disponible. Ejecuta [1] Iniciar sesion para instalarlo."
        return
    }
    Write-Host ""
    Write-Host "  ---- RENDER OPERATIONS ----" -ForegroundColor Cyan
    Write-Host "   [1] render deploy (produccion)" -ForegroundColor White
    Write-Host "   [2] render logs en vivo" -ForegroundColor White
    Write-Host "   [3] render services list" -ForegroundColor White
    Write-Host "   [4] set env var en Render" -ForegroundColor White
    Write-Host "   [Q] volver al menu principal" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "   Opcion: " -NoNewline -ForegroundColor White
    Clear-PendingInput
    $rk = [Console]::ReadKey($true); Write-Host $rk.KeyChar
    $rkey = $rk.KeyChar.ToString().ToUpper()
    switch ($rkey) {
        '1' {
            if (-not $svcId) { $svcId = Read-Host '  Service ID (ej: srv-xxxxx)' }
            Step "render deploy --service-id $svcId"
            $out = Spin-Job "Deploying a Render" -ArgList @($svcId) -Tips @('subiendo cambios...','esperando build...','reiniciando servicio...','verificando health...') -Block {
                param($id); & render deploy --service-id $id 2>&1
            }
            $out | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray; L "INFO" "render: $_" }
            Ok "Deploy completado. Revisa dashboard.render.com"
        }
        '2' {
            if (-not $svcId) { $svcId = Read-Host '  Service ID (ej: srv-xxxxx)' }
            Info "Abriendo logs en nueva terminal (Ctrl+C para salir)..."
            Start-Process powershell -ArgumentList "-NoProfile","-NoExit","-Command","render logs --service-id $svcId --tail"
            Ok "Log abierto en nueva ventana."
        }
        '3' {
            $out = & render services list 2>&1
            $out | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
            L "INFO" "render services list ejecutado"
        }
        '4' {
            if (-not $svcId) { $svcId = Read-Host '  Service ID (ej: srv-xxxxx)' }
            $key = Read-Host '  Nombre de la variable (ej: LLM_CHEAP_API_KEY)'
            $val = Read-Host "  Valor para $key"
            & render env set "${key}=${val}" --service-id $svcId 2>&1 | ForEach-Object { Write-Host "  $_" }
            Ok "Var $key actualizada en Render."
            L "INFO" "render env set $key en $svcId"
        }
        'Q' { return }
    }
}
function Start-DevServers {
    L "INFO" "=== Start-DevServers: arrancando API (:8000) + Next.js (:3000) ==="
    if (-not (Test-Path "$REPO_DIR\.git")) { Warn "Sin repo. Inicia sesion primero ([1])."; return }
    $pyExe  = Join-Path $WORK_DIR 'venv\Scripts\python.exe'
    $webDir = Join-Path $REPO_DIR 'khora-web'
    if (Test-Path $pyExe) {
        $apiCmd = "cd /d `"`"$REPO_DIR`"`" && `"`"$pyExe`"`" -m uvicorn khora.api:app --reload --port 8000"
        Start-Process powershell -ArgumentList "-NoProfile","-NoExit","-Command",$apiCmd
        Ok "API uvicorn -> http://localhost:8000  (nueva ventana)"
        L "INFO" "Dev server API uvicorn lanzado en :8000"
    } else { Warn "Venv no encontrado. Inicia sesion ([1]) para crearlo." }
    if (Test-Path $webDir) {
        $nextCmd = "cd /d `"`"$webDir`"`" && npm run dev"
        Start-Process powershell -ArgumentList "-NoProfile","-NoExit","-Command",$nextCmd
        Ok "Next.js dev -> http://localhost:3000  (nueva ventana)"
        L "INFO" "Dev server Next.js lanzado en :3000"
    } else { Warn "khora-web/ no encontrado." }
}
function Invoke-KhoraOk {
    $wd = Join-Path $REPO_DIR 'khora-web'
    if (-not (Test-Path $wd)) { Warn "khora-web/ no encontrado."; return }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Warn "Node no disponible."; return }
    Step "khora-ok local: build + e2e"
    $outB = Spin-Job "npm run build (Next.js)" -ArgList @($wd) -Tips @('analizando modulos...','compilando TypeScript...','optimizando bundles...','generando paginas estaticas...','verificando tipos...','tree-shaking...','minificando CSS...','casi listo...') -Block {
        param($webDir); & cmd /c "cd /d `"`"$webDir`"`" && npm run build 2>&1"
    }
    $outB | ForEach-Object { L "INFO" "build: $_" }
    $buildFail = ($outB | Where-Object { "$_" -match 'error TS|Build error|Failed to compile' })
    if ($buildFail) {
        Fail "Build FALLO. Revisa el log:"
        $buildFail | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        return
    }
    Ok "Build OK."
    $outE = Spin-Job "npm run e2e (Playwright)" -ArgList @($wd) -Tips @('iniciando Chromium...','cargando pagina de prueba...','test: smoke regression...','test: login flow...','test: navegacion...','verificando assertions...','capturando screenshots...','recopilando resultados...') -Block {
        param($webDir); & cmd /c "cd /d `"`"$webDir`"`" && npm run e2e 2>&1"
    }
    $outE | ForEach-Object { L "INFO" "e2e: $_" }
    $e2eFail = ($outE | Where-Object { "$_" -match ' failed|FAILED|Error:' })
    if ($e2eFail) {
        Fail "khora-ok FAIL. Corrige los tests antes de desplegar."
        $e2eFail | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    } else { Ok "khora-ok local PASS. Listo para [V] Deploy." }
    L "INFO" "khora-ok local completado."
}
function Deploy-Vercel {
    $wd = Join-Path $REPO_DIR 'khora-web'
    if (-not (Test-Path $wd)) { Warn "khora-web/ no encontrado."; return }
    if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) { Warn "Vercel CLI no disponible. Ejecuta [1] para instalarlo."; return }
    Step "Deploy a Vercel (--prod)"
    $out = Spin-Job "vercel deploy --prod" -ArgList @($wd) -Tips @('autenticando con Vercel...','subiendo archivos...','compilando en Vercel Cloud...','ejecutando build remoto...','optimizando assets...','publicando deployment...','casi listo...') -Block {
        param($webDir); & cmd /c "cd /d `"`"$webDir`"`" && vercel deploy --prod 2>&1"
    }
    $out | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray; L "INFO" "vercel: $_" }
    $fail = ($out | Where-Object { "$_" -match '^Error|failed' })
    if ($fail) { Fail "Deploy fallo. Revisa salida arriba." }
    else { Ok "Deploy exitoso. Revisa el dashboard de Vercel." }
}
function Invoke-ChromeIntelligent {
    $chrome = Resolve-Exe "chrome" (Get-ChromePaths) "chrome.exe"
    $chromeRunning = [bool](Get-Process chrome -ErrorAction SilentlyContinue)
    # Detectar cuenta Google activa
    $googleLoggedIn = $false
    $localState = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data\Local State"
    if (Test-Path $localState) {
        try {
            $ls = Get-Content $localState -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
            $accts = $ls.account_info
            if ($accts -and $accts.Count -gt 0) {
                $googleLoggedIn = $true
                Ok "Cuenta Google en Chrome: $($accts[0].email)"
            }
        } catch {}
    }
    # Detectar LastPass
    $lpId  = 'hdokiejnpimakedhajhdlcegeplioahd'
    $extDir = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data\Default\Extensions"
    $lpOk  = Test-Path (Join-Path $extDir $lpId)
    if ($lpOk)  { Ok   "LastPass detectado en Chrome." }
    else        { Warn "LastPass NO instalado. Se abrira la Chrome Web Store." }
    # URLs inteligentes
    $urls = [System.Collections.Generic.List[string]]::new()
    if (-not $googleLoggedIn) { $urls.Add("https://accounts.google.com/signin/chrome/sync") }
    $urls.Add("https://mail.google.com")
    $urls.Add("https://notion.so")
    $urls.Add("https://github.com/SeryMente/khora")
    if (-not $lpOk) { $urls.Add("https://chrome.google.com/webstore/detail/lastpass/" + $lpId) }
    L "INFO" "Chrome inteligente: $($urls.Count) URLs | login=$googleLoggedIn | lastpass=$lpOk | running=$chromeRunning"
    if ($chrome) {
        if ($chromeRunning) {
            foreach ($u in $urls) { Start-Process -FilePath $chrome -ArgumentList $u }
            Ok "Chrome ya activo: $($urls.Count) pestanas nuevas agregadas."
        } else {
            Start-Process -FilePath $chrome -ArgumentList (@("--new-window") + $urls)
            Ok "Chrome abierto con $($urls.Count) URLs."
        }
    } else {
        Warn "Chrome no encontrado. Abriendo con navegador por defecto..."
        foreach ($u in $urls) { Start-Process $u }
    }
}
# ================================================================

#  TOKEN PERSISTENCE (v6.5.3)

# ================================================================
# ================================================================
#  TOKEN PERSISTENCE (v6.5.3)
# ================================================================
function Protect-KhoraToken {
    param([string]$PlainToken, [System.Security.SecureString]$Passphrase)
    $salt = [byte[]]::new(16)
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($salt)

    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Passphrase)
    $passText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)

    # 200,000 iteraciones como minimo requerido
    $pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($passText, $salt, 200000)
    $keyMat = $pbkdf2.GetBytes(64) # 32 AES + 32 HMAC

    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

    $aesKey = $keyMat[0..31]
    $hmacKey = $keyMat[32..63]

    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Key = $aesKey
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.GenerateIV()

    $enc = $aes.CreateEncryptor()
    $plainBytes = [System.Text.Encoding]::UTF8.GetBytes($PlainToken)
    $cipherBytes = $enc.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $hmacKey
    # tag = HMAC(IV + CipherText)
    $tagData = New-Object byte[] ($aes.IV.Length + $cipherBytes.Length)
    [Array]::Copy($aes.IV, 0, $tagData, 0, $aes.IV.Length)
    [Array]::Copy($cipherBytes, 0, $tagData, $aes.IV.Length, $cipherBytes.Length)

    $tagBytes = $hmac.ComputeHash($tagData)

    return @{
        cipherText = [Convert]::ToBase64String($cipherBytes)
        salt = [Convert]::ToBase64String($salt)
        iv = [Convert]::ToBase64String($aes.IV)
        tag = [Convert]::ToBase64String($tagBytes)
    }
}

function Unprotect-KhoraToken {
    param($Encrypted, [System.Security.SecureString]$Passphrase)
    $salt = [Convert]::FromBase64String($Encrypted.salt)
    $iv = [Convert]::FromBase64String($Encrypted.iv)
    $cipherBytes = [Convert]::FromBase64String($Encrypted.cipherText)
    $expectedTag = [Convert]::FromBase64String($Encrypted.tag)

    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Passphrase)
    $passText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)

    $pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($passText, $salt, 200000)
    $keyMat = $pbkdf2.GetBytes(64)

    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

    $aesKey = $keyMat[0..31]
    $hmacKey = $keyMat[32..63]

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $hmacKey

    $tagData = New-Object byte[] ($iv.Length + $cipherBytes.Length)
    [Array]::Copy($iv, 0, $tagData, 0, $iv.Length)
    [Array]::Copy($cipherBytes, 0, $tagData, $iv.Length, $cipherBytes.Length)

    $actualTag = $hmac.ComputeHash($tagData)

    for ($i = 0; $i -lt $expectedTag.Length; $i++) {
        if ($actualTag[$i] -ne $expectedTag[$i]) {
            throw "El tag de integridad HMAC no coincide. Contraseña incorrecta o token corrupto."
        }
    }

    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Key = $aesKey
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.IV = $iv

    $dec = $aes.CreateDecryptor()
    $plainBytes = $dec.TransformFinalBlock($cipherBytes, 0, $cipherBytes.Length)
    return [System.Text.Encoding]::UTF8.GetString($plainBytes)
}

function Save-TokenSnapshot {
    param([string]$Token, [datetime]$ExpiresUtc, [System.Security.SecureString]$Passphrase)

    $enc = Protect-KhoraToken -PlainToken $Token -Passphrase $Passphrase
    $snapshot = @{
        cipherText = $enc.cipherText
        salt = $enc.salt
        iv = $enc.iv
        tag = $enc.tag
        createdUtc = (Get-Date).ToUniversalTime().ToString("o")
        expiresUtc = $ExpiresUtc.ToString("o")
    }

    $outFile = Join-Path $ROOT_STATE_DIR "gh-token.enc.json"
    $snapshot | ConvertTo-Json -Depth 5 | Set-Content $outFile -Encoding UTF8 -Force
    Ok "Snapshot de token guardado localmente."
}

function Test-TokenSnapshotValid {
    $outFile = Join-Path $ROOT_STATE_DIR "gh-token.enc.json"
    $snapshotJson = $null

    if (Test-Path $outFile) {
        $snapshotJson = Get-Content $outFile -Raw
    } else {
        if (Get-Command gh -ErrorAction SilentlyContinue) {
            try {
                # Attempt to get it from the remote if it existed there historically, though moving to ROOT_STATE_DIR means it shouldn't be there moving forward.
                $rawGh = gh api repos/$REPO_ORG/$REPO_NAME/contents/session-state/gh-token.enc.json --jq '.content' 2>$null
                if ($rawGh) {
                    $snapshotJson = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($rawGh))
                }
            } catch {}
        }
    }

    if ($snapshotJson) {
        try {
            $snapshot = $snapshotJson | ConvertFrom-Json
            $exp = [datetime]::Parse($snapshot.expiresUtc).ToUniversalTime()
            if ($exp -gt (Get-Date).ToUniversalTime()) {
                return $snapshot
            }
        } catch {}
    }
    return $false
}

function Get-PersistedToken {
    param([System.Security.SecureString]$Passphrase, $Snapshot)
    try {
        return Unprotect-KhoraToken -Encrypted $Snapshot -Passphrase $Passphrase
    } catch {
        return $null
    }
}

function Invoke-ChromeCleanup {
    $chromeBase = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
    if (-not (Test-Path $chromeBase)) { Info "Sin datos de Chrome que limpiar."; return }
    Step "Limpieza manual de Chrome"
    Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 1000
    $totalBytes = 0; $cleared = 0
    $profiles = Get-ChildItem $chromeBase -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq "Default" -or $_.Name -match "^Profile" }
    $targets = @("Cookies","Cache","Code Cache","History","Login Data","Web Data","Visited Links","Network Action Predictor","Top Sites")
    foreach ($prof in $profiles) {
        foreach ($item in $targets) {
            $p = Join-Path $prof.FullName $item
            if (Test-Path $p) {
                try {
                    $sz = (Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                    $totalBytes += [long]$sz
                    Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
                    $cleared++
                } catch {}
            }
        }
    }
    foreach ($sh in @("ShaderCache","GrShaderCache")) {
        $p = Join-Path $chromeBase $sh
        if (Test-Path $p) {
            try {
                $sz = (Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                $totalBytes += [long]$sz
                Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue; $cleared++
            } catch {}
        }
    }
    $mb = [math]::Round($totalBytes / 1MB, 1)
    Ok "Chrome limpio: $cleared elementos borrados ($mb MB liberados)."
    L "INFO" "Chrome cleanup: $cleared items, $mb MB eliminados"
}
# ================================================================
#  INICIO DE SESION
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
        do { $__khk = [Console]::ReadKey($true) } while ($__khk.Key -ne [ConsoleKey]::Enter)
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
# ================================================================
#  LIMPIEZA NUCLEAR (agnostica: todos los perfiles/usuarios)
# ================================================================
function Invoke-Cleanup {
    param([string]$reason = "manual")
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
            Remove-Item -Recurse -Force $REPO_DIR -ErrorAction SilentlyContinue
            if (Test-Path $REPO_DIR) {
                $empty = Join-Path $env:TEMP "khe-$(Get-Random)"; New-Item -ItemType Directory -Force $empty | Out-Null
                if (Test-Cmd robocopy) { robocopy $empty $REPO_DIR /purge /njh /njs /nc /ns /np 2>&1 | Out-Null }
                Remove-Item -Recurse -Force $REPO_DIR -ErrorAction SilentlyContinue
                Remove-Item -Force $empty -ErrorAction SilentlyContinue
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
        @("khora*","git*","vscode*","*token*","khe-*") | ForEach-Object {
            Get-Item (Join-Path $env:TEMP $_) -ErrorAction SilentlyContinue | ForEach-Object {
                Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
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
# ================================================================
#  ESCANEO DE KEYLOGGERS
# ================================================================
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
# ================================================================
#  MONITOR DE EXFILTRACION / ACCESO REMOTO (RAT) - v6.4.3
#  Heuristico y read-only. Detecta software de control remoto activo,
#  sesiones RDP entrantes, conexiones externas de esos procesos y picos
#  de subida sostenida (posible robo de datos). El guardian lo corre en
#  segundo plano; los hallazgos se loguean y se marcan con un flag que el
#  menu muestra en rojo. Limite honesto: un RAT en la imagen congelada del
#  cyber puede ocultarse; esto atrapa lo comun, no a un atacante avanzado.
# ================================================================
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
# ================================================================
#  ESTADO
# ================================================================
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
# ================================================================
#  GUARDIAN LOOP (proceso separado)
# ================================================================
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
function Trigger-Cleanup {
    param([string]$why)
    L "STEP" "GUARDIAN DISPARA LIMPIEZA: $why"
    try { Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File","`"$SCRIPT_PATH`"","-CleanupOnly","-Reason",$why -WindowStyle Hidden } catch { L "FAIL" "No se pudo lanzar limpieza: $_" }
}
# ================================================================
#  BANNER + LOOP PRINCIPAL
# ================================================================
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
            [Environment]::Exit(1)
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
                exit
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
        if ($actual -ne $expected) { Warn "Nombre de archivo [$actual] no coincide con la version interna (esperado: $expected). Renombralo para mantener coherencia." }
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
    $needDraw = $true
    while ($true) {
        if ($needDraw) { Show-Banner; $needDraw = $false }
        if ([Console]::KeyAvailable) {
            $k = [Console]::ReadKey($true); Write-Host $k.KeyChar
            $key = $k.KeyChar.ToString().ToUpper()
            L "INFO" "Tecla: [$key]"
            switch ($key) {
                "1" { Start-Sesion }
                "2" { Invoke-Cleanup "manual" }
                "3" { Show-Estado }
                "4" { Write-Host ""; Write-Host "  ---- LOG DE HOY ----" -ForegroundColor Cyan; if (Test-Path $LOG_FILE) { Get-Content $LOG_FILE | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray } } else { Info "Sin log." } }
                "5" { Write-Host ""; Write-Host "  ---- HISTORIAL REPO ----" -ForegroundColor Cyan; $rl=Join-Path $REPO_DIR "logs\sessions.log"; if (Test-Path $rl) { Get-Content $rl | Select-Object -Last 80 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray } } else { Info "Sin historial." } }
                "6" { Open-LogWindow; Ok "Ventana de log reabierta." }
                "7" { Scan-Keyloggers }
                "8" { Invoke-Preflight | Out-Null }
                "9" { Start-DevServers }
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
                    [Environment]::Exit(42)
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
# ================================================================
