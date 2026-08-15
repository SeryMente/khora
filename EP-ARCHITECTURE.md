# KHORA — Entorno Persistente (EP) — DEFINICIÓN ARQUITECTÓNICA CANÓNICA

**ESTADO:** CANÓNICO / VIGENTE / PARTE DEL EP
**VERSIÓN DEL EP:** KHORA v7.1.7
**REGLA PRINCIPAL:** este archivo es memoria estructural del EP y contrato de contexto para agentes humanos y de IA. Debe leerse antes de modificar KHORA.

## 1. Propósito
KHORA implementa un Entorno Persistente agnóstico de máquina: la máquina actual es una instancia temporal; el estado persistente permitido se reconstruye desde GitHub, la llave y los mecanismos del repositorio.

## 2. Modelo completo
GITHUB/CANON -> LLAVE -> ARRANCAR -> GATE -> BARRIL -> MODULOS -> AUTENTICACION TEMPORAL -> CLONE/INSTANCIACION -> %LOCALAPPDATA%\\khora-session\\repo -> VAULT -> VS CODE/CONTEXTO -> TRABAJO -> AUTO-WIP/PUSH-VERIFIED -> HANDOFF/GUARDIAN -> CLEANUP -> COMMIT/PUSH/SHA VERIFICADO -> GITHUB.

