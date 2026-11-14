$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$allowedIdentities = @('CENTRAL\fila4', 'CENTRAL\MantenimientoRCI')
if ($identity -notin $allowedIdentities) { throw "Ejecute este inicializador desde la sesión autorizada de Harmonia. Identidad actual: $identity" }

$root = $PSScriptRoot
$extension = Join-Path $root 'Extension'
$collector = Join-Path $root 'Collector'
$fila4LocalAppData = 'C:\Users\fila4\AppData\Local'
if (-not (Test-Path -LiteralPath $fila4LocalAppData -PathType Container)) { throw 'No existe el perfil local autorizado de fila4.' }
$data = Join-Path $fila4LocalAppData 'Harmonia\surface-index-v0.4.0\data'
$state = Join-Path $fila4LocalAppData 'Harmonia\surface-index-v0.4.0\state'
$logs = Join-Path $fila4LocalAppData 'Harmonia\surface-index-v0.4.0\logs'
$authFile = Join-Path $extension 'local-auth.js'
$pidFile = Join-Path $state 'collector.pid'
$stdout = Join-Path $logs 'collector.stdout.log'
$stderr = Join-Path $logs 'collector.stderr.log'

foreach ($path in @($extension,$collector)) {
    if (-not (Test-Path -LiteralPath $path -PathType Container)) { throw "Falta carpeta requerida: $path" }
}
foreach ($file in @('manifest.json','service-worker.js','content.js','activity-observer.js','surface-catalog.js','front-activity.js','front-registry.json','coverage-catalog.json','build-info.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $extension $file) -PathType Leaf)) { throw "Falta archivo de extensión: $file" }
}
foreach ($file in @('server.js','activity-telemetry.js','front-activity-store.js')) {
    if (-not (Test-Path -LiteralPath (Join-Path $collector $file) -PathType Leaf)) { throw "Falta archivo del colector: $file" }
}

$manifest = Get-Content -LiteralPath (Join-Path $extension 'manifest.json') -Raw | ConvertFrom-Json
if ($manifest.manifest_version -ne 3 -or $manifest.version -ne '0.6.0') { throw 'El manifiesto no corresponde al paquete Harmonia 0.6.0.' }
$build = Get-Content -LiteralPath (Join-Path $extension 'build-info.json') -Raw | ConvertFrom-Json
$catalog = Get-Content -LiteralPath (Join-Path $root 'coverage-catalog.json') -Raw | ConvertFrom-Json
$extensionCatalog = Get-Content -LiteralPath (Join-Path $extension 'coverage-catalog.json') -Raw | ConvertFrom-Json
if ($catalog.schema -ne 'harmonia.coverage-catalog.v1' -or $catalog.version -ne '0.1.3' -or @($catalog.features).Count -ne 54) { throw 'El catálogo raíz no corresponde a Harmonia 0.6.0 / 0.1.3.' }
if ($build.version -ne $manifest.version -or $build.catalogVersion -ne $catalog.version -or $extensionCatalog.version -ne $catalog.version) { throw 'Manifest, build-info y catálogo no están alineados.' }

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$node = $nodeCommand.Source
if (-not $node) { $node = $nodeCommand.Path }
if (-not $node) { throw 'No se pudo resolver node.exe desde PATH.' }
$nodeVersion = (& $node --version).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Node.js no respondió correctamente.' }

if (-not (Test-Path -LiteralPath $authFile -PathType Leaf)) {
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 32
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $token = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
    [IO.File]::WriteAllText($authFile, "globalThis.HARMONIA_TOKEN = '$token';", [Text.Encoding]::ASCII)
}
$auth = Get-Content -LiteralPath $authFile -Raw
$match = [regex]::Match($auth, "HARMONIA_TOKEN\s*=\s*'([0-9a-f]{64})'")
if (-not $match.Success) { throw 'La credencial local no tiene el formato esperado; no se inicia el colector.' }
$token = $match.Groups[1].Value

foreach ($path in @($data,$state,$logs)) {
    if (-not (Test-Path -LiteralPath $path)) { [void][IO.Directory]::CreateDirectory($path) }
}

$listeners = @(Get-NetTCPConnection -LocalPort 47321 -State Listen -ErrorAction SilentlyContinue)
$serviceReady = $false
$wasUpgraded = $false
if ($listeners.Count -gt 0) {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 3
        if (-not $health.ok -or $health.root -ne $data) { throw 'La instancia no coincide con este almacén local.' }
    } catch {
        throw 'El puerto 47321 está ocupado por otra instancia, otra credencial o un almacén distinto. No se detuvo ningún proceso.'
    }
    if ($health.collectorVersion -eq '0.6.0' -and $health.catalogVersion -eq $catalog.version) {
        $serviceReady = $true
        'SERVICE=ALREADY_RUNNING'
    } else {
        try {
            Invoke-RestMethod -Uri 'http://127.0.0.1:47321/shutdown' -Method Post -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 3 | Out-Null
        } catch {
            throw 'El colector anterior no aceptó el cierre autenticado; no se forzó la terminación del proceso.'
        }
        for ($i=0; $i -lt 40; $i++) {
            Start-Sleep -Milliseconds 250
            $listeners = @(Get-NetTCPConnection -LocalPort 47321 -State Listen -ErrorAction SilentlyContinue)
            if ($listeners.Count -eq 0) { break }
        }
        if ($listeners.Count -gt 0) { throw 'El colector anterior no liberó el puerto después del cierre seguro.' }
        $wasUpgraded = $true
    }
}
if (-not $serviceReady) {
    $oldData = $env:HARMONIA_DATA
    $oldToken = $env:HARMONIA_TOKEN
    try {
        $env:HARMONIA_DATA = $data
        $env:HARMONIA_TOKEN = $token
        $process = Start-Process -FilePath $node -ArgumentList @((Join-Path $collector 'server.js')) -WorkingDirectory $collector -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    } finally {
        $env:HARMONIA_DATA = $oldData
        $env:HARMONIA_TOKEN = $oldToken
    }
    Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ASCII
    $health = $null
    for ($i=0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 250
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 2
            if ($health.ok -and $health.collectorVersion -eq '0.6.0' -and $health.catalogVersion -eq $catalog.version) { break }
        } catch {}
    }
    if (-not $health -or -not $health.ok -or $health.root -ne $data -or $health.collectorVersion -ne '0.6.0' -or $health.catalogVersion -ne $catalog.version) {
        throw "El colector 0.6.0 no alcanzó HEALTH=OK con catálogo 0.1.3. Revise el log local: $stderr"
    }
    if ($wasUpgraded) { 'SERVICE=UPGRADED' } else { 'SERVICE=STARTED' }
    'PID=' + $process.Id
}

try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -TimeoutSec 3 | Out-Null
    throw 'El colector aceptó una petición de salud sin credencial.'
} catch {
    $status = 0
    try { $status = [int]$_.Exception.Response.StatusCode } catch {}
    if ($status -ne 401) { throw 'La prueba sin credencial no devolvió HTTP 401.' }
    'AUTH_NO_TOKEN=REJECTED_401'
}

'HEALTH=OK'
'NODE=' + $nodeVersion
'DATA_ROOT=' + $health.root
'DATA_BYTES=' + $health.totalBytes
'CHROME_LOAD_PATH=' + $extension
'LOCAL_AUTH=CREATED_OR_VALIDATED_NOT_DISPLAYED'
'PACKAGE_READY_FOR_CHROME_LOAD=TRUE'
'REPOSITORY_SYNC_NOTE=build-info.json is not yet present in canonical main; popup repository-sync status may report metadata unavailable.'
