# Reconciliación de solo lectura Neon · CUSTODIA-01 · 2026-11-11 · R2

## Alcance y método

Consulta directa de solo lectura sobre Neon Production, proyecto `still-sunset-02412999`, rama `main` (`br-gentle-band-ah23rczb`). Se consultaron únicamente metadatos de titularidad, vínculos de sesión, checkpoints cifrados, revisiones, partes, proveedor declarado, bytes, índices, estados de verificación y SHA almacenados.

No se leyó texto en claro ni se descifraron checkpoints o audio. No se ejecutó ningún `INSERT`, `UPDATE`, `DELETE`, migración ni operación de almacenamiento. Los conteos y las huellas SHA de esta evidencia son metadatos de Neon; no sustituyen lectura física del proveedor ni recálculo de hash sobre bytes descargados.

## Inventario de titularidad y vínculo

La selección usó el predicado de propiedad de la aplicación: `custodia_owner` o `checkpoint_usuario` igual al propietario del registro.

| Métrica | Resultado |
|---|---:|
| Sesiones del propietario | 84 |
| Sesiones ya vinculadas a Volcado | 5 |
| Sesiones sin Volcado vinculado | 79 |
| Sesiones sin vínculo con audio | 44 |
| Partes de audio sin vínculo | 1.039 |
| Sesiones sin vínculo, solo texto | 34 |
| Sesiones sin vínculo, sin texto ni audio localizado | 1 |

## Distribución de objetos por proveedor

| Proveedor declarado por localizador | Sesiones | Partes | Bytes declarados | Filas `verificado` | SHA-256 con formato válido |
|---|---:|---:|---:|---:|---:|
| Backblaze B2 | 5 | 785 | 64.166.900 | 785 | 785 |
| Vercel Blob legacy | 39 | 254 | 339.392.008 | 254 | 254 |
| **Total** | **44** | **1.039** | **403.558.908** | **1.039** | **1.039** |

La condición `estado_verificacion='verificado'` acredita lo que la base registra, no la disponibilidad actual del objeto ni la igualdad entre el contenido físico actual y el SHA almacenado.

### Manifiestos B2 individualizados

| session_id | Partes | Intervalo | Huecos | Bytes declarados |
|---|---:|---:|---:|---:|
| `754c8c26-bf25-4504-babe-59045af90d6c` | 384 | 1–384 | 0 | 31.399.633 |
| `36eeb04c-bbe7-4b72-bb6a-5e0d23cffce9` | 321 | 1–322 | **1: falta 317** | 26.383.710 |
| `31328e01-2af9-4cd8-8ade-c45a61ce746d` | 2 | 1–2 | 0 | 84.283 |
| `45f0cf5e-d1af-46c3-95af-e9428b8b0f90` | 77 | 1–77 | 0 | 6.251.747 |
| `b8362bce-55c2-48ed-ba06-327150ea3a61` | 1 | 1–1 | 0 | 47.527 |
| **Total** | **785** | | **1 manifiesto incompleto** | **64.166.900** |

Cuatro manifiestos son contiguos y reúnen 464 partes. El quinto contiene 321 filas, pero el índice 317 falta dentro del intervalo 1–322. No se inventa ni rellena esa parte. Los cinco manifiestos tienen sus filas marcadas como verificadas y con SHA almacenado de 64 dígitos; sigue pendiente un GET físico y el cotejo de longitud, bytes y SHA de cada objeto.

## Reconciliación de las 34 sesiones textuales sin audio

Se comparó el SHA del checkpoint vigente con los SHA de Volcados del mismo propietario. Por separado se comprobó si alguna revisión anterior de `dictado_checkpoint` coincide con un Volcado.

| Clasificación del checkpoint vigente | Sesiones |
|---|---:|
| SHA del texto vacío (4 coinciden con Volcados de 0 caracteres) | 4 |
| SHA de un único salto de línea | 1 |
| Checkpoint con contenido potencialmente significativo | 29 |

Dentro de las 29 sesiones potencialmente significativas:

