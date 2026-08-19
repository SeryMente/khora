# KHORA — Entorno Persistente (EP) — DEFINICIÓN ARQUITECTÓNICA CANÓNICA

**ESTADO:** CANÓNICO / VIGENTE / PARTE DEL EP
**VERSIÓN DEL EP:** KHORA v7.1.19
**REGLA PRINCIPAL:** este archivo es memoria estructural del EP y contrato de contexto para agentes humanos y de IA. Debe leerse antes de modificar KHORA.

## CANONICAL AGENT ENTRY

**SYSTEM / AGENT CONTRACT — KHORA EP**

- **Sistema:** KHORA
- **Dominio:** Entorno Persistente (EP)
- **Arquitectura canónica:** EP-ARCHITECTURE.md
- **Contrato de agentes:** AGENTS.md
- **Orden obligatorio de lectura:** EP-ARCHITECTURE.md -> AGENTS.md -> implementación relevante de la tarea
- **Repositorio público:** el descubrimiento arquitectónico y de código DEBE comenzar por Internet/GitHub sobre el repositorio remoto/canónico.
- **Clon local:** %LOCALAPPDATA%\khora-session\repo es una instancia temporal de trabajo; NO es la fuente primaria para descubrir la arquitectura pública.
- **Precedencia:** para descubrimiento del sistema público, el canon remoto tiene precedencia sobre la instancia local.
- **Declaración obligatoria:** toda salida de trabajo del agente DEBE indicar la versión de arquitectura respetada con el formato EP Architecture respetada: KHORA vX.Y.Z.
- **Divergencia:** si la copia local difiere del canon remoto, el agente DEBE declararlo antes de continuar.
- **Prohibición:** NO redescubrir la arquitectura desde cero ni inventar una arquitectura paralela cuando este objeto y AGENTS.md ya proporcionan el contexto canónico.

EP Architecture respetada: KHORA v7.1.19

## 1. Propósito
KHORA implementa un Entorno Persistente agnóstico de máquina: la máquina actual es una instancia temporal; el estado persistente permitido se reconstruye desde GitHub, la llave y los mecanismos del repositorio.

## 2. Modelo completo
GITHUB/CANON -> LLAVE -> ARRANCAR -> GATE -> BARRIL -> MODULOS -> AUTENTICACION TEMPORAL -> CLONE/INSTANCIACION -> %LOCALAPPDATA%\\khora-session\\repo -> VAULT -> VS CODE/CONTEXTO -> TRABAJO -> AUTO-WIP/PUSH-VERIFIED -> HANDOFF/GUARDIAN -> CLEANUP -> COMMIT/PUSH/SHA VERIFICADO -> GITHUB.

## 3. Fuentes de verdad
- **GitHub/SeryMente/khora: fuente canónica primaria para descubrimiento, arquitectura, código y estado versionado cuando el repositorio es público.** La exploración de agentes debe realizarse primero sobre este origen remoto mediante Internet/GitHub.
- USB física: instanciador transportable.
- Desktop\\USB: sustituto local funcional de la misma llave.
- **%LOCALAPPDATA%\\khora-session: instancia temporal de trabajo y ejecución.** No es fuente primaria para descubrir la arquitectura pública; se utiliza para ejecutar KHORA, reproducir comportamientos, modificar código y validar cambios locales.
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
- 02-logging: logging, sanitización y publicación de EP-LIVE-LOG.
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
- 15-main: orquestación de sesión, menú, heartbeat, handoff, Auto-WIP periódico y publicación manual del estado EP.
- 90-legacy: código histórico/transitorio; no debe crear una segunda arquitectura.
- env-vault.ps1: implementación de la Vault canónica.

## 7. Flujos críticos
### Arranque
Llave -> ARRANCAR -> GATE -> BARRIL -> Run-Main.
### Instanciación

#### Instanciación persistente
La llave física USB sigue siendo el instanciador transportable previsto para una reconstrucción persistente.

#### Instanciación provisional sin USB
Mientras la USB no esté disponible, KHORA DEBE poder reconstruirse desde el repositorio canónico remoto mediante una instancia temporal local. Esta modalidad NO constituye una segunda arquitectura: es una vía alternativa de materialización del mismo EP.

