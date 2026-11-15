# Harmonia — tramo de retoma y continuidad conversacional

**Corte:** 2026-11-11 16:23 · America/Mexico_City  
**Frente:** KHORA / Harmonia · **Sprint:** OMM-01 — Observa · Mide · Mejora  
**UUIDv7 local:** 01a1ccb9-2d62-75a5-a3fa-cb7bdec7416a  
**Procedencia:** transcripción y contexto suministrados por el operador en esta conversación. No se asigna ID nativo ni folio formal.

## 1. Directrices del operador que gobiernan la retoma

- Continuar el frente Harmonia dentro del repositorio KHORA conservando continuidad técnica y conversacional.
- Persistir el último tramo y reproducir literalmente la última salida del modelo incluida en la transcripción recibida.
- Toda operación local se realiza por RDC. No trasladar al operador la ejecución de CMD, PowerShell, scripts ni tareas rutinarias de consola.
- No abrir, enfocar, navegar, inspeccionar ni modificar Chrome principal. La carpeta debe quedar preparada para que el operador la cargue cuando decida.
- Objetivo del producto: extensión con UI moderna y simplificada; observabilidad estructural de la interfaz ChatGPT; banco local actualizado de superficies/capacidades; telemetría de duración de ciclos de conversación y tiempo de solución.
- Objetivo de ingeniería: bucle semiautomatizado que combine datos de observabilidad, intervenciones del operador y propósito declarado; Codex implementa con TDD y evidencia, sin convertir hipótesis en cambios.
- Groq debe acelerar el diagnóstico y la selección del siguiente experimento. No debe intervenir el cronómetro T1/T2 ni volverse dependencia de Extension/ o Collector/.

## 2. Estado comprobado al retomar

### Identidad, responsabilidad y workspace

- Dispositivo RDC utilizado: PC10RCIF4EI4, UUID `99383b36-cc22-4457-952f-8799cccac0a7`.
- Identidad Windows observada: `CENTRAL\\fila4`; SID: `S-1-5-21-1529298404-1161420656-882029410-5167`. Coincide con el dispositivo registrado en `docs/frentes/harmonia/CONTROL-RESPONSABILIDAD.json`.
- CONTROL conserva generación 15 y titularidad `chatgpt-harmonia-01a1b6ca-4543-7578-85d9-7624877c2e80`; el dispositivo autorizado es el UUID anterior.
- SHA-256 CONTROL: `825CC558606F72B6A284B236DF8F3C56328CEAC8D1740441EA32BCC2E087161B`. Respaldo previo: `CONTROL-RESPONSABILIDAD.json.bak-20261111-155152`, SHA-256 `1290032802778EDFB855CD37D69FBAD5B2AAA4E09951595898CE08A6F06F5007`.
- Rama: `work/harmonia-front-workspace-20261110`. HEAD: `9fd5c18205e39b6db12c9152b07d8f880f6b256d`.
- El worktree contiene cambios previos y actuales sin commit. No se limpió, reseteó ni sobrescribió el trabajo existente.
- OCP anterior: HARMONIA-v0.72 local. Se preservó antes de editar en `archive/OBJETO-CANONICO-v0.72-pre-retoma-20261111-1623.md`; SHA-256 de origen y respaldo coincidente: `5971FEEA07AE470BA0D489EFA04A23E8EE627671869909D152AFA0E6D7401A5B`.

### Candidata local de extensión

- Manifest V3, versión `0.4.8`; build-info `0.4.8`; colector `0.4.8.1`; catálogo `0.1.3`.
- Carpeta cargable: `KHORA/Harmonia/Extension/`; `manifest.json` está directamente en esa carpeta.
- Se detectó una inconsistencia real: el manifiesto declaraba 0.4.8, pero el popup mostraba 0.4.5. Se agregó `Extension/popup.test.mjs`; primera ejecución RED: `0.4.5 !== 0.4.8`. Se corrigió únicamente la etiqueta visible a `v0.4.8`; segunda ejecución GREEN.
- Suite activa fresca: 7 archivos de prueba, **41/41 PASS**, 0 fallos. Incluye observador, service worker/outbox, catálogo, colector, integración del servidor, Groq Assist y coherencia de versión del popup. Todas son pruebas locales/sintéticas.
- `local-auth.js` está presente; su contenido no se leyó ni se expuso.
- No se abrió, recargó, inspeccionó ni modificó Chrome principal. La candidata no está declarada instalada ni activa.
- Ciclos T1/T2 naturales aceptados: 0 / no verificados. BMO-01: NO ALCANZADO. Las pruebas sintéticas no sustituyen una generación real de ChatGPT.

## 3. Diseño comprobable para Groq dentro del bucle de ingeniería

### Punto de mayor valor

Groq debe ubicarse **después de compilar la evidencia observacional y antes de escoger el siguiente experimento discriminante**. No debe ejecutarse por cada barrido ni por cada ciclo conversacional. Su trabajo es reducir el tiempo entre «hay un fallo» y «sabemos qué prueba distingue las causas».

### Flujo propuesto

