# Secretos efímeros protegidos por Protección de Datos de Windows.
function Import-KhoraDpapi { param([string]$Path) if(-not(Test-Path $Path)){throw"Falta $Path"};return((Get-Content -LiteralPath $Path -Raw).Trim()|ConvertTo-SecureString) }
function Import-KhoraBootstrapSecrets {
    $Global:KhoraVaultMasterKey=Import-KhoraDpapi (Join-Path $STATE_DIR 'vault-key.dpapi')
    $script:TokSecure=Import-KhoraDpapi (Join-Path $STATE_DIR 'github-token.dpapi')
    $script:KhoraTokenSecure=Import-KhoraDpapi (Join-Path $STATE_DIR 'khora-token.dpapi')
    Remove-Item -LiteralPath (Join-Path $STATE_DIR 'vault-key.dpapi'),(Join-Path $STATE_DIR 'github-token.dpapi'),(Join-Path $STATE_DIR 'khora-token.dpapi') -Force
}
function Import-KhoraGuardianSecrets {
    if(-not$script:KhoraTokenSecure-and(Test-Path(Join-Path $STATE_DIR 'khora-token.guardian.dpapi'))){$script:KhoraTokenSecure=Import-KhoraDpapi (Join-Path $STATE_DIR 'khora-token.guardian.dpapi')}
    if(-not$script:TokSecure-and(Test-Path(Join-Path $STATE_DIR 'github-token.guardian.dpapi'))){$script:TokSecure=Import-KhoraDpapi (Join-Path $STATE_DIR 'github-token.guardian.dpapi')}
    if(-not$Global:KhoraVaultMasterKey-and(Test-Path(Join-Path $STATE_DIR 'vault-key.guardian.dpapi'))){$Global:KhoraVaultMasterKey=Import-KhoraDpapi (Join-Path $STATE_DIR 'vault-key.guardian.dpapi')}
}
function Invoke-WithToken { param([ScriptBlock]$Action) if(-not$script:TokSecure){throw'Sin Personal Access Token de GitHub.'};$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($script:TokSecure);try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer);return(& $Action $plain)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$plain=$null} }
function Test-KhoraGitHubToken { try{return[bool](Invoke-WithToken {param($token)$headers=@{Authorization=('Bearer '+$token);'User-Agent'='khora-ep-medio-v1';Accept='application/vnd.github+json'};$user=Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers -TimeoutSec 20;$repo=Invoke-RestMethod -Uri 'https://api.github.com/repos/SeryMente/khora' -Headers $headers -TimeoutSec 20;return($user.login-and($repo.permissions.push-or$repo.permissions.maintain-or$repo.permissions.admin))})}catch{return$false} }
function Clear-KhoraSensitiveMemory { param([switch]$KeepKhora) foreach($name in @($script:VaultLoadedNames+@('GH_TOKEN','GITHUB_TOKEN','VERCEL_TOKEN','KHORA_VAULT_PASSWORD'))){if($name){[Environment]::SetEnvironmentVariable([string]$name,$null,'Process')}};$script:TokSecure=$null;$Global:KhoraVaultMasterKey=$null;$script:VaultLoadedNames=@();if(-not$KeepKhora){$script:KhoraTokenSecure=$null};[GC]::Collect();[GC]::WaitForPendingFinalizers() }
function Save-TokenSnapshot { throw 'Persistencia de tokens prohibida.' }
function Test-TokenSnapshotValid { return $false }
function Get-PersistedToken { return $null }
function Watch-ClipboardToken { throw 'Portapapeles solo en bootstrap.' }
