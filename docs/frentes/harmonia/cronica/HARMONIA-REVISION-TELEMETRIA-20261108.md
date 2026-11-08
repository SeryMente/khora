# Crónica · revisión de telemetría de ciclos · 2026-11-08

## Identidad y gobierno adquirido

- Frente: HARMONIA · repositorio `SeryMente/khora` · ruta `docs/frentes/harmonia/`.
- Ciclo UUIDv7 local: `01a1bc2b-a790-7b73-a360-79415f0e5f91`. No es ID nativo ni folio global.
- Titularidad leída: generación 15; alias `chatgpt-harmonia-01a1b6ca-4543-7578-85d9-7624877c2e80`; control blob `0e090e1f3537b75891344af812e576e39a5f5e02`; PC10 sigue registrado como dispositivo autorizado. No se modificó el control.
- `session_folio=null`; FOL1 no activa. CONV/CICLO/A/B globales y OCP: PENDIENTES / NO ASIGNADOS; no se crean ni reutilizan folios.
- Gobierno adquirido desde `SeryMente/metodologia/main`: DUG v383 · NX-383m, blob `cad464717c43733aa84b49f8c9c3af0875597fbd`; Metacanon 1.29; GOW 2.18. Revisión manual de P001, P004–P008 y P039–P042. MCP normativo DESACTIVADO. Frescura d.h.m: NO VERIFICADA.

## A · Entrada literal

> Si se llevaron a cabo las nbecesidades de telemetria, revisa las ultiams conveaciones.

## Alcance y fuentes revisadas

- Export original de la conversación: `ChatGPT-Harmonia-20261108-1105.md`, preservado en `originales/` y leído completo (1.776 líneas). El export reporta la fusión de PR #358 y deja CI y aceptación natural pendientes.
- Se contrastó el código actual de `main`, no solo el relato del export.
- Commit de integración técnica: `dcba260981837f75a8a05db85edd310c2a7a9736`, squash de PR #358; commit identificado como integración de 14 archivos.
- Archivos y blobs leídos de `main`:
  - `extension/cycle-observer.js`: `c21a57612f0fc0cddac09ae139ce580173fe303a`.
  - `extension/cycle-observer.test.js`: `b974ddf87349c0f859f6f9ed0a63fe3192f3666c`.
  - `extension/content.js`: `64f1020324a31b2845a9d264cd18d0e252a01241`.
  - `extension/service-worker.js`: `77cc17cf27f1091b5c103f8344c58f9314ff6398`.
  - `extension/manifest.json`: `6234ea80f844f9e9ebb5182c744aca0fc95ea16e`.
  - `collector/cycle-telemetry.js`: `1b023bc568269fa61a524c84940168a5b8ed9c33`.
  - `collector/cycle-telemetry.test.js`: `04d8ade46497d86d4e139fd3e4964d57e1422bec`.
  - `collector/tests/cycle-server.integration.test.js`: `4111a890f4c3a3faa1240695dc2e68c1c2e1da96`.
  - `collector/query.ps1`: `b4aa97a6f9873cb6b574df650a2f13c0338732a7`.
  - `collector/tests/query-cycles.test.ps1`: `300a0cb6cbd25cb413168fe5b0fe4e41c102a2a2`.
  - `CYCLE-TELEMETRY.md`: `511573b8d801d788487d6ef6830cd4da49954239`.
  - `.github/workflows/harmonia-cycles.yml`: `afe40ed30e088c0323b692f6259b6f6ceeea53d7`.

## Hallazgos

### Implementado en el código

- Inicio y cierre: `client.cycle.started` y `client.cycle.completed`.
- Identidades locales UUIDv7 de conversación y ciclo; la correlación no utiliza IDs nativos de ChatGPT.
- `duration_ms` calculado con `performance.now()`; timestamp UTC para auditoría; asentamiento de 1.500 ms no sumado a la duración.
- Observador temporal separado del escáner estructural; cobertura declarada `new-dom-node-v1`.
- Validación de esquema exacto en service worker y colector; allowlist de propiedades, validación de identidad/pareja, idempotencia y escritura JSONL.
- Consulta `-Cycles`, que empareja ciclos completos y marca inicios sin final como `NOT_MEASURED`.
- El observador temporal configura `characterData` pero no lee los valores ni consulta registros de mutación. No usa APIs de lectura de texto del DOM.
- Sin outbox durable ni persistencia remota. La documentación reconoce que un evento puede perderse si el colector local no está disponible.

### Pruebas definidas, sin ejecución acreditada

- `cycle-observer.test.js`: 11 casos sintéticos.
- `cycle-telemetry.test.js`: 7 casos sintéticos.
- `cycle-server.integration.test.js`: una prueba de integración sintética del colector/JSONL.
- `query-cycles.test.ps1`: fixture PowerShell con ciclos completos, reemplazados, cierre de pestaña y causa indeterminada.
- El workflow de GitHub Actions está configurado para ejecutar sintaxis, suites Node y fixture PowerShell. La herramienta de consulta de runs PR devolvió una lista vacía y el status combinado del commit mostró cinco contextos Vercel en failure; no hay evidencia recuperada de una ejecución de Actions con PASS. Estado CI: NO VERIFICADO. No se declara que las pruebas hayan pasado.

### Huecos y límites encontrados

- `content.js` reinicia el observador en `popstate` y `hashchange`; no se encontró reinicio explícito para `history.pushState` ni prueba del caso de navegación SPA/reemplazo de la región principal. El comportamiento de `conversation_id` entre conversaciones no queda demostrado para ese caso.
- Los indicadores de actividad dependen de selectores conocidos (`aria-busy`, `data-is-streaming`, test IDs de stop/progreso de agentes y tareas); no están validados contra una sesión natural actual de Chrome.
- No hay E2E natural de navegación, reinicio del observador, herramientas/agentes o persistencia bajo fallo.
- Regeneración, edición/reenvío, reintentos sin nodo de usuario nuevo y voz se declaran fuera de cobertura v1.
- El transporte actual no dispone de outbox durable; la pérdida ante colector indisponible es un límite documentado, no una garantía de recuperación.

