# B · Salida visible · Custodia · 2026-11-09

**B UUIDv7 local:** 01a1c134-2125-75e8-9c39-16a74610d034 · no es folio global ni ID nativo.
**Ciclo UUIDv7 local:** 01a1c134-2125-70ac-847f-18058ba4b884.
**Entrada A correctiva UUIDv7 local:** 01a1c134-2125-7263-b011-14bc36a10d03 · literal conservado en [INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md](INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md).
**OCP:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md) · CUSTODIA-v0.26.

## Dictamen ejecutivo

El diagnóstico no confirma que el único problema sea la cuota de Vercel Blob. Hay evidencia de la suspensión histórica de Blob por cuota y, además, evidencia independiente de fallos B2 y de preparación de despliegues. Por tanto, la hipótesis de «solo cuota» queda refutada como explicación completa. Tampoco se puede afirmar que ya funcione el archivado con B2.

## 1. Qué está fallando

- **Vercel Blob:** el expediente histórico registra el almacén khora-audio como limits-exceeded-suspended por cuota. Ese estado está documentado, pero en esta sesión no se obtuvo una lectura directa nueva del store; no se presenta como estado actual recién consultado.
- **B2, roundtrip anterior:** dpl_36DeUEnuz2zoWtMJqp1BsZjWASUJ (commit b52003ee) falló el preflight encrypted_roundtrip con storage_provider_request_failed. El log confirma que se eliminaron las versiones sintéticas exactas y que no se borraron originales. El detalle HTTP/causa del proveedor no quedó expuesto.
- **Preflight de despliegue:** dpl_4ohubN6WFbQ2fVHTZ1FL5M6xR8ui (commit b52003ee) falló antes de probar el proveedor porque Node no pudo resolver khora-web/lib/server/cripto importado desde scripts/preflight-object-storage.ts. Es un fallo independiente de import/resolución del preflight.
- **B2, API nativa:** dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f (commit 7be5712) se bloqueó en b2_authorize_account con storage_b2_authorization_failed. El log no expone el status HTTP ni el código nativo que permitirían identificar el dato exacto rechazado.
- **Producción:** dpl_Dczf3WWnPG4cnCaJhf6PS8MzmxLe está READY con commit b52003ee y tiene el alias productivo asignado. READY confirma publicación, no escritura/lectura física actual ni archivado E2E.
- **Runtime:** se observaron errores Auth.js OIDC InvalidEndpoints y PostgreSQL 57P01, además de advertencias SSL. No se correlacionaron con las 14 partes de audio pendientes; quedan como hallazgos separados, no como causas atribuidas.

El antecedente funcional sigue siendo una sesión con 14 partes pendientes y cero partes vinculadas como verificadas. El botón Archivar bloquea correctamente mientras falta integridad. La evidencia disponible no permite asegurar que no haya otros fallos.

**Conclusión diagnóstica:** al menos tres fallos distintos de la cuota quedan demostrados en eventos de despliegue: fallo de roundtrip cifrado, fallo de resolución de módulo y rechazo de autorización B2. Los errores OIDC/Neon se observaron sin correlación con archivado. No es correcto afirmar que Blob sea el único problema ni que B2 ya esté aceptado.

## 2. RAID frente a la propuesta

Interpreto «Right» como «RAID» porque el dictado previo nombra RAID explícitamente. No propongo reproducir RAID literalmente: RAID combina discos para tolerar fallos físicos, pero no sustituye copias de seguridad independientes. Un borrado, corrupción o ransomware puede replicarse también a los discos espejo. (Western Digital: https://www.westerndigital.com/solutions/raid/what-is-raid-1-disk-mirroring).

Para Cora/Khora propongo una capa de aplicación: checkpoints automáticos, cola local, un coordinador que elija proveedor por salud/capacidad, verificación física de cada escritura, réplica asíncrona a otro proveedor, reintentos idempotentes, circuit breaker, reconciliación y restauración probada. No se llama recursivamente a un proveedor desde otro; se usa un único orquestador para evitar ciclos y estados ambiguos.

Una dirección preliminar a evaluar en CUSTODIA-RES-001 es: guardar primero cada checkpoint en una cola local; escribir de forma write-through al primer proveedor sano y comprobar GET/hash; después replicar mediante write-behind al segundo proveedor. El estado «guardado en nube» solo se muestra tras verificación física. IndexedDB puede ser expulsado por cuotas del navegador y es best-effort por defecto, por lo que sirve de protección temporal, no como garantía eterna (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). Backblaze Object Lock/versionado merece evaluación para proteger borrados, con retención deliberada (https://www.backblaze.com/docs/en/cloud-storage-object-lock).

## 3. Secuencia propuesta para visto bueno

| Orden | Tarea | Resultado |
|---:|---|---|
| 1 · P0 | CUSTODIA-B2-005 · Diagnóstico verificable | Causa de Blob, B2 y la cadena de archivado caracterizadas; fallos confirmados y límites separados. |
| 2 · P0 | CUSTODIA-B2-006 · Habilitar archivado con B2 | PUT/GET físico, SHA/longitud, vínculo de partes, manifiesto y archivado E2E probados. |
| 3 · P1 | CUSTODIA-B2-007 · Pulido | Eliminar deuda accidental después de que el archivado funcione, sin quitar controles esenciales. |
| 4 · P1 | CUSTODIA-RES-001 · Diseño multialmacén | Comparar write-through, write-behind, quórum, cola local, salud y recuperación. |
| 5 · P2 | CUSTODIA-RES-002 · Implementación y certificación | Implementar y probar el diseño en entornos aislados; producción mantiene compuerta separada. |

Las cinco tareas siguen en propuesta_pendiente_aprobacion. CUSTODIA-03 y CUSTODIA-01 permanecen abiertas; no se borran ni renumeran. CUSTODIA-B2-004 queda supersedida solo como objetivo final B2-exclusivo; sus pruebas e historia se conservan. B2 es el medio inmediato para intentar recuperar el archivado, no el único proveedor final.

## 4. Formato de tareas provisionales

Se creó PLANTILLA-TAREA-PROVISIONAL.md con identidad, estado, prioridad, dependencias, objetivo, alcance, precondiciones, secuencia, criterios falsables, seguridad/reversión, evidencia y crónica. Es una plantilla de tarea reutilizable; no crea OCP, control, responsable, folio ni autorización.

## 5. Conexiones remotas

Se conservó el literal PSK14 y se evaluó tentativamente como PC-14. PC-14 ejecutaba como PC 13. La segunda conexión tenía fila4 cargado, pero el proceso RDC ejecutaba como MantenimientoRCI; Metacanon/P036 impide usar ese perfil como raíz de trabajo. Solo se hicieron comprobaciones read-only de identidad; no se usaron las conexiones para escribir archivos ni lanzar CI. La documentación se trabajó directamente mediante GitHub.

## 6. Compuerta

Esta sesión cambió documentación y tareas provisionales solamente. No modificó código de producto, producción, credenciales, variables, bucket/CORS, SQL productivo ni objetos originales. Se solicita visto bueno de la secuencia de cinco hitos antes de iniciar la implementación.

## Fuentes técnicas

- RAID y por qué no sustituye un backup: https://www.westerndigital.com/solutions/raid/what-is-raid-1-disk-mirroring
- Límites/evicción del almacenamiento local web: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Backblaze B2 Object Lock: https://www.backblaze.com/docs/en/cloud-storage-object-lock
- Buenas prácticas de seguridad de backups: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_backing_up_data_secured_backups_data.html

**Siguiente paso:** aprobación o corrección de esta secuencia; todavía no se ha autorizado el cambio de producto.
