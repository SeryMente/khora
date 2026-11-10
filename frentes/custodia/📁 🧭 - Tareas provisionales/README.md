<!-- TASKS_README_VERSION=0.27; TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
<!-- TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
# 📁 Tareas provisionales · Frente Custodia

**Estado:** PROVISIONAL · materialización de ejecución y continuidad; no es canon normativo ni segundo OCP. CUSTODIA-B2-006 permanece EN CURSO: una captura real quedó registrada con 191/191 partes verificadas en B2, pero falta recuperación tras recarga. CUSTODIA-B2-002 permanece P0 y está BLOQUEADA por suspensión del store Vercel Blob: los 636 objetos se enumeran, pero 5/5 lecturas por SDK y 5/5 lecturas CDN devuelven blob_read_forbidden. Se requiere reactivación temporal de lectura/exportación por Vercel.  
**OCP único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).  
**Control único:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json).  
**Titularidad observada:** generación 11 · alias operativo chatgpt-custodia-01a1c125-af13-79b1-87cc-f1e5fe4b0b59 · control blob `cf7dc1a19ce2738e23b1e620bca49e03429bf28f`. ID nativo no expuesto.  
**Folio:** PENDIENTE/NO ASIGNADO · FOL1 no está ACTIVO.  
**Instrucción arquitectónica original:** [INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md](../originales/INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md). La decisión operativa posterior B2-first y backfill Blob→B2 está preservada en [INSTRUCCION-B2-KHORA-Y-BACKFILL-BLOB-20261109.md](../originales/INSTRUCCION-B2-KHORA-Y-BACKFILL-BLOB-20261109.md).  
**Retoma actual:** [INSTRUCCION-RETOMA-CUSTODIA-20261109.md](../originales/INSTRUCCION-RETOMA-CUSTODIA-20261109.md) · A local `01a1c193-eccc-78ad-bcb1-a7f102ff4733`.  
**Evidencia de despliegues/B2:** [DIAGNOSTICO-B2-PRODUCTION-20261109.md](../evidencias/DIAGNOSTICO-B2-PRODUCTION-20261109.md).   
**Instrucción operativa posterior (prioridad 1):** [INSTRUCCION-RESTABLECER-ARCHIVADO-PRIMERO-20261109.md](../originales/INSTRUCCION-RESTABLECER-ARCHIVADO-PRIMERO-20261109.md) · A UUIDv7 local `01a1c170-3d40-7edb-b707-9a14020a76b8`.
**Autorización B2 Production:** [INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md](../originales/INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md) · A UUIDv7 local `01a1c17d-189a-7fea-a644-6be002e2c07a`.  
**Matriz de trazabilidad:** [TRAZABILIDAD-INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md](../evidencias/TRAZABILIDAD-INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md).  
**Salida visible B:** [SALIDA-MODELO-CUSTODIA-ARQUITECTURA-MULTIALMACEN-20261109.md](../originales/SALIDA-MODELO-CUSTODIA-ARQUITECTURA-MULTIALMACEN-20261109.md) · A UUIDv7 local 01a1c138-ead3-7678-a44e-a49bb72f11de · A2 correctiva 01a1c134-2125-7263-b011-14bc36a10d03 · B UUIDv7 local 01a1c134-2125-75e8-9c39-16a74610d034.
**Salida visible B de retoma:** [SALIDA-MODELO-RETOMA-CUSTODIA-20261109.md](../originales/SALIDA-MODELO-RETOMA-CUSTODIA-20261109.md) · B UUIDv7 local `01a1c193-eccc-7302-a7bd-99135476b8e4`.

> Cada tarea nueva tiene un README de detalle y un ID local estable. Todas heredan del OCP padre titularidad, autorización y exclusiones. No crean controles, responsables, sesiones ni folios independientes. Una aprobación ordinaria no amplía permisos de producción, credenciales, datos ni proveedores; una autorización literal posterior, explícita y de alcance delimitado sí puede habilitar exclusivamente las operaciones expresamente enumeradas, como el original A B2 Production enlazado arriba.

