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
- Próximo paso: enlazar esta crónica desde OCP/README, releer cada archivo y mantener la prioridad del operador sin invertirla.
