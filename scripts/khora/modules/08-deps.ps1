# Toolchain efímero y precarga paralela.
$script:PrefetchJobs = @{}
$script:PrefetchPlan = @{}
$script:DependencyJobs = @{}

function Add-KhoraPath {
    param([string]$Path)
    if ($Path -and (Test-Path $Path) -and (($env:Path -split ';') -notcontains $Path)) { $env:Path = $Path + ';' + $env:Path }
}

function Start-KhoraDownloadJob {
    param([string]$Name,[string]$Uri,[string]$Path)
    if (Test-Path $Path) { return }
    New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
    $script:PrefetchPlan[$Name] = @{ Uri=$Uri; Path=$Path }
    $script:PrefetchJobs[$Name] = Start-Job -ArgumentList @($Uri,$Path) -ScriptBlock {
        param($source,$destination)
        $ProgressPreference='SilentlyContinue'
        [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $source -OutFile $destination -UseBasicParsing -TimeoutSec 1200
    }
}

function Start-KhoraPrefetch {
    $directory = Join-Path $WORK_DIR 'prefetch'
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $release=Invoke-RestMethod -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers @{'User-Agent'='khora-ep'}
        $asset=$release.assets|Where-Object{$_.name -match '^PortableGit-.*-64-bit\.7z\.exe$'}|Select-Object -First 1
        if(-not$asset){throw'No se encontró PortableGit.'}
        Start-KhoraDownloadJob -Name git -Uri $asset.browser_download_url -Path (Join-Path $directory $asset.name)
    }
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        $release=Invoke-RestMethod -Uri 'https://api.github.com/repos/cli/cli/releases/latest' -Headers @{'User-Agent'='khora-ep'}
        $asset=$release.assets|Where-Object{$_.name -match '^gh_.*_windows_amd64\.zip$'}|Select-Object -First 1
        $sums=$release.assets|Where-Object{$_.name -match 'checksums\.txt$'}|Select-Object -First 1
        if(-not$asset-or-not$sums){throw'No se encontró GitHub CLI.'}
        Start-KhoraDownloadJob -Name gh -Uri $asset.browser_download_url -Path (Join-Path $directory $asset.name)
        Start-KhoraDownloadJob -Name ghSums -Uri $sums.browser_download_url -Path (Join-Path $directory $sums.name)
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $index=Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
        $release=$index|Where-Object{$_.lts -and ($_.files -contains 'win-x64-zip')}|Select-Object -First 1
        if(-not$release){throw'No se encontró Node.js LTS.'}
        $name='node-'+$release.version+'-win-x64.zip';$base='https://nodejs.org/dist/'+$release.version
        Start-KhoraDownloadJob -Name node -Uri ($base+'/'+$name) -Path (Join-Path $directory $name)
        Start-KhoraDownloadJob -Name nodeSums -Uri ($base+'/SHASUMS256.txt') -Path (Join-Path $directory 'node-SHASUMS256.txt')
    }
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Start-KhoraDownloadJob -Name python -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -Path (Join-Path $directory 'python-3.11.9-amd64.exe')
    }
    $metadata=Invoke-RestMethod -Uri 'https://update.code.visualstudio.com/api/update/win32-x64-archive/stable/latest'
    $script:PrefetchPlan['vscodeHash']=[string]$metadata.sha256hash
    Start-KhoraDownloadJob -Name vscode -Uri 'https://update.code.visualstudio.com/latest/win32-x64-archive/stable' -Path (Join-Path $directory 'vscode.zip')
}

function Wait-KhoraPrefetch {
    param([string]$Name)
    $job=$script:PrefetchJobs[$Name]
    if($job){
        Wait-Job $job|Out-Null
        $output=@(Receive-Job $job -ErrorAction SilentlyContinue)
        if($job.State -ne 'Completed'){throw("Descarga $Name falló: "+($output -join ' '))}
        Remove-Job $job -Force
        $script:PrefetchJobs.Remove($Name)
    }
    $plan=$script:PrefetchPlan[$Name]
    if($plan -and (Test-Path $plan.Path)){return [string]$plan.Path}
    return $null
}

