# Evidencia · conciliación Neon de sesiones, hashes y manifiestos B2

Fecha de corte operativo: 2026-11-10
Fuente: proyecto Neon `khora`, branch `main` (`br-gentle-band-ah23rczb`), lectura SQL SELECT-only.
Repositorio de código contrastado: `SeryMente/khora`, `main`.
Alcance: metadatos, conteos, estado de verificación, SHA almacenado y relaciones. No se seleccionaron textos de checkpoints, snapshots, URLs completas, tokens ni bytes de audio.

## 1. Predicado de titularidad

Se usó el mismo predicado del backend KHORA: `COALESCE(dictado_session.custodia_owner, dictado_session.checkpoint_usuario) = propietario autenticado`. Esto incluye sesiones históricas que tienen `custodia_owner` NULL pero conservan `checkpoint_usuario`; contarlas solo por `custodia_owner` las excluiría indebidamente.

El universo devuelve 84 sesiones: 5 vinculadas a Volcados y 79 sin vínculo. De las 84, 83 tienen `checkpoint_text` no vacío, 46 conservan revisiones de checkpoint, 49 tienen partes de audio y 47 tienen registro MP3.

## 2. Las 79 sesiones sin vínculo

| Indicador | Resultado |
|---|---:|
| Sesiones sin vínculo | 79 |
| Con checkpoint_text no vacío | 78 |
| Con alguna revisión de checkpoint | 46 |
| Con partes de audio | 44 |
| Partes B2 | 785 |
| Partes Blob | 254 |
| Partes totales | 1.039 |

Las cinco sesiones ya vinculadas contienen las 294 partes restantes del universo del propietario (267 B2 y 27 Blob). Por tanto, el total de titularidad observado es 1.333 partes: 1.052 con localizador B2 y 281 con localizador Vercel Blob.

## 3. Conciliación de SHA con Volcados existentes

En 29 de las 79 sesiones sin vínculo, al menos una revisión de checkpoint tiene un SHA coincidente con un Volcado del mismo propietario. Se evaluó además el manifiesto de audio, comparando el conjunto ordenado de índice, bytes y SHA de cada parte. Resultado:

| Relación observada | Sesiones | Partes | Proveedor en las sesiones candidatas |
|---|---:|---:|---|
| SHA de texto coincidente y manifiesto de audio idéntico | 4 | 48 | Blob |
| SHA de texto coincidente, sin audio en la sesión | 21 | 0 | — |
| SHA de texto coincidente y manifiesto de audio diferente | 4 | 708 | B2 |

Esta comparación sirve para evitar duplicados no intencionados, pero no es una instrucción de deduplicación automática. Los 4 casos con texto y manifiesto idénticos son candidatos fuertes a duplicado; requieren cotejo antes de crear otro Volcado. Los 21 casos solo prueban que existe texto coincidente, mientras el contenido de audio difiere o está ausente. Los 4 casos de manifiesto distinto preservan un audio distinto y no deben darse por archivados solo por coincidir el texto.

Las otras 50 sesiones no muestran una coincidencia de SHA de revisión con un Volcado del propietario. Se desglosan así:

| Grupo | Sesiones | Detalle |
|---|---:|---|
| Texto + audio histórico Blob | 35 | 206 partes; Blob suspendido |
| Texto + audio B2 | 1 | 77 partes; sin coincidencia SHA de texto |
| Solo texto con revisiones | 12 | 1.020 revisiones; sin partes de audio |
| Solo texto sin revisiones | 1 | Una sesión |
| Sin texto ni audio | 1 | No se identificó contenido recuperable |

## 4. Gate de integridad de las cinco sesiones B2 sin vínculo

| Indicador | Resultado |
|---|---:|
| Sesiones B2 | 5 |
| Partes B2 | 785 |
| Bytes declarados | 64.166.900 |
| Filas `estado_verificacion='verificado'` | 785 |
| SHA-256 con formato válido | 785 |
| Filas con bytes no positivos | 0 |
| Manifiestos contiguos | 4 sesiones · 464 partes |
| Manifiestos con hueco | 1 sesión · 321 filas |

Los cinco registros de sesión aparecen en estado `checkpoint` y `total_partes` es NULL. En cuatro manifiestos, las posiciones son 1..N sin huecos. En el quinto hay 321 filas, pero falta el índice 317 y el rango se extiende más allá de 321. La función `evaluarCustodiaAudio` (código `khora-web/lib/audio/custodia.ts`, `main`) exige índices únicos dentro del total esperado y presencia de cada posición desde 1. `guardarDictadoConSesion` pasa la cantidad de filas persistidas como total esperado; por lo tanto ese manifiesto será rechazado hasta reconciliar la parte faltante o corregir el manifiesto por la vía canónica.

**Importante:** el estado `verificado` y el SHA almacenado son evidencia del control ejecutado al subir el objeto. No certifican GET actual ni que los bytes actuales de B2 coincidan con el hash. Sigue pendiente una lectura física con descifrado, cotejo de longitud y SHA recalculado.

## 5. Código y flujo canónico

- `khora-web/app/api/dictado/route.ts` expone el POST de archivo y requiere sesión NextAuth (`auth()`), valida texto o audio original verificado, reclama la sesión y llama a `guardarDictado`.
- `khora-web/lib/server/dictado.ts` compara las partes enviadas por el cliente con las filas persistidas, evalúa custodia y manifiesto, y crea el Volcado y los vínculos en una transacción. Si la sesión está marcada `complete` sin Volcado vinculado, rechaza crear otro automáticamente.
- `khora-web/app/api/audio/[id]/route.ts` exige bóveda desbloqueada, sesión autenticada y Volcado propio antes de leer las partes; descifra los bytes y recalcula SHA.
- El token manual MCP vigente solo admite scopes de lectura (entre ellos `volcados:read`); no ofrece una herramienta MCP de archivo. No se usará acceso SQL directo para simular el POST canónico.

## 6. Estado de proveedores y siguientes gates

- B2 Production: preflight aprobado para autenticación nativa, Master Key, identidad y privacidad del bucket y SSE-B2. Falta GET/read-back por objeto.
- Vercel Blob `khora-audio`: `limits-exceeded-suspended`; las 254 partes Blob de las sesiones candidatas siguen bloqueadas físicamente hasta la restauración del store. No habilitar `KHORA_LEGACY_BLOB_READS_ENABLED` antes de GET físico satisfactorio.
- IndexedDB local autorizado: solo se conoce la presencia de los archivos físicos del origen. No se leyó ni descifró contenido ni se acreditó que correspondan al conjunto de 216 fragmentos esperado.

## 7. No-acciones

Todas las consultas fueron SELECT. No se actualizó, insertó ni eliminó ninguna fila; no se alteró ningún objeto B2/Blob; no se leyeron ni revelaron ciphertexts de checkpoint; no se creó Volcado; no se cambió código, variable, deployment o bóveda.