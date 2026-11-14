# Auditoría del flujo de actualización de observabilidad · D-041

**Frente:** Harmonia · **Fecha:** 2026-11-13 · **Ciclo local:** 01a1d679-eb8b-7f26-b0fd-eb9c52c95877
**Norma auditada:** OMM-FUT-006 · **Evidencia base:** OCP v0.82 §§4.4, 12, 46; Especificación v1.2.0 §18.3; trazabilidad D-039 y D-040.
**Resultado:** PARCIALMENTE CLARO; requiere formalizar las compuertas de entrada, ejecución y cierre.

## 1. Lo que ya está definido

- Toda tarea de desarrollo, corrección, optimización o expansión ejecuta una revisión paralela de suficiencia de los datos y observabilidad.
- Se definen las señales requeridas y se inspecciona el banco existente antes de solicitar campos nuevos.
- La evidencia se distingue por procedencia: natural, exportada, reportada, sintética, inferida o desconocida.
- Se examinan frescura, cobertura, procedencia, precisión y privacidad.
- Se comienza con los datos suficientes, sin bloquear la tarea por una mejora opcional.
- Las brechas se acumulan; no se crea una tarea nueva por rutina.
- Solo con evidencia convergente se propone una mejora discreta, y el operador autoriza los cambios a productores/contratos.
- Cuando no hay brecha nueva, se puede registrar «observabilidad revisada / sin delta».

## 2. Vacíos identificados

1. No se obliga a dejar una auditoría de entrada con señales necesarias, fuente inspeccionada, versión de esquema y dictamen.
2. No se exige una decisión explícita SUFICIENTE/PARCIAL/INSUFICIENTE/BLOQUEADA antes de depender de datos observados.
3. No se define una revisión incremental durante la ejecución de la tarea.
4. No se exige una auditoría de salida al resolver o detener la tarea provisional.
5. No existe un registro mínimo uniforme para enlazar hallazgo, evidencia convergente, propuesta de expansión y autorización.
6. No se define con precisión cuándo la insuficiencia bloquea una parte de la tarea y cuándo permite continuar con una ruta suficiente.
7. La regla menciona el banco de observabilidad, pero no distingue con suficiente detalle la telemetría estructural, el archivo local de conversaciones y la retroalimentación/incidencias.

## 3. Flujo obligatorio propuesto

| Fase | Control | Registro esperado |
|---|---|---|
| O0 · Necesidad | Definir qué decisión de ingeniería debe apoyar la observabilidad y qué señales mínimas se requieren. | Requisito de observación vinculado a tarea/ciclo. |
| O1 · Línea base | Inspeccionar banco, productor, colector, esquema, consulta y cobertura actuales antes de modificar. | Fuentes, versiones, ventana, cobertura, frescura y limitaciones. |
| O2 · Suficiencia | Clasificar procedencia y dictaminar SUFICIENTE/PARCIAL/INSUFICIENTE/BLOQUEADA. | Dictamen y razón explícitos. |
| O3 · Ejecución | Añadir evidencia incremental, probar hipótesis y registrar nuevas brechas demostradas. | Hallazgos vinculados a la tarea; sin cambios de productor no autorizados. |
| O4 · Cierre | Reconciliar necesidad inicial y evidencia conseguida; verificar coherencia entre productor, esquema, collector, índice y consulta. | Auditoría de salida y resultado de suficiencia. |
| O5 · Expansión | Proponer tarea observabilidad solo ante brecha convergente; obtener autorización antes del cambio. | Propuesta vinculada, alcance, alternativas, riesgos y criterios de aceptación. |

## 4. Registro mínimo por tarea

- OMM/FUT y ciclo local UUIDv7.
- Propósito y preguntas de observabilidad.
- Señales/atributos requeridos y exclusiones.
- Fuentes examinadas, ventana y fecha de consulta.
- Productor, colector y versión de esquema.
- Procedencia de cada evidencia: NATURAL, EXPORTADA, REPORTADA, SINTÉTICA, INFERIDA o DESCONOCIDA.
- Cobertura, completitud, frescura, precisión, procedencia y privacidad.
- Dictamen: SUFICIENTE, PARCIAL, INSUFICIENTE o BLOQUEADA.
- Brecha y efecto sobre la tarea.
- Decisión: continuar, continuar parcialmente, bloquear tramo dependiente o proponer expansión.
- Evidencias/hashes y resultado de read-back cuando haya persistencia.

## 5. Regla de bloqueo y continuidad

Una insuficiencia solo bloquea la decisión o entregable que depende de la señal ausente. Las partes independientes continúan cuando exista evidencia suficiente. La tarea no se detiene por una mejora de telemetría meramente conveniente. No se amplía el banco si el contrato actual basta. No se crean bancos paralelos por defecto.

## 6. Restricciones de gobierno

- Los cambios de productores, permisos, campos y esquemas requieren autorización explícita y una tarea autorizada.
- Los cambios de esquema deben ser versionados, compatibles o migrados de forma declarada, con pruebas.
- No se capturan cuerpos de mensajes, comentarios de feedback, prompts, respuestas, cookies, tokens o payloads de red en el JSONL general.
- Las fechas pueden usarse para orden y procedencia; no se derivan duraciones, latencias, tiempos de proceso o comparativas temporales bloqueadas por DUG/Metacanon §52.
- Las pruebas sintéticas no se registran como captura natural; los resultados de aceptación se mantienen por nivel.
- Si no hay cambio: «observabilidad revisada / sin delta», con fuentes y fecha de revisión.

