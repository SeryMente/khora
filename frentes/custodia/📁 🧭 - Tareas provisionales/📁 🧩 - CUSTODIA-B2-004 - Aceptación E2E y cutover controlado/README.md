# CUSTODIA-B2-004 · Expediente histórico supersedido

**Estado:** `SUPERSEDIDA` · **No ejecutar.**  
**Motivo:** el antiguo cutover integral Blob→B2 contradice la decisión híbrida vigente del 2026-11-10.

## Disposición vigente

- Los objetos que ya residen en Vercel Blob permanecen en su origen. Su migración queda diferida hasta que Blob se reactive, permita lectura física y el operador emita una autorización expresa nueva.
- Todas las nuevas escrituras de KHORA se realizan exclusivamente en Backblaze B2, con GET/read-back físico y cotejo de longitud/SHA-256.
- La indisponibilidad de Blob se representa por archivo como temporal; no se marca el objeto como perdido ni corrupto.
- La tarea activa que concentra implementación, pruebas y publicación es **CUSTODIA-B2-006**, registrada en [LISTA-TAREAS-PROVISIONAL.md](../../LISTA-TAREAS-PROVISIONAL.md) y gobernada por [OBJETO-CANONICO.md](../../OBJETO-CANONICO.md).

## Alcance que queda expresamente fuera

No ejecutar backfill, inventario adicional de Blob, reconciliación de referencias SQL/JSONB, cambios en Neon, corte de referencias ni eliminación/sobrescritura de originales. No introducir doble escritura ni fallback de escrituras nuevas hacia Blob.

Este expediente conserva únicamente su identificador histórico. No representa un trabajo activo ni habilita acciones sobre datos históricos.