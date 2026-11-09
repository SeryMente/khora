# CUSTODIA-B2-005 · Diagnóstico verificable del bloqueo de archivado

> **Estado:** en_curso · **Prioridad:** P0 · **Hito:** 2 de 5.
> **Depende de:** primera restauración de CUSTODIA-B2-006; el prediagnóstico ya entregado fue suficiente para iniciar la reparación. **Desbloquea:** aceptación E2E y CUSTODIA-B2-007.
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.
> **Alcance:** diagnóstico y pruebas de solo lectura/sintéticas; no cambia producción.

## 1. Objetivo

Completar el diagnóstico residual y la verificación positiva después de la reparación inmediata: estado actual de Blob, autenticación B2 con error saneado y cadena de archivado de extremo a extremo. El prediagnóstico inicial ya se ejecutó y habilitó comenzar CUSTODIA-B2-006; esta tarea ya no bloquea el inicio de la recuperación.

## 2. Motivo y evidencia inicial

- El almacén Vercel Blob khora-audio fue documentado como limits-exceeded-suspended por cuota excedida.
- Una sesión reportada dejó 14 partes pendientes de confirmación remota y cero filas vinculadas como partes verificadas; el checkpoint de texto sí estaba presente.
- El despliegue de main que contiene el transporte B2 nativo terminó bloqueado por el preflight con storage_b2_authorization_failed.
- El código de preflight no expone la causa HTTP concreta de b2_authorize_account; debe mejorarse la captura diagnóstica sin revelar secretos.
- La publicación READY anterior no demuestra que el transporte B2 del commit posterior esté operativo.

Fuentes: OBJETO-CANONICO.md, LISTA-TAREAS-PROVISIONAL.md, originales/ChatGPT-CUSTODIA-20261107-1302.txt y logs del despliegue fallido 7be5712a19aa98837e6d34449585ecb40e634af3.

## 3. Alcance

**Incluye**
- Verificar el estado actual y cuota/limitación del store Blob desde la cuenta/proyecto autorizados.
- Diagnosticar b2_authorize_account con estado HTTP y código de error saneados; comprobar identidad de cuenta, tipo/capacidades de llave y bucket privado sin mostrar valores.
- Seguir la cadena: captura → IndexedDB → subida → respuesta → GET/read-back → registro de parte → manifiesto → endpoint/transacción de archivado.
- Revisar build/deployment y errores runtime de los endpoints pertinentes, además de la persistencia de metadatos.
- Usar datos sintéticos en pruebas no productivas; separar evidencia histórica de evidencia actual.

**No incluye**
- Revelar, copiar a la conversación o registrar valores secretos.
- Modificar variables productivas desde esta tarea; la autorización específica de verificación/corrección B2 Production pertenece a CUSTODIA-B2-006 y se ejecuta únicamente mediante la bóveda canónica.
- Hacer merge/deploy antes de que B2-006 supere sus gates, aplicar SQL/backfill productivo o alterar bucket/CORS.
- Leer o exportar el texto/audio personal de la sesión real.

## 4. Secuencia mínima

1. Conservar el prediagnóstico y fijar el deployment/commit productivo realmente activo al realizar esta verificación.
2. Una vez restablecido el flujo por CUSTODIA-B2-006, verificar el estado actual de Vercel Blob y su cuota; no inferir el estado actual a partir de datos históricos.
3. Capturar status HTTP y código B2 saneados de `b2_authorize_account`; distinguir `unauthorized`, `unsupported`, `transaction_cap_exceeded` y otros códigos, sin exponer valores ni mensajes que puedan contener secretos.
4. Ejecutar matriz E2E con datos sintéticos: captura → persistencia local → subida → GET/read-back → SHA/bytes → vínculo de parte → manifiesto → archivado → recuperación tras recarga.
5. Clasificar causas confirmadas, descartadas dentro del alcance probado y pendientes; no declarar ausencia global de fallos.

## 5. Criterios de aceptación

| Criterio | Evidencia exigida | Resultado |
|---|---|---|
| Estado de Blob confirmado en el corte actual | Estado del store y cuota/limitación, con fecha y cuenta/proyecto | PENDIENTE |
| Causa del fallo de autorización B2 identificada | Estado HTTP/código saneado de B2; ninguna clave impresa | PENDIENTE |
| Cadena de archivado inspeccionada de extremo a extremo | Recibo correlacionado de cada transición sintética | PENDIENTE |
| Otros fallos del alcance probado clasificados | Matriz de pruebas PASS/FAIL/NO VERIFICADO | PENDIENTE |
| Informe reproducible y seguro | Documento con versión, entorno, evidencias y límites | PENDIENTE |

«No existe otro fallo» solo podrá afirmarse para el conjunto exacto de rutas, versiones, escenarios y ventana probados; nunca como certeza global sin evidencia exhaustiva.

## 6. Seguridad y salida

