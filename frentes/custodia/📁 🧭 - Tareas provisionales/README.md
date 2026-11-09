<!-- TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
# 📁 Tareas provisionales · Frente Custodia

**Estado:** PROVISIONAL · materialización de ejecución y continuidad; no es canon normativo ni segundo OCP.  
**OCP único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).  
**Control único:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json).  
**Titularidad observada:** generación 11 · alias operativo chatgpt-custodia-01a1c125-af13-79b1-87cc-f1e5fe4b0b59 · control blob 21fe3e0ebae32d6e3988a5511fecaa5d63f8c3af. ID nativo no expuesto.  
**Folio:** PENDIENTE/NO ASIGNADO · FOL1 no está ACTIVO.  
**Instrucción literal vigente:** [INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md](../originales/INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md).

> Cada tarea nueva tiene un README de detalle y un ID local estable. Todas heredan del OCP padre titularidad, autorización y exclusiones. No crean controles, responsables, sesiones ni folios independientes. La aprobación de una tarea no amplía permisos de producción, credenciales, datos ni proveedores.

## 1. Criterio operativo vigente

- **Primera urgencia:** recuperar la capacidad de archivar registros en Cora/Khora. El primer paso es diagnóstico positivo; el segundo, resolver la causa comprobada con B2.
- **Después:** pulir la implementación que ya funcione.
- **Luego:** diseñar la persistencia redundante multialmacén, con réplica, conmutación y recuperación verificables.
- **No hay migración final Blob→B2 exclusiva como objetivo de arquitectura.** La decisión de 2026-11-07 que hacía de B2 el único proveedor final queda supersedida por la nueva instrucción del 2026-11-09. B2 sigue siendo el camino inmediato para restablecer el servicio; Vercel Blob solo será destino cuando su salud y capacidad se comprueben.
- La secuencia de abajo está documentada como PROPUESTA PENDIENTE DE VISTO BUENO. No autoriza por sí sola cambios de producto o producción.

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

## 3. Secuencia propuesta · pendiente de aprobación

| Orden | ID local | Prioridad | Estado | Dependencia | Resultado |
|---:|---|---|---|---|---|
| 1 | CUSTODIA-B2-005 | P0 | propuesta_pendiente_aprobacion | ninguna | Diagnóstico completo y positivo del bloqueo |
| 2 | CUSTODIA-B2-006 | P0 | propuesta_pendiente_aprobacion | B2-005 | Archivado E2E restablecido con B2 |
| 3 | CUSTODIA-B2-007 | P1 | propuesta_pendiente_aprobacion | B2-006 | Implementación B2 pulida y sin deuda accidental |
| 4 | CUSTODIA-RES-001 | P1 | propuesta_pendiente_aprobacion | B2-007 | Diseño de resiliencia multialmacén que satisface el dictado |
| 5 | CUSTODIA-RES-002 | P2 | propuesta_pendiente_aprobacion | RES-001 aprobado | Implementación y certificación no productiva |

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
- La lista es el índice ejecutivo; cada README contiene el detalle; el OCP conserva el estado vivo.
- CUSTODIA-03 y CUSTODIA-01 no se cierran ni se borran. El orden exacto de su reanudación se reconcilia después de restablecer el archivo de registros.

## 6. Límites vigentes

- Sin merge, deploy o cutover de producción en esta propuesta.
- Sin cambios de credenciales/llaves, seguridad/CORS del bucket o SQL/backfill en Neon Production.
- Sin lectura/exportación del contenido privado de dictados para documentación.
- Sin eliminación ni sobrescritura de objetos originales.
- Las pruebas de escritura/lectura deben usar contenido sintético en entornos aislados hasta obtener la compuerta aplicable.
- No se crea CUSTODIA-05 ni se reactiva CUSTODIA-02.

## 7. Registro de cambios

- **2026-11-09 · secuencia de diagnóstico, restablecimiento y resiliencia · versión 0.21:** se registran cinco tareas nuevas en estado propuesta_pendiente_aprobacion; se preservan CUSTODIA-01/03/04 y B2-001..004. La decisión B2 exclusivo deja de ser el objetivo final, supersedida por la instrucción literal de arquitectura multialmacén. No se modificó código ni producción.
- **2026-11-08 · B2 nativo y retoma documental · versión 0.20:** se conserva como antecedente de integración del transporte B2 nativo y sus límites de aceptación; no prueba autenticación física, disponibilidad ni archivado E2E.
- Las entradas anteriores se conservan en LISTA-TAREAS-PROVISIONAL.md y no se eliminan al actualizar el resumen.

