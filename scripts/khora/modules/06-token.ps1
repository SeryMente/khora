# ================================================================
# KHORA v7 - MODULO 06-token.ps1
# Componente: 06 token
# ================================================================

# Ejecuta un scriptblock con el token en texto plano SOLO por un instante
function Invoke-WithToken {
    param([ScriptBlock]$Action)
    if (-not $script:TokSecure) { throw "No hay token en memoria." }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($script:TokSecure)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        & $Action $plain
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        [GC]::Collect()
    }
}

# ================================================================
#  TOKEN PERSISTENCE (v6.5.3)
# ================================================================
function Protect-KhoraToken {
    param([string]$PlainToken, [System.Security.SecureString]$Passphrase)
    $salt = [byte[]]::new(16)
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($salt)

    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Passphrase)
    $passText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)

    # 200,000 iteraciones como minimo requerido
    $pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($passText, $salt, 200000)
    $keyMat = $pbkdf2.GetBytes(64) # 32 AES + 32 HMAC

    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

    $aesKey = $keyMat[0..31]
    $hmacKey = $keyMat[32..63]

    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Key = $aesKey
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.GenerateIV()

    $enc = $aes.CreateEncryptor()
    $plainBytes = [System.Text.Encoding]::UTF8.GetBytes($PlainToken)
    $cipherBytes = $enc.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $hmacKey
    # tag = HMAC(IV + CipherText)
    $tagData = New-Object byte[] ($aes.IV.Length + $cipherBytes.Length)
    [Array]::Copy($aes.IV, 0, $tagData, 0, $aes.IV.Length)
    [Array]::Copy($cipherBytes, 0, $tagData, $aes.IV.Length, $cipherBytes.Length)

    $tagBytes = $hmac.ComputeHash($tagData)

    return @{
        cipherText = [Convert]::ToBase64String($cipherBytes)
        salt = [Convert]::ToBase64String($salt)
        iv = [Convert]::ToBase64String($aes.IV)
        tag = [Convert]::ToBase64String($tagBytes)
    }
}

function Unprotect-KhoraToken {
    param($Encrypted, [System.Security.SecureString]$Passphrase)
    $salt = [Convert]::FromBase64String($Encrypted.salt)
    $iv = [Convert]::FromBase64String($Encrypted.iv)
    $cipherBytes = [Convert]::FromBase64String($Encrypted.cipherText)
    $expectedTag = [Convert]::FromBase64String($Encrypted.tag)

    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Passphrase)
    $passText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)

    $pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($passText, $salt, 200000)
    $keyMat = $pbkdf2.GetBytes(64)

    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

    $aesKey = $keyMat[0..31]
    $hmacKey = $keyMat[32..63]

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $hmacKey

    $tagData = New-Object byte[] ($iv.Length + $cipherBytes.Length)
    [Array]::Copy($iv, 0, $tagData, 0, $iv.Length)
    [Array]::Copy($cipherBytes, 0, $tagData, $iv.Length, $cipherBytes.Length)

    $actualTag = $hmac.ComputeHash($tagData)

    for ($i = 0; $i -lt $expectedTag.Length; $i++) {
        if ($actualTag[$i] -ne $expectedTag[$i]) {
            throw "El tag de integridad HMAC no coincide. Contraseña incorrecta o token corrupto."
        }
    }

    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Key = $aesKey
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.IV = $iv

    $dec = $aes.CreateDecryptor()
    $plainBytes = $dec.TransformFinalBlock($cipherBytes, 0, $cipherBytes.Length)
    return [System.Text.Encoding]::UTF8.GetString($plainBytes)
}

function Save-TokenSnapshot {
    param([string]$Token, [datetime]$ExpiresUtc, [System.Security.SecureString]$Passphrase)

    $enc = Protect-KhoraToken -PlainToken $Token -Passphrase $Passphrase
    $snapshot = @{
        cipherText = $enc.cipherText
        salt = $enc.salt
        iv = $enc.iv
        tag = $enc.tag
        createdUtc = (Get-Date).ToUniversalTime().ToString("o")
        expiresUtc = $ExpiresUtc.ToString("o")
    }

    $outFile = Join-Path $ROOT_STATE_DIR "gh-token.enc.json"
    $snapshot | ConvertTo-Json -Depth 5 | Set-Content $outFile -Encoding UTF8 -Force
    Ok "Snapshot de token guardado localmente."
}

