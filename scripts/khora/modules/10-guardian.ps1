# Guardian: deadman, cierre e inactividad.
function Get-KhoraIdleSeconds {
    if(-not('KhoraLastInput' -as[type])){Add-Type @'
using System;using System.Runtime.InteropServices;public static class KhoraLastInput{[StructLayout(LayoutKind.Sequential)]public struct LASTINPUTINFO{public uint cbSize;public uint dwTime;}[DllImport("user32.dll")]static extern bool GetLastInputInfo(ref LASTINPUTINFO p);public static uint Seconds(){LASTINPUTINFO i=new LASTINPUTINFO();i.cbSize=(uint)Marshal.SizeOf(i);return GetLastInputInfo(ref i)?((uint)Environment.TickCount-i.dwTime)/1000:0;}}
'@}
    return [KhoraLastInput]::Seconds()
}
function Start-GuardianLoop {
    param([int]$WatchPid)
    Import-KhoraGuardianSecrets;$lastHeartbeat=[DateTime]::MinValue
    while($true){
        $reason=$null
        if($WatchPid-gt0-and-not(Get-Process -Id $WatchPid -ErrorAction SilentlyContinue)){$reason='launcher-closed'}
        $request=Join-Path $STATE_DIR 'cleanup.request';if(Test-Path $request){$reason=(Get-Content -LiteralPath $request -Raw -ErrorAction SilentlyContinue).Trim();if(-not$reason){$reason='manual-request'}}
        $vscodePid=0;try{$latest=Get-Content -LiteralPath $script:SESSION_MANIFEST_PATH -Raw|ConvertFrom-Json;$vscodePid=[int]$latest.vscodePid}catch{}
        if($vscodePid-gt0-and-not(Get-Process -Id $vscodePid -ErrorAction SilentlyContinue)){$reason='vscode-closed'}
        if((Get-KhoraIdleSeconds)-ge($CFG.inactivityMinutes*60)){$reason='deadman-inactivity'}
        if((Get-Date)-$lastHeartbeat-ge[TimeSpan]::FromSeconds(60)){try{Write-KhoraEvent -Id 'EP-RUN-020' -State INFO -Message 'Guardian activo' -RemoteOptional}catch{};$lastHeartbeat=Get-Date}
        if($reason){try{Write-KhoraEvent -Id 'EP-RUN-030' -State INFO -Message ('Cierre solicitado: '+$reason) -RemoteOptional}catch{};Invoke-Cleanup -Reason $reason -Emergency;return}
        Start-Sleep -Seconds 2
    }
}
function Start-Guardian {
    param([int]$WatchPid)
    $arguments=@('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',('"'+$script:GATE_PATH+'"'),'-GuardianOnly','-SessionManifest',('"'+$script:SESSION_MANIFEST_PATH+'"'),'-WatchPid',$WatchPid)
    $process=Start-Process powershell.exe -ArgumentList $arguments -WindowStyle Hidden -PassThru;$script:GUARD_PID=$process.Id;return$process
}
