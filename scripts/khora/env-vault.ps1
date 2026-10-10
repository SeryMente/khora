# Bóveda compatible con el formato existente y cifrado de perfil.
$Global:KhoraVaultPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\secrets\env-vault.enc.json'))
if(-not(Get-Variable KhoraVaultMasterKey -Scope Global -ErrorAction SilentlyContinue)){$Global:KhoraVaultMasterKey=$null}
if(-not(Get-Variable KhoraVaultLoadedNames -Scope Global -ErrorAction SilentlyContinue)){$Global:KhoraVaultLoadedNames=@()}
$Global:KhoraVaultValidators=@{'NEO4J_URI'='^(neo4j(\+s)?|bolt(\+s)?|https)://\S+$';'NEO4J_USER'='^[A-Za-z0-9\-]{1,64}$';'NEO4J_PASSWORD'='^\S{8,}$';'KHORA_PERFIL_OPEN_SOURCE_BASE_URL'='^https?://\S+$';'KHORA_PERFIL_GEMINI_BASE_URL'='^https?://\S+$';'KHORA_PERFIL_GROQ_BASE_URL'='^https?://\S+$'}

function KhoraVault-SecureToPlain {
    param([Security.SecureString]$Secure)
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
}
function KhoraVault-ProtectTemporaryAccessValue {
    param([Parameter(Mandatory=$true)][Security.SecureString]$Secure)
    if($env:KHORA_EP_DATA_PROFILE_MODE -ne 'fila4-profile-tree'){return ($Secure|ConvertFrom-SecureString)}
    if(-not('System.Security.Cryptography.ProtectedData' -as [type])){Add-Type -AssemblyName System.Security -ErrorAction Stop}
    $plain=KhoraVault-SecureToPlain -Secure $Secure
    $bytes=[Text.Encoding]::UTF8.GetBytes($plain)
    $entropy=[Text.Encoding]::UTF8.GetBytes('KHORA-EP-MACHINE-DPAPI-v1|SeryMente')
    $cipher=$null
    try{$cipher=[Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::LocalMachine);return [Convert]::ToBase64String($cipher)}
    finally{$plain=$null;if($bytes){[Array]::Clear($bytes,0,$bytes.Length)};if($entropy){[Array]::Clear($entropy,0,$entropy.Length)};if($cipher){[Array]::Clear($cipher,0,$cipher.Length)}}
}
function KhoraVault-UnprotectTemporaryAccessValue {
    param([Parameter(Mandatory=$true)][string]$Value,[string]$ProtectionScope)
    if($env:KHORA_EP_DATA_PROFILE_MODE -ne 'fila4-profile-tree'){
        if($ProtectionScope -eq 'LocalMachine-v1'){throw 'El blob de acceso de máquina solo se importa dentro de Entorno Persistente.'}
        return ($Value.Trim()|ConvertTo-SecureString)
    }
    if($ProtectionScope -ne 'LocalMachine-v1'){throw 'TEMP_VAULT_PROTECTION_SCOPE_MISMATCH: no se usará DPAPI de usuario en CECEQ.'}
    if(-not('System.Security.Cryptography.ProtectedData' -as [type])){Add-Type -AssemblyName System.Security -ErrorAction Stop}
    $cipher=[Convert]::FromBase64String($Value.Trim())
    $entropy=[Text.Encoding]::UTF8.GetBytes('KHORA-EP-MACHINE-DPAPI-v1|SeryMente')
    $bytes=$null
    try{$bytes=[Security.Cryptography.ProtectedData]::Unprotect($cipher,$entropy,[Security.Cryptography.DataProtectionScope]::LocalMachine);$plain=[Text.Encoding]::UTF8.GetString($bytes);try{return (ConvertTo-SecureString -String $plain -AsPlainText -Force)}finally{$plain=$null}}
    finally{if($cipher){[Array]::Clear($cipher,0,$cipher.Length)};if($entropy){[Array]::Clear($entropy,0,$entropy.Length)};if($bytes){[Array]::Clear($bytes,0,$bytes.Length)}}
}
function KhoraVault-GetMasterKey {
    if($Global:KhoraVaultMasterKey){return $Global:KhoraVaultMasterKey}
    $Global:KhoraVaultMasterKey=Read-Host 'Llave de la bóveda' -AsSecureString
    return $Global:KhoraVaultMasterKey
}
function KhoraVault-DeriveKey {
    param([Security.SecureString]$MasterSecure,[byte[]]$Salt)
    $plain=KhoraVault-SecureToPlain -Secure $MasterSecure
    try{$deriver=New-Object Security.Cryptography.Rfc2898DeriveBytes($plain,$Salt,200000,[Security.Cryptography.HashAlgorithmName]::SHA256);return $deriver.GetBytes(64)}finally{$plain=$null}
}
function KhoraVault-Load {
    if(Test-Path $Global:KhoraVaultPath){return (Get-Content -LiteralPath $Global:KhoraVaultPath -Raw|ConvertFrom-Json)}
    $salt=New-Object byte[] 16;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
    return [pscustomobject]@{salt=[Convert]::ToBase64String($salt);entries=[pscustomobject]@{}}
}
function KhoraVault-Save {
    param($VaultObj)
    New-Item -ItemType Directory -Path (Split-Path -Parent $Global:KhoraVaultPath) -Force|Out-Null
    [IO.File]::WriteAllText($Global:KhoraVaultPath,($VaultObj|ConvertTo-Json -Depth 10),(New-Object Text.UTF8Encoding($false)))
}
function Test-KhoraBytesEqual {
    param([byte[]]$A,[byte[]]$B)
    if($A.Length-ne$B.Length){return $false};$difference=0
    for($index=0;$index-lt$A.Length;$index++){$difference=$difference-bor($A[$index]-bxor$B[$index])}
    return ($difference-eq0)
}
function KhoraVault-Encrypt {
    param([string]$PlainText,[byte[]]$Key)
    $aes=[Security.Cryptography.Aes]::Create();$aes.Key=[byte[]]$Key[0..31];$aes.GenerateIV()
    $bytes=[Text.Encoding]::UTF8.GetBytes($PlainText);$cipher=$aes.CreateEncryptor().TransformFinalBlock($bytes,0,$bytes.Length)
    $hmac=New-Object Security.Cryptography.HMACSHA256(,[byte[]]$Key[32..63]);$tag=$hmac.ComputeHash($aes.IV+$cipher)
    $result=[pscustomobject]@{nonce=[Convert]::ToBase64String($aes.IV);cipher=[Convert]::ToBase64String($cipher);tag=[Convert]::ToBase64String($tag)}
    $hmac.Dispose();$aes.Dispose();return $result
}
function KhoraVault-Decrypt {
    param($Entry,[byte[]]$Key)
    $iv=[Convert]::FromBase64String($Entry.nonce);$cipher=[Convert]::FromBase64String($Entry.cipher);$tag=[Convert]::FromBase64String($Entry.tag)
    $hmac=New-Object Security.Cryptography.HMACSHA256(,[byte[]]$Key[32..63]);$expected=$hmac.ComputeHash($iv+$cipher);$hmac.Dispose()
    if(-not(Test-KhoraBytesEqual -A $tag -B $expected)){throw 'Bóveda: HMAC inválido o llave incorrecta.'}
    $aes=[Security.Cryptography.Aes]::Create();$aes.Key=[byte[]]$Key[0..31];$aes.IV=$iv
    $plain=$aes.CreateDecryptor().TransformFinalBlock($cipher,0,$cipher.Length);$aes.Dispose()
    return [Text.Encoding]::UTF8.GetString($plain)
}
function KhoraVault-ValidateValue {
    param([string]$Name,[string]$Value)
    if($Global:KhoraVaultValidators.ContainsKey($Name)){return [bool]($Value-match$Global:KhoraVaultValidators[$Name])}
    return ($Value.Length-ge4)
}
function Import-KhoraEnvVault {
    param([string[]]$Names)
    $vault=KhoraVault-Load;$available=@($vault.entries.PSObject.Properties.Name)
    $targets=if($Names){@($Names)}else{$available};if($targets.Count-eq0){return @()}
    $missing=@($targets|Where-Object{$available-notcontains$_});if($missing.Count){throw('Variables ausentes en bóveda: '+($missing-join', '))}
    $key=KhoraVault-DeriveKey -MasterSecure (KhoraVault-GetMasterKey) -Salt ([Convert]::FromBase64String($vault.salt))
    $loaded=New-Object 'System.Collections.Generic.List[string]'
    foreach($name in $targets){$value=KhoraVault-Decrypt -Entry $vault.entries.$name -Key $key;[Environment]::SetEnvironmentVariable($name,$value,'Process');$loaded.Add($name);$value=$null}
    $Global:KhoraVaultLoadedNames=@($Global:KhoraVaultLoadedNames+$loaded|Select-Object -Unique);$script:VaultLoadedNames=$Global:KhoraVaultLoadedNames
    return @($loaded)
}
function Set-KhoraEnvVaultVariable {
    param([string]$Name,[switch]$Rotate,[switch]$UseClipboard)
    $vault=KhoraVault-Load;$names=@($vault.entries.PSObject.Properties.Name);if(($names-contains$Name)-and-not$Rotate){return }
    if($UseClipboard){$value=([string](Get-Clipboard -Raw)).Trim();Set-Clipboard -Value' '}else{$value=KhoraVault-SecureToPlain -Secure (Read-Host ('Valor para '+$Name) -AsSecureString)}
    if([string]::IsNullOrWhiteSpace($value)-or-not(KhoraVault-ValidateValue -Name $Name -Value $value)){throw 'Valor de bóveda inválido.'}
    $key=KhoraVault-DeriveKey -MasterSecure (KhoraVault-GetMasterKey) -Salt ([Convert]::FromBase64String($vault.salt));$entry=KhoraVault-Encrypt -PlainText $value -Key $key
    if($names-contains$Name){$vault.entries.$Name=$entry}else{$vault.entries|Add-Member -MemberType NoteProperty -Name $Name -Value $entry}
    KhoraVault-Save -VaultObj $vault;$value=$null
}

