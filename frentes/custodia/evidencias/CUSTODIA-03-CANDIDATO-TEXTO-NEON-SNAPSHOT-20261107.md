# CUSTODIA-03 · Evidencia de candidato de texto en snapshot Neon no productivo · 2026-11-07

## Identificación del entorno y procedencia

- Proyecto Neon observado: `khora`.
- Rama consultada: `custodia-b2-migration-test-20261031`; rama no predeterminada, estado `ready`.
- Rama creada: 2026-10-31 20:51:42 UTC.
- Parent timestamp del snapshot: 2026-10-31 20:42:02 UTC.
- La rama permanece separada de `main`; las consultas fueron de solo lectura.
- Se distinguieron dos bases de datos:
  - `custodia_b2_e2e`: contiene las tablas dedicadas a B2/audio, pero el tamaño de datos informado para `custodia_blob_b2_migration`, `dictado_audio_parte`, `dictado_mp3`, `dictado_mp3_historial` y `volcado` fue 0 bytes. Sus tamaños de índice no se interpretan como datos.
  - `neondb`: copia de datos existente en el snapshot; contiene `dictado_checkpoint`, `dictado_session`, `dictado_audio_parte`, `dictado_mp3`, `dictado_mp3_historial` y `volcado`.
- Neon Object Storage figuró habilitado en la rama, pero el listado de buckets devolvió vacío. Esto no informa sobre Backblaze B2 ni Vercel Blob.

## Consulta agregada del candidato

Filtro temporal: sesión creada entre 2026-10-28 20:29:00 y 20:30:00, zona `America/Mexico_City`. No se devolvió ni registró el `session_id`.

| Indicador | Resultado |
|---|---:|
| Sesiones candidatas | 1 |
| Revisiones/checkpoints | 264 |
| Revisiones únicas | 264 |
| Filas con texto no vacío | 264 |
| Filas con snapshot no vacío | 264 |
| Longitud mínima de texto por revisión | 87 caracteres |
| Longitud máxima de texto por revisión | 7,197 caracteres |
| Suma de longitudes de texto | 769,749 caracteres |
| Primera marca `client_at` | 2026-10-28 20:29:10.149, hora local |
| Última marca `client_at` | 2026-10-28 20:41:22.892, hora local |
| Estado de sesión | `checkpoint` |
| `total_partes` declarado | 0 |

## Cotejo agregado de referencias de audio

Para la misma sesión, sin seleccionar URLs, hashes, bytes de objetos ni identificadores:

| Indicador | Resultado |
|---|---:|
| Filas `dictado_audio_parte` | 0 |
| Partes verificadas | 0 |
| Partes no verificadas | 0 |
| Bytes de audio sumados en la tabla | 0 |
| Partes con referencia `blob_url` | 0 |
| Filas `dictado_mp3` | 0 |
| Filas `dictado_mp3_historial` | 0 |
| `volcado_id` no nulo | 0 |
| Filas `volcado` vinculadas | 0 |
| Vinculaciones de `audio_url` | 0 |
| Partes enumeradas desde `volcado.audio_partes` | 0 |

## Comparación de ventanas

Una consulta por `dictado_checkpoint.client_at`, usando el intervalo 2026-10-28 17:08:00–2026-10-29 00:00:00 hora local, devolvió en este snapshot:
- 2 sesiones con checkpoints dentro de la ventana.
- 268 checkpoints acumulados.
- Una sesión con 264 checkpoints; una sesión adicional con 4.
- La sesión de 264 tiene su primera marca de cliente en el minuto 20:29.

Este corte no coincide con el inventario C014 anterior de siete sesiones/1,038 checkpoints. No se sustituye ni invalida el dato C014: se trata de otro snapshot/consulta y la diferencia permanece abierta hasta reconciliar fuente, corte temporal, rama y criterio de selección. La consulta de sesiones por `dictado_session.creado_en` tampoco es intercambiable con contar checkpoints por `client_at`.

## Dictamen

- **Candidato de texto localizado en el snapshot:** sí; la coincidencia temporal y de 264 revisiones respalda que existe una sesión candidata para cotejar.
- **Identidad con el dictado que busca el operador:** NO CONFIRMADA. No se leyó el contenido de texto ni se cotejó con la descripción que el operador espera.
- **Texto/checkpoints presentes en la copia:** los contadores y longitudes confirman filas no vacías; no se ha leído ni exportado su contenido.
- **Audio de esta sesión en las tablas consultadas:** no aparece asociación en las tablas de partes, MP3, historial MP3 ni `volcado` de este snapshot. Esto no prueba ausencia de objetos externos en B2/Vercel Blob, ni de otros registros fuera del snapshot.
- **Recuperación:** no realizada. No se copió, descifró, descargó ni restauró contenido. No hubo escritura en Neon ni en almacenamiento.
- **Seguridad:** las consultas devolvieron exclusivamente agregados y metadatos de esquema; no se seleccionaron `texto`, `snapshot`, URLs, hashes, session IDs, nombres de usuario, credenciales ni bytes.
- **Entorno:** esta rama es una copia de no producción, pero `neondb` procede de un snapshot de la rama principal y puede contener datos reales de usuarios. Por eso no se asume que el solo nombre “migration-test” convierta el contenido en sintético.

## Siguiente paso

Solicitar autorización específica para inspeccionar internamente, sin reproducir en chat ni persistir en GitHub, el contenido textual del único candidato de 20:29 con el fin de cotejarlo con el dictado ausente. Si se confirma que corresponde, preparar una restauración en un destino separado, bajo el control del propietario y de la bóveda aplicable, y verificar lectura de vuelta antes de declarar recuperado. No modificar ni borrar el original. En paralelo, continuar la lectura física autorizada de las fuentes B2 y Vercel Blob para determinar si existe audio asociado fuera de Neon.

## Procedencia técnica

- Ramas/proyecto enumerados mediante APIs de metadatos Neon.
- Esquema y restricciones leídos con `describe_branch`, `get_database_tables` y `describe_table_schema`.
- Agregados leídos con consultas `SELECT` exclusivamente sobre la rama `custodia-b2-migration-test-20261031`, base `neondb`.
- No se consultó la rama predeterminada `main` ni se ejecutó SQL en producción.
- No se usó ni modificó la estación RDC local.
