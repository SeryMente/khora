# Khora v7 Modules Contract

## Orden de carga (khora.barrel.ps1)
1. 00-config.ps1
2. 01-realuser.ps1
3. 02-logging.ps1
4. 03-hud.ps1
5. 04-ui.ps1
6. 05-efs.ps1
7. 06-token.ps1
8. 07-git-wip.ps1
9. 08-deps.ps1
10. 09-chrome.ps1
11. 10-guardian.ps1
12. 11-cleanup.ps1
13. 12-handoff.ps1
14. 13-session.ps1
15. 14-deploy.ps1
16. 15-main.ps1
17. 90-legacy.ps1

## Estado de Componentes

| Módulo | Componente | Estado |
|---|---|---|
| 00-config | config/rutas/globals | PENDIENTE |
| 01-realuser | detección usuario real | PENDIENTE |
| 02-logging | logging | EXTRAÍDO |
| 03-hud | HUD | EXTRAÍDO |
| 04-ui | UI consola | EXTRAÍDO |
| 05-efs | EFS | EXTRAÍDO |
| 06-token | token | EXTRAÍDO |
| 07-git-wip | git/auto-WIP | EXTRAÍDO |
| 08-deps | dependencias | EXTRAÍDO |
| 09-chrome | Chrome | EXTRAÍDO |
| 10-guardian | guardian/seguridad | EXTRAÍDO |
| 11-cleanup | limpieza nuclear | EXTRAÍDO |
| 12-handoff | Live Handoff | EXTRAÍDO |
| 13-session | Start-Sesion | EXTRAÍDO |
| 14-deploy | tests/deploy | EXTRAÍDO |
| 15-main | Run-Main | EXTRAÍDO |
| 90-legacy | Monolito | TRANSITORIO |

### Funciones extraídas a 06-token.ps1
- `Invoke-WithToken`
- `Protect-KhoraToken`
- `Unprotect-KhoraToken`
- `Save-TokenSnapshot`
- `Test-TokenSnapshotValid`
- `Get-PersistedToken`

### Funciones extraídas a 02-logging.ps1
- `L`
- `Ok`
- `Fail`
- `Info`
- `Warn`
- `Step`

### Funciones extraídas a 04-ui.ps1
- `Test-Cmd`
- `Clear-PendingInput`
- `Get-Cim`
- `Resolve-Exe`
- `Write-InitHeader`
- `Open-LogWindow`
- `Invoke-Preflight`
- `Spin-Job`
- `Focus-Window`
- `Show-DiagBundle`
- `Show-Estado`
- `Show-Banner`

### Funciones extraídas a 05-efs.ps1
- `Test-KhoraEncrypted`
- `Protect-KhoraPath`
- `Invoke-SecureDeleteFile`

### Funciones extraídas a 07-git-wip.ps1
- `$script:WIP_BRANCH = $null`
- `Invoke-GitTokenCmd`
- `Push-Verified`
- `Test-UnpushedWork`
- `Ensure-GitignoreHygiene`
- `Init-Wip`
- `Do-AutoWip`

### Funciones extraídas a 08-deps.ps1
- `Ensure-Git`
- `Confirm-GhCliAuth`
- `Ensure-VSCode`
- `Get-CodeCli`
- `Get-CodePaths`
- `Sync-VSCodeConfig`
- `Export-VSCodeConfig`
- `Start-ProactiveDepPrep`
- `Wait-ProactiveDepPrep`
- `Ensure-Python311`
- `Setup-Venv`
- `Ensure-Node`
- `Ensure-Docker`
- `Setup-KhoraWeb`
- `Ensure-VercelCLI`
- `Ensure-RenderCLI`

### Funciones extraídas a 09-chrome.ps1
- `Test-LastPassInstalled`
- `Get-ChromePaths`
- `Open-LoginTabs`
- `Save-ChromeTabsSnapshot`
- `Restore-ChromeTabsSnapshot`
- `Invoke-ChromeIntelligent`
- `Invoke-ChromeCleanup`

### Funciones extraídas a 10-guardian.ps1
- `Start-Guardian`
- `Register-Deadline`
- `Unregister-Deadline`
- `Start-GuardianLoop`
- `Scan-Keyloggers`
- `Get-KnownRemoteTools`
- `Get-ExternalConns`
- `Get-NetSentBytes`
- `Scan-RemoteAccess`
- `Invoke-ExfilWatch`

### Funciones extraídas a 11-cleanup.ps1
- `Invoke-Cleanup`
- `Trigger-Cleanup`

### Funciones extraídas a 12-handoff.ps1
- `Cleanup-OldHandoffFiles`
- `Invoke-HandoffCheck`

### Funciones extraídas a 13-session.ps1
- `Start-Sesion`

### Funciones extraídas a 14-deploy.ps1
- `Get-Hash`
- `Get-VaultMasterKey`
- `Save-Vault`
- `Load-Vault`
- `Sync-Render`
- `Sync-Vercel`
- `$EnvManifest = @( ... )`
- `Init-EnvVault`
- `Invoke-RenderOps`
- `Start-DevServers`
- `Invoke-KhoraOk`
- `Deploy-Vercel`

### Funciones extraídas a 15-main.ps1
- `Run-Main`

## Variables del Legacy

- `$script:CDP_PORT`
- `$script:EFS_ACTIVE`
- `$script:GATE_PATH`
- `$script:GUARD_PID`
- `$script:LOG_FILE`
- `$script:LOG_WIN_PID`
- `$script:NO_SCRIPT_FILE`
- `$script:PrepJobs`
- `$script:PrepJobsStarted`
- `$script:REAL_USER_DETECT_LOG`
- `$script:REAL_USER_ELEVATED_AS`
- `$script:REAL_USER_METHOD`
- `$script:REAL_USER_NAME`
- `$script:REAL_USER_NO_PROFILE`
- `$script:REAL_USER_OVERRIDE`
- `$script:REAL_USER_SAME`
- `$script:REPO_DIR`
- `$script:SES_ACTIVE`
- `$script:TASK_NAME`
- `$script:TokSecure`
- `$script:WIP_BRANCH`
- `$script:WIP_UNPUSHED`
- `$script:__cloneErr`
- `$script:__gitArgs`
- `$script:__gitCode`
- `$script:__gitOut`
- `$script:__lastHandoffHeartbeat`
- `$script:__lastRatCheck`
- `$script:__netBaseTime`
- `$script:__netBaseline`
- `$script:needDraw`

## Reglas
- Un componente = un archivo.
- Los módulos definen funciones y sus propias variables `$script:`.
- Prohibido crear archivos/directorios, lanzar procesos o leer input al cargarse (excepción transitoria: 90-legacy.ps1).