function New-KhoraTemporaryVaultAccess {
    param(
        [int]$Minutes = 15,
        [string]$Path = (Join-Path $env:LOCALAPPDATA 'Khora\state\vault-key-temporary.dpapi.json')
    )
    if($Minutes -lt 1 -or $Minutes -gt 60){throw 'La ventana temporal debe ser de 1 a 60 minutos.'}
    $secure=Read-Host 'Llave temporal de la bóveda (no se mostrará)' -AsSecureString
    if($secure.Length -lt 8){throw 'Llave temporal demasiado corta.'}
    $directory=Split-Path -Parent $Path
    New-Item -ItemType Directory -Path $directory -Force|Out-Null
    $payload=[ordered]@{
        expiresAtUtc=[DateTime]::UtcNow.AddMinutes($Minutes).ToString('o')
        protectionScope=$(if($env:KHORA_EP_DATA_PROFILE_MODE -eq 'fila4-profile-tree'){'LocalMachine-v1'}else{'CurrentUser'});secureValue=(KhoraVault-ProtectTemporaryAccessValue -Secure $secure)
    }
    $temp=$Path+'.tmp'
    $payload|ConvertTo-Json -Depth 4|Set-Content -LiteralPath $temp -Encoding UTF8
    Move-Item -LiteralPath $temp -Destination $Path -Force
    Write-Host ('TEMP_VAULT_ACCESS_READY expires='+$payload.expiresAtUtc)
    $secure=$null
}

