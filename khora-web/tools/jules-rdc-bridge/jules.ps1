[CmdletBinding()]
param(
    [ValidateSet("Start","Status","Disconnect","Help")]
    [string]$Action = "Help"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$bridgeFile = Join-Path $PSScriptRoot "bridge.mjs"
$credentialFile = Join-Path $PSScriptRoot "credential.ps1"
$webRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$packageFile = Join-Path $webRoot "node_modules\@modelcontextprotocol\sdk\package.json"

function Get-NodeExecutable {
    $candidates = @(
        "C:\Program Files\nodejs\node.exe",
        (Join-Path $env:LOCALAPPDATA "Programs\nodejs\node.exe")
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return $candidate
        }
    }
    $command = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($command -and (Test-Path -LiteralPath $command.Source -PathType Leaf)) {
        return $command.Source
    }
    throw "NODE_NOT_AVAILABLE"
}

function Invoke-CredentialAction {
    param([Parameter(Mandatory=$true)][string]$CredentialAction)
    $powershell = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
    if (-not (Test-Path -LiteralPath $powershell -PathType Leaf)) {
        throw "WINDOWS_POWERSHELL_NOT_AVAILABLE"
    }
    & $powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $credentialFile -Action $CredentialAction | ForEach-Object { [Console]::Out.WriteLine([string]$_) }
    $nativeExit = $LASTEXITCODE
    return [int]$nativeExit
}

switch ($Action) {
    "Help" {
        @"
KHORA · Puente Jules por RDC · OAuth 2.1 / PKCE

Start       Inicia el cliente MCP local. Si no hay autorización, abre Khora en el navegador para un consentimiento OAuth.
Status      Comprueba el estado del refresh token DPAPI sin revelar credenciales.
Disconnect  Elimina solo la copia local cifrada; no revoca el consentimiento remoto.
Help        Muestra esta ayuda.

La autenticación usa la cuenta propietaria ya admitida por Khora y solicita solo jules:read + jules:write.
El refresh token se cifra con DPAPI CurrentUser; los access tokens viven solo en memoria.
No hay Bearer manual, pegado de tokens, servidor MCP local ni puertos de escucha permanentes.
JULES_API_KEY permanece exclusivamente en Khora Production.
"@
        exit 0
    }

    "Status" {
        if (-not (Test-Path -LiteralPath $credentialFile -PathType Leaf)) {
            throw "CREDENTIAL_HELPER_MISSING"
        }
        $status = Invoke-CredentialAction -CredentialAction "Status"
        if ($status -eq 0) { exit 0 }
        Write-Output "OAUTH_REQUIRED"
        exit 2
    }

    "Disconnect" {
        if (-not (Test-Path -LiteralPath $credentialFile -PathType Leaf)) {
            throw "CREDENTIAL_HELPER_MISSING"
        }
        $status = Invoke-CredentialAction -CredentialAction "Remove"
        if ($status -ne 0) { throw "LOCAL_OAUTH_REMOVE_FAILED" }
        Write-Output "OK | credencial local DPAPI eliminada; el consentimiento OAuth remoto no se revoca desde este cliente."
        exit 0
    }

    "Start" {
        if (-not (Test-Path -LiteralPath $bridgeFile -PathType Leaf)) {
            throw "BRIDGE_SOURCE_MISSING"
        }
        if (-not (Test-Path -LiteralPath $credentialFile -PathType Leaf)) {
            throw "CREDENTIAL_HELPER_MISSING"
        }
        if (-not (Test-Path -LiteralPath $packageFile -PathType Leaf)) {
            throw "MCP_SDK_MISSING: dependencias locales no instaladas."
        }

        $node = Get-NodeExecutable
        & $node $bridgeFile
        $exitCode = $LASTEXITCODE
        if ($null -eq $exitCode) { $exitCode = 0 }
        exit $exitCode
    }
}
