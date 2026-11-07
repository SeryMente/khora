<!-- TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
# 📁 Tareas provisionales · Frente Custodia

**Estado:** PROVISIONAL · materialización de trabajo para continuidad del sprint; no es canon normativo ni un segundo OCP.  
**Fuente de estado:** [OCP Custodia](../OBJETO-CANONICO.md) y [control único de responsabilidad](../CONTROL-RESPONSABILIDAD.json).  
**Responsabilidad observada:** control único de Custodia, generación 8 (última transferencia verificada); esta colección no crea titularidad independiente.  
**Autorización del sprint:** [instrucción literal del operador](../originales/INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md).  
**Coordinación de continuidad:** [COORDINACION-SPRINT-CUSTODIA-v0.2.md](../entregas/COORDINACION-SPRINT-CUSTODIA-v0.2.md).

> Esta colección imita el patrón de Gobernanza: un índice y un objeto `README.md` por cada tarea nueva, anclados en una fuente literal. Los objetos heredan el titular, autorización, generación y sesión del OCP padre. No crean controles, responsables, sesiones, folios globales ni nuevos frentes. El identificador de tarea es local y estable dentro de este registro. No se canoniza el concepto «Tareas» como ámbito funcional.

## 1. Tareas existentes del frente

Estas tareas ya existían en la lista provisional anterior y no se duplican ni renumeran. Sus descripciones y evidencia siguen viviendo en [LISTA-TAREAS-PROVISIONAL.md](../LISTA-TAREAS-PROVISIONAL.md).

| Identificador | Estado observado | Fuente |
|---|---|---|
| CUSTODIA-01 | `EN CURSO` | [Lista provisional existente](../LISTA-TAREAS-PROVISIONAL.md) |
| CUSTODIA-03 | `ABIERTA` | [Lista provisional existente](../LISTA-TAREAS-PROVISIONAL.md) |
| CUSTODIA-04 | `EN CURSO` | [Lista provisional existente](../LISTA-TAREAS-PROVISIONAL.md) |
| CUSTODIA-02 | `RETIRADA` · no reutilizar | [Lista provisional existente](../LISTA-TAREAS-PROVISIONAL.md) |

## 2. Tareas provisionales del sprint de migración exclusiva a Backblaze B2

| Identificador local | Estado | Objeto de tarea |
|---|---|---|
| CUSTODIA-B2-001 | `en_curso` | [Adaptador B2 exclusivo y flujos](./📁%20🧩%20-%20CUSTODIA-B2-001%20-%20Adaptador%20dual%20y%20flujos/README.md) |
| CUSTODIA-B2-002 | `en_curso` | [Inventario y backfill no destructivo](./📁%20🧩%20-%20CUSTODIA-B2-002%20-%20Inventario%20y%20backfill%20no%20destructivo/README.md) |
| CUSTODIA-B2-003 | `en_curso` | [Preflight y seguridad del proveedor](./📁%20🧩%20-%20CUSTODIA-B2-003%20-%20Preflight%20y%20seguridad%20del%20proveedor/README.md) |
| CUSTODIA-B2-004 | `en_curso` · P0 | [Migración integral a B2 exclusivo y cutover sin persistencia dual](./📁%20🧩%20-%20CUSTODIA-B2-004%20-%20Aceptación%20E2E%20y%20cutover%20controlado/README.md) |

## 3. Convenciones de registro

- Estados de tarea: `pendiente`, `en_curso`, `completada` y `cancelada`.
- Una tarea se considera completada solo cuando su enunciado queda atendido y la evidencia pertinente puede recuperarse desde la fuente canónica correspondiente.
- Los estados son fotografías operativas; no sustituyen el estado vivo del OCP ni el control de responsabilidad.
- No se agregan campos de prioridad, fecha objetivo, responsable independiente o dependencias por anticipación.
- El alcance de este registro se limita al sprint actual y a las tareas provisionales de migración. Las obligaciones generales de recuperabilidad CUSTODIA-01/03/04 continúan abiertas con sus criterios originales.
- El archivo histórico solicitado `ChatGPT-CUSTODIA-20261031-1458.txt` no fue localizado. No se declara incorporado ni se sustituye por un documento fabricado.

## 4. Relación con el sprint vigente

La fotografía y el estado de la rama se mantienen en [COORDINACION-SPRINT-CUSTODIA-v0.2.md](../entregas/COORDINACION-SPRINT-CUSTODIA-v0.2.md). La instrucción de origen queda preservada en [INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md](../originales/INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md). El estado técnico de cada tarea está desarrollado en su propio `README.md`, sin replicar el control ni la fuente de estado del frente.


## Actualización operativa · 2026-11-07

El operador establece B2 como **único proveedor de persistencia**. Se descarta persistencia dual, fallback y lectura dual Blob/B2 como estado final. CUSTODIA-B2-004 pasa a `en_curso`/P0 y concentra la aceptación E2E y cutover exclusivo. Los objetos Blob históricos solo se conservan temporalmente como fuentes de migración hasta verificar sus copias B2; esa retención no autoriza que la aplicación continúe leyéndolos. No borrar fuentes hasta autorización y reconciliación verificadas.