## 7. Dictamen

OMM-FUT-006 tenía una intención correcta, pero carecía de compuertas reproducibles. Las fases O0–O5 y el registro mínimo quedaron incorporados en OCP v0.83 §46.3 y Especificación General v1.3.0 §18.5. Esta auditoría es evidencia del diagnóstico y diseño; no modifica por sí misma ningún productor ni contrato ejecutable.

## 8. Auditoría de implementación heredada y banco local · D-041

### 8.1. Observabilidad multi-pestaña existente en la candidata 0.5.0

Inspección estática sin ejecución de Chrome:
- `Extension/service-worker.js` consulta `chrome.tabs.query({url:'https://chatgpt.com/*'})`, rehidrata sesiones desde `chrome.storage.local`, limpia sesiones de tabId ausentes, inyecta observadores en pestañas existentes y vuelve a hacerlo en inicialización, instalación, inicio y activación automática.
- Mantiene listeners `chrome.tabs.onUpdated` y `chrome.tabs.onRemoved`, consulta diagnósticos de las pestañas ChatGPT y mantiene sesiones asociadas a tabId.
- `manifest.json` 0.5.0 declara `tabs`, `scripting`, `storage`, `alarms`, host permission `https://chatgpt.com/*` y content scripts para ese host.
- El content script obtiene nodos visibles y roles/conteos de mensajes para la observabilidad; no serializa el cuerpo completo de la conversación en un Markdown maestro.

Dictamen: ya existe enumeración/inyección y observación estructural multi-pestaña parcial en el código candidato. No equivale a cobertura natural aceptada, persistencia íntegra de conversación ni reconciliación a un archivo único por conversación. OMM-FUT-008 debe completar y probar esa base, no duplicarla.

### 8.2. Auditoría del banco de datos local

Ruta consultada explícitamente: `C:\\Users\\fila4\\AppData\\Local\\Harmonia\\surface-index-v0.4.0\\data`. Se leyeron solo metadatos JSONL y se contabilizaron tipos y presencia de campos; no se imprimieron cuerpos ni valores temporales.

| Evidencia agregada | Conteo |
|---|---:|
| Archivos JSONL | 70 |
| Eventos totales | 3,190 |
| `ui.surface.scan` | 1,049 |
| `ui.surface.reused` | 786 |
| `diag.cycle.trace` | 1,271 |
| `capture.started` | 53 |
| `capture.stopped` | 31 |
| `capture.stopped` con `payload.durationMs` | **31 de 31** |
| `client.cycle.started` | 0 |
| `client.cycle.completed` | 0 |

El `index.json` del banco mide 2,540,167 bytes y SHA-256 `F32F827F6730FC6D9CD2D40A6779A7B6897AC922BB46AB20258EF509EDB80CE7`.

### 8.3. No conformidad temporal heredada

La compuerta OCP §13 expresa que Metacanon §52 desactiva las duraciones de ciclo, latencia, procesamiento, tiempo activo, esperas y comparativas temporales; T1/T2 y `duration_ms` son código heredado NO CONFORME y no deben ejecutarse ni exponerse como métricas aceptadas.

En código activo:
- `Extension/service-worker.js` deriva `durationMs` para `capture.stopped`; el resumen de ciclos calcula `duration_ms`, mean/median/p90 y estado `MEASURED`.
- `Collector/server.js` persiste `capture.stopped.payload.durationMs`.
- `Collector/cycle-telemetry.js` consume campos de duración y agrega mean/median/p90.
- `Collector/query.ps1` expone `duration_ms`/ `legacy_duration_ms`.
- `DevTools/GroqAssist/assist.mjs` y `scenario-runner.mjs` emiten `durationMs` en resultados de triage/ejecución local.

Dictamen: el banco conserva 31 campos de duración en eventos de cierre de sesión; el conjunto revisado no contiene eventos T1/T2 de inicio/cierre de ciclo. El código activo mantiene capacidad de calcular/exponer métricas temporales. Es una brecha demostrada frente a la compuerta vigente. No se declara que los eventos fueran mediciones de aceptación natural. No se alteraron código ni datos históricos.

### 8.4. Acción propuesta y límites

Se propone OMM-FUT-009, P1, PROVISIONAL / NO IMPLEMENTADA, subordinada a OMM-01-038: retirar o deshabilitar de rutas activas las medidas temporales no conformes; conservar timestamps solo para orden/procedencia/correlación; revisar Extension, Collector, consulta, UI y GroqAssist; definir tratamiento autorizado y verificable de los 31 registros ya persistidos; añadir pruebas contractuales que rechacen los campos prohibidos. No hay versión asignada.

La tarea no autoriza cambiar productores ni reescribir/borrar JSONL. Se requiere autorización explícita para la modificación de código y una decisión específica antes de alterar el banco histórico. Hasta entonces, la métrica no debe presentarse ni usarse como aceptación y la candidata no debe interpretarse como conforme en ese aspecto.
