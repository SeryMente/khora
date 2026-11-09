<!-- TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
# 📁 Tareas provisionales · Frente Custodia

**Estado:** PROVISIONAL · materialización de ejecución y continuidad; no es canon normativo ni segundo OCP. La secuencia operativa fue aprobada el 2026-11-09 y se recibió asentimiento contextual para verificar/corregir solo credenciales B2 de Production mediante bóveda canónica y desplegar a producción únicamente tras pasar todos los gates. Ejecución pendiente.  
**OCP único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).  
**Control único:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json).  
**Titularidad observada:** generación 11 · alias operativo chatgpt-custodia-01a1c125-af13-79b1-87cc-f1e5fe4b0b59 · control blob 21fe3e0ebae32d6e3988a5511fecaa5d63f8c3af. ID nativo no expuesto.  
**Folio:** PENDIENTE/NO ASIGNADO · FOL1 no está ACTIVO.  
**Instrucción literal vigente:** [INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md](../originales/INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md).  
**Instrucción operativa posterior (prioridad 1):** [INSTRUCCION-RESTABLECER-ARCHIVADO-PRIMERO-20261109.md](../originales/INSTRUCCION-RESTABLECER-ARCHIVADO-PRIMERO-20261109.md) · A UUIDv7 local `01a1c170-3d40-7edb-b707-9a14020a76b8`.
**Autorización B2 Production:** [INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md](../originales/INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md) · A UUIDv7 local `01a1c17d-189a-7fea-a644-6be002e2c07a`.  
**Matriz de trazabilidad:** [TRAZABILIDAD-INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md](../evidencias/TRAZABILIDAD-INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md).  
**Salida visible B:** [SALIDA-MODELO-CUSTODIA-ARQUITECTURA-MULTIALMACEN-20261109.md](../originales/SALIDA-MODELO-CUSTODIA-ARQUITECTURA-MULTIALMACEN-20261109.md) · A UUIDv7 local 01a1c138-ead3-7678-a44e-a49bb72f11de · A2 correctiva 01a1c134-2125-7263-b011-14bc36a10d03 · B UUIDv7 local 01a1c134-2125-75e8-9c39-16a74610d034.

> Cada tarea nueva tiene un README de detalle y un ID local estable. Todas heredan del OCP padre titularidad, autorización y exclusiones. No crean controles, responsables, sesiones ni folios independientes. La aprobación de una tarea no amplía permisos de producción, credenciales, datos ni proveedores.

## 1. Criterio operativo vigente

- **Primera urgencia:** restablecer que Cora/Khora vuelva a archivar registros con normalidad. CUSTODIA-B2-006 es el primer hito y ya está EN CURSO; el prediagnóstico disponible de CUSTODIA-B2-005 se usa como insumo, sin esperar a cerrar toda la investigación residual.
- **Después:** cerrar la verificación E2E y el diagnóstico residual; estabilizar el flujo sin debilitar integridad, cifrado ni recuperación.
- **Luego:** diseñar e implementar persistencia multialmacén, con cola local, réplica, conmutación y recuperación comprobables.
- **No hay migración final Blob→B2 exclusiva como objetivo de arquitectura.** B2 es el medio inmediato para recuperar el servicio; cualquier proveedor adicional se incorpora solo después de comprobar su salud/capacidad y aprobar el diseño.
- La secuencia fue aprobada y la autorización contextual B2 Production recibida el 2026-11-09. Solo se permite verificar/corregir variables B2 de Production con la bóveda canónica; despliegue productivo condicionado a que todos los gates pasen. No implica autorización para otras credenciales, SQL/backfill, CORS/seguridad ni fuentes originales.

## 2. Tareas existentes del frente

Se conservan los identificadores, criterios y evidencia existentes. No se duplican ni renumeran.

