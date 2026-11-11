# R9 · Localizadores físicos, compuertas de read-back y derivados MP3

**Fecha de corte:** 2026-11-11  
**Frente/tarea:** CUSTODIA / CUSTODIA-01  
**Objetivo del ciclo:** determinar qué puede verificarse del almacenamiento físico y qué evidencia secundaria existe para las 44 sesiones con audio, sin descargar objetos ni exponer secretos.  
**Método:** inspección estática de código de main y SELECT de metadatos en Neon Production; lectura de metadatos no secretos de Vercel.  
**Resultado:** los 785 localizadores B2 coinciden con el host/región canónicos del código; los 254 localizadores Blob corresponden al proveedor legacy, pero Production no tiene la bandera que habilita sus lecturas. Hay derivados MP3 históricos en 19 sesiones, todos marcados incompletos. No se ejecutó GET/read-back en este ciclo.

## 1. Implementación canónica de referencias

| Archivo | Blob SHA | Comportamiento relevante |
|---|---|---|
| khora-web/lib/storage/object-reference.ts | 04139a09a6825dc323613f7802934c23cd90010c | B2 exige HTTPS, host exacto derivado de región, bucket exacto, sin credenciales/query/hash y clave segura khora/...; Blob legacy exige HTTPS y hostname *.blob.vercel-storage.com. |
| khora-web/lib/server/object-storage.ts | 6b923cea659ba86c82e48650411dfb7658924363 | B2 autentica con Master Application Key y valida capacidades, cuenta, bucket privado y SSE-B2. Blob legacy se rechaza antes del GET si la bandera de lectura no es true. |
| khora-web/lib/server/audio-mp3.ts | d8730b7078df84349cffab6fbc223ec1d94c01f6 | leerBlobVerificado() descarga, descifra KHC1 y compara longitud/SHA de bytes claros. El generador crea manifiesto-firma y derivados MP3 sin sustituir originales. |
| khora-web/lib/audio/custodia.ts | 1628a5841d26941546b58a4d62ef93d0d5e99266 | evaluarCustodiaAudio() valida continuidad de índices, bytes positivos, formato SHA y bandera DB verificado; no hace GET ni recalcula SHA físico. |
| khora-web/app/api/audio/sesion/[id]/exportar/route.ts | cf3ef7138da56c5f868ad233f17a9083f8b034e5 | Exportación física con NextAuth, posesión de sesión y Bóveda desbloqueada; limitada a una importación original de archivo en una sola parte. |
| khora-web/app/api/audio/importar/parte/route.ts | 2b02f5ea2a6ac040c51f6e9f9de5dcd25e1ee46f | La carga de staging B2 también exige NextAuth y reclamarSesion(); no es una vía retrospectiva para leer el inventario. |

## 2. Conciliación del proveedor y región de los localizadores

Consulta SELECT agrupada por proveedor y host (se omitieron paths y URLs completas):

| Proveedor declarado | Host devuelto por metadatos | Partes | Sesiones |
|---|---|---:|---:|
| B2 | s3.us-east-005.backblazeb2.com | 785 | 5 |
| Vercel Blob legacy | vyx9ei8q6dkhp4rv.public.blob.vercel-storage.com | 254 | 39 |

Metadatos no secretos de Production:
- KHORA_OBJECT_STORAGE=b2.
- KHORA_B2_REGION no figura como variable; el código usa por defecto us-east-005. La región por defecto coincide con el host B2 observado.
- KHORA_B2_MASTER_APPLICATION_KEY_ID, KHORA_B2_MASTER_APPLICATION_KEY, KHORA_B2_BUCKET_NAME y KHORA_B2_BUCKET_ID figuran como entradas sensibles, pero sus valores no se descifraron ni se obtuvieron.
- KHORA_LEGACY_BLOB_READS_ENABLED no aparece en el inventario de variables Production. El helper de código solo habilita legacy si process.env.KHORA_LEGACY_BLOB_READS_ENABLED === 'true'; en ausencia de la variable el lector falla cerrado con storage_legacy_temporarily_unavailable.

