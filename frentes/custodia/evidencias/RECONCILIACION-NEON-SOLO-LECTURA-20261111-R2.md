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
