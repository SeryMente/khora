# Harmonia · priorización por esencialidad · SES-20261021-F8R3M6Q2

## Identificación y gobierno

- Frente: Harmonia; rol: asistente.
- Folio activo: `SES-20261021-F8R3M6Q2`; control generación 3, blob `26d49ba490ddc6f7c0c3eb4f42a3287b42c87719`.
- OCP previo a este evento: v0.13, blob `78ac61a715974edb72fb10b0b9cd3faf7a220753`.
- Metacanon adquirido desde `SeryMente/metodologia/main`: v1.20 / `METACANON-OBJETOS-v1.20`, blob `eb066d7b7445710cd96d6abb3acf2c33639d8f41`. Edad exacta del último commit: NO VERIFICADA.
- Sam: v339 / `NX-339m`, blob `fdc996078bd611492e46d6b3abf569fbb4a6effa`. Cascada revisada manualmente: P001/P038, transferencia/adjudicación P037/P039/P040, ejecución/autonomía P007, no simulación P009, integración P016 y anti-bloat/priorización P025/P026.
- GOW: v2.2, blob `6d4f8aff292ae173d9ceeba03694597bd2f16488`, revisado en `main` al inicio del ciclo; revisión de cierre pendiente hasta releer.
- `MCP-NORMATIVO: DESACTIVADO`.

## Instrucción del operador

> Las optimizaciones eran para el final. Organiza por esencial y no esencial la lista y dámela de nuevo.

## Decisión de priorización

Se separó la primera aceptación E2E de la evolución posterior. Orden esencial: (1) CI/diagnóstico interpretable y arreglos de integración con evidencia; (2) captura automática de entradas enviadas y respuestas visibles parciales/finales; (3) multi-pestaña, sesiones independientes, completitud regional y un único líder solo tras completitud, con detección posterior de cambios; (4) persistencia, idempotencia, consistencia e recuperación; (5) dashboard en pestaña propia, popup esencial y sincronización validada de metadatos/catálogo con actualización de código separada; (6) pruebas automatizadas realmente aprobadas; (7) reconciliación explícita de identidad RDC; (8) una única carpeta `C:\\Users\\fila4\\Desktop\\Harmonia` tras autorización y staging validado; (9) pruebas Chrome E2E reales y aceptación basada en evidencia.

No esenciales para la primera aceptación, pero conservados como trabajo posterior: optimización CPU/RAM/huellas/latencia después de medir línea base y comparar cobertura; arquitectura multiámbito generalizable más allá de ChatGPT y su formalización vía Metacanon; refinamiento de UX multiámbito; KPIs avanzados y retención; checks externos de deploy-preview que no prueben causalmente el capturador. Estos últimos no autorizan alterar producción ni el plan de facturación para forzar un check verde.

## Evidencia base

- Código `main`: v0.3.0.
- PR #333: candidato v0.4.0, rama `feat/harmonia-e2e-20261021`, head `1a967f2383c5b60f66bcefc77686fcefbc8b4201`; abierto, `draft=true`, no fusionado.
- El run `Harmonia validation` `39695907818` y otros checks se consultaron como fallidos; la herramienta no entregó pasos/logs utilizables ni artefactos suficientes para atribuir causa o marcar suites como pasadas.
- Registro global RDC `ESTADO-RDC-ACTIVO.md`, blob `851c15ba94662b56423707d1d86398e0d1c23b85`, contiene una observación histórica del 2026-10-10 con ID `79564800-3d53-4195-8122-5b4b061ef862`. El inventario vivo del 2026-10-21 lista `PC10RCIF4EI4` con ID `86580320-19b3-421a-89c7-36dce0123559`. No se conectó al equipo ni se alteró el registro; la identidad autorizada sigue sin verificarse.
- No se tocó Chrome ni Escritorio. E2E permanece abierto.

## Persistencia

- OCP actualizado a v0.14 con §21 «Priorización por esencialidad; optimización al final», commit `f42fe8795da110e7a04d0129619be3631a4836ba`, blob `763f91697cf8ff7dbc63520352504ddc3f5436b0`, read-back verificado.
- Prompt de asistente alineado con §21 y la secuencia esencial → RDC/carpeta única → E2E físico → optimización: commit `9fbfd0b7ebc645f3b7cd92ca521a55badb869fd8`, blob `533c6574a2d4e88e0a56371a3190a28afcbda805`, read-back verificado.
- Finalización documental: OCP §21–§22 enlaza esta crónica y conserva la lista esencial/no esencial. El OCP v0.15 fue corregido para registrar la alineación final del prompt: commit de esa corrección `bd2f41ca479fb30405f5558a83a23bdc7e198b32`, blob `7d02ca9a0c2eb50ce98cdf8c3c6edf8ec639de94`, read-back verificado.
- Prompt actual de continuidad apunta al OCP v0.15 / §§21–22: commit `068c526b5c5f6f5757382fa83f4b6387548893ef`, blob `41f2879bc979dc2b050843b07f4f28f256386d44`, read-back verificado.
- README actualizado y leído de vuelta: commit `f5e5f54c33eeacaf3347dd5fababb83f9ba813d5`, blob `a81d1a56b4ff31de3ac87051992e90ed2bff530b`.
- Próximo paso de ingeniería: ejecutar la primera casilla esencial del OCP §21—recuperar evidencia CI interpretable en PR #333 y reparar únicamente fallos concretos—sin anticipar optimizaciones ni fusionar a `main`.


