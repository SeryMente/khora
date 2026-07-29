$Global:KhoraVaultPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\secrets\env-vault.enc.json'))
$Global:KhoraVaultMasterKey = $null

$Global:KhoraVaultValidators = @{
    'NEO4J_URI' = '^(neo4j(\+s)?|bolt(\+s)?|https)://\S+$'
    'NEO4J_USER' = '^[A-Za-z0-9\-]{1,64}$'
    'NEO4J_PASSWORD' = '^\S{8,}$'
}

function KhoraVault-SecureToPlain {
    param([System.Security.SecureString]$Secure)
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try { [System.Runtime.InteropServices.Marshal]::PtrToStringUni($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function KhoraVault-GetMasterKey {
    $currentTime = [DateTimeOffset]::UtcNow
    if ($Global:KhoraVaultMasterKey -and $Global:KhoraVaultMasterKeyExpiresAt -and $currentTime -lt $Global:KhoraVaultMasterKeyExpiresAt) {
        return $Global:KhoraVaultMasterKey
    }
    if ($Global:KhoraVaultMasterKey -is [System.IDisposable]) { $Global:KhoraVaultMasterKey.Dispose() }
    Remove-Variable -Name KhoraVaultMasterKey -Scope Global -ErrorAction SilentlyContinue
    Remove-Variable -Name KhoraVaultMasterKeyExpiresAt -Scope Global -ErrorAction SilentlyContinue
    $environmentPassword = [System.Environment]::GetEnvironmentVariable('KHORA_VAULT_PASSWORD')
    if (-not [string]::IsNullOrWhiteSpace($environmentPassword)) {
        $Global:KhoraVaultMasterKey = ConvertTo-SecureString -String $environmentPassword -AsPlainText -Force
        $Global:KhoraVaultMasterKeyExpiresAt = $currentTime.AddHours(1)
        return $Global:KhoraVaultMasterKey
    }
    $securePassword = Read-Host "Password maestra de la boveda Khora (la misma siempre, NO tu token de GitHub)" -AsSecureString
    $Global:KhoraVaultMasterKey = $securePassword
    $Global:KhoraVaultMasterKeyExpiresAt = $currentTime.AddHours(1)
    return $Global:KhoraVaultMasterKey
}

function KhoraVault-DeriveKey {
    param([System.Security.SecureString]$MasterSecure, [byte[]]$Salt)
    $plain = KhoraVault-SecureToPlain -Secure $MasterSecure
    $deriver = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($plain, $Salt, 200000, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
    $deriver.GetBytes(64)
}

function KhoraVault-Load {
    if (Test-Path $Global:KhoraVaultPath) {
        Get-Content $Global:KhoraVaultPath -Raw | ConvertFrom-Json
    } else {
        $s = New-Object byte[] 16
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($s)
        [PSCustomObject]@{ salt = [Convert]::ToBase64String($s); entries = [PSCustomObject]@{} }
    }
}

function KhoraVault-Save {
    param($VaultObj)
    $dir = Split-Path $Global:KhoraVaultPath -Parent
    if ($dir -and (-not (Test-Path $dir))) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $json = $VaultObj | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($Global:KhoraVaultPath, $json, (New-Object System.Text.UTF8Encoding($false)))
}

function KhoraVault-Encrypt {
    param([string]$PlainText, [byte[]]$Key)
    $aesKey = [byte[]]($Key[0..31])
    $hmacKey = [byte[]]($Key[32..63])
    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.Key = $aesKey
    $aes.GenerateIV()
    $iv = $aes.IV
    $encryptor = $aes.CreateEncryptor()
    $plainBytes = [System.Text.Encoding]::UTF8.GetBytes($PlainText)
    $cipherBytes = $encryptor.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)
    $aes.Dispose()
    $hmac = New-Object System.Security.Cryptography.HMACSHA256(,$hmacKey)
    $tag = $hmac.ComputeHash($iv + $cipherBytes)
    $hmac.Dispose()
    [PSCustomObject]@{ nonce = [Convert]::ToBase64String($iv); cipher = [Convert]::ToBase64String($cipherBytes); tag = [Convert]::ToBase64String($tag) }
}

function KhoraVault-Decrypt {
    param($Entry, [byte[]]$Key)
    $aesKey = [byte[]]($Key[0..31])
    $hmacKey = [byte[]]($Key[32..63])
    $iv = [Convert]::FromBase64String($Entry.nonce)
    $cipherBytes = [Convert]::FromBase64String($Entry.cipher)
    $tag = [Convert]::FromBase64String($Entry.tag)
    $hmac = New-Object System.Security.Cryptography.HMACSHA256(,$hmacKey)
    $expectedTag = $hmac.ComputeHash($iv + $cipherBytes)
    $hmac.Dispose()
    if ([Convert]::ToBase64String($tag) -ne [Convert]::ToBase64String($expectedTag)) {
        throw "KhoraVault: verificacion HMAC fallo - dato corrupto o llave incorrecta."
    }
    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.Key = $aesKey
    $aes.IV = $iv
    $decryptor = $aes.CreateDecryptor()
    $plainBytes = $decryptor.TransformFinalBlock($cipherBytes, 0, $cipherBytes.Length)
    $aes.Dispose()
    [System.Text.Encoding]::UTF8.GetString($plainBytes)
}

function KhoraVault-ValidateValue {
param([Parameter(Mandatory=$true)][string]$Name, [Parameter(Mandatory=$true)][string]$Value)
if ($Global:KhoraVaultValidators.ContainsKey($Name)) {
return [bool]($Value -match $Global:KhoraVaultValidators[$Name])
}
return ($Value.Length -ge 4)
}

function Import-KhoraEnvVault {
    $vault = KhoraVault-Load
    $names = @($vault.entries.PSObject.Properties.Name)
    if ($names.Count -eq 0) { Write-Host 'Boveda vacia o inexistente todavia.'; return @() }
    $master = KhoraVault-GetMasterKey
    $key = KhoraVault-DeriveKey -MasterSecure $master -Salt ([Convert]::FromBase64String($vault.salt))
    $loaded = New-Object System.Collections.Generic.List[string]
    $failed = New-Object System.Collections.Generic.List[string]
    foreach ($name in $names) {
        try {
            $value = KhoraVault-Decrypt -Entry $vault.entries.$name -Key $key
            [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
            $loaded.Add($name)
        } catch {
            Write-Host ("FALLO al descifrar " + $name + ": " + $_.Exception.Message) -ForegroundColor Red
            $failed.Add($name)
        }
    }
    Write-Host ('Cargadas ' + $loaded.Count + ' variables desde la boveda: ' + ($loaded -join ', '))
    if ($failed.Count -gt 0) { Write-Host ('FALLARON ' + $failed.Count + ': ' + ($failed -join ', ')) -ForegroundColor Yellow }
    $loaded
}

function Set-KhoraEnvVaultVariable {
param([Parameter(Mandatory=$true)][string]$Name, [switch]$Rotate, [switch]$UseClipboard)
$vault = KhoraVault-Load
$existingNames = @($vault.entries.PSObject.Properties.Name)
if (($existingNames -contains $Name) -and (-not $Rotate)) {
Write-Host ($Name + ' ya existe en la boveda - se omite (usa -Rotate para forzar).')
return
}
if ($UseClipboard) {
Write-Host ("Copia el valor real de " + $Name + " al portapapeles y presiona Enter aqui:")
Read-Host | Out-Null
$plainValue = $null
for ($i = 0; $i -lt 3 -and [string]::IsNullOrEmpty($plainValue); $i++) {
try { $plainValue = Get-Clipboard } catch { Start-Sleep -Milliseconds 300 }
}
} else {
$secureValue = Read-Host -AsSecureString -Prompt ('Valor para ' + $Name)
$plainValue = KhoraVault-SecureToPlain -Secure $secureValue
}
if ([string]::IsNullOrWhiteSpace($plainValue)) {
Write-Host ("FALLO: valor vacio para " + $Name + ". Abortando.") -ForegroundColor Red
return
}
if (-not (KhoraVault-ValidateValue -Name $Name -Value $plainValue)) {
Write-Host ("FALLO DE VALIDACION DE FORMATO para " + $Name + ". Abortando SIN GUARDAR.") -ForegroundColor Red
$plainValue = $null
return
}
$master = KhoraVault-GetMasterKey
$key = KhoraVault-DeriveKey -MasterSecure $master -Salt ([Convert]::FromBase64String($vault.salt))
$entry = KhoraVault-Encrypt -PlainText $plainValue -Key $key
$len = $plainValue.Length
if ($existingNames -contains $Name) { $vault.entries.$Name = $entry } else { $vault.entries | Add-Member -MemberType NoteProperty -Name $Name -Value $entry }
KhoraVault-Save -VaultObj $vault
$verifyVault = KhoraVault-Load
$verifyKey = KhoraVault-DeriveKey -MasterSecure $master -Salt ([Convert]::FromBase64String($verifyVault.salt))
$roundTripOk = $false
try {
$decrypted = KhoraVault-Decrypt -Entry $verifyVault.entries.$Name -Key $verifyKey
if (($decrypted -ceq $plainValue) -and (KhoraVault-ValidateValue -Name $Name -Value $decrypted)) { $roundTripOk = $true }
} catch { $roundTripOk = $false }
$plainValue = $null
if ($roundTripOk) {
Write-Host ($Name + ' guardada en la boveda (longitud ' + $len + ') - verificacion round-trip OK.') -ForegroundColor Green
} else {
Write-Host ('FALLO CRITICO: ' + $Name + ' se guardo pero la verificacion round-trip post-guardado NO coincide. Revisa manualmente antes de confiar en este valor.') -ForegroundColor Red
}
}
function Initialize-Khora09EnvVars {
    $names = @('AUTH_SECRET','OIDC_ISSUER_URL','OIDC_CLIENT_ID','OIDC_CLIENT_SECRET','KHORA_API_URL','NEXT_PUBLIC_API_URL','KHORA_API_KEY','X_KHORA_KEY','DATABASE_URL','NEO4J_URI','NEO4J_USER','NEO4J_PASSWORD','GROQ_API_KEY','KHORA_LLM_BASE_URL','KHORA_LLM_API_KEY','KHORA_LLM_MODEL','KHORA_EMBEDDINGS_MODEL','KHORA_WEB_ORIGIN')
    foreach ($n in $names) { Set-KhoraEnvVaultVariable -Name $n }
}

function Initialize-Khora091EnvVars {
    $names = @('GEMINI_API_KEY','LLM_CHEAP_BASE_URL','LLM_CHEAP_API_KEY','LLM_CHEAP_MODEL')
    foreach ($n in $names) { Set-KhoraEnvVaultVariable -Name $n }
}