Flujo obligatorio de bootstrap provisional:
Repositorio canónico -> instancia local -> GATE -> BARRIL -> Run-Main -> autenticación GitHub -> autenticación Vercel -> redeploy de producción -> VS Code -> contexto del modelo

La instancia provisional puede residir en Desktop\KHORA-EP\repo como copia operativa de la sesión, pero GitHub sigue siendo la autoridad canónica para arquitectura y código.

#### Bootstrap no interactivo de credenciales
Cuando el operador proporcione un token de GitHub, el bootstrap DEBE autenticar GitHub antes de cualquier clone, fetch, sincronización o publicación. Debe preferirse GH_TOKEN o gh auth login --hostname github.com --git-protocol https --with-token. El flujo --web/device-code queda como fallback cuando no exista un token válido disponible.

Después de autenticar GitHub, KHORA DEBE ejecutar gh auth setup-git, validar gh auth status y comprobar una operación efectiva contra el repositorio canónico.

Inmediatamente después, KHORA DEBE resolver Vercel utilizando VERCEL_TOKEN desde la Vault canónica o el mecanismo seguro de alta de secretos, validar vercel whoami, vincular explícitamente khora-web en el scope victorhugotorresmendez-8991s-projects y ejecutar vercel --prod. El resultado de producción DEBE verificarse.

Orden contractual:
1. Materializar instancia local.
2. Resolver GitHub.
3. Validar Git/API.
4. Resolver Vercel.
5. Validar identidad y proyecto Vercel.
6. Ejecutar redeploy de producción.
7. Verificar producción.
8. Abrir/restaurar contexto de VS Code.
9. Entregar al modelo el contexto canónico y ordenar la revisión de EP-ARCHITECTURE.md.

Si falla GitHub, el bootstrap se detiene. Si falla Vercel o el redeploy, se informa el bloqueo y NO se declara completada la instancia.

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
11. **La validación estática no es suficiente.** Un módulo PowerShell puede pasar `System.Management.Automation.Language.Parser::ParseFile()` y aun así fallar durante la instanciación real del BARRIL.
12. **La cadena real de arranque es una prueba contractual.** Todo cambio relevante en módulos, GATE, ARRANCAR o BARRIL debe validarse mediante `scripts/khora/llave/ARRANCAR.cmd` usando Windows PowerShell 5.1 y comprobando la carga completa en el orden contractual.
13. **Los módulos `.ps1` con Unicode deben conservar una codificación compatible con Windows PowerShell 5.1.** Para módulos que contengan caracteres Unicode se exige UTF-8 con BOM cuando corresponda; UTF-8 sin BOM puede producir reinterpretación ANSI, texto corrupto como `â€”` y errores de parser en cascada.
14. **La codificación forma parte de la corrección del código.** No se debe declarar terminado un cambio únicamente porque su contenido sea correcto; también deben verificarse codificación en disco, parser de PS 5.1, `git diff --check` y arranque real.
15. **La validación debe cubrir la cadena completa de módulos.** La prueba debe abarcar el BARRIL en su orden real, no solamente los módulos editados. Un módulo posterior puede fallar en instanciación aunque todos los módulos anteriores hayan pasado validación aislada.
16. **Los fallos reales de instanciación son regresiones conocidas.** Todo error descubierto durante `ARRANCAR.cmd`, especialmente errores de codificación o parser en cascada, debe documentarse en este objeto canónico y convertirse en una regla preventiva para futuras modificaciones.
17. **Los cambios preexistentes deben aislarse durante la validación.** Un `git diff --check` global puede fallar por trabajo ajeno a la modificación actual; deben distinguirse los archivos objetivo y sus cambios de los cambios preexistentes, sin sobrescribir ni restaurar trabajo no relacionado.
18. **La identidad de elevación no define el usuario de trabajo.** Si KHORA se ejecuta con PowerShell elevado por una cuenta distinta del usuario interactivo, el EP DEBE resolver primero el usuario de la sesión gráfica activa y usar ese usuario para USERPROFILE, LOCALAPPDATA, APPDATA, configuración y herramientas de usuario. El usuario que eleva el proceso no debe convertirse silenciosamente en el usuario operativo.
19. **La sesión console activa tiene precedencia sobre la identidad del proceso.** Para resolver el usuario de trabajo, KHORA DEBE intentar primero identificar la sesión gráfica activa mediante query session/qwinsta y obtener su usuario; xplorer.exe y otros métodos de propietario de proceso son mecanismos secundarios de verificación/fallback. Nunca se debe inferir el perfil operativo únicamente desde $env:USERNAME, $env:USERPROFILE o la cuenta que elevó PowerShell.
20. **La redirección de identidad también debe reconstruir el entorno de comandos.** Cuando el usuario operativo difiere de la cuenta que elevó PowerShell, KHORA DEBE reconstruir $env:Path para priorizar las rutas de herramientas del usuario operativo y no reutilizar silenciosamente ejecutables del perfil administrativo. Corregir USERPROFILE sin corregir PATH se considera incompleto.
21. **Los alias de WindowsApps no constituyen una instalación válida de Python.** Ensure-Python311 DEBE rechazar python.exe localizado bajo AppData\Local\Microsoft\WindowsApps y DEBE validar un intérprete real de Python 3.11+ dentro del perfil operativo antes de continuar. Si no existe, la instalación debe dirigirse explícitamente al perfil operativo y verificarse antes de continuar.
22. **Los alias de WindowsApps no constituyen una instalación válida de Python.** `Ensure-Python311` DEBE rechazar `python.exe` localizado bajo `AppData\Local\Microsoft\WindowsApps` y DEBE validar un intérprete real de Python 3.11+ dentro del perfil operativo antes de continuar. El ejecutable localizado por ruta directa en `LOCALAPPDATA\Programs\Python\Python311\python.exe` tiene precedencia sobre cualquier alias del sistema.

