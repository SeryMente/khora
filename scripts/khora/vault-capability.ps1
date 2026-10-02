#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Issue,
    [switch]$Read,
    [switch]$Revoke,
    [switch]$RevokeAll,
    [string]$Token,
    [string[]]$Names = @("*"),
    [ValidateRange(5, 1440)]
    [int]$Minutes = 60,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'env-vault.ps1')

$CapabilityRoot = if ($env:KHORA_VAULT_CAPABILITY_ROOT) { $env:KHORA_VAULT_CAPABILITY_ROOT } else { Join-Path $env:LOCALAPPDATA 'Khora\vault-capabilities' }
$CapabilitySchema = 'khora-vault-capability/v1'

function Ensure-KhoraCapabilityRoot {
    New-Item -ItemType Directory -Path $CapabilityRoot -Force | Out-Null
}

function ConvertTo-KhoraBase64Url {
    param([byte[]]$Bytes)
    return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function New-KhoraOpaqueToken {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) }
    finally { $rng.Dispose() }
    return 'kvc1_' + (ConvertTo-KhoraBase64Url -Bytes $bytes)
}

function Get-KhoraTokenHash {
    param([Parameter(Mandatory)][string]$Value)
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
        return (($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join '')
    }
    finally { $sha.Dispose() }
}

function Protect-KhoraCapabilityKey {
    param([Parameter(Mandatory)][byte[]]$Key)
    $base64 = [Convert]::ToBase64String($Key)
    $secure = ConvertTo-SecureString $base64 -AsPlainText -Force
    try { return ($secure | ConvertFrom-SecureString) }
    finally {
        $base64 = $null
        $secure = $null
    }
}

function Unprotect-KhoraCapabilityKey {
    param([Parameter(Mandatory)][string]$ProtectedValue)
    $secure = ConvertTo-SecureString $ProtectedValue
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $base64 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        return [Convert]::FromBase64String($base64)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $base64 = $null
        $secure = $null
    }
}

function Get-KhoraCapabilityPath {
    param([Parameter(Mandatory)][string]$CapabilityToken)
    Ensure-KhoraCapabilityRoot
    $hash = Get-KhoraTokenHash -Value $CapabilityToken
    return Join-Path $CapabilityRoot ($hash + '.json')
}

