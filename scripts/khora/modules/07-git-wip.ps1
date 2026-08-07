# ================================================================
# KHORA v7 - MODULO 07-git-wip.ps1
# Componente: 07 git wip
# ================================================================

$script:WIP_BRANCH = $null
function Invoke-GitTokenCmd {
    param([string[]]$GitArgs)
    $script:__gitArgs = $GitArgs; $script:__gitOut = $null; $script:__gitCode = 1
    Invoke-WithToken {
        param($t)
        $ga = $script:__gitArgs
        # URL-token temporal: set -> ejecutar -> restaurar (token no queda en .git/config)
        $__cmdUrl = "https://x-access-token:${t}@github.com/$REPO_ORG/$REPO_NAME.git"
        git -C $REPO_DIR remote set-url origin $__cmdUrl 2>&1 | Out-Null
        $script:__gitOut  = git -C $REPO_DIR @ga 2>&1
        $script:__gitCode = $LASTEXITCODE
        git -C $REPO_DIR remote set-url origin "https://github.com/$REPO_ORG/$REPO_NAME.git" 2>&1 | Out-Null
        $t = $null
        $__cmdUrl = $null
    }
    $script:__gitOut = Mask-Token -Text "$($script:__gitOut)"
    return @{ code = $script:__gitCode; out = (("$($script:__gitOut)" | Out-String)).Trim() }
}
function Push-Verified {
    param([string]$Branch, [int]$Retries = 3)
    if (-not $script:TokSecure) { L "WARN" "Push-Verified: sin token en memoria."; return $false }
    if (-not $Branch -or $Branch -eq "HEAD") { L "WARN" "Push-Verified: rama invalida [$Branch]."; return $false }
    $localSha = "$(git -C $REPO_DIR rev-parse HEAD 2>$null)".Trim()
    if (-not $localSha) { L "WARN" "Push-Verified: no hay HEAD local."; return $false }
    for ($i=1; $i -le $Retries; $i++) {
        $r = Invoke-GitTokenCmd -GitArgs @("push","-u","origin",$Branch)
        if ($r.code -eq 0) {
            # VERIFICACION REAL: el remoto debe reportar EXACTAMENTE el SHA local
            $lr = Invoke-GitTokenCmd -GitArgs @("ls-remote","origin","refs/heads/$Branch")
            $remoteSha = if ($lr.code -eq 0 -and $lr.out) { ($lr.out -split "\s+")[0] } else { "" }
            if ($remoteSha -eq $localSha) { return $true }
            L "WARN" "Push-Verified: push OK pero remoto[$remoteSha] != local[$localSha] (intento $i/$Retries)."
        } else {
            L "WARN" "Push-Verified: push fallo (intento $i/$Retries): $($r.out)"
        }
        if ($i -lt $Retries) { Start-Sleep -Seconds ($i * 5) }
    }
    return $false
}
function Test-UnpushedWork {
    if (-not (Test-Path "$REPO_DIR\.git")) { return $false }
    $dirty = (git -C $REPO_DIR status --porcelain 2>$null | Measure-Object).Count
    if ($dirty -gt 0) { return $true }
    $ahead = (git -C $REPO_DIR log --oneline --branches --not --remotes 2>$null | Measure-Object).Count
    return ($ahead -gt 0)
}
function Ensure-GitignoreHygiene {
    $gi = Join-Path $REPO_DIR ".gitignore"
    $pat = "logs/*.log"
    $patRe = "^logs/\*\.log$"
    $needsAdd = $true
    if (Test-Path $gi) {
        $lines = Get-Content $gi -ErrorAction SilentlyContinue
        if ($lines -match $patRe) { $needsAdd = $false }
    }
    if ($needsAdd) {
        Add-Content $gi "`n$pat" -Encoding UTF8 -ErrorAction SilentlyContinue
        Ok "$pat agregado a .gitignore"
    }
    # Obtener lista real de archivos log trackeados
    $tracked = @(git -C $REPO_DIR ls-files -- "logs/*.log" 2>$null)
    if ($tracked.Count -gt 0) {
        foreach ($tf in $tracked) {
            git -C $REPO_DIR rm --cached $tf 2>&1 | Out-Null
            Ok "Archivo trackeado removido del indice: $tf"
        }
    }
}
function Init-Wip {
    if (-not $CFG.enableAutoWip) { return }
    $__cur = (git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>$null)
    if ($__cur) { $__cur = $__cur.Trim() }
    if (-not $__cur -or $__cur -eq "HEAD") { $__cur = "main" }
    $script:WIP_BRANCH = $__cur
    Ok "Auto-WIP sobre la rama actual: $__cur"
    $global:LASTEXITCODE = 0
    if ($LASTEXITCODE -eq 0) {
        # Publicar de inmediato: el remoto conoce la rama desde el minuto cero
        if (Push-Verified -Branch $script:WIP_BRANCH -Retries 2) { Ok "Rama WIP publicada y VERIFICADA en remoto." }
        else { Warn "Rama WIP aun sin publicar; el auto-WIP reintentara en el proximo ciclo." }
    } else { Warn "No se pudo crear rama WIP (exit $LASTEXITCODE). Auto-WIP deshabilitado esta sesion."; $script:WIP_BRANCH = $null }
}
function Do-AutoWip {
    if (-not $CFG.enableAutoWip -or -not $script:WIP_BRANCH -or -not (Test-Path "$REPO_DIR\.git")) { return }
    $curBranch = (git -C $REPO_DIR rev-parse --abbrev-ref HEAD 2>$null).Trim()
    if ($curBranch -and $curBranch -ne "HEAD") { $script:WIP_BRANCH = $curBranch }
    if ($false) {
        return
    }
    Save-ChromeTabsSnapshot
    $changes = (git -C $REPO_DIR status --porcelain 2>&1 | Measure-Object).Count
    # Corre si hay cambios nuevos O si quedo un push pendiente de un ciclo anterior
    # Sin cambios en codigo: igual sincronizar logs si crecieron
    if ($changes -eq 0 -and -not $script:WIP_UNPUSHED) {
        $__rld = Join-Path $REPO_DIR "logs"
        New-Item -ItemType Directory -Force $__rld | Out-Null
        foreach ($__lf in @($LOG_FILE, $WORK_LOG)) {
            if (Test-Path $__lf) {
                $__dst = Join-Path $__rld (Split-Path $__lf -Leaf)
                $__srcSz = (Get-Item $__lf).Length
                $__dstSz = if (Test-Path $__dst) { (Get-Item $__dst).Length } else { 0 }
                if ($__srcSz -gt $__dstSz) { Copy-Item $__lf $__dst -Force -EA SilentlyContinue; L "INFO" "Log sincronizado a repo: $(Split-Path $__lf -Leaf)" }
            }
        }
        return
    }
    try {
        if ($changes -gt 0) {
            # Copiar logs al repo para que el commit los incluya
            $__rld = Join-Path $REPO_DIR "logs"
            New-Item -ItemType Directory -Force $__rld | Out-Null
            foreach ($__lf in @($LOG_FILE, $WORK_LOG)) {
                if (Test-Path $__lf) { Copy-Item $__lf (Join-Path $__rld (Split-Path $__lf -Leaf)) -Force -EA SilentlyContinue }
            }
            L "INFO" "Auto-WIP: logs copiados a repo/logs/ (incluidos en el commit)"
            $__addOut = git -C $REPO_DIR add -A 2>&1
            L "INFO" "git add: $(if($LASTEXITCODE -eq 0){'OK'}else{'EXIT '+ $LASTEXITCODE}) $__addOut"
            if ($LASTEXITCODE -ne 0) { throw "git add fallo (exit $LASTEXITCODE)" }
            $__cmtOut = git -C $REPO_DIR commit -m "wip: auto-guardado $(Get-Date -Format 'HH:mm:ss')" 2>&1
            L "INFO" "git commit: $(if($LASTEXITCODE -eq 0){'OK'}else{'EXIT '+ $LASTEXITCODE}) $__cmtOut"
            if ($LASTEXITCODE -ne 0) { throw "git commit fallo (exit $LASTEXITCODE)" }
        }
        if (Push-Verified -Branch $script:WIP_BRANCH) {
            $script:WIP_UNPUSHED = $false
            L "INFO" "Auto-WIP VERIFICADO: $changes cambio(s) respaldados en $script:WIP_BRANCH"
        } else {
            $script:WIP_UNPUSHED = $true
            Warn "Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo)."
        }
    } catch { $script:WIP_UNPUSHED = $true; L "WARN" "Auto-WIP fallo: $_" }
}