- **Gobierno vigente consultado:** Samantha v386 · NX-386m; Metacanon 1.29; GOW 2.18; DUG blob `22dca684830a36dff019b47811d9b800cc9bea0a`. §ARR/GOW:ARR no estuvo disponible como destino resoluble en esta sesión; no se afirma lectura de su texto desarrollado. MCP-NORMATIVO DESACTIVADO.  

## 1. Criterio operativo vigente

- **Persistencia nueva:** B2 es el destino único de nuevas escrituras; la última sesión reportó una captura real archivada con 191/191 partes verificadas. CUSTODIA-B2-006 sigue abierta solo para completar read-back de recuperación tras recarga y consolidar su recibo de aceptación.
- **Prioridad operativa inmediata:** CUSTODIA-B2-002 pasa a P0 para inventariar y copiar a B2 todo el histórico físico de Vercel Blob. La copia debe ser no destructiva y verificarse por read-back/bytes/SHA-256/KHC1. La corrección de referencias SQL/JSONB es una fase aparte, bloqueada hasta corregir y probar `updateReferences()`.
- **Diagnóstico residual:** CUSTODIA-B2-005 sigue abierta, pero no bloquea inventario read-only ni copia física sin modificación de referencias. CUSTODIA-B2-007 se difiere mientras no sea necesario para asegurar la migración.
- **Decisión actual:** B2-first y Blob→B2. RES-001/002 (multialmacén) se difieren; no son condición para recuperar archivado ni ejecutar este backfill.
- La autorización directa del operador para credenciales maestras KHORA, variables Production, deployment condicionado y backfill no destructivo está registrada en CONTROL-RESPONSABILIDAD.json gen. 11. Los gates técnicos permanecen obligatorios.

## 2. Tareas existentes del frente

Se conservan los identificadores, criterios y evidencia existentes. No se duplican ni renumeran.

| Identificador | Estado previo | Tratamiento |
|---|---|---|
| CUSTODIA-01 | EN CURSO | Permanece abierta; retomar el catálogo visible tras restablecer archivado |
| CUSTODIA-03 | ABIERTA | Permanece abierta; conserva prioridad de rescate histórico después de restablecer servicio |
| CUSTODIA-04 | EN CURSO | Mantiene la historia de corrección de archivado y aceptación E2E; no se da por cerrada |
| CUSTODIA-02 | RETIRADA | No reutilizar el ID |
| CUSTODIA-B2-001 | en_curso | Conservar evidencia y código existente; reconciliar después del pulido |
| CUSTODIA-B2-002 | en_curso | Inventario y backfill completo Blob→B2; se ejecuta tras B2-006/005/007 |
| CUSTODIA-B2-003 | en_curso | Reutilizar sus preflights donde sigan vigentes |
| CUSTODIA-B2-004 | supersedida como objetivo final exclusivo | Sus pruebas físicas se conservan como evidencia; B2 es ahora destino único de nuevas escrituras y del backfill histórico |

## 3. Secuencia operativa vigente · 2026-11-09 · B2-first

| Orden | ID local | Prioridad | Estado | Dependencia | Resultado |
|---:|---|---|---|---|---|
| 1 | CUSTODIA-B2-006 | P0 | EN CURSO · CAPTURA REAL PASS PARCIAL | Persistencia nueva de una captura real reportada; falta prueba independiente de recuperación tras recarga | Cerrar recuperación de texto/audio, recibo y aceptación del flujo nuevo |
| 2 | CUSTODIA-B2-002 | P0 | BLOQUEADA · LECTURAS VERCEL SUSPENDIDAS | Inventario físico PASS (636/636); Vercel impide descargar bytes por SDK y CDN; requiere reactivación temporal de lectura | Descargar y copiar todos los objetos a B2 con SHA/bytes/read-back; después reconciliar referencias con ledger y reconciliador corregidos |
| 3 | CUSTODIA-B2-005 | P0 | BLOQUEO EXTERNO CONFIRMADO | Store khora-audio en estado limits-exceeded-suspended; Vercel niega 403 en 5/5 descargas de SDK y 5/5 CDN | Obtener de Vercel una vía temporal de GET/exportación; luego repetir lectura real |
| 4 | CUSTODIA-B2-007 | P2 | DIFERIDA | Solo si aparece un defecto que exija estabilización previa | Pulido de implementación, sin retirar integridad ni lectura legacy |
| 5 | CUSTODIA-RES-001 | P2 | DIFERIDA | Después del objetivo B2/Blob | Evaluar segundo proveedor |
| 6 | CUSTODIA-RES-002 | P2 | DIFERIDA | RES-001 aprobado | Implementar proveedor adicional únicamente si se vuelve a priorizar |

