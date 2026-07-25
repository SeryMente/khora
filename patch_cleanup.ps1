$file = "scripts/khora/khora-v6.5.4.ps1"
$content = Get-Content -Raw $file

$old_cleanup = @'
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
'@

$new_cleanup = @'
function Invoke-Cleanup {
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
            L "STEP" "=== LIMPIEZA NUCLEAR (motivo: $reason) === $(Get-Date -Format 'HH:mm:ss') ==="
'@

$content = $content.Replace($old_cleanup, $new_cleanup)

$old_finally = @'
    } finally { $mtx.ReleaseMutex(); $mtx.Dispose() }
}
'@

$new_finally = @'
        } catch {
            $msg = $_.Exception.Message
            $stack = $_.ScriptStackTrace
            Fail "Fallo critico durante la limpieza: $msg"
            L "FAIL" "LIMPIEZA ABORTADA POR EXCEPCION: $msg `n $stack"
        }
    } finally {
        if ($owns) { $mtx.ReleaseMutex() }
        $mtx.Dispose()
    }
}
'@

$content = $content.Replace($old_finally, $new_finally)

Set-Content -Path $file -Value $content -NoNewline
