$ErrorActionPreference = 'Stop'
$desktop = 'C:\Users\fila4\Desktop'
$root = $PSScriptRoot
$data = 'C:\Users\fila4\AppData\Local\Harmonia\surface-index-v0.3.0\data'
$node = Join-Path $root 'runtime\node.exe'
$authFile = Join-Path $root 'extension\local-auth.js'
$log = Join-Path $desktop 'log.txt'
Start-Transcript -LiteralPath $log -Force | Out-Null
try {
    $required = @(
      'CONSULTAR-HARMONIA.cmd','INICIAR-HARMONIA.cmd','INICIAR-HARMONIA-HEADLESS.ps1','DETENER-HARMONIA-HEADLESS.ps1','FINALIZAR-PAQUETE.ps1','LEEME.txt','coverage-catalog.json','extension\coverage-catalog.json',
      'collector\query.ps1','collector\server.js','extension\build-info.json','extension\content.js','extension\dashboard.css','extension\dashboard.html','extension\dashboard.js','extension\dashboard-model.js','extension\manifest.json','extension\popup.css','extension\popup.html','extension\popup.js','extension\region-policy.js','extension\service-worker.js',
      'runtime\node.exe','runtime\NODE-LICENSE.txt','extension\local-auth.js'
    )
    foreach ($rel in $required) { if (-not (Test-Path -LiteralPath (Join-Path $root $rel) -PathType Leaf)) { throw "Falta artefacto necesario: $rel" } }
    foreach ($rel in @('extension\content.js','extension\service-worker.js','extension\popup.js','extension\region-policy.js','extension\dashboard.js','extension\dashboard-model.js','collector\server.js')) {
      & $node --check (Join-Path $root $rel)
      if ($LASTEXITCODE -ne 0) { throw "Falló la sintaxis JavaScript: $rel" }
      "JS_SYNTAX_OK=$rel"
    }
    $manifest = Get-Content -LiteralPath (Join-Path $root 'extension\manifest.json') -Raw | ConvertFrom-Json
    if ($manifest.manifest_version -ne 3 -or $manifest.version -ne '0.4.0') { throw 'Versión o tipo de manifiesto inesperado.' }
    if (-not ($manifest.host_permissions -contains 'https://chatgpt.com/*') -or -not ($manifest.host_permissions -contains 'http://127.0.0.1:47321/*')) { throw 'Los permisos de host no coinciden con el alcance mínimo esperado.' }
    if (-not ($manifest.content_scripts | Where-Object { $_.matches -contains 'https://chatgpt.com/*' -and $_.js -contains 'region-policy.js' -and $_.js -contains 'content.js' -and $_.run_at -eq 'document_idle' })) { throw 'Falta la inyección automática de region-policy.js y content.js en chatgpt.com.' }
    if ($manifest.permissions -contains 'debugger') { throw 'El modo automático no debe solicitar el permiso debugger.' }
    'AUTO_CONTENT_SCRIPT=VALID'
    'EXTENSION_MANIFEST=VALID'
    $catalog = Get-Content -LiteralPath (Join-Path $root 'coverage-catalog.json') -Raw | ConvertFrom-Json
    if ($catalog.schema -ne 'harmonia.coverage-catalog.v1' -or @($catalog.features).Count -lt 30 -or @($catalog.sources).Count -lt 10) { throw 'El catálogo público no contiene la estructura mínima esperada.' }
    $rootCatalogHash = (Get-FileHash -LiteralPath (Join-Path $root 'coverage-catalog.json') -Algorithm SHA256).Hash
    $extensionCatalogHash = (Get-FileHash -LiteralPath (Join-Path $root 'extension\coverage-catalog.json') -Algorithm SHA256).Hash
    if ($rootCatalogHash -ne $extensionCatalogHash) { throw 'El catálogo de la raíz no coincide con el catálogo cargado por la extensión.' }
    'COVERAGE_CATALOG_MIRROR=MATCH'
    $observer = Get-Content -LiteralPath (Join-Path $root 'extension\content.js') -Raw
    if ($observer -match 'outerHTML|innerHTML|\.textContent|(?:el|comp|composer|input|textarea|select)\.value\b') { throw 'El observador contiene una ruta que podría leer texto no previsto o valores de campo.' }
    if ($observer -notmatch '\.innerText\b' -or $observer -notmatch 'data-message-author-role="user"' -or $observer -notmatch 'data-message-author-role="assistant"') { throw 'Falta la captura explícita de texto visible de mensajes.' }
    if ($observer -notmatch 'conversation\.visible\.delta' -or $observer -notmatch 'characterData:\s*true' -or $observer -notmatch 'hiddenReasoningCaptured:false') { throw 'Falta contrato de texto transitorio o exclusión del razonamiento oculto.' }
    if ($observer -notmatch 'composerTextCaptured:false' -or $observer -notmatch 'fieldValuesCaptured:false') { throw 'No se declaró la exclusión de borradores y valores de campos.' }
    $buildInfo = Get-Content -LiteralPath (Join-Path $root 'extension\build-info.json') -Raw | ConvertFrom-Json
    if ($buildInfo.schema -ne 'harmonia.repository-build.v1' -or $buildInfo.version -ne $manifest.version -or $buildInfo.catalogVersion -ne $catalog.version -or $buildInfo.regionPolicyVersion -ne '1.0.0' -or $buildInfo.sourceRevision -notmatch '^[0-9a-f]{40}$') { throw 'El contrato build-info.json no coincide con los metadatos versionados.' }
    if ($buildInfo.regionCompletion.conversationMinimumDistinctSurfaces -ne 5 -or $buildInfo.regionCompletion.conversationMinimumSessions -ne 2 -or -not $buildInfo.ui.dedicatedDashboardTab) { throw 'La política regional o el panel dedicado no coincide con el build-info.' }
    'CONTENT_CAPTURE=VISIBLE_MESSAGES_AND_STRUCTURE_DECLARED'
    'REGION_POLICY=VERSIONED'
    'DASHBOARD_TAB=DECLARED'
    if (-not (Test-Path -LiteralPath $authFile)) { throw 'No existe el archivo de credencial local.' }
    $auth = Get-Content -LiteralPath $authFile -Raw
    $match = [regex]::Match($auth, "HARMONIA_TOKEN\s*=\s*'([0-9a-f]{64})'")
    if (-not $match.Success) { throw 'El archivo local de credencial no tiene un token de 64 caracteres hexadecimales.' }
    $token = $match.Groups[1].Value
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -Headers @{ 'x-harmonia-token' = $token } -TimeoutSec 5
    if (-not $health.ok -or $health.root -ne $data -or $health.stopped) { throw 'La salud del colector no coincide con el almacén local configurado.' }
    'SERVICE_HEALTH=OK'
    try {
        Invoke-RestMethod -Uri 'http://127.0.0.1:47321/health' -TimeoutSec 3 | Out-Null
        throw 'El colector aceptó una petición sin credencial.'
    } catch {
        $status = 0
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        if ($status -ne 401) { throw 'La prueba sin credencial no devolvió HTTP 401.' }
        'AUTH_NO_TOKEN=REJECTED_401'
    }
    $allowedOrigin = 'chrome-extension://' + ('a' * 32)
    $preflight = Invoke-WebRequest -Uri 'http://127.0.0.1:47321/events' -Method Options -Headers @{ Origin=$allowedOrigin; 'Access-Control-Request-Method'='POST'; 'Access-Control-Request-Headers'='content-type,x-harmonia-token' } -UseBasicParsing -TimeoutSec 5
    if ([int]$preflight.StatusCode -ne 204 -or $preflight.Headers['Access-Control-Allow-Origin'] -ne $allowedOrigin) { throw 'Falló CORS para origen simulado de Chrome extension.' }
    'CORS_EXTENSION_ORIGIN=OK'
    try {
        Invoke-WebRequest -Uri 'http://127.0.0.1:47321/events' -Method Options -Headers @{ Origin='https://blocked.example'; 'Access-Control-Request-Method'='POST' } -UseBasicParsing -TimeoutSec 5 | Out-Null
        throw 'CORS aceptó un origen web externo.'
    } catch {
        $status = 0
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        if ($status -ne 403) { throw 'El rechazo CORS no devolvió HTTP 403.' }
        'CORS_WEB_ORIGIN=REJECTED_403'
    }
    $allowed = @(
      'CONSULTAR-HARMONIA.cmd','INICIAR-HARMONIA.cmd','INICIAR-HARMONIA-HEADLESS.ps1','DETENER-HARMONIA-HEADLESS.ps1','FINALIZAR-PAQUETE.ps1','LEEME.txt','coverage-catalog.json',
      'collector\query.ps1','collector\server.js','extension\build-info.json','extension\content.js','extension\coverage-catalog.json','extension\dashboard.css','extension\dashboard.html','extension\dashboard.js','extension\dashboard-model.js','extension\manifest.json','extension\popup.css','extension\popup.html','extension\popup.js','extension\region-policy.js','extension\service-worker.js','runtime\NODE-LICENSE.txt'
    )
    $hashes = [ordered]@{}
    foreach ($rel in $allowed) {
      $full = Join-Path $root $rel
      $hashes[$rel] = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    $exeHash = (Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLowerInvariant()
    $package = [ordered]@{
      schema = 'harmonia.package.v1'
      version = $manifest.version
      generatedAt = [DateTime]::UtcNow.ToString('o')
      source = 'SeryMente/khora main; local token file intentionally excluded'
      runtime = [ordered]@{ version = (& $node --version).Trim(); architecture='win-x64'; nodeZipSha256='cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20'; nodeExeSha256=$exeHash }
      files = $hashes
    }
    $package | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'MANIFEST-HUELLAS.json') -Encoding UTF8
    $readback = Get-Content -LiteralPath (Join-Path $root 'MANIFEST-HUELLAS.json') -Raw | ConvertFrom-Json
    if ($readback.version -ne '0.4.0' -or $readback.runtime.nodeExeSha256 -ne $exeHash) { throw 'Falló la lectura de vuelta del manifiesto de huellas.' }
    'HASH_MANIFEST=VALID'
    'HASHED_FILES=' + $hashes.Count
    'NODE_VERSION=' + (& $node --version).Trim()
    'EXTENSION_VERSION=' + $manifest.version
    'CATALOG_FEATURES=' + @($catalog.features).Count
    'CATALOG_SOURCES=' + @($catalog.sources).Count
    'DESTINATION=' + $root
    'DATA_ROOT=' + $data
    'SERVICE_PID=' + (Get-Content -LiteralPath (Join-Path $root 'collector\service.pid') -Raw).Trim()
    'AUTO_CAPTURE_STATUS=RELOAD_REQUIRED_NOT_VERIFIED'
    'NATURAL_COVERAGE=AWAITING_POST_RELOAD_SCAN'
} finally {
    Stop-Transcript | Out-Null
}