| Identificador | Estado previo | Tratamiento |
|---|---|---|
| CUSTODIA-01 | EN CURSO | Permanece abierta; retomar el catálogo visible tras restablecer archivado |
| CUSTODIA-03 | ABIERTA | Permanece abierta; conserva prioridad de rescate histórico después de restablecer servicio |
| CUSTODIA-04 | EN CURSO | Mantiene la historia de corrección de archivado y aceptación E2E; no se da por cerrada |
| CUSTODIA-02 | RETIRADA | No reutilizar el ID |
| CUSTODIA-B2-001 | en_curso | Conservar evidencia y código existente; reconciliar después del pulido |
| CUSTODIA-B2-002 | en_curso | Backfill/inventario histórico queda fuera del desbloqueo inicial |
| CUSTODIA-B2-003 | en_curso | Reutilizar sus preflights donde sigan vigentes |
| CUSTODIA-B2-004 | supersedida como objetivo final exclusivo | Sus pruebas físicas B2 siguen siendo insumo; ya no gobierna una arquitectura B2-only |

## 3. Secuencia operativa aprobada · 2026-11-09

| Orden | ID local | Prioridad | Estado | Dependencia | Resultado |
|---:|---|---|---|---|---|
| 1 | CUSTODIA-B2-006 | P0 | en_curso | Prediagnóstico disponible de B2-005; su cierre completo no bloquea el inicio | Recuperar archivado con B2 y demostrar PUT/GET físico, integridad y archivado E2E en entorno aislado |
| 2 | CUSTODIA-B2-005 | P0 | en_curso | B2-006 | Cerrar diagnóstico residual y verificación ampliada: estado actual de Blob, respuesta B2 saneada y matriz de la cadena completa |
| 3 | CUSTODIA-B2-007 | P1 | propuesta_pendiente_aprobacion | B2-006 y B2-005 aceptadas | Estabilizar y simplificar la implementación sin retirar controles esenciales |
| 4 | CUSTODIA-RES-001 | P1 | propuesta_pendiente_aprobacion | B2-007 | Diseñar resiliencia multialmacén con cola local, réplica, failover y restauración |
| 5 | CUSTODIA-RES-002 | P2 | propuesta_pendiente_aprobacion | RES-001 aprobado | Implementar y certificar fallos y recuperación en entorno aislado; producción sigue separada |

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

- Se permite verificar/corregir únicamente variables B2 de Production mediante la bóveda canónica, conforme al original A enlazado arriba.
- El despliegue/cutover productivo está autorizado solo después de pasar todos los gates técnicos y revisar el hook de build existente; si ejecuta mutaciones de Neon Production fuera de alcance, detenerlo.
- Sin cambios de otras credenciales/llaves, seguridad/CORS del bucket o SQL/backfill en Neon Production.
- Sin lectura/exportación del contenido privado de dictados para documentación.
- Sin eliminación ni sobrescritura de objetos originales.
- Las pruebas de escritura/lectura deben usar contenido sintético en entornos aislados hasta obtener la compuerta aplicable.
- No se crea CUSTODIA-05 ni se reactiva CUSTODIA-02.

## 7. Registro de cambios

- **2026-11-09 · AUTORIZACION-B2-PRODUCTION · actualización del índice:** se enlaza el original A de autorización, se limita su alcance a variables B2 Production gestionadas por la bóveda canónica y se condiciona el despliegue a gates completos. La ejecución técnica sigue pendiente.
- **2026-11-09 · REORDENAMIENTO-RESTABLECER-ARCHIVADO-PRIMERO · versión 0.22:** por aprobación expresa del operador, CUSTODIA-B2-006 pasa al primer hito y queda EN CURSO; el prediagnóstico B2-005 se utiliza como insumo y su diagnóstico residual/verificación ampliada queda en segundo hito, sin bloquear el desbloqueo. Después siguen B2-007, RES-001 y RES-002. Se preservan IDs históricos, CUSTODIA-01/03/04 y B2-001..004. No hay autorización de merge/deploy/cutover productivo ni cambios de credenciales/secretos.
- **2026-11-09 · secuencia de diagnóstico, restablecimiento y resiliencia · versión 0.21 (antecedente):** se registraron cinco tareas nuevas; se preservan CUSTODIA-01/03/04 y B2-001..004. La decisión B2 exclusivo dejó de ser el objetivo final. Esta secuencia fue reorganizada por instrucción posterior del operador.
- **2026-11-08 · B2 nativo y retoma documental · versión 0.20:** se conserva como antecedente de integración del transporte B2 nativo y sus límites de aceptación; no prueba autenticación física, disponibilidad ni archivado E2E.
- Las entradas anteriores se conservan en LISTA-TAREAS-PROVISIONAL.md y no se eliminan al actualizar el resumen.

