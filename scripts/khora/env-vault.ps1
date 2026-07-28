$Global:KhoraVaultPath = Join-Path (Get-Location) 'secrets/env-vault.enc.json'
$Global:KhoraVaultMasterKey = $null
function KhoraVault-SecureToPlain {
    param([System.Security.SecureString]$Secure)
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try { [System.Runtime.InteropServices.Marshal]::PtrToStringUni($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
function KhoraVault-GetMasterKey {
    if ($Global:KhoraVaultMasterKey) { return $Global:KhoraVaultMasterKey }
    $candidateVars = @('GITHUB_TOKEN','GH_TOKEN','KHORA_ACCESS_TOKEN','KHORA_TOKEN','KHORA_PAT')
    $source = $null
    $tokenPlain = $null
    foreach ($varName in $candidateVars) {
        $val = [System.Environment]::GetEnvironmentVariable($varName)
        if (-not [string]::IsNullOrWhiteSpace($val)) { $tokenPlain = $val; $source = $varName; break }
    }
    if ($tokenPlain) {
        Write-Host ("Llave maestra derivada del token diario en env:" + $source) -ForegroundColor Green
        $Global:KhoraVaultMasterKey = $tokenPlain
        return $Global:KhoraVaultMasterKey
    }
    Write-Host "MODO EMERGENCIA: token diario no encontrado en el entorno. Pidiendo llave manual (provisional)." -ForegroundColor Yellow
    $secure = Read-Host "Llave maestra de emergencia para la boveda Khora" -AsSecureString
    $Global:KhoraVaultMasterKey = KhoraVault-SecureToPlain $secure
    return $Global:KhoraVaultMasterKey
}
function KhoraVault-DeriveKey {
    param([System.Security.SecureString]$MasterSecure, [byte[]]$Salt)
    $plain = KhoraVault-SecureToPlain -Secure $MasterSecure
    $deriver = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($plain, $Salt, 200000, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
    $deriver.GetBytes(32)
}
function KhoraVault-Load {
    if (Test-Path $Global:KhoraVaultPath) { Get-Content $Global:KhoraVaultPath -Raw | ConvertFrom-Json } else { $s = New-Object byte[] 16; [System.Security.Cryptography.RandomNumberGenerator]::Fill($s); [PSCustomObject]@{ salt = [Convert]::ToBase64String($s); entries = [PSCustomObject]@{} } }
}
function KhoraVault-Save {
    param($VaultObj)
    $dir = Split-Path $Global:KhoraVaultPath -Parent
    if ($dir -and (-not (Test-Path $dir))) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    ($VaultObj | ConvertTo-Json -Depth 10) | Set-Content -Path $Global:KhoraVaultPath -Encoding utf8NoBOM
}
function KhoraVault-Encrypt {
    param([string]$PlainText, [byte[]]$Key)
    $nonce = New-Object byte[] 12
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($nonce)
    $plainBytes = [System.Text.Encoding]::UTF8.GetBytes($PlainText)
    $cipherBytes = New-Object byte[] $plainBytes.Length
    $tag = New-Object byte[] 16
    $gcm = New-Object System.Security.Cryptography.AesGcm($Key)
    $gcm.Encrypt($nonce, $plainBytes, $cipherBytes, $tag)
    $gcm.Dispose()
    [PSCustomObject]@{ nonce = [Convert]::ToBase64String($nonce); cipher = [Convert]::ToBase64String($cipherBytes); tag = [Convert]::ToBase64String($tag) }
}
function KhoraVault-Decrypt {
    param($Entry, [byte[]]$Key)
    $nonce = [Convert]::FromBase64String($Entry.nonce)
    $cipherBytes = [Convert]::FromBase64String($Entry.cipher)
    $tag = [Convert]::FromBase64String($Entry.tag)
    $plainBytes = New-Object byte[] $cipherBytes.Length
    $gcm = New-Object System.Security.Cryptography.AesGcm($Key)
    $gcm.Decrypt($nonce, $cipherBytes, $tag, $plainBytes)
    $gcm.Dispose()
    [System.Text.Encoding]::UTF8.GetString($plainBytes)
}
function Import-KhoraEnvVault {
    $vault = KhoraVault-Load
    $names = @($vault.entries.PSObject.Properties.Name)
    if ($names.Count -eq 0) { Write-Host 'Boveda vacia o inexistente todavia.'; return @() }
    $master = KhoraVault-GetMasterKey
    $key = KhoraVault-DeriveKey -MasterSecure $master -Salt ([Convert]::FromBase64String($vault.salt))
    $loaded = New-Object System.Collections.Generic.List[string]
    foreach ($name in $names) { $value = KhoraVault-Decrypt -Entry $vault.entries.$name -Key $key; [System.Environment]::SetEnvironmentVariable($name, $value, 'Process'); $loaded.Add($name) }
    Write-Host ('Cargadas ' + $loaded.Count + ' variables desde la boveda: ' + ($loaded -join ', '))
    $loaded
}
function Set-KhoraEnvVaultVariable {
    param([Parameter(Mandatory=$true)][string]$Name, [switch]$Rotate)
    $vault = KhoraVault-Load
    $existingNames = @($vault.entries.PSObject.Properties.Name)
    if (($existingNames -contains $Name) -and (-not $Rotate)) { Write-Host ($Name + ' ya existe en la boveda - se omite (usa -Rotate para forzar).'); return }
    $master = KhoraVault-GetMasterKey
    $key = KhoraVault-DeriveKey -MasterSecure $master -Salt ([Convert]::FromBase64String($vault.salt))
    $secureValue = Read-Host -AsSecureString -Prompt ('Valor para ' + $Name)
    $plainValue = KhoraVault-SecureToPlain -Secure $secureValue
    $entry = KhoraVault-Encrypt -PlainText $plainValue -Key $key
    $len = $plainValue.Length
    $plainValue = $null
    if ($existingNames -contains $Name) { $vault.entries.$Name = $entry } else { $vault.entries | Add-Member -MemberType NoteProperty -Name $Name -Value $entry }
    KhoraVault-Save -VaultObj $vault
    Write-Host ($Name + ' guardada en la boveda (longitud ' + $len + ').')
}
function Initialize-Khora09EnvVars {
    $names = @('AUTH_SECRET','OIDC_ISSUER_URL','OIDC_CLIENT_ID','OIDC_CLIENT_SECRET','KHORA_API_URL','NEXT_PUBLIC_API_URL','KHORA_API_KEY','X_KHORA_KEY','DATABASE_URL','NEO4J_URI','NEO4J_USER','NEO4J_PASSWORD','GROQ_API_KEY','KHORA_LLM_BASE_URL','KHORA_LLM_API_KEY','KHORA_LLM_MODEL','KHORA_EMBEDDINGS_MODEL','KHORA_WEB_ORIGIN')
    foreach ($n in $names) { Set-KhoraEnvVaultVariable -Name $n }
}
function Initialize-Khora091EnvVars {
    $names = @('GEMINI_API_KEY','LLM_CHEAP_BASE_URL','LLM_CHEAP_API_KEY','LLM_CHEAP_MODEL')
    foreach ($n in $names) { Set-KhoraEnvVaultVariable -Name $n }
}

# --- Ciclo 27: llave maestra = token diario, sin mensaje de emergencia ---
function KhoraVault-GetMasterKey {
    if ($Global:KhoraVaultMasterKey) { return $Global:KhoraVaultMasterKey }
    $candidateVars = @('GITHUB_TOKEN','GH_TOKEN','KHORA_ACCESS_TOKEN','KHORA_TOKEN','KHORA_PAT')
    foreach ($varName in $candidateVars) {
        $val = [System.Environment]::GetEnvironmentVariable($varName)
        if (-not [string]::IsNullOrWhiteSpace($val)) {
            $Global:KhoraVaultMasterKey = $val
            return $Global:KhoraVaultMasterKey
        }
    }
    $secure = Read-Host "Token GitHub fine-grained de hoy (llave maestra diaria de la boveda Khora)" -AsSecureString
    $Global:KhoraVaultMasterKey = KhoraVault-SecureToPlain $secure
    return $Global:KhoraVaultMasterKey
}