**Conclusión de referencias:** los 785 localizadores B2 son coherentes con host y región del contrato. No se validó bucket ni objeto porque el nombre de bucket y las credenciales permanecen ocultos; por tanto no se afirma disponibilidad física. Los 254 localizadores Blob son referencias reconocibles, pero la lectura legacy está deshabilitada según la configuración enumerada. Ninguno fue descargado.

## 3. Contrato real del read-back

leerBlobVerificado(url,bytes,sha):
1. valida que el host esté permitido;
2. llama a fetchStoredObject();
3. exige una respuesta legible;
4. descifra el envelope KHC1;
5. recalcula SHA-256 de los bytes claros;
6. compara longitud y huella con la fila de Neon.

Esta es la verificación física que falta para las partes originales. La bandera estado_verificacion='verificado' consultada en las 1.039 filas solo prueba que la base tiene esa marca; evaluarCustodiaAudio() no ejecuta los pasos anteriores.

La ruta GET /api/audio/sesion/[id]/exportar sí implementa descarga, descifrado y comparación de tamaño/SHA, pero requiere NextAuth del titular, posesión de sesión y desbloqueo de Bóveda. Además solo acepta fuente_audio='audio_archivo' (o driver equivalente), una única parte e índice 1. Rechaza una captura multiparte de micrófono/pestaña; no es una API general de read-back para las 44 sesiones. No se invocó.

## 4. Derivados MP3 en las sesiones con audio

SELECT sobre dictado_mp3 y dictado_mp3_historial, limitado al universo de 44 sesiones con audio:

| Indicador | Resultado |
|---|---:|
| Sesiones con audio | 44 |
| Filas actuales dictado_mp3 | 43 |
| Estado actual disponible | 18 |
| Estado actual fallido | 25 |
| Estado procesando/pendiente | 0 |
| Filas actuales con localizador y manifiesto | 19 |
| Historiales MP3 | 46 |
| Sesiones con historial MP3 | 19 |
| Historiales marcados captura_completa=true | 0 |
| Filas actuales marcadas captura_completa=true | 0 |

Los 19 registros actuales con localizador se reparten en 4 objetos derivados B2 y 15 Vercel Blob. El historial tiene 31 registros B2 en 4 sesiones y 15 registros Blob en 15 sesiones. El inventario de metadatos no entrega los objetos ni prueba disponibilidad actual.

La implementación actual de generarMp3Sesion():
- crea una huella source_manifest como SHA del objeto JSON formado por sessionId, booleano completo y lista ordenada de índices/bytes/SHA de las partes;
- lee cada fuente a través de leerBlobVerificado();
- genera MP3 cifrado y vuelve a leerlo/verificarlo antes de insertar el registro histórico;
- conserva el original y almacena derivados por separado.

Sin embargo, la tabla persiste el digest de source_manifest y el contador source_parts, no la lista completa de índices que originó cada derivado. Tampoco incluye SHA/commit de la versión del código que generó cada fila histórica. Por ello, el código actual describe un proceso con verificación física, pero no se atribuye automáticamente ese proceso a cada derivado histórico ni se considera una prueba de disponibilidad presente.

### 4.1 Sesión con discontinuidad de índice 317

Sesión 36eeb04c-bbe7-4b72-bb6a-5e0d23cffce9:
- 321 filas de partes observadas; el índice 317 no está presente.
- Fila MP3 actual: fallido, source_parts=293, captura_completa=false, 14 intentos y código genérico mp3_verificacion_o_conversion_fallida.
- 13 filas de historial, con source_parts entre 146 y 293; todas captura_completa=false.
- Los registros actuales/históricos tienen localizadores derivados, pero no se hizo GET.
- El digest de source_manifest no revela la lista de índices; no se puede afirmar que alguno de esos derivados contenga o sustituya la parte 317.

**Dictamen:** estos derivados son material secundario potencialmente útil para recuperar fragmentos de audio, pero no son el original por parte, no certifican la captura completa y no reparan el hueco 317. Deben preservarse; no se sobrescriben ni se eliminan.

## 5. Lista de sesiones con historial derivado

Los siguientes IDs tienen al menos una fila de dictado_mp3_historial. Se omiten hashes, URLs, paths, títulos y contenido. El contador corresponde a versiones históricas, no a partes originales:

