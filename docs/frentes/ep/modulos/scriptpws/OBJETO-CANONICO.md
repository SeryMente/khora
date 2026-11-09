# ScriptPWS — Objeto Canónico del Módulo

**Identificador:** OEP-MOD-SCRIPTPWS  
**Frente padre:** Entorno Persistente (EP)  
**Objeto padre:** `OEP.md`  
**Versión del objeto:** v1.0.0  
**Estado:** ACTIVO · CANÓNICO PARA ESTE MÓDULO · EN EVOLUCIÓN CONTROLADA  
**Repositorio:** `SeryMente/khora`  
**Ruta canónica:** `docs/frentes/ep/modulos/scriptpws/`

> ScriptPWS conserva y gobierna los scripts PowerShell de preparación y operación del host Windows relacionados con EP, incluyendo la instalación/verificación del toolchain y el arranque de Remote Desktop Commander (RDC). Este módulo complementa OEP; no sustituye el bootstrap ni el núcleo de KHORA.

## 1. Responsabilidad

- Mantener comandos y scripts PowerShell reproducibles para Windows.
- Resolver Node.js y verificar NPM/NPX mediante los entrypoints `npm.cmd` y `npx.cmd`, evitando depender de `npm.ps1` o `npx.ps1` cuando ExecutionPolicy los bloquee.
- Iniciar RDC mediante el paquete `@wonderwhy-er/desktop-commander`.
- Conservar diagnóstico, transcript, portapapeles y acceso directo de recuperación donde el baseline vigente los contemple.
- Mantener una ruta de reversión a una versión anterior conocida como funcional.
- Separar estado confirmado por el operador, estado comprobado por lectura/hash y comportamiento todavía no probado en otros hosts.

## 2. Baseline vigente

<badge>BASELINE-002 · CURRENT</badge>

**Versión:** 2.0  
**Archivo canónico:** `baselines/BASELINE-002.ps1`  
**Puntero vigente:** `BASELINE-INDEX.json` → `currentBaseline = BASELINE-002`  
**SHA-256:** `702E54E8B0E8DB72A7DC57D19CC69AEDE742BE0D7D97953EA1AE273AB7980629`  
**Bytes:** 11587  
**Estado:** confirmado por el operador como ejecutado sin errores; contenido recuperado del host y cotejado por SHA-256.

La versión 2.0 deriva del lanzador oficial de Windows de RDC e incorpora comprobación explícita de `npm.cmd`, visualización de Node/NPM/NPX y una nota operativa al portapapeles. El lanzador verifica el SHA-256 del MSI Node.js descargado desde el manifiesto oficial y comprueba el requisito mínimo de versión de Node.js del paquete.

**Advertencia de reproducibilidad:** el archivo del baseline está fijado por su SHA-256, pero el MSI de Node.js se resuelve desde `latest-v24.x` y el paquete RDC se invoca con `@latest`. Por tanto, el contenido del baseline es identificable; los artefactos externos descargados no están fijados a versiones inmutables.

## 3. Historial retenido

| ID | Versión | Estado | SHA-256 | Procedencia |
|---|---:|---|---|---|
| BASELINE-001 | 1.0 | PREVIOUS_FALLBACK | 2E7393FE26774FD469F1D846E394D733CFD64B1D20ED70D18750B3E65A1C9742 | Comando original aportado por el operador y reportado funcional |
| BASELINE-002 | 2.0 | CURRENT | 702E54E8B0E8DB72A7DC57D19CC69AEDE742BE0D7D97953EA1AE273AB7980629 | Lanzador oficial RDC con comprobaciones NPM/NPX; aceptación del operador |

## 4. Política de retención de tres baselines

- Se conservarán las **tres versiones exitosas más recientes**.
- Una versión solo ingresa al historial retenido después de aceptación del operador, validación sintáctica cuando aplique, SHA-256 y read-back.
- La versión vigente se identifica siempre mediante `BASELINE-INDEX.json.currentBaseline` y el archivo espejo `baselines/BASELINE-CURRENT.ps1`.
- La versión más reciente se etiqueta `CURRENT`; la inmediatamente anterior, `PREVIOUS_FALLBACK`; las demás retenidas, `RETAINED`.
- Al aceptar BASELINE-003, BASELINE-002 pasa a fallback, BASELINE-001 sale de la ventana de tres y BASELINE-003 pasa a CURRENT.
- **Estado actual:** dos versiones aprobadas y retenidas; una plaza disponible. No se fabrica una tercera versión sin una ejecución aceptada.

