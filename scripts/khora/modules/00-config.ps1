# ================================================================
# KHORA v7 - MODULO 00-config.ps1
# Componente: 00 config/rutas/globals
# ESTADO: EXTRAÍDO
# ================================================================

$SCRIPT_VERSION = "7.1.6"   # <- UNICA fuente de verdad de la version
function Initialize-KhoraPaths {
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

$ROOT_STATE_DIR = Join-Path $ROOT_DIR "session-state"
$WORK_STATE_DIR = Join-Path $WORK_DIR "session-state"
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

$__desktop = Join-Path $env:USERPROFILE "Desktop"
$__localappdata = $env:LOCALAPPDATA
if (($REPO_DIR -notmatch "^$([regex]::Escape($__desktop))") -and ($REPO_DIR -notmatch "^$([regex]::Escape($__localappdata))")) {
    $msg = "[SECURITY] REPO_PATH fuera de Desktop o LocalAppData: $REPO_DIR - abortando."
    try { L "FAIL" $msg } catch { Write-Host $msg -ForegroundColor Red }
    throw $msg
}

$CDP_PORT    = 9333
$TAB_SNAPSHOT_PATH = Join-Path $ROOT_STATE_DIR "chrome-tabs.json"
$TAB_EXCLUDE_PATTERNS = @('access_token','id_token','[?&]code=','otp','password','chrome://','chrome-extension://','devtools://','about:blank')
$TAB_SNAPSHOT_MAX = 30
# Estructura persistente del proyecto (junto al script):
#   ROOT\logs\      -> logging diario (texto + jsonl)
#   ROOT\versions\  -> archivo historico de cada version ejecutada
#   ROOT\config.json -> configuracion
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
    gitName           = "Victor Hugo Torres"
    gitEmail          = "280919.29061988@proton.me"
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


}