| session_id | Historiales | Rango source_parts | Estado MP3 actual | Proveedor de localizador actual |
|---|---:|---:|---|---|
| 04752856-1ad2-4c26-903b-ff89859a939a | 1 | 2–2 | disponible | Blob |
| 0561243f-2019-4737-93ed-e6fa11cdb64e | 1 | 18–18 | disponible | Blob |
| 0bbc3139-7728-4b8d-ad48-f1886d6be9e2 | 1 | 2–2 | disponible | Blob |
| 0f754db1-a233-4f1b-b85c-a0bc0df22097 | 1 | 3–3 | disponible | Blob |
| 2223156f-2571-4dda-ab1d-eca59085f794 | 1 | 1–1 | disponible | Blob |
| 31328e01-2af9-4cd8-8ade-c45a61ce746d | 1 | 2–2 | disponible | B2 |
| 36eeb04c-bbe7-4b72-bb6a-5e0d23cffce9 | 13 | 146–293 | fallido | B2 |
| 45f0cf5e-d1af-46c3-95af-e9428b8b0f90 | 16 | 2–77 | disponible | B2 |
| 6fa58446-783a-4430-89e9-1a4642f071db | 1 | 4–4 | disponible | Blob |
| 895d35b5-a45b-4d21-951b-d6ff30837db0 | 1 | 6–6 | disponible | Blob |
| 8ef010c1-070f-4a35-8251-499a8db0be74 | 1 | 4–4 | disponible | Blob |
| 958afe80-9cf2-46b1-8289-3a4978accb26 | 1 | 5–5 | disponible | Blob |
| a03f283a-5794-4fe4-bb9e-cd4de7e73328 | 1 | 6–6 | disponible | Blob |
| b8362bce-55c2-48ed-ba06-327150ea3a61 | 1 | 1–1 | disponible | B2 |
| d44ffdf1-9719-4a5f-8471-5b1a0bc620fd | 1 | 2–2 | disponible | Blob |
| d4821ca0-d130-4555-ad35-805026868433 | 1 | 7–7 | disponible | Blob |
| de339103-3c54-40a6-8424-c2d2b59482e3 | 1 | 3–3 | disponible | Blob |
| e7989b68-b9e6-490a-bb0c-1d4d9f92e977 | 1 | 5–5 | disponible | Blob |
| fc2398e1-7d47-43d6-8acd-8cc67f23c55a | 1 | 2–2 | disponible | Blob |

## 6. Dictamen operativo

1. **B2:** los host/region de 785 localizadores son coherentes con el contrato y selector actual. El acceso físico sigue bloqueado en este canal por credenciales ocultas; falta validar bucket privado y hacer GET/descifrado/SHA por cada objeto.
2. **Blob legacy:** los 254 localizadores son reconocibles, pero la variable de habilitación de lectura legacy no aparece en Production; el lector actual falla cerrado. No se habilita el legacy ni se cambia config dentro de este ciclo.
3. **Derivados MP3:** 46 registros históricos en 19 sesiones ofrecen pistas de material secundario; los 46 están marcados incompletos. No sustituyen a los originales ni permiten deducir la parte 317.
4. **Exportación autenticada:** el endpoint disponible requiere sesión del titular y Bóveda desbloqueada, y solo exporta un archivo importado de una parte. No es utilizable como lector general de las capturas multiparte desde el canal actual.
5. **Archivo canónico:** ningún derivado MP3 ni su hash se usa como atajo para crear el Volcado primario. Se mantiene la ruta de guardarDictado() después de resolver identidad, texto/checkpoint, manifiesto original y lectura física.

## 7. No-acciones

No se realizó GET/list B2, GET Blob, descifrado, transcripción, exportación, generación MP3, consulta de secretos, escritura Neon, Volcado nuevo, carga/copia ni eliminación. Solo SELECT de metadatos y lectura de código. No se usaron monitor, Chrome local, RDC ni IndexedDB.

**Inventario base sin cambio:** 79 sesiones sin Volcado, 1.039 partes originales por metadata, 785 localizadores B2 y 254 Blob; 29 checkpoints textuales potencialmente significativos; 216 fragmentos locales no accedidos por el canal excluido. Ningún registro se declara recuperado o perdido. CUSTODIA-01 permanece EN CURSO.
