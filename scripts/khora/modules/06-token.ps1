# Secretos efímeros protegidos por Protección de Datos de Windows.
function Import-KhoraDpapi { param([string]$Path) if(-not(Test-Path $Path)){throw "Falta $Path"};return ((Get-Content -LiteralPath $Path -Raw).Trim()|ConvertTo-SecureString) }
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
function Get-KhoraGitHubAppTokenSecure {
    if($script:TokSecure-and$script:GitHubAppTokenExpiresAt-and$script:GitHubAppTokenExpiresAt-gt[DateTime]::UtcNow.AddMinutes(5)){return $script:TokSecure}
    $khoraSecure=$script:KhoraTokenSecure
    $khoraPointer=[IntPtr]::Zero;$khoraPlain=$null;$manifest=$null;$headers=$null;$response=$null;$token=$null
    try{
        if(-not$khoraSecure){
            $guardian=Join-Path $STATE_DIR 'khora-token.guardian.dpapi'
            if(-not(Test-Path -LiteralPath $guardian)){throw 'KHORA_SESSION_TOKEN_UNAVAILABLE'}
            $khoraSecure=Import-KhoraDpapi $guardian
        }
        $khoraPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($khoraSecure)
        $khoraPlain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($khoraPointer)
        $manifestPath=Join-Path $STATE_DIR 'session-manifest.json'
        if(-not(Test-Path -LiteralPath $manifestPath)){throw 'KHORA_SESSION_MANIFEST_MISSING'}
        $manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json
        $apiBase=[string]$manifest.khoraApiBase
        $uri=[uri]$apiBase
        if($uri.Scheme-ne'https'-or$uri.Query-or$uri.Fragment-or$uri.AbsolutePath.TrimEnd('/')-ne'/api/ep'){throw 'KHORA_API_BASE_INVALID'}
        $headers=@{Authorization=('Bearer '+$khoraPlain);Accept='application/json';'Content-Type'='application/json';'Cache-Control'='no-store';'User-Agent'='khora-ep-runtime/1'}
        $response=Invoke-RestMethod -Method Post -Uri ($apiBase.TrimEnd('/')+'/github-token') -Headers $headers -Body '{}' -TimeoutSec 45 -ErrorAction Stop
        $token=[string]$response.token
        $expiry=[DateTimeOffset]::MinValue
        if($token-notmatch'^ghs_[A-Za-z0-9_]{20,}$'-or-not[DateTimeOffset]::TryParse([string]$response.expiresAt,[ref]$expiry)-or$expiry.UtcDateTime-le[DateTime]::UtcNow.AddMinutes(2)){throw 'GITHUB_APP_TOKEN_CONTRACT_INVALID'}
        $script:TokSecure=ConvertTo-SecureString $token -AsPlainText -Force
        $script:GitHubAppTokenExpiresAt=$expiry.UtcDateTime
        return $script:TokSecure
    }finally{
        if($khoraPointer-ne[IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($khoraPointer)}
        if($khoraSecure-and-not[object]::ReferenceEquals($khoraSecure,$script:KhoraTokenSecure)){$khoraSecure.Dispose()}
        $khoraPlain=$null;$manifest=$null;$headers=$null;$response=$null;$token=$null
    }
}
function Invoke-WithToken {
    param([ScriptBlock]$Action)
    $active=Get-KhoraGitHubAppTokenSecure
    if(-not$active){throw 'Credencial temporal de GitHub no disponible.'}
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($active)
    try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer);return (& $Action $plain)}
    finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$plain=$null}
}
function Test-KhoraGitHubToken {
    try {
        return [bool](Invoke-WithToken {param($token)
            $headers=@{Authorization=('Bearer '+$token);'User-Agent'='khora-ep-medio-v2';Accept='application/vnd.github+json'}
            $access=Invoke-RestMethod -Uri 'https://api.github.com/installation/repositories?per_page=100' -Headers $headers -TimeoutSec 20
            $repo=@($access.repositories|Where-Object{[string]$_.full_name -ieq 'SeryMente/khora'}|Select-Object -First 1)
            return ($repo.Count-eq1-and$repo[0].permissions.push-eq$true)
        })
    } catch { return $false }
}
function Clear-KhoraSensitiveMemory { param([switch]$KeepKhora) foreach($name in @($script:VaultLoadedNames+@('GH_TOKEN','GITHUB_TOKEN','VERCEL_TOKEN','KHORA_VAULT_PASSWORD'))){if($name){[Environment]::SetEnvironmentVariable([string]$name,$null,'Process')}};$script:TokSecure=$null;$script:GitHubAppTokenExpiresAt=$null;$Global:KhoraVaultMasterKey=$null;$script:VaultLoadedNames=@();if(-not$KeepKhora){$script:KhoraTokenSecure=$null};[GC]::Collect();[GC]::WaitForPendingFinalizers() }
function Save-TokenSnapshot { throw 'Persistencia de tokens prohibida.' }
function Test-TokenSnapshotValid { return $false }
function Get-PersistedToken { return $null }
function Watch-ClipboardToken { throw 'Portapapeles solo en bootstrap.' }
