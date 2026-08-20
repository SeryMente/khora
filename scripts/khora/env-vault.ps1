# Bóveda compatible con el formato existente y cifrado de perfil.
$Global:KhoraVaultPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\secrets\env-vault.enc.json'))
if(-not(Get-Variable KhoraVaultMasterKey -Scope Global -ErrorAction SilentlyContinue)){$Global:KhoraVaultMasterKey=$null}
if(-not(Get-Variable KhoraVaultLoadedNames -Scope Global -ErrorAction SilentlyContinue)){$Global:KhoraVaultLoadedNames=@()}
$Global:KhoraVaultValidators=@{'NEO4J_URI'='^(neo4j(\+s)?|bolt(\+s)?|https)://\S+$';'NEO4J_USER'='^[A-Za-z0-9\-]{1,64}$';'NEO4J_PASSWORD'='^\S{8,}$'}

function KhoraVault-SecureToPlain {
    param([Security.SecureString]$Secure)
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
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
    if(-not(Test-KhoraBytesEqual -A $tag -B $expected)){throw'Bóveda: HMAC inválido o llave incorrecta.'}
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
    if([string]::IsNullOrWhiteSpace($value)-or-not(KhoraVault-ValidateValue -Name $Name -Value $value)){throw'Valor de bóveda inválido.'}
    $key=KhoraVault-DeriveKey -MasterSecure (KhoraVault-GetMasterKey) -Salt ([Convert]::FromBase64String($vault.salt));$entry=KhoraVault-Encrypt -PlainText $value -Key $key
    if($names-contains$Name){$vault.entries.$Name=$entry}else{$vault.entries|Add-Member -MemberType NoteProperty -Name $Name -Value $entry}
    KhoraVault-Save -VaultObj $vault;$value=$null
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
    $all=[IO.File]::ReadAllBytes($InputFile);if($all.Length-lt73-or[Text.Encoding]::ASCII.GetString($all,0,8)-ne'KHORAEP1'){throw'Perfil cifrado inválido.'}
    $salt=[byte[]]$all[8..23];$iv=[byte[]]$all[24..39];$tag=[byte[]]$all[40..71];$cipher=[byte[]]$all[72..($all.Length-1)]
    $key=KhoraVault-DeriveKey -MasterSecure (KhoraVault-GetMasterKey) -Salt $salt;$hmac=New-Object Security.Cryptography.HMACSHA256(,[byte[]]$key[32..63]);$expected=$hmac.ComputeHash([Text.Encoding]::ASCII.GetBytes('KHORAEP1')+$salt+$iv+$cipher)
    if(-not(Test-KhoraBytesEqual -A $tag -B $expected)){throw'Perfil cifrado: HMAC inválido.'}
    $aes=[Security.Cryptography.Aes]::Create();$aes.Key=[byte[]]$key[0..31];$aes.IV=$iv;$plain=$aes.CreateDecryptor().TransformFinalBlock($cipher,0,$cipher.Length)
    [IO.File]::WriteAllBytes($OutputFile,$plain);$hmac.Dispose();$aes.Dispose();[Array]::Clear($plain,0,$plain.Length)
}
function Clear-KhoraEnvVaultSession {foreach($name in $Global:KhoraVaultLoadedNames){[Environment]::SetEnvironmentVariable($name,$null,'Process')};$Global:KhoraVaultLoadedNames=@();$Global:KhoraVaultMasterKey=$null;[GC]::Collect()}
function Initialize-Khora09EnvVars{}
function Initialize-Khora091EnvVars{}
