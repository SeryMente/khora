# ================================================================
# KHORA v7 - MODULO 14-deploy.ps1
# Componente: 14 deploy
# ================================================================

function Get-Hash {
    param([string]$inputString)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($inputString)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha256.ComputeHash($bytes)
    return [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()
}

 # BOVEDA CANONICA
$__vaultScript = Join-Path $PSScriptRoot '..\env-vault.ps1'
if (-not (Test-Path -LiteralPath $__vaultScript)) { throw "No existe la bóveda canónica: $__vaultScript" }
. $__vaultScript

function Sync-Render {
    param([string]$Key, [string]$Value, [string]$Token, [string]$ServiceId)
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Accept" = "application/json"
        "Content-Type" = "application/json"
    }

    $json = @{ value = $Value } | ConvertTo-Json -Compress
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)

    $url = "https://api.render.com/v1/services/$ServiceId/env-vars/$Key"
    try {
        Invoke-RestMethod -Uri $url -Method Put -Headers $headers -Body $body | Out-Null
        Ok "Render: $Key sincronizada."
    } catch {
        Warn "Render: Fallo al sincronizar $Key. Error: $_"
    }
}
function Sync-Vercel {
    param([string]$Key, [string]$Value, [string]$Token)
    Ensure-VercelCLI

    $webDir = Join-Path $REPO_DIR "khora-web"
    $tmpFile = Join-Path $env:TEMP "vercel-env-val-$([guid]::NewGuid().ToString()).txt"
    try {
        [System.IO.File]::WriteAllText($tmpFile, $Value)

        # vercel env rm first to avoid "already exists" errors, then add
        & cmd /c "cd /d `"$webDir`" && vercel env rm $Key production preview development --token $Token -y >nul 2>&1"
        & cmd /c "cd /d `"$webDir`" && vercel env add $Key production preview development --token $Token < `"$tmpFile`" >nul 2>&1"
        if ($LASTEXITCODE -eq 0) {
            Ok "Vercel: $Key sincronizada."
        } else {
            Warn "Vercel: Fallo al sincronizar $Key (ExitCode: $LASTEXITCODE)."
        }
    } catch {
        Warn "Vercel: Fallo al sincronizar $Key. Error: $_"
    } finally {
        if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue }
    }
}
$EnvManifest = @(
    # Core Infrastructure
    @{ Name="KHORA_API_KEY"; IsSecret=$true; Targets=@("Vercel", "Render"); Aliases=@("X_KHORA_KEY") }
    @{ Name="NEO4J_URI"; IsSecret=$true; Targets=@("Vercel", "Render") }
    @{ Name="NEO4J_USER"; IsSecret=$true; Targets=@("Vercel", "Render") }
    @{ Name="NEO4J_PASSWORD"; IsSecret=$true; Targets=@("Vercel", "Render") }

    # Render API / Config
    @{ Name="RENDER_API_KEY"; IsSecret=$true; Targets=@() }
    @{ Name="RENDER_SERVICE_ID"; IsSecret=$false; Targets=@() }

    # Vercel Config
    @{ Name="VERCEL_TOKEN"; IsSecret=$true; Targets=@() }

    # LLM Settings
    @{ Name="KHORA_LLM_API_URL"; IsSecret=$false; Targets=@("Render"); Aliases=@("LLM_CHEAP_API_URL") }
    @{ Name="KHORA_LLM_API_KEY"; IsSecret=$true; Targets=@("Render"); Aliases=@("LLM_CHEAP_API_KEY") }
    @{ Name="KHORA_LLM_MODEL"; IsSecret=$false; Targets=@("Render"); Aliases=@("LLM_CHEAP_MODEL") }
    @{ Name="KHORA_WEB_ORIGIN"; IsSecret=$false; Targets=@("Render") }

    # Khora Web (Vercel)
    @{ Name="AUTH_SECRET"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="DATABASE_URL"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="GEMINI_API_KEY"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="GITHUB_WEBHOOK_SECRET"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="GROQ_API_KEY"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="INTERNAL_TRIGGER_SECRET"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="JULES_API_KEY"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="KHORA_API_URL"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="MAX_CONCURRENT_JULES_SESSIONS"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="MEDICAL_INTERP_MONTHLY_GOAL"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="META_MINUTES_MONTH"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="NEXT_PUBLIC_API_URL"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="NEXT_PUBLIC_APP_VERSION"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="NODE_ENV"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="NOTION_API_KEY"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="NOTION_DATABASE_ID"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="NOTION_ROADMAP_DATABASE_ID"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="NOTION_TOKEN"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="OIDC_CLIENT_ID"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="OIDC_CLIENT_SECRET"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="OIDC_ISSUER_URL"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="PLAYWRIGHT_TEST_RUN"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="SMTP_HOST"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="SMTP_PASS"; IsSecret=$true; Targets=@("Vercel") }
    @{ Name="SMTP_PORT"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="SMTP_SECURE"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="SMTP_USER"; IsSecret=$false; Targets=@("Vercel") }
    @{ Name="TODOIST_TOKEN"; IsSecret=$true; Targets=@("Vercel") }
)
function Init-EnvVault {
    $missing = New-Object System.Collections.Generic.List[string]
    Write-Host " [Vault] Verificando variables contra la bóveda canónica..." -ForegroundColor Cyan
    foreach ($v in $EnvManifest) {
        $name = $v.Name
        $current = [System.Environment]::GetEnvironmentVariable($name,'Process')
        if ([string]::IsNullOrWhiteSpace($current)) {
            $missing.Add($name)
        }
    }

    foreach ($name in $missing) {
        Write-Host (" [Vault] Falta {0}. Se solicitará una sola vez mediante portapapeles/entrada segura." -f $name) -ForegroundColor Yellow
        Set-KhoraEnvVaultVariable -Name $name -UseClipboard
    }

    $loaded = @(Import-KhoraEnvVault)

    foreach ($v in $EnvManifest) {
        $name = $v.Name
        $value = [System.Environment]::GetEnvironmentVariable($name,'Process')
        if ([string]::IsNullOrWhiteSpace($value)) {
            Warn ("[Vault] Variable requerida ausente después de importar la bóveda: {0}" -f $name)
            continue
        }

        foreach ($target in @($v.Targets)) {
            if ([string]::IsNullOrWhiteSpace($target)) { continue }

            $targetNames = @($name)
            if ($v.Aliases) { $targetNames += $v.Aliases }

            foreach ($tname in $targetNames) {
                if ($target -eq "Vercel") {
                    $vercelToken = [System.Environment]::GetEnvironmentVariable('VERCEL_TOKEN','Process')
                    if (-not [string]::IsNullOrWhiteSpace($vercelToken)) {
                        Info ("Sincronizando {0} hacia Vercel desde la bóveda canónica..." -f $tname)
                        Sync-Vercel -Key $tname -Value $value -Token $vercelToken
                    } else {
                        Warn ("Vercel omitido para {0}: VERCEL_TOKEN no está disponible en la bóveda." -f $tname)
                    }
                }
                elseif ($target -eq "Render") {
                    $renderToken = [System.Environment]::GetEnvironmentVariable('RENDER_API_KEY','Process')
                    $serviceId = [System.Environment]::GetEnvironmentVariable('RENDER_SERVICE_ID','Process')
                    if (-not [string]::IsNullOrWhiteSpace($renderToken) -and -not [string]::IsNullOrWhiteSpace($serviceId)) {
                        Info ("Sincronizando {0} hacia Render desde la bóveda canónica..." -f $tname)
                        Sync-Render -Key $tname -Value $value -Token $renderToken -ServiceId $serviceId
                    } else {
                        Warn ("Render omitido para {0}: credenciales de Render ausentes en la bóveda." -f $tname)
                    }
                }
            }
        }
    }

    if ($loaded.Count -gt 0) {
        Ok ("Bóveda canónica cargada: {0} variables en el entorno de proceso." -f $loaded.Count)
    } else {
        Warn "La bóveda canónica no contiene variables cargables."
    }
}
function Invoke-RenderOps {
    $svcId = [System.Environment]::GetEnvironmentVariable('RENDER_SERVICE_ID', 'Process')
    if (-not (Get-Command render -ErrorAction SilentlyContinue)) {
        Warn "Render CLI no disponible. Ejecuta [1] Iniciar sesion para instalarlo."
        return
    }
    Write-Host ""
    Write-Host "  ---- RENDER OPERATIONS ----" -ForegroundColor Cyan
    Write-Host "   [1] render deploy (produccion)" -ForegroundColor White
    Write-Host "   [2] render logs en vivo" -ForegroundColor White
    Write-Host "   [3] render services list" -ForegroundColor White
    Write-Host "   [4] set env var en Render" -ForegroundColor White
    Write-Host "   [Q] volver al menu principal" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "   Opcion: " -NoNewline -ForegroundColor White
    Clear-PendingInput
    $rk = [Console]::ReadKey($true); Write-Host $rk.KeyChar
    $rkey = $rk.KeyChar.ToString().ToUpper()
    switch ($rkey) {
        '1' {
            if (-not $svcId) { $svcId = Read-Host '  Service ID (ej: srv-xxxxx)' }
            Step "render deploy --service-id $svcId"
            $out = Spin-Job "Deploying a Render" -ArgList @($svcId) -Tips @('subiendo cambios...','esperando build...','reiniciando servicio...','verificando health...') -Block {
                param($id); & render deploy --service-id $id 2>&1
            }
            $out | ForEach-Object {
                $m = Mask-Token -Text "$_"
                Write-Host "  $m" -ForegroundColor DarkGray; L "INFO" "render: $m"
            }
            Ok "Deploy completado. Revisa dashboard.render.com"
        }
        '2' {
            if (-not $svcId) { $svcId = Read-Host '  Service ID (ej: srv-xxxxx)' }
            Info "Abriendo logs en nueva terminal (Ctrl+C para salir)..."
            Start-Process powershell -ArgumentList "-NoProfile","-NoExit","-Command","render logs --service-id $svcId --tail"
            Ok "Log abierto en nueva ventana."
        }
        '3' {
            $out = & render services list 2>&1
            $out | ForEach-Object {
                $m = Mask-Token -Text "$_"
                Write-Host "  $m" -ForegroundColor Cyan
            }
            L "INFO" "render services list ejecutado"
        }
        '4' {
            if (-not $svcId) { $svcId = Read-Host '  Service ID (ej: srv-xxxxx)' }
            $key = Read-Host '  Nombre de la variable (ej: LLM_CHEAP_API_KEY)'
            if ([string]::IsNullOrWhiteSpace($key)) { Warn 'Nombre de variable vacío.'; break }
            $known = @($EnvManifest | ForEach-Object { $_.Name })
            if ($known -notcontains $key) { Warn ("Variable no declarada en EnvManifest: {0}. Añádela primero a la manifest y a la bóveda canónica." -f $key); break }
            Set-KhoraEnvVaultVariable -Name $key -UseClipboard
            Import-KhoraEnvVault | Out-Null
            $val = [System.Environment]::GetEnvironmentVariable($key,'Process')
            if ([string]::IsNullOrWhiteSpace($val)) { Warn ("{0} no quedó disponible desde la bóveda canónica." -f $key); break }
            $token = [System.Environment]::GetEnvironmentVariable('RENDER_API_KEY','Process')
            if ([string]::IsNullOrWhiteSpace($token)) { Warn 'RENDER_API_KEY no está disponible en la bóveda canónica.'; break }
            & render env set ("{0}={1}" -f $key,$val) --service-id $svcId 2>&1 | ForEach-Object {
                $m = Mask-Token -Text "$_"
                Write-Host "  $m"
            }
            Ok ("Var {0} actualizada en Render desde la bóveda canónica." -f $key)
            L "INFO" ("render env set {0} en {1} desde bóveda canónica" -f $key,$svcId)
        }
        'Q' { return }
    }
}
function Start-DevServers {
    L "INFO" "=== Start-DevServers: arrancando API (:8000) + Next.js (:3000) ==="
    if (-not (Test-Path "$REPO_DIR\.git")) { Warn "Sin repo. Inicia sesion primero ([1])."; return }
    $pyExe  = Join-Path $WORK_DIR 'venv\Scripts\python.exe'
    $webDir = Join-Path $REPO_DIR 'khora-web'
    if (Test-Path $pyExe) {
        $qch = [char]34
        $apiFile = Join-Path $env:TEMP "khora-api.cmd"
        $apiTxt = @("@echo off","title KHORA API 8000","cd /d " + $qch + $REPO_DIR + $qch,"set PYTHONPATH=" + $REPO_DIR,"start " + $qch + $qch + " /b /low " + $qch + $pyExe + $qch + " -m uvicorn api.main:app --reload --port 8000")
        [IO.File]::WriteAllLines($apiFile,[string[]]$apiTxt,(New-Object System.Text.ASCIIEncoding))
        Start-Process cmd -ArgumentList ("/k " + $qch + $apiFile + $qch) -WindowStyle Minimized
        Ok "API uvicorn -> http://localhost:8000  (nueva ventana)"
        L "INFO" "Dev server API uvicorn lanzado en :8000"
    } else { Warn "Venv no encontrado. Inicia sesion ([1]) para crearlo." }
    if (Test-Path $webDir) {
        $qcw = [char]34
        $nextFile = Join-Path $env:TEMP "khora-next.cmd"
        $nextTxt = @("@echo off","title KHORA WEB 3000","cd /d " + $qcw + $webDir + $qcw,"start " + $qcw + $qcw + " /b /low npm.cmd run dev")
        [IO.File]::WriteAllLines($nextFile,[string[]]$nextTxt,(New-Object System.Text.ASCIIEncoding))
        Start-Process cmd -ArgumentList ("/k " + $qcw + $nextFile + $qcw) -WindowStyle Minimized
        Ok "Next.js dev -> http://localhost:3000  (nueva ventana)"
        L "INFO" "Dev server Next.js lanzado en :3000"
    } else { Warn "khora-web/ no encontrado." }
}
function Invoke-KhoraOk {
    $wd = Join-Path $REPO_DIR 'khora-web'
    if (-not (Test-Path $wd)) { Warn "khora-web/ no encontrado."; return }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Warn "Node no disponible."; return }
    Step "khora-ok local: build + e2e"
    $outB = Spin-Job "npm run build (Next.js)" -ArgList @($wd) -Tips @('analizando modulos...','compilando TypeScript...','optimizando bundles...','generando paginas estaticas...','verificando tipos...','tree-shaking...','minificando CSS...','casi listo...') -Block {
        param($webDir); & cmd /c "cd /d `"`"$webDir`"`" && npm run build 2>&1"
    }
    $outB | ForEach-Object {
        $m = Mask-Token -Text "$_"
        L "INFO" "build: $m"
    }
    $buildFail = ($outB | Where-Object { "$_" -match 'error TS|Build error|Failed to compile' })
    if ($buildFail) {
        Fail "Build FALLO. Revisa el log:"
        $buildFail | ForEach-Object {
            $m = Mask-Token -Text "$_"
            Write-Host "  $m" -ForegroundColor Red
        }
        return
    }
    Ok "Build OK."
    $outE = Spin-Job "npm run e2e (Playwright)" -ArgList @($wd) -Tips @('iniciando Chromium...','cargando pagina de prueba...','test: smoke regression...','test: login flow...','test: navegacion...','verificando assertions...','capturando screenshots...','recopilando resultados...') -Block {
        param($webDir); & cmd /c "cd /d `"`"$webDir`"`" && npm run e2e 2>&1"
    }
    $outE | ForEach-Object {
        $m = Mask-Token -Text "$_"
        L "INFO" "e2e: $m"
    }
    $e2eFail = ($outE | Where-Object { "$_" -match ' failed|FAILED|Error:' })
    if ($e2eFail) {
        Fail "khora-ok FAIL. Corrige los tests antes de desplegar."
        $e2eFail | ForEach-Object {
            $m = Mask-Token -Text "$_"
            Write-Host "  $m" -ForegroundColor Red
        }
    } else { Ok "khora-ok local PASS. Listo para [V] Deploy." }
    L "INFO" "khora-ok local completado."
}
function Initialize-VercelBootstrapAuth {
    if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
        Ensure-VercelCLI
    }
    if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
        Fail "Vercel CLI no disponible."
        return $false
    }

    try {
        Import-KhoraEnvVault | Out-Null
    } catch {
        Warn "No se pudo cargar la Vault canonica para Vercel: $_"
        return $false
    }

    $vtoken = [Environment]::GetEnvironmentVariable("VERCEL_TOKEN","Process")
    if ([string]::IsNullOrWhiteSpace($vtoken)) {
        Warn "VERCEL_TOKEN no disponible en la Vault."
        return $false
    }

    $vercelCmd=(Get-Command vercel.cmd -ErrorAction SilentlyContinue).Source;if([string]::IsNullOrWhiteSpace($vercelCmd)){Fail "vercel.cmd no disponible.";return $false};$who = @(& $vercelCmd whoami --token $vtoken 2>&1)
    $whoCode = $LASTEXITCODE
    if ($whoCode -ne 0) {
        Fail "Vercel no autenticado."
        return $false
    }

    Ok ("Vercel autenticado: " + (($who | Out-String).Trim()))
    return $true
}
function Bootstrap-VercelProduction {
    $vercelCmd=(Get-Command vercel.cmd -ErrorAction SilentlyContinue).Source
    if([string]::IsNullOrWhiteSpace($vercelCmd)){Fail 'vercel.cmd no disponible en Bootstrap-VercelProduction.';return $false}

    $vtoken = [Environment]::GetEnvironmentVariable("VERCEL_TOKEN","Process")
    if ([string]::IsNullOrWhiteSpace($vtoken)) {
        Fail "VERCEL_TOKEN no disponible tras autenticacion Vercel."
        return $false
    }

        $webDir = Join-Path $REPO_DIR "khora-web"
    if (-not (Test-Path -LiteralPath $webDir)) {
        Fail "khora-web no existe tras el clone."
        return $false
    }

    Push-Location $REPO_DIR
    try {
        $linkOut = @(& $vercelCmd link --project khora-web --scope victorhugotorresmendez-8991s-projects --yes --token $vtoken 2>&1)
        $linkCode = $LASTEXITCODE
        $linkOut | ForEach-Object {
            L "INFO" ("vercel link: " + (Mask-Token -Text "$_"))
        }
        if ($linkCode -ne 0) {
            Fail "No se pudo vincular khora-web."
            return $false
        }

        $deployOut = @(& $vercelCmd --prod --token $vtoken 2>&1)
        $deployCode = $LASTEXITCODE
        $deployOut | ForEach-Object {
            L "INFO" ("vercel prod: " + (Mask-Token -Text "$_"))
        }
        if ($deployCode -ne 0) {
            Fail "Redeploy Vercel fallo."
            return $false
        }

        $deployText = ($deployOut -join "`n")
        if ($deployText -match 'Ready|Production|khora-web\.vercel\.app') {
            Ok "Redeploy Vercel --prod completado y verificado."
        }
        else {
            Warn "Vercel devolvio exit 0 sin señal explicita de produccion."
        }

        return $true
    }
    finally {
        Pop-Location
        $vtoken = $null
    }
}
function Deploy-Vercel {
    $wd = Join-Path $REPO_DIR 'khora-web'
    if (-not (Test-Path $wd)) { Warn "khora-web/ no encontrado."; return }
    if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) { Warn "Vercel CLI no disponible. Ejecuta [1] para instalarlo."; return }
    Step "Deploy a Vercel (--prod)"
    $out = Spin-Job "vercel deploy --prod" -ArgList @($wd) -Tips @('autenticando con Vercel...','subiendo archivos...','compilando en Vercel Cloud...','ejecutando build remoto...','optimizando assets...','publicando deployment...','casi listo...') -Block {
        param($webDir); & cmd /c "cd /d `"`"$webDir`"`" && vercel deploy --prod 2>&1"
    }
    $out | ForEach-Object {
        $m = Mask-Token -Text "$_"
        Write-Host "  $m" -ForegroundColor DarkGray; L "INFO" "vercel: $m"
    }
    $fail = ($out | Where-Object { "$_" -match '^Error|failed' })
    if ($fail) { Fail "Deploy fallo. Revisa salida arriba." }
    else { Ok "Deploy exitoso. Revisa el dashboard de Vercel." }
}