- 17 tienen al menos una revisión histórica cuyo SHA coincide con un Volcado existente; sin embargo, el SHA del checkpoint más reciente no coincide. La coincidencia antigua no justifica descartar el estado actual ni duplicar automáticamente el Volcado histórico.
- 12 no tienen coincidencia de SHA en las revisiones con Volcados existentes. Una de estas 12 carece de filas de revisión.
- La sesión `48586f80-63d6-4969-9691-27e55cb5d5f5` es ese candidato sin revisiones: checkpoint cifrado `khc1.`, 24.853 caracteres de ciphertext, SHA vigente almacenado, cero partes de audio y ningún Volcado con SHA coincidente. Su contenido en claro no se leyó. Sigue pendiente su recuperación por el flujo autenticado.

Los cuatro checkpoints vacíos ya coincidentes se clasifican como vacíos, no como cuatro dictados sustantivos adicionales. La sesión de un salto de línea tampoco se promueve a dictado sustantivo sin revisión del contenido.

## Compuertas técnicas observadas

- `GET /api/dictado/checkpoint` requiere una sesión NextAuth y filtra por el correo del propietario.
- `POST /api/dictado` también requiere NextAuth y usa `reclamarSesion()` + `guardarDictado()` para aplicar propiedad, idempotencia, transacción y vínculo canónico.
- La ruta de lectura de una parte de audio exige además cookie de bóveda desbloqueada y propiedad del Volcado.
- `fetchStoredObject()` es una función interna del servidor; no se encontró una ruta pública independiente que permita invocarla con una identidad de propietario autorizada.
- El preflight B2 conocido verifica autenticación/configuración y la identidad/privacidad del bucket; no descarga los 785 objetos históricos.

### Aclaración de la API auxiliar de ingesta a Neo4j

La revisión ampliada también localizó `api/main.py`, blob `bae368f07159b99c31b6c97f2bde64fb7936e57b`: `POST /api/v1/ingesta` acepta una tupla de procedencia (`volcado_id`, versión y SHA) y envía el objeto al motor de Neo4j mediante `ingestar()`. El middleware valida una cabecera `X-Khora-Key` frente a `KHORA_API_KEY` del servicio. Es autenticación servicio-a-servicio, no identidad de usuario ni creación de un Volcado canónico en Neon.

La envoltura web `khora-web/app/api/ingesta/route.ts`, blob `f8b97837c1308525c0f1b6189c6fbd6dce321746`, exige `auth()`, comprueba un Volcado existente con versión y SHA aprobados y después llama al motor. Ese flujo es ingesta secundaria de un Volcado ya archivado; no restaura un checkpoint ni sustituye `POST /api/dictado`/`guardarDictado()`. No se llamó a ninguno de esos endpoints y no se leyeron los valores de sus claves.

Por tanto, este ciclo **no acredita GET físico ni archivo**. No se creó ni vinculó ningún Volcado. El estado del Blob no se reconsultó en esta consulta.

## Siguiente secuencia técnica

1. Conseguir un canal de ejecución de servidor ya autorizado para el propietario, que no dependa de la interfaz, del monitor, del Chrome local ni de RDC. No fabricar identidad ni extraer cookies.
2. Ejecutar la lectura canónica de los checkpoints de texto; comparar plaintext y SHA, y archivar mediante la función/ruta canónica, con read-back del Volcado y de su vínculo.
3. Hacer GET físico de cada una de las 785 partes B2 de los cinco manifiestos. Verificar bytes, longitud y SHA sobre los bytes descargados; detener solamente el manifiesto con hueco 317 hasta localizar evidencia de esa parte.
4. Mantener las 254 partes Blob como localizadas por metadata, pero no disponibles hasta que el proveedor permita GET real. No borrar ni reescribir localizadores.
5. Resolver las 17 coincidencias de revisiones históricas comparando cada checkpoint más reciente; no deduplicar por coincidencias de revisiones antiguas.

## Límites y no-acciones

No se usó interfaz, navegador, monitor ni RDC. No se obtuvieron secretos, cookies ni plaintexts. No se escribieron datos en Neon, B2 o Blob; no se modificaron variables, credenciales, configuración, código ni despliegues. La fuente original y todos sus localizadores permanecen intactos.

**Dictamen:** conciliación de metadatos ampliada; 29 checkpoints textuales potencialmente significativos y 785 objetos B2 quedan individualizados. El archivado y la lectura física siguen pendientes. La base no permite declarar estos objetos recuperados solo por el estado histórico `verificado`.


## Anexo A · Índice por sesión de los 29 checkpoints vigentes potencialmente significativos

