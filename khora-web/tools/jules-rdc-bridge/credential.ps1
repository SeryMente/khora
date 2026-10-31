[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Store","Load","Status","Remove")]
    [string]$Action
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$webRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$repoRoot = Split-Path -Parent $webRoot
$secretDir = Join-Path $repoRoot ".khora-local\jules-rdc-bridge"
$secretFile = Join-Path $secretDir "oauth-refresh.dpapi"

function Set-PrivateDirectoryAcl {
    param([Parameter(Mandatory=$true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }

    $acl = New-Object System.Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $systemSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-18")
    $inheritance = [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
    $rights = [System.Security.AccessControl.FileSystemRights]::FullControl

    foreach ($sid in @($currentSid, $systemSid)) {
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $sid, $rights, $inheritance,
            [System.Security.AccessControl.PropagationFlags]::None,
            [System.Security.AccessControl.AccessControlType]::Allow
        )
        [void]$acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $Path -AclObject $acl
}

function Convert-SecureStringToPlainText {
    param([Parameter(Mandatory=$true)][Security.SecureString]$SecureValue)
    $ptr = [IntPtr]::Zero
    try {
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        if ($ptr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        }
    }
}

switch ($Action) {
    "Store" {
        $plain = $null
        $secure = $null
        $temporary = $null
        try {
            $plain = [Console]::In.ReadToEnd()
            if ([string]::IsNullOrWhiteSpace($plain) -or $plain.Length -gt 12000) {
                throw "OAUTH_CREDENTIAL_INPUT_INVALID"
            }
            $record = $plain | ConvertFrom-Json -ErrorAction Stop
            if (-not ($record.client_id -is [string]) -or
                -not $record.client_id.StartsWith("khora-dcr.", [StringComparison]::Ordinal) -or
                -not ($record.refresh_token -is [string]) -or
                $record.refresh_token.Length -lt 20 -or
                $record.refresh_token.Length -gt 4096 -or
                $record.scope -ne "jules:read jules:write offline_access") {
                throw "OAUTH_CREDENTIAL_FIELDS_INVALID"
            }

            Set-PrivateDirectoryAcl -Path $secretDir
            $secure = ConvertTo-SecureString -String $plain -AsPlainText -Force
            $encrypted = ConvertFrom-SecureString -SecureString $secure
            $temporary = $secretFile + "." + [Guid]::NewGuid().ToString("N") + ".tmp"
            [IO.File]::WriteAllText($temporary, $encrypted, [Text.Encoding]::ASCII)
            Move-Item -LiteralPath $temporary -Destination $secretFile -Force

            $readBack = [IO.File]::ReadAllText($secretFile, [Text.Encoding]::ASCII)
            if ($readBack -cne $encrypted) {
                throw "OAUTH_DPAPI_CIPHERTEXT_READBACK_MISMATCH"
            }
            $verifySecure = ConvertTo-SecureString -String $readBack
            try {
                $verifyPlain = Convert-SecureStringToPlainText -SecureValue $verifySecure
                if ($verifyPlain -cne $plain) {
                    throw "OAUTH_DPAPI_PLAINTEXT_READBACK_MISMATCH"
                }
                $verifyPlain = $null
            }
            finally {
                if ($verifySecure) { $verifySecure.Dispose() }
            }

            [Console]::Out.Write("OK|DPAPI_CURRENT_USER|READBACK_OK")
        }
        catch {
            if ($temporary -and (Test-Path -LiteralPath $temporary -PathType Leaf)) {
                Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
            }
            throw
        }
        finally {
            if ($secure) { $secure.Dispose() }
            $plain = $null
            $record = $null
        }
    }

    "Load" {
        if (-not (Test-Path -LiteralPath $secretFile -PathType Leaf)) {
            throw "OAUTH_CREDENTIAL_MISSING"
        }
        $secure = $null
        try {
            $encrypted = [IO.File]::ReadAllText($secretFile, [Text.Encoding]::ASCII)
            $secure = ConvertTo-SecureString -String $encrypted
            $plain = Convert-SecureStringToPlainText -SecureValue $secure
            [Console]::Out.Write($plain)
            $plain = $null
        }
        finally {
            if ($secure) { $secure.Dispose() }
        }
    }

    "Status" {
        if (-not (Test-Path -LiteralPath $secretFile -PathType Leaf)) {
            [Console]::Out.Write("OAUTH_REQUIRED")
            exit 2
        }
        $secure = $null
        try {
            $encrypted = [IO.File]::ReadAllText($secretFile, [Text.Encoding]::ASCII)
            $secure = ConvertTo-SecureString -String $encrypted
            $plain = Convert-SecureStringToPlainText -SecureValue $secure
            $record = $plain | ConvertFrom-Json -ErrorAction Stop
            if (-not ($record.client_id -is [string]) -or
                -not $record.client_id.StartsWith("khora-dcr.", [StringComparison]::Ordinal) -or
                -not ($record.refresh_token -is [string]) -or
                $record.scope -ne "jules:read jules:write offline_access") {
                throw "OAUTH_CREDENTIAL_INVALID"
            }
            [Console]::Out.Write("OK|DPAPI_CURRENT_USER|OAUTH_CREDENTIAL_READABLE")
            $plain = $null
            $record = $null
        }
        finally {
            if ($secure) { $secure.Dispose() }
        }
    }

    "Remove" {
        if (Test-Path -LiteralPath $secretFile -PathType Leaf) {
            Remove-Item -LiteralPath $secretFile -Force
        }
        [Console]::Out.Write("OK|LOCAL_OAUTH_CREDENTIAL_REMOVED")
    }
}