### Objetos de tarea

| ID local | README de detalle |
|---|---|
| CUSTODIA-B2-005 | [Diagnóstico verificable del bloqueo de archivado](./📁%20🧩%20-%20CUSTODIA-B2-005%20-%20Diagnóstico%20verificable%20del%20bloqueo%20de%20archivado/README.md) |
| CUSTODIA-B2-006 | [Habilitar archivado con Backblaze B2](./📁%20🧩%20-%20CUSTODIA-B2-006%20-%20Habilitar%20archivado%20con%20Backblaze%20B2/README.md) |
| CUSTODIA-B2-007 | [Pulido de la implementación B2](./📁%20🧩%20-%20CUSTODIA-B2-007%20-%20Pulido%20de%20la%20implementación%20B2/README.md) |
| CUSTODIA-RES-001 | [Diseño de resiliencia multialmacén](./📁%20🧩%20-%20CUSTODIA-RES-001%20-%20Diseño%20de%20resiliencia%20multialmacén/README.md) |
| CUSTODIA-RES-002 | [Implementación y certificación multialmacén](./📁%20🧩%20-%20CUSTODIA-RES-002%20-%20Implementación%20y%20certificación%20multialmacén/README.md) |

## 4. Formato reutilizable

La estructura estándar de una tarea nueva está en [PLANTILLA-TAREA-PROVISIONAL.md](./PLANTILLA-TAREA-PROVISIONAL.md). Añade campos mínimos que faltaban en la versión anterior: prioridad, posición en el hito, dependencias, precondiciones, criterios falsables y evidencia requerida.

La plantilla no exige fechas objetivo ni responsables por tarea: se añaden solo si el OCP y el operador los autorizan y si aportan valor. La responsabilidad sigue siendo única y heredada.

## 5. Estados y convenciones

- Estados: propuesta_pendiente_aprobacion, pendiente, en_curso, bloqueada, completada, cancelada y supersedida.
- Prioridades: P0 (bloquea el servicio o la integridad), P1 (necesaria para estabilizar o completar el diseño) y P2 (posterior, depende de hitos previos).
- Una propuesta documentada no está aprobada para ejecución.
- Una tarea se completa solo con evidencia recuperable que satisface todos sus criterios; una prueba sintética no demuestra producción.
- Una tarea supersedida conserva su README e historia; se enlaza la instrucción que la reemplaza y no se reutiliza su ID.
- Dependencias organizan la secuencia, no crean autoridad.
- La lista es el índice ejecutivo; cada README contiene el detalle; el OCP conserva el estado vivo. El primer hito autorizado es B2-006 en rama/no producción; no se declara restauración real hasta completar sus criterios físicos.
- CUSTODIA-03 y CUSTODIA-01 no se cierran ni se borran. El orden exacto de su reanudación se reconcilia después de restablecer el archivo de registros.

## 6. Límites vigentes

