# ================================================================
# KHORA v7 - BARRIL: orden de carga explicito de los modulos.
# PROHIBIDO reordenar esta lista sin autorizacion del operador.
# Los modulos 00-15 son la arquitectura objetivo; 90-legacy.ps1
# contiene el codigo aun no extraido y SIEMPRE se carga al final.
# ================================================================
if (-not $script:GATE_PATH) { throw "khora.barrel.ps1 debe cargarse desde khora.ps1 (gate), nunca directamente." }
$__khoraModules = @(
    "00-config.ps1","01-realuser.ps1","02-logging.ps1","03-hud.ps1",
    "04-ui.ps1","05-efs.ps1","06-token.ps1","07-git-wip.ps1",
    "08-deps.ps1","09-chrome.ps1","10-guardian.ps1","11-cleanup.ps1",
    "12-handoff.ps1","13-session.ps1","14-deploy.ps1","15-main.ps1",
    "90-legacy.ps1"
)
foreach ($__khm in $__khoraModules) {
    Write-Output "[BARRIL] Cargando modulo: $__khm"
    . (Join-Path (Join-Path $script:GATE_DIR "modules") $__khm)
}
Write-Output "[BARRIL] Modulos cargados. ROOT_DIR: $ROOT_DIR, WORK_DIR: $WORK_DIR, REPO_DIR: $REPO_DIR"