function Test-TokenSnapshotValid {
    $outFile = Join-Path $ROOT_STATE_DIR "gh-token.enc.json"
    $snapshotJson = $null

    if (Test-Path $outFile) {
        $snapshotJson = Get-Content $outFile -Raw
    } else {
        if (Get-Command gh -ErrorAction SilentlyContinue) {
            try {
                # Attempt to get it from the remote if it existed there historically, though moving to ROOT_STATE_DIR means it shouldn't be there moving forward.
                $rawGh = gh api repos/$REPO_ORG/$REPO_NAME/contents/session-state/gh-token.enc.json --jq '.content' 2>$null
                if ($rawGh) {
                    $snapshotJson = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($rawGh))
                }
            } catch {}
        }
    }

    if ($snapshotJson) {
        try {
            $snapshot = $snapshotJson | ConvertFrom-Json
            $exp = [datetime]::Parse($snapshot.expiresUtc).ToUniversalTime()
            if ($exp -gt (Get-Date).ToUniversalTime()) {
                return $snapshot
            }
        } catch {}
    }
    return $false
}

function Get-PersistedToken {
    param([System.Security.SecureString]$Passphrase, $Snapshot)
    try {
        return Unprotect-KhoraToken -Encrypted $Snapshot -Passphrase $Passphrase
    } catch {
        return $null
    }
}

# ================================================================
#  VIGILANCIA DE PORTAPAPELES (v7.1.5) - ingesta silenciosa del token
# ================================================================
function Watch-ClipboardToken {
    $raw = ""
    try { $raw = Get-Clipboard -Raw -ErrorAction Stop } catch { return }
    if (-not $raw) { return }
    $cand = ([string]$raw).Split([char]10)[0].Trim()
    if ($cand.Length -lt 40) { return }
    if ($cand.Contains(" ")) { return }
    if (-not ($cand.StartsWith("ghp_") -or $cand.StartsWith("github_pat_"))) { return }
    if ($cand -eq $script:ClipTokenSeen) { return }
    $script:ClipTokenSeen = $cand
    try { Set-Clipboard -Value " " -ErrorAction Stop } catch {}
    $bien = $false
    try {
        $cab = @{ Authorization = ("Bearer " + $cand); "User-Agent" = "khora"; Accept = "application/vnd.github+json" }
        $resp = Invoke-WebRequest ("https://api.github.com/repos/" + $REPO_ORG + "/" + $REPO_NAME) -Headers $cab -UseBasicParsing -TimeoutSec 12 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $repoMeta = $resp.Content | ConvertFrom-Json
            $bien = [bool]($repoMeta.permissions.push -or $repoMeta.permissions.admin -or $repoMeta.permissions.maintain)
            if (-not $bien) {
                L "WARN" "Token del portapapeles rechazado: autenticado sin permiso de escritura sobre $REPO_ORG/$REPO_NAME."
            }
        }
    } catch { $bien = $false }
    if ($bien) {
        $script:TokSecure = ConvertTo-SecureString $cand -AsPlainText -Force
        $cand = $null
        L "INFO" "Token detectado en el portapapeles y validado: arranque automatico."
        Ok "Token valido detectado. Arrancando sesion sin intervencion."
        $script:SES_START = Get-Date
        Start-Sesion
        return
    }
    $cand = $null
    L "WARN" "Token del portapapeles rechazado por GitHub."
    Warn "El texto copiado parece un token pero GitHub lo rechazo. Portapapeles limpiado."
    try { Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop; [void][System.Windows.Forms.MessageBox]::Show("Copiaste algo con forma de token de GitHub, pero GitHub lo rechazo para este repositorio. Revisa que sea el token correcto, que no haya expirado y que tenga permiso de escritura.","KHORA - token no valido",0,48) } catch {}
}