23. **Cuando winget no sea confiable, la instalación de Python no debe bloquear el arranque.** Ensure-Python311 DEBE usar el instalador oficial de Python 3.11.9 en modo usuario como fallback determinista, validar su firma Authenticode y verificar el ejecutable real en LOCALAPPDATA\Programs\Python\Python311\python.exe antes de continuar.

## 9. Persistencia de contexto

### Frontera entre persistencia operacional local y canon público

KHORA mantiene artefactos operativos locales junto al entorno ejecutable, incluyendo ROOT_DIR\logs\, ROOT_DIR\versions\ y ROOT_DIR\config.json. Estos artefactos son **estado de ejecución de la instancia** y no son automáticamente parte del canon público de GitHub.

- logs\ contiene observabilidad de ejecución y puede incluir información contextual que no debe publicarse sin sanitización.
- config.json contiene configuración local y puede contener identidad o preferencias privadas; **no debe publicarse automáticamente**.
- ersions\ contiene archivado local de versiones ejecutadas; no sustituye al código canónico del repositorio y no debe crear una segunda arquitectura pública ni copias públicas paralelas del entrypoint.
- El repositorio público contiene solamente artefactos explícitamente destinados al canon. La presencia física de un archivo bajo ROOT_DIR no implica que deba versionarse.
- Los artefactos runtime locales deben permanecer fuera del staging Git salvo una decisión explícita de canonización para ese artefacto concreto.
- Esta frontera permite que el EP conserve estado operacional local sin convertir accidentalmente información de sesión, identidad, logs o copias de ejecución en contenido público.

El EP conserva el contexto mediante mecanismos del repositorio y del estado auxiliar, incluyendo herramientas VS Code y snapshots de Chrome. La persistencia no depende de una instalación concreta de Windows.

## 10. Llave
La llave física y C:\\Users\\<usuario>\\Desktop\\USB son dos formas del mismo instanciador. Guardian utiliza Test-EpLlave para determinar presencia y retirada; el perfil Chrome puede usar khora\\chrome\\data en la llave cuando está disponible.

## 11. Vault
secrets/env-vault.enc.json es la bóveda cifrada canónica. Import-KhoraEnvVault carga variables al proceso. Las variables existentes no deben volver a solicitarse. Las nuevas deben registrarse mediante el mecanismo de Vault usando el portapapeles y Set-KhoraEnvVaultVariable -UseClipboard.

## 12. Contrato para agentes

### Directiva de descubrimiento para agentes

**OBLIGATORIO — ORDEN DE DESCUBRIMIENTO Y CONTEXTO PARA AGENTES**

1. **Si el repositorio canónico es público, DEBES realizar primero la exploración arquitectónica y de código mediante Internet/GitHub sobre el repositorio canónico.**

2. **NO uses el clon local de la sesión como fuente primaria para descubrir, reconstruir o inferir la arquitectura del sistema público.** El clon local es una instancia temporal de trabajo, no la fuente canónica de descubrimiento.