- **Identidad RDC vigente (2026-11-10):** la única conexión RDC accesible es el canal operativo de esta sesión. `CENTRAL\\MantenimientoRCI` es la cuenta de elevación/operación RDC; `CENTRAL\\fila4` es el usuario y perfil propietario. Materializar repositorios, archivos, temporales y logs exclusivamente en rutas absolutas bajo `C:\\Users\\fila4`; no suplantar la identidad de fila4 ni usar el perfil elevado como workspace.
- Usar la Master Application Key de la cuenta Backblaze exclusiva KHORA; no crear claves adicionales ni utilizar credenciales EP.
- B2 es el único destino de nuevas escrituras; no hacer fallback silencioso a Blob.
- La autorización de Production permite las dos variables maestras canónicas, preflight y deployment condicionado a pruebas.
- El backfill Blob→B2 conserva los originales. Las referencias productivas solo se modifican después de corregir updateReferences(), dry-run, transacción, idempotencia y read-back.
- No modificar CORS, lifecycle o seguridad del bucket si no es necesario y específicamente autorizado.
- No leer/exportar contenido privado de dictados a documentación.
- No se crea CUSTODIA-05 ni se reactiva CUSTODIA-02.



### Retoma diagnóstica · 2026-11-09

- **Tarea 1:** CUSTODIA-B2-006 continúa en primer lugar P0. La corrección del cliente de PR #355 ya está integrada, pero no demuestra que el almacenamiento remoto funcione.
- **B2:** último preflight nativo disponible falló en `b2_authorize_account` con `storage_b2_authorization_failed`. PUT/GET físico, SHA/bytes, vínculo de partes y archivado E2E siguen pendientes.
- **Variables:** el inventario Vercel Production muestra el par heredado `KHORA_B2_KEY_ID` / `KHORA_B2_APPLICATION_KEY`; las entradas `KHORA_B2_MASTER_APPLICATION_KEY_ID` / `KHORA_B2_MASTER_APPLICATION_KEY` no aparecen. Ningún valor fue descifrado.
- **EP Vault:** el operador informa que las notas efímeras actuales contienen ambas claves; su lectura/promoción sigue pendiente de acceso validado al equipo/perfil efectivo. Se descarta expresamente la sesión efímera antigua de PC10; «PSK14» es el literal de conexión todavía no vinculado a un host/perfil verificado.
- **Build:** un despliegue previo aplicó migraciones 023–029 antes de fallar en `encrypted_roundtrip`; el intento nativo posterior ejecutó preflight antes de migrar y se detuvo en autorización. No repetir despliegue con hook de migración sin verificar estado del esquema y ruta permitida.
- **No ejecutado en esta retoma:** no leer secretos, no editar variables, no escribir B2, no SQL, no merge, no deploy y no cutover.

## 7. Registro de cambios

- **2026-11-09 · AUTORIZACION-B2-PRODUCTION · actualización del índice:** se enlaza el original A de autorización, se limita su alcance a variables B2 Production gestionadas por la bóveda canónica y se condiciona el despliegue a gates completos. La ejecución técnica sigue pendiente.
- **2026-11-09 · REORDENAMIENTO-RESTABLECER-ARCHIVADO-PRIMERO · versión 0.22:** por aprobación expresa del operador, CUSTODIA-B2-006 pasa al primer hito y queda EN CURSO; el prediagnóstico B2-005 se utiliza como insumo y su diagnóstico residual/verificación ampliada queda en segundo hito, sin bloquear el desbloqueo. Después siguen B2-007, RES-001 y RES-002. Se preservan IDs históricos, CUSTODIA-01/03/04 y B2-001..004. No hay autorización de merge/deploy/cutover productivo ni cambios de credenciales/secretos.
- **2026-11-09 · secuencia de diagnóstico, restablecimiento y resiliencia · versión 0.21 (antecedente):** se registraron cinco tareas nuevas; se preservan CUSTODIA-01/03/04 y B2-001..004. La decisión B2 exclusivo dejó de ser el objetivo final. Esta secuencia fue reorganizada por instrucción posterior del operador.
- **2026-11-08 · B2 nativo y retoma documental · versión 0.20:** se conserva como antecedente de integración del transporte B2 nativo y sus límites de aceptación; no prueba autenticación física, disponibilidad ni archivado E2E.
- Las entradas anteriores se conservan en LISTA-TAREAS-PROVISIONAL.md y no se eliminan al actualizar el resumen.



