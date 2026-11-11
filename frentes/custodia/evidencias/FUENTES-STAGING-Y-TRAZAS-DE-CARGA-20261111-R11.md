# R11 · Fuentes de staging, trazas de carga y conciliación de fragmentos · 2026-11-11

**Frente/tarea:** CUSTODIA / CUSTODIA-01.  
**Objetivo:** determinar si una copia server-side o un recibo persistido permite localizar la carga correspondiente al índice 317 y aclarar la procedencia documental de los 216 fragmentos locales, sin acceder al dispositivo ni leer objetos físicos.  
**Método:** catálogo/esquemas y SELECT de metadatos en Neon previamente inspeccionados durante R11; lectura estática de las rutas de staging, importación, carga de audio, cliente y reconciliación en la rama de trabajo. No se ejecutó ningún endpoint ni se hizo GET/list de B2 o Blob en este ciclo.

## 1. Catálogo de persistencia y staging

El catálogo público de Neon inspeccionado no muestra tablas dedicadas a staging, cargas temporales, importación o fragmentos locales. La tabla de partes originales continúa siendo dictado_audio_parte; eventos_sistema aporta telemetría, no un ledger de objetos temporales.

El helper putStagingChunk(), en khora-web/lib/server/object-storage.ts, escribe el objeto temporal directamente en B2 bajo la convención khora/staging/audio/{sessionId}/{uploadId}.khstaging, con uploadId UUIDv4. El código no crea una fila SQL dedicada que indexe ese staging object. La ausencia de tabla no prueba que el objeto no exista: sin listar ni leer B2 no se puede afirmar presencia ni ausencia física.

## 2. Ruta de importación de staging

khora-web/app/api/audio/importar/procesar/route.ts implementa POST autenticado con NextAuth. Valida sessionId y que stagingUrl pertenezca al prefijo de staging de esa sesión; reclama la sesión mediante reclamarSesion(), obtiene el objeto temporal, descifra el audio usando keyBase64/ivBase64 suministrados por el flujo cliente, detecta el formato y registra el original en dictado_audio_parte.

Esta ruta es un flujo de importación autenticado, no un lector anónimo ni una recuperación retrospectiva sin identidad. No se invocó y no se obtuvo key/IV ni contenido de staging.

## 3. Ruta de carga directa y conservación local

POST /api/audio cifra y escribe el objeto original en B2 por sesión/índice; después intenta read-back y verificación. Si la verificación posterior falla, la respuesta contempla audio_no_verificable con verificado=false y recuperable=true, junto con el localizador de cuarentena en la respuesta; el objeto no queda registrado como parte confirmada en dictado_audio_parte por esa rama.

El cliente IngresoWorkspace.tsx guarda primero el audio en IndexedDB mediante guardarAudioLocal(). Cuando el servidor confirma la subida, emite PARTE_AUDIO_SUBIDA_CONFIRMADA y confirma/elimina la copia local mediante confirmarAudioLocal(). Si falla la carga, la lógica mantiene un reintento pendiente y no ejecuta la confirmación local. Esta conclusión procede de inspección de código; no se abrió IndexedDB ni se inspeccionó el dispositivo.

## 4. Parte 317 · evento de carga

Para la sesión afectada, los eventos consultados muestran un inicio de carga con media_part_bytes=82195 y un evento posterior audio_no_verificable con upload_verified=false. No aparece evento de confirmación de subida para part_index=317. En los campos de evento ya consultados no se encontró uploadId ni stagingUrl.

El par de eventos prueba un intento de subida y un resultado de verificación fallida; no prueba que el objeto temporal o de cuarentena continúe físicamente en B2, ni permite localizarlo de forma inequívoca. No se consultaron ni publicaron valores de URL, path o secretos; no se hizo list/GET para perseguir el objeto.

**Estado probatorio:** PENDIENTE_INTEGRIDAD / LOCALIZADOR NO ACREDITADO. No se declara la parte 317 recuperada, ausente o perdida.

## 5. Reconciliación global descartada como vía de diagnóstico

khora-web/lib/server/reconciliation.ts expone ejecutarReconciliacionForense(DRY_RUN|APPLY), y khora-web/app/api/auditoria/route.ts la invoca desde GET y POST. No se ejecutó. La función llama primero a asegurarColumnasDictado(); esa rutina puede ejecutar DDL cuando faltan columnas, incluso en un recorrido nominalmente DRY_RUN. Además, el proceso abarca todos los Volcados/sesiones/partes y puede listar prefijos completos de Blob y B2; APPLY añade escrituras. No satisface el alcance mínimo de CUSTODIA-01 y no es un diagnóstico read-only seguro por invocación.

## 6. Conciliación documental 216 vs 993

- ESTADO-OPERATIVO-BLOQUEOS-20261110.md identifica 216 partes locales aún no extraídas, cotejadas ni transferidas, vinculadas documentalmente a dos sesiones.
- INVENTARIO-RECUPERABILIDAD-INGRESOS.md registra una auditoría local histórica de cinco snapshots/sesiones y 993 registros de audio independientes, con 993/993 descifrados AES-GCM en aquella inspección y 81.100.193 bytes.
- Son conteos de alcance y momento distintos. No se encontró en el inventario remoto una tabla o recibo que demuestre que las 216 unidades sean subconjunto, reemplazo o equivalencia de los 993 registros.
- El dispositivo local y su IndexedDB permanecen fuera del alcance de acceso de esta retoma. No se declara conciliación, transferencia ni integridad actual de los archivos locales.

## 7. Resultado y límites

Se identificó la arquitectura de staging y se distinguió la ruta de importación autenticada de la carga directa con cuarentena. Para la parte 317, la evidencia disponible prueba intento y verificación fallida, no una copia física localizable. La reconciliación documental de 216/993 queda abierta por diferencia de universo y ausencia de read-back local permitido.

**No-acciones:** no se ejecutó importación ni endpoint de carga; no hubo GET/list/descifrado de B2 o Blob; no se escribieron filas Neon, Volcados ni objetos; no se ejecutó la reconciliación forense; no se modificó Production, secretos, ramas principales ni configuración; no se utilizó monitor, Chrome local, RDC o IndexedDB.

## 8. Siguiente paso acotado

Inspeccionar únicamente la presencia/ausencia de claves de localizador y recibo en el JSON de eventos de la parte 317, sin devolver sus valores sensibles; después cruzar el resultado con los metadatos ya conocidos. Mantener la discrepancia 216/993 separada hasta contar con un manifiesto de origen autorizado que establezca la relación. No invocar importación, reconciliación global, staging GET ni transferencia en ausencia de una ruta autorizada y de identidad del titular.

**Estado del frente:** CUSTODIA-01 EN CURSO. Las 79 sesiones sin Volcado y los inventarios de audio/texto no cambian por este análisis.