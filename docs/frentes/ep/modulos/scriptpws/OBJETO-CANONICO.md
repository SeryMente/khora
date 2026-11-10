# ScriptPWS — Objeto canónico del módulo

**Identificador:** `OEP-MOD-SCRIPTPWS`  
**Frente padre:** Entorno Persistente (EP)  
**Objeto padre:** `OEP.md`  
**Versión del objeto:** v1.1.0  
**Estado:** ACTIVO · CANÓNICO PARA ESTE MÓDULO · EN EVOLUCIÓN CONTROLADA  
**Repositorio:** `SeryMente/khora` · rama `main`  
**Ruta canónica:** `docs/frentes/ep/modulos/scriptpws/`

> ScriptPWS es un módulo funcional subordinado al frente Entorno Persistente (EP), no un frente independiente. Esta carpeta contiene su objeto canónico, las reglas operativas, el índice de baselines y los artefactos PowerShell que gobierna.

## 1. Ubicación y relación con el workspace

La ubicación canónica remota es `SeryMente/khora/docs/frentes/ep/modulos/scriptpws/`.

Cuando KHORA se selecciona en una sesión de EP, su repositorio se materializa dentro del workspace cifrado como:

`<Escritorio>\EP\khora\docs\frentes\ep\modulos\scriptpws\`

`<Escritorio>\EP` es una junction NTFS al directorio de trabajo alojado dentro del VHDX cifrado de esa sesión; no es una segunda copia persistente. La ruta local puede existir solo mientras la sesión OEP está materializada. La fuente de continuidad del módulo es la ruta canónica de GitHub.

La clasificación como módulo subordinado coincide con el directorio taxonómico vigente de Ser y Mente, DUG v388 · NX-388m · ART-031 (leído en `SeryMente/metodologia/main`).

## 2. Responsabilidad

ScriptPWS gobierna la preparación y operación del host Windows relacionada con Remote Desktop Commander (RDC), incluyendo:

- Instalación adaptativa de Node.js 24 cuando falta.
- Disponibilidad y verificación de Node.js, NPM y NPX.
- Uso explícito de `npm.cmd` y `npx.cmd` para evitar que PowerShell seleccione `.ps1` bloqueados por ExecutionPolicy.
- Descarga, verificación estructural y preparación del lanzador oficial de RDC.
- Parser validation del lanzador modificado.
- Acceso directo de Windows, transcript de sesión, diagnóstico y portapapeles.
- Conservación de baselines, reversión e historial de aceptación.

ScriptPWS no reemplaza el bootstrap de KHORA/OEP, el workspace cifrado ni el motor de continuidad del frente EP.

## 3. Separación de artefactos

No confundir los siguientes objetos:

1. **Bootstrap completo:** comando PowerShell que instala o detecta Node.js, prepara los artefactos locales, valida el lanzador y arranca RDC. Es el baseline que el operador ejecuta y acepta.
2. **Lanzador runtime generado:** `RDC-Remote.ps1`, descargado desde el lanzador oficial de RDC y modificado por el bootstrap para agregar verificaciones NPM/NPX y diagnóstico. No es el bootstrap completo ni cuenta como baseline independiente.
3. **Acceso directo:** `Remote Desktop Commander.lnk`, que abre PowerShell y ejecuta el lanzador runtime.
4. **Baseline espejo:** `BASELINE-CURRENT.ps1`, copia byte-a-byte del bootstrap vigente; es un puntero de conveniencia y no cuenta como una versión adicional.

Durante la reconciliación de 2026-11-10, el contenido que antes ocupaba `baselines/BASELINE-002.ps1` fue preservado sin modificación en `artifacts/RDC-Remote.generated-from-BASELINE-002.ps1`. Ese archivo es el lanzador runtime generado, no el comando bootstrap. La lectura de retorno del artefacto preservado coincidió exactamente con el contenido de origen.

## 4. Baseline vigente

<badge>BASELINE-002 · CURRENT</badge>

- **Versión:** 2.0
- **Artefacto:** `baselines/BASELINE-002.ps1`
- **Espejo vigente:** `baselines/BASELINE-CURRENT.ps1`
- **SHA-256 del bootstrap:** `5CB48CDC4E3CC8E7F8FEDD42700C5173B0A8B469C55EED8D0581D07BB66EDF46`
- **Bytes UTF-8:** 6856
- **Estatus funcional:** el operador confirmó que el comando V2 completo se ejecutó sin errores.
- **Contenido:** el archivo contiene el unicomando completo, de una sola línea, no un wrapper ni una ruta a otro script.

El bootstrap V2:

1. Limpia la consola y limita ExecutionPolicy Bypass al proceso actual.
2. Descubre el Escritorio real del usuario y abre transcript en `Desktop\log.txt`.
3. Crea `%LOCALAPPDATA%\ScriptPWS`.
4. Conserva la línea V1 en `RDC-Baseline-1.0.ps1`, hace read-back y calcula SHA-256.
5. Descarga el lanzador oficial `remote-windows.ps1`.
6. Verifica marcadores estructurales del lanzador antes de modificarlo.
7. Inserta comprobaciones explícitas de `npm.cmd`, Node.js y `npx.cmd`, muestra sus versiones y prepara una nota de diagnóstico en el portapapeles.
8. Valida la sintaxis PowerShell del lanzador resultante.
9. Crea el acceso directo `Remote Desktop Commander.lnk`.
10. Ejecuta el lanzador en la misma sesión; al terminar, cierra el transcript y copia el registro al portapapeles.

El lanzador oficial gestiona la detección/instalación de Node.js 24, verifica el MSI mediante el manifiesto `SHASUMS256.txt` y comprueba la disponibilidad de NPX antes de iniciar RDC. El bootstrap usa el paquete `@wonderwhy-er/desktop-commander@latest`.

## 5. Fallback y retención

| ID | Versión | Estado | Archivo |
|---|---:|---|---|
| BASELINE-001 | 1.0 | PREVIOUS_FALLBACK | `baselines/BASELINE-001.ps1` |
| BASELINE-002 | 2.0 | CURRENT | `baselines/BASELINE-002.ps1` |
| BASELINE-CURRENT | espejo | puntero | `baselines/BASELINE-CURRENT.ps1` |

Se retienen hasta tres versiones exitosas aceptadas por el operador. Actualmente hay dos versiones únicas aceptadas; la tercera plaza está reservada para BASELINE-003. El espejo `BASELINE-CURRENT.ps1` no se cuenta como una tercera versión.

Una versión candidata no reemplaza CURRENT hasta que el operador la ejecute y acepte. Antes de promoverla se exige:
- Validación sintáctica cuando aplique.
- SHA-256 del archivo.
- Read-back literal.
- Comprobación de que el espejo coincide exactamente.
- Actualización del índice y del objeto canónico en el mismo ciclo.

La versión más reciente se identifica mediante `BASELINE-INDEX.json.currentBaseline`; no se infiere por fecha, nombre de archivo ni memoria conversacional.

## 6. Artefactos locales producidos por V2

| Ruta | Función |
|---|---|
| `%LOCALAPPDATA%\ScriptPWS\RDC-Baseline-1.0.ps1` | Copia local de V1 |
| `%LOCALAPPDATA%\ScriptPWS\RDC-Remote.ps1` | Lanzador runtime generado |
| `<Escritorio>\Remote Desktop Commander.lnk` | Acceso directo de arranque |
| `<Escritorio>\log.txt` | Transcript de la ejecución |

**No se crea `START-RDC.ps1` en el bootstrap V2 aceptado.** README y OEP no deben indicar ese archivo como punto de entrada. Tampoco se debe sustituir el comando bootstrap por un wrapper o por el acceso directo.

El artefacto runtime previo queda preservado en el repositorio como:

`artifacts/RDC-Remote.generated-from-BASELINE-002.ps1`

SHA-256 calculado sobre el contenido conservado: `A4EAD4B96E39369E2357E447C2838DFB3788CA2CB8BCDFEF37C9776E20C0BADF` · 11585 bytes UTF-8. Este artefacto no es una versión de bootstrap.

## 7. Requisito de autenticación nueva

**Requisito aceptado por el operador; implementación pendiente de prueba.**

RDC no debe asumir que existe una sesión autenticada previa ni reutilizar silenciosamente la cuenta equivocada. Cada arranque debe permitir un flujo de autenticación nuevo para que el operador pueda elegir la cuenta Google correcta, por ejemplo `the.willfreeman`.

La opción oficial `--no-persist-session` aparece en la documentación y el código de Desktop Commander en el commit upstream `9d5afdf5da6bdee4d4c52caf9a78128235a1b0d4`. La opción evita reutilizar o guardar la autenticación de RDC para esa ejecución. No borra las cookies de Google del navegador ni selecciona por sí sola una cuenta Gmail; el operador debe escoger «Usar otra cuenta» cuando el navegador muestre una identidad distinta.

**Estado:** el baseline vigente V2.0 no contiene esa opción. La integración completa se considera candidata a BASELINE-003 · v2.1 y no pasa a CURRENT hasta que el operador la ejecute y confirme su funcionamiento.

## 8. Reglas operativas del módulo

1. Cuando el operador solicite un comando o script, entregar siempre el artefacto completo y ejecutable; nunca fragmentos, bloques parciales ni instrucciones para reemplazar una sección.
2. Separar preservar de mejorar. Preservar significa mantener literalmente el baseline aceptado; mejorar significa crear un candidato separado.
3. No modificar ni sustituir el baseline vigente para experimentar. Mantener el fallback anterior.
4. No declarar funcional una versión por parseo, descarga o publicación. La aceptación funcional requiere confirmación del operador.
5. No declarar archivo local, commit, SHA ni read-back si esas operaciones no se ejecutaron.
6. Usar `npm.cmd` y `npx.cmd`; no depender de `npm.ps1`/ `npx.ps1` si la política del host los bloquea.
7. El bypass de ExecutionPolicy queda limitado al proceso. No cambiar la política permanente de Windows.
8. No crear exclusiones automáticas de Microsoft Defender.
9. No revocar credenciales, cerrar procesos RDC existentes ni cambiar cuentas sin instrucción expresa.
10. El acceso directo y el lanzador runtime no sustituyen al bootstrap completo cuando se pide el comando vigente.

## 9. Limitaciones de reproducibilidad

El contenido del bootstrap se identifica por SHA-256, pero algunos recursos externos no están fijados:
- El manifiesto MSI usa `latest-v24.x`; la versión concreta puede avanzar.
- El paquete RDC se invoca con `@latest`.
- El lanzador oficial se descarga desde la rama `main` del proveedor; el bootstrap exige marcadores estructurales para fallar cerrado si cambia el punto de inserción, pero no fija un commit upstream.

Por lo tanto, SHA del bootstrap identifica el comando, no todos los binarios o scripts externos que se descargarán en futuras ejecuciones.

## 10. Ejecución desde el repositorio

Desde la raíz materializada del repositorio KHORA:

```powershell
& ".\docs\frentes\ep\modulos\scriptpws\baselines\BASELINE-CURRENT.ps1"
```

El archivo contiene el bootstrap completo. Cuando el operador solicite «comando vigente» o «último comando que funcionó», se debe entregar el contenido íntegro de `BASELINE-CURRENT.ps1`/ `BASELINE-002.ps1`, no este comando de invocación ni un wrapper.

## 11. Evidencia y estado

- Aceptación del bootstrap V2.0: reportada expresamente por el operador («Funcionó bien, sin errores»).
- Node.js observado en la sesión de prueba: v24.22.2.
- NPM observado: 11.19.1.
- NPX observado: 11.19.1.
- La ejecución de esa V2 incluyó creación del lanzador, validación de parser, acceso directo, transcript y portapapeles.
- Esta reconciliación documental no vuelve a ejecutar RDC ni afirma que el dispositivo esté conectado ahora.
- La autenticación con una cuenta Google distinta queda pendiente de prueba con BASELINE-003.

## 12. Historial

### v1.1.0 — 2026-11-10
- Se establece esta carpeta como ubicación canónica del objeto del módulo dentro de KHORA y del workspace OEP cuando KHORA está seleccionado.
- Se separa el bootstrap completo V2 del lanzador runtime generado.
- Se registra el unicomando completo V2.0 como BASELINE-002 y se conserva el lanzador generado en `artifacts/`.
- Se corrigen las rutas para respetar la capitalización real `baselines/`.
- Se elimina la referencia incorrecta a `START-RDC.ps1`.
- Se incorpora el requisito de autenticación nueva como candidato pendiente, sin modificar CURRENT.
- Se refuerza la regla de entregar siempre scripts completos y conservar el baseline funcional.
