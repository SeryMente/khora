# OEP workspace materialization and per-repository continuity

function Invoke-OepWithKhoraToken {
    param([Parameter(Mandatory=$true)][ScriptBlock]$Action)
    if(-not $script:KhoraTokenSecure){throw 'Sin token Khora para consultar la configuración OEP.'}
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($script:KhoraTokenSecure)
    try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer);return (& $Action $plain)}
    finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$plain=$null}
}

function Get-OepWorkspaceSelection {
    if(-not $KHORA_API_BASE){throw 'API Khora ausente para configuración OEP.'}
    $data=Invoke-OepWithKhoraToken -Action {
        param($token)
        $headers=@{Authorization=('Bearer '+$token);Accept='application/json';'Cache-Control'='no-cache';'User-Agent'='khora-ep-workspace/1'}
        Invoke-RestMethod -Uri ($KHORA_API_BASE.TrimEnd('/')+'/workspace') -Headers $headers -TimeoutSec 30
    }
    if(-not $data -or [string]$data.sessionId -ne [string]$SESSION_ID){throw 'La configuración OEP no corresponde a la sesión actual.'}
    if($null -eq $data.repositories -or $data.repositories -isnot [System.Array]){throw 'La selección de repositorios OEP es inválida.'}
    return @($data.repositories)
}

function Invoke-OepGitTokenCommand {
    param([Parameter(Mandatory=$true)][string]$RepositoryPath,[Parameter(Mandatory=$true)][string[]]$Arguments)
    $script:OepGitOutput=@();$script:OepGitExit=1
    Invoke-WithToken -Action {
        param($token)
        $askPass=Join-Path $env:TEMP ('khora-oep-askpass-'+[guid]::NewGuid().ToString('N')+'.cmd')
        $body=@'
@echo off
if /I %~1=="Username for 'https://github.com':" (echo x-access-token) else (echo %KHORA_GIT_TOKEN%)
'@
        [IO.File]::WriteAllText($askPass,$body,(New-Object Text.ASCIIEncoding))
        try {
            $env:KHORA_GIT_TOKEN=$token;$env:GIT_ASKPASS=$askPass;$env:GIT_TERMINAL_PROMPT='0'
            $script:OepGitOutput=@(& git -C $RepositoryPath @Arguments 2>&1);$script:OepGitExit=$LASTEXITCODE
        } finally {
            Remove-Item Env:KHORA_GIT_TOKEN,Env:GIT_ASKPASS -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath $askPass -Force -ErrorAction SilentlyContinue
        }
    }|Out-Null
    return [pscustomobject]@{Code=$script:OepGitExit;Output=@($script:OepGitOutput)}
}

function Get-OepStageablePaths {
    param([Parameter(Mandatory=$true)][string]$RepositoryPath)
    $paths=New-Object 'System.Collections.Generic.List[string]'
    foreach($line in @(& git -C $RepositoryPath -c core.quotePath=false status --porcelain --untracked-files=all)){
        if([string]::IsNullOrWhiteSpace($line)-or$line.Length-lt4){continue}
        $path=$line.Substring(3).Trim('"')
        if($path-match' -> '){$path=($path-split' -> ')[-1].Trim('"')}
        if($path-match'(^|[\\/])\.env($|\.)|(^|[\\/])session-state([\\/]|$)|(^|[\\/])logs([\\/]|$)|\.token$|\.pat$'){continue}
        $paths.Add($path)
    }
    return @($paths|Select-Object -Unique)
}