function Import-KhoraTemporaryVaultAccess {
    param([string]$Path = (Join-Path $env:LOCALAPPDATA 'Khora\state\vault-key-temporary.dpapi.json'))
    if(-not(Test-Path -LiteralPath $Path)){throw 'No existe acceso temporal de bóveda.'}
    $payload=Get-Content -LiteralPath $Path -Raw|ConvertFrom-Json
    $expires=[DateTime]::Parse($payload.expiresAtUtc,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind)
    if([DateTime]::UtcNow -ge $expires){
        Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
        throw 'El acceso temporal de bóveda ha expirado.'
    }
    $Global:KhoraVaultMasterKey=KhoraVault-UnprotectTemporaryAccessValue -Value ([string]$payload.secureValue) -ProtectionScope ([string]$payload.protectionScope)
    Write-Host ('TEMP_VAULT_ACCESS_IMPORTED expires='+$expires.ToString('o'))
    return $expires
}

function Remove-KhoraTemporaryVaultAccess {
    param([string]$Path = (Join-Path $env:LOCALAPPDATA 'Khora\state\vault-key-temporary.dpapi.json'))
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    $Global:KhoraVaultMasterKey=$null
    Clear-KhoraEnvVaultSession
    Write-Host 'TEMP_VAULT_ACCESS_REMOVED'
}

