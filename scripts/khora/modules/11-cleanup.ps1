# Salida con precedencia de confidencialidad.
function Invoke-KhoraCleanupStageSafe {
    param([string]$Id,[string]$Label,[ScriptBlock]$Action)
    try {
        $result=Invoke-KhoraStage -Id $Id -Label $Label -Action $Action
        if($result -is [bool] -and -not $result){throw 'La etapa devolvió FALSE; el resultado no se acepta.'}
        return $true
    } catch {
        try{Fail ($Id+' falló: '+$_.Exception.Message)}catch{}
        return $false
    }
}
function Invoke-Cleanup {
    param([string]$Reason='manual',[switch]$Emergency)
    $mutex=New-Object Threading.Mutex($false,('Global\KhoraEpCleanup-'+$SESSION_ID))
    if(-not$mutex.WaitOne(0)){return }
    try{
        Import-KhoraGuardianSecrets
        Show-KhoraUiConsole
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-010' -Label ('Aceptar cierre: '+$Reason) -Action {$script:SES_ACTIVE=$false;return $true}|Out-Null
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-020' -Label 'Detener Visual Studio Code y procesos de trabajo' -Action {Stop-KhoraWorkspaceProcesses -KeepLog;return $true}|Out-Null
        $profileOk=Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-030' -Label 'Cifrar el perfil de Visual Studio Code' -Action {Export-VSCodeConfig;return $true}
        $pushOk=Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-040' -Label 'Persistir y verificar continuidad remota' -Action {if(-not(Do-AutoWip)){throw 'Push no verificable por SHA.'};return $true}
        if(-not$profileOk-or-not$pushOk){try{Write-KhoraEvent -Id 'EP-OUT-040' -State INFO -Message 'Posible pérdida de continuidad; se prioriza confidencialidad.' -RemoteOptional}catch{}}
        Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-050' -Label 'Purgar variables y secretos de trabajo' -Action {Clear-KhoraSensitiveMemory -KeepKhora;Remove-Item -LiteralPath (Join-Path $STATE_DIR 'github-token.guardian.dpapi'),(Join-Path $STATE_DIR 'vault-key.guardian.dpapi') -Force -ErrorAction SilentlyContinue;return $true}|Out-Null
        Stop-Process -Id ([int]$script:SESSION.logPid) -Force -ErrorAction SilentlyContinue
        $lockOk=Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-060' -Label 'Bloquear BitLocker' -Action {Lock-KhoraEncryptedVolume;return $true}
        $detachOk=$false
        if($lockOk){
            $detachOk=Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-070' -Label 'Eliminar enlace Desktop/EP y desmontar el Disco Duro Virtual versión 2' -Action {
                $linkRemoved=Remove-KhoraDesktopEpWorkspace -Link ([string]$script:SESSION.desktopWorkspaceLink) -Target ([string]$script:SESSION.workspaceDir)
                if(-not $linkRemoved){throw 'No se pudo verificar la eliminación de Desktop/EP.'}
                if(-not (Dismount-KhoraVhd)){throw 'No se pudo verificar el desmontaje del VHDX.'}
                return $true
            }
        } else {
            Warn 'EP-OUT-060 no se verificó; se conserva el contenedor y la tarea de limpieza al reinicio.'
        }
        $containerRemoved=$false
        if($detachOk){
            $containerRemoved=Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-080' -Label 'Eliminar contenedor y carpeta efímera' -Action {if(-not(Remove-KhoraContainer)){throw 'La eliminación no quedó verificada.'};return $true}
        } else {
            Warn 'EP-OUT-080 omitido: el volumen no quedó bloqueado/desmontado de forma verificable.'
        }

        $residualVhd=Test-Path -LiteralPath $VHD_PATH
        $residualRoot=Test-Path -LiteralPath $ROOT_DIR
        $residualMount=(-not [string]::IsNullOrWhiteSpace([string]$MOUNT_POINT)) -and (Test-Path -LiteralPath ($MOUNT_POINT+'\'))
        $cleanupTaskRemoved=$false
        if($containerRemoved -and -not $residualVhd -and -not $residualRoot -and -not $residualMount){
            $cleanupTaskRemoved=Invoke-KhoraCleanupStageSafe -Id 'EP-OUT-090' -Label 'Desarmar limpieza al reinicio tras confirmar ausencia de residuos' -Action {
                $registered=Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
                if($registered){Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction Stop}
                if(Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue){throw 'La tarea de limpieza continúa registrada.'}
                return $true
            }
        } else {
            Warn 'EP-OUT-090 no se ejecutó: quedan residuos o la eliminación no se verificó. La tarea de limpieza al reinicio permanece armada.'
            try{Write-KhoraEvent -Id 'EP-OUT-090' -State INFO -Message 'Tarea de limpieza al reinicio conservada por residuos no verificados.' -RemoteOptional}catch{}
        }
        $fullyClean=($containerRemoved -and $cleanupTaskRemoved -and -not $residualVhd -and -not $residualRoot -and -not $residualMount)
        if($fullyClean){
            try{Write-KhoraEvent -Id 'EP-OUT-100' -State START -Message 'Finalizar la sesión';Write-KhoraUiStage -Id 'EP-OUT-100' -State START -Label 'Finalizar la sesión';Write-KhoraEvent -Id 'EP-OUT-100' -State OK -Message 'Sesión eliminada';Write-KhoraUiStage -Id 'EP-OUT-100' -State OK -Label 'Sesión eliminada'}catch{}
        } else {
            Warn 'Cierre incompleto: no se confirma la eliminación de todos los residuos. La limpieza al reinicio permanece disponible.'
        }
        $script:KhoraTokenSecure=$null
        [GC]::Collect()
    } finally {
        try{$mutex.ReleaseMutex()}catch{}
        $mutex.Dispose()
    }
}
function Cleanup-VisualStudioCode{Export-VSCodeConfig}
function Stop-KhoraRuntimeProcesses{Stop-KhoraWorkspaceProcesses}
function Clear-KhoraEphemeralCredentials{Clear-KhoraSensitiveMemory}
function Uninstall-KhoraScheduledTasks{
    $registered=Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
    if($registered){Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction Stop}
    return (-not(Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue))
}
function Restore-KhoraRegistryState{return $true}
