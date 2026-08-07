# ================================================================
# KHORA v7 - GATE (unico punto de entrada del entorno persistente)
# Carga el barril (khora.barrel.ps1) y despacha la ejecucion.
# REGLA: este archivo se mantiene MINIMO. La logica vive en modules/.
# ================================================================
param(
    [switch]$CleanupOnly,   # modo interno: solo ejecuta limpieza NUCLEAR
    [switch]$GuardianOnly,  # modo interno: solo corre el vigilante
    [string]$Reason = "manual"
)
Set-StrictMode -Off
$ErrorActionPreference = "Continue"
$env:TEMP = Join-Path $env:LOCALAPPDATA "Temp"; $env:TMP = $env:TEMP   # khora-temp-fix
$ProgressPreference    = "SilentlyContinue"
$script:GATE_PATH = $PSCommandPath
$script:GATE_DIR  = Split-Path -Parent $PSCommandPath

# D5: Add pre-flight logging
$__gateLogDir = Join-Path $env:TEMP "khora-gate"
if (-not (Test-Path $__gateLogDir)) { New-Item -ItemType Directory -Force $__gateLogDir | Out-Null }
$__gateLogFile = Join-Path $__gateLogDir "gate-$($PID).log"
Start-Transcript -Path $__gateLogFile -Append -Force | Out-Null

Write-Output "[GATE] Iniciando khora-gate. Usuario: $env:USERNAME, PS Version: $($PSVersionTable.PSVersion), Path: $script:GATE_PATH"

# D6: Preflight ausente en el gate
if ($PSVersionTable.PSVersion.Major -lt 5) {
    throw "Khora requiere PowerShell 5.0 o superior. Detectado: $($PSVersionTable.PSVersion)"
}

$__barrelPath = Join-Path $script:GATE_DIR "khora.barrel.ps1"
if (-not (Test-Path $__barrelPath)) {
    throw "No se encuentra khora.barrel.ps1 en $script:GATE_DIR. Asegurese de que la extraccion de modulos este completa."
}

$__expectedModules = @("00-config.ps1","01-realuser.ps1","02-logging.ps1","03-hud.ps1",
    "04-ui.ps1","05-efs.ps1","06-token.ps1","07-git-wip.ps1",
    "08-deps.ps1","09-chrome.ps1","10-guardian.ps1","11-cleanup.ps1",
    "12-handoff.ps1","13-session.ps1","14-deploy.ps1","15-main.ps1",
    "90-legacy.ps1")

foreach ($__mod in $__expectedModules) {
    $__modPath = Join-Path (Join-Path $script:GATE_DIR "modules") $__mod
    if (-not (Test-Path $__modPath)) {
        throw "Falta el modulo requerido: $__mod en modules/. La arquitectura requiere todos los modulos."
    }
}

Write-Output "[GATE] Preflight checks passed. Cargando barril..."

try {
    . $__barrelPath
    Start-DepsPreload
    if ($CleanupOnly) { Invoke-Cleanup $Reason }
    elseif ($GuardianOnly) { Start-GuardianLoop }
    else { Run-Main }
} catch {
    if ($_.Exception.Message -eq 'KHORA_HANDOFF_READY') {
        Write-Output '[GATE] Handoff ready exit.'
        Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
        exit 42
    }
    throw
}

Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
