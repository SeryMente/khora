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
$ProgressPreference    = "SilentlyContinue"
$script:GATE_PATH = $PSCommandPath
$script:GATE_DIR  = Split-Path -Parent $PSCommandPath
. (Join-Path $script:GATE_DIR "khora.barrel.ps1")
# ================================================================
#  ENTRY POINT
# ================================================================
if ($CleanupOnly)      { Invoke-Cleanup $Reason }
elseif ($GuardianOnly) { Start-GuardianLoop }
else                   { Run-Main }
