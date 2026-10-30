[CmdletBinding()]
param(
    [ValidateSet("Setup","Start","Status","Remove","Help")]
    [string]$Action = "Help"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$webRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$repoRoot = Split-Path -Parent $webRoot
$secretDir = Join-Path $repoRoot ".khora-local\jules-rdc-bridge"
$secretFile = Join-Path $secretDir "bearer.dpapi"
$bridgeFile = Join-Path $PSScriptRoot "bridge.mjs"
$packageFile = Join-Path $webRoot "node_modules\@modelcontextprotocol\sdk\package.json"

function Set-BridgeSecretDirectoryAcl {
    param([Parameter(Mandatory=$true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }

    $acl = New-Object System.Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)

    $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $systemSid = New-Object Security.Principal.SecurityIdentifier("S-1-5-18")
    $inheritance = [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
    $rights = [System.Security.AccessControl.FileSystemRights]::FullControl

    $ownerRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $currentSid, $rights, $inheritance,
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow
    )
    $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $systemSid, $rights, $inheritance,
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow
    )

    [void]$acl.AddAccessRule($ownerRule)
    [void]$acl.AddAccessRule($systemRule)
    Set-Acl -LiteralPath $Path -AclObject $acl
}

function Show-BridgeHelp {
    @"
KHORA · Puente Jules por RDC

Setup  Guarda el Bearer de Khora mediante DPAPI CurrentUser (entrada oculta).
Start  Abre una conexión MCP remota y escucha órdenes JSON por stdin.
Status Verifica que la credencial local se puede descifrar bajo este usuario.
Remove Elimina la copia DPAPI local; NO revoca el Bearer remoto.

Ruta de credencial: .khora-local\jules-rdc-bridge\bearer.dpapi
Endpoint: https://khora-web.vercel.app/api/mcp
No abre puertos locales. La API key de Jules permanece en Khora Production.
"@
}

switch ($Action) {
    "Help" {
        Show-BridgeHelp
        exit 0
    }

    "Setup" {
        $secure = $null
        $pointer = [IntPtr]::Zero
        $plain = $null
        $temporary = $null
        try {
            if (Test-Path -LiteralPath $secretFile -PathType Leaf) {
                $replace = Read-Host "Ya existe una credencial local. ¿Reemplazarla? (S/N)"
                if ($replace -notmatch '^(?i:s|si|sí|y|yes)$') {
                    Write-Output "CANCELLED"
                    exit 0
                }
            }

            $secure = Read-Host "Pega el token khora_mcp_v1_ de Khora (entrada oculta)" -AsSecureString
            if ($null -eq $secure -or $secure.Length -lt 48 -or $secure.Length -gt 4096) {
                throw "BEARER_FORMAT_INVALID"
            }

            $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
            if (-not $plain.StartsWith("khora_mcp_v1_", [StringComparison]::Ordinal) -or $plain -match '\s') {
                throw "BEARER_FORMAT_INVALID"
            }

            Set-BridgeSecretDirectoryAcl -Path $secretDir
            $encrypted = ConvertFrom-SecureString -SecureString $secure
            $temporary = $secretFile + "." + [Guid]::NewGuid().ToString("N") + ".tmp"
            Set-Content -LiteralPath $temporary -Value $encrypted -Encoding ASCII -NoNewline
            Move-Item -LiteralPath $temporary -Destination $secretFile -Force
            $readBack = Get-Content -LiteralPath $secretFile -Raw -ErrorAction Stop
            if ($readBack.Trim() -cne $encrypted) {
                throw "DPAPI_READBACK_MISMATCH"
            }

            Write-Output "OK | DPAPI_CURRENT_USER | READBACK_OK | Bearer almacenado cifrado"
        }
        catch {
            if ($temporary -and (Test-Path -LiteralPath $temporary)) {
                Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
            }
            throw
        }
        finally {
            if ($pointer -ne [IntPtr]::Zero) {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
            }
            if ($secure) { $secure.Dispose() }
            $plain = $null
        }
        exit 0
    }

    "Status" {
        if (-not (Test-Path -LiteralPath $secretFile -PathType Leaf)) {
            Write-Output "MISSING | Ejecuta -Action Setup después de emitir un Bearer Jules-RDC en Khora."
            exit 2
        }

        $secure = $null
        $pointer = [IntPtr]::Zero
        $plain = $null
        try {
            $encrypted = Get-Content -LiteralPath $secretFile -Raw -ErrorAction Stop
            $secure = ConvertTo-SecureString -String $encrypted.Trim()
            $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
            if (-not $plain.StartsWith("khora_mcp_v1_", [StringComparison]::Ordinal)) {
                throw "DPAPI_CREDENTIAL_INVALID"
            }
            Write-Output "OK | DPAPI_CURRENT_USER | CREDENTIAL_DECRYPTS | token no mostrado"
        }
        finally {
            if ($pointer -ne [IntPtr]::Zero) {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
            }
            if ($secure) { $secure.Dispose() }
            $plain = $null
        }
        exit 0
    }

    "Remove" {
        if (Test-Path -LiteralPath $secretFile -PathType Leaf) {
            Remove-Item -LiteralPath $secretFile -Force
            Write-Output "OK | copia local eliminada; revoca también el token en Khora para invalidarlo remotamente."
        }
        else {
            Write-Output "NOOP | no existe credencial local."
        }
        exit 0
    }

    "Start" {
        if (-not (Test-Path -LiteralPath $secretFile -PathType Leaf)) {
            throw "LOCAL_BEARER_MISSING: ejecuta -Action Setup primero."
        }
        if (-not (Test-Path -LiteralPath $bridgeFile -PathType Leaf)) {
            throw "BRIDGE_SOURCE_MISSING"
        }
        if (-not (Test-Path -LiteralPath $packageFile -PathType Leaf)) {
            throw "MCP_SDK_MISSING: ejecuta npm ci dentro de khora-web."
        }

        $node = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $node -or -not (Test-Path -LiteralPath $node.Source -PathType Leaf)) {
            throw "NODE_NOT_AVAILABLE"
        }

        $secure = $null
        $pointer = [IntPtr]::Zero
        $plain = $null
        try {
            $encrypted = Get-Content -LiteralPath $secretFile -Raw -ErrorAction Stop
            $secure = ConvertTo-SecureString -String $encrypted.Trim()
            $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)

            if (-not $plain.StartsWith("khora_mcp_v1_", [StringComparison]::Ordinal)) {
                throw "DPAPI_CREDENTIAL_INVALID"
            }

            $env:KHORA_MCP_BEARER = $plain
            & $node.Source $bridgeFile
            $exitCode = $LASTEXITCODE
            if ($null -eq $exitCode) { $exitCode = 0 }
        }
        finally {
            Remove-Item Env:\KHORA_MCP_BEARER -ErrorAction SilentlyContinue
            if ($pointer -ne [IntPtr]::Zero) {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
            }
            if ($secure) { $secure.Dispose() }
            $plain = $null
        }
        exit $exitCode
    }
}