function Ensure-Git {
    if(Get-Command git -ErrorAction SilentlyContinue){return $true}
    $installer=Wait-KhoraPrefetch -Name git
    if(-not$installer){throw'PortableGit ausente.'}
    if((Get-AuthenticodeSignature $installer).Status -ne 'Valid'){throw'Firma PortableGit inválida.'}
    $target=Join-Path $WORK_DIR 'tools\git';New-Item -ItemType Directory -Path $target -Force|Out-Null
    $process=Start-Process $installer -ArgumentList @("-o`"$target`"",'-y') -Wait -PassThru
    if($process.ExitCode -ne 0){throw'Extracción Git falló.'}
    Add-KhoraPath -Path (Join-Path $target 'cmd')
    return [bool](Get-Command git -ErrorAction SilentlyContinue)
}

function Ensure-GhCli {
    $existing=Get-Command gh -ErrorAction SilentlyContinue;if($existing){return $existing.Source}
    $zip=Wait-KhoraPrefetch -Name gh;$sumFile=Wait-KhoraPrefetch -Name ghSums
    if(-not$zip-or-not$sumFile){throw'GitHub CLI ausente.'}
    $line=Get-Content $sumFile|Where-Object{$_ -match [regex]::Escape((Split-Path $zip -Leaf))}|Select-Object -First 1
    if(-not$line){throw'Checksum GitHub CLI ausente.'}
    if((Get-FileHash $zip -Algorithm SHA256).Hash -ine (($line -split '\s+')[0])){throw'Checksum GitHub CLI inválido.'}
    $target=Join-Path $WORK_DIR 'tools\gh';Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
    $gh=Get-ChildItem $target -Filter gh.exe -Recurse|Select-Object -First 1;if(-not$gh){throw'gh.exe ausente.'}
    Add-KhoraPath -Path $gh.DirectoryName;return $gh.FullName
}

function Confirm-GhCliAuth {
    if(-not(Ensure-Git)){return $false};$gh=Ensure-GhCli
    Invoke-WithToken -Action {
        param($token)
        $env:GH_TOKEN=$token
        try{$token|& $gh auth login --hostname github.com --git-protocol https --with-token --insecure-storage 2>&1|ForEach-Object{Info ('gh: '+(Mask-Token([string]$_)))}}
        finally{Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue}
    }|Out-Null
    if($LASTEXITCODE -ne 0){return $false}
    & $gh auth setup-git --hostname github.com|Out-Null
    return ($LASTEXITCODE -eq 0 -and (Test-KhoraGitHubToken))
}

function Ensure-Node {
    $existing=Get-Command node -ErrorAction SilentlyContinue;if($existing){return $existing.Source}
    $zip=Wait-KhoraPrefetch -Name node;$sumFile=Wait-KhoraPrefetch -Name nodeSums
    if(-not$zip-or-not$sumFile){throw'Node.js ausente.'}
    $line=Get-Content $sumFile|Where-Object{$_ -match [regex]::Escape((Split-Path $zip -Leaf))}|Select-Object -First 1
    if(-not$line-or(Get-FileHash $zip -Algorithm SHA256).Hash -ine (($line.Trim() -split '\s+')[0])){throw'Checksum Node.js inválido.'}
    $target=Join-Path $WORK_DIR 'tools\node';Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
    $node=Get-ChildItem $target -Filter node.exe -Recurse|Select-Object -First 1;if(-not$node){throw'node.exe ausente.'}
    Add-KhoraPath -Path $node.DirectoryName;return $node.FullName
}

function Ensure-Python311 {
    $existing=Get-Command python -ErrorAction SilentlyContinue
    if($existing -and $existing.Source -notmatch '\\WindowsApps\\'){if((& $existing.Source --version 2>&1) -match '^Python 3\.(1[1-9]|[2-9]\d)'){return $existing.Source}}
    $installer=Wait-KhoraPrefetch -Name python;if(-not$installer){throw'Python ausente.'}
    if((Get-AuthenticodeSignature $installer).Status -ne 'Valid'){throw'Firma Python inválida.'}
    $target=Join-Path $WORK_DIR 'tools\python311';New-Item -ItemType Directory -Path $target -Force|Out-Null
    $arguments='/quiet InstallAllUsers=0 PrependPath=0 Include_pip=1 Include_test=0 TargetDir="'+$target+'"'
    $process=Start-Process $installer -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
    $python=Join-Path $target 'python.exe';if($process.ExitCode -ne 0 -or -not(Test-Path $python)){throw'Instalación Python falló.'}
    Add-KhoraPath -Path $target;return $python
}

function Ensure-VSCode {
    $target=Join-Path $WORK_DIR 'tools\vscode';$code=Join-Path $target 'Code.exe'
    if(-not(Test-Path $code)){
        $zip=Wait-KhoraPrefetch -Name vscode;if(-not$zip){throw'Visual Studio Code ausente.'}
        $expected=[string]$script:PrefetchPlan['vscodeHash'];if($expected -and (Get-FileHash $zip -Algorithm SHA256).Hash -ine $expected){throw'Checksum Visual Studio Code inválido.'}
        Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
        if(-not(Test-Path $code)-or(Get-AuthenticodeSignature $code).Status -ne 'Valid'){throw'Firma Visual Studio Code inválida.'}
    }
    foreach($path in @((Join-Path $target 'data\user-data'),(Join-Path $target 'data\extensions'),(Join-Path $target 'data\tmp'))){New-Item -ItemType Directory -Path $path -Force|Out-Null}
    return $code
}

function Get-CodeCli {$code=Ensure-VSCode;return (Join-Path (Split-Path -Parent $code) 'bin\code.cmd')}
function Ensure-VercelCLI {
    $node=Ensure-Node;$npm=Join-Path (Split-Path -Parent $node) 'npm.cmd';if(-not(Test-Path $npm)){$npm=(Get-Command npm.cmd -ErrorAction Stop).Source}
    $target=Join-Path $WORK_DIR 'tools\vercel';$vercel=Join-Path $target 'node_modules\.bin\vercel.cmd'
    if(-not(Test-Path $vercel)){& $npm install --prefix $target --no-save --no-audit --no-fund vercel@latest 2>&1|ForEach-Object{Info ('npm vercel: '+[string]$_)};if($LASTEXITCODE -ne 0){throw'Instalación Vercel CLI falló.'}}
    return $vercel
}

function Sync-VSCodeConfig {
    $code=Ensure-VSCode;$data=Join-Path (Split-Path -Parent $code) 'data';$encrypted=Join-Path $REPO_DIR 'ep-state\vscode-profile.v1.enc'
    if(-not(Test-Path $encrypted)){return }
    $zip=Join-Path $env:TEMP 'vscode-profile.zip';$stage=Join-Path $env:TEMP 'vscode-profile'
    Unprotect-KhoraFile -InputFile $encrypted -OutputFile $zip;Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
    if(Test-Path(Join-Path $stage 'user-data')){Copy-Item -Path (Join-Path $stage 'user-data\*') -Destination (Join-Path $data 'user-data') -Recurse -Force -ErrorAction SilentlyContinue}
    $list=Join-Path $stage 'extensions.txt';if(Test-Path $list){$cli=Get-CodeCli;Get-Content $list|Where-Object{$_}|ForEach-Object{& $cli --install-extension $_ --force|Out-Null}}
    Remove-Item -LiteralPath $zip,$stage -Recurse -Force -ErrorAction SilentlyContinue
}

function Export-VSCodeConfig {
    $code=Ensure-VSCode;$base=Split-Path -Parent $code;$stage=Join-Path $env:TEMP 'vscode-export'
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue;New-Item -ItemType Directory -Path $stage -Force|Out-Null
    Copy-Item -Path (Join-Path $base 'data\user-data') -Destination (Join-Path $stage 'user-data') -Recurse -Force -ErrorAction SilentlyContinue
    $cli=Join-Path $base 'bin\code.cmd';if(Test-Path $cli){@(& $cli --list-extensions)|Set-Content -LiteralPath (Join-Path $stage 'extensions.txt') -Encoding UTF8}
    $zip=Join-Path $env:TEMP 'vscode-profile.zip';Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
    $encrypted=Join-Path $REPO_DIR 'ep-state\vscode-profile.v1.enc';New-Item -ItemType Directory -Path (Split-Path -Parent $encrypted) -Force|Out-Null
    Protect-KhoraFile -InputFile $zip -OutputFile $encrypted
    Remove-Item -LiteralPath $zip,$stage -Recurse -Force -ErrorAction SilentlyContinue
}

function New-KhoraWorkspaceFile {
    $file=Join-Path $WORK_DIR 'KHORA.code-workspace';$request=Join-Path $STATE_DIR 'cleanup.request'
    $command="Set-Content -LiteralPath '"+$request.Replace("'","''")+"' -Value 'manual-vscode' -Encoding UTF8"
    $object=[ordered]@{folders=@(@{path=$REPO_DIR});settings=@{'terminal.integrated.cwd'=$REPO_DIR};tasks=@{version='2.0.0';tasks=@(@{label='KHORA: Finalizar sesión';type='shell';command='powershell.exe';args=@('-NoProfile','-Command',$command);problemMatcher=@()})}}
    [IO.File]::WriteAllText($file,($object|ConvertTo-Json -Depth 10),(New-Object Text.UTF8Encoding($false)));return $file
}
function Start-KhoraVSCode {
    $code=Ensure-VSCode;$workspace=New-KhoraWorkspaceFile
    $process=Start-Process $code -ArgumentList @('-n',("`"{0}`""-f$workspace),("`"{0}`""-f$script:STATUS_FILE)) -PassThru
    $script:VSCODE_PID=$process.Id;return $process
}

