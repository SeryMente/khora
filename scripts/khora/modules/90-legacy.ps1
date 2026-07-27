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
$SCRIPT_VERSION = "7.0.1"   # <- UNICA fuente de verdad de la version
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
# ================================================================
#  HELPERS AGNOSTICOS
# ================================================================
# Drena teclas/lineas fantasma que quedaron en el buffer de la consola (residuo
# de pegados grandes o inyeccion de teclado en PCs publicas). Evita que un ENTER
# o caracter viejo se coma un prompt o dispare acciones solas.
#  Test de extensión
# Resolver ejecutable en cascada: registro -> PATH -> rutas conocidas
# ================================================================
#  CABECERA DE ARRANQUE  (se escribe ANTES de abrir la ventana log)
# ================================================================
# ================================================================
#  VENTANA DE LOG EN VIVO (muestra TODO desde la primera linea)
# ================================================================
# ================================================================
#  PREFLIGHT (tablero de compatibilidad, agnostico)
# ================================================================
# ================================================================
#  ASEGURAR GIT (auto-instala si falta -> agnostico)
# ================================================================
# ================================================================
#  AUTENTICACION GH CLI (agnostico)
# ================================================================
# ================================================================
#  ASEGURAR VS CODE (instalado, no portable; verifica SHA256)
# ================================================================
# ================================================================
#  PERSISTENCIA DE CONFIG DE VS CODE (via repo, agnostico de maquina)
#    repo\tools\vscode\extensions.txt     -> un ID de extension por linea
#    repo\tools\vscode\settings.user.json -> settings.json de usuario
# ================================================================
# Exporta la config local de VS Code al repo (viaja con el push final verificado)
# ================================================================
#  GUARDIAN: lanzar proceso vigilante (inactividad + panico)
# ================================================================
# ================================================================
#  DEADLINE: tarea programada que sobrevive todo
# ================================================================


# ================================================================
#  AUTO-WIP: respaldo continuo al remoto (rama wip/auto-*)
# ================================================================
# Ejecuta git en el repo con token efimero, capturando salida y exit code REALES
# Push VERIFICADO (anti-simulacion): reintentos con backoff + cotejo SHA local vs remoto
# Hay trabajo local NO respaldado? Solo lectura local: funciona incluso sin token
# ================================================================
#  ANIMACION TDAH-FRIENDLY (sin pantallas congeladas)
# ================================================================
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
# ================================================================
#  INSTALACION PROACTIVA EN SEGUNDO PLANO (Background Jobs)
# ================================================================

# ================================================================
#  ENTORNO DE DESARROLLO (Python + Node + Docker + Vercel)
# ================================================================










# ================================================================
#  INICIO DE SESION
# ================================================================
# ================================================================
#  LIMPIEZA NUCLEAR (agnostica: todos los perfiles/usuarios)
# ================================================================
# ================================================================
#  ESCANEO DE KEYLOGGERS
# ================================================================
# ================================================================
#  MONITOR DE EXFILTRACION / ACCESO REMOTO (RAT) - v6.4.3
#  Heuristico y read-only. Detecta software de control remoto activo,
#  sesiones RDP entrantes, conexiones externas de esos procesos y picos
#  de subida sostenida (posible robo de datos). El guardian lo corre en
#  segundo plano; los hallazgos se loguean y se marcan con un flag que el
#  menu muestra en rojo. Limite honesto: un RAT en la imagen congelada del
#  cyber puede ocultarse; esto atrapa lo comun, no a un atacante avanzado.
# ================================================================
# ================================================================
#  ESTADO
# ================================================================
# ================================================================
#  GUARDIAN LOOP (proceso separado)
# ================================================================
# ================================================================
#  BANNER + LOOP PRINCIPAL
# ================================================================


# ================================================================
