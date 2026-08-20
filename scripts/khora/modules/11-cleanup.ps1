# Salida con precedencia de confidencialidad.
function Invoke-KhoraCleanupStageSafe {
    param([string]$Id,[string]$Label,[ScriptBlock]$Action)
    try{Invoke-KhoraStage -Id $Id -Label $Label -Action $Action|Out-Null;return$true}catch{try{Fail ($Id+' falló: '+$_.Exception.Message)}catch{};return$false}
}
function Invoke-Cleanup {
    param([string]$Reason='manual',[switch]$Emergency)
    $mutex=New-Object Threading.Mutex($false,('Global\KhoraEpCleanup-'+$SESSION_ID));if(-not$mutex.WaitOne(0)){return}
    try{
        Import-KhoraGuardianSecrets;Show-KhoraUiConsole
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-010' -Label ('Aceptar cierre: '+$Reason) -Action {$script:SES_ACTIVE=$false;return$true}|Out-Null
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-020' -Label 'Detener Visual Studio Code y procesos de trabajo' -Action {Stop-KhoraWorkspaceProcesses -KeepLog;return$true}|Out-Null
        $profileOk=Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-030' -Label 'Cifrar el perfil de Visual Studio Code' -Action {Export-VSCodeConfig;return$true}
        $pushOk=Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-040' -Label 'Persistir y verificar continuidad remota' -Action {if(-not(Do-AutoWip)){throw'Push no verificable por SHA.'};return$true}
        if(-not$profileOk-or-not$pushOk){try{Write-KhoraEvent -Id 'EP-OUT-040' -State INFO -Message 'Posible pérdida de continuidad; se prioriza confidencialidad.' -RemoteOptional}catch{}}
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-050' -Label 'Purgar variables y secretos de trabajo' -Action {Clear-KhoraSensitiveMemory -KeepKhora;Remove-Item -LiteralPath (Join-Path $STATE_DIR 'github-token.guardian.dpapi'),(Join-Path $STATE_DIR 'vault-key.guardian.dpapi') -Force -ErrorAction SilentlyContinue;return$true}|Out-Null
        Stop-Process -Id ([int]$script:SESSION.logPid) -Force -ErrorAction SilentlyContinue
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-060' -Label 'Bloquear BitLocker' -Action {Lock-KhoraEncryptedVolume}|Out-Null
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-070' -Label 'Desmontar el Disco Duro Virtual versión 2' -Action {Dismount-KhoraVhd}|Out-Null
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-080' -Label 'Eliminar contenedor y carpeta efímera' -Action {Remove-KhoraContainer}|Out-Null
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-090' -Label 'Desarmar limpieza al reinicio' -Action {Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue;return$true}|Out-Null
        try{Write-KhoraEvent -Id 'EP-OUT-100' -State START -Message 'Finalizar la sesión';Write-KhoraUiStage -Id 'EP-OUT-100' -State START -Label 'Finalizar la sesión';Write-KhoraEvent -Id 'EP-OUT-100' -State OK -Message 'Sesión eliminada';Write-KhoraUiStage -Id 'EP-OUT-100' -State OK -Label 'Sesión eliminada'}catch{}
        $script:KhoraTokenSecure=$null;[GC]::Collect()
    } finally {try{$mutex.ReleaseMutex()}catch{};$mutex.Dispose()}
}
function Cleanup-VisualStudioCode{}
function Stop-KhoraRuntimeProcesses{Stop-KhoraWorkspaceProcesses}
function Clear-KhoraEphemeralCredentials{Clear-KhoraSensitiveMemory}
function Uninstall-KhoraScheduledTasks{}
function Restore-KhoraRegistryState{}
