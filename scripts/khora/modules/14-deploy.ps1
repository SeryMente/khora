# Vercel autorizado sin despliegue automático.
function Connect-KhoraVercel {
    $token=[Environment]::GetEnvironmentVariable('VERCEL_TOKEN','Process');if([string]::IsNullOrWhiteSpace($token)){throw'VERCEL_TOKEN ausente.'}
    $vercel=Ensure-VercelCLI
    & $vercel whoami 2>&1|ForEach-Object{Info ('vercel whoami: '+(Mask-Token([string]$_)))};if($LASTEXITCODE-ne0){throw'Vercel no autorizado.'}
    $web=Join-Path $REPO_DIR 'khora-web';& $vercel link --yes --cwd $web --scope $CFG.vercelScope --project $CFG.vercelProject 2>&1|ForEach-Object{Info ('vercel link: '+(Mask-Token([string]$_)))}
    if($LASTEXITCODE-ne0){throw'vercel link falló.'};return$true
}
function Ensure-VercelAuth{return(Connect-KhoraVercel)}
function Deploy-Production{throw'El arranque nunca despliega producción.'}
function Invoke-KhoraDeploy{throw'Despliegue requiere acción separada y explícita.'}
