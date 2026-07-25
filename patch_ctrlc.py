import re

with open('scripts/khora/khora-v6.5.4.ps1', 'r') as f:
    c = f.read()

# I want to insert the P/Invoke at the top of the Run-Main loop where Register-EngineEvent is
old_event = r'''    # Cierre garantizado si se cierra con la X o error
    try { Register-EngineEvent PowerShell.Exiting -Action { if ($script:SES_ACTIVE) { Invoke-Cleanup "salida-forzada" } } | Out-Null } catch {}'''

new_event = r'''    # Cierre garantizado si se cierra con la X o error (CTRL_CLOSE_EVENT nativo + PowerShell.Exiting)
    try {
        $sigCtrl = @"
using System;
using System.Runtime.InteropServices;
public class KhoraCtrl {
    public delegate bool HandlerRoutine(int ctrlType);
    [DllImport("Kernel32")] public static extern bool SetConsoleCtrlHandler(HandlerRoutine handler, bool add);
}
"@
        Add-Type -TypeDefinition $sigCtrl -ErrorAction SilentlyContinue
        $script:__ctrlHandler = [KhoraCtrl+HandlerRoutine] {
            param([int]$ctrlType)
            # 0=CTRL_C, 1=CTRL_BREAK, 2=CTRL_CLOSE, 5=CTRL_LOGOFF, 6=CTRL_SHUTDOWN
            if ($script:SES_ACTIVE) {
                # Ejecutar sincrono
                Invoke-Cleanup "salida-forzada-nativa-$ctrlType"
            }
            return $false
        }
        [KhoraCtrl]::SetConsoleCtrlHandler($script:__ctrlHandler, $true) | Out-Null
        L "INFO" "Manejador P/Invoke SetConsoleCtrlHandler activado."
    } catch { L "WARN" "No se pudo activar SetConsoleCtrlHandler: $_" }
    try { Register-EngineEvent PowerShell.Exiting -Action { if ($script:SES_ACTIVE) { Invoke-Cleanup "salida-forzada" } } | Out-Null } catch {}'''

c = c.replace(old_event, new_event)
with open('scripts/khora/khora-v6.5.4.ps1', 'w') as f:
    f.write(c)
