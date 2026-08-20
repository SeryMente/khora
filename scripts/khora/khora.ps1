#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Bootstrap,
    [switch]$BootstrapStage2,
    [switch]$CleanupOnly,
    [switch]$GuardianOnly,
    [string]$Reason='manual',
    [string]$SessionManifest,
    [int]$WatchPid=0,
    [string]$KhoraToken,
    [string]$KhoraTokenFile,
    [string]$KhoraApiBase
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$script:EP_VERSION = '1.0.0'
$script:SCRIPT_VERSION = '7.3.0'
$script:GATE_PATH=$PSCommandPath
$script:GATE_DIR=if($PSCommandPath){Split-Path -Parent $PSCommandPath}else{$null}
$script:SESSION_MANIFEST_ARG=$SessionManifest
$script:WATCH_PID_ARG=$WatchPid
$script:SELF_SOURCE=if($PSCommandPath){Get-Content -LiteralPath $PSCommandPath -Raw}else{$MyInvocation.MyCommand.Definition}

function ConvertFrom-KhoraSecureString {
    param([Security.SecureString]$Value)
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try{return[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
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
    if([string]::IsNullOrWhiteSpace($KhoraToken)-or[string]::IsNullOrWhiteSpace($KhoraApiBase)){throw'Token o API Khora ausente; la bitácora persistente es obligatoria.'}
    $event=[ordered]@{id=$Id;state=$State;message=$Message;timestamp=[DateTime]::UtcNow.ToString('o')}
    if($null-ne$DurationMs){$event.durationMs=[long]$DurationMs}
    $body=@{events=@($event)}|ConvertTo-Json -Depth 6 -Compress
    $lastError=$null
    foreach($attempt in 1..3){
        try{Invoke-RestMethod -Method Post -Uri ($KhoraApiBase.TrimEnd('/')+'/events') -Headers (Get-KhoraBootstrapHeaders $KhoraToken) -Body $body -TimeoutSec 20|Out-Null;return}
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
    try{$result=&$Action;$watch.Stop();Send-KhoraBootstrapEvent -Id $Id -State OK -Message $Label -DurationMs $watch.ElapsedMilliseconds;Write-KhoraBootstrapUi -Id $Id -State OK -Label $Label -DurationMs $watch.ElapsedMilliseconds;return$result}
    catch{$watch.Stop();try{Send-KhoraBootstrapEvent -Id $Id -State FAIL -Message ($Label+': '+$_.Exception.Message) -DurationMs $watch.ElapsedMilliseconds}catch{};Write-KhoraBootstrapUi -Id $Id -State FAIL -Label $Label -DurationMs $watch.ElapsedMilliseconds;throw}
}
function Test-KhoraAdministrator {
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent();$principal=New-Object Security.Principal.WindowsPrincipal($identity)
    return$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Invoke-KhoraElevation {
    if(Test-KhoraAdministrator){return$false}
    if([string]::IsNullOrWhiteSpace($script:SELF_SOURCE)){throw'No se pudo materializar el gate para elevación.'}
    $temporaryScript=Join-Path $env:TEMP ('khora-bootstrap-'+[guid]::NewGuid().ToString('N')+'.ps1')
    [IO.File]::WriteAllText($temporaryScript,$script:SELF_SOURCE,(New-Object Text.UTF8Encoding($true)))
    $temporaryToken=Join-Path $env:TEMP ('khora-token-'+[guid]::NewGuid().ToString('N')+'.dpapi')
    Protect-KhoraSecureStringBlob -Secure (ConvertTo-SecureString $KhoraToken -AsPlainText -Force) -Path $temporaryToken
    $arguments=@('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$temporaryScript+'"'),'-Bootstrap','-KhoraTokenFile',('"'+$temporaryToken+'"'),'-KhoraApiBase',('"'+$KhoraApiBase+'"'))
    Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments|Out-Null
    return$true
}
function Get-KhoraDesktop {
    $desktop=[Environment]::GetFolderPath('Desktop')
    if([string]::IsNullOrWhiteSpace($desktop)){throw'No se pudo resolver el Escritorio.'}
    return[IO.Path]::GetFullPath($desktop)
}
function Get-KhoraFreeDrive {
    foreach($letterCode in 90..82){$letter=[char]$letterCode;if(-not(Test-Path ("$letter`:\"))){return[string]$letter}}
    throw'No hay letra de unidad libre entre R y Z.'
}
function Invoke-KhoraDiskpart {
    param([string[]]$Lines)
    $file=Join-Path $env:TEMP ('khora-diskpart-'+[guid]::NewGuid().ToString('N')+'.txt')
    [IO.File]::WriteAllLines($file,$Lines,(New-Object Text.ASCIIEncoding))
    try{$output=@(& diskpart.exe /s $file 2>&1);if($LASTEXITCODE-ne0){throw($output-join' ')}}finally{Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue}
}
function New-KhoraEncryptedWorkspace {
    param([string]$Outer,[string]$Vhd,[string]$Drive,[Security.SecureString]$VaultKey,[string]$SessionId)
    New-Item -ItemType Directory -Path $Outer -Force|Out-Null
    Invoke-KhoraDiskpart -Lines @("create vdisk file=`"$Vhd`" maximum=65536 type=expandable","select vdisk file=`"$Vhd`"",'attach vdisk','create partition primary','format fs=ntfs quick label=KHORA_EP_V1',"assign letter=$Drive")
    $plain=ConvertFrom-KhoraSecureString $VaultKey;$bytes=$null
    try{$bytes=[Text.Encoding]::UTF8.GetBytes($plain+'|KHORA-EP-V1|'+$SessionId);$hash=[Security.Cryptography.SHA256]::Create().ComputeHash($bytes);$derived=([BitConverter]::ToString($hash)).Replace('-','');$password=ConvertTo-SecureString $derived -AsPlainText -Force}
    finally{$plain=$null;if($bytes){[Array]::Clear($bytes,0,$bytes.Length)}}
    $mount=$Drive+':'
    Enable-BitLocker -MountPoint $mount -PasswordProtector -Password $password -EncryptionMethod XtsAes256 -UsedSpaceOnly -SkipHardwareTest|Out-Null
    $deadline=(Get-Date).AddMinutes(5)
    do{$volume=Get-BitLockerVolume -MountPoint $mount;if([int]$volume.EncryptionPercentage-eq100-and[string]$volume.ProtectionStatus-eq'On'){break};Start-Sleep -Milliseconds 400}while((Get-Date)-lt$deadline)
    if([int]$volume.EncryptionPercentage-ne100-or[string]$volume.ProtectionStatus-ne'On'){throw'BitLocker no alcanzó 100% y ProtectionStatus=On.'}
    return$mount
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
    Write-Host '  Copia un Personal Access Token de GitHub con escritura sobre SeryMente/khora.' -ForegroundColor Yellow
    $deadline=(Get-Date).AddMinutes(10)
    do{
        $candidate=([string](Get-Clipboard -Raw -ErrorAction SilentlyContinue)).Trim()
        if($candidate-match'^(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$'){
            try{$headers=@{Authorization=('Bearer '+$candidate);'User-Agent'='khora-ep-medio-v1';Accept='application/vnd.github+json'};$user=Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers -TimeoutSec 20;$repo=Invoke-RestMethod -Uri 'https://api.github.com/repos/SeryMente/khora' -Headers $headers -TimeoutSec 20;if($user.login-and($repo.permissions.push-or$repo.permissions.maintain-or$repo.permissions.admin)){Set-Clipboard -Value' ';return(ConvertTo-SecureString $candidate -AsPlainText -Force)}}catch{}finally{$candidate=$null}
        }
        Start-Sleep -Milliseconds 400
    }while((Get-Date)-lt$deadline)
    throw'No se recibió un Personal Access Token válido en diez minutos.'
}
function Invoke-WithBootstrapToken {
    param([Security.SecureString]$Secure,[ScriptBlock]$Action)
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer);return(&$Action $plain)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$plain=$null}
}
function Materialize-KhoraRepository {
    param([Security.SecureString]$Pat,[string]$Destination)
    return Invoke-WithBootstrapToken -Secure $Pat -Action {
        param($token)
        $headers=@{Authorization=('Bearer '+$token);'User-Agent'='khora-ep-medio-v1';Accept='application/vnd.github+json'}
        $commit=Invoke-RestMethod -Uri 'https://api.github.com/repos/SeryMente/khora/commits/main' -Headers $headers -TimeoutSec 30
        $sha=[string]$commit.sha
        if($sha-notmatch'^[0-9a-f]{40}$'){throw'SHA remoto inválido.'}
        $zip=Join-Path $env:TEMP 'khora-seed.zip'
        $uri='https://api.github.com/repos/SeryMente/khora/zipball/{0}'-f$sha
        Invoke-WebRequest -Uri $uri -Headers $headers -OutFile $zip -UseBasicParsing -TimeoutSec 900
        $extract=Join-Path $env:TEMP ('khora-seed-'+[guid]::NewGuid().ToString('N'))
        Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
        $source=Get-ChildItem -LiteralPath $extract -Directory|Select-Object -First 1
        if(-not$source){throw'El archivo de GitHub está vacío.'}
        New-Item -ItemType Directory -Path $Destination -Force|Out-Null
        Copy-Item -Path (Join-Path $source.FullName '*') -Destination $Destination -Recurse -Force
        Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction SilentlyContinue
        return$sha
    }
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
    if($KhoraTokenFile){$secure=(Get-Content -LiteralPath $KhoraTokenFile -Raw).Trim()|ConvertTo-SecureString;$script:KhoraToken=ConvertFrom-KhoraSecureString $secure;Remove-Item -LiteralPath $KhoraTokenFile -Force -ErrorAction SilentlyContinue}
    if(-not(Test-KhoraAdministrator)){if(Invoke-KhoraElevation){return}}
    try{$host.UI.RawUI.WindowTitle='KHORA EP Medio v1.0 - Lanzador'}catch{}
    Write-Host 'KHORA · Entorno Persistente v1.0' -ForegroundColor Cyan
    Write-Host 'Cada etapa expone un identificador estable EP-*.' -ForegroundColor DarkGray
    $outer=$null;$vhd=$null;$mount=$null;$vault=$null;$pat=$null
    try{
        $desktop=Invoke-KhoraBootstrapStage -Id 'EP-IN-010' -Label 'Comprobar Windows, elevación y Escritorio' -Action {if($env:OS-ne'Windows_NT'){throw'Solo Windows.'};foreach($command in @('diskpart.exe','Enable-BitLocker','Get-BitLockerVolume','Register-ScheduledTask')){if(-not(Get-Command $command -ErrorAction SilentlyContinue)){throw"Falta $command"}};return(Get-KhoraDesktop)}
        $sessionId=[guid]::NewGuid().ToString();$outer=Join-Path $desktop ('KHORA-EP-'+$sessionId);$vhd=Join-Path $outer 'khora-ep-medio.vhdx';$drive=Get-KhoraFreeDrive
        $vault=Invoke-KhoraBootstrapStage -Id 'EP-IN-020' -Label 'Recibir la llave de la bóveda' -Action {$key=Read-Host 'Llave de la bóveda' -AsSecureString;if($key.Length-lt8){throw'Llave demasiado corta.'};return$key}
        $mount=Invoke-KhoraBootstrapStage -Id 'EP-IN-030' -Label 'Crear y verificar el volumen cifrado' -Action {New-KhoraEncryptedWorkspace -Outer $outer -Vhd $vhd -Drive $drive -VaultKey $vault -SessionId $sessionId}
        $work=Join-Path ($mount+'\') 'khora-ep';$state=Join-Path $work 'session-state';$repository=Join-Path $work 'repo';$logs=Join-Path $work 'logs'
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
        $manifest=[ordered]@{schema='khora-ep-session/v1';epVersion=$script:EP_VERSION;scriptVersion=$script:SCRIPT_VERSION;sessionId=$sessionId;startedUtc=[DateTime]::UtcNow.ToString('o');outerDir=$outer;vhdPath=$vhd;mountPoint=$mount;workDir=$work;stateDir=$state;repoDir=$repository;logFile=$log;jsonLog=$jsonLog;commitSha=$sha;cleanupTask=$task;launcherPid=$PID;khoraApiBase=$KhoraApiBase;logPid=0}
        $manifestPath=Join-Path $state 'session-manifest.json';$manifest|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $manifestPath -Encoding UTF8
        $logProcess=Start-KhoraLogWindow -Log $log;$manifest.logPid=$logProcess.Id;$manifest|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $manifestPath -Encoding UTF8
        $gate=Join-Path $repository 'scripts\khora\khora.ps1';if(-not(Test-Path $gate)){throw'El commit no contiene el punto de entrada contractual.'}
        $arguments=@('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$gate+'"'),'-BootstrapStage2','-SessionManifest',('"'+$manifestPath+'"'),'-WatchPid',$PID)
        $interface=Start-Process powershell.exe -ArgumentList $arguments -PassThru
        Wait-Process -Id $interface.Id
    }catch{Write-Host ('Fallo: '+$_.Exception.Message) -ForegroundColor Red;try{Invoke-KhoraEmergencyDetach -Vhd $vhd -Mount $mount -Outer $outer}catch{};throw}
    finally{$KhoraToken=$null;$vault=$null;$pat=$null}
}

if($Bootstrap){Start-KhoraBootstrap;return}
if(-not$script:GATE_DIR){throw'Este modo requiere el punto de entrada clonado.'}
. (Join-Path $script:GATE_DIR 'khora.barrel.ps1')
if($BootstrapStage2){Start-KhoraMain;return}
if($CleanupOnly){Invoke-Cleanup -Reason $Reason -Emergency;return}
if($GuardianOnly){Start-GuardianLoop -WatchPid $WatchPid;return}
throw'Usa el instanciador autenticado de Khora o -Bootstrap.'