### Retoma B2-first · 2026-11-09 · versión 0.23

- **Aclaración vigente de materialización:** MantenimientoRCI opera RDC y eleva; fila4 es el propietario del entorno. La terminal no es una dependencia fija; debe utilizarse la única conexión RDC disponible y materializarse todo bajo el perfil fila4.
- Master Application Key de KHORA aceptada por Backblaze. Bucket khora-userdata-ecea4187, ID 35b8cbd6623b54a5a9130c18, allPrivate.
- Prueba física B2 PASS: PUT/GET sintético, 150 bytes, SHA-256 coincidente, SSE-B2/AES256. Evidencia: [PRUEBA-FISICA-B2-KHORA-20261109.md](../evidencias/PRUEBA-FISICA-B2-KHORA-20261109.md).
- Vercel Production ya selecciona B2, pero siguen faltando los nombres canónicos KHORA_B2_MASTER_APPLICATION_KEY_ID / KHORA_B2_MASTER_APPLICATION_KEY. No hay deployment nuevo ni archivado E2E demostrado.
- La autorización de uso Master Key, variables de Production, deployment condicionado y backfill no destructivo está registrada en el control gen. 11; no amplía permisos fuera de KHORA B2 ni autoriza borrar Blob.
- La secuencia actual pasa a B2-006 → B2-005 → B2-007 → B2-002. RES-001/002 se difieren.

## Retoma operativa verificada · 2026-11-09 · PC-7 / Vercel Production

- Backblaze B2: autenticación Master Key KHORA, identidad del bucket privado y lectura de configuración SSE-B2 verificadas desde Production por el preflight.
- Transferidas desde EP Vault las dos variables canónicas `KHORA_B2_MASTER_APPLICATION_KEY_ID` y `KHORA_B2_MASTER_APPLICATION_KEY`; read-back de metadatos Vercel confirma una entrada de tipo `sensitive` en Production para cada nombre. Los valores no se revelaron.
- Deployment Production `dpl_6hUVD7LBXqtmnaMw2nfH2wwyrHUp`, commit `dd9527a223f65e7af834b042d51f716296151bf2`, estado `READY`; preflight `native_auth`, `master_key`, `bucket_identity`, `bucket_private` y `sse_b2_default`: PASS. URL: `https://khora-r25tmr78o-victorhugotorresmendez-8991s-projects.vercel.app`.
- Para este build se aisló temporalmente el comando y se omitió `migrate-runtime.mjs`; el Build Command original se restauró en la configuración del proyecto después de iniciarse el build. No se ejecutó SQL ni backfill de Neon en este ciclo.
- La ruta de código de nuevas escrituras usa `putEncryptedObject` (B2-only y fail-closed), y quedó desplegada; el archivado E2E real con sesión propietaria, vínculo/manifiesto y recuperación tras recarga permanece pendiente. Por tanto, la capacidad productiva está preflight-validada y desplegada, pero la aceptación funcional de archivo no está certificada.
- No se ha iniciado el backfill histórico Blob→B2 ni se ha cambiado ninguna referencia Neon. Los originales Blob siguen sin borrarse.


## Retoma de ejecución · 2026-11-10

**Resultado nuevo:** una captura real de Production fue reportada como archivada en B2. El operador comunicó 10,052 caracteres, SHA con prefijo `d69033c4` y 191 partes de audio. La sesión anterior informó 191/191 partes vinculadas al bucket `khora-userdata-ecea4187`, con SHA/bytes y marca verificada, 15,617,130 bytes en total, cero faltantes y registro `en_revision`. El SHA-256 completo reportado fue `d69033c4876d82a64aa6adc5182c51dab0cd2d02f83a79155de35b970c4704ce`.

**Alcance exacto:** se considera PASS de escritura y archivado de una captura real según los resultados de la sesión anterior. No se repitió GET manual independiente ni se verificó recuperación desde la aplicación tras recarga en esta actualización; esa compuerta permanece NO VERIFICADA y B2-006 no se cierra.