## Dictamen del ciclo

**PARCIALMENTE IMPLEMENTADO; INTEGRACIÓN VERIFICADA EN MAIN; CI Y ACEPTACIÓN NATURAL NO VERIFICADAS.**

No se modificó código, PR, Chrome, permisos, infraestructura, OCP de otro frente ni control de responsabilidad durante esta revisión. Búsqueda actual de PR abiertas en el repositorio: cuatro resultados, todos ajenos a Harmonia; cero PR abiertas de Harmonia.

## B · Salida visible del modelo

**Dictamen: parcialmente sí.** La telemetría está implementada e integrada en `main`, pero no está completamente probada ni aceptada en Chrome.

| Necesidad | Estado comprobado |
|---|---|
| Eventos `client.cycle.started/completed`, UUIDv7 local y `duration_ms` con `performance.now()` | Implementado |
| Ventana de asentamiento de 1.500 ms excluida de la duración | Implementado |
| Señales de generación y actividad de agentes | Implementadas mediante selectores conocidos; falta validación natural |
| Validación estricta, correlación, idempotencia y JSONL local | Implementado en el colector |
| Consulta `query.ps1 -Cycles` | Implementada; fixture PowerShell existe, ejecución no acreditada |
| Privacidad: no leer ni conservar texto conversacional | Restringida en el observador y validada estáticamente |
| Durabilidad si el colector está apagado | Limitación conocida: un evento puede perderse; no hay outbox durable |

**Integración:** PR [#358](https://github.com/SeryMente/khora/pull/358) fusionada en el commit [`dcba2609`](https://github.com/SeryMente/khora/commit/dcba260981837f75a8a05db85edd310c2a7a9736). La extensión es v0.3.1. Las PR [#353](https://github.com/SeryMente/khora/pull/353) y [#346](https://github.com/SeryMente/khora/pull/346) están cerradas. La búsqueda de PR abiertas del repositorio devuelve cuatro, todas ajenas a Harmonia: **cero PR abiertas de Harmonia**.

**Pendientes reales:**

1. **CI:** el workflow de telemetría está definido, pero no obtuve una ejecución de GitHub Actions con resultado PASS. Los estados combinados visibles del commit son cinco comprobaciones de Vercel en failure; no son pruebas de telemetría. No declaro CI aprobada.
2. **Navegación SPA:** el observador se reinicia explícitamente en `popstate` y `hashchange`; no encontré cobertura de navegación por `pushState` ni prueba natural de reemplazo de la región principal. Es un hueco que conviene cerrar antes de confiar en `conversation_id` entre conversaciones.
3. **Prueba natural:** no se ha cargado/recargado la extensión en Chrome para validar señales reales, herramientas/agentes, múltiples turnos y ciclos incompletos.
4. **Interrupciones:** hay fixtures para segundo envío, cierre y causa desconocida, pero no una demostración E2E de navegación, reinicio del observador, edición/reenvío y regeneración. Regeneraciones, ediciones/reenvíos y voz siguen expresamente fuera de la cobertura v1.

**Conclusión:** la capacidad solicitada existe en el código, con el alcance conservador `new-dom-node-v1`. La construcción está integrada; la fiabilidad en uso real y la aceptación siguen pendientes. El siguiente paso correcto es verificar el workflow/test suite y cerrar la cobertura de navegación SPA antes de la prueba natural autorizada en Chrome.

Fuentes: [observador](https://github.com/SeryMente/khora/blob/main/apps/harmonia-observability/extension/cycle-observer.js), [service worker](https://github.com/SeryMente/khora/blob/main/apps/harmonia-observability/extension/service-worker.js), [validador del colector](https://github.com/SeryMente/khora/blob/main/apps/harmonia-observability/collector/cycle-telemetry.js), [consulta](https://github.com/SeryMente/khora/blob/main/apps/harmonia-observability/collector/query.ps1), [contrato y límites](https://github.com/SeryMente/khora/blob/main/apps/harmonia-observability/CYCLE-TELEMETRY.md).

---

IPZ: v0.7 · d.h.m NO VERIFICADO
DUG: v383 · NX-383m · d.h.m NO VERIFICADO
CONV: PENDIENTE / NO ASIGNADO | OCP: PENDIENTE / NO ASIGNADO
CICLO 1: PENDIENTE / NO ASIGNADO | OCP: PENDIENTE / NO ASIGNADO
A: PENDIENTE / NO ASIGNADO | OCP: PENDIENTE / NO ASIGNADO
B: PENDIENTE / NO ASIGNADO | OCP: PENDIENTE / NO ASIGNADO
UUIDv7 local del ciclo: `01a1bc2b-a790-7b73-63d0-cbddd2678b0d`
FOL1: PREPARADA · NO ACTIVA
MCP normativo: DESACTIVADO

## Siguiente checkpoint

1. Obtener un resultado verificable de GitHub Actions y ejecutar la suite de Node y PowerShell.
2. Añadir/validar el tratamiento de navegación SPA (`pushState`, sustitución de `main`) y las pruebas de interrupción faltantes.
3. Realizar prueba natural autorizada en Chrome; no declarar aceptación antes de esa evidencia.

---

Frescura IPZ/DUG en d.h.m: NO VERIFICADA. Folios CV/CY/A/B: PENDIENTES / NO ASIGNADOS por FOL1 no activo.
