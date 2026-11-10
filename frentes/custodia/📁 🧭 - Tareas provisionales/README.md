<!-- TASKS_README_VERSION=0.29; TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
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
| CUSTODIA-B2-006 | EN CURSO · P0 | Completar y validar persistencia nueva B2-only con read-back físico SHA-256/longitud; indicador por archivo Blob histórico; aislamiento de fallos; pruebas y publicación cuando pasen los gates. |

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

## Gates de aceptación

1. Nuevas escrituras únicamente B2 y fail-closed; ninguna escritura secundaria a Blob.
2. GET/read-back y cotejo SHA-256/bytes antes de registrar una escritura B2 como verificada.
3. Estado por objeto para Blob histórico: temporalmente no disponible, recuperación/migración pendiente.
4. Prueba de que el bloqueo legacy no interrumpe texto, checkpoints, edición ni nuevas capturas B2.
5. Prueba de sesión autenticada real, recarga y recuperación desde B2.
6. Typecheck, suites relevantes y build del commit exacto PASS antes de publicar.

No ejecutar migración histórica, backfill, actualización de referencias SQL/JSONB, borrado de originales ni reactivación de lectura Blob dentro de este hito.
