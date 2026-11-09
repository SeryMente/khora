<!-- TASKS_README_VERSION=0.24; TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
<!-- TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
# 📁 Tareas provisionales · Frente Custodia

**Estado:** PROVISIONAL · materialización de ejecución y continuidad; no es canon normativo ni segundo OCP. CUSTODIA-B2-006 permanece EN CURSO: Master Key y bucket confirmados; variables canónicas transferidas y verificadas en Vercel Production; preflight B2 PASS y deployment Production READY. Archivado E2E real pendiente.  
**OCP único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).  
**Control único:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json).  
**Titularidad observada:** generación 11 · alias operativo chatgpt-custodia-01a1c125-af13-79b1-87cc-f1e5fe4b0b59 · control blob `c29349fc4d2e07d40cd6efe583171482578db6d3`. ID nativo no expuesto.  
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

- **Gobierno vigente revalidado:** Samantha v386 · NX-386m; Metacanon 1.29; GOW 2.18; DUG blob `22dca684830a36dff019b47811d9b800cc9bea0a`. MCP-NORMATIVO DESACTIVADO.  

## 1. Criterio operativo vigente

- **Primera urgencia:** B2 es el destino único de todas las nuevas escrituras de KHORA. CUSTODIA-B2-006 debe conectar las credenciales maestras canónicas a Vercel Production y demostrar archivado E2E.
- **Después:** cerrar el diagnóstico residual CUSTODIA-B2-005 y estabilizar la implementación con CUSTODIA-B2-007.
- **Luego:** CUSTODIA-B2-002 debe inventariar y copiar a B2 todo el histórico físico de Vercel Blob, verificar cada copia por read-back/bytes/SHA-256 y reconciliar referencias; conservar los originales sin borrado automático.
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
| 1 | CUSTODIA-B2-006 | P0 | EN CURSO · B2 FÍSICO PASS / VERCEL PENDIENTE | Master Key y bucket confirmados; falta conexión Vercel Production | Variables maestras canónicas, preflight, deployment y archivado E2E |
| 2 | CUSTODIA-B2-005 | P0 | EN CURSO | B2-006 | Cerrar diagnóstico residual y E2E de captura, partes, manifiesto, archivado y recuperación |
| 3 | CUSTODIA-B2-007 | P1 | PROPUESTA | B2-006 y B2-005 | Estabilizar y simplificar la implementación sin retirar integridad ni lectura legacy |
| 4 | CUSTODIA-B2-002 | P1 | EN CURSO · DIFERIDA | B2-006/005/007 aceptadas; corregir updateReferences() | Inventario y backfill completo de Blob a B2 con verificación y conservación de originales |
| 5 | CUSTODIA-RES-001 | P2 | DIFERIDA | B2-002 aceptada | Evaluar segundo proveedor solo después del objetivo B2/Blob |
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

- PC-7 es la única terminal RDC disponible. Identidad observada: PC-7\\PC 7. No asumir ni solicitar CENTRAL\\fila4, PC-14 o PSK14.
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

- PC-7 es la única terminal RDC disponible; identidad real observada PC-7\\PC 7. Las referencias históricas a CENTRAL\\fila4, PC-14 y PSK14 no son requisitos.
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
