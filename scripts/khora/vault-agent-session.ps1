# @l0 L0-002-R · @req KA-00/REQ-CHAT · @acr ACR-2.1
# Sesión temporal de capacidad para trabajo asistido sobre la bóveda canónica.
# El token es un portador efímero: solo se guarda su SHA-256. La llave maestra queda
# protegida por DPAPI para el usuario Windows actual y nunca se escribe en claro.

$script:KhoraVaultAgentPath = Join-Path $env:LOCALAPPDATA 'Khora\state\vault-agent-session.json'
$script:KhoraVaultAgentVersion = 1

function Get-KhoraVaultAgentTokenHash {
    param([Parameter(Mandatory)][string]$Token)

    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Token)
        return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
}

function New-KhoraVaultAgentToken {
    [CmdletBinding()]
    param(
        [ValidateRange(1,60)]
        [int]$Minutes = 60
    )

    . (Join-Path $PSScriptRoot 'env-vault.ps1')

    $vault = KhoraVault-Load
    $available = @($vault.entries.PSObject.Properties.Name)

    # Solicita la llave maestra al operador. Si hay entradas, valida la llave
    # intentando descifrar una de ellas antes de crear la capacidad temporal.
    $master = KhoraVault-GetMasterKey
    try {
        if ($available.Count -gt 0) {
            $testName = [string]$available[0]
            $key = KhoraVault-DeriveKey -MasterSecure $master -Salt ([Convert]::FromBase64String($vault.salt))
            [void](KhoraVault-Decrypt -Entry $vault.entries.$testName -Key $key)
        }

        $random = New-Object byte[] 32
        [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($random)
        try {
            $token = [Convert]::ToBase64String($random).TrimEnd('=').Replace('+','-').Replace('/','_')
        }
        finally {
            [Array]::Clear($random, 0, $random.Length)
        }

        $expires = [DateTime]::UtcNow.AddMinutes($Minutes)
        $payload = [ordered]@{
            version      = $script:KhoraVaultAgentVersion
            createdAtUtc = [DateTime]::UtcNow.ToString('o')
            expiresAtUtc = $expires.ToString('o')
            tokenSha256  = Get-KhoraVaultAgentTokenHash -Token $token
            scope        = 'canonical-vault'
            secureMaster = ($master | ConvertFrom-SecureString)
        }

        $dir = Split-Path -Parent $script:KhoraVaultAgentPath
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        $tmp = $script:KhoraVaultAgentPath + '.tmp'
        $payload | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $tmp -Encoding UTF8
        Move-Item -LiteralPath $tmp -Destination $script:KhoraVaultAgentPath -Force

        Write-Host 'KHORA_VAULT_AGENT_READY'
        Write-Host ('TOKEN=' + $token)
        Write-Host ('EXPIRES_UTC=' + $expires.ToString('o'))
        Write-Host ('SCOPE=canonical-vault')
    }
    finally {
        $master = $null
        $Global:KhoraVaultMasterKey = $null
    }
}

function Import-KhoraVaultAgentToken {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Token,
        [string[]]$Names
    )

    . (Join-Path $PSScriptRoot 'env-vault.ps1')

    if (-not (Test-Path -LiteralPath $script:KhoraVaultAgentPath)) {
        throw 'No existe una sesión temporal de bóveda.'
    }

    $session = Get-Content -LiteralPath $script:KhoraVaultAgentPath -Raw | ConvertFrom-Json
    $expires = [DateTime]::Parse(
        $session.expiresAtUtc,
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::RoundtripKind
    )

    if ([DateTime]::UtcNow -ge $expires) {
        Remove-Item -LiteralPath $script:KhoraVaultAgentPath -Force -ErrorAction SilentlyContinue
        throw 'El token de bóveda ha expirado.'
    }

    $actualHash = Get-KhoraVaultAgentTokenHash -Token $Token
    if ($actualHash -ne [string]$session.tokenSha256) {
        throw 'Token de bóveda inválido.'
    }

    $Global:KhoraVaultMasterKey = ([string]$session.secureMaster | ConvertTo-SecureString)
    try {
        $loaded = if ($Names) {
            Import-KhoraEnvVault -Names $Names
        } else {
            Import-KhoraEnvVault
        }
        $script:KhoraVaultAgentLoadedNames = @($loaded)
        Write-Host ('KHORA_VAULT_IMPORTED expires=' + $expires.ToString('o'))
        return @($loaded)
    }
    catch {
        $Global:KhoraVaultMasterKey = $null
        throw
    }
}

function Test-KhoraVaultAgentToken {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Token)

    if (-not (Test-Path -LiteralPath $script:KhoraVaultAgentPath)) {
        throw 'No existe una sesión temporal de bóveda.'
    }

    $session = Get-Content -LiteralPath $script:KhoraVaultAgentPath -Raw | ConvertFrom-Json
    $expires = [DateTime]::Parse(
        $session.expiresAtUtc,
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::RoundtripKind
    )

    [pscustomobject]@{
        Valid       = ([DateTime]::UtcNow -lt $expires -and (Get-KhoraVaultAgentTokenHash -Token $Token) -eq [string]$session.tokenSha256)
        ExpiresUtc  = $expires.ToString('o')
        Scope       = [string]$session.scope
        Version     = [int]$session.version
    }
}

function Remove-KhoraVaultAgentToken {
    [CmdletBinding()]
    param()

    if (Test-Path -LiteralPath $script:KhoraVaultAgentPath) {
        Remove-Item -LiteralPath $script:KhoraVaultAgentPath -Force -ErrorAction SilentlyContinue
    }

    if (Get-Command Clear-KhoraEnvVaultSession -ErrorAction SilentlyContinue) {
        Clear-KhoraEnvVaultSession
    } else {
        $Global:KhoraVaultMasterKey = $null
    }

    Write-Host 'KHORA_VAULT_AGENT_REVOKED'
}
