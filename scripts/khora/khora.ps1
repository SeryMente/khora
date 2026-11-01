#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Bootstrap,
    [switch]$BootstrapStage2,
    [switch]$CleanupOnly,
    [switch]$GuardianOnly,
    [switch]$SelfTest,
    [string]$Reason='manual',
    [string]$SessionManifest,
    [int]$WatchPid=0,
    [string]$KhoraToken,
    [string]$KhoraTokenFile,
    [string]$KhoraApiBase
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$script:EP_VERSION = '1.0.3'
$script:SCRIPT_VERSION = '7.5.5'
$script:GATE_PATH=$PSCommandPath
$script:GATE_DIR=if($PSCommandPath){Split-Path -Parent $PSCommandPath}else{$null}
$script:SESSION_MANIFEST_ARG=$SessionManifest
$script:WATCH_PID_ARG=$WatchPid
$script:SELF_SOURCE=if($PSCommandPath){Get-Content -LiteralPath $PSCommandPath -Raw}else{$MyInvocation.MyCommand.Definition}

function ConvertFrom-KhoraSecureString {
    param([Security.SecureString]$Value)
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
}
function Protect-KhoraSecureStringBlob {
    param([Security.SecureString]$Secure,[string]$Path)
    $Secure|ConvertFrom-SecureString|Set-Content -LiteralPath $Path -Encoding ASCII
}
function Get-KhoraBootstrapHeaders {
    param([string]$Token)
    return @{Authorization=('Bearer '+$Token);'Content-Type'='application/json';'User-Agent'='khora-ep-medio-v1'}
}
function Send-KhoraBootstrapEvent {
    param([string]$Id,[string]$State,[string]$Message,[Nullable[long]]$DurationMs=$null)
    if([string]::IsNullOrWhiteSpace($KhoraToken)-or[string]::IsNullOrWhiteSpace($KhoraApiBase)){throw 'Token o API Khora ausente; la bitácora persistente es obligatoria.'}
    $event=[ordered]@{id=$Id;state=$State;message=$Message;timestamp=[DateTime]::UtcNow.ToString('o')}
    if($null-ne$DurationMs){$event.durationMs=[long]$DurationMs}
    $body=@{events=@($event)}|ConvertTo-Json -Depth 6 -Compress
    $lastError=$null
    foreach($attempt in 1..3){
        try{Invoke-RestMethod -Method Post -Uri ($KhoraApiBase.TrimEnd('/')+'/events') -Headers (Get-KhoraBootstrapHeaders $KhoraToken) -Body $body -TimeoutSec 20|Out-Null;return }
        catch{$lastError=$_;Start-Sleep -Milliseconds (250*$attempt)}
    }
    throw('No se pudo persistir '+$Id+': '+$lastError.Exception.Message)
}
function Write-KhoraBootstrapUi {
    param([string]$Id,[string]$State,[string]$Label,[Nullable[long]]$DurationMs=$null)
    $symbol=if($State-eq'OK'){'✓'}elseif($State-eq'FAIL'){'!'}else{'›'}
    $color=if($State-eq'OK'){'Green'}elseif($State-eq'FAIL'){'Red'}else{'Cyan'}
    $suffix=if($null-ne$DurationMs){' · {0:N1}s'-f($DurationMs/1000.0)}else{''}
    Write-Host ('  {0} [{1}] {2}{3}'-f$symbol,$Id,$Label,$suffix) -ForegroundColor $color
}
function Invoke-KhoraBootstrapStage {
    param([string]$Id,[string]$Label,[ScriptBlock]$Action)
    Send-KhoraBootstrapEvent -Id $Id -State START -Message $Label
    Write-KhoraBootstrapUi -Id $Id -State START -Label $Label
    $watch=[Diagnostics.Stopwatch]::StartNew()
    try{$result=&$Action;$watch.Stop();Send-KhoraBootstrapEvent -Id $Id -State OK -Message $Label -DurationMs $watch.ElapsedMilliseconds;Write-KhoraBootstrapUi -Id $Id -State OK -Label $Label -DurationMs $watch.ElapsedMilliseconds;return $result}
    catch{$watch.Stop();try{Send-KhoraBootstrapEvent -Id $Id -State FAIL -Message ($Label+': '+$_.Exception.Message) -DurationMs $watch.ElapsedMilliseconds}catch{};Write-KhoraBootstrapUi -Id $Id -State FAIL -Label $Label -DurationMs $watch.ElapsedMilliseconds;throw}
}
function Test-KhoraAdministrator {
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent();$principal=New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Assert-KhoraBootstrapInputs {
 param([string]$Token,[string]$ApiBase)
 if([string]::IsNullOrWhiteSpace($Token)-or$Token.Length-gt16384-or$Token-notmatch'^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'){throw 'Token Khora ausente o con formato JWT inválido.'}
 try{$uri=[uri]$ApiBase}catch{throw 'URL canónica Khora inválida.'}
 if(-not$uri.IsAbsoluteUri-or$uri.Scheme-ne'https'-or$uri.UserInfo-or$uri.Query-or$uri.Fragment-or$uri.AbsolutePath.TrimEnd('/')-ne'/api/ep'){throw 'La API Khora debe ser HTTPS y terminar exactamente en /api/ep.'}
}
function Initialize-KhoraDataProfileContext {
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
    $script:KHORA_EXECUTION_IDENTITY=[string]$identity.Name
    $script:KHORA_DATA_PROFILE_MODE='execution-profile'
    $script:KHORA_DATA_PROFILE_NAME=[Environment]::UserName
    $script:KHORA_DATA_PROFILE_ROOT=[IO.Path]::GetFullPath([string]$env:USERPROFILE).TrimEnd('\')
    $script:KHORA_TARGET_DESKTOP=$null
    $script:KHORA_TARGET_TEMP=[IO.Path]::GetTempPath()
    if($identity.Name -notmatch '(?i)(^|\\)mantenimientorci$'){return}
    $allProfiles=@(Get-CimInstance Win32_UserProfile -ErrorAction Stop | Where-Object {
        -not $_.Special -and -not [string]::IsNullOrWhiteSpace([string]$_.LocalPath) -and -not [string]::IsNullOrWhiteSpace([string]$_.SID)
    })
    $profiles=@($allProfiles | Where-Object {
        $profile=$_;$account=''
        try{$account=([Security.Principal.SecurityIdentifier]::new([string]$profile.SID)).Translate([Security.Principal.NTAccount]).Value}catch{}
        if($account -match '(?i)(^|\\)fila4$'){return $true}
        return ((Split-Path -Leaf ([string]$profile.LocalPath)) -match '(?i)^fila4$')
    })
    if($profiles.Count -ne 1){throw "KHORA_FILA4_PROFILE_NOT_UNIQUE: matches=$($profiles.Count); no MantenimientoRCI destination fallback is permitted."}
    if([string]$profiles[0].SID -eq [string]$identity.User.Value){throw 'KHORA_FILA4_PROFILE_IS_EXECUTION_IDENTITY'}
    $root=[IO.Path]::GetFullPath([string]$profiles[0].LocalPath).TrimEnd('\')
    if(-not(Test-Path -LiteralPath $root -PathType Container)){throw 'KHORA_FILA4_PROFILE_DIRECTORY_MISSING'}
    $desktop=Join-Path $root 'Desktop';$appData=Join-Path $root 'AppData\Roaming';$localAppData=Join-Path $root 'AppData\Local';$tempRoot=Join-Path $localAppData 'Temp'
    $guardPaths=@($root,$desktop,(Join-Path $root 'AppData'),$appData,$localAppData,$tempRoot);$rootPrefix=$root.TrimEnd('\')+'\'
    foreach($targetPath in $guardPaths){
        $full=[IO.Path]::GetFullPath($targetPath)
        if(($full -ne $root) -and -not $full.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase)){throw "KHORA_FILA4_PATH_OUTSIDE_PROFILE: $full"}
        if(Test-Path -LiteralPath $full){$item=Get-Item -LiteralPath $full -Force -ErrorAction Stop;if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint)-ne 0){throw "KHORA_FILA4_REPARSE_POINT_REFUSED: $full"}}
    }
    foreach($directory in @($desktop,$appData,$localAppData,$tempRoot)){
        if(-not(Test-Path -LiteralPath $directory -PathType Container)){New-Item -ItemType Directory -Path $directory -Force -ErrorAction Stop|Out-Null}
        $item=Get-Item -LiteralPath $directory -Force -ErrorAction Stop
        if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint)-ne 0){throw "KHORA_FILA4_REPARSE_POINT_REFUSED: $directory"}
    }
    $script:KHORA_DATA_PROFILE_MODE='fila4-profile-tree';$script:KHORA_DATA_PROFILE_NAME='fila4';$script:KHORA_DATA_PROFILE_ROOT=$root;$script:KHORA_TARGET_DESKTOP=$desktop;$script:KHORA_TARGET_TEMP=$tempRoot
    $driveRoot=[IO.Path]::GetPathRoot($root);$env:USERPROFILE=$root;$env:HOME=$root;$env:HOMEDRIVE=$driveRoot.TrimEnd('\');$env:HOMEPATH='\' + $root.Substring($driveRoot.Length).TrimStart('\')
    $env:APPDATA=$appData;$env:LOCALAPPDATA=$localAppData;$env:TEMP=$tempRoot;$env:TMP=$tempRoot
    $env:GH_CONFIG_DIR=Join-Path $appData 'GitHub CLI';$env:GIT_CONFIG_GLOBAL=Join-Path $appData 'gitconfig';$env:NPM_CONFIG_CACHE=Join-Path $localAppData 'npm-cache';$env:XDG_CONFIG_HOME=Join-Path $localAppData 'xdg-config';$env:XDG_DATA_HOME=Join-Path $localAppData 'xdg-data'
    $machinePath=[Environment]::GetEnvironmentVariable('Path','Machine')
    $env:Path=(@($machinePath,(Join-Path $env:ProgramFiles 'Git\cmd'),(Join-Path $env:ProgramFiles 'GitHub CLI'),(Join-Path $env:ProgramFiles 'nodejs'),(Join-Path $localAppData 'Programs\Git\cmd'),(Join-Path $localAppData 'Programs\GitHub CLI'),(Join-Path $localAppData 'Programs\nodejs'),(Join-Path $localAppData 'Microsoft\WinGet\Links'),(Join-Path $appData 'npm')) | Where-Object{-not [string]::IsNullOrWhiteSpace([string]$_)} | Select-Object -Unique) -join ';'
    $machineModules=[Environment]::GetEnvironmentVariable('PSModulePath','Machine')
    $env:PSModulePath=(@($machineModules,(Join-Path $root 'Documents\WindowsPowerShell\Modules')) | Where-Object{-not [string]::IsNullOrWhiteSpace([string]$_)} | Select-Object -Unique) -join ';'
}
function Remove-KhoraTemporaryGate {
 try{$full=[IO.Path]::GetFullPath($script:GATE_PATH);$temp=[IO.Path]::GetFullPath([string]$script:KHORA_TARGET_TEMP).TrimEnd('\')+'\';if($full.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase)-and[IO.Path]::GetFileName($full)-like'khora-bootstrap-*.ps1'){Remove-Item -LiteralPath $full -Force -ErrorAction Stop;return $true}}catch{};return $false
}
function Set-KhoraBootstrapConsoleVisible {
 param([bool]$Visible)
 try{if(-not('KhoraBootstrapConsole.Native'-as[type])){Add-Type 'using System;using System.Runtime.InteropServices;namespace KhoraBootstrapConsole{public static class Native{[DllImport("kernel32.dll")]public static extern IntPtr GetConsoleWindow();[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);}}'};$h=[KhoraBootstrapConsole.Native]::GetConsoleWindow();if($h-eq[IntPtr]::Zero){return $false};[KhoraBootstrapConsole.Native]::ShowWindow($h,$(if($Visible){5}else{0}))|Out-Null;return $true}catch{return $false}
}
function Resolve-KhoraHostToolPath {
    param([Parameter(Mandatory=$true)][string]$Name)
    $programFiles=[Environment]::GetEnvironmentVariable('ProgramFiles')
    $programFilesX86=[Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
    $localAppData=[Environment]::GetEnvironmentVariable('LOCALAPPDATA')
    $candidates=@()
    switch($Name){
        'git' {$candidates=@((Join-Path $programFiles 'Git\cmd\git.exe'),(Join-Path $programFiles 'Git\bin\git.exe'),(Join-Path $localAppData 'Programs\Git\cmd\git.exe'))}
        'gh' {$candidates=@((Join-Path $programFiles 'GitHub CLI\gh.exe'),(Join-Path $localAppData 'Programs\GitHub CLI\gh.exe'))}
        'node' {$candidates=@((Join-Path $programFiles 'nodejs\node.exe'),(Join-Path $localAppData 'Programs\nodejs\node.exe'))}
        'npm' {$candidates=@((Join-Path $programFiles 'nodejs\npm.cmd'),(Join-Path $localAppData 'Programs\nodejs\npm.cmd'))}
        'python' {$candidates=@((Join-Path $localAppData 'Programs\Python\Python311\python.exe'),(Join-Path $localAppData 'Programs\Python\Python312\python.exe'),(Join-Path $programFiles 'Python311\python.exe'),(Join-Path $programFiles 'Python312\python.exe'))}
        'code' {$candidates=@((Join-Path $localAppData 'Programs\Microsoft VS Code\Code.exe'),(Join-Path $programFiles 'Microsoft VS Code\Code.exe'))}
        'notepad++' {$candidates=@((Join-Path $programFiles 'Notepad++\notepad++.exe') )}
        'obs64' {$candidates=@((Join-Path $programFiles 'obs-studio\bin\64bit\obs64.exe'))}
        'AutoHotkey' {$candidates=@((Join-Path $programFilesX86 'AutoHotkey\v2\AutoHotkey64.exe'),(Join-Path $programFilesX86 'AutoHotkey\v2\AutoHotkey.exe'),(Join-Path $programFiles 'AutoHotkey\v2\AutoHotkey64.exe'),(Join-Path $programFiles 'AutoHotkey\v2\AutoHotkey.exe'))}
    }
    foreach($candidate in $candidates){
        if($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)){return [IO.Path]::GetFullPath($candidate)}
    }
    $commandNames=@($Name)
    if($Name -eq 'npm'){$commandNames=@('npm.cmd','npm')}
    foreach($commandName in $commandNames){
        $cmd=Get-Command $commandName -ErrorAction SilentlyContinue
        if($cmd){
            $path=[string]$cmd.Source
            if($Name -eq 'python' -and $path -match '\\WindowsApps\\'){continue}
            if($Name -eq 'npm' -and $path -match '\\npm\.ps1$'){
                $cmd=Get-Command npm.cmd -ErrorAction SilentlyContinue
                if(-not $cmd){continue}
                $path=[string]$cmd.Source
            }
            if($path -and (Test-Path -LiteralPath $path -PathType Leaf)){return [IO.Path]::GetFullPath($path)}
        }
    }
    return $null
}
function Get-KhoraToolProfile {
    param([string]$Name)
    $path=Resolve-KhoraHostToolPath -Name $Name
    if([string]::IsNullOrWhiteSpace($path)){return [ordered]@{name=$Name;present=$false;path=$null;version=$null;source='unavailable'}}
    $version=$null
    try{$version=(Get-Item -LiteralPath $path -ErrorAction Stop).VersionInfo.ProductVersion}catch{}
    $source=if($path -match '\\Program Files(?: \(x86\))?\\'){'host-standard-path'}else{'path'}
    return [ordered]@{name=$Name;present=$true;path=$path;version=([string]$version);source=$source}
}
function Get-KhoraHostProfile {
    param([Parameter(Mandatory=$true)][string]$Desktop)
    $os=Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $driveName=([IO.Path]::GetPathRoot($Desktop)).TrimEnd('\').TrimEnd(':')
    $drive=Get-PSDrive -Name $driveName -ErrorAction Stop
    $systemBitLocker=$null
    try{$bl=Get-BitLockerVolume -MountPoint $env:SystemDrive -ErrorAction Stop;$systemBitLocker=[ordered]@{status=[string]$bl.VolumeStatus;protection=[string]$bl.ProtectionStatus;method=[string]$bl.EncryptionMethod;percent=[int]$bl.EncryptionPercentage}}catch{}
    $toolNames=@('git','gh','node','npm','python','code','notepad++','obs64','AutoHotkey')
    $tools=[ordered]@{};foreach($name in $toolNames){$tools[$name]=Get-KhoraToolProfile -Name $name}
    $signalNames=@('cyberclient','cyberclientproxy','vigia','DFLocker64','DFServ');$signals=@();foreach($name in $signalNames){if(Get-Process -Name $name -ErrorAction SilentlyContinue){$signals+=$name}}
    return [ordered]@{schema='oep-host-profile/v1';capturedUtc=[DateTime]::UtcNow.ToString('o');machineName=[Environment]::MachineName;userName=[Environment]::UserName;executionIdentity=[Security.Principal.WindowsIdentity]::GetCurrent().Name;dataProfileName=[string]$script:KHORA_DATA_PROFILE_NAME;dataProfileRoot=[string]$script:KHORA_DATA_PROFILE_ROOT;is64BitOS=[Environment]::Is64BitOperatingSystem;os=[ordered]@{caption=[string]$os.Caption;version=[string]$os.Version;build=[string]$os.BuildNumber};administrator=(Test-KhoraAdministrator);desktop=[IO.Path]::GetFullPath($Desktop);desktopStorageRoot=[IO.Path]::GetPathRoot($Desktop);desktopWritable=$true;freeGiB=[math]::Round($drive.Free/1GB,2);systemBitLocker=$systemBitLocker;managementSignals=@($signals);hostClassification=if($signals.Count -gt 0){'managed-or-public-suspected'}else{'unclassified'};tools=$tools;hostToolPolicy='allow-verified-host'}
}
function Save-KhoraHostProfile {
    param([Parameter(Mandatory=$true)][object]$Profile,[Parameter(Mandatory=$true)][string]$Path)
    $parent=Split-Path -Parent $Path;if(-not(Test-Path -LiteralPath $parent -PathType Container)){New-Item -ItemType Directory -Path $parent -Force|Out-Null};$Profile|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $Path -Encoding UTF8
}
function Invoke-KhoraElevation {
 if(Test-KhoraAdministrator){return $false}
 if([string]::IsNullOrWhiteSpace($script:SELF_SOURCE)){throw 'No se pudo materializar el gate para elevación.'}
 $temporaryScript=Join-Path $script:KHORA_TARGET_TEMP ('khora-bootstrap-'+[guid]::NewGuid().ToString('N')+'.ps1');$temporaryToken=Join-Path $script:KHORA_TARGET_TEMP ('khora-token-'+[guid]::NewGuid().ToString('N')+'.dpapi')
 try{[IO.File]::WriteAllText($temporaryScript,$script:SELF_SOURCE,(New-Object Text.UTF8Encoding($true)));Protect-KhoraSecureStringBlob -Secure (ConvertTo-SecureString $script:KhoraToken -AsPlainText -Force) -Path $temporaryToken;$args=@('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$temporaryScript+'"'),'-Bootstrap','-KhoraTokenFile',('"'+$temporaryToken+'"'),'-KhoraApiBase',('"'+$KhoraApiBase+'"'));$child=Start-Process powershell.exe -Verb RunAs -ArgumentList $args -PassThru -ErrorAction Stop;$until=[DateTime]::UtcNow.AddSeconds(45);while((Test-Path -LiteralPath $temporaryToken)-and-not$child.HasExited-and[DateTime]::UtcNow-lt$until){Start-Sleep -Milliseconds 200};if($child.HasExited-and(Test-Path -LiteralPath $temporaryToken)){throw 'El proceso elevado no consumió la credencial protegida.'};return $true}catch{try{[IO.File]::Delete($temporaryScript)}catch{};try{[IO.File]::Delete($temporaryToken)}catch{};throw}
}
function Get-KhoraDesktop {
 $desktop=if($script:KHORA_TARGET_DESKTOP){[string]$script:KHORA_TARGET_DESKTOP}else{[Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)}
 if([string]::IsNullOrWhiteSpace($desktop)-or-not(Test-Path -LiteralPath $desktop -PathType Container)){throw 'No se pudo descubrir un Escritorio de destino utilizable.'}
 $desktop=[IO.Path]::GetFullPath($desktop)
 if($script:KHORA_DATA_PROFILE_MODE -eq 'fila4-profile-tree' -and -not $desktop.StartsWith(([string]$script:KHORA_DATA_PROFILE_ROOT).TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'KHORA_DESKTOP_OUTSIDE_FILA4_PROFILE'}
 $root=[IO.Path]::GetPathRoot($desktop)
 if($root.StartsWith('\\')){throw 'VHDX requiere un Escritorio en volumen local.'}
 $probe=Join-Path $desktop ('.khora-probe-'+[guid]::NewGuid().ToString('N'))
 try{[IO.File]::WriteAllText($probe,'ok');Remove-Item -LiteralPath $probe -Force}catch{throw 'El Escritorio de destino no es escribible.'}
 $drive=Get-PSDrive -Name $root.TrimEnd('\').TrimEnd(':') -ErrorAction SilentlyContinue
 if($drive-and$drive.Free-lt6GB){throw 'Se requieren al menos 6 GiB libres.'}
 return $desktop
}
function Ensure-KhoraDesktopEpWorkspace {
    param([Parameter(Mandatory=$true)][string]$Desktop,[Parameter(Mandatory=$true)][string]$Target)
    if(-not(Test-Path -LiteralPath $Target -PathType Container)){New-Item -ItemType Directory -Path $Target -Force|Out-Null}
    $link=Join-Path $Desktop 'EP'
    if(Test-Path -LiteralPath $link){
        $item=Get-Item -LiteralPath $link -Force
        $isReparse=(($item.Attributes -band [IO.FileAttributes]::ReparsePoint)-ne0)
        $isJunction=([string]$item.LinkType -eq 'Junction')
        $knownTarget=$false
        if($isReparse -and $isJunction){try{$knownTarget=([IO.Path]::GetFullPath([string]$item.Target)-eq[IO.Path]::GetFullPath($Target))}catch{}}
        if(-not $knownTarget){throw 'La carpeta Desktop/EP ya existe y no es el workspace OEP de esta sesión.'}
    }else{
        & cmd.exe /d /c ('mklink /J "{0}" "{1}"' -f $link,$Target)|Out-Null
        if($LASTEXITCODE-ne0){throw 'No se pudo crear la junction Desktop/EP.'}
    }
    $check=Get-Item -LiteralPath $link -Force
    if((([string]$check.LinkType) -ne 'Junction')-or(([IO.Path]::GetFullPath([string]$check.Target)) -ne [IO.Path]::GetFullPath($Target))){throw 'La junction Desktop/EP no coincide con el workspace OEP.'}
    return $link
}
function Remove-KhoraDesktopEpWorkspace {
    param([Parameter(Mandatory=$true)][string]$Link,[Parameter(Mandatory=$true)][string]$Target)
    if(-not(Test-Path -LiteralPath $Link)){return $true}
    $item=Get-Item -LiteralPath $Link -Force
    $isReparse=(($item.Attributes -band [IO.FileAttributes]::ReparsePoint)-ne0)
    $isJunction=([string]$item.LinkType -eq 'Junction')
    $knownTarget=$false
    if($isReparse -and $isJunction){try{$knownTarget=([IO.Path]::GetFullPath([string]$item.Target)-eq[IO.Path]::GetFullPath($Target))}catch{}}
    if(-not $knownTarget){throw 'Desktop/EP no coincide con el workspace OEP; no se elimina.'}
    [IO.Directory]::Delete($Link,$false)
    return (-not(Test-Path -LiteralPath $Link))
}
function Get-KhoraFreeDrive {
    foreach($letterCode in 90..82){$letter=[char]$letterCode;if(-not(Test-Path ("$letter`:\"))){return [string]$letter}}
    throw 'No hay letra de unidad libre entre R y Z.'
}
function Invoke-KhoraDiskpart {
    param([string[]]$Lines)
    $file=Join-Path $env:TEMP ('khora-diskpart-'+[guid]::NewGuid().ToString('N')+'.txt')
    [IO.File]::WriteAllLines($file,$Lines,(New-Object Text.ASCIIEncoding))
    try{$output=@(& diskpart.exe /s $file 2>&1);if($LASTEXITCODE-ne0){throw($output-join' ')}}finally{try{[IO.File]::Delete($file)}catch{}}
}
function New-KhoraEncryptedWorkspace {
    param([string]$Outer,[string]$Vhd,[string]$Drive,[Security.SecureString]$VaultKey,[string]$SessionId)
    New-Item -ItemType Directory -Path $Outer -Force|Out-Null
    Invoke-KhoraDiskpart -Lines @("create vdisk file=`"$Vhd`" maximum=65536 type=expandable","select vdisk file=`"$Vhd`"",'attach vdisk','create partition primary','format fs=ntfs quick label=KHORA_EP_V1',"assign letter=$Drive")
    $plain=ConvertFrom-KhoraSecureString $VaultKey;$salt=$null;$deriver=$null;$derivedBytes=$null;$derived=$null;$password=$null
    try{$salt=[Text.Encoding]::UTF8.GetBytes('KHORA-EP-V1|'+$SessionId);$deriver=New-Object Security.Cryptography.Rfc2898DeriveBytes($plain,$salt,200000,[Security.Cryptography.HashAlgorithmName]::SHA256);$derivedBytes=$deriver.GetBytes(32);$derived=[Convert]::ToBase64String($derivedBytes);$password=ConvertTo-SecureString $derived -AsPlainText -Force}
    finally{$plain=$null;$derived=$null;if($salt){[Array]::Clear($salt,0,$salt.Length)};if($derivedBytes){[Array]::Clear($derivedBytes,0,$derivedBytes.Length)};if($deriver){$deriver.Dispose()}}
    $mount=$Drive+':'
    Enable-BitLocker -MountPoint $mount -PasswordProtector -Password $password -EncryptionMethod XtsAes256 -UsedSpaceOnly -SkipHardwareTest|Out-Null
    $deadline=(Get-Date).AddMinutes(5)
    do{$volume=Get-BitLockerVolume -MountPoint $mount;if([int]$volume.EncryptionPercentage-eq100-and[string]$volume.ProtectionStatus-eq'On'){break};Start-Sleep -Milliseconds 400}while((Get-Date)-lt$deadline)
    if([int]$volume.EncryptionPercentage-ne100-or[string]$volume.ProtectionStatus-ne'On'){throw 'BitLocker no alcanzó 100% y ProtectionStatus=On.'}
    return $mount
}
function Register-KhoraRebootCleanup {
    param([string]$Task,[string]$Outer,[string]$Vhd)
    $body="Start-Sleep -Seconds 10;Remove-Item -LiteralPath '"+$Vhd.Replace("'","''")+"' -Force -ErrorAction SilentlyContinue;Remove-Item -LiteralPath '"+$Outer.Replace("'","''")+"' -Recurse -Force -ErrorAction SilentlyContinue;Unregister-ScheduledTask -TaskName '"+$Task.Replace("'","''")+"' -Confirm:`$false -ErrorAction SilentlyContinue"
    $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($body))
    $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand '+$encoded)
    $trigger=New-ScheduledTaskTrigger -AtStartup
    $principal=New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName $Task -Action $action -Trigger $trigger -Principal $principal -Force|Out-Null
}
function Get-KhoraGitHubToken {
    if($script:KhoraToken -and $KhoraApiBase){
        $candidate=$null
        $response=$null
        try{
            $response=Invoke-RestMethod -Method Post -Uri ($KhoraApiBase.TrimEnd('/')+'/github-credential') -Headers @{Authorization=('Bearer '+$script:KhoraToken)} -TimeoutSec 20 -MaximumRedirection 0 -ErrorAction Stop
            $candidate=[string]$response.token
            if($candidate -notmatch '^github_pat_[A-Za-z0-9_]{20,240}$'){throw 'Invalid protected credential'}
            return (ConvertTo-SecureString $candidate -AsPlainText -Force)
        }catch{
            $status=0
            try{$status=[int]$_.Exception.Response.StatusCode}catch{}
            $explanation=switch($status){
                401 {'La sesion del entorno persistente no es valida o no autoriza recuperar el token. Genera una sesion nueva en Khora.'}
                403 {'Esta sesion no pertenece al propietario autorizado del token GitHub.'}
                409 {'Falta guardar el token GitHub del entorno persistente en Seguridad > Boveda.'}
                503 {'Khora no pudo abrir la credencial protegida. Revisa la disponibilidad de la boveda y su clave de cifrado.'}
                default {'No se pudo obtener una respuesta valida al recuperar el token GitHub. La causa no esta confirmada.'}
            }
            throw ($explanation+' No se uso otra credencial. HTTP='+$status)
        }finally{$candidate=$null;$response=$null}
    }

    $gh=Resolve-KhoraHostToolPath -Name 'gh'
    if($gh-and(Test-Path -LiteralPath $gh -PathType Leaf)){
        try{
            $tokenOutput=@(& $gh auth token 2>&1);$exit=$LASTEXITCODE
            if($exit-eq0){
                $candidate=([string]($tokenOutput -join '')).Trim()
                if($candidate-match'^(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,})$'){
                    $headers=@{Authorization=('Bearer '+$candidate);'User-Agent'='khora-ep-medio-v1';Accept='application/vnd.github+json'}
                    $user=Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers -TimeoutSec 20
                    $repo=Invoke-RestMethod -Uri 'https://api.github.com/repos/SeryMente/khora' -Headers $headers -TimeoutSec 20
                    if($user.login-and($repo.permissions.push-or$repo.permissions.maintain-or$repo.permissions.admin)){return (ConvertTo-SecureString $candidate -AsPlainText -Force)}
                }
                $candidate=$null
            }
        }catch{}finally{$candidate=$null}
    }
    Write-Host '  Copia un Personal Access Token de GitHub con escritura sobre SeryMente/khora.' -ForegroundColor Yellow
    $deadline=(Get-Date).AddMinutes(10)
    do{
        $candidate=([string](Get-Clipboard -Raw -ErrorAction SilentlyContinue)).Trim()
        if($candidate-match'^(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,})$'){
            try{$headers=@{Authorization=('Bearer '+$candidate);'User-Agent'='khora-ep-medio-v1';Accept='application/vnd.github+json'};$user=Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers -TimeoutSec 20;$repo=Invoke-RestMethod -Uri 'https://api.github.com/repos/SeryMente/khora' -Headers $headers -TimeoutSec 20;if($user.login-and($repo.permissions.push-or$repo.permissions.maintain-or$repo.permissions.admin)){Set-Clipboard -Value' ';return (ConvertTo-SecureString $candidate -AsPlainText -Force)}}catch{}finally{$candidate=$null}
        }
        Start-Sleep -Milliseconds 400
    }while((Get-Date)-lt$deadline)
    throw 'No se recibió un Personal Access Token válido en diez minutos.'
}
function Invoke-WithBootstrapToken {
    param([Security.SecureString]$Secure,[ScriptBlock]$Action)
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer);return (&$Action $plain)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$plain=$null}
}
function Materialize-KhoraRepository {
 param([Security.SecureString]$Pat,[string]$Destination)
 return Invoke-WithBootstrapToken -Secure $Pat -Action {param($token)$id=[guid]::NewGuid().ToString('N');$zip=Join-Path $env:TEMP ('khora-seed-'+$id+'.zip');$extract=Join-Path $env:TEMP ('khora-seed-'+$id);try{$headers=@{Authorization=('Bearer '+$token);'User-Agent'='khora-ep-medio-v1';Accept='application/vnd.github+json'};$commit=Invoke-RestMethod -Uri ('https'+'://api.github.com/repos/SeryMente/khora/commits/main') -Headers $headers -TimeoutSec 30 -ErrorAction Stop;$sha=[string]$commit.sha;if($sha-notmatch'^[0-9a-f]{40}$'){throw 'SHA remoto inválido.'};$uri=(('https'+'://api.github.com/repos/SeryMente/khora/zipball/{0}')-f$sha);Invoke-WebRequest -Uri $uri -Headers $headers -OutFile $zip -UseBasicParsing -TimeoutSec 900 -ErrorAction Stop;$sig=[IO.File]::ReadAllBytes($zip);if($sig.Length-lt4-or$sig[0]-ne0x50-or$sig[1]-ne0x4B){throw 'GitHub no devolvió ZIP.'};New-Item -ItemType Directory -Path $extract -Force|Out-Null;Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force -ErrorAction Stop;$roots=@(Get-ChildItem -LiteralPath $extract -Directory -Force);if($roots.Count-ne1){throw 'ZIP sin raíz única.'};New-Item -ItemType Directory -Path $Destination -Force|Out-Null;Get-ChildItem -LiteralPath $roots[0].FullName -Force|ForEach-Object{Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force};return $sha}finally{try{[IO.File]::Delete($zip)}catch{};try{if([IO.Directory]::Exists($extract)){[IO.Directory]::Delete($extract,$true)}}catch{};$token=$null}}
}
function Start-KhoraLogWindow {
    param([string]$Log)
    $escaped=$Log.Replace("'","''")
    $command="`$host.UI.RawUI.WindowTitle='KHORA EP Medio v1.0 - Registro';Write-Host 'REGISTRO TÉCNICO · usa identificadores EP-*.' -ForegroundColor Cyan;Get-Content -LiteralPath '$escaped' -Wait"
    return Start-Process powershell.exe -ArgumentList @('-NoProfile','-NoExit','-Command',$command) -PassThru
}
function Invoke-KhoraEmergencyDetach {
    param([string]$Vhd,[string]$Mount,[string]$Outer)
    try{if($Mount-and(Test-Path($Mount+'\'))){Lock-BitLocker -MountPoint $Mount -ForceDismount -ErrorAction SilentlyContinue|Out-Null}}catch{}
    try{if($Vhd-and(Test-Path $Vhd)){Invoke-KhoraDiskpart -Lines @("select vdisk file=`"$Vhd`"",'detach vdisk noerr')}}catch{}
    if($Vhd){Remove-Item -LiteralPath $Vhd -Force -ErrorAction SilentlyContinue}
    if($Outer){Remove-Item -LiteralPath $Outer -Recurse -Force -ErrorAction SilentlyContinue}
}
function Start-KhoraBootstrap {
    Initialize-KhoraDataProfileContext
    if($script:KHORA_DATA_PROFILE_MODE -eq 'fila4-profile-tree' -and $KhoraTokenFile){$tokenPath=[IO.Path]::GetFullPath($KhoraTokenFile);$profilePrefix=([string]$script:KHORA_DATA_PROFILE_ROOT).TrimEnd('\')+'\';if(-not $tokenPath.StartsWith($profilePrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'KHORA_TOKEN_FILE_OUTSIDE_FILA4_PROFILE'}}
    if($KhoraTokenFile){try{$secure=(Get-Content -LiteralPath $KhoraTokenFile -Raw -ErrorAction Stop).Trim()|ConvertTo-SecureString;$script:KhoraToken=ConvertFrom-KhoraSecureString $secure}finally{Remove-Item -LiteralPath $KhoraTokenFile -Force -ErrorAction SilentlyContinue;$secure=$null}}else{$script:KhoraToken=$KhoraToken}
    Assert-KhoraBootstrapInputs -Token $script:KhoraToken -ApiBase $KhoraApiBase
    if(-not(Test-KhoraAdministrator)){if(Invoke-KhoraElevation){return }}
    Remove-KhoraTemporaryGate|Out-Null
    try{$host.UI.RawUI.WindowTitle='KHORA EP Medio v1.0 - Lanzador'}catch{}
    Write-Host 'KHORA · Entorno Persistente v1.0' -ForegroundColor Cyan
    Write-Host 'Cada etapa expone un identificador estable EP-*.' -ForegroundColor DarkGray
    $outer=$null;$vhd=$null;$mount=$null;$vault=$null;$pat=$null
    try{
        $hostProfile=Invoke-KhoraBootstrapStage -Id 'EP-IN-010' -Label 'Comprobar Windows, elevación, Escritorio y perfil del host' -Action {if($env:OS-ne'Windows_NT'){throw 'Solo Windows.'};foreach($command in @('diskpart.exe','Enable-BitLocker','Get-BitLockerVolume','Register-ScheduledTask')){if(-not(Get-Command $command -ErrorAction SilentlyContinue)){throw "Falta $command"}};$d=Get-KhoraDesktop;return (Get-KhoraHostProfile -Desktop $d)}
        $desktop=[string]$hostProfile.desktop
        $sessionId=[guid]::NewGuid().ToString();$outer=Join-Path $desktop ('KHORA-EP-'+$sessionId);$vhd=Join-Path $outer 'khora-ep-medio.vhdx';$drive=Get-KhoraFreeDrive
        $vault=Invoke-KhoraBootstrapStage -Id 'EP-IN-020' -Label 'Recibir la llave de la bóveda' -Action {$key=Read-Host 'Llave de la bóveda' -AsSecureString;if($key.Length-lt8){throw 'Llave demasiado corta.'};return $key}
        $mount=Invoke-KhoraBootstrapStage -Id 'EP-IN-030' -Label 'Crear y verificar el volumen cifrado' -Action {New-KhoraEncryptedWorkspace -Outer $outer -Vhd $vhd -Drive $drive -VaultKey $vault -SessionId $sessionId}
        $work=Join-Path ($mount+'\') 'khora-ep';$state=Join-Path $work 'session-state';$repository=Join-Path $work 'repo';$logs=Join-Path $work 'logs'
        $workspaceDir=Join-Path $work 'EP';$desktopWorkspaceLink=Invoke-KhoraBootstrapStage -Id 'EP-IN-015' -Label 'Presentar el workspace cifrado en Escritorio/EP' -Action {Ensure-KhoraDesktopEpWorkspace -Desktop $desktop -Target $workspaceDir}
        $hostProfilePath=Join-Path $state 'host-profile.v1.json';Save-KhoraHostProfile -Profile $hostProfile -Path $hostProfilePath
        New-Item -ItemType Directory -Path @($state,$repository,$logs) -Force|Out-Null
        $log=Join-Path $logs 'events.log';$jsonLog=Join-Path $logs 'events.jsonl';New-Item -ItemType File -Path @($log,$jsonLog) -Force|Out-Null
        $task='KhoraEpCleanup-'+$sessionId
        Invoke-KhoraBootstrapStage -Id 'EP-IN-040' -Label 'Armar limpieza al reinicio' -Action {Register-KhoraRebootCleanup -Task $task -Outer $outer -Vhd $vhd}|Out-Null
        $pat=Invoke-KhoraBootstrapStage -Id 'EP-IN-050' -Label 'Validar el Personal Access Token de GitHub' -Action {Get-KhoraGitHubToken}
        $sha=Invoke-KhoraBootstrapStage -Id 'EP-IN-060' -Label 'Materializar el commit privado exacto' -Action {Materialize-KhoraRepository -Pat $pat -Destination $repository}
        $khoraSecure=ConvertTo-SecureString $KhoraToken -AsPlainText -Force
        Protect-KhoraSecureStringBlob -Secure $vault -Path (Join-Path $state 'vault-key.dpapi')
        Protect-KhoraSecureStringBlob -Secure $pat -Path (Join-Path $state 'github-token.dpapi')
        Protect-KhoraSecureStringBlob -Secure $khoraSecure -Path (Join-Path $state 'khora-token.dpapi')
        Protect-KhoraSecureStringBlob -Secure $vault -Path (Join-Path $state 'vault-key.guardian.dpapi')
        Protect-KhoraSecureStringBlob -Secure $pat -Path (Join-Path $state 'github-token.guardian.dpapi')
        Protect-KhoraSecureStringBlob -Secure $khoraSecure -Path (Join-Path $state 'khora-token.guardian.dpapi')
        $script:KhoraToken=$null;$KhoraToken=$null;$khoraSecure=$null
        $manifest=[ordered]@{schema='khora-ep-session/v1';epVersion=$script:EP_VERSION;scriptVersion=$script:SCRIPT_VERSION;launchMode='normal';hostToolPolicy='allow-verified-host';sessionId=$sessionId;startedUtc=[DateTime]::UtcNow.ToString('o');outerDir=$outer;vhdPath=$vhd;mountPoint=$mount;workDir=$work;stateDir=$state;repoDir=$repository;logFile=$log;jsonLog=$jsonLog;commitSha=$sha;cleanupTask=$task;launcherPid=$PID;khoraApiBase=$KhoraApiBase;logPid=0;hostProfileSchema='oep-host-profile/v1';hostProfilePath=$hostProfilePath;hostClassification=[string]$hostProfile.hostClassification;executionIdentity=[string]$script:KHORA_EXECUTION_IDENTITY;dataProfileName=[string]$script:KHORA_DATA_PROFILE_NAME;dataProfileRoot=[string]$script:KHORA_DATA_PROFILE_ROOT;hostTemp=[string]$script:KHORA_TARGET_TEMP;workspaceDir=$workspaceDir;desktopWorkspaceLink=$desktopWorkspaceLink}
        $manifestPath=Join-Path $state 'session-manifest.json';$manifest|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $manifestPath -Encoding UTF8
        $logProcess=Start-KhoraLogWindow -Log $log;$manifest.logPid=$logProcess.Id;$manifest|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $manifestPath -Encoding UTF8
        $gate=Join-Path $repository 'scripts\khora\khora.ps1';if(-not(Test-Path $gate)){throw 'El commit no contiene el punto de entrada contractual.'}
        $arguments=@('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$gate+'"'),'-BootstrapStage2','-SessionManifest',('"'+$manifestPath+'"'),'-WatchPid',$PID)
        $consoleHidden=Set-KhoraBootstrapConsoleVisible -Visible $false
        try{$interface=Start-Process powershell.exe -ArgumentList $arguments -PassThru -ErrorAction Stop;Wait-Process -Id $interface.Id}finally{if($consoleHidden){Set-KhoraBootstrapConsoleVisible -Visible $true|Out-Null}}
    }catch{Write-Host ('Fallo: '+$_.Exception.Message) -ForegroundColor Red;try{Invoke-KhoraEmergencyDetach -Vhd $vhd -Mount $mount -Outer $outer}catch{};throw}
    finally{$KhoraToken=$null;$vault=$null;$pat=$null}
}

function Invoke-KhoraSelfTest {
    if ([string]::IsNullOrWhiteSpace([string]$script:GATE_PATH) -or -not (Test-Path -LiteralPath $script:GATE_PATH -PathType Leaf)) {
        throw 'MOD_SCRIPTPWS_SELFTEST_REQUIRES_FILE: ejecuta khora.ps1 desde archivo.'
    }
    $repoRoot = [IO.Path]::GetFullPath((Join-Path $script:GATE_DIR '..\..'))
    $moduleDir = Join-Path $script:GATE_DIR 'modules'
    $barrelPath = Join-Path $script:GATE_DIR 'khora.barrel.ps1'
    if (-not (Test-Path -LiteralPath $barrelPath -PathType Leaf)) { throw 'MOD_SCRIPTPWS_SELFTEST_BARREL_MISSING' }
    $barrelText = Get-Content -LiteralPath $barrelPath -Raw
    $moduleMatches = [regex]::Matches($barrelText, "'([0-9]{2}-[^']+\.ps1)'")
    $moduleNames = @()
    foreach ($match in $moduleMatches) { $moduleNames += $match.Groups[1].Value }
    if ($moduleNames.Count -ne 18) { throw ('MOD_SCRIPTPWS_SELFTEST_MODULE_COUNT: expected=18 actual=' + $moduleNames.Count) }

    $sourceFiles = New-Object 'System.Collections.Generic.List[string]'
    [void]$sourceFiles.Add($script:GATE_PATH)
    [void]$sourceFiles.Add($barrelPath)
    foreach ($name in $moduleNames) {
        $modulePath = Join-Path $moduleDir $name
        if (-not (Test-Path -LiteralPath $modulePath -PathType Leaf)) { throw ('MOD_SCRIPTPWS_SELFTEST_MODULE_MISSING: ' + $name) }
        [void]$sourceFiles.Add($modulePath)
    }
    $testDir = Join-Path $script:GATE_DIR 'tests'
    if (-not (Test-Path -LiteralPath $testDir -PathType Container)) { throw 'MOD_SCRIPTPWS_SELFTEST_TESTS_DIRECTORY_MISSING' }
    foreach ($testFile in @(Get-ChildItem -LiteralPath $testDir -Filter '*.ps1' -File -ErrorAction Stop)) {
        [void]$sourceFiles.Add($testFile.FullName)
    }

    $parseCount = 0
    foreach ($sourceFile in $sourceFiles) {
        $tokens = $null
        $parseErrors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile($sourceFile, [ref]$tokens, [ref]$parseErrors)
        if ($parseErrors -and $parseErrors.Count -gt 0) {
            $first = $parseErrors | Select-Object -First 1
            throw ('MOD_SCRIPTPWS_SELFTEST_PARSE_ERROR: ' + $sourceFile + ':' + $first.Extent.StartLineNumber + ': ' + $first.Message)
        }
        $parseCount++
    }

    $configPath = Join-Path $moduleDir '00-config.ps1'
    $configText = Get-Content -LiteralPath $configPath -Raw
    if ($configText -notmatch "SCRIPT_VERSION\s+-ne\s+'7\.5\.5'" -or $configText -notmatch "EP_VERSION\s+-ne\s+'1\.0\.3'") {
        throw 'MOD_SCRIPTPWS_SELFTEST_VERSION_GUARD_MISSING'
    }
    $validatorPath = Join-Path $repoRoot 'tests\validate_ep.py'
    if (-not (Test-Path -LiteralPath $validatorPath -PathType Leaf)) { throw 'MOD_SCRIPTPWS_SELFTEST_VALIDATOR_MISSING' }
    $validatorText = Get-Content -LiteralPath $validatorPath -Raw
    if ($validatorText -notmatch "SCRIPT_VERSION = '7\.5\.5'" -or $validatorText -notmatch "EP_VERSION = '1\.0\.3'") {
        throw 'MOD_SCRIPTPWS_SELFTEST_VALIDATOR_VERSION_MISMATCH'
    }

    $moduleSources = @(Get-ChildItem -LiteralPath $moduleDir -Filter '*.ps1' -File -ErrorAction Stop | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw })
    $allSource = ($moduleSources -join [Environment]::NewLine)
    foreach ($requiredToken in @('Find-KhoraHostExecutable','Get-KhoraToolchainInventory','npm.cmd','Invoke-KhoraCleanupStageSafe','Test-KhoraEncryptedWorkspace','Start-GuardianLoop','Materialize-OepWorkspaceRepositories','Sync-OepWorkspaceWip','Send-KhoraRemoteEvent','Write-KhoraEvent')) {
        if ($allSource.IndexOf($requiredToken, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
            throw ('MOD_SCRIPTPWS_SELFTEST_CAPABILITY_MISSING: ' + $requiredToken)
        }
    }
    if ($allSource -match '(?i)git\s+add\s+-A') { throw 'MOD_SCRIPTPWS_SELFTEST_FORBIDDEN_GIT_ADD_ALL' }

    $embeddedPath = Join-Path $repoRoot 'khora-web\lib\server\ep-bootstrap-content.ts'
    if (-not (Test-Path -LiteralPath $embeddedPath -PathType Leaf)) { throw 'MOD_SCRIPTPWS_SELFTEST_EMBEDDED_BOOTSTRAP_MISSING' }
    $embeddedText = Get-Content -LiteralPath $embeddedPath -Raw
    $embeddedMatch = [regex]::Match($embeddedText, 'BOOTSTRAP_PS1_BASE64\s*=\s*"([A-Za-z0-9+/=]+)"')
    if (-not $embeddedMatch.Success) { throw 'MOD_SCRIPTPWS_SELFTEST_EMBEDDED_BOOTSTRAP_FORMAT' }
    $gateBytes = [IO.File]::ReadAllBytes($script:GATE_PATH)
    if ([Convert]::ToBase64String($gateBytes) -cne $embeddedMatch.Groups[1].Value) {
        throw 'MOD_SCRIPTPWS_SELFTEST_EMBEDDED_BOOTSTRAP_DIVERGENCE'
    }

    Write-Host ('MOD-SCRIPTPWS SELFTEST: PASS · PowerShell ' + $PSVersionTable.PSVersion.ToString() + ' · ' + $parseCount + ' archivos parseados · SCRIPT ' + $script:SCRIPT_VERSION + ' · EP ' + $script:EP_VERSION + ' · bootstrap byte-equivalente') -ForegroundColor Green
    return [pscustomobject]@{status='PASS';scriptVersion=$script:SCRIPT_VERSION;epVersion=$script:EP_VERSION;parsedFiles=$parseCount;embeddedBytes=$gateBytes.Length}
}

if($SelfTest){Invoke-KhoraSelfTest;return }
if($Bootstrap){Start-KhoraBootstrap;return }
if(-not$script:GATE_DIR){throw 'Este modo requiere el punto de entrada clonado.'}
. (Join-Path $script:GATE_DIR 'khora.barrel.ps1')
if($BootstrapStage2){Start-KhoraMain;return }
if($CleanupOnly){Invoke-Cleanup -Reason $Reason -Emergency;return }
if($GuardianOnly){Start-GuardianLoop -WatchPid $WatchPid;return }
throw 'Usa el instanciador autenticado de Khora o -Bootstrap.'
