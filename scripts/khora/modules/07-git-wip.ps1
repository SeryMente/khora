# Git privado y continuidad WIP.
function Invoke-GitTokenCommand {
    param([string[]]$Arguments)
    $script:GitOutput=@();$script:GitExit=1
    Invoke-WithToken -Action {
        param($token)
        $askPass=Join-Path $env:TEMP ('khora-askpass-'+[guid]::NewGuid().ToString('N')+'.cmd')
        $body="@echo off`r`nif /I `%~1==`"Username for 'https://github.com':`" (echo x-access-token) else (echo `%KHORA_GIT_TOKEN`%)`r`n"
        [IO.File]::WriteAllText($askPass,$body,(New-Object Text.ASCIIEncoding))
        try {
            $env:KHORA_GIT_TOKEN=$token;$env:GIT_ASKPASS=$askPass;$env:GIT_TERMINAL_PROMPT='0'
            $script:GitOutput=@(& git -C $REPO_DIR @Arguments 2>&1);$script:GitExit=$LASTEXITCODE
        } finally { Remove-Item Env:KHORA_GIT_TOKEN,Env:GIT_ASKPASS -ErrorAction SilentlyContinue;Remove-Item -LiteralPath $askPass -Force -ErrorAction SilentlyContinue }
    }|Out-Null
    return [pscustomobject]@{Code=$script:GitExit;Output=@($script:GitOutput)}
}
function Initialize-KhoraRepository {
    if(-not(Get-Command git -ErrorAction SilentlyContinue)){throw'Git no disponible.'}
    if(-not(Test-Path(Join-Path $REPO_DIR '.git'))){& git -C $REPO_DIR init|Out-Null;& git -C $REPO_DIR remote add origin 'https://github.com/SeryMente/khora.git'|Out-Null}
    & git -C $REPO_DIR config user.name $CFG.gitName;& git -C $REPO_DIR config user.email $CFG.gitEmail;& git -C $REPO_DIR config core.autocrlf false
    $sha=[string]$script:SESSION.commitSha;$fetch=Invoke-GitTokenCommand -Arguments @('fetch','--prune','origin',$sha)
    if($fetch.Code-ne0){throw('git fetch falló: '+(($fetch.Output-join' ')|Mask-Token))}
    & git -C $REPO_DIR reset --hard $sha|Out-Null
    if((& git -C $REPO_DIR rev-parse HEAD).Trim()-ne$sha){throw'El SHA local no coincide con el remoto.'}
}
function Init-Wip {
    $list=Invoke-GitTokenCommand -Arguments @('for-each-ref','--sort=-committerdate','--format=%(refname:short)','refs/remotes/origin/ep-wip/*');$branch=$null
    if($list.Code-eq0-and$list.Output.Count-gt0){$remote=([string]$list.Output[0]).Trim();if($remote-match'^origin/(.+)$'){$branch=$Matches[1];& git -C $REPO_DIR checkout -B $branch $remote|Out-Null}}
    if(-not$branch){$branch='ep-wip/'+(Get-Date -Format 'yyyyMMdd-HHmmss');& git -C $REPO_DIR checkout -b $branch|Out-Null}
    if($LASTEXITCODE-ne0){throw'No se pudo preparar la rama WIP.'};$script:WIP_BRANCH=$branch
}
function Get-KhoraStageablePaths {
    $paths=New-Object 'System.Collections.Generic.List[string]'
    foreach($line in @(& git -C $REPO_DIR -c core.quotePath=false status --porcelain --untracked-files=all)){
        if([string]::IsNullOrWhiteSpace($line)-or$line.Length-lt4){continue};$path=$line.Substring(3).Trim('"');if($path-match' -> '){$path=($path-split' -> ')[-1].Trim('"')}
        if($path-match'(^|[\\/])\.env($|\.)|(^|[\\/])session-state([\\/]|$)|(^|[\\/])logs([\\/]|$)|\.token$|\.pat$'){Warn('Ruta sensible omitida: '+$path);continue};$paths.Add($path)
    }
    return @($paths|Select-Object -Unique)
}
function Push-Verified {
    param([string]$Branch=$script:WIP_BRANCH)
    $push=Invoke-GitTokenCommand -Arguments @('push','-u','origin',$Branch);if($push.Code-ne0){return $false}
    $local=(& git -C $REPO_DIR rev-parse HEAD).Trim();$remote=Invoke-GitTokenCommand -Arguments @('ls-remote','origin',('refs/heads/'+$Branch))
    if($remote.Code-ne0-or$remote.Output.Count-eq0){return $false};return ($local-eq((([string]$remote.Output[0])-split'\s+')[0]))
}
function Do-AutoWip {
    foreach($path in Get-KhoraStageablePaths){& git -C $REPO_DIR add -- $path|Out-Null;if($LASTEXITCODE-ne0){throw"No se pudo stagear $path"}}
    if(@(& git -C $REPO_DIR diff --cached --name-only).Count-gt0){& git -C $REPO_DIR commit -m ('ep: continuidad '+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))|Out-Null;if($LASTEXITCODE-ne0){throw'Commit WIP falló.'}}
    return (Push-Verified)
}
function Test-UnpushedWork{return [bool]((Get-KhoraStageablePaths).Count-gt0)}
function Ensure-GitignoreHygiene{}
