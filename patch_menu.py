import re

with open('scripts/khora/khora-v6.5.4.ps1', 'r') as f:
    c = f.read()

old_banner = r'''        Write-Host "   [1] INICIAR SESION  <- empieza aqui" -ForegroundColor Green
    } else {
        Write-Host "   >> Sesion ACTIVA: todo corre automaticamente <<" -ForegroundColor Green
    }
    Write-Host "   [2] Cerrar + limpieza NUCLEAR   [3] Estado" -ForegroundColor White
    Write-Host "   [K] khora-ok (tests locales)    [V] Deploy Vercel" -ForegroundColor White
    Write-Host "   [R] Render ops                  [T] Monitor RAT/exfil" -ForegroundColor White
    Write-Host "   [W] Push WIP pendiente          [D] Diag bundle                 [Q] Salir" -ForegroundColor DarkGray
    Write-Host "   Avanzado: [4]log [5]hist [6]logwin [7]keylog [8]preflight [9]servers [C]chrome" -ForegroundColor DarkGray
    Write-Host ""
    if ($script:SES_ACTIVE -and $CFG.enableAutoWip) { Write-Host "   (auto-WIP cada $($CFG.autoWipMinutes)min activo)" -ForegroundColor DarkGray }'''

new_banner = r'''        Write-Host "   [1] INICIAR SESION  <- empieza aqui" -ForegroundColor Green
    } else {
        Write-Host "   >> Sesion ACTIVA: todo corre automaticamente <<" -ForegroundColor Green
    }
    Write-Host "   [2] Cerrar + limpieza NUCLEAR   [3] Estado" -ForegroundColor White
    Write-Host "   [K] khora-ok (tests locales)    [V] Deploy Vercel" -ForegroundColor White
    Write-Host "   [R] Render ops                  [W] Push WIP pendiente" -ForegroundColor White
    Write-Host "   Avanzado: [6]logwin [7]keylog [9]servers [C]chrome              [Q] Salir" -ForegroundColor DarkGray
    Write-Host ""
    if ($script:SES_ACTIVE -and $CFG.enableAutoWip) { Write-Host "   (auto-WIP cada $($CFG.autoWipMinutes)min activo)" -ForegroundColor DarkGray }'''

c = c.replace(old_banner, new_banner)

old_switch = r'''            switch ($key) {
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
                "Q" { Write-Host ""; if ($script:SES_ACTIVE) { Warn "Sesion activa: cierra con [2] antes de salir." } else { Write-Host "  Saliendo. Revoca tu token." -ForegroundColor Yellow; L "INFO" "Script cerrado."; break } }
            }'''

new_switch = r'''            switch ($key) {
                "1" { Start-Sesion }
                "2" { Invoke-Cleanup "manual" }
                "3" { Show-Estado; Show-DiagBundle; Scan-RemoteAccess | Out-Null }
                "6" { Open-LogWindow; Ok "Ventana de log reabierta." }
                "7" { Scan-Keyloggers }
                "9" { Start-DevServers }
                "K" { Invoke-KhoraOk }
                "V" { Deploy-Vercel }
                "C" { Invoke-ChromeCleanup }
                "R" { Invoke-RenderOps }
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
                "Q" { Write-Host ""; if ($script:SES_ACTIVE) { Warn "Sesion activa: cierra con [2] antes de salir." } else { Write-Host "  Saliendo. Revoca tu token." -ForegroundColor Yellow; L "INFO" "Script cerrado."; break } }
            }'''

c = c.replace(old_switch, new_switch)

with open('scripts/khora/khora-v6.5.4.ps1', 'w') as f:
    f.write(c)