function Initialize-OepWorkspaceRepository {
    param([Parameter(Mandatory=$true)][object]$Repository)
    $name=[string]$Repository.name
    if($name-notmatch'^[A-Za-z0-9_.-]{1,100}$'){throw 'Nombre de repositorio OEP inválido.'}
    $path=Join-Path $WORKSPACE_DIR $name
    $remoteUrl='https://github.com/SeryMente/'+$name+'.git'
    if(-not(Test-Path -LiteralPath $WORKSPACE_DIR -PathType Container)){New-Item -ItemType Directory -Path $WORKSPACE_DIR -Force|Out-Null}
    if(Test-Path -LiteralPath $path){
        if(-not(Test-Path -LiteralPath (Join-Path $path '.git') -PathType Container)){
            $children=@(Get-ChildItem -LiteralPath $path -Force -ErrorAction SilentlyContinue)
            if($children.Count){throw ('La carpeta de trabajo '+$name+' ya existe y no es un repositorio OEP.')}
            Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        }else{
            $status=@(& git -C $path status --porcelain --untracked-files=all)
            if($status.Count){throw ('El repositorio '+$name+' tiene cambios locales antes de reinstanciar; no se sobrescribirá.')}
            $existingRemote=((& git -C $path remote get-url origin 2>&1)|Out-String).Trim()
            if($LASTEXITCODE-ne0-or$existingRemote-ne$remoteUrl){throw ('El remote de '+$name+' no coincide con SeryMente.')}
        }
    }
    if(-not(Test-Path -LiteralPath (Join-Path $path '.git') -PathType Container)){
        New-Item -ItemType Directory -Path $path -Force|Out-Null
        & git -C $path init|Out-Null
        if($LASTEXITCODE-ne0){throw ('git init falló en '+$name)}
        & git -C $path remote add origin $remoteUrl|Out-Null
        if($LASTEXITCODE-ne0){throw ('No se pudo registrar origin en '+$name)}
        & git -C $path config core.autocrlf false
        & git -C $path config user.name $CFG.gitName
        & git -C $path config user.email $CFG.gitEmail
    }
    $defaultBranch=[string]$Repository.defaultBranch
    if([string]::IsNullOrWhiteSpace($defaultBranch)){throw ('El repositorio '+$name+' no tiene rama principal definida.')}
    $remote=Invoke-OepGitTokenCommand -RepositoryPath $path -Arguments @('ls-remote','origin',('refs/heads/'+$defaultBranch))
    if($remote.Code-ne0-or$remote.Output.Count-eq0){throw ('No se pudo resolver la rama principal de '+$name+': '+(($remote.Output-join' ')|Mask-Token))}
    $mainSha=((([string]$remote.Output[0]).Trim())-split'\s+')[0]
    if($mainSha-notmatch'^[0-9a-f]{40}$'){throw ('SHA inválido para '+$name)}
    $fetch=Invoke-OepGitTokenCommand -RepositoryPath $path -Arguments @('fetch','--prune','origin',$mainSha)
    if($fetch.Code-ne0){throw ('git fetch falló en '+$name+': '+(($fetch.Output-join' ')|Mask-Token))}
    $refs=Invoke-OepGitTokenCommand -RepositoryPath $path -Arguments @('for-each-ref','--sort=-committerdate','--format=%(refname:short)','refs/remotes/origin/ep-wip/*')
    $wipBranch=$null
    if($refs.Code-eq0-and$refs.Output.Count-gt0){$candidate=([string]$refs.Output[0]).Trim();if($candidate-match'^origin/(.+)$'){$wipBranch=$Matches[1]}}
    if($wipBranch){& git -C $path checkout -B $wipBranch ('origin/'+$wipBranch)|Out-Null}
    else{$wipBranch='ep-wip/'+$name+'-'+$SESSION_ID;& git -C $path checkout -B $wipBranch $mainSha|Out-Null}
    if($LASTEXITCODE-ne0){throw ('No se pudo preparar WIP en '+$name)}
    $push=Invoke-OepGitTokenCommand -RepositoryPath $path -Arguments @('push','-u','origin',$wipBranch)
    if($push.Code-ne0){throw ('No se pudo registrar WIP remoto en '+$name+': '+(($push.Output-join' ')|Mask-Token))}
    $local=(& git -C $path rev-parse HEAD).Trim()
    $remoteVerify=Invoke-OepGitTokenCommand -RepositoryPath $path -Arguments @('ls-remote','origin',('refs/heads/'+$wipBranch))
    if($remoteVerify.Code-ne0-or$remoteVerify.Output.Count-eq0){throw ('No se pudo verificar WIP remoto en '+$name)}
    $remoteSha=((([string]$remoteVerify.Output[0]).Trim())-split'\s+')[0]
    if($local-ne$remoteSha){throw ('SHA WIP local/remoto no coincide en '+$name)}
    return [ordered]@{name=$name;path=$path;remote=$remoteUrl;defaultBranch=$defaultBranch;mainSha=$mainSha;wipBranch=$wipBranch;extensionRoot=if($Repository.extensionRoot){[string]$Repository.extensionRoot}else{$null};status='READY'}
}

function Materialize-OepWorkspaceRepositories {
    param([Parameter(Mandatory=$true)][object[]]$Selection)
    $result=New-Object 'System.Collections.Generic.List[object]'
    foreach($repo in @($Selection)){$result.Add((Initialize-OepWorkspaceRepository -Repository $repo))}
    return @($result)
}

function Sync-OepWorkspaceWip {
    $allOk=$true
    foreach($entry in @($script:SESSION.workspaceRepositories)){
        $path=[string]$entry.path;$branch=[string]$entry.wipBranch
        if([string]::IsNullOrWhiteSpace($path)-or-not(Test-Path -LiteralPath $path -PathType Container)){continue}
        foreach($file in Get-OepStageablePaths -RepositoryPath $path){& git -C $path add -- $file|Out-Null;if($LASTEXITCODE-ne0){$allOk=$false;break}}
        if(-not$allOk){continue}
        if(@(& git -C $path diff --cached --name-only).Count -gt 0){& git -C $path commit -m ('oep: continuidad '+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))|Out-Null;if($LASTEXITCODE-ne0){$allOk=$false;continue}}
        $push=Invoke-OepGitTokenCommand -RepositoryPath $path -Arguments @('push','-u','origin',$branch);if($push.Code-ne0){$allOk=$false;continue}
        $local=(& git -C $path rev-parse HEAD).Trim()
        $remote=Invoke-OepGitTokenCommand -RepositoryPath $path -Arguments @('ls-remote','origin',('refs/heads/'+$branch));if($remote.Code-ne0-or$remote.Output.Count-eq0){$allOk=$false;continue}
        $remoteSha=((([string]$remote.Output[0]).Trim())-split'\s+')[0];if($local-ne$remoteSha){$allOk=$false}
    }
    return $allOk
}
