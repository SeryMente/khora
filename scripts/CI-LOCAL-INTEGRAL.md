# CI local integral — KHORA / Harmonia

## Objetivo

Ejecutar en la máquina Windows de desarrollo las verificaciones del repositorio sin GitHub Actions, runners hospedados, Docker, Docker Desktop, WSL ni cargos de ejecución de GitHub. El CI local no consume minutos de Actions ni depende de la facturación de GitHub.

El runner produce evidencia local reproducible. No publica estados de GitHub Checks ni elimina el bloqueo de facturación de Actions para ejecuciones hospedadas.

## Requisitos fijados

- Windows 10/11 x64 y PowerShell 5.1 o posterior.
- Python 3.11.
- Node.js 22.23.5 para contratos y pruebas unitarias.
- Node.js 24.22.3 para build y Playwright.
- Eclipse Temurin JRE 21.0.13+9 x64.
- Neo4j Community 5.26.33.
- Playwright Chromium, headless shell y ffmpeg.

Los toolchains, entornos virtuales, navegadores y dependencias se almacenan fuera del repositorio en %LOCALAPPDATA%\KHORA-CI. Los archivos JRE/Neo4j descargados se validan por SHA-256 antes de extraerse.

## Primera preparación del equipo

Desde la raíz del repositorio:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\CI-LOCAL-INTEGRAL.ps1 -InstallDependencies

La preparación requiere conexión a los distribuidores oficiales solo para los componentes que no estén presentes. Instala runtimes y dependencias en el espacio local del usuario; no instala servicios de Windows ni altera la configuración global. khora-web\node_modules se reutiliza desde una junction únicamente cuando el hash de package-lock.json coincide. Si no coincide, se retira solamente la junction y no se borra su destino.

## Ejecución habitual sin red

Después de la primera preparación:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\CI-LOCAL-INTEGRAL.ps1 -Offline

-Offline no descarga paquetes, runtimes ni navegadores. Verifica que las dependencias locales estén presentes y termina con error si falta algún componente requerido; no produce un falso PASS.

Para permitir reparación/descarga automática cuando falta un componente:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\CI-LOCAL-INTEGRAL.ps1

No combinar -Offline con -InstallDependencies.

## Cobertura

1. Preflight de repositorio y runtimes.
2. Contratos y pruebas locales de Harmonia.
3. Ruff y Pyright del kernel.
4. Neo4j Community real, temporal y autenticado: puerto dinámico en loopback, configuración y datos aislados por ejecución, inicialización del esquema y pytest completo del kernel. No usa Docker ni datos persistentes del desarrollador. Los Ã­ndices FAISS, manifiestos Leiden y cualquier escritura relativa del kernel se redirigen al directorio efÃ­mero de esa ejecuciÃ³n; los tests arrancan desde ese directorio con configuraciÃ³n y rutas del proyecto absolutas.
5. Suite de API.
6. Typecheck, UI Review, contrato de navegación y suite unitaria web.
7. Build de producción de Next.js.
8. Verificación/provisión de Chromium.
9. Playwright E2E completo, smoke de Chromium y subconjunto de UI Quality.

Playwright obtiene un puerto dinámico y, en modo CI, no reutiliza servidores locales de otras ejecuciones. La URI y las credenciales temporales de Neo4j se restauran tras su etapa. La limpieza de la base temporal ocurre solamente después de verificar que el proceso liberó el puerto.

## Evidencias por ejecución

Cada corrida crea %LOCALAPPDATA%\KHORA-CI\runs\<run-id>\ con:

- ci-report.json: resultado, branch, commit, estado del worktree y resultados por etapa.
- ci-report.md: resumen humano con estado, duración y motivo.
- logs\: salida de cada etapa.
- neo4j\: logs del servicio local si la ejecución falla antes de limpiarlo.
- session-transcript.log: transcript alternativo cuando Desktop\log.txt está bloqueado.

El proceso imprime el SHA-256 del JSON. Cualquier FAIL o BLOCKED hace que el proceso termine con código distinto de cero. Los skips y xfails definidos por cada suite quedan visibles en los logs y no se cuentan como aprobaciones.

Para conservar datos temporales de Neo4j cuando se diagnostica un fallo:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\CI-LOCAL-INTEGRAL.ps1 -Offline -KeepArtifacts

## Límites explícitos

- El runner está diseñado y validado para Windows x64, no es multiplataforma.
- La primera preparación necesita conectividad; la ejecución -Offline posterior no debe necesitar red.
- No sustituye aceptación manual que dependa de una sesión Chrome real, hardware/dispositivos o credenciales/servicios externos no simulables.
- El resultado local no crea un check verde en GitHub. Para publicar un estado en un PR se necesita un mecanismo adicional autorizado, por ejemplo un runner self-hosted registrado en el repositorio. Este procedimiento no registra ni deja corriendo un runner permanente.
