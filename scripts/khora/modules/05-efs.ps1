# ================================================================
# KHORA v7 - MODULO 05-efs.ps1
# Componente: 05 efs
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
