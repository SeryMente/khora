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
function Get-VaultMasterKey {
    $lpKey = "khora-env-vault-key"
    # Wait, the user said "recupéralo de LastPass CLI primero; Read-Host solo como fallback."
    # Wait! Earlier versions of Khora didn't use `lpass` CLI. The user said: "reutilizando la integración de LastPass ya construida en v6.5.2".
    # Wait, I previously found that the only LastPass integration in the script was `Test-LastPassInstalled` for Chrome extensions.
    # Ah, the "integración de LastPass ya construida en v6.5.2" might refer to something else? Wait, no, v6.5.3 had Get-PersistedToken, but it didn't fetch from LastPass, it fetched from a local file ($localTok = Join-Path $ROOT_DIR "khe-token.json").
    # The prompt explicitly says: "Master key: correcto, recupéralo de LastPass CLI primero; Read-Host solo como fallback."

    $masterKey = $null
    # Try lpass if available
    if (Get-Command lpass -ErrorAction SilentlyContinue) {
        # Check login status (lpass status doesn't always exist, so we just try to show the password)
        $masterKey = lpass show --password $lpKey 2>$null
        if ($masterKey) {
            $masterKey = $masterKey.Trim()
            return (ConvertTo-SecureString -String $masterKey -AsPlainText -Force)
        }
    }

    $msg = "Se requiere el passphrase maestro de la boveda (guardalo en LastPass como '$lpKey')."
    Write-Host " [Vault] $msg" -ForegroundColor Cyan
    return Read-Host "  Passphrase" -AsSecureString
}
function Save-Vault {
    param($Vault, [string]$Path, [System.Security.SecureString]$Key)
    $json = $Vault | ConvertTo-Json -Depth 10 -Compress
    $enc = Protect-KhoraToken -PlainToken $json -Passphrase $Key
    $enc.format = "aes-cbc-hmac-v1"
    $encJson = $enc | ConvertTo-Json -Compress
    Set-Content -Path $Path -Value $encJson -Force
}
function Load-Vault {
    param([string]$Path, [System.Security.SecureString]$Key)
    if (-not (Test-Path $Path)) { return @{} }

    try {
        $encJson = Get-Content $Path -Raw | ConvertFrom-Json
        $jsonStr = Unprotect-KhoraToken -Encrypted $encJson -Passphrase $Key
        $psObj = $jsonStr | ConvertFrom-Json
        # Convert PSObject to Hashtable (PS 5.1 compatible)
        $hash = @{}
        foreach ($prop in $psObj.psobject.properties) {
            # each property is a key. The value might be a PSCustomObject, convert that to Hashtable too.
            $val = $prop.Value
            if ($val -is [System.Management.Automation.PSCustomObject]) {
                $subHash = @{}
                foreach ($subProp in $val.psobject.properties) {
                    $subHash[$subProp.Name] = $subProp.Value
                }
                $val = $subHash
            }
            $hash[$prop.Name] = $val
        }
        return $hash
    } catch {
        Warn "Fallo al cargar la boveda (contrasena incorrecta o corrupta): $_"
        return @{}
    }
}
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
    $vaultPath = Join-Path $REPO_DIR "secrets\env-vault.enc.json"
    $secretsDir = Join-Path $REPO_DIR "secrets"
    if (-not (Test-Path $secretsDir)) { New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null }

    $masterKey = Get-VaultMasterKey
