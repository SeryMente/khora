import re

with open('scripts/khora/khora-v6.5.4.ps1', 'r') as f:
    c = f.read()

old_cleanup = r"""function Invoke-Cleanup {
    param([string]$reason = "manual")
    # Evitar limpieza concurrente
    $mtx = New-Object System.Threading.Mutex($false, "Global\KHORA_Cleanup")
    $owns = $false
    try { $owns = $mtx.WaitOne(0) }
    catch [System.Threading.AbandonedMutexException] { $owns = $true }  # heredamos un mutex dejado por una limpieza que murio
    if (-not $owns) { L "WARN" "Limpieza ya en curso; omito."; $mtx.Dispose(); return }
    try {
        Write-Host ""
        L "STEP" "=== LIMPIEZA NUCLEAR (motivo: $reason) === $(Get-Date -Format 'HH:mm:ss') ==="""

new_cleanup = r"""function Invoke-Cleanup {
    param([string]$reason = "manual")
    # Evitar limpieza concurrente
    $mtx = New-Object System.Threading.Mutex($false, "Global\KHORA_Cleanup")
    $owns = $false
    try { $owns = $mtx.WaitOne(0) }
    catch [System.Threading.AbandonedMutexException] {
        $owns = $true
        L "WARN" "Mutex abandonado capturado: la limpieza anterior no cerro limpio. Continuamos."
    }
    if (-not $owns) { L "WARN" "Limpieza ya en curso; omito."; $mtx.Dispose(); return }
    try {
        try {
            Write-Host ""
            L "STEP" "=== LIMPIEZA NUCLEAR (motivo: $reason) === $(Get-Date -Format 'HH:mm:ss') ==="""

c = c.replace(old_cleanup, new_cleanup)

old_finally = r"""    } finally { $mtx.ReleaseMutex(); $mtx.Dispose() }
}"""

new_finally = r"""        } catch {
            $msg = $_.Exception.Message
            $stack = $_.ScriptStackTrace
            Fail "Fallo critico durante la limpieza: $msg"
            L "FAIL" "LIMPIEZA ABORTADA POR EXCEPCION: $msg `n $stack"
        }
    } finally {
        if ($owns) { $mtx.ReleaseMutex() }
        $mtx.Dispose()
    }
}"""

c = c.replace(old_finally, new_finally)

with open('scripts/khora/khora-v6.5.4.ps1', 'w') as f:
    f.write(c)
