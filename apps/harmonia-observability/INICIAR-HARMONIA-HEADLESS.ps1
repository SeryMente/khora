$ErrorActionPreference = 'Stop'
$desktop = 'C:\Users\fila4\Desktop'
$root = $PSScriptRoot
$data = 'C:\Users\fila4\AppData\Local\Harmonia\surface-index-v0.3.0\data'
$node = Join-Path $root 'runtime\node.exe'
$collectorDir = Join-Path $root 'collector'
$authFile = Join-Path $root 'extension\local-auth.js'
$stdout = Join-Path $collectorDir 'service.stdout.log'
$stderr = Join-Path $collectorDir 'service.stderr.log'
$pidFile = Join-Path $collectorDir 'service.pid'
$log = Join-Path $desktop 'log.txt'
Start-Transcript -LiteralPath $log -Force | Out-Null
try {
    if (-not (Test-Path -LiteralPath (Join-Path $root 'extension\manifest.json'))) { throw 'No existe el manifiesto de Harmonia.' }
    if (-not (Test-Path -LiteralPath (Join-Path $root 'coverage-catalog.json'))) { throw 'No existe coverage-catalog.json.' }
    if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw 'No existe runtime\node.exe.' }
    $catalog = Get-Content -LiteralPath (Join-Path $root 'coverage-catalog.json') -Raw | ConvertFrom-Json
    if ($catalog.schema -ne 'harmonia.coverage-catalog.v1' -or @($catalog.features).Count -lt 20) { throw 'El catálogo de cobertura no es válido o está incompleto.' }
    if (-not (Test-Path -LiteralPath $authFile -PathType Leaf)) {
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $bytes = New-Object byte[] 32
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $token = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
        "globalThis.HARMONIA_TOKEN = '$token';" | Set-Content -LiteralPath $authFile -Encoding ASCII
    }
    $auth = Get-Content -LiteralPath $authFile -Raw
    $match = [regex]::Match($auth, "HARMONIA_TOKEN\s*=\s*'([0-9a-f]{64})'")
    if (-not $match.Success) { throw 'La credencial local tiene un formato inesperado; no se inicia el colector.' }
    $token = $match.Groups[1].Value
    if (-not (Test-Path -LiteralPath $data)) { New-Item -ItemType Directory -Path $data -Force | Out-Null }
    $listeners = @(Get-NetTCPConnection -LocalPort 47321 -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -gt 0) {
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 3
            if (-not $health.ok -or $health.root -ne $data) { throw 'La instancia existente no coincide con el almacén esperado.' }
            'SERVICE=ALREADY_RUNNING'
        } catch {
            throw 'El puerto 47321 está ocupado por otra instancia o credencial. No se detuvo ni sustituyó; identifique y detenga únicamente la instancia anterior autorizada de Harmonia antes de reintentar.'
        }
    } else {
        $env:HARMONIA_DATA = $data
        $env:HARMONIA_TOKEN = $token
        $process = Start-Process -FilePath $node -ArgumentList @('server.js') -WorkingDirectory $collectorDir -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
        Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ASCII
        Start-Sleep -Seconds 2
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 5
        if (-not $health.ok -or $health.root -ne $data) { throw 'La salud del colector no coincide con la raíz de datos autorizada.' }
        'SERVICE=STARTED'
        'PID=' + $process.Id
    }
    try {
        Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -TimeoutSec 3 | Out-Null
        throw 'El colector aceptó una petición de salud sin credencial.'
    } catch {
        $status = 0
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        if ($status -ne 401) { throw 'La prueba de autenticación sin credencial no devolvió HTTP 401.' }
        'AUTH_NO_TOKEN=REJECTED_401'
    }
    'HEALTH=OK'
    'DATA_ROOT=' + $health.root
    'DATA_BYTES=' + $health.totalBytes
    'STORAGE_STOPPED=' + $health.stopped
    'CATALOG_FEATURES=' + @($catalog.features).Count
    'CATALOG_SOURCES=' + @($catalog.sources).Count
} finally {
    Stop-Transcript | Out-Null
}
