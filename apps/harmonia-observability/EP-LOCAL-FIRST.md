# HARMONIA · persistencia local-first y frontera EP

## Estado del corte

Implementación en rama `feat/harmonia-ep-local-first-adapter-20261101`, sin merge ni despliegue.

- **Capa navegador:** `extension/durable-outbox.js` añade un outbox IndexedDB independiente de los eventos originales del colector. El service worker confirma primero `enqueue`; después intenta entregar al colector local. Solo elimina una entrada del outbox cuando el colector devuelve un ACK correlacionado por `eventId`.
- **Capa local canónica:** el colector mantiene JSONL por fecha/sesión, archivos de superficie e `index.json`. Los JSONL se anexan con `fsync`; el archivo temporal del índice/superficie se sincroniza antes del rename. Si el tamaño persistido no coincide con el total de los originales y superficies, se reconstruye el índice desde esos artefactos.
- **Ledger EP del consumidor:** `collector/ep-consumer-adapter.js` registra referencias a fuentes locales, SHA-256, tamaño, superficie vinculada e identidad de operación estable en un journal append-only con `fsync`. No guarda el payload completo.
- **Protección de históricos:** `ep-consumer-activation.json` fija el instante de activación. La reconciliación registra fuentes `collectorReceivedAt` posteriores a ese instante; originales preexistentes no se convierten automáticamente en una migración ni en pendientes de nube.
- **Estado visible:** el popup muestra la cantidad de eventos pendientes en IndexedDB y el bloqueo de EP / salud del ledger.

## Superficie interna del adaptador

- `enqueue(sourceRef)`: registra una referencia ya persistida localmente.
- `flush(options)`: no transmite; devuelve `blocked=true` y `attempted=0` mientras falten contrato EP y aprobación de allowlist.
- `getStatus()`: informa conteos locales, blockers y estado del ledger.
- `recover(operationRef)`: relee la fuente y, cuando existe, coteja también el SHA-256 de la superficie. No consulta la nube y devuelve `epVerified=false`.

Estos métodos son internos del consumidor, no rutas HTTP de EP.

## Confirmaciones separadas

El ACK que permite retirar una entrada del outbox del navegador acredita únicamente que el colector local recibió y registró durablemente el evento. **No acredita EP, OCP-MSP ni persistencia remota.** El ledger conserva `cloudState=CLOUD_PENDING`, `eligibility=PENDING_ALLOWLIST_APPROVAL` y los blockers `ALLOWLIST_NOT_APPROVED` / `EP_CONTRACT_UNAVAILABLE`.

No existe cliente remoto en esta rama. No hay endpoint inventado, token de consumidor, clave B2 ni conexión directa a B2. El envío remoto requiere contrato oficial/versionado de EP, autenticación/scope por consumidor, semántica de idempotencia, consulta/read-back/recuperación, recibo verificable y allowlist aprobada.

## Recuperación y fallo

- Si el outbox IndexedDB no puede escribir, el evento no se da por durable en el navegador.
- Si el colector está offline o responde con error, el registro permanece pendiente en IndexedDB con backoff.
- Si JSONL quedó escrito pero el ledger no pudo persistirse, el colector queda degradado y rechaza nuevas escrituras (503) hasta reinicio/reconciliación. El reintento conserva `eventId`; el arranque repara el ledger desde JSONL recibido después de la activación.
- Si el índice quedó atrás de los originales, se reconstruye desde JSONL y superficies, sin modificar los originales.
- Los originales históricos preexistentes no se recorren para crear nuevas referencias de réplica.

## Pruebas y aceptación

`node --test apps/harmonia-observability/collector/tests/ep-consumer-adapter.test.js` cubre reconstrucción del ledger, identidad estable al reintentar, exclusión de históricos, bloqueo de flush sin EP/allowlist y recuperación local sin declarar confirmación remota. El workflow `.github/workflows/harmonia-local-first.yml` ejecuta las pruebas y los chequeos de sintaxis en Node 22.

La prueba de CI no sustituye la aceptación de la extensión real en Chrome: IndexedDB, reinicio del service worker, offline/online, carga de extensión, colector real y persistencia/relectura local requieren una ejecución en entorno Chrome autorizado. No se declara aceptación E2E en este corte.
