# Guardia de no-regresión: Ingreso, custodia de Volcados e Ingesta

**Estado:** guardia técnica en la rama del PR #290; no constituye certificación de producción ni sustituye al protocolo ratificado L0-003.  
**Corte verificado:** 2026-10-09 · commit `fe60ea7d55b7feae2728a155aba022ef0e8845c1`.  
**Registro de auditoría:** [Notion · Auditoría de no-regresión · Ingreso, custodia de Volcados e Ingesta](https://app.notion.com/p/3f45d4a3b25081438403cf7250a378f5?pvs=204).

## Regla de custodia

Los bytes de audio original, la transcripción verbatim, la versión 1, los hashes, las versiones posteriores, los deltas, las marcas temporales y la procedencia son archivo; no se sustituyen silenciosamente. Segmentación y estructuras derivadas se pueden reconstruir. Aprobación, rechazo y ratificación son juicio humano y deben conservar su auditoría. Ante un fallo, se conserva el original y se declara la causa; no hay éxito implícito.

## Invariantes protegidos

| ID | Invariante exigido | Barrera/prueba |
|---|---|---|
| CUST-01 | Un `sessionId` puede vincularse a un único volcado. Reintentar devuelve el mismo ID. | `guardarDictadoConSesion` bloquea `dictado_session` con `FOR UPDATE`; prueba de retry de sesión existente. |
| CUST-02 | Un volcado sellado no acepta texto distinto bajo la misma sesión. | Descifrado y recálculo SHA-256 del original antes de decidir idempotencia. |
| CUST-03 | Un manifiesto de audio presentado por el cliente debe coincidir con las partes persistidas y verificadas en el servidor. | Prueba que declara audio sin partes del servidor y no permite archivar. |
| CUST-04 | Un retry de `sessionId + partIndex` no sustituye el contenido original por una huella diferente. | Bytes, SHA-256 y fuente deben coincidir; conflicto devuelve error. |
| CUST-05 | La falla de vínculo en PostgreSQL no borra un blob verificado. | La API devuelve `audio_almacenado_no_vinculado` con URL/ruta recuperable; el volcado no se declara archivado. |
| CUST-07 | Un fallo de lectura/hash post-escritura no destruye el blob ni lo declara verificado. | Audio, importación y transcripción desde archivo devuelven un localizador recuperable con `verificado: false`; el staging solo se borra tras verificación y vínculo correcto. |
| CUST-06 | Las versiones son append-only y las ediciones posteriores invalidan aprobación anterior. | Suites de versiones/revisión: hash original, edición nueva, aprobación previa invalidada. |
| ING-01 | Toda petición de ingesta identifica exactamente `volcado_id + version + sha256`. | SHA del cliente con formato correcto, SHA de servidor y SHA aprobado deben coincidir antes de llamar al núcleo. |
| ING-02 | La misma terna produce la misma identidad `io_id`; una identidad divergente es conflicto, no reemplazo. | Kernel calcula identidad determinista por volcado/versión; la UI persiste la identidad no vacía. |
| ING-03 | Estado `ingerido` y auditoría de éxito se confirman atómicamente. | `persistirIngestaExitosa` bloquea la fila, revalida aprobación y registra actualización + auditoría en la misma transacción. |
| ING-04 | Un timeout o error concurrente no degrada `ingerido` a `fallido`. | `persistirFalloIngesta` usa transición condicional y auditoría transaccional; prueba de retry desde `ingerido`. |
| ING-05 | Si la aprobación cambia durante la llamada al núcleo, el resultado no se asigna a la versión nueva. | Se revalida versión/SHA bajo bloqueo después de la respuesta; cambio concurrente devuelve HTTP 409 sin mutar estado. |
| ING-06 | Un HTTP 2xx sin `io_id` no prueba incorporación efectiva. | Prueba que obliga a rechazar el éxito incompleto y registra el fallo sin declarar `ingerido`. |
| IN-01 | Un volcado escrito manualmente puede archivarse sin inventar una obligación de audio. | `fuenteEntrada: "texto"` se distingue de micrófono, Chrome Live Caption y archivo de audio importado. |

## Archivos sensibles a regresiones

Cualquier cambio en estas superficies exige ejecutar las guardias relacionadas:

- `khora-web/app/components/ingreso/IngresoWorkspace.tsx` y `app/components/shared/IngresoView.tsx`: identidad estable de captura, bloqueo del contenido sellado, diferencia entre texto y audio.
- `khora-web/lib/server/dictado.ts`: sesión/partes/volcado, cifrado, hash, manifiesto y recuperación idempotente.
- `khora-web/app/api/audio/route.ts`, `app/api/audio/importar/procesar/route.ts`, `app/api/transcribir/archivo/route.ts`: verificación post-escritura; blob recuperable ante error de lectura/hash; registro solo como verificado después de leer, descifrar, recalcular SHA y vincular a sesión; staging retenido hasta ese cierre.
- `khora-web/app/api/ingesta/route.ts`: terna exacta, compuerta de aprobación, identidad `io_id`, estado y auditoría atómicos, tratamiento de errores y carreras.
- `khora-web/lib/server/volcados.ts` y `lib/server/correcciones.ts`: versión original sellada, invalidación de aprobación y auditoría del estado anterior real.
- `api/main.py` y `kernel/src/khora_kernel/poblacion/_ingestar.py`: procedencia y escritura idempotente del objeto de información.

## Compuertas locales de este corte

Comprobadas en la copia local del commit indicado:

| Comando | Resultado |
|---|---|
| `npm run typecheck` | PASS |
| `npm run ui:contract` | PASS |
| `npm run test:unit` | PASS · 339/339 |
| `npm run build` | PASS · build de producción |

Las pruebas nuevas viven en:

- `khora-web/tests/unit/custody-regression.test.ts`: siete escenarios de custodia, incluyendo retry idempotente, texto sellado alterado, manifiesto no persistido, hash sellado roto, parte de audio sustituida, texto manual sin audio y una guardia sobre retención de blobs/staging no verificados.
- `khora-web/tests/unit/ingesta.test.ts`: doce casos de ruta, incluyendo SHA ausente/discrepante, retry desde `fallido`/ `ingerido`, `io_id` ausente y aprobación invalidada durante la llamada al núcleo.

## No confundir PASS local con certificación global

La suite unitaria controla contratos y fallos simulados; no certifica por sí sola PostgreSQL, Blob o Neo4j reales. El ciclo E2E completo de ingesta está marcado `skip` y la compuerta `ING-DIRECT-01` en producción continúa bloqueante. Antes de certificar hay que demostrar con almacenamiento/grafo reales: primera ingesta, respuesta perdida, repetición idéntica, identidad `io_id` estable, ausencia de duplicados, conflicto de SHA, cambio concurrente de aprobación y fallo de vínculo del audio con recuperación del blob.

El PR #290 permanece abierto y no mergeado. No se debe eliminar ni degradar una guardia heredada, ni marcar el protocolo como certificado, hasta completar esas pruebas de integración y conservar los enlaces a sus resultados.


## Estado de validación del corte remoto actual · 2026-10-09

**SHA examinado:** `8682e3a26ea25113e893c523ccc16fb3c1d47512` · PR #290 abierto, sin merge.

- Los workflows de GitHub Actions asociados a ese SHA (`CI`, `UI Quality` y `khora-ok / gate`) están en fallo. Se reintentaron los jobs fallidos; los reintentos también terminaron en fallo.
- Los logs no pudieron recuperarse por la interfaz de GitHub disponible para esta sesión: la descarga devuelve `BlobNotFound`. **No se atribuye una causa específica a esos fallos sin logs o una ejecución reproducible.**
- La conexión RDC informa que no hay dispositivos conectados. Por ello no se pudo ejecutar otra ronda local en PC-7 después de los últimos cambios transaccionales.
- Hay resultados locales satisfactorios registrados en commits anteriores, pero los documentos históricos difieren entre 338/338 y 339/339 pruebas por cortes distintos. Ninguno de esos conteos se promociona a PASS del SHA actual.
- Los checks de preview de Vercel/Netlify aparecen en fallo por restricciones del plan del repositorio privado; deben separarse de los checks funcionales del código.

### Bloqueo vigente

La guardia de código está incorporada y documentada; la certificación del último SHA queda **PENDIENTE** hasta ejecutar sobre el código actual typecheck, UI contract, unitarias y build, y obtener evidencia del resultado de los workflows. Después siguen pendientes las pruebas E2E con PostgreSQL, Blob y grafo reales y la compuerta `ING-DIRECT-01` en producción.

No fusionar ni declarar el sistema protegido integralmente por la presencia de las barreras solamente.
