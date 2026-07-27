# ================================================================
# KHORA v7 - MODULO 09-chrome.ps1
# Componente: 09 chrome
# ================================================================

function Test-LastPassInstalled {
    $lpId = "hdokiejnpimakedhajhdlcegeplioahd"
    $chromeUserData = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
    if (-not (Test-Path $chromeUserData)) { return $false }
    $profiles = Get-ChildItem -Path $chromeUserData -Directory -Filter "*"
    foreach ($prof in $profiles) {
        $extPath = Join-Path $prof.FullName "Extensions\$lpId"
        if (Test-Path $extPath) { return $true }
    }
    return $false
}
function Get-ChromePaths {
    @(
        (Join-Path ${env:ProgramFiles} "Google\Chrome\Application\chrome.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
        (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
    )
}
function Open-LoginTabs {
    $hasLp = Test-LastPassInstalled
    if (-not $hasLp) { Warn "LastPass no detectado. Las pestañas de login se abrirán pero no tendrán autofill." }
    $chromeExe = Resolve-Exe "chrome" (Get-ChromePaths) "chrome.exe"
    if (-not $chromeExe) { Warn "Chrome no detectado, omitiendo pestañas de login."; return }
    $urls = @(
        "https://accounts.google.com/ServiceLogin?continue=https://mail.google.com/",
        "https://www.notion.so/login",
        "chrome://settings/people"
    )
    foreach ($u in $urls) {
        try { Start-Process -FilePath $chromeExe -ArgumentList "--remote-debugging-port=$CDP_PORT", "`"$u`"" -ErrorAction SilentlyContinue } catch {}
    }
    Ok "Abiertas 3 pestañas iniciales de login (CDP port: $CDP_PORT)."
}
function Save-ChromeTabsSnapshot {
    $res = Invoke-RestMethod "http://localhost:$CDP_PORT/json" -ErrorAction SilentlyContinue
    if (-not $res) { Warn "Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas."; return }
    $validUrls = @()
    foreach ($tab in $res) {
        if ($tab.type -ne "page") { continue }
        if ([string]::IsNullOrWhiteSpace($tab.url)) { continue }
        $url = $tab.url
        $exclude = $false
        foreach ($pat in $TAB_EXCLUDE_PATTERNS) {
            if ($url -match $pat) { $exclude = $true; break }
        }
        if (-not $exclude) { $validUrls += $url }
    }
    if ($validUrls.Count -gt $TAB_SNAPSHOT_MAX) {
        $validUrls = $validUrls[0..($TAB_SNAPSHOT_MAX - 1)]
    }
    $snap = @{
        "capturedAt" = (Get-Date).ToString("o")
        "tabs"       = $validUrls
    }
    $snapDir = Split-Path $TAB_SNAPSHOT_PATH -Parent
    if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Force $snapDir | Out-Null }
    $snap | ConvertTo-Json -Compress | Set-Content $TAB_SNAPSHOT_PATH -Encoding UTF8
    Info "Snapshot de pestañas guardado ($($validUrls.Count) tabs)."
}
function Restore-ChromeTabsSnapshot {
    if (-not (Test-Path $TAB_SNAPSHOT_PATH)) {
        Info "Sin snapshot previo de pestañas."
        return
    }
    $snap = Get-Content $TAB_SNAPSHOT_PATH -Raw | ConvertFrom-Json
    if (-not $snap.tabs -or $snap.tabs.Count -eq 0) {
        Info "Snapshot de pestañas vacio."
        return
    }
    $chromeExe = Resolve-Exe "chrome" (Get-ChromePaths) "chrome.exe"
    if (-not $chromeExe) { Warn "Chrome no detectado, no se pueden restaurar pestañas."; return }
    foreach ($url in $snap.tabs) {
        try { Start-Process -FilePath $chromeExe -ArgumentList "`"$url`"" -ErrorAction SilentlyContinue } catch {}
    }
    Ok "Restauradas $($snap.tabs.Count) pestaña(s) de la sesión anterior."
}
function Invoke-ChromeIntelligent {
    $chrome = Resolve-Exe "chrome" (Get-ChromePaths) "chrome.exe"
    $chromeRunning = [bool](Get-Process chrome -ErrorAction SilentlyContinue)
    # Detectar cuenta Google activa
    $googleLoggedIn = $false
    $localState = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data\Local State"
    if (Test-Path $localState) {
        try {
            $ls = Get-Content $localState -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
            $accts = $ls.account_info
            if ($accts -and $accts.Count -gt 0) {
                $googleLoggedIn = $true
                Ok "Cuenta Google en Chrome: $($accts[0].email)"
            }
        } catch {}
    }
    # Detectar LastPass
    $lpId  = 'hdokiejnpimakedhajhdlcegeplioahd'
    $extDir = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data\Default\Extensions"
    $lpOk  = Test-Path (Join-Path $extDir $lpId)
    if ($lpOk)  { Ok   "LastPass detectado en Chrome." }
    else        { Warn "LastPass NO instalado. Se abrira la Chrome Web Store." }
    # URLs inteligentes
    $urls = [System.Collections.Generic.List[string]]::new()
    if (-not $googleLoggedIn) { $urls.Add("https://accounts.google.com/signin/chrome/sync") }
    $urls.Add("https://mail.google.com")
    $urls.Add("https://notion.so")
    $urls.Add("https://github.com/SeryMente/khora")
    if (-not $lpOk) { $urls.Add("https://chrome.google.com/webstore/detail/lastpass/" + $lpId) }
    L "INFO" "Chrome inteligente: $($urls.Count) URLs | login=$googleLoggedIn | lastpass=$lpOk | running=$chromeRunning"
    if ($chrome) {
        if ($chromeRunning) {
            foreach ($u in $urls) { Start-Process -FilePath $chrome -ArgumentList $u }
            Ok "Chrome ya activo: $($urls.Count) pestanas nuevas agregadas."
        } else {
            Start-Process -FilePath $chrome -ArgumentList (@("--new-window") + $urls)
            Ok "Chrome abierto con $($urls.Count) URLs."
        }
    } else {
        Warn "Chrome no encontrado. Abriendo con navegador por defecto..."
        foreach ($u in $urls) { Start-Process $u }
    }
}
function Invoke-ChromeCleanup {
    $chromeBase = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
    if (-not (Test-Path $chromeBase)) { Info "Sin datos de Chrome que limpiar."; return }
    Step "Limpieza manual de Chrome"
    Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 1000
    $totalBytes = 0; $cleared = 0
    $profiles = Get-ChildItem $chromeBase -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq "Default" -or $_.Name -match "^Profile" }
    $targets = @("Cookies","Cache","Code Cache","History","Login Data","Web Data","Visited Links","Network Action Predictor","Top Sites")
    foreach ($prof in $profiles) {
        foreach ($item in $targets) {
            $p = Join-Path $prof.FullName $item
            if (Test-Path $p) {
                try {
                    $sz = (Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                    $totalBytes += [long]$sz
                    Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
                    $cleared++
                } catch {}
            }
        }
    }
    foreach ($sh in @("ShaderCache","GrShaderCache")) {
        $p = Join-Path $chromeBase $sh
        if (Test-Path $p) {
            try {
                $sz = (Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                $totalBytes += [long]$sz
                Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue; $cleared++
            } catch {}
        }
    }
    $mb = [math]::Round($totalBytes / 1MB, 1)
    Ok "Chrome limpio: $cleared elementos borrados ($mb MB liberados)."
    L "INFO" "Chrome cleanup: $cleared items, $mb MB eliminados"
}
