# R10 · Lectores server-side existentes y compuerta de identidad/MCP

**Fecha:** 2026-11-11  
**Frente/tarea:** CUSTODIA / CUSTODIA-01  
**Objetivo del ciclo:** identificar rutas server-side existentes que ya ejecuten read-back físico y comprobar si pueden leer sesiones pendientes sin crear un actor ni eludir NextAuth.  
**Resultado:** existe una herramienta MCP estrictamente de lectura, khora_leer_audio, que acepta sessionId sin Volcado y ejecuta leerBlobVerificado(); también existe GET de MP3 derivado por sessionId. Ambas requieren identidad del titular; MCP exige además turno normativo y permanece desactivado. Las rutas REST originales requieren NextAuth/Bóveda y varias exigen Volcado. No se invocó ninguna.

## 1. Lector MCP de partes originales: capacidad demostrada por código

Fuentes:
- khora-web/lib/server/mcp-audios.ts — blob SHA d18620bb908951807c7b6a7683e08af5e0f75c4d.
- khora-web/app/api/mcp/route.ts — blob SHA 0b103032fcd3df22531b0438d5a94b4a47aa9948.
- khora-web/lib/server/mcp-tool-contract.ts — blob SHA 65e12aa8bf22b87bd9a193e50f08c17721815dca.
- khora-web/lib/server/mcp-db.ts — blob SHA 364ba7691ff73184b21b803dce4c1422068366a0.

La herramienta khora_leer_audio:
1. acepta sesión, UUID de Volcado o folio;
2. consulta la sesión con la identidad actor suministrada por el token y el predicado de propietario COALESCE(custodia_owner,checkpoint_usuario,volcado.usuario);
3. no exige que volcado_id exista, por lo que su contrato cubre capturas todavía no archivadas;
4. carga metadatos de la parte solicitada y exige estado DB verificado;
5. recupera el objeto mediante leerBlobVerificado(), que ejecuta fetchStoredObject(), descifra KHC1 y compara tamaño/SHA de bytes claros;
6. entrega los bytes reales en Base64 por bloques de hasta 262.144 bytes, con SHA, offset y siguiente_offset.

El scope activo de ambas herramientas khora_listar_audios y khora_leer_audio es volcados:read. El acceso MCP requiere Bearer token cuyo sujeto es el titular. Las herramientas sustantivas se registran mediante gatedTool() con withNormTurn() y exigen _norm_turn_token, modo y formato de salida; la lectura de audio también queda detrás de esa compuerta. La herramienta utiliza la base de lectura de MCP, no una conexión de escritura de negocio.

**Límite normativo:** MCP normativo permanece DESACTIVADO. No se abrió turno normativo ni se llamó a khora_leer_audio. No existe aquí un token Bearer del titular y no se creó uno. Aunque este lector sería la ruta de código más directa para verificar físicamente las partes originales, no se activa ni se invoca mientras la compuerta vigente siga cerrada.

## 2. Lectores REST ligados al titular

| Ruta | Identidad/condición | Alcance y límite |
|---|---|---|
| GET /api/audio/sesion/[id]/exportar | NextAuth, poseeSesion y Bóveda desbloqueada | GET/descifra/verifica tamaño y SHA; solo una importación original audio_archivo de una parte/índice 1. No es lector de capturas multiparte. |
| GET /api/audio/[id] | NextAuth, poseeVolcado e Bóveda desbloqueada | Resuelve por Volcado/folio; no admite una sesión huérfana sin Volcado. |
| GET /api/audio/[id]/parte/[index] | NextAuth, poseeVolcado y Bóveda desbloqueada | Recupera parte de un Volcado/folio existente; no resuelve el universo de 79 sesiones sin Volcado. |
| GET /api/audio/[id]/mp3 | NextAuth y Bóveda desbloqueada; la consulta de acceso acepta Volcado, folio o sessionId con predicado del titular | Recupera un MP3 derivado disponible mediante leerBlobVerificado(); no es el audio original por partes. |
| POST /api/audio/[id]/mp3 | Las mismas condiciones de GET | Inserta fila MP3 si falta y programa generarMp3Sesion() mediante after(); es mutativo y secundario. No se invocó. |
| GET /api/transcribir/dialogo?sessionId=...&fuente=... | NextAuth; cargarAudioDialogo valida propietario en Neon | Devuelve la pista original microphone o chrome_tab tras read-back; solo sesiones con manifiesto dialogo. |
| POST /api/transcribir/dialogo | NextAuth y validación de propietario | Lee las pistas y las envía a Groq para transcripción; no es un validador neutral ni un archivador, y no se invocó. |

GET de audio original, GET MP3, GET dialogo y el lector MCP son rutas de lectura física, no nuevas identidades. Todas requieren un sujeto del titular o un bearer emitido para ese sujeto. La sesión NextAuth del propietario y el desbloqueo de Bóveda no están disponibles en este canal de ejecución. No se accedió al monitor ni al navegador local para obtenerlos.

## 3. Consecuencia para B2 y Blob legacy

- B2: khora_leer_audio y los lectores REST usan el adaptador común de object-storage. Con credenciales runtime válidas, leerBlobVerificado() puede recuperar y verificar cada parte B2; el inventario de Vercel solo confirma entradas cifradas, no acceso actual.
- Vercel Blob legacy: el adaptador común falla cerrado si KHORA_LEGACY_BLOB_READS_ENABLED no es exactamente true. Esa variable no figura en el inventario de Production. El lector MCP no elude esa condición.
- La herramienta MCP no crea Volcados, no repara manifiestos, no crea índices faltantes y no escribe los bytes verificados en Neon; solo devuelve una parte. No puede sustituir el archivo canónico.

## 4. Material secundario MP3

El GET MP3 por sessionId ofrece un camino propietario/Bóveda para recuperar un derivado marcado disponible, usando read-back físico del propio MP3. Los registros R9 identifican 18 estados actuales disponibles, distribuidos entre 19 sesiones con localizadores; el GET no garantiza que Blob legacy pueda leerse con la bandera ausente. En todos los actuales/históricos captura_completa=false.

El POST relacionado puede lanzar generación secundaria y escrituras en dictado_mp3/historial. No se utiliza como read-back y no se ejecuta durante CUSTODIA-01 sin una compuerta separada y necesidad probada.

## 5. Dictamen y no-acciones

Se identificó una vía técnicamente válida para leer partes originales de sesiones sin Volcado: khora_leer_audio con un token del mismo titular y turno normativo MCP. La ruta está implementada y usa el verificador físico canónico, pero no es ejecutable ahora porque MCP normativo permanece DESACTIVADO y no existe un token autorizado en el contexto actual.

Los lectores REST requieren NextAuth/Bóveda y sus rutas de original/parte necesitan un Volcado existente; el GET dialogo solo aplica a capturas dialogo. Ninguno se invocó. No se emitió ni consumió token, no se creó turno normativo, no se realizó GET/list B2/Blob, no se descifró contenido, no se generó/transcribió MP3, no hubo escrituras ni cambios productivos. Tampoco se accedió al monitor, Chrome local, RDC o IndexedDB.

**Inventario sin cambio:** 79 sesiones sin Volcado; 1.039 partes originales por metadata (785 B2/254 Blob); 29 checkpoints textuales potencialmente significativos; 216 fragmentos locales preservados. El siguiente avance exige un canal autorizado que proporcione la identidad del titular y la compuerta normativa conforme a la instrucción vigente. CUSTODIA-01 permanece EN CURSO.