function Remove-KhoraExpiredCapabilities {
    Ensure-KhoraCapabilityRoot
    $now = [DateTime]::UtcNow
    foreach ($file in @(Get-ChildItem -LiteralPath $CapabilityRoot -Filter '*.json' -File -ErrorAction SilentlyContinue)) {
        try {
            $record = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
            if ([DateTime]::Parse([string]$record.expiresUtc).ToUniversalTime() -le $now) {
                Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
        }
    }
}

function Resolve-KhoraCapabilityScope {
    param([Parameter(Mandatory)][string[]]$RequestedNames)
    if ($RequestedNames.Count -eq 0) { return @("*") }
    return @($RequestedNames | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
}

function Test-KhoraCapabilityScope {
    param(
        [Parameter(Mandatory)][string[]]$GrantedNames,
        [Parameter(Mandatory)][string[]]$RequestedNames,
        [Parameter(Mandatory)][string[]]$AvailableNames
    )
    $requested = Resolve-KhoraCapabilityScope -RequestedNames $RequestedNames
    if ($requested -contains '*') {
        $effective = if ($GrantedNames -contains '*') { $AvailableNames } else { $GrantedNames }
    } elseif ($GrantedNames -contains '*') {
        $effective = $requested
    } else {
        $unknown = @($requested | Where-Object { $GrantedNames -notcontains $_ })
        if ($unknown.Count) {
            throw ('CAPABILITY_SCOPE_DENIED:' + ($unknown -join ','))
        }
        $effective = $requested
    }
    return @($effective | Sort-Object -Unique)
}

function New-KhoraVaultCapability {
    param(
        [Parameter(Mandatory)][string[]]$GrantedNames,
        [ValidateRange(5, 1440)]
        [int]$LifetimeMinutes = 60
    )

    Remove-KhoraExpiredCapabilities
    $vault = KhoraVault-Load
    $availableNames = @($vault.entries.PSObject.Properties.Name | Sort-Object)
    if ($availableNames.Count -eq 0) { throw 'La bóveda canónica está vacía.' }

    $requestedScope = Resolve-KhoraCapabilityScope -RequestedNames $GrantedNames
    $fullScope = $requestedScope -contains '*'
    $effectiveNames = if ($fullScope) { $availableNames } else {
        $unknown = @($requestedScope | Where-Object { $availableNames -notcontains $_ })
        if ($unknown.Count) { throw ('Variables ausentes en bóveda: ' + ($unknown -join ', ')) }
        $requestedScope
    }
    $scope = @($effectiveNames | Sort-Object -Unique)

    $master = KhoraVault-GetMasterKey
    $vaultKey = KhoraVault-DeriveKey -MasterSecure $master -Salt ([Convert]::FromBase64String($vault.salt))

    foreach ($name in $effectiveNames) {
        $probe = KhoraVault-Decrypt -Entry $vault.entries.$name -Key $vaultKey
        $probe = $null
    }

    $tokenValue = New-KhoraOpaqueToken
    $issued = [DateTime]::UtcNow
    $expires = $issued.AddMinutes($LifetimeMinutes)
    $record = [ordered]@{
        schema = $CapabilitySchema
        tokenHash = Get-KhoraTokenHash -Value $tokenValue
        issuedUtc = $issued.ToString('o')
        expiresUtc = $expires.ToString('o')
        permission = 'read'
        scopeMode = if ($fullScope) { 'snapshot_all' } else { 'explicit' }
        scope = $scope
        vaultSalt = [string]$vault.salt
        protectedVaultKey = Protect-KhoraCapabilityKey -Key $vaultKey
        revokedUtc = $null
    }
    $path = Get-KhoraCapabilityPath -CapabilityToken $tokenValue
    $temporary = $path + '.tmp'
    try {
        $record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temporary -Encoding UTF8
        Move-Item -LiteralPath $temporary -Destination $path -Force
    }
    finally {
        if (Test-Path -LiteralPath $temporary) {
            Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
        }
        $vaultKey = $null
        $master = $null
    }

    [ordered]@{
        token = $tokenValue
        issuedUtc = $issued.ToString('o')
        expiresUtc = $expires.ToString('o')
        expiresInMinutes = $LifetimeMinutes
        scope = $scope
        permission = 'read'
    }
}

function Get-KhoraVaultByCapability {
    param(
        [Parameter(Mandatory)][string]$CapabilityToken,
        [string[]]$RequestedNames = @("*")
    )

    Remove-KhoraExpiredCapabilities
    if ($CapabilityToken -notmatch '^kvc1_[A-Za-z0-9_-]{30,}$') {
        throw 'CAPABILITY_FORMAT_INVALID'
    }

    $path = Get-KhoraCapabilityPath -CapabilityToken $CapabilityToken
    if (-not(Test-Path -LiteralPath $path)) { throw 'CAPABILITY_INVALID_OR_EXPIRED' }

    $record = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    $expectedHash = Get-KhoraTokenHash -Value $CapabilityToken
    if ([string]$record.tokenHash -ne $expectedHash) { throw 'CAPABILITY_INVALID' }

    $expiresUtc = [DateTime]::Parse([string]$record.expiresUtc).ToUniversalTime()
    if ($expiresUtc -le [DateTime]::UtcNow) {
        Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        throw 'CAPABILITY_EXPIRED'
    }

    if ([string]$record.permission -ne 'read') { throw 'CAPABILITY_PERMISSION_INVALID' }

    $vault = KhoraVault-Load
    if ([string]$vault.salt -ne [string]$record.vaultSalt) {
        Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        throw 'CAPABILITY_REVOKED_BY_VAULT_ROTATION'
    }

    $availableNames = @($vault.entries.PSObject.Properties.Name | Sort-Object)
    $grantedNames = @($record.scope | ForEach-Object { [string]$_ })
    $effectiveNames = Test-KhoraCapabilityScope -GrantedNames $grantedNames -RequestedNames $RequestedNames -AvailableNames $availableNames

    $vaultKey = Unprotect-KhoraCapabilityKey -ProtectedValue ([string]$record.protectedVaultKey)
    $results = [ordered]@{}
    try {
        foreach ($name in $effectiveNames) {
            if ($availableNames -notcontains $name) { throw ('VARIABLE_NOT_FOUND:' + $name) }
            $results[$name] = KhoraVault-Decrypt -Entry $vault.entries.$name -Key $vaultKey
        }
    }
    finally {
        $vaultKey = $null
    }
    return [pscustomobject]@{
        schema = $CapabilitySchema
        expiresUtc = $expiresUtc.ToString('o')
        permission = 'read'
        scope = $effectiveNames
        variables = [pscustomobject]$results
    }
}

function Revoke-KhoraVaultCapability {
    param([Parameter(Mandatory)][string]$CapabilityToken)
    $path = Get-KhoraCapabilityPath -CapabilityToken $CapabilityToken
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
        return $true
    }
    return $false
}

function Revoke-AllKhoraVaultCapabilities {
    Ensure-KhoraCapabilityRoot
    $removed = 0
    foreach ($file in @(Get-ChildItem -LiteralPath $CapabilityRoot -Filter '*.json' -File -ErrorAction SilentlyContinue)) {
        Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
        $removed++
    }
    return $removed
}

if ($MyInvocation.InvocationName -eq '.') { return }

if ($Issue) {
    $result = New-KhoraVaultCapability -GrantedNames $Names -LifetimeMinutes $Minutes
    Write-Host 'KHORA · CAPACIDAD TEMPORAL DE BÓVEDA CANÓNICA' -ForegroundColor Cyan
    Write-Host ('Permiso: ' + $result.permission) -ForegroundColor DarkGray
    Write-Host ('Expira UTC: ' + $result.expiresUtc) -ForegroundColor Yellow
    Write-Host ('Alcance: ' + (($result.scope) -join ', ')) -ForegroundColor DarkGray
    Write-Host ''
    Write-Host ('TOKEN: ' + $result.token) -ForegroundColor Green
    Write-Host ''
    Write-Host 'El token no se guarda en texto plano. La llave maestra tampoco sale de Windows.' -ForegroundColor DarkGray
    exit 0
}

if ($Read) {
    $data = Get-KhoraVaultByCapability -CapabilityToken $Token -RequestedNames $Names
    if ($Json) {
        $data | ConvertTo-Json -Depth 12 -Compress
    } else {
        Write-Host ('Vigente hasta: ' + $data.expiresUtc) -ForegroundColor Yellow
        foreach ($property in $data.variables.PSObject.Properties) {
            Write-Host ($property.Name + '=' + [string]$property.Value)
        }
    }
    exit 0
}

if ($Revoke) {
    if (-not $Token) { throw 'Para revocar una capacidad se requiere -Token.' }
    if (Revoke-KhoraVaultCapability -CapabilityToken $Token) {
        Write-Host 'CAPABILITY_REVOKED'
    } else {
        Write-Host 'CAPABILITY_NOT_FOUND'
    }
    exit 0
}

if ($RevokeAll) {
    Write-Host ('CAPABILITIES_REVOKED=' + (Revoke-AllKhoraVaultCapabilities))
    exit 0
}

throw 'Usa -Issue, -Read, -Revoke o -RevokeAll.'