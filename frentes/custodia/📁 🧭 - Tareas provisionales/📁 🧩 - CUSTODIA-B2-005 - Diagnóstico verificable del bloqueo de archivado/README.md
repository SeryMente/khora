# CUSTODIA-B2-005 · Diagnóstico verificable del bloqueo de archivado

> **Estado:** propuesta_pendiente_aprobacion · **Prioridad:** P0 · **Hito:** 1 de 5.
> **Dependencia:** ninguna. **Desbloquea:** CUSTODIA-B2-006.
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.
> **Alcance:** diagnóstico y pruebas de solo lectura/sintéticas; no cambia producción.

## 1. Objetivo

Determinar con evidencia positiva por qué Cora/Khora no confirma las partes de audio y por qué se bloquea «Archivar registro». Verificar la hipótesis de cuota agotada de Vercel Blob, identificar la falla de autorización de B2 y revisar la cadena completa para no atribuir todo a una sola causa sin pruebas.

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
- Leer, copiar, mostrar o rotar credenciales; modificar bóvedas o variables productivas.
- Cambiar código de producto, hacer merge/deploy, aplicar SQL productivo o alterar bucket/CORS.
- Leer o exportar el texto/audio personal de la sesión real.

## 4. Secuencia mínima

1. Fijar deployment, commit, entorno y configuración no secreta realmente activos.
2. Verificar el estado actual de Vercel Blob y obtener evidencia actual, no solo el incidente histórico.
3. Capturar la respuesta saneada de autenticación B2 y distinguir credencial inválida, versión no compatible, capacidad insuficiente y configuración de bucket.
4. Ejecutar pruebas sintéticas separadas para subida, lectura de vuelta, vínculo de parte y archivado.
5. Entregar una matriz de fallos confirmados, descartados dentro del alcance probado y no verificables.

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
- **Salida que habilita B2-006:** causa concreta de Blob y B2, ruta de fallo exacta, dependencias y prueba mínima de corrección.

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