- Usar únicamente la bóveda autorizada de Khora y credenciales existentes; no reutilizar bóveda/cache de EP.
- Registrar solo código de error, estado HTTP, request/correlation ID saneado y metadatos técnicos.
- Conservar originales y no hacer escrituras sobre fuentes históricas.
- **Salida que acepta B2-006 y desbloquea B2-007:** informe residual de Blob/B2, recibos E2E correlacionados y matriz de fallos limitada al alcance realmente probado.

## Prediagnóstico de solo lectura · 2026-11-09

**Resultado principal:** la hipótesis «solo se agotó la cuota de Blob» queda refutada como explicación completa. Blob tiene un antecedente de suspensión por cuota, pero también hay fallos distintos en B2 y en la preparación de despliegues.

| Deployment | Commit | Evidencia | Alcance |
|---|---|---|---|
| dpl_Dczf3WWnPG4cnCaJhf6PS8MzmxLe | b52003ee1809ad506db74e8ee97f0905f7aae91a | READY, alias productivo asignado | La publicación está lista; no demuestra por sí sola PUT/GET físico ni archivado E2E actual. |
| dpl_36DeUEnuz2zoWtMJqp1BsZjWASUJ | b52003ee1809ad506db74e8ee97f0905f7aae91a | Preflight encrypted_roundtrip falló con storage_provider_request_failed; se eliminaron las versiones sintéticas exactas; el log indica que no se borraron originales. | Falla de petición del proveedor durante la prueba de ida/vuelta cifrada; HTTP/causa detallada no expuestos por el preflight. |
| dpl_4ohubN6WFbQ2fVHTZ1FL5M6xR8ui | b52003ee1809ad506db74e8ee97f0905f7aae91a | ERR_MODULE_NOT_FOUND: el runtime no pudo resolver khora-web/lib/server/cripto desde scripts/preflight-object-storage.ts. | Fallo independiente de resolución de módulo/import en la preparación de despliegue; el preflight del proveedor no llegó a ejecutarse. |
| dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f | 7be5712a19aa98837e6d34449585ecb40e634af3 | Preflight nativo B2: storage_b2_authorization_failed, durante b2_authorize_account. | Rechazo de autenticación/autorización API B2; el código no registra el status HTTP ni el código nativo que permitiría identificar el dato exacto rechazado. |

### Configuración y errores runtime relacionados

- En Vercel Production se observaron nombres de variables KHORA_OBJECT_STORAGE, KHORA_B2_BUCKET_NAME, KHORA_B2_BUCKET_ID, KHORA_B2_KEY_ID y KHORA_B2_APPLICATION_KEY. No se leyeron sus valores. El código actual acepta las variables heredadas KHORA_B2_KEY_ID / KHORA_B2_APPLICATION_KEY como fallback de KHORA_B2_MASTER_APPLICATION_KEY_ID / KHORA_B2_MASTER_APPLICATION_KEY; por tanto, la ausencia de los nombres nuevos no demuestra por sí sola la causa.
- La publicación READY de b52003ee no contiene, en los eventos consultados, una prueba física verificable del ciclo completo de archivado. No se declara funcional el producto por estado READY.
- La agrupación de errores runtime de siete días devolvió también Auth.js InvalidEndpoints para el proveedor OIDC y PostgreSQL 57P01 (terminación de conexión por orden administrativa), además de advertencias SSL de pg-connection-string. No se ha correlacionado ninguno de esos errores con las partes pendientes ni con el botón Archivar; se conservan como fallos/alertas observados, no como causas atribuidas.
- La búsqueda de logs de /api/audio en la ventana reciente no devolvió eventos. La consulta histórica de runtime logs de siete días fue rechazada por la retención del plan Hobby; no equivale a ausencia de fallos.
- El estado limits-exceeded-suspended de khora-audio por cuota proviene del expediente histórico y del original del operador. No se consultó directamente el estado actual del store en esta sesión; no se presenta como lectura fresca del proveedor.

### Dictamen acotado

Hay evidencia positiva de al menos tres problemas distintos del agotamiento de cuota: petición de proveedor fallida en roundtrip cifrado, módulo de preflight no resuelto y rechazo de autenticación nativa B2. También hay dos grupos de errores runtime independientes no correlacionados con archivado. **No es correcto afirmar que la cuota de Blob sea el único fallo ni que la aplicación ya esté archivando registros con B2.** La causa exacta del rechazo B2 y la causalidad de los errores OIDC/Neon siguen abiertas.

**Siguiente paso de diagnóstico:** instrumentar el preflight para conservar de forma saneada status HTTP, código B2, etapa, request ID y mensaje no secreto; corregir primero la resolución de import; repetir pruebas sintéticas PUT/GET y después la cadena E2E. La ejecución de producto permanece pendiente de aprobación de la secuencia.


## Actualización de prioridad · 2026-11-09

El operador aprobó iniciar la recuperación del archivado sin esperar a completar todo el diagnóstico. El prediagnóstico de solo lectura registrado en esta tarea fue suficiente para abrir CUSTODIA-B2-006. Esta tarea se mantiene EN CURSO como cierre del diagnóstico y verificación ampliada posterior al primer restablecimiento, sin retrasar el trabajo de B2-006.

### Nueva evidencia del build B2 nativo