3. Usa el clon local (%LOCALAPPDATA%\\khora-session\\repo) para ejecutar KHORA, reproducir comportamientos, modificar código, validar cambios y trabajar sobre el estado de la sesión.

4. Para comprender el sistema público, consulta primero el repositorio remoto/canónico y sus artefactos publicados, incluyendo EP-ARCHITECTURE.md, AGENTS.md, código versionado, historial y archivos relevantes.

5. **DEBES declarar en tu salida la versión de EP-ARCHITECTURE.md que estás respetando.** Usa explícitamente el formato: EP Architecture respetada: KHORA vX.Y.Z.

6. Si el EP-ARCHITECTURE.md remoto y la copia local difieren, **DEBES señalar la discrepancia antes de continuar** y tratar la versión remota/canónica como autoridad para el descubrimiento del sistema público.

7. **La arquitectura canónica remota tiene precedencia para descubrimiento.** Solo una tarea expresamente orientada a investigar una instancia local, cambios no publicados o una regresión local autoriza al agente a usar el clon local como objeto primario de investigación; incluso entonces debe declarar esa divergencia respecto del canon.

8. **NO redescubras la arquitectura desde cero** cuando EP-ARCHITECTURE.md y AGENTS.md ya proporcionen el contexto canónico. Debes adoptarlos antes de inspeccionar la implementación específica de la tarea.

9. **El agente DEBE obedecer estas directivas como restricciones operativas del EP**, no tratarlas como recomendaciones opcionales.


ANTES de modificar: leer este archivo, CONTRACT.md y los componentes afectados. El cumplimiento de descubrimiento remoto/local y la declaración de versión están definidos obligatoriamente en CANONICAL AGENT ENTRY y deben obedecerse. DURANTE: reutilizar mecanismos existentes y no crear arquitectura paralela. DESPUÉS: determinar si cambió estructura, flujo, estado, persistencia, responsabilidad, dependencia, seguridad o reconstrucción; si cambió, actualizar este archivo en el mismo cambio lógico. Un cambio arquitectónico queda INCOMPLETO mientras esta definición contradiga al código resultante.

## 13. Regla de coherencia
El código determina el comportamiento real; este archivo constituye el modelo estructural canónico. Si existe contradicción, debe investigarse y resolverse. Ningún modelo debe asumir que la definición está vigente sin considerar su versión y huellas.

## 14. Huella de implementación actual

- `scripts/khora/khora.ps1` = `b4f8a9ad06fba492b55440db086e308aaff63ccc20b9db36456c238c4696168b`
- `scripts/khora/khora.barrel.ps1` = `7879c5cb0f45a58e081fa4f035eff91ec6bf7c8191286511cf5c2d941794f783`
- `scripts/khora/env-vault.ps1` = `ba8afb69319ce87730e84ed11f483516fc192267b78a4c0a8f6ccc5f0c186bfb`
- `scripts/khora/llave/ARRANCAR.cmd` = `9b058ed81809137d9124ef921c5e2850f7e9e3f56cd92c5f2e1125101b106129`
- `scripts/khora/modules/00-config.ps1` = `eff5a6458862593131424f3626693b84411185d71e4a77f12aedad38cc2e1c46`
- `scripts/khora/modules/01-realuser.ps1` = `a21410514f51fa86f917c8bdb0b01c94d09e30919a8d1183d7085284e4e32bed`
- `scripts/khora/modules/02-logging.ps1` = `14c4fb3b05c90575e9aed8287c5937005979334a7c71a269636dc38ceccd91dc`
- `scripts/khora/modules/03-hud.ps1` = `d3ec2bd99533fd470cbdbde36625a153ec68f232cd8aa5d3b228076507abe3a9`
- `scripts/khora/modules/04-ui.ps1` = `2d022a17d06a14cec14b2d0820e446f5a52e49adacbd6280112a77d4f1b784a9`
- `scripts/khora/modules/05-efs.ps1` = `00099ae9bab7ae126c1c32bd6aaecd2e0ad5ca68fca5d306b349093247239bb2`
- `scripts/khora/modules/06-token.ps1` = `da407cecfd5476d0882606881409e386da9bf0b4a66d3b286bacd5209a592d53`
- `scripts/khora/modules/07-git-wip.ps1` = `f438ae21db94b70756208a672c09950444e18930cd846bd1973ac79a4c5ad4f7`
- `scripts/khora/modules/08-deps.ps1` = `566219912fc07a7667ad41ad1fec121dbba42662e536673ffd8c65a2192951ac`
- `scripts/khora/modules/09-chrome.ps1` = `4f826eece04ae75901a552b0be846776a2d559576c326f942d6900c2a6c9b302`
- `scripts/khora/modules/10-guardian.ps1` = `994e1ffae2a3b30fa833d4180024b668543a09ad5f8db94d18e1f0844da0fa54`
- `scripts/khora/modules/11-cleanup.ps1` = `5c4a6a6721c988e45636462135566cb10029d38b127510873e06429614c3e9cd`
- `scripts/khora/modules/12-handoff.ps1` = `64a8d8c3469c2a367b71f748965c898b7f5b9d3228b62d2d8ed57420aae2acb2`
- `scripts/khora/modules/13-session.ps1` = `d95e41bb2b5987ea2aa4d8914247dd1ade368eb292254ed906e7061312b92909`
- `scripts/khora/modules/14-deploy.ps1` = `c7aaec9c454aac4c68e9876764cedbefb37cbd651d02058bf2f0a8c8920f9038`
- `scripts/khora/modules/15-main.ps1` = `7d3b557933701dbef251ee1862b9b5e4afa4a7322ae3918ed409b5f78809b8d6`
- `scripts/khora/modules/90-legacy.ps1` = `4a630992f594940c956f121838b46cd966ccf6bdba6bb0ca57d7347c60824ff9`

