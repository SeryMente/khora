# CUSTODIA-B2-002 · Inventario y backfill no destructivo

**Estado:** `en_curso`  
**Tipo:** tarea provisional subordinada al OCP Custodia.  
**Identificador:** local y estable dentro del registro provisional de este frente; no es folio global, sesión ni control.

## Enunciado enraizado en la instrucción

**Fragmento literal de origen:**

> «sigue resolviendo la migración al backplane de extremo a extremo»

**Fuente literal:** [INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md](../../../originales/INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md).

**Desglose operativo (derivado, no cita literal):** completar una herramienta reanudable que inventarie todas las referencias Blob, verifique cada objeto real y migre únicamente los candidatos elegibles a B2, conservando los originales y dejando conflictos o insuficiencias en cuarentena.

## Alcance de trabajo

- Revisar la migración SQL aditiva `035_custodia_blob_b2_migration.sql` y el ledger `custodia_blob_b2_migration`.
- Inventariar por paginación todos los objetos físicos Blob y reconciliarlos con referencias en `dictado_audio_parte`, `dictado_mp3`, `dictado_mp3_historial`, `volcado.audio_url` y `volcado.audio_partes`.
- Exigir metadatos únicos de SHA-256 y bytes en claro; aislar URL sin referencias físicas, metadatos ausentes o contradictorios.
- Leer Blob real, validar sobre KHC1, descifrar y recalcular longitud/SHA-256 del contenido claro.
- Copiar a una clave B2 determinista y privada; leer físicamente el destino y cotejar hash cifrado, KHC1, longitud y SHA-256 del texto claro.
- Actualizar relaciones SQL y JSONB en transacción; dejar el ledger consistente y reanudable tras fallos.
- No eliminar el objeto Blob de origen.

## Estado y evidencia observada

- PR [#348](https://github.com/SeryMente/khora/pull/348), borrador abierto, head `56720137cec75eaf9e61ddc9357e2bef8670b5fe`.
- Se revisaron el código del backfill, la migración SQL 035 y la documentación de la rama. No se aplicó SQL ni se ejecutó el script contra Neon.
- **Hallazgo de revisión pendiente:** `updateReferences()` acumula `rowCount` de tablas y filas `volcado`, pero ese número no equivale necesariamente al número de referencias individuales cuando una fila JSONB contiene varias entradas. Aun así, la función marca el ledger `references_updated` sin una comprobación de posestado que demuestre que todas las referencias observadas fueron repuntadas. Debe corregirse el conteo/validación para no declarar completado un lote con referencias omitidas o cambiadas concurrentemente.
- El modo `dry-run` exige `DATABASE_URL_UNPOOLED`, `X_KHORA_KEY`, `BLOB_READ_WRITE_TOKEN` y que exista la tabla 035; los valores/secrets y el entorno aislado de Neon aún no se han verificado en esta sesión.

## Criterio de cierre

1. La lista física Blob debe llegar a cursor final sin errores ni páginas omitidas.
2. El inventario debe clasificar todas las referencias encontradas y cuantificar por separado elegibles, cuarentena, ausentes y fallidas.
3. Cada objeto migrado debe tener lectura física de Blob y B2, comprobación KHC1 y hashes de bytes cifrados y contenido claro.
4. El ledger debe reflejar las referencias efectivamente actualizadas, con reconciliación de posestado relacional y JSONB, transacción y reanudación.
5. Ejecutar SQL 035, dry-run y lotes pequeños únicamente en un branch/entorno Neon no productivo autorizado y con datos/credenciales válidos.
6. Conservar todos los objetos fuente Blob; la presencia de cuarentena no puede ocultarse para declarar cierre.

## Límites

No aplicar SQL ni backfill a Neon Production, no alterar referencias de producción ni borrar Blob. El script no se ejecutará con `--apply` hasta corregir la reconciliación y validar el procedimiento en el entorno aislado. La responsabilidad, autorización y sesión se heredan del [control único de Custodia](../../CONTROL-RESPONSABILIDAD.json), generación 6; no se crea un control por tarea.
