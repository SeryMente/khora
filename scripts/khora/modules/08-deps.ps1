function Find-KhoraHostExecutable {
    param([Parameter(Mandatory=$true)][ValidateSet('git','gh','node','npm','python')][string]$Name)
    $programFiles=[Environment]::GetEnvironmentVariable('ProgramFiles')
    $programFilesX86=[Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
    $localAppData=[Environment]::GetEnvironmentVariable('LOCALAPPDATA')
    $candidates=New-Object 'System.Collections.Generic.List[string]'
    switch($Name){
        'git' {
            foreach($base in @($programFiles,$programFilesX86)){
                if(-not [string]::IsNullOrWhiteSpace([string]$base)){
                    [void]$candidates.Add((Join-Path $base 'Git\cmd\git.exe'))
                    [void]$candidates.Add((Join-Path $base 'Git\bin\git.exe'))
                }
            }
            if(-not [string]::IsNullOrWhiteSpace([string]$localAppData)){[void]$candidates.Add((Join-Path $localAppData 'Programs\Git\cmd\git.exe'))}
        }
        'gh' {
            foreach($base in @($programFiles,$localAppData)){
                if(-not [string]::IsNullOrWhiteSpace([string]$base)){
                    $suffix=if($base -eq $programFiles){'GitHub CLI\gh.exe'}else{'Programs\GitHub CLI\gh.exe'}
                    [void]$candidates.Add((Join-Path $base $suffix))
                }
            }
        }
        'node' {
            foreach($base in @($programFiles,$localAppData)){
                if(-not [string]::IsNullOrWhiteSpace([string]$base)){
                    $suffix=if($base -eq $programFiles){'nodejs\node.exe'}else{'Programs\nodejs\node.exe'}
                    [void]$candidates.Add((Join-Path $base $suffix))
                }
            }
        }
        'npm' {
            foreach($base in @($programFiles,$localAppData)){
                if(-not [string]::IsNullOrWhiteSpace([string]$base)){
                    $suffix=if($base -eq $programFiles){'nodejs\npm.cmd'}else{'Programs\nodejs\npm.cmd'}
                    [void]$candidates.Add((Join-Path $base $suffix))
                }
            }
        }
        'python' {
            if(-not [string]::IsNullOrWhiteSpace([string]$localAppData)){
                foreach($version in @('Python311','Python312','Python313')){
                    [void]$candidates.Add((Join-Path $localAppData ('Programs\Python\'+$version+'\python.exe')))
                }
            }
            if(-not [string]::IsNullOrWhiteSpace([string]$programFiles)){
                foreach($version in @('Python311','Python312','Python313')){
                    [void]$candidates.Add((Join-Path $programFiles ($version+'\python.exe')))
                }
            }
        }
    }
    foreach($candidate in $candidates){
        if(-not [string]::IsNullOrWhiteSpace([string]$candidate) -and (Test-Path -LiteralPath $candidate -PathType Leaf)){
            return [IO.Path]::GetFullPath($candidate)
        }
    }
    $commandNames=if($Name -eq 'npm'){@('npm.cmd')}else{@($Name)}
    foreach($commandName in $commandNames){
        $cmd=Get-Command $commandName -ErrorAction SilentlyContinue | Select-Object -First 1
        if(-not $cmd){continue}
        if($cmd.CommandType -notin @('Application','ExternalScript')){continue}
        $path=[string]$cmd.Source
        if([string]::IsNullOrWhiteSpace($path)){continue}
        if($Name -eq 'python' -and $path -match '(?i)\\WindowsApps\\'){continue}
        if($Name -eq 'npm' -and $path -match '(?i)\\npm\.ps1$'){continue}
        if(Test-Path -LiteralPath $path -PathType Leaf){return [IO.Path]::GetFullPath($path)}
    }
    return $null
}

function Invoke-KhoraNativeProbe {
    param([Parameter(Mandatory=$true)][string]$Path,[string[]]$Arguments=@())
    if(-not (Test-Path -LiteralPath $Path -PathType Leaf)){throw ('Ejecutable ausente: '+$Path)}
    $previousPreference=$ErrorActionPreference
    $output=@()
    $exitCode=1
    try{
        $ErrorActionPreference='Continue'
        $output=@(& $Path @Arguments 2>&1)
        $exitCode=$LASTEXITCODE
    } catch {
        $output+= $_.Exception.Message
        $exitCode=1
    } finally {
        $ErrorActionPreference=$previousPreference
    }
    return [pscustomobject]@{Path=$Path;Code=[int]$exitCode;Output=@($output|ForEach-Object{[string]$_})}
}

function Get-KhoraToolchainInventory {
    $specs=@(
        [pscustomobject]@{Name='git';Arguments=@('--version');Minimum='2.30';Pattern='git version\s+([0-9]+(?:\.[0-9]+){1,3})'},
        [pscustomobject]@{Name='gh';Arguments=@('--version');Minimum='2.0';Pattern='gh version\s+([0-9]+(?:\.[0-9]+){1,3})'},
        [pscustomobject]@{Name='node';Arguments=@('--version');Minimum='20.0';Pattern='v?([0-9]+(?:\.[0-9]+){1,3})'},
        [pscustomobject]@{Name='npm';Arguments=@('--version');Minimum='9.0';Pattern='([0-9]+(?:\.[0-9]+){1,3})'},
        [pscustomobject]@{Name='python';Arguments=@('--version');Minimum='3.11';Pattern='Python\s+([0-9]+(?:\.[0-9]+){1,3})'}
    )
    $inventory=New-Object 'System.Collections.Generic.List[object]'
    foreach($spec in $specs){
        $path=Find-KhoraHostExecutable -Name $spec.Name
        if(-not $path){
            $inventory.Add([pscustomobject]@{name=$spec.Name;status='MISSING';path=$null;version=$null;exitCode=$null;source='unavailable'})
            continue
        }
        $probe=Invoke-KhoraNativeProbe -Path $path -Arguments $spec.Arguments
        $text=($probe.Output -join ' ')
        $match=[regex]::Match($text,$spec.Pattern,[Text.RegularExpressions.RegexOptions]::IgnoreCase)
        $version=if($match.Success){$match.Groups[1].Value}else{$null}
        $compatible=($probe.Code -eq 0 -and $match.Success)
        if($compatible -and $spec.Name -eq 'node'){$compatible=([version]$version -ge [version]'20.0')}
        if($compatible -and $spec.Name -eq 'npm'){$compatible=([version]$version -ge [version]'9.0')}
        if($compatible -and $spec.Name -eq 'python'){$compatible=([version]$version -ge [version]'3.11')}
        if($compatible -and $spec.Name -eq 'git'){$compatible=([version]$version -ge [version]'2.30')}
        if($compatible -and $spec.Name -eq 'gh'){$compatible=([version]$version -ge [version]'2.0')}
        $parent=Split-Path -Parent $path
        $inventory.Add([pscustomobject]@{name=$spec.Name;status=$(if($compatible){'AVAILABLE_COMPATIBLE'}else{'INCOMPATIBLE'});path=$path;version=$version;exitCode=$probe.Code;source=$parent})
    }
    return @($inventory)
}

﻿# Toolchain efímero y precarga paralela.
$script:PrefetchJobs = @{}
$script:PrefetchPlan = @{}
$script:DependencyJobs = @{}

function Add-KhoraPath {
    param([string]$Path)
    if ($Path -and (Test-Path $Path) -and (($env:Path -split ';') -notcontains $Path)) { $env:Path = $Path + ';' + $env:Path }
}

function Start-KhoraDownloadJob {
    param([string]$Name,[string]$Uri,[string]$Path)
    if(Test-Path -LiteralPath $Path -PathType Leaf){
        $existing=Get-Item -LiteralPath $Path -ErrorAction Stop
        if($existing.Length -gt 0){return}
        Remove-Item -LiteralPath $Path -Force -ErrorAction Stop
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
    $script:PrefetchPlan[$Name]=@{Uri=$Uri;Path=$Path}
    $script:PrefetchJobs[$Name]=Start-Job -ArgumentList @($Uri,$Path) -ScriptBlock {
        param($source,$destination)
        $ProgressPreference='SilentlyContinue'
        $ErrorActionPreference='Stop'
        [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
        $partial=$destination+'.part'
        $lastError=$null
        foreach($attempt in 1..3){
            try{
                Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue
                Invoke-WebRequest -Uri $source -OutFile $partial -UseBasicParsing -TimeoutSec 1200 -ErrorAction Stop
                if(-not(Test-Path -LiteralPath $partial -PathType Leaf) -or (Get-Item -LiteralPath $partial).Length -le 0){throw 'La descarga terminó sin un archivo válido.'}
                Move-Item -LiteralPath $partial -Destination $destination -Force -ErrorAction Stop
                return $destination
            }catch{
                $lastError=$_.Exception.Message
                Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue
                if($attempt -lt 3){Start-Sleep -Seconds (2*$attempt)}
            }
        }
        throw ('Descarga agotó los reintentos: '+$lastError)
    }
}

function Start-KhoraPrefetch {
    $directory = Join-Path $WORK_DIR 'prefetch'
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    if (-not (Find-KhoraHostExecutable -Name 'git')) {
        $release=Invoke-RestMethod -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers @{'User-Agent'='khora-ep'}
        $asset=$release.assets|Where-Object{$_.name -match '^PortableGit-.*-64-bit\.7z\.exe$'}|Select-Object -First 1
        if(-not$asset){throw 'No se encontró PortableGit.'}
        Start-KhoraDownloadJob -Name git -Uri $asset.browser_download_url -Path (Join-Path $directory $asset.name)
    }
    if (-not (Find-KhoraHostExecutable -Name 'gh')) {
        $release=Invoke-RestMethod -Uri 'https://api.github.com/repos/cli/cli/releases/latest' -Headers @{'User-Agent'='khora-ep'}
        $asset=$release.assets|Where-Object{$_.name -match '^gh_.*_windows_amd64\.zip$'}|Select-Object -First 1
        $sums=$release.assets|Where-Object{$_.name -match 'checksums\.txt$'}|Select-Object -First 1
        if(-not$asset-or-not$sums){throw 'No se encontró GitHub CLI.'}
        Start-KhoraDownloadJob -Name gh -Uri $asset.browser_download_url -Path (Join-Path $directory $asset.name)
        Start-KhoraDownloadJob -Name ghSums -Uri $sums.browser_download_url -Path (Join-Path $directory $sums.name)
    }
    if (-not (Find-KhoraHostExecutable -Name 'node')) {
        $index=Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
        $release=$index|Where-Object{$_.lts -and ($_.files -contains 'win-x64-zip')}|Select-Object -First 1
        if(-not$release){throw 'No se encontró Node.js LTS.'}
        $name='node-'+$release.version+'-win-x64.zip';$base='https://nodejs.org/dist/'+$release.version
        Start-KhoraDownloadJob -Name node -Uri ($base+'/'+$name) -Path (Join-Path $directory $name)
        Start-KhoraDownloadJob -Name nodeSums -Uri ($base+'/SHASUMS256.txt') -Path (Join-Path $directory 'node-SHASUMS256.txt')
    }
    if (-not (Find-KhoraHostExecutable -Name 'python')) {
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
    $existing=Find-KhoraHostExecutable -Name 'git'
    if($existing){
        $probe=Invoke-KhoraNativeProbe -Path $existing -Arguments @('--version')
        if($probe.Code -ne 0 -or ($probe.Output -join ' ') -notmatch '(?i)git version'){throw 'Git del host no pasó la validación de versión.'}
        Add-KhoraPath -Path (Split-Path -Parent $existing)
        return $existing
    }
    $installer=Wait-KhoraPrefetch -Name git
    if(-not$installer){throw 'PortableGit ausente.'}
    if((Get-AuthenticodeSignature $installer).Status -ne 'Valid'){throw 'Firma PortableGit inválida.'}
    $target=Join-Path $WORK_DIR 'tools\git'
    New-Item -ItemType Directory -Path $target -Force|Out-Null
    $process=Start-Process $installer -ArgumentList @('-o"'+$target+'"','-y') -Wait -PassThru
    if($process.ExitCode -ne 0){throw ('Extracción Git falló: exit='+$process.ExitCode)}
    $git=Get-ChildItem -LiteralPath $target -Filter git.exe -File -Recurse -ErrorAction Stop | Where-Object{$_.FullName -match '\\cmd\\git\.exe$'} | Select-Object -First 1
    if(-not$git){throw 'PortableGit se extrajo pero no contiene cmd\git.exe.'}
    Add-KhoraPath -Path $git.DirectoryName
    $probe=Invoke-KhoraNativeProbe -Path $git.FullName -Arguments @('--version')
    if($probe.Code -ne 0 -or ($probe.Output -join ' ') -notmatch '(?i)git version'){throw 'PortableGit no pasó la validación posterior a extracción.'}
    return $git.FullName
}

function Ensure-GhCli {
    $existing=Find-KhoraHostExecutable -Name 'gh'
    if($existing){Add-KhoraPath -Path (Split-Path -Parent $existing);$script:GH_CLI_PATH=$existing;return $existing}
    $zip=Wait-KhoraPrefetch -Name gh;$sumFile=Wait-KhoraPrefetch -Name ghSums
    if(-not$zip-or-not$sumFile){throw 'GitHub CLI ausente.'}
    $line=Get-Content $sumFile|Where-Object{$_ -match [regex]::Escape((Split-Path $zip -Leaf))}|Select-Object -First 1
    if(-not$line){throw 'Checksum GitHub CLI ausente.'}
    if((Get-FileHash $zip -Algorithm SHA256).Hash -ine (($line -split '\s+')[0])){throw 'Checksum GitHub CLI inválido.'}
    $target=Join-Path $WORK_DIR 'tools\gh';Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
    $gh=Get-ChildItem $target -Filter gh.exe -Recurse|Select-Object -First 1;if(-not$gh){throw 'gh.exe ausente.'}
    Add-KhoraPath -Path $gh.DirectoryName;$script:GH_CLI_PATH=$gh.FullName;return $gh.FullName
}

function Confirm-GhCliAuth {
 $gh=Ensure-GhCli;if(-not$gh-or-not(Test-Path -LiteralPath $gh)){throw 'GitHub CLI no disponible.'};$ok=Invoke-WithToken -Action {param($token)$previous=$env:GH_TOKEN;try{$env:GH_TOKEN=$token;$identity=(& $gh api user --jq .login 2>&1|Out-String).Trim();return ($LASTEXITCODE-eq0-and$identity)}finally{if($null-ne$previous){$env:GH_TOKEN=$previous}else{Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue}}};return [bool]$ok
}
function Ensure-Node {
    $existing=Find-KhoraHostExecutable -Name 'node'
    if($existing){
        $node=$existing
        $npm=Find-KhoraHostExecutable -Name 'npm'
        if(-not$npm){$candidate=Join-Path (Split-Path -Parent $node) 'npm.cmd';if(Test-Path -LiteralPath $candidate -PathType Leaf){$npm=$candidate}}
        if(-not$npm){throw 'Node.js existe pero npm.cmd no está disponible; no se utilizará npm.ps1.'}
        $nodeProbe=Invoke-KhoraNativeProbe -Path $node -Arguments @('--version')
        $npmProbe=Invoke-KhoraNativeProbe -Path $npm -Arguments @('--version')
        if($nodeProbe.Code -ne 0 -or $npmProbe.Code -ne 0){throw 'Node.js/npm.cmd del host no superó la validación de ejecución.'}
        $nodeVersion=[regex]::Match(($nodeProbe.Output -join ' '),'v?([0-9]+(?:\.[0-9]+){1,2})')
        $npmVersion=[regex]::Match(($npmProbe.Output -join ' '),'([0-9]+(?:\.[0-9]+){1,2})')
        if(-not$nodeVersion.Success -or [version]$nodeVersion.Groups[1].Value -lt [version]'20.0'){throw 'Node.js del host requiere versión 20 o superior.'}
        if(-not$npmVersion.Success -or [version]$npmVersion.Groups[1].Value -lt [version]'9.0'){throw 'npm.cmd del host requiere versión 9 o superior.'}
        Add-KhoraPath -Path (Split-Path -Parent $node)
        if((Split-Path -Parent $npm) -ne (Split-Path -Parent $node)){Add-KhoraPath -Path (Split-Path -Parent $npm)}
        $script:NODE_PATH=$node
        $script:NPM_PATH=$npm
        return $node
    }
    $zip=Wait-KhoraPrefetch -Name node
    $sumFile=Wait-KhoraPrefetch -Name nodeSums
    if(-not$zip-or-not$sumFile){throw 'Node.js ausente.'}
    $line=Get-Content -LiteralPath $sumFile | Where-Object{$_ -match [regex]::Escape((Split-Path $zip -Leaf))} | Select-Object -First 1
    if(-not$line-or(Get-FileHash $zip -Algorithm SHA256).Hash -ine (($line.Trim() -split '\s+')[0])){throw 'Checksum Node.js inválido.'}
    $target=Join-Path $WORK_DIR 'tools\node'
    if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop}
    Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
    $node=Get-ChildItem -LiteralPath $target -Filter node.exe -File -Recurse -ErrorAction Stop | Select-Object -First 1
    if(-not$node){throw 'node.exe ausente después de extraer Node.js.'}
    $npm=Join-Path $node.DirectoryName 'npm.cmd'
    if(-not(Test-Path -LiteralPath $npm -PathType Leaf)){throw 'npm.cmd ausente en el paquete Node.js descargado.'}
    $nodeProbe=Invoke-KhoraNativeProbe -Path $node.FullName -Arguments @('--version')
    $npmProbe=Invoke-KhoraNativeProbe -Path $npm -Arguments @('--version')
    if($nodeProbe.Code -ne 0 -or $npmProbe.Code -ne 0){throw 'Node.js descargado no superó la validación post-instalación.'}
    Add-KhoraPath -Path $node.DirectoryName
    $script:NODE_PATH=$node.FullName
    $script:NPM_PATH=$npm
    return $node.FullName
}

function Ensure-Python311 {
    $existing=Find-KhoraHostExecutable -Name 'python'
    if($existing){
        $probe=Invoke-KhoraNativeProbe -Path $existing -Arguments @('--version')
        $match=[regex]::Match(($probe.Output -join ' '),'Python\s+([0-9]+(?:\.[0-9]+){1,2})')
        if($probe.Code -eq 0 -and $match.Success -and [version]$match.Groups[1].Value -ge [version]'3.11'){
            Add-KhoraPath -Path (Split-Path -Parent $existing)
            $script:PYTHON_PATH=$existing
            return $existing
        }
        Info 'Python del host existe pero no cumple el mínimo 3.11; se preparará una copia portátil.'
    }
    $installer=Wait-KhoraPrefetch -Name python
    if(-not$installer){throw 'Python ausente.'}
    if((Get-AuthenticodeSignature $installer).Status -ne 'Valid'){throw 'Firma Python inválida.'}
    $target=Join-Path $WORK_DIR 'tools\python311'
    New-Item -ItemType Directory -Path $target -Force|Out-Null
    $arguments='/quiet InstallAllUsers=0 PrependPath=0 Include_pip=1 Include_test=0 TargetDir="'+$target+'"'
    $process=Start-Process $installer -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
    $python=Join-Path $target 'python.exe'
    if($process.ExitCode -ne 0 -or -not(Test-Path -LiteralPath $python -PathType Leaf)){throw 'Instalación Python falló.'}
    $probe=Invoke-KhoraNativeProbe -Path $python -Arguments @('--version')
    if($probe.Code -ne 0 -or ($probe.Output -join ' ') -notmatch 'Python\s+3\.11'){throw 'Python portátil instalado no pasó la validación.'}
    Add-KhoraPath -Path $target
    $script:PYTHON_PATH=$python
    return $python
}

function Ensure-VSCode {
    $target=Join-Path $WORK_DIR 'tools\vscode';$code=Join-Path $target 'Code.exe'
    if(-not(Test-Path $code)){
        $zip=Wait-KhoraPrefetch -Name vscode;if(-not$zip){throw 'Visual Studio Code ausente.'}
        $expected=[string]$script:PrefetchPlan['vscodeHash'];if($expected -and (Get-FileHash $zip -Algorithm SHA256).Hash -ine $expected){throw 'Checksum Visual Studio Code inválido.'}
        Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
        if(-not(Test-Path $code)-or(Get-AuthenticodeSignature $code).Status -ne 'Valid'){throw 'Firma Visual Studio Code inválida.'}
    }
    foreach($path in @((Join-Path $target 'data\user-data'),(Join-Path $target 'data\extensions'),(Join-Path $target 'data\tmp'))){New-Item -ItemType Directory -Path $path -Force|Out-Null}
    return $code
}

function Get-CodeCli {$code=Ensure-VSCode;return (Join-Path (Split-Path -Parent $code) 'bin\code.cmd')}
function Ensure-VercelCLI {
    $node=Ensure-Node
    $npm=if($script:NPM_PATH){[string]$script:NPM_PATH}else{Find-KhoraHostExecutable -Name 'npm'}
    if(-not$npm){$npm=Join-Path (Split-Path -Parent $node) 'npm.cmd'}
    if(-not(Test-Path -LiteralPath $npm -PathType Leaf) -or $npm -match '(?i)\\npm\.ps1$'){throw 'Vercel requiere npm.cmd; npm.ps1 no se ejecutará.'}
    $target=Join-Path $WORK_DIR 'tools\vercel'
    $vercel=Join-Path $target 'node_modules\.bin\vercel.cmd'
    if(-not(Test-Path -LiteralPath $vercel)){
        New-Item -ItemType Directory -Path $target -Force|Out-Null
        $previousPreference=$ErrorActionPreference
        try{
            $ErrorActionPreference='Continue'
            $output=@(& $npm install --prefix $target --no-save --no-audit --no-fund vercel@59.3.0 2>&1)
            $exit=$LASTEXITCODE
        }finally{$ErrorActionPreference=$previousPreference}
        $output|ForEach-Object{Info ('npm vercel: '+(Mask-Token ([string]$_)))}
        if($exit -ne 0 -or -not(Test-Path -LiteralPath $vercel -PathType Leaf)){throw ('Instalación Vercel CLI falló; exit='+$exit)}
    }
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
    $python=Ensure-Python311
    $node=Ensure-Node
    $venv=Join-Path $WORK_DIR 'venv'
    $web=Join-Path $REPO_DIR 'khora-web'
    $npm=if($script:NPM_PATH){[string]$script:NPM_PATH}else{Find-KhoraHostExecutable -Name 'npm'}
    if(-not$npm){$npm=Join-Path (Split-Path -Parent $node) 'npm.cmd'}
    if(-not(Test-Path -LiteralPath $npm -PathType Leaf) -or $npm -match '(?i)\\npm\.ps1$'){throw 'La hidratación requiere npm.cmd verificado.'}
    if(Test-Path -LiteralPath (Join-Path $REPO_DIR 'pyproject.toml') -PathType Leaf){
        $script:DependencyJobs['python']=Start-Job -ArgumentList @($python,$venv,$REPO_DIR) -ScriptBlock {
            param($py,$ve,$repo)
            & $py -m venv $ve
            if($LASTEXITCODE -ne 0){throw 'venv falló'}
            $venvPython=Join-Path $ve 'Scripts\python.exe'
            & $venvPython -m pip install -e $repo --disable-pip-version-check
            if($LASTEXITCODE -ne 0){throw 'pip falló'}
        }
    }
    if(Test-Path -LiteralPath (Join-Path $web 'package-lock.json') -PathType Leaf){
        $script:DependencyJobs['node']=Start-Job -ArgumentList @($npm,$web) -ScriptBlock {
            param($npmPath,$directory)
            & $npmPath --prefix $directory ci --no-audit --no-fund
            if($LASTEXITCODE -ne 0){throw 'npm ci falló'}
        }
    }
}
function Wait-KhoraDependencyHydration {
    foreach($name in @($script:DependencyJobs.Keys)){
        $job=$script:DependencyJobs[$name]
        $completed=Wait-Job -Job $job -Timeout 2700
        if(-not $completed){Stop-Job -Job $job -ErrorAction SilentlyContinue;Remove-Job -Job $job -Force -ErrorAction SilentlyContinue;throw "Timeout de 45 minutos en dependencias $name; se detuvo el job."}
        $output=@(Receive-Job $job -ErrorAction SilentlyContinue)
        $output|ForEach-Object{Info ("dependency ${name}: "+(Mask-Token ([string]$_)))}
        if($job.State-ne'Completed'){Remove-Job $job -Force -ErrorAction SilentlyContinue;throw "Dependencias $name fallaron."}
        Remove-Job $job -Force
    }
    $script:DependencyJobs=@{}
    return $true
}
function Start-DepsPreload {
    Start-KhoraPrefetch
    return @($script:PrefetchJobs.Keys)
}
function Wait-DepsPreload {
    foreach($name in @($script:PrefetchJobs.Keys)){[void](Wait-KhoraPrefetch -Name $name)}
    return $true
}
function Setup-Venv {
    $python=Ensure-Python311
    $venv=Join-Path $WORK_DIR 'venv'
    if(-not(Test-Path -LiteralPath (Join-Path $venv 'Scripts\python.exe') -PathType Leaf)){
        $previousPreference=$ErrorActionPreference
        try{$ErrorActionPreference='Continue';$output=@(& $python -m venv $venv 2>&1);$exit=$LASTEXITCODE}
        finally{$ErrorActionPreference=$previousPreference}
        if($exit -ne 0){throw ('No se pudo crear venv: '+(($output|ForEach-Object{[string]$_}) -join ' '))}
    }
    $venvPython=Join-Path $venv 'Scripts\python.exe'
    if(Test-Path -LiteralPath (Join-Path $REPO_DIR 'pyproject.toml') -PathType Leaf){
        $previousPreference=$ErrorActionPreference
        try{$ErrorActionPreference='Continue';$output=@(& $venvPython -m pip install -e $REPO_DIR --disable-pip-version-check 2>&1);$exit=$LASTEXITCODE}
        finally{$ErrorActionPreference=$previousPreference}
        if($exit -ne 0){throw ('No se pudo hidratar Python: '+(($output|ForEach-Object{[string]$_}) -join ' '))}
    }
    return $venvPython
}
function Setup-KhoraWeb {
    $web=Join-Path $REPO_DIR 'khora-web'
    $lock=Join-Path $web 'package-lock.json'
    if(-not(Test-Path -LiteralPath $lock -PathType Leaf)){return $false}
    $node=Ensure-Node
    $npm=if($script:NPM_PATH){$script:NPM_PATH}else{Find-KhoraHostExecutable -Name 'npm'}
    if(-not$npm){$npm=Join-Path (Split-Path -Parent $node) 'npm.cmd'}
    if(-not(Test-Path -LiteralPath $npm -PathType Leaf) -or $npm -match '(?i)\\npm\.ps1$'){throw 'Setup-KhoraWeb requiere npm.cmd válido.'}
    $previousPreference=$ErrorActionPreference
    try{
        $ErrorActionPreference='Continue'
        $output=@(& $npm --prefix $web ci --no-audit --no-fund 2>&1)
        $exit=$LASTEXITCODE
    }finally{$ErrorActionPreference=$previousPreference}
    $output|ForEach-Object{Info ('npm ci: '+(Mask-Token ([string]$_)))}
    if($exit -ne 0){throw ('npm ci falló; exit='+$exit)}
    return $true
}
function Start-ProactiveDepPrep {
    Start-KhoraPrefetch
    return @($script:PrefetchJobs.Keys)
}
function Wait-ProactiveDepPrep {
    return (Wait-DepsPreload)
}
function Ensure-Docker{Info 'Docker bajo demanda.';return $null}
function Ensure-RenderCLI{Info 'Render bajo demanda.';return $null}
