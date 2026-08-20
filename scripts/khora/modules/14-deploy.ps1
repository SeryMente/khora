# Vercel autorizado y main exacto publicado en cada instanciacion.
function Write-KhoraVercelOutput {
    param([object[]]$Lines,[string]$Prefix)
    foreach($line in @($Lines)){Info ($Prefix+': '+(Mask-Token([string]$line)))}
}
function Connect-KhoraVercel {
    $token=[Environment]::GetEnvironmentVariable('VERCEL_TOKEN','Process')
    if([string]::IsNullOrWhiteSpace($token)){throw'VERCEL_TOKEN ausente.'}
    $vercel=Ensure-VercelCLI
    $output=@(& $vercel whoami 2>&1);$exit=$LASTEXITCODE
    Write-KhoraVercelOutput -Lines $output -Prefix 'vercel whoami'
    if($exit-ne0){throw'Vercel no autorizado.'}
    return $vercel
}
function Test-KhoraRemoteMainExact {
    param([string]$ExpectedSha)
    $remote=Invoke-GitTokenCommand -Arguments @('ls-remote','origin','refs/heads/main')
    if($remote.Code-ne0-or$remote.Output.Count-eq0){throw'No se pudo resolver origin/main antes del despliegue.'}
    $remoteSha=((([string]$remote.Output[0]).Trim())-split'\s+')[0]
    if($remoteSha-ne$ExpectedSha){throw'main cambio durante el arranque; reinicia para publicar el commit nuevo.'}
    return $true
}
function Publish-KhoraMain {
    param([Parameter(Mandatory=$true)][string]$VercelPath,[Parameter(Mandatory=$true)][string]$ExpectedSha)
    if($ExpectedSha-notmatch'^[0-9a-f]{40}$'){throw'SHA main invalido.'}
    if(-not(Test-KhoraRemoteMainExact -ExpectedSha $ExpectedSha)){throw'No se pudo fijar main.'}
    $head=(& git -C $REPO_DIR rev-parse HEAD).Trim()
    if($LASTEXITCODE-ne0-or$head-ne$ExpectedSha){throw'El arbol local no corresponde al main fijado.'}
    & git -C $REPO_DIR diff --quiet --
    if($LASTEXITCODE-ne0){throw'Hay cambios rastreados antes de publicar main.'}
    & git -C $REPO_DIR diff --cached --quiet --
    if($LASTEXITCODE-ne0){throw'Hay cambios preparados antes de publicar main.'}
    $short=$ExpectedSha.Substring(0,12)
    $archive=Join-Path $WORK_DIR ('deploy-main-'+$short+'.zip')
    $deployRoot=Join-Path $WORK_DIR ('deploy-main-'+$short)
    Remove-Item -LiteralPath $archive,$deployRoot -Recurse -Force -ErrorAction SilentlyContinue
    try {
        & git -C $REPO_DIR archive --format=zip --output=$archive $ExpectedSha
        if($LASTEXITCODE-ne0-or-not(Test-Path $archive)){throw'No se pudo crear el arbol limpio de main.'}
        Expand-Archive -LiteralPath $archive -DestinationPath $deployRoot -Force
        $web=Join-Path $deployRoot 'khora-web'
        if(-not(Test-Path(Join-Path $web 'package.json'))){throw'El main fijado no contiene khora-web.'}
        $proof=[ordered]@{schema='khora-live-main/v1';branch='main';commitSha=$ExpectedSha;publishedUtc=[DateTime]::UtcNow.ToString('o')}
        $public=Join-Path $web 'public';New-Item -ItemType Directory -Path $public -Force|Out-Null
        [IO.File]::WriteAllText((Join-Path $public 'ep-main-live.json'),($proof|ConvertTo-Json -Compress),(New-Object Text.UTF8Encoding($false)))
        $output=@(& $VercelPath link --yes --cwd $deployRoot --scope $CFG.vercelScope --project $CFG.vercelProject 2>&1);$exit=$LASTEXITCODE
        Write-KhoraVercelOutput -Lines $output -Prefix 'vercel link'
        if($exit-ne0){throw'vercel link fallo.'}
        $output=@(& $VercelPath deploy --prod --cwd $deployRoot --scope $CFG.vercelScope 2>&1);$exit=$LASTEXITCODE
        Write-KhoraVercelOutput -Lines $output -Prefix 'vercel deploy production'
        if($exit-ne0){throw'vercel deploy --prod fallo.'}
        $canonical=([string]$CFG.vercelCanonicalUrl).TrimEnd('/')
        $proofUri=$canonical+'/ep-main-live.json?sha='+$ExpectedSha
        $verified=$false
        foreach($attempt in 1..30){
            try{$remote=Invoke-RestMethod -Uri $proofUri -Headers @{'Cache-Control'='no-cache';Pragma='no-cache'} -TimeoutSec 20;if([string]$remote.commitSha-eq$ExpectedSha-and[string]$remote.branch-eq'main'){$verified=$true;break}}catch{Info ('verificacion live main intento '+$attempt+': '+$_.Exception.Message)}
            Start-Sleep -Seconds 2
        }
        if(-not$verified){throw'El alias canonico no acredita el SHA exacto de main.'}
        return [pscustomobject]@{Sha=$ExpectedSha;Url=$canonical;ProofUrl=$proofUri;PublishedUtc=[string]$proof.publishedUtc}
    } finally {
        Remove-Item -LiteralPath $archive,$deployRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
function Ensure-VercelAuth{return (Connect-KhoraVercel)}
function Deploy-Production {
    param([string]$ExpectedSha=[string]$script:SESSION.commitSha)
    $vercel=Connect-KhoraVercel
    return (Publish-KhoraMain -VercelPath $vercel -ExpectedSha $ExpectedSha)
}
function Invoke-KhoraDeploy{return (Deploy-Production)}