- Deployment: `dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f` · commit `7be5712a19aa98837e6d34449585ecb40e634af3`.
- Vercel build ejecutó el preflight en producción y se detuvo con `storage_b2_authorization_failed` durante `b2_authorize_account`.
- El código actual no registra el HTTP status ni el `code` JSON de B2; por tanto no sabemos si el proveedor devolvió `unauthorized`, `unsupported` u otro resultado. No se han consultado valores secretos.
- Backblaze documenta HTTP 401 `unauthorized` como applicationKeyId/applicationKey incorrectos y HTTP 401 `unsupported` como clave no compatible con la versión de API. Esa tabla no permite afirmar que este deployment haya devuelto 401, pues su status no quedó registrado.
- La corrección #355 del botón de archivado sí se fusionó y se desplegó antes del bloqueo B2; no prueba que B2 esté operativo.

**Estado:** prediagnóstico parcial COMPLETADO; diagnóstico residual y verificación E2E PENDIENTES.

## Actualización de autorización y PR diagnóstica · 2026-11-09

El operador respondió «Correcto , actualiza tareas provisionales rapidamente, y resuelve.» a la pregunta explícita de autorización sobre credenciales B2 de Production y despliegue condicionado. El original A es [INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md](../../originales/INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md), UUIDv7 local `01a1c17d-189a-7fea-a644-6be002e2c07a`. La verificación/corrección de B2 Production se asigna a B2-006; esta tarea conserva el diagnóstico residual y E2E sin modificar por sí sola credenciales.

PR #362 sigue OPEN · DRAFT · NOT MERGED, head `3b684a870a21ccf2f200ee684687beea42e3b235`, 3 archivos. La Preview asociada está READY con compilación y TypeScript correctos (78/78 páginas), pero no ejecutó preflight B2 por ausencia de variables B2 en Preview. La prueba unitaria añadida no fue ejecutada. Por tanto, no hay todavía status HTTP/código B2 actual ni evidencia de PUT/GET físico; todos los criterios de aceptación de esta tarea permanecen PENDIENTES.


### Reconciliación diagnóstica vigente · 2026-11-09

La lectura actual de Vercel y de `main` deja los siguientes hechos, con sus límites:

- **Cliente/flujo de archivado:** PR #355 está MERGED en `main` (merge `8489a09c03a330b85f3e31297415ada7a19fe10e`). Su corrección de drenaje/reintento de partes es real, pero no prueba que la persistencia B2 esté habilitada.
- **Transporte S3-compatible:** `dpl_36DeUEnuz2zoWtMJqp1BsZjWASUJ` ejecutó `migrate-runtime.mjs` antes del preflight; el log confirma migraciones 023–029 aplicadas. Después falló el roundtrip cifrado con `storage_provider_request_failed`.
- **Transporte nativo B2:** `dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f` ejecutó primero preflight y después migración, pero falló en `b2_authorize_account` con `storage_b2_authorization_failed`; no alcanzó el hook de migración. La evidencia no contiene HTTP status ni código JSON nativo.
- **Variables Production:** metadatos no descifrados confirman nombres heredados `KHORA_B2_KEY_ID` y `KHORA_B2_APPLICATION_KEY` más selector, preflight y bucket. No aparecen los nombres canónicos Master Key. No se leyó ningún valor.
- **PR #362:** continúa OPEN · DRAFT · NOT MERGED. Añade status/código saneados y una prueba sintética de 401, pero la prueba no se ejecutó. Su Preview READY compiló (78/78 páginas estáticas y TypeScript PASS), pero no ejecutó preflight con credenciales, PUT/GET o E2E.
- **Build/migraciones:** el primer intento del commit b52003ee aplicó migraciones 023–029 antes de fallar en roundtrip. El script enumera también 032, pero el log no confirma si esa última quedó aplicada. El intento nativo falló antes de migrar. No repetir hook Production hasta reconciliar el estado del esquema y contar con vía autorizada sin mutaciones adicionales.
- **Vercel Blob:** `khora-audio` tiene antecedente histórico `limits-exceeded-suspended`; no se consultó el estado actual del store en esta retoma, por lo que su condición presente sigue NO VERIFICADA.
- **Archivos del usuario:** no se recuperó evidencia runtime actual de /api/audio que permita asociar otros errores de OIDC o PostgreSQL al botón Archivar. No inferir ausencia de fallos fuera de la ventana probada.

**Dictamen:** hay fallos demostrados adicionales al antecedente de cuota de Blob. El último error B2 específico permanece en autenticación; su causa exacta está pendiente de capturar status/código. No existe evidencia de PUT/GET físico ni de archivado E2E exitoso; por tanto, Cora/Khora continúa NO RESTABLECIDA/NO DEMOSTRADA.

**Fuentes:** [evidencia consolidada de B2 Production](../../evidencias/DIAGNOSTICO-B2-PRODUCTION-20261109.md), [retoma A](../../originales/INSTRUCCION-RETOMA-CUSTODIA-20261109.md), eventos de los tres deployments arriba identificados y metadatos Vercel Production sin valores secretos.
