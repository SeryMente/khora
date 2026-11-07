# CUSTODIA-B2-004 · Migración integral a Backblaze B2 y cutover sin persistencia dual

**Estado:** `en_curso` · **Prioridad:** P0 por bloqueo operativo de dictado/archivado.  
**Tipo:** tarea provisional subordinada al OCP Custodia.  
**Identificador:** local y estable dentro del registro provisional; no es folio global, sesión ni control.

## Decisión explícita del operador

> «No quiero persistencia dual, quiero todo en backblaze. Y haz que esto se resuelva lo mas rapido posible. Deja todo documentado en tus tareas provisionales.»

**Decisión de arquitectura vinculante para esta tarea:** Backblaze B2 será el único proveedor de persistencia de objetos de Khora. No se acepta un modo dual, fallback, lectura dual ni escritura dual con Vercel Blob como estado final. Las referencias históricas que hoy dependan de Blob deberán migrarse y verificarse en B2 antes de retirar sus rutas de lectura. La retención temporal de los objetos fuente durante la migración es una medida de seguridad de datos, no persistencia dual del producto; se eliminará solo en una fase de limpieza expresamente autorizada, tras reconciliación y restauración aceptadas.

## Diagnóstico y evidencia disponible

- El error reportado por el operador muestra 14 partes de audio pendientes de confirmación remota y bloqueo correcto del archivado.
- El almacén Vercel Blob `khora-audio` fue observado en estado `limits-exceeded-suspended`; no es un destino operativo aceptable.
- En Vercel Production se observan variables con los nombres `KHORA_OBJECT_STORAGE`, `KHORA_B2_BUCKET_NAME`, `KHORA_B2_BUCKET_ID`, `KHORA_B2_KEY_ID` y `KHORA_B2_APPLICATION_KEY`. Solo se verificó su existencia y alcance de entorno; no se leyeron ni expusieron valores secretos ni se verificó autenticación real o escritura B2.
- `BLOB_READ_WRITE_TOKEN` también existe en Vercel, pero su presencia no implica que Blob esté disponible. No debe usarse como fallback.
- La PR [#348](https://github.com/SeryMente/khora/pull/348) contiene la base de adaptador B2, staging firmado, inventario, ledger 035 y backfill reanudable; permanece abierta/en borrador y no está integrada.
- La rama de PR #348 no tiene todavía aceptación E2E física de proveedor, backfill real verificado ni cutover completo. No presentar su código como migración terminada.

## Alcance P0 — orden de ejecución mínimo

1. **Cerrar la ruta de persistencia única:** revisar y adaptar el código de PR #348 para que todas las escrituras, lecturas, staging, reproducción, importación, transcripción, MP3, exportación, recuperación y restauración usen B2. Eliminar selector dual, fallback Blob y dependencias operativas de `@vercel/blob` en rutas de ejecución. Si un objeto legacy aún no migrado no está en B2, devolver error explícito y recuperable; nunca recurrir a Blob silenciosamente.
2. **Desbloquear dictado:** hacer que captura por partes suba directamente a B2, espere lectura física de vuelta y verifique SHA-256/longitud/KHC1 antes de marcar cada parte como custodiada. Vincular cada objeto al usuario/sesión/índice de parte y persistir la referencia estable. Ningún checkpoint ni archivado puede declararse completo si falta una parte.
3. **Preflight B2 real:** usar la cuenta Backblaze B2 existente del operador (la vinculada a su correo principal); no crear otra cuenta ni cambiar la identidad. Reutilizar el mecanismo ya establecido por EP sin invadir sus datos: el espacio de Khora queda aislado bajo su bucket/prefijo autorizado (namespace `khora/`), fuera del prefijo `ep-ocp/`. Mantener la credencial en la bóveda autorizada y únicamente en servidor. Verificar autenticación, bucket ID/nombre/región, cifrado, PUT/GET/HEAD, URL firmada y lectura física de vuelta con objeto sintético. El preflight no modificará configuración.
4. **Reconciliación de datos históricos:** corregir inventario paginado y ledger 035; inventariar todas las referencias físicas/lógicas y familias SQL/JSONB; clasificar huérfanos, conflictos y metadatos incompletos. Migrar por lotes reanudables a claves B2 deterministas. Cada objeto requiere GET del origen, validación KHC1, PUT B2, GET físico de B2, SHA de bytes cifrados, descifrado y SHA/longitud de bytes claros; actualizar referencias transaccionalmente solo tras verificar el destino. Ningún objeto se da por migrado por la respuesta de PUT.
5. **Eliminar modo dual:** después de reconciliar y verificar el 100% de referencias elegibles, cambiar la configuración de producción a B2 exclusivo y desplegar. Retirar rutas, dependencias, tokens, selectores y fallback de Blob. Las excepciones no migrables deben quedar en cuarentena y bloquean el cutover si afectan datos requeridos por el producto.
6. **Pruebas E2E reales:** dictado corto y largo con múltiples partes, interrupción/red/reintento, recarga, reanudación, duplicados, orden, manifiesto, archivado, reproducción, transcripción, derivados MP3, exportación y restauración desde B2. Correlacionar eventos por sesión/parte/attempt/request; comprobar que cada transición se persiste en observabilidad y que errores se muestran sin bloquear indefinidamente.
7. **Cierre y limpieza:** demostrar ausencia de llamadas a Blob y ausencia de referencias activas a sus URLs; verificar inventario y restauración desde B2. La eliminación de objetos Blob fuente se registra como acción separada y no se ejecuta automáticamente en este cutover.

## Criterios de aceptación obligatorios

- B2 es el único proveedor configurado y utilizado por todas las rutas de producto.
- Ningún flujo contiene fallback silencioso o persistencia dual Blob/B2.
- 100% de las partes de cada nueva sesión aceptada tienen objeto B2 leído de vuelta, SHA/longitud/KHC1 verificados y referencia vinculada a la sesión.
- El manifiesto de archivado se calcula contra el inventario B2 y bloquea si falta una parte.
- Inventario histórico completo, ledger reconciliado y referencias relacionales/JSONB verificadas; toda excepción está cuantificada y resuelta o en cuarentena explícita.
- Pruebas E2E y restauración B2 pasan en entorno no productivo y luego smoke test autenticado en producción.
- Logs/eventos de captura, subida, respuesta HTTP, verificación, retry, checkpoint, manifiesto y archivado son correlacionables y persistidos; secretos y contenido de audio nunca se registran.
- Build, typecheck, unitarias, contratos y E2E ejecutados por runners reales; los jobs sin pasos no cuentan como CI.
- Lectura de vuelta documental de cada evidencia y hashes cotejados.

## Bloqueos y límites conocidos

- La cuenta/credencial B2 productiva no ha sido autenticada ni probada en esta sesión; la existencia de variables en Vercel no demuestra acceso al bucket.
- No se ha ejecutado SQL 035 ni backfill contra Neon. Primero debe probarse en branch aislado y reconciliar ledger.
- La PR #348 sigue abierta/draft. Su estado actual incluye modo dual y requiere cambios sustantivos para cumplir esta decisión.
- No declarar listo ni desplegar hasta que las pruebas físicas y la reconciliación demuestren integridad. La autorización expresa del operador en este turno establece el objetivo B2 exclusivo y la prioridad; no autoriza borrar originales ni saltar controles de integridad.

## Referencias operativas

- [PR #348 — base técnica de migración B2](https://github.com/SeryMente/khora/pull/348).
- [Guía B2 con Master Application Key y lecciones transferidas desde EP](../../../GUIA-PERSISTENCIA-B2-MASTER.md).
- [PR #355 — reintento de partes antes de archivar](https://github.com/SeryMente/khora/pull/355).
- [Observabilidad runtime y dictado](../../OBJETO-CANONICO.md).

**Regla de cierre:** no se declara resuelto el incidente por cambiar una variable, desplegar el adaptador o lograr un PUT. Se cierra cuando B2 es exclusivo, todas las partes se verifican, el archivado E2E concluye y la restauración desde B2 queda probada.