**Backfill histórico:** la migración de objetos Blob no ha iniciado. Neon main tiene los conteos lógicos reportados: 624 referencias en `dictado_audio_parte`, 15 en `dictado_mp3`, 15 en `dictado_mp3_historial`, 37 en `volcado.audio_url` y 248 referencias JSONB individuales. No son conteos de objetos físicos únicos. El ledger `custodia_blob_b2_migration` no existe en main; falta el archivo SQL 035 y debe corregirse el conteo/posestado de referencias JSONB de `updateReferences()` antes de actualizar referencias. La copia física de Blob a B2 puede iniciarse de forma idempotente y no destructiva antes de cambiar referencias.

**Invariante:** no borrar, sobrescribir ni retirar Blob durante la migración; conservar originales hasta cierre con inventario completo, read-back y reconciliación aceptados. No hacer APPLY de Neon Production en el estado actual.


## Corte operativo · 2026-11-10 · suspensión del origen Vercel Blob

- El store KHORA Web khora-audio (store_VyX9EI8q6DKhp4RV) está en limits-exceeded-suspended; billingState=suspended; usageQuotaExceeded=true; acceso public; región iad1.
- Vercel devuelve 636 objetos en el inventario completo paginado (1 página) y tamaño total 1,010,497,194 bytes.
- Lecturas SDK: 0/5; lecturas directas CDN: 0/5. Ambas fallan con blob_read_forbidden. Inventariar metadatos no equivale a descargar datos.
- Backfill físico histórico: 0 objetos copiados y 0 objetos con read-back B2. Neon Production: 0 punteros cambiados, sin SQL aplicado. Blob: 0 originales borrados/sobrescritos.
- Acción que desbloquea: conseguir reactivación temporal de solo lectura/exportación desde Vercel para el store existente. No crear un store sustituto ni eliminar fuentes.
- El deployment Production dpl_6hUVD7LBXqtmnaMw2nfH2wwyrHUp permanece READY y los Secrets maestros B2 siguen como sensitive. Los Preview usados para probes se cancelaron tras capturar resultados; el Build Command normal fue restaurado.
- Corrección de identidad operativa: MantenimientoRCI es la cuenta de elevación y operación RDC; fila4 es el usuario/perfil propietario. Todos los artefactos se materializan en C:\\Users\\fila4; la única conexión RDC accesible se utiliza como canal operativo, sin suplantar procesos.


## Corte de migración histórica · 2026-11-10 · Vercel Blob suspendido

- Store físico conectado: `khora-audio` (`store_VyX9EI8q6DKhp4RV`), público, región iad1; estado `limits-exceeded-suspended`, `billingState=suspended`, cuota excedida.
- Inventario del proveedor: 636/636 objetos listados en 1 página; tamaño agregado 1,010,497,194 bytes.
- Descarga de muestra: 0/5 por SDK y 0/5 por URL pública/CDN; ambos métodos devuelven `blob_read_forbidden`. Inventariar metadatos no equivale a recuperar bytes.
- Migración: 0 objetos históricos copiados/verificados en B2; 0 referencias Neon actualizadas; 0 originales Blob eliminados/sobrescritos.
- Bloqueo P0: solicitar a Vercel una reactivación temporal de GET/exportación de solo lectura o vía oficial de exportación del store existente. No se obtuvo `blockedUntil`; no asignar fecha de reactivación.
- Production deployment sigue `READY`; Secrets B2 siguen configurados; las pruebas Preview fueron canceladas tras emitir sus métricas. No se realizó promoción ni cutover.
- La rama `feat/custodia-blob-physical-b2-backfill-20261110` contiene un primer transporte idempotente byte-preserving y un inventariador read-only con manifiesto, pero no está fusionada y su aceptación de pruebas queda pendiente. No ejecutar `--apply` hasta recuperar las lecturas de origen y validar el código completo.