## Continuación del ciclo esencial/no esencial · 2026-10-22

### Corrección candidata esencial y diagnóstico de CI

- Se corrigió en la rama `feat/harmonia-e2e-20261021` una regresión lógica en la coordinación regional: las pestañas no líderes ya no se detienen por completo al completarse la región. Solo suspenden el barrido estructural redundante y conservan captura de mensajes visibles y consola por pestaña.
- Política `region-policy.js`: blob `08370af027ca3f89680f2d1b7cb9d40e3fba474a`; pruebas regionales `02fa89a6526a58b025eae9507b8e2d01693513e9`; `content.js` `f1a655d77de375e20c6602029c58e46d95709ed0`; `service-worker.js` `d86fddc0fad31d0df0167a2983737a1eabcc08ca`; validador `840e12c102db87435ab947983828218d1a0def12`.
- Validación aislada sobre los contenidos leídos de la rama: 22/22 contratos estáticos, 9/9 archivos JavaScript parseables con V8 y 12/12 aserciones de política regional. No equivale a ejecutar `node --test`, a un test real del colector ni a Chrome E2E.
- En el head `8b537bc96da32f601e56755fc16f480174ebed02`, `Harmonia validation` run `39710596780` y `CI` run `39710596811` siguen fallidos. El job `119600747914` reporta `runner_id=0`, `runner_name=""`, sin pasos, sin artefactos y sin logs descargables. Por ello, el resultado de las suites reales permanece NO VERIFICADO; no se atribuye la causa a un test específico.
- PR #333 permanece abierta, en borrador y no fusionada. La descripción de PR actualizada quedó leída de vuelta; main no fue fusionado ni desplegado por esta operación.

### Trabajo no esencial iniciado, sin aprobar arquitectura

- Se creó en la rama candidata la propuesta `docs/frentes/harmonia/propuestas/HARMONIA-MULTIAMBITO-ARQUITECTURA-CANDIDATA.md`, commit `263f3f18605e456db5bee3195d447a33bfa3bf0e`, blob `3e80ff93ff566ea7fa5c317028159185646b1901`, leída de vuelta. Define un contrato candidato para descriptors de ámbito, adaptadores, catálogo, persistencia aislada, permisos mínimos, incorporación y criterios de prueba. Está marcada **NO APROBADA / NO VIGENTE**; no altera el núcleo ni activa nuevos ámbitos.
- El OCP canónico se elevó a v0.17 con §24 para enlazar la propuesta y conservar explícitamente los bloqueos: commit `1ca1624d340a408c6629e395921311c2f1bc3dc0`, blob `a07f6f1c9f25f3be2047944516cf716f10e4631d`, read-back verificado.
- Prompt de continuidad actualizado para OCP v0.17 / §§21–24: commit `d1101f1dd8d7a301c6dcb6133ffb0bf91a2d7fac`, blob `d865a4b04c51790de4b2e452f6a66905c92ef72b`, read-back verificado.
- README alineado con el nuevo OCP y la propuesta candidata: commit `778836294ae75fe5fe0551a97e5db552d66a18e5`, blob `909cd894ed90404591b8ce639609e046d681c3a4`, read-back verificado.

### Bloqueos reevaluados y límite de aceptación

- **CI:** se siguió la ruta de reejecución del job y se verificaron los metadatos del resultado. El proveedor no asigna runner y no entrega logs/artefactos. Reintentar sin reparar o cambiar esta condición repite el mismo estado; no hay una forma segura desde el conector para obligar a GitHub a asignar runner ni para inventar los resultados.
- **RDC:** la lista viva sigue identificando `PC10RCIF4EI4` como `86580320-19b3-421a-89c7-36dce0123559`; el registro global tiene una observación histórica de `2026-10-10` para `79564800-3d53-4195-8122-5b4b061ef862`. El nombre no resuelve la identidad ni autorización. No se seleccionó terminal, no hubo ping/conexión, no se abrió Chrome y no se tocó el Escritorio.
- **Descarga a Desktop:** no realizada porque la identidad autorizada de destino aún no puede verificarse. Destino previsto cuando esté resuelto: una sola carpeta `C:\\Users\\fila4\\Desktop\\Harmonia`, staging fuera del Escritorio y reemplazo de archivos gestionados solo después de verificar hashes.
- **Estado esencial:** **NO CERRADO** — falta runner CI útil, test real del colector, identidad autorizada, paquete en la carpeta única y Chrome E2E.
- **Siguiente del trabajo no esencial:** ampliar el documento candidato de UX/métricas o preparar pruebas de contrato multiámbito en rama, sin implementar decisiones de permisos/almacenamiento no ratificadas y sin ejecutar optimizaciones antes de aceptar E2E.