## 5. Punto de entrada operativo local

En el host donde se materializó el módulo:

- Raíz: `%LOCALAPPDATA%\ScriptPWS\`
- Lanzador vigente: `RDC-Remote.ps1`
- Wrapper con transcript y portapapeles: `START-RDC.ps1`
- Índice: `BASELINE-INDEX.json`
- Baselines retenidos: `Baselines\BASELINE-001.ps1`, `Baselines\BASELINE-002.ps1`
- Copia espejo del vigente: `Baselines\BASELINE-CURRENT.ps1`
- Acceso directo preexistente: `Desktop\Remote Desktop Commander.lnk`

Comando estable de inicio:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:LOCALAPPDATA\ScriptPWS\START-RDC.ps1"
```

Reversión a BASELINE-001:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:LOCALAPPDATA\ScriptPWS\Baselines\BASELINE-001.ps1"
```

El bypass es limitado al proceso. No se debe cambiar la política de ejecución persistente del sistema para ejecutar estos scripts.

## 6. Invariantes de operación y seguridad

1. No sustituir `npm.cmd`/`npx.cmd` por wrappers PowerShell `.ps1` cuando la política local pueda bloquearlos.
2. No crear exclusiones automáticas de Microsoft Defender como parte de la instalación estándar.
3. No cerrar ni reiniciar procesos RDC existentes durante una operación de canonización o actualización documental.
4. No reemplazar el baseline vigente hasta que el candidato haya pasado lectura, hash, parseo y aceptación del operador.
5. Mantener el acceso directo y el wrapper de transcript compatibles con el destino vigente.
6. No declarar conectado RDC solo por la existencia del paquete: verificar el estado del dispositivo y procesos cuando la tarea dependa de conexión activa.
7. Distinguir baseline de script de versión del paquete npm: `@latest` puede resolver a una versión posterior sin que cambie este archivo.

## 7. Evidencia de canonización — 2026-11-09

Host observado: `PC-7`.

- Node.js: `v24.22.2`.
- NPM: `11.19.1`.
- NPX: `11.19.1`.
- `RDC-Remote.ps1`: 11 587 bytes; SHA-256 `702E54E8B0E8DB72A7DC57D19CC69AEDE742BE0D7D97953EA1AE273AB7980629`; parser de Windows PowerShell: cero errores.
- Acceso directo `Remote Desktop Commander.lnk`: existente; conserva logging a `Desktop\log.txt` y copia del transcript al portapapeles al finalizar.
- Dispositivo RDC `PC-7`: ONLINE al momento de la comprobación; procesos de agente/launcher observados.
- Baseline 1.0: 1 601 bytes; SHA-256 `2E7393FE26774FD469F1D846E394D733CFD64B1D20ED70D18750B3E65A1C9742`.
- Las copias locales BASELINE-001, BASELINE-002 y BASELINE-CURRENT fueron leídas de retorno y cotejadas por SHA-256.

La ejecución sin errores de BASELINE-002 se registra como aceptación reportada por el operador; no se atribuye a esta canonización una nueva ejecución del lanzador, para evitar abrir una segunda instancia RDC.

## 8. Pendientes y límites

- La tercera plaza de retención se cubrirá únicamente cuando exista una nueva versión aceptada.
- La compatibilidad en otros hosts Windows aún no se infiere a partir de PC-7.
- El contrato de versionado general del bootstrap OEP continúa separado de esta política específica de ScriptPWS.
- No se ha alterado el código del núcleo de KHORA, el launcher OEP ni la configuración de seguridad de Windows.

## 9. Historial del módulo

### v1.0.0 — 2026-11-09

- Se formaliza ScriptPWS como módulo operativo del frente Entorno Persistente.
- BASELINE-002 se designa vigente y sustituye a BASELINE-001 como comando principal.
- BASELINE-001 queda preservado como fallback.
- Se adopta retención rotativa de un máximo de tres baselines aceptados.
- Se incorpora índice de versión vigente, hashes y read-back.
