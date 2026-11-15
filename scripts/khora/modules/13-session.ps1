# Secuencia identificable y supervisor.
function Save-KhoraSessionManifest {
    param([hashtable]$Updates)
    $data=Get-Content -LiteralPath $script:SESSION_MANIFEST_PATH -Raw|ConvertFrom-Json
    foreach($key in $Updates.Keys){$data|Add-Member -NotePropertyName $key -NotePropertyValue $Updates[$key] -Force}
    $temporary=$script:SESSION_MANIFEST_PATH+'.tmp';$data|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $temporary -Encoding UTF8;Move-Item -LiteralPath $temporary -Destination $script:SESSION_MANIFEST_PATH -Force;$script:SESSION=$data
}
function Start-Sesion {
    Write-InitHeader
    try{
        Invoke-KhoraStage -Id 'EP-IN-070' -Label 'Autorizar GitHub y fijar el main privado exacto' -Action {if(-not(Test-KhoraEncryptedWorkspace)){throw 'Volumen no cifrado.'};Import-KhoraBootstrapSecrets;if(-not(Test-KhoraGitHubToken)){throw 'Personal Access Token de GitHub inválido.'};$script:OEP_WORKSPACE_SELECTION=@(Get-OepWorkspaceSelection);Start-KhoraPrefetch;if(-not(Ensure-Git)){throw 'Git no disponible.'};if(-not(Confirm-GhCliAuth)){throw 'GitHub CLI no autorizado.'};Initialize-KhoraRepository}|Out-Null
        Invoke-KhoraStage -Id 'EP-IN-075' -Label 'Materializar repositorios de trabajo seleccionados y registrar su WIP' -Action {$workspace=Materialize-OepWorkspaceRepositories -Selection $script:OEP_WORKSPACE_SELECTION;Save-KhoraSessionManifest -Updates @{workspaceRepositories=$workspace;workspaceSelection=@($script:OEP_WORKSPACE_SELECTION|ForEach-Object{$_.name})};return $workspace}|Out-Null
        . (Join-Path $REPO_DIR 'scripts\khora\env-vault.ps1')
        Invoke-KhoraStage -Id 'EP-IN-080' -Label 'Autorizar Vercel, publicar main y restaurar continuidad' -Action {$loaded=Import-KhoraEnvVault -Names @('VERCEL_TOKEN');if($loaded-notcontains'VERCEL_TOKEN'){throw 'VERCEL_TOKEN ausente.'};$deployment=Deploy-Production -ExpectedSha ([string]$script:SESSION.commitSha);Save-KhoraSessionManifest -Updates @{liveMainSha=$deployment.Sha;liveMainUrl=$deployment.Url;liveMainProofUrl=$deployment.ProofUrl;liveMainUtc=$deployment.PublishedUtc};Init-Wip;return $deployment}|Out-Null
        Invoke-KhoraStage -Id 'EP-IN-090' -Label 'Restaurar Visual Studio Code portátil' -Action {Ensure-VSCode|Out-Null;Sync-VSCodeConfig;$vscode=Start-KhoraVSCode;Save-KhoraSessionManifest -Updates @{vscodePid=$vscode.Id;supervisorPid=$PID}}|Out-Null
        Invoke-KhoraStage -Id 'EP-IN-100' -Label 'Importar la bóveda completa a la sesión' -Action {$script:VaultLoadedNames=@(Import-KhoraEnvVault);return $true}|Out-Null
        Invoke-KhoraStage -Id 'EP-IN-110' -Label 'Hidratar y verificar Python, Node.js y dependencias' -Action {Ensure-Python311|Out-Null;Ensure-Node|Out-Null;$inventory=@(Get-KhoraToolchainInventory);$failed=@($inventory|Where-Object{$_.status -ne 'AVAILABLE_COMPATIBLE'});if($failed.Count -gt 0){throw ('Toolchain no compatible: '+(($failed|ForEach-Object{$_.name+':'+$_.status}) -join ', '))};Save-KhoraSessionManifest -Updates @{toolchainInventory=$inventory};Start-KhoraDependencyHydration;return $inventory}|Out-Null
        Invoke-KhoraStage -Id 'EP-IN-120' -Label 'Activar Guardian, deadman y salida manual' -Action {$guardian=Start-Guardian -WatchPid $script:WATCH_PID_ARG;Save-KhoraSessionManifest -Updates @{guardianPid=$guardian.Id};$script:SES_ACTIVE=$true;return $true}|Out-Null
        Invoke-KhoraStage -Id 'EP-IN-130' -Label 'Verificar el entorno operativo' -Action {Wait-KhoraDependencyHydration;if(-not(Test-KhoraEncryptedWorkspace)){throw 'Cifrado perdido.'};return $true}|Out-Null
        Write-KhoraUiReady;Start-Sleep -Seconds 2;Hide-KhoraUiConsole
        $lastWip=Get-Date;$lastHeartbeat=Get-Date
        while($script:SES_ACTIVE){
            if(Test-Path(Join-Path $STATE_DIR 'cleanup.request')){Invoke-Cleanup -Reason 'manual-request';return }
            if(-not(Get-Process -Id $script:VSCODE_PID -ErrorAction SilentlyContinue)){Invoke-Cleanup -Reason 'vscode-closed';return }
            if((Get-Date)-$lastWip-ge[TimeSpan]::FromMinutes($CFG.autoWipMinutes)){try{Write-KhoraEvent -Id 'EP-RUN-010' -State START -Message 'Autosave WIP';if(Do-AutoWip){Write-KhoraEvent -Id 'EP-RUN-010' -State OK -Message 'Autosave WIP'}else{Write-KhoraEvent -Id 'EP-RUN-010' -State FAIL -Message 'Push WIP no verificable'}}catch{Warn $_.Exception.Message};$lastWip=Get-Date}
            if((Get-Date)-$lastHeartbeat-ge[TimeSpan]::FromMinutes(1)){try{Write-KhoraEvent -Id 'EP-RUN-020' -State INFO -Message 'Supervisor activo' -RemoteOptional}catch{};$lastHeartbeat=Get-Date}
            Start-Sleep -Seconds 2
        }
    } catch {try{Fail $_.Exception.Message}catch{};Invoke-Cleanup -Reason ('fatal-'+$script:CURRENT_STAGE_ID) -Emergency;throw}
}
function Start-Session{Start-Sesion}