## 15. Inventario funcional actual
- **scripts/khora/modules/00-config.ps1**
  - Funciones: Initialize-KhoraPaths, Load-Config, Test-KhoraRealUserName
  - Estado local: EFS_ACTIVE, GUARD_PID, LOG_WIN_PID, NO_SCRIPT_FILE, REAL_USER_DETECT_LOG, REAL_USER_ELEVATED_AS, REAL_USER_METHOD, REAL_USER_NAME, REAL_USER_NO_PROFILE, REAL_USER_OVERRIDE, REAL_USER_SAME, SES_ACTIVE, TASK_NAME, TokSecure, WIP_UNPUSHED
- **scripts/khora/modules/01-realuser.ps1**
  - Funciones: Resolve-RealUserPaths
  - Estado local: REAL_USER_DETECT_LOG, REAL_USER_ELEVATED_AS, REAL_USER_METHOD, REAL_USER_NAME, REAL_USER_NO_PROFILE, REAL_USER_OVERRIDE, REAL_USER_SAME
- **scripts/khora/modules/02-logging.ps1**
  - Funciones: Fail, Info, L, Mask-Token, Ok, Step, Sync-EpLiveLog, Warn
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
## Bóveda canónica de variables de entorno

La bóveda de variables de entorno es un componente arquitectónico central y canónico de KHORA. Su objetivo es que cada variable de entorno se introduzca una sola vez y quede disponible como fuente única para cualquier proveedor o servicio que la requiera.

**Fuente canónica:** `secrets/env-vault.enc.json`, gestionada mediante `scripts/khora/env-vault.ps1`.

**Alta de variables:** las variables nuevas DEBEN incorporarse mediante `Set-KhoraEnvVaultVariable`. La entrada preferida es `-UseClipboard`, copiando previamente el valor al portapapeles y evitando revelar visualmente el secreto; como alternativa válida, puede utilizarse una entrada segura con `Read-Host -AsSecureString`. El valor no debe solicitarse mediante texto plano visible en terminal, scripts o archivos temporales.

**Unicidad:** si una variable ya existe en la bóveda, `Set-KhoraEnvVaultVariable` debe omitir el alta salvo una rotación explícita mediante `-Rotate`. La introducción duplicada de una misma variable en proveedores no constituye una nueva fuente: todos los destinos reciben el valor desde la bóveda.

**Consumo:** `Import-KhoraEnvVault` descifra la bóveda y carga sus variables en el entorno de proceso. Los módulos de aprovisionamiento, actualmente `14-deploy.ps1`, DEBEN consumir la bóveda canónica para proporcionar variables a Vercel, Render, AuraDB/Neo4j u otros proveedores futuros.

