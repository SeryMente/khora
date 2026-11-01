# CUSTODIA-B2-004 · Aceptación E2E y cutover controlado

**Estado:** `pendiente`  
**Tipo:** tarea provisional subordinada al OCP Custodia.  
**Identificador:** local y estable dentro del registro provisional de este frente; no es folio global, sesión ni control.

## Enunciado enraizado en la instrucción

**Fragmento literal de origen:**

> «de extremo a extremo y avísame si hay algún bloqueo»

**Fuente literal:** [INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md](../../../originales/INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md).

**Desglose operativo (derivado, no cita literal):** demostrar la migración completa desde escritura/captura hasta lectura, reproducción, transcripción, derivados MP3 y exportación usando B2, reconciliar todas las referencias existentes y preparar un cambio controlado de proveedor solo después de aprobar todas las compuertas técnicas y operativas.

## Estado y evidencia observada

- PR [#348](https://github.com/SeryMente/khora/pull/348) permanece abierta y en borrador; no está fusionada.
- La comparación actual de la rama `feat/custodia-b2-cutover-20261031` contra `main` muestra 27 commits propios y 2 commits detrás; no se ha reconciliado todavía ese delta.
- Los workflows de GitHub consultados para el head de PR terminaron en `failure`; los resúmenes de pasos estaban vacíos y los logs devolvieron 404, por lo que no se atribuye la causa a los tests de código.
- Checks de preview Vercel y Netlify están fallidos con referencias explícitas a la restricción del plan Hobby para repositorio privado de organización. No se hará público el repositorio para resolver ese bloqueo.
- No hay prueba ejecutada de SQL 035 en un branch Neon aislado, ni resultado de inventario/dry-run, backfill o lectura real B2 en esta sesión.
- No está verificado el valor efectivo de `KHORA_OBJECT_STORAGE`; solo se observó que la variable está configurada. No se exponen valores de credenciales.

## Criterio de cierre

1. Rama reconciliada con la cabeza de `main`, revisión de cambios y CI verde para typecheck, pruebas unitarias, calidad y contratos/E2E pertinentes.
2. PR aceptada e integrada únicamente después de revisión; el preview de Vercel no puede considerarse aprobado mientras el proveedor lo bloquee.
3. Entorno de prueba aislado de Neon con SQL 035, inventario completo, lotes de backfill verificados y reconciliación de conteos/ledger.
4. Pruebas de escritura y lectura B2, staging firmado, lectura Blob legacy, reproducción, transcripción, MP3, exportación original y recuperación tras reanudación.
5. Comparación completa de referencias físicas y lógicas; toda excepción queda en cuarentena explícita.
6. Aceptación operativa del resultado, con la distinción entre pruebas sintéticas, datos reales y producción.
7. Cualquier cutover de producción se documenta como una fase posterior y separada, tras la autorización explícita correspondiente.

## Límites

No cambiar `KHORA_OBJECT_STORAGE` en producción, no aplicar SQL/backfill en Neon Production, no desplegar/cambiar tráfico productivo ni borrar objetos Blob. La retención de originales continúa hasta una decisión posterior separada. La responsabilidad, autorización y sesión se heredan del [control único de Custodia](../../CONTROL-RESPONSABILIDAD.json), generación 6; no se crea un control por tarea.