if (-not $masterKey) { Fail "Se cancelo el inicio: Passphrase maestro requerido."; Write-Host ""; Write-Host "SESIÓN DETENIDA: Passphrase requerida."; return }

    $vault = Load-Vault -Path $vaultPath -Key $masterKey
    $vaultChanged = $false

    $renderApiToken = if ($vault.ContainsKey("RENDER_API_KEY")) { $vault["RENDER_API_KEY"].Value } else { $null }
    $renderSvcId = if ($vault.ContainsKey("RENDER_SERVICE_ID")) { $vault["RENDER_SERVICE_ID"].Value } else { $null }
    $vercelToken = if ($vault.ContainsKey("VERCEL_TOKEN")) { $vault["VERCEL_TOKEN"].Value } else { $null }

    foreach ($v in $EnvManifest) {
        $name = $v.Name
        $isSecret = $v.IsSecret
        $targets = $v.Targets

        $value = $null

        if ($vault.ContainsKey($name)) {
            $value = $vault[$name].Value
        } else {
            # BOOTSTRAP: Intentar recuperar desde Vercel o Render primero si aplica
            $foundInCloud = $false

            if ($vercelToken -and $targets -contains "Vercel") {
                $webDir = Join-Path $REPO_DIR "khora-web"
                $tmpEnv = [System.IO.Path]::GetTempFileName()
                try {
                    & cmd /c "cd /d `"$webDir`" && vercel env pull `"$tmpEnv`" --environment=production --token $vercelToken --yes >nul 2>&1"
                    if (Test-Path $tmpEnv) {
                        $envLines = Get-Content $tmpEnv -ErrorAction SilentlyContinue
                        foreach ($line in $envLines) {
                            $line = $line.Trim()
                            if ([string]::IsNullOrEmpty($line) -or $line.StartsWith("#")) { continue }
                            $idx = $line.IndexOf('=')
                            if ($idx -gt 0) {
                                $k = $line.Substring(0, $idx)
                                if ($k -eq $name) {
                                    $v = $line.Substring($idx + 1)
                                    if ($v.StartsWith("`"") -and $v.EndsWith("`"") -and $v.Length -ge 2) {
                                        $v = $v.Substring(1, $v.Length - 2)
                                    }
                                    $value = $v
                                    $foundInCloud = $true
                                    break
                                }
                            }
                        }
                    }
                } finally {
                    if (Test-Path $tmpEnv) { Remove-Item $tmpEnv -Force -ErrorAction SilentlyContinue }
                }
            }

            if (-not $foundInCloud -and $renderApiToken -and $renderSvcId -and $targets -contains "Render") {
                $headers = @{ "Authorization" = "Bearer $renderApiToken"; "Accept" = "application/json" }
                $url = "https://api.render.com/v1/services/$renderSvcId/env-vars?limit=100"
                try {
                    $renderEnvVars = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ErrorAction Stop
                    foreach ($rVar in $renderEnvVars) {
                        if ($rVar.envVar.key -eq $name) {
                            $value = $rVar.envVar.value
                            $foundInCloud = $true
                            break
                        }
                    }
                } catch {}
            }

            if (-not $foundInCloud) {
                Write-Host " [Vault] Variable requerida faltante: $name" -ForegroundColor Yellow
                if ($isSecret) {
                    $sec = Read-Host "  $name" -AsSecureString
                    $value = [System.Net.NetworkCredential]::new("", $sec).Password
                } else {
                    $value = Read-Host "  $name"
                }
            }

            $vault[$name] = @{ Value=$value; SyncState=@{} }
            $vaultChanged = $true

            # Actualizar tokens de bootstrap si fueron los que acabamos de capturar
            if ($name -eq "RENDER_API_KEY") { $renderApiToken = $value }
            if ($name -eq "RENDER_SERVICE_ID") { $renderSvcId = $value }
            if ($name -eq "VERCEL_TOKEN") { $vercelToken = $value }
        }

        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')

        # Sincronizacion
        foreach ($target in $targets) {
            $targetNames = @($name)
            if ($v.Aliases) { $targetNames += $v.Aliases }

            foreach ($tname in $targetNames) {
                $expectedHash = (Get-Hash $value)
                $syncState = $vault[$name].SyncState["$target|$tname"]
                if ($syncState -ne $expectedHash) {
                    Info "Sincronizando $tname hacia $target..."
                    if ($target -eq "Vercel" -and $vercelToken) {
                        Sync-Vercel -Key $tname -Value $value -Token $vercelToken
                    } elseif ($target -eq "Render" -and $renderApiToken -and $renderSvcId) {
                        Sync-Render -Key $tname -Value $value -Token $renderApiToken -ServiceId $renderSvcId
                    }
                    $vault[$name].SyncState["$target|$tname"] = $expectedHash
                    $vaultChanged = $true
                }
            }
        }
    }

    if ($script:TokSecure) {
        $ghTok = [System.Net.NetworkCredential]::new("", $script:TokSecure).Password
        [System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $ghTok, 'Process')
    }

    if ($vaultChanged) {
        Save-Vault -Vault $vault -Path $vaultPath -Key $masterKey
        Ok "Boveda de entorno actualizada."
    } else {
        Ok "Boveda de entorno verificada y en sincronia."
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
            $val = Read-Host "  Valor para $key"
            & render env set "${key}=${val}" --service-id $svcId 2>&1 | ForEach-Object {
                $m = Mask-Token -Text "$_"
                Write-Host "  $m"
            }
            Ok "Var $key actualizada en Render."
            L "INFO" "render env set $key en $svcId"
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
        $apiCmd = "cd /d `"`"$REPO_DIR`"`" && set `"PYTHONPATH=$REPO_DIR`" && `"`"$pyExe`"`" -m uvicorn api.main:app --reload --port 8000"
        Start-Process cmd -ArgumentList "/k",$apiCmd
        Ok "API uvicorn -> http://localhost:8000  (nueva ventana)"
        L "INFO" "Dev server API uvicorn lanzado en :8000"
    } else { Warn "Venv no encontrado. Inicia sesion ([1]) para crearlo." }
    if (Test-Path $webDir) {
        $nextCmd = "cd /d `"`"$webDir`"`" && npm run dev"
        Start-Process cmd -ArgumentList "/k",$nextCmd
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
