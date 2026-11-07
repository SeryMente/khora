# CUSTODIA-B2-001 · Adaptador B2 exclusivo y flujos de almacenamiento

**Estado:** `en_curso`  
**Tipo:** tarea provisional subordinada al OCP Custodia.  
**Identificador:** local y estable dentro del registro provisional de este frente; no es folio global, sesión ni control.

## Enunciado enraizado en la instrucción

**Fragmento literal de origen:**

> «sigue resolviendo la migración al backplane de extremo a extremo»

**Fuente literal:** [INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md](../../../originales/INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md).

**Desglose operativo (derivado, no cita literal):** completar la capa de transporte para que todas las rutas de producto escriban y lean exclusivamente Backblaze B2. No mantener selector dual, fallback ni lectura Blob en el estado final; las referencias históricas deben migrarse y verificarse antes de retirar sus rutas.

## Alcance de trabajo

- Revisar el adaptador `lib/server/object-storage.ts` y el validador de localizadores `lib/storage/object-reference.ts`.
- Cubrir escritura cifrada KHC1 y lectura B2 mediante URL firmada del lado servidor. Eliminar la lectura Blob de las rutas de producto tras la migración histórica verificada.
- Integrar captura, importación temporal, reproducción, exportación, transcripción y derivado MP3 usando B2 como único backend.
- Mantener los localizadores persistidos sin incluir credenciales ni capacidades firmadas de corta duración.
- Mantener separados staging temporal y objetos originales; la eliminación permitida del adaptador se limita al staging validado para la sesión.

## Estado y evidencia observada

- PR [#348](https://github.com/SeryMente/khora/pull/348), borrador abierto, head `56720137cec75eaf9e61ddc9357e2bef8670b5fe`; rama `feat/custodia-b2-cutover-20261031`.
- Se inspeccionaron `object-storage.ts`, `object-reference.ts`, `audio-mp3.ts`, rutas de captura/importación/exportación/transcripción y pruebas unitarias.
- **Defecto confirmado:** `stagingKeyForSession()` usa una expresión regular con dos barras inversas antes del punto de `.khstaging`; la expresión resultante no acepta el nombre normal `1234.khstaging`. La prueba existente `signed staging capability is bounded...` exige ese caso y falla con la expresión actual. La importación temporal B2 queda por ello bloqueada hasta corregir y volver a probar el validador.
- La prueba de unidad que cubre la ruta B2 existe en la rama; no se dispone todavía de resultado de ejecución local ni de CI verde.

## Criterio de cierre

1. Corregir el validador y conservar la restricción por sesión.
2. Ejecutar pruebas unitarias del adaptador y validador, typecheck y suite de integración pertinente; publicar evidencia de ejecución.
3. Comprobar que cada ruta afectada usa el adaptador y conserva el comportamiento Blob legacy.
4. Demostrar que la capacidad temporal B2 no valida para otra sesión ni para URLs fuera del bucket/región configurados.
5. No declarar integración aceptada por el mero hecho de que el código exista en la PR.

## Límites

No borrar objetos fuente históricos hasta completar inventario, migración y restauración verificadas. La decisión del operador descarta modo dual y prioriza B2 exclusivo; el cutover se ejecuta tras demostrar integridad y aceptación E2E. No exponer ni imprimir credenciales. La responsabilidad, autorización y sesión se heredan del [control único de Custodia](../../CONTROL-RESPONSABILIDAD.json), generación 6; no se crea un control por tarea.


## Runbook de persistencia B2

Seguir [GUIA-PERSISTENCIA-B2-MASTER.md](../../../GUIA-PERSISTENCIA-B2-MASTER.md) para el preflight y smoke test de Backblaze. La ruta recomendada usa la Master Application Key de una cuenta B2 exclusiva de Khora, no Application Keys individuales. Es una guía documental: la cuenta/credenciales y la migración siguen pendientes; no habilita cambios de producción ni eliminación de fuentes.
