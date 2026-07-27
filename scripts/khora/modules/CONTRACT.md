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
| 02-logging | logging | PENDIENTE |
| 03-hud | HUD | EXTRAÍDO |
| 04-ui | UI consola | PENDIENTE |
| 05-efs | EFS | PENDIENTE |
| 06-token | token | PENDIENTE |
| 07-git-wip | git/auto-WIP | PENDIENTE |
| 08-deps | dependencias | PENDIENTE |
| 09-chrome | Chrome | PENDIENTE |
| 10-guardian | guardian/seguridad | PENDIENTE |
| 11-cleanup | limpieza nuclear | PENDIENTE |
| 12-handoff | Live Handoff | PENDIENTE |
| 13-session | Start-Sesion | PENDIENTE |
| 14-deploy | tests/deploy | PENDIENTE |
| 15-main | Run-Main | PENDIENTE |
| 90-legacy | Monolito | TRANSITORIO |

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
