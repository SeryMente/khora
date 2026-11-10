<!-- LIST_VERSION=0.32; LIST_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Tareas vigentes · Frente Custodia

> **Estado:** PROVISIONAL. El único objeto canónico es [OBJETO-CANONICO.md](OBJETO-CANONICO.md); este archivo es el índice ejecutivo de trabajo. Se eliminan de la ejecución activa los planes ya supersedidos. Los registros históricos e instrucciones originales se conservan en sus rutas de evidencia.

- **Actualización:** 2026-11-10.
- **Decisión vigente:** persistencia híbrida por generación de objeto.
- **Instrucción actual:** los objetos históricos que ya residen en Vercel Blob permanecen allí. Cuando Blob no permita leerlos, se muestran individualmente como temporalmente no disponibles y con recuperación/migración pendiente. Toda nueva escritura va exclusivamente a Backblaze B2. La indisponibilidad del legado no bloquea la creación, guardado de texto, checkpoints, edición ni persistencia de contenido nuevo.
- **Migración histórica:** DIFERIDA. No copiar objetos Blob, no reescribir referencias SQL/JSONB, no ejecutar backfill ni borrar originales hasta que el operador reactive/pague Vercel Blob, se compruebe lectura física y autorice expresamente esa fase.

## 1. Trabajo activo

| Orden | ID existente | Prioridad | Estado | Trabajo que sí se ejecutará |
|---:|---|---|---|---|
| 1 | CUSTODIA-B2-006 | P0 | EN CURSO | Cerrar la aceptación E2E autenticada que queda pendiente: crear una captura nueva con sesión KHORA autorizada; verificar que cada parte se escribe en B2 y que la aplicación la recupera después de recarga con longitud y SHA-256 cotejados; demostrar que texto/checkpoints y una sesión mixta con partes Blob legacy temporalmente no disponibles siguen operativos. Production ya está publicada y el preflight B2 de solo lectura pasó; falta esta prueba en navegador autenticado. |

## 2. Trabajo diferido y condiciones de reanudación

| ID existente | Estado | Se reanuda únicamente cuando | Alcance al reanudar |
|---|---|---|---|
| CUSTODIA-B2-005 | DIFERIDA | Vercel Blob vuelva a estar activo y el operador pida comprobar el acceso | Verificar lectura/exportación física del legado y documentar su disponibilidad real. |
| CUSTODIA-B2-002 | DIFERIDA | Blob permita GET, el inventario fuente pueda leerse y el operador autorice expresamente la migración | Diseñar/ejecutar la copia histórica no destructiva a B2, verificar cada objeto y reconciliar referencias en una fase separada. |
| CUSTODIA-B2-007 | DIFERIDA | Surja deuda técnica concreta después de aceptar el flujo híbrido | Pulido acotado sin reducir controles de integridad. |
| CUSTODIA-RES-001/002 | DIFERIDAS | Se solicite volver a evaluar resiliencia multiproveedor | Evaluar o implementar un proveedor adicional; no forman parte de esta entrega. |

## 3. Otros expedientes existentes

- **CUSTODIA-01, CUSTODIA-03 y CUSTODIA-04:** permanecen con sus estados, identificadores y evidencia existentes. No forman parte del alcance de esta entrega y no se cierran por esta actualización.
- **CUSTODIA-02:** retirada. Su identificador no se reutiliza.
- No se crean identificadores nuevos ni se duplican expedientes.

## 4. Criterios de aceptación de CUSTODIA-B2-006

1. Toda nueva escritura de contenido de audio usa B2; si B2 falla, falla cerrada y nunca escribe el objeto nuevo en Blob.
2. Ninguna escritura se registra como verificada hasta completar GET/read-back de B2 y comparar longitud y SHA-256 de los bytes almacenados.
3. Los objetos Blob antiguos se clasifican por objeto como vercel_blob_legacy, legacy y migration_status=pending; con lecturas suspendidas, muestran temporarily_unavailable y un mensaje que no los declara perdidos ni corruptos.
4. Una parte B2 nueva sigue siendo utilizable aunque otras partes históricas Blob estén temporalmente no disponibles. La reproducción/descarga que requiera un conjunto incompleto no se presenta como completa.
5. La indisponibilidad Blob no bloquea texto, checkpoints, nuevas capturas ni edición de texto.
6. La prueba negativa confirma que un fallo de B2 no produce fallback de escritura a Blob.
7. Una captura autenticada se archiva en B2, se recarga y se recupera desde B2 con sus referencias, partes, bytes y SHA-256 cotejados. **Estado: PENDIENTE — falta una sesión de navegador KHORA autenticada autorizada.**
8. **Publicación y build:** PASS. Production `dpl_6M6ebaAvNPpAtRspfX5QhffEJvVJ`, `READY`, `main` SHA `f0224c1368fb15a3452335a44305c6efa85eef79`; preflight B2 de solo lectura PASS; Next build y TypeScript PASS; 78/78 páginas. Preview del mismo código de aplicación SHA `9c171f798c03a24246b6fcff55c3f68a5d073cec`: cuatro suites focales 40 PASS/0 FAIL según el registro de validación, UI Contract y build PASS. **El E2E autenticado no se da por aprobado.**

## 5. Exclusiones vigentes

No realizar ahora migración histórica, backfill, actualización de punteros Neon, escrituras SQL de custodia, borrado/sobrescritura de Blob, doble escritura, fallback de escritura a Blob, incorporación de claves nuevas ni cambio de CORS/políticas del bucket. Reactivar lecturas Blob será un cambio operativo separado y explícito; la bandera de lectura legacy permanece desactivada hasta confirmar acceso.

El estado de una tarea solo avanza con evidencia de la versión exacta probada. Un build READY no equivale a persistencia física ni a aceptación E2E.
