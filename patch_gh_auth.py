import re

with open('scripts/khora/khora-v6.5.4.ps1', 'r') as f:
    c = f.read()

# Fix Confirm-GhCliAuth
old_gh_auth = r'''function Confirm-GhCliAuth {
    param([switch]$CheckOnly)
    if (-not (Test-Cmd gh)) { Warn "gh CLI no encontrado."; return $false }
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        if ($CheckOnly) { Warn "gh CLI no autenticado."; return $false }
        Info "Iniciando autenticacion en gh CLI (se abrira el navegador)..."
        gh auth login --hostname github.com --git-protocol https --web 2>&1 | ForEach-Object { Info "gh: $_" }
        gh auth status 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Fail "gh CLI no pudo autenticarse."; return $false }
    }
    if (-not $CheckOnly) {
        gh auth setup-git 2>&1 | Out-Null
    }
    Ok "gh CLI autenticado."
    return $true
}'''

new_gh_auth = r'''function Confirm-GhCliAuth {
    param([switch]$CheckOnly)
    if (-not (Test-Cmd gh)) { Warn "gh CLI no encontrado."; return $false }
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        if ($CheckOnly) { Warn "gh CLI no autenticado."; return $false }
        Info "Iniciando autenticacion en gh CLI (se abrira el navegador)..."
        gh auth login --hostname github.com --git-protocol https --web 2>&1 | ForEach-Object { Info "gh: $_" }
        gh auth status 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Fail "gh CLI no pudo autenticarse."; return $false }
    }
    # Siempre configurar el setup-git para garantizar que las rutinas desatendidas o en procesos separados
    # puedan autenticarse vía gh (útil cuando el token de script expira o falta en memoria).
    gh auth setup-git 2>&1 | Out-Null
    Ok "gh CLI autenticado (git setup listo)."
    return $true
}'''

c = c.replace(old_gh_auth, new_gh_auth)

# Fix Push-Verified
old_push_verified = r'''function Push-Verified {
    param([string]$Branch, [int]$Retries = 3)
    if (-not $script:TokSecure) { L "WARN" "Push-Verified: sin token en memoria."; return $false }
    if (-not $Branch -or $Branch -eq "HEAD") { L "WARN" "Push-Verified: rama invalida [$Branch]."; return $false }
    $localSha = "$(git -C $REPO_DIR rev-parse HEAD 2>$null)".Trim()
    if (-not $localSha) { L "WARN" "Push-Verified: no hay HEAD local."; return $false }
    for ($i=1; $i -le $Retries; $i++) {
        $r = Invoke-GitTokenCmd -GitArgs @("push","-u","origin",$Branch)'''

new_push_verified = r'''function Push-Verified {
    param([string]$Branch, [int]$Retries = 3)
    if (-not $Branch -or $Branch -eq "HEAD") { L "WARN" "Push-Verified: rama invalida [$Branch]."; return $false }
    $localSha = "$(git -C $REPO_DIR rev-parse HEAD 2>$null)".Trim()
    if (-not $localSha) { L "WARN" "Push-Verified: no hay HEAD local."; return $false }

    # Si no hay token en memoria (ej. tarea programada, o guardian), intentamos usar auth de gh CLI.
    # El usuario original probablemente corrió gh auth setup-git, por lo que el git nativo debería funcionar sin token inyectado.
    $useGhAuthFallback = (-not $script:TokSecure)
    if ($useGhAuthFallback) { L "INFO" "Push-Verified: Sin token en memoria. Usando git push directo (dependiendo de gh auth)." }

    for ($i=1; $i -le $Retries; $i++) {
        $r = $null
        if ($useGhAuthFallback) {
            $__gitOut = git -C $REPO_DIR push -u origin $Branch 2>&1
            $r = @{ code = $LASTEXITCODE; out = (($__gitOut | Out-String).Trim()) }
        } else {
            $r = Invoke-GitTokenCmd -GitArgs @("push","-u","origin",$Branch)
        }'''

c = c.replace(old_push_verified, new_push_verified)

old_push_verified_2 = r'''        if ($r.code -eq 0) {
            # VERIFICACION REAL: el remoto debe reportar EXACTAMENTE el SHA local
            $lr = Invoke-GitTokenCmd -GitArgs @("ls-remote","origin","refs/heads/$Branch")
            $remoteSha = if ($lr.code -eq 0 -and $lr.out) { ($lr.out -split "\s+")[0] } else { "" }
            if ($remoteSha -eq $localSha) { return $true }'''

new_push_verified_2 = r'''        if ($r.code -eq 0) {
            # VERIFICACION REAL: el remoto debe reportar EXACTAMENTE el SHA local
            $lr = $null
            if ($useGhAuthFallback) {
                $__gitOut = git -C $REPO_DIR ls-remote origin refs/heads/$Branch 2>&1
                $lr = @{ code = $LASTEXITCODE; out = (($__gitOut | Out-String).Trim()) }
            } else {
                $lr = Invoke-GitTokenCmd -GitArgs @("ls-remote","origin","refs/heads/$Branch")
            }
            $remoteSha = if ($lr.code -eq 0 -and $lr.out) { ($lr.out -split "\s+")[0] } else { "" }
            if ($remoteSha -eq $localSha) { return $true }'''

c = c.replace(old_push_verified_2, new_push_verified_2)

with open('scripts/khora/khora-v6.5.4.ps1', 'w') as f:
    f.write(c)