El SHA que aparece aquí es `dictado_session.checkpoint_sha256`, calculado por la aplicación sobre el texto del checkpoint antes de cifrarlo. El número de caracteres corresponde al ciphertext `checkpoint_text`, no al texto en claro. `Coincidencia rev. antigua` indica si alguna fila de `dictado_checkpoint` anterior coincide por SHA con un Volcado existente; no implica que el checkpoint vigente esté duplicado.

| session_id | SHA-256 vigente | ciphertext chars | revisiones | coincidencia rev. antigua | actualizado UTC |
|---|---|---:|---:|---|---|
| `544cf4cc-d945-4e2e-a7ba-6b4d65191f35` | `880de32b36e011b12bd9c3f065021789bf8fbdf344b157f9b38c7411e924bc00` | 8.723 | 248 | Sí | 2026-11-07 20:33:01 |
| `81487e9f-07ed-40b5-849e-ee181caff991` | `aa04e7627eaa121dea1db7ae77246ee176b90a2a1ad0c29b778ea3f26681cd02` | 724 | 32 | Sí | 2026-11-07 18:26:26 |
| `148afcb4-f901-4747-836d-740ad05d2cf6` | `137b73b9bbce381bdfd2173c6dcf3a3f4e66bed2821da5f3de869a81bbdf4f19` | 8.244 | 142 | Sí | 2026-11-06 23:30:19 |
| `ebf759cd-e4c8-4cf0-8b7e-0eadd2af3328` | `c1bc68f00294e38f8802119efd85cbbb75e2056dc6d7b01fd905019884ee51bd` | 959 | 29 | No | 2026-11-06 20:07:32 |
| `48bca637-c5ce-4621-a82e-9747eb40d960` | `795dd9c51d1f65b2ffd06b5dcc7a44bc9da54aa9e806ff645e45cfe5922aa9b4` | 3.715 | 112 | Sí | 2026-11-06 19:44:59 |
| `3b308ea3-a86e-4e95-8829-87bdd61fba0a` | `2bae8f467825a2ab9c913675a49696ac5b8f5f8fcee8bba9d65e0a9327eed471` | 284 | 11 | Sí | 2026-11-06 19:38:18 |
| `413d88d8-a9cd-4aec-9523-118b099e12e1` | `5fd924625f6ab16a19cc9807c7c506ae1813490e4ba675f843d5a10e0baacdb8` | 53 | 3 | No | 2026-11-06 19:32:41 |
| `79481287-4651-4a20-bd39-71fcda236bdf` | `1fc1274e2e7c9472f7f7392fedd917e43f293efd9d4c44c6c33a76b5270d7a62` | 8.196 | 237 | No | 2026-11-02 02:24:02 |
| `12484958-aba8-4709-8e7e-d3b8e45bf0fd` | `077645d6c3aed4870b2514eaea4e3ddfb52d268fad885797882868db619cd5ac` | 2.839 | 96 | Sí | 2026-11-01 02:01:09 |
| `62d597b9-3201-4a34-a659-ea8c764c13cd` | `e9d37ee35d6adde440f73bcba383daae58ff3f518df726d86462cb8985cb1f63` | 4.817 | 130 | Sí | 2026-10-31 02:36:59 |
| `e923c919-582f-4c8d-8161-f46171aafc59` | `d6ffb1d9ad162533e7fce61a78d82b8f604581751e8ede32b0e67a1c7e07c1dc` | 6.857 | 264 | No | 2026-10-29 02:41:22 |
| `f4775bb4-139e-422a-abc8-18dff611bc99` | `5f7d9884ebf3688764eb65a7c53cd32131287146efe3c72a9f1e6523c4723f10` | 12.592 | 369 | No | 2026-10-28 23:08:29 |
| `39cfff67-a2c7-4984-bee8-7dc20333cb75` | `252f4291bd5c64e5bde747c7b358dfb458389f5b915c97de5eff2f316943024c` | 3.197 | 89 | Sí | 2026-10-24 19:34:13 |
| `a7bf9d3c-fac5-41bd-9c30-8ad7fc5f9ed2` | `3c0aef7f0764a6c2b0fd490ddbdcded0e90a601573053e4c0829f7efc085fb8a` | 39.020 | 1.183 | Sí | 2026-10-23 21:09:47 |
| `41c3a57d-d914-4f0b-be11-1df0bb529a0b` | `f9151dac6adab9dfa2a4a9a82a6c08a414e559d234f4ddf0f3cc9a08169b1150` | 16.447 | 330 | Sí | 2026-10-22 23:34:12 |
| `070fbe7c-e809-46e5-b5d7-efb90ded31bf` | `d7173c207621dcc72c2959eb184bf25d2e5484c83d63f58da5358faa88a8b6af` | 76 | 11 | Sí | 2026-10-22 23:10:32 |
| `80238c7f-f66f-4559-8a40-b49bd5280956` | `a1e43568c8919e74e77e0050c628c20f5e2b0c0444e49d857d8e391564e2ebc7` | 12.719 | 198 | Sí | 2026-10-20 02:39:18 |
| `382cf5d1-2c80-44a4-94fa-bf5dfad0ba6d` | `34a5886ccc68b89cd8a65002387c4d53c3373cafd652c615bb5a1daf953572e4` | 104 | 1 | No | 2026-10-20 02:15:15 |
| `ed928635-8b11-4f58-9c2d-f508fc8ae058` | `f88b195ff0336ed4d131c830bb7cacaf93ae2b9048c2c6881b23018b57bafee7` | 141 | 2 | No | 2026-10-19 21:50:26 |
| `7e446fb8-9df9-4a27-918c-f614a433bf9c` | `d4053d77dfa1127bffff0b99bb42a55334cbe4f56ba2cf97788dd1b952b489c9` | 12.135 | 259 | Sí | 2026-10-19 17:39:00 |
| `ae423b97-3ecd-4fa2-9dbf-191a99e53995` | `932b4f49f203a40e57987f7eff34c7c489fe95883ec5e53168b444c9b418fb25` | 31.959 | 15 | No | 2026-10-19 16:28:14 |
| `0668dd82-3057-4e42-9820-50b4abc2b468` | `932b4f49f203a40e57987f7eff34c7c489fe95883ec5e53168b444c9b418fb25` | 31.959 | 15 | No | 2026-10-19 02:39:22 |
| `856b0259-5ecb-4f90-b6c4-682e649b9070` | `50e96ba342de04d1c73eb5c3eb56cceacbe2106526751b045552e575561c93be` | 14.199 | 251 | Sí | 2026-10-19 02:23:25 |
| `22f3c50d-255f-439b-af79-1aad136d4822` | `932b4f49f203a40e57987f7eff34c7c489fe95883ec5e53168b444c9b418fb25` | 31.959 | 6 | No | 2026-10-19 01:59:23 |
| `0e7c10e7-f3bb-4a2b-84b5-8338786a856e` | `dccd3cd8c7c9a592c1fe8a0f49fde8ea30ed24b7bb53170a0d8ed85e09c4aecd` | 33.777 | 712 | Sí | 2026-10-18 21:48:17 |
| `c8a5671b-3be8-47ab-98aa-03e816945590` | `c5bb1cb4796f32581652c2743aea2d3d05dabd96d77983cb5cb8d890b6e86e5d` | 1.517 | 25 | Sí | 2026-10-18 21:01:42 |
| `9366c3d7-8688-40c4-aa42-9a3180763ef1` | `5c8011542ffbe42408201afbca1fdb1c4a4c3e510486edb9f65a4329e92c3c59` | 2.297 | 66 | No | 2026-10-17 22:59:52 |
| `156d389d-a87b-4847-a3f7-beaf20d6e3ba` | `9378e619cf2c6cc41a856b11b038c1991e2fd45a7f8e06aa57ca4f76c6742d37` | 64 | 3 | Sí | 2026-10-17 22:39:25 |
| `48586f80-63d6-4969-9691-27e55cb5d5f5` | `6bfe50dbdc1cdd1419788a715f552e2dcc054d91e44296f328e23a6261754396` | 24.853 | 0 | No | 2026-10-15 17:55:00 |

**Resultado interno:** 29 sesiones, 27 huellas SHA vigentes distintas. Una huella se repite en tres sesiones (`ae423b97…`, `0668dd82…`, `22f3c50d…`). Las tres son candidatas a equivalencia textual exacta, pero la procedencia entre capturas todavía debe reconciliarse; no crear tres Volcados ni descartar dos sesiones por automatismo. Confirmar contenido descifrado y el contexto de cada sesión antes de decidir si son repeticiones del mismo dictado o capturas independientes de texto igual.
