# CUSTODIA-B2-002 · Inventario y backfill no destructivo

**Estado:** `en_curso`  
**Tipo:** tarea provisional subordinada al OCP Custodia.  
**Identificador:** local y estable dentro del registro provisional de este frente; no es folio global, sesión ni control.

## Enunciado enraizado en la instrucción

**Fragmento literal de origen:**

> «sigue resolviendo la migración al backplane de extremo a extremo»

**Fuente literal:** [INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md](../../../originales/INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md).

**Desglose operativo (derivado, no cita literal):** inventariar el universo completo de objetos y referencias de Vercel Blob, copiar todos los objetos a la cuenta/bucket KHORA en Backblaze B2, verificar cada copia mediante lectura física y SHA/bytes, reconciliar referencias relacionales/JSONB y conservar todos los originales Blob hasta la aceptación del inventario completo. La instrucción vigente pide que B2 sea el destino de todas las escrituras nuevas y que después se transfiera allí todo el histórico Blob.

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


## Repriorización vigente · 2026-11-09

**Orden:** esta tarea se ejecuta después de CUSTODIA-B2-006 (nuevas escrituras B2 verificadas), CUSTODIA-B2-005 (diagnóstico E2E residual) y CUSTODIA-B2-007 (estabilización). Su resultado es que todo el histórico de Vercel Blob esté copiado y reconciliado en B2.

**Alcance ampliado por instrucción directa:** no limitarse a las filas que aparecen actualmente en Neon. Primero inventariar todos los objetos físicos del store Blob y cruzarlos con referencias en tablas, JSONB, volcados, sesiones y manifests. Clasificar cada objeto como referenciado, no referenciado, duplicado, huérfano candidato, ausente o ambiguo. No descartar elementos por falta de volcado_id.

**Reglas de transferencia:**
1. Copiar cada objeto Blob a una ruta B2 estable, privada e idempotente.
2. Leer físicamente el objeto B2 y cotejar tamaño y SHA-256 de bytes cifrados; validar envelope KHC1 y, cuando corresponda, tamaño/SHA del contenido claro.
3. No actualizar una referencia hasta tener read-back verificado del objeto destino y registro de correspondencia origen/destino.
4. Reconciliar referencias SQL y JSONB dentro de transacción, con conteo de referencias individuales y comprobación de posestado. Corregir primero el defecto conocido de updateReferences().
5. Mantener los originales y versiones de Blob. No borrar Blob como parte de la transferencia ni por una respuesta de upload; cualquier eliminación futura se considera trabajo independiente tras aceptación expresa.

**Línea base histórica disponible (solo lectura, corte 2026-11-09):** Neon main reportó 624 referencias de audio con URL Blob, repartidas en 140 sesiones; 498 de las 624 estaban sin volcado_id. Estas cifras son referencias de base, no inventario exhaustivo de objetos físicos ni prueba de recuperabilidad. Hay además 1,360 filas dictado_audio_parte en total y 1,158 sin volcado_id; no clasificar estas últimas automáticamente como huérfanas.

**Bloqueos técnicos conservados:** la tabla/ledger 035 no estaba presente en Neon main en el último corte leído; el backfill PR #348 contiene el defecto de conteo/posestado de referencias JSONB descrito arriba. No ejecutar APPLY productivo hasta corregirlo, probarlo en rama aislada y verificar el inventario completo. Esta limitación no bloquea el inventario read-only ni la copia física en un lote controlado sin cambiar referencias.

**Estado actual:** secuenciada después de B2-006/005/007. No se ha copiado ningún objeto histórico Blob a B2 en esta retoma.

## Retoma operativa verificada · 2026-11-09

- La capa de credenciales de KHORA en Vercel Production ya está conectada: las dos variables maestras canónicas están registradas como `sensitive` y el preflight nativo confirmó Master Key, cuenta, bucket privado y SSE-B2.
- Deployment `dpl_6hUVD7LBXqtmnaMw2nfH2wwyrHUp` está `READY` sobre `main` (`dd9527a223f65e7af834b042d51f716296151bf2`). Esto no constituye por sí mismo aceptación E2E del flujo de captura/archivo.
- No se ha inventariado exhaustivamente ni copiado ningún objeto histórico físico de Vercel Blob en este ciclo; no se han actualizado referencias Neon y no se han eliminado originales.
- Se conserva el bloqueo sobre APPLY/actualización de referencias hasta corregir `updateReferences()`, probar conteo individual de referencias JSONB, transacción, idempotencia y comprobación del posestado en un entorno no productivo.
- Próximo avance técnico: corregir y probar el reconciliador y preparar inventario paginado/GET read-only de Blob; después copiar cada objeto a clave B2 estable, con read-back físico y SHA/bytes/KHC1. Solo tras esa prueba se podrá reconciliar referencias bajo la autorización y compuertas ya registradas.
