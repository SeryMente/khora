<!-- TASKS_README_VERSION=0.30; TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
# Tareas vigentes · Frente Custodia

**Estado:** PROVISIONAL · índice de ejecución subordinado al [OCP único](../OBJETO-CANONICO.md).  
**Control único:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json).  
**Actualización:** 2026-11-10.

## Decisión vigente

- Los objetos históricos existentes en Vercel Blob permanecen en Blob.
- Mientras el almacén no permita lectura, cada archivo legacy se identifica individualmente como temporalmente no disponible y con recuperación/migración pendiente. No se marca como perdido o corrupto solo por la suspensión del proveedor.
- Todo contenido nuevo se escribe exclusivamente en Backblaze B2.
- Las nuevas escrituras B2 deben superar GET/read-back físico y cotejo de longitud/SHA-256 antes de registrarse como verificadas.
- La indisponibilidad de objetos Blob antiguos no debe impedir guardar nuevas capturas, texto, checkpoints o ediciones de texto.
- La migración histórica Blob→B2 queda DIFERIDA hasta reactivar el servicio Blob, comprobar GET y recibir autorización expresa para esa fase.

## Trabajo que se ejecutará ahora

| ID | Estado | Alcance único |
|---|---|---|
| CUSTODIA-B2-006 | EN CURSO · P0 | Ejecutar la aceptación E2E autenticada pendiente: captura nueva, recuperación tras recarga y cotejo de bytes/longitud/SHA-256; comprobar aislamiento de texto/checkpoints y comportamiento de sesión mixta. Production ya está publicada. |

## Trabajo diferido · no ejecutar en este hito

| ID | Estado | Condición para reabrir |
|---|---|---|
| CUSTODIA-B2-005 | DIFERIDA | Vercel Blob reactivado y petición expresa para volver a comprobar el acceso. |
| CUSTODIA-B2-002 | DIFERIDA | Vercel Blob reactivado, GET físico confirmado y nueva autorización expresa para migrar el histórico. |
| CUSTODIA-B2-007 | DIFERIDA | CUSTODIA-B2-006 aceptada y deuda técnica concreta priorizada. |
| CUSTODIA-RES-001/002 | DIFERIDAS | Nueva decisión expresa de evaluar resiliencia multiproveedor. |

No hay una secuencia posterior automática: reactivar Blob no autoriza por sí mismo la migración.

## Expedientes de detalle

| ID | Detalle |
|---|---|
| CUSTODIA-B2-006 | [Persistencia nueva B2 y disponibilidad por archivo legacy](./📁%20🧩%20-%20CUSTODIA-B2-006%20-%20Habilitar%20archivado%20con%20Backblaze%20B2/README.md) |
| CUSTODIA-B2-005 | [Comprobación futura del acceso al legado Blob](./📁%20🧩%20-%20CUSTODIA-B2-005%20-%20Diagnóstico%20verificable%20del%20bloqueo%20de%20archivado/README.md) |
| CUSTODIA-B2-007 | [Pulido técnico diferido](./📁%20🧩%20-%20CUSTODIA-B2-007%20-%20Pulido%20de%20la%20implementación%20B2/README.md) |
| CUSTODIA-RES-001/002 | Evaluación e implementación de resiliencia multiproveedor; ambas diferidas. |

CUSTODIA-01, CUSTODIA-03 y CUSTODIA-04 conservan sus identidades y estados previos fuera de esta entrega. CUSTODIA-02 permanece retirada; no reutilizar el ID.

## Gates de aceptación y estado

| Gate | Estado verificable |
|---|---|
| 1. Nuevas escrituras solo B2, fail-closed y sin escritura secundaria Blob | PASS en el adaptador y suite focal |
| 2. GET/read-back y cotejo SHA-256/longitud antes de registrar verificado | PASS en prueba sintética del adaptador; captura real autenticada pendiente |
| 3. Estado individual Blob legacy temporalmente no disponible / recuperación pendiente | Implementado y publicado; smoke UI autenticado pendiente por SSO |
| 4. Texto, checkpoints y edición no dependen de Blob legacy | Implementado por separación de rutas; demostración autenticada pendiente |
| 5. Captura autenticada, recarga y read-back B2 | PENDIENTE — requiere sesión KHORA autorizada en navegador |
| 6. Typecheck, UI Contract, cuatro suites focales y build | PASS en Preview del código de aplicación; Production build y TypeScript PASS |
| 7. Preflight y publicación Production | PASS — deployment `dpl_6M6ebaAvNPpAtRspfX5QhffEJvVJ` READY; SHA `f0224c1`; preflight B2 read-only PASS |

La suite unitaria global no se declara PASS. El fetch anónimo del alias canónico devolvió `login_required` por SSO y los perfiles de navegador conectados no tienen sesión KHORA registrada; no se ha simulado login ni captura.

No ejecutar migración histórica, backfill, actualización de referencias SQL/JSONB, borrado de originales ni reactivación de lectura Blob dentro de este hito.