1. Extension observa y Collector persiste los eventos y agregados T1/T2 de forma determinista.
2. Un informe local `harmonia.diagnostic-report.v1` pasa por el compilador allowlisted de `DevTools/GroqAssist/assist.mjs`, que produce `harmonia.dev-triage-input.v1`.
3. El selector determinista local resuelve primero los casos de alta certeza. Groq solo se consulta ante ambigüedad o evidencia insuficiente.
4. Groq recibe exclusivamente contadores y categorías permitidas. Devuelve `harmonia.dev-triage-result.v1`, con diagnóstico cerrado, referencias de evidencia, `scenario_id`, observación esperada y condición de refutación.
5. Un futuro runner local debe mapear cada `scenario_id` a pruebas o sondas **predefinidas y de solo lectura**. Nunca debe ejecutar comandos libres redactados por el modelo.
6. El runner devuelve al coordinador únicamente resultado categórico, duración, nombre de prueba y referencias de evidencia. Groq puede elegir el siguiente experimento acotado; el coordinador detiene el ciclo cuando hay diagnóstico suficiente, no mejora la información o se alcanza el límite de rondas.
7. Codex aplica la corrección mínima demostrada, con TDD RED→GREEN y regresión completa. La decisión de producto y la aceptación siguen bajo supervisión del operador.

### Qué existe y qué falta

- **Existe:** compilador de evidencia allowlisted; fallback determinista; catálogo cerrado de escenarios; cliente opcional GPT-OSS 20B; Structured Outputs estricto; validador local de referencias/códigos/escenario; timeout y fallback; wrapper EP Vault.
- **No existe todavía:** runner que despache automáticamente escenarios cerrados; realimentación automática del resultado al siguiente turno de triage; benchmark de cinco incidencias reales; coordinador completo que conserve la secuencia hipótesis→experimento→resultado→decisión.
- **No se verificó:** llamada real a Groq ni configuración ZDR de la cuenta. Las pruebas usan fetch simulado y no consumen cuota.
- El wrapper requiere `-ZdrVerified`, pero ese parámetro es una confirmación manual; el script no demuestra por sí mismo que la opción ZDR esté activada en la cuenta.
- La documentación oficial de Groq indica que las solicitudes de inferencia no se conservan por defecto, pero pueden existir registros temporales para confiabilidad o abuso de hasta 30 días; Data Controls permite desactivar ese almacenamiento. Por tanto, no se debe marcar ZDR como verificado sin evidencia de la configuración real de la cuenta.
- La documentación vigente de Groq incluye `openai/gpt-oss-20b` entre los modelos compatibles con Structured Outputs estricto (`json_schema`, `strict: true`). El código actual usa ese formato.
- Groq permanece separado de Extension/ y Collector/. La extensión debe seguir midiendo sin llave, sin red y sin inferencia externa.

### Cómo medir si realmente acelera

Comparar, sobre cinco incidencias reales, flujo local frente a flujo asistido: tiempo hasta el primer diagnóstico confirmado, número de experimentos ejecutados, proporción de hipótesis confirmadas, regresiones reabiertas y costo/tokens Groq. Conservar Groq solo si reduce el tiempo neto sin degradar precisión ni privacidad.

Fuentes técnicas consultadas:
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/your-data
- https://trust.groq.com/faq

## 4. Compuertas pendientes

- Preparación local de 0.4.8: comprobada; carga activa en Chrome: pendiente.
- Primera traza natural T1/T2 posterior a la carga: pendiente.
- Identificación del primer eslabón fallido usando traza natural: pendiente.
- Cinco ciclos naturales correlacionados y persistidos para BMO-01: pendiente.
- Runner de escenarios Groq: diseño definido; implementación pendiente.
- ZDR de Groq: no verificado; no se habilita llamada real hasta verificarlo.
- Sin commit, push, PR, merge, publicación, despliegue ni intervención en Chrome principal.

## 5. Última salida del modelo en el tramo suministrado · reproducción literal

El bloque siguiente reproduce la última salida visible del modelo incluida al final de la transcripción recibida. Se conserva como histórico; su discrepancia de dispositivo ya quedó resuelta después y no gobierna el estado actual.

~~~text
Harmonia 0.4.8 preparada localmente
La carpeta de extensión está materializada y conserva sus dependencias:

Ruta exacta para cargar como extensión descomprimida:

C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA\Harmonia\Extension

Verificaciones ya realizadas:

Manifest V3 y build-info.json: versión 0.4.8.

Colector: 0.4.8.1, HEALTH=OK.

Catálogo: 0.1.3.

local-auth.js presente, sin leer ni revelar su contenido.

Suite activa: 40/40 pruebas aprobadas.

Sin errores de sintaxis JS/MJS ni PowerShell.

Sin cambios en main, commits, publicaciones o despliegues.

No he instalado ni recargado Chrome.

Bloqueo de autorización
En la comprobación final encontré una discrepancia:

Registro

UUID

Identidad

Dispositivo autorizado en CONTROL

b573344f…

CENTRAL\MantenimientoRCI

Sesión que ejecuta como fila4

99383b36…

CENTRAL\fila4

No voy a cambiar el control de responsabilidad por inferencia ni continuar escribiendo en esa sesión hasta resolverlo.

¿Autorizas sustituir en CONTROL-RESPONSABILIDAD.json el dispositivo registrado por el UUID 99383b36-cc22-4457-952f-8799cccac0a7, conservando la titularidad y generación actuales?

IPZ: v0.7 · edad NO VERIFICADA
DUG: Samantha v388 / NX-388m · edad NO VERIFICADA
OCP: HARMONIA-v0.72 · local
CONV / CICLO / A / B: PENDIENTES · NO ASIGNADOS
FOL1: PREPARADA · NO ACTIVA
MCP normativo: DESACTIVADO
~~~

[Fin del registro. Este archivo no declara instalación activa, ciclo natural aceptado, llamada real a Groq ni BMO-01 alcanzado.]