function Start-KhoraDependencyHydration {
    $python=Ensure-Python311;$node=Ensure-Node;$venv=Join-Path $WORK_DIR 'venv';$web=Join-Path $REPO_DIR 'khora-web';$npm=Join-Path (Split-Path -Parent $node) 'npm.cmd'
    if(Test-Path(Join-Path $REPO_DIR 'pyproject.toml')){$script:DependencyJobs['python']=Start-Job -ArgumentList @($python,$venv,$REPO_DIR) -ScriptBlock {param($py,$ve,$repo)& $py -m venv $ve;if($LASTEXITCODE-ne0){throw'venv falló'};& (Join-Path $ve 'Scripts\python.exe') -m pip install -e $repo --disable-pip-version-check;if($LASTEXITCODE-ne0){throw'pip falló'}}}
    if(Test-Path(Join-Path $web 'package-lock.json')){$script:DependencyJobs['node']=Start-Job -ArgumentList @($npm,$web) -ScriptBlock {param($npmPath,$directory)& $npmPath --prefix $directory ci --no-audit --no-fund;if($LASTEXITCODE-ne0){throw'npm ci falló'}}}
}
function Wait-KhoraDependencyHydration {
    foreach($name in @($script:DependencyJobs.Keys)){$job=$script:DependencyJobs[$name];Wait-Job $job|Out-Null;$output=@(Receive-Job $job -ErrorAction SilentlyContinue);$output|ForEach-Object{Info ("dependency ${name}: "+[string]$_)};if($job.State-ne'Completed'){throw"Dependencias $name fallaron."};Remove-Job $job -Force}
    $script:DependencyJobs=@{}
}
function Start-DepsPreload{Start-KhoraPrefetch}
function Wait-DepsPreload{}
function Setup-Venv{}
function Setup-KhoraWeb{}
function Start-ProactiveDepPrep{}
function Wait-ProactiveDepPrep{return $false}
function Ensure-Docker{Info 'Docker bajo demanda.'}
function Ensure-RenderCLI{Info 'Render bajo demanda.'}