**Regla de autoridad:** Vercel, Render, AuraDB/Neo4j y cualquier otro proveedor son destinos, no fuentes canónicas. KHORA NO DEBE recuperar variables desde esos proveedores para reconstruir o completar la bóveda. Si una variable requerida no existe en la bóveda, debe darse de alta en la bóveda utilizando el flujo seguro establecido y posteriormente sincronizarse hacia los proveedores correspondientes.

**Persistencia y seguridad:** los valores de la bóveda deben permanecer cifrados en `secrets/env-vault.enc.json`; los secretos no deben imprimirse, registrarse en logs ni persistirse en archivos temporales como mecanismo de tránsito normal. La bóveda constituye la única fuente central desde la que se aprovisionan las variables de entorno a los proveedores.

**Implementación canónica vigente:** `env-vault.ps1` contiene `KhoraVault-Load`, `KhoraVault-Save`, `KhoraVault-Encrypt`, `KhoraVault-Decrypt`, `Set-KhoraEnvVaultVariable` e `Import-KhoraEnvVault`. `14-deploy.ps1` consume este mecanismo y no mantiene una implementación paralela de Vault ni recupera secretos desde Vercel/Render.
## Autenticación GitHub y credenciales de Git

La autenticación GitHub es una dependencia operativa obligatoria del arranque de KHORA. Antes de cualquier `clone`, `fetch`, WIP, `push` o sincronización con el remoto canónico, KHORA DEBE disponer de autenticación Git funcional.

**Mecanismo canónico en Windows:** GitHub CLI (`gh`) gestionado por `08-deps.ps1`. Si `gh` no existe, KHORA DEBE intentar instalarlo por usuario mediante `winget`, localizar el ejecutable aun cuando el `PATH` del shell actual todavía no se haya actualizado y ejecutar `gh auth setup-git` tras autenticar.

**Helper de GitHub:** `gh auth setup-git` es la autoridad para configurar el helper específico de `github.com`. KHORA NO DEBE imponer `credential.helper=gh` como configuración global para sustituir este mecanismo.

**Autenticación inicial:** `Confirm-GhCliAuth` DEBE comprobar `gh auth status`. Si no existe una sesión válida y existe un token suministrado por el operador o mediante la Vault, DEBE utilizar primero autenticación headless mediante `GH_TOKEN` o `gh auth login --hostname github.com --git-protocol https --with-token`. SOLO sin token válido podrá recurrirse a `--web`/device-code. Después DEBE ejecutar `gh auth setup-git`.

**Regla de bloqueo:** si GitHub no queda autenticado, la sesión DEBE detenerse antes de clonar o publicar. No se permite continuar hasta descubrir un `401`, `403`, `Invalid username or token` o `Permission denied`.

**Credencial API:** Git y API son mecanismos desacoplados. Tras autenticar `gh`, KHORA DEBE poder obtener la credencial API necesaria mediante `gh auth token`, mantenerla únicamente en memoria mediante `SecureString` y validarla contra el repositorio canónico. El usuario NO debe volver a introducir manualmente el PAT durante el arranque de una máquina ya autenticada.

**Regla preventiva:** la capacidad efectiva de `git fetch` y el acceso API mediante la credencial derivada de `gh` forman parte del preflight. `gh auth status` por sí solo no sustituye la prueba efectiva de Git/API.

## Autenticación Vercel y redeploy de producción

La autenticación Vercel forma parte del bootstrap de la instancia provisional cuando el objetivo incluye recuperar y publicar producción.

**Modo headless:** KHORA DEBE utilizar `VERCEL_TOKEN` como credencial de automatización. El secreto DEBE proceder de la Vault canónica o del flujo seguro de alta y no debe escribirse en archivos del repositorio, logs ni argumentos persistentes.

**Validación:** después de cargar `VERCEL_TOKEN`, KHORA DEBE comprobar `vercel whoami`.

**Proyecto canónico:** el deployment de producción DEBE apuntar explícitamente al proyecto `khora-web` dentro del scope `victorhugotorresmendez-8991s-projects`.

**Redeploy:** una vez autenticada Vercel y vinculado el proyecto, KHORA DEBE ejecutar `vercel --prod` y verificar la URL/estado resultante antes de declarar completa la instancia.

**Orden:** GitHub validado -> Vercel validado -> khora-web vinculado -> redeploy producción -> verificación.