function Rotate-KhoraVaultMasterKey {
    param(
        [string]$BackupPath = ''
    )
    $vault=KhoraVault-Load
    $oldSecure=KhoraVault-GetMasterKey
    $oldKey=KhoraVault-DeriveKey -MasterSecure $oldSecure -Salt ([Convert]::FromBase64String($vault.salt))
    $plaintext=@{}
    try{
        foreach($entry in $vault.entries.PSObject.Properties){
            $plaintext[$entry.Name]=KhoraVault-Decrypt -Entry $entry.Value -Key $oldKey
        }

        $newSecure=Read-Host 'Nueva llave maestra de la bóveda' -AsSecureString
        $confirmSecure=Read-Host 'Repite la nueva llave maestra' -AsSecureString
        $newPlain=KhoraVault-SecureToPlain -Secure $newSecure
        $confirmPlain=KhoraVault-SecureToPlain -Secure $confirmSecure
        try{
            if($newPlain.Length -lt 8){throw 'Nueva llave maestra demasiado corta.'}
            if($newPlain -ne $confirmPlain){throw 'Las llaves maestras nuevas no coinciden.'}
        }finally{
            $confirmPlain=$null
        }

        $salt=New-Object byte[] 16
        [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
        $newKey=KhoraVault-DeriveKey -MasterSecure $newSecure -Salt $salt
        $entries=[ordered]@{}
        foreach($entry in $plaintext.GetEnumerator()){
            $entries[$entry.Key]=KhoraVault-Encrypt -PlainText $entry.Value -Key $newKey
        }

        if([string]::IsNullOrWhiteSpace($BackupPath)){
            $stamp=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
            $BackupPath=$Global:KhoraVaultPath+'.bak-'+$stamp
        }
        Copy-Item -LiteralPath $Global:KhoraVaultPath -Destination $BackupPath -Force

        $rotated=[ordered]@{
            salt=[Convert]::ToBase64String($salt)
            entries=[pscustomobject]$entries
        }
        $tmp=$Global:KhoraVaultPath+'.rotate.tmp'
        [IO.File]::WriteAllText($tmp,($rotated|ConvertTo-Json -Depth 10),(New-Object Text.UTF8Encoding($false)))
        Move-Item -LiteralPath $tmp -Destination $Global:KhoraVaultPath -Force

        $Global:KhoraVaultMasterKey=$newSecure
        Write-Host ('VAULT_MASTER_KEY_ROTATED entries='+$entries.Count+' backup='+$BackupPath)
    }catch{
        Remove-Item -LiteralPath ($Global:KhoraVaultPath+'.rotate.tmp') -Force -ErrorAction SilentlyContinue
        throw
    }finally{
        $plaintext.Clear()
        $newPlain=$null
        $oldKey=$null
    }
}

function Protect-KhoraFile {
    param([string]$InputFile,[string]$OutputFile)
    $plain=[IO.File]::ReadAllBytes($InputFile);$salt=New-Object byte[] 16;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
    $key=KhoraVault-DeriveKey -MasterSecure (KhoraVault-GetMasterKey) -Salt $salt
    $aes=[Security.Cryptography.Aes]::Create();$aes.Key=[byte[]]$key[0..31];$aes.GenerateIV();$cipher=$aes.CreateEncryptor().TransformFinalBlock($plain,0,$plain.Length)
    $magic=[Text.Encoding]::ASCII.GetBytes('KHORAEP1');$hmac=New-Object Security.Cryptography.HMACSHA256(,[byte[]]$key[32..63]);$tag=$hmac.ComputeHash($magic+$salt+$aes.IV+$cipher)
    New-Item -ItemType Directory -Path (Split-Path -Parent $OutputFile) -Force|Out-Null;$stream=[IO.File]::Open($OutputFile,[IO.FileMode]::Create)
    try{$stream.Write($magic,0,8);$stream.Write($salt,0,16);$stream.Write($aes.IV,0,16);$stream.Write($tag,0,32);$stream.Write($cipher,0,$cipher.Length)}finally{$stream.Dispose();$hmac.Dispose();$aes.Dispose();[Array]::Clear($plain,0,$plain.Length)}
}
function Unprotect-KhoraFile {
    param([string]$InputFile,[string]$OutputFile)
    $all=[IO.File]::ReadAllBytes($InputFile);if($all.Length-lt73-or[Text.Encoding]::ASCII.GetString($all,0,8)-ne'KHORAEP1'){throw 'Perfil cifrado inválido.'}
    $salt=[byte[]]$all[8..23];$iv=[byte[]]$all[24..39];$tag=[byte[]]$all[40..71];$cipher=[byte[]]$all[72..($all.Length-1)]
    $key=KhoraVault-DeriveKey -MasterSecure (KhoraVault-GetMasterKey) -Salt $salt;$hmac=New-Object Security.Cryptography.HMACSHA256(,[byte[]]$key[32..63]);$expected=$hmac.ComputeHash([Text.Encoding]::ASCII.GetBytes('KHORAEP1')+$salt+$iv+$cipher)
    if(-not(Test-KhoraBytesEqual -A $tag -B $expected)){throw 'Perfil cifrado: HMAC inválido.'}
    $aes=[Security.Cryptography.Aes]::Create();$aes.Key=[byte[]]$key[0..31];$aes.IV=$iv;$plain=$aes.CreateDecryptor().TransformFinalBlock($cipher,0,$cipher.Length)
    [IO.File]::WriteAllBytes($OutputFile,$plain);$hmac.Dispose();$aes.Dispose();[Array]::Clear($plain,0,$plain.Length)
}
function Clear-KhoraEnvVaultSession {foreach($name in $Global:KhoraVaultLoadedNames){[Environment]::SetEnvironmentVariable($name,$null,'Process')};$Global:KhoraVaultLoadedNames=@();$Global:KhoraVaultMasterKey=$null;[GC]::Collect()}
function Initialize-Khora09EnvVars{}
function Initialize-Khora091EnvVars{}