## 3. Fuentes de verdad
- GitHub/SeryMente/khora: fuente canónica del código y estado versionado.
- USB física: instanciador transportable.
- Desktop\\USB: sustituto local funcional de la misma llave.
- %LOCALAPPDATA%\\khora-session: instancia temporal.
- secrets/env-vault.enc.json: bóveda canónica cifrada de variables.
- tools/vscode/*: persistencia de configuración VS Code cuando existe.

## 4. Topología
- ROOT_DIR: raíz operacional del GATE/sistema según usuario real y contexto.
- WORK_DIR: %LOCALAPPDATA%\\khora-session.
- REPO_DIR: %LOCALAPPDATA%\\khora-session\\repo.
- ROOT_STATE_DIR: ROOT_DIR\\session-state.
- WORK_STATE_DIR: WORK_DIR\\session-state.
- LOG_DIR: ROOT_DIR\\logs.
- VER_DIR: ROOT_DIR\\versions.
- CFG_FILE: ROOT_DIR\\config.json.
- FLAG_DIR: WORK_DIR\\flags.
- TAB_SNAPSHOT_PATH: ROOT_STATE_DIR\\chrome-tabs.json.

## 5. Entrada y control
ARRANCAR.cmd inicia el GATE mediante ruta relativa a su propia ubicación. khora.ps1 es el punto de entrada lógico; admite modos normales, CleanupOnly y GuardianOnly. khora.barrel.ps1 carga los módulos en orden. Orden actual:
00-config.ps1 -> 01-realuser.ps1 -> 02-logging.ps1 -> 03-hud.ps1 -> 04-ui.ps1 -> 05-efs.ps1 -> 06-token.ps1 -> 07-git-wip.ps1 -> 08-deps.ps1 -> 09-chrome.ps1 -> 10-guardian.ps1 -> 11-cleanup.ps1 -> 12-handoff.ps1 -> 13-session.ps1 -> 14-deploy.ps1 -> 15-main.ps1 -> 90-legacy.ps1

## 6. Componentes y responsabilidades
- 00-config: rutas, configuración y estado global.
- 01-realuser: resolución del usuario real y rutas de perfil.
- 02-logging: logging y sanitización.
- 03-hud: HUD de estado.
- 04-ui: preflight, diagnóstico, interfaz y estado Git.
- 05-efs: cifrado/protección local EFS.
- 06-token: token temporal, protección y snapshots.
- 07-git-wip: Git, higiene, Auto-WIP y Push-Verified.
- 08-deps: Git, GH CLI, VS Code, Python, Node, Docker, web y CLIs externos.
- 09-chrome: perfil KHORA, pestañas, continuidad y cleanup de Chrome.
- 10-guardian: llave, deadline, vigilancia y exfil/remote-access checks.
- 11-cleanup: cierre, persistencia final, push verificado y destrucción segura.
- 12-handoff: transferencia entre procesos/sesiones mediante estado y heartbeat.
- 13-session: creación de sesión, clone, origin limpio, VS Code, Chrome, Guardian y Vault.
- 14-deploy: Vault/deploy/Render/Vercel/servidores de desarrollo.
- 15-main: orquestación de sesión, menú, heartbeat, handoff y Auto-WIP periódico.
- 90-legacy: código histórico/transitorio; no debe crear una segunda arquitectura.
- env-vault.ps1: implementación de la Vault canónica.

## 7. Flujos críticos
### Arranque
Llave -> ARRANCAR -> GATE -> BARRIL -> Run-Main.
### Instanciación
Start-Sesion -> validar GitHub -> obtener token temporal -> clone autenticado -> limpiar origin -> configurar repo -> Init-Wip -> restaurar contexto -> VS Code -> Chrome -> Guardian -> Import-KhoraEnvVault.
### Persistencia
Cambios -> Do-AutoWip -> commit -> push -> comparar SHA local/remoto -> respaldo verificado.
### Handoff
active-session.json + heartbeat + handoff-request/state/ready -> proceso nuevo adopta estado sin arquitectura paralela.
### Cleanup
Export-VSCodeConfig -> Save-ChromeTabsSnapshot -> Do-AutoWip -> commit -> Push-Verified -> si aún existe trabajo no respaldado, proteger/cuarentenar; solo después eliminar REPO_DIR y limpiar residuos.

## 8. Seguridad e invariantes
1. No existe una segunda arquitectura para Desktop\\USB.
2. GitHub es el canon.
3. La llave instancia; no reemplaza el repositorio.
4. Los tokens no deben quedar accidentalmente en origin, logs o archivos no destinados a ello.
5. La Vault es la fuente única de verdad para variables administradas.
6. Push-Verified exige coincidencia verificable entre SHA local y remoto.
7. Cleanup debe proteger trabajo no respaldado.
8. REPO_DIR es temporal y reconstruible.
9. El orden del BARRIL es contractual.
10. Cambios arquitectónicos obligan a actualizar este documento.

## 9. Persistencia de contexto
El EP conserva el contexto mediante mecanismos del repositorio y del estado auxiliar, incluyendo herramientas VS Code y snapshots de Chrome. La persistencia no depende de una instalación concreta de Windows.

## 10. Llave
La llave física y C:\\Users\\<usuario>\\Desktop\\USB son dos formas del mismo instanciador. Guardian utiliza Test-EpLlave para determinar presencia y retirada; el perfil Chrome puede usar khora\\chrome\\data en la llave cuando está disponible.

## 11. Vault
secrets/env-vault.enc.json es la bóveda cifrada canónica. Import-KhoraEnvVault carga variables al proceso. Las variables existentes no deben volver a solicitarse. Las nuevas deben registrarse mediante el mecanismo de Vault usando el portapapeles y Set-KhoraEnvVaultVariable -UseClipboard.

## 12. Contrato para agentes
ANTES de modificar: leer este archivo, CONTRACT.md y los componentes afectados. DURANTE: reutilizar mecanismos existentes y no crear arquitectura paralela. DESPUÉS: determinar si cambió estructura, flujo, estado, persistencia, responsabilidad, dependencia, seguridad o reconstrucción; si cambió, actualizar este archivo en el mismo cambio lógico. Un cambio arquitectónico queda INCOMPLETO mientras esta definición contradiga al código resultante.

## 13. Regla de coherencia
El código determina el comportamiento real; este archivo constituye el modelo estructural canónico. Si existe contradicción, debe investigarse y resolverse. Ningún modelo debe asumir que la definición está vigente sin considerar su versión y huellas.

## 14. Huella de implementación actual

- `scripts/khora/khora.ps1` = `b4f8a9ad06fba492b55440db086e308aaff63ccc20b9db36456c238c4696168b`
- `scripts/khora/khora.barrel.ps1` = `7879c5cb0f45a58e081fa4f035eff91ec6bf7c8191286511cf5c2d941794f783`
- `scripts/khora/env-vault.ps1` = `ba8afb69319ce87730e84ed11f483516fc192267b78a4c0a8f6ccc5f0c186bfb`
- `scripts/khora/llave/ARRANCAR.cmd` = `3bc23bbe9fc0df819f48c00bdee76d29d6da87b1391049a6b93991f5b0aee228`
- `scripts/khora/modules/00-config.ps1` = `b255b3b7e2d06e8a300c5f328ca21e8c2227061661fd234ec47650ad036cab6c`
- `scripts/khora/modules/01-realuser.ps1` = `a21410514f51fa86f917c8bdb0b01c94d09e30919a8d1183d7085284e4e32bed`
- `scripts/khora/modules/02-logging.ps1` = `191487581840babebb518267ba459e6811b1632c520a539897a1d08b774d8227`
- `scripts/khora/modules/03-hud.ps1` = `d3ec2bd99533fd470cbdbde36625a153ec68f232cd8aa5d3b228076507abe3a9`
- `scripts/khora/modules/04-ui.ps1` = `6008706452f9881b8786f0db4aacb188285121ed5b90b98b48ded8f6230b74c0`
- `scripts/khora/modules/05-efs.ps1` = `00099ae9bab7ae126c1c32bd6aaecd2e0ad5ca68fca5d306b349093247239bb2`
- `scripts/khora/modules/06-token.ps1` = `da407cecfd5476d0882606881409e386da9bf0b4a66d3b286bacd5209a592d53`
- `scripts/khora/modules/07-git-wip.ps1` = `f438ae21db94b70756208a672c09950444e18930cd846bd1973ac79a4c5ad4f7`
- `scripts/khora/modules/08-deps.ps1` = `566219912fc07a7667ad41ad1fec121dbba42662e536673ffd8c65a2192951ac`
- `scripts/khora/modules/09-chrome.ps1` = `800f8508e6c8e137e7a6e7c99518fda081f092da432ff51137c8b3178b126ab3`
- `scripts/khora/modules/10-guardian.ps1` = `9b08017a709773edd1d9ef76f09dd1fbf30fe8092372f2c284019359326db167`
- `scripts/khora/modules/11-cleanup.ps1` = `f36a8d3337ce2950f3c255cd246a221b88d539554e7fbf0a8d0af67c4a26c509`
- `scripts/khora/modules/12-handoff.ps1` = `64a8d8c3469c2a367b71f748965c898b7f5b9d3228b62d2d8ed57420aae2acb2`
- `scripts/khora/modules/13-session.ps1` = `fdf4206998b383cf020bdf0a207ba985aa77f3017e658684ee201eed21aeaae0`
- `scripts/khora/modules/14-deploy.ps1` = `f7135a119b38a546ee62b3963c13d99f52f78f1ab607b007bea814371c82d9bc`
- `scripts/khora/modules/15-main.ps1` = `c9fedf17bb1a49381ef9a0a29ae83355332655aa23902c710d09b7d48aeded38`
- `scripts/khora/modules/90-legacy.ps1` = `4a630992f594940c956f121838b46cd966ccf6bdba6bb0ca57d7347c60824ff9`

## 15. Inventario funcional actual
- **scripts/khora/modules/00-config.ps1**
  - Funciones: Initialize-KhoraPaths, Load-Config, Test-KhoraRealUserName
  - Estado local: EFS_ACTIVE, GUARD_PID, LOG_WIN_PID, NO_SCRIPT_FILE, REAL_USER_DETECT_LOG, REAL_USER_ELEVATED_AS, REAL_USER_METHOD, REAL_USER_NAME, REAL_USER_NO_PROFILE, REAL_USER_OVERRIDE, REAL_USER_SAME, SES_ACTIVE, TASK_NAME, TokSecure, WIP_UNPUSHED
- **scripts/khora/modules/01-realuser.ps1**
  - Funciones: Resolve-RealUserPaths
  - Estado local: REAL_USER_DETECT_LOG, REAL_USER_ELEVATED_AS, REAL_USER_METHOD, REAL_USER_NAME, REAL_USER_NO_PROFILE, REAL_USER_OVERRIDE, REAL_USER_SAME
- **scripts/khora/modules/02-logging.ps1**
  - Funciones: Fail, Info, L, Mask-Token, Ok, Step, Warn
  - Estado local: HUD_STEP
- **scripts/khora/modules/03-hud.ps1**
  - Funciones: Init-HUD, Update-HUD
  - Estado local: HUD_FAIL, HUD_OK, HUD_STEP, HUD_WARN
- **scripts/khora/modules/04-ui.ps1**
  - Funciones: Clear-PendingInput, Focus-Window, Get-Cim, Invoke-Preflight, Open-LogWindow, Resolve-Exe, Show-Banner, Show-DiagBundle, Show-Estado, Spin-Job, Test-Cmd, Write-InitHeader
  - Estado local: LOG_WIN_PID
- **scripts/khora/modules/05-efs.ps1**
  - Funciones: Invoke-SecureDeleteFile, Protect-KhoraPath, Test-KhoraEncrypted
  - Estado local:
- **scripts/khora/modules/06-token.ps1**
  - Funciones: Get-PersistedToken, Invoke-WithToken, Protect-KhoraToken, Save-TokenSnapshot, Test-TokenSnapshotValid, Unprotect-KhoraToken, Watch-ClipboardToken
  - Estado local: ClipTokenSeen, SES_START, TokSecure
- **scripts/khora/modules/07-git-wip.ps1**
  - Funciones: Do-AutoWip, Ensure-GitignoreHygiene, Init-Wip, Invoke-GitTokenCmd, Push-Verified, Test-UnpushedWork
  - Estado local: __gitArgs, __gitCode, __gitOut, LASTEXITCODE, WIP_BRANCH, WIP_UNPUSHED
- **scripts/khora/modules/08-deps.ps1**
  - Funciones: Confirm-GhCliAuth, Ensure-Docker, Ensure-Git, Ensure-Node, Ensure-Python311, Ensure-RenderCLI, Ensure-VercelCLI, Ensure-VSCode, Export-VSCodeConfig, Get-CodeCli, Get-CodePaths, Log, Setup-KhoraWeb, Setup-Venv, Start-DepsPreload, Start-ProactiveDepPrep, Sync-VSCodeConfig, Wait-DepsPreload, Wait-ProactiveDepPrep
  - Estado local: DepsPreloadJob, DepsPreloadLog, PrepJobs, PrepJobsStarted
- **scripts/khora/modules/09-chrome.ps1**
  - Funciones: Get-ChromePaths, Get-KhoraChromeProfile, Invoke-ChromeCleanup, Invoke-ChromeIntelligent, Open-LoginTabs, Restore-ChromeTabsSnapshot, Save-ChromeTabsSnapshot, Test-LastPassInstalled
  - Estado local: CHROME_PROFILE
- **scripts/khora/modules/10-guardian.ps1**
  - Funciones: Get-ExternalConns, Get-KnownRemoteTools, Get-NetSentBytes, Invoke-ExfilWatch, Register-Deadline, Scan-Keyloggers, Scan-RemoteAccess, Start-Guardian, Start-GuardianLoop, Test-EpLlave, Unregister-Deadline
  - Estado local: __lastRatCheck, __netBaseline, __netBaseTime, GUARD_PID
- **scripts/khora/modules/11-cleanup.ps1**
  - Funciones: Invoke-Cleanup, Trigger-Cleanup
  - Estado local: SES_ACTIVE, TokSecure
- **scripts/khora/modules/12-handoff.ps1**
  - Funciones: Cleanup-OldHandoffFiles, Invoke-HandoffCheck
  - Estado local: EFS_ACTIVE, GUARD_PID, REAL_USER_ELEVATED_AS, REAL_USER_NAME, REAL_USER_OVERRIDE, SES_ACTIVE, TokSecure, WIP_BRANCH
- **scripts/khora/modules/13-session.ps1**
  - Funciones: Start-Sesion
  - Estado local: __cloneErr, DepsLogPos, EFS_ACTIVE, SES_ACTIVE, TokSecure
- **scripts/khora/modules/14-deploy.ps1**
  - Funciones: Deploy-Vercel, Get-Hash, Get-VaultMasterKey, Init-EnvVault, Invoke-KhoraOk, Invoke-RenderOps, Load-Vault, Save-Vault, Start-DevServers, Sync-Render, Sync-Vercel
  - Estado local:
- **scripts/khora/modules/15-main.ps1**
  - Funciones: Run-Main
  - Estado local: __lastHandoffHeartbeat, needDraw, NO_SCRIPT_FILE, SES_ACTIVE
- **scripts/khora/modules/90-legacy.ps1**
  - Funciones:
  - Estado local:

## 16. Prueba de comprensión
Un modelo que lea solamente este objeto debe poder explicar el EP, ubicar cada componente, reconstruir el ciclo de vida, saber qué estado es canónico frente a temporal, entender la Vault, Git/WIP, VS Code, Chrome, Guardian, Handoff y Cleanup, y saber que este mismo objeto debe actualizarse cuando modifique la arquitectura.
