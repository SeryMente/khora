# CUSTODIA-B2-006 · Persistencia nueva B2 y disponibilidad por archivo legacy

> **Estado:** RESUELTA POR REENFOQUE · la aceptación E2E autenticada sigue técnicamente pendiente y queda fuera del objetivo activo.  
> **OCP padre:** [frentes/custodia/OBJETO-CANONICO.md](../../../OBJETO-CANONICO.md).  
> **Control heredado:** [CONTROL-RESPONSABILIDAD.json](../../../CONTROL-RESPONSABILIDAD.json).

## Objetivo vigente

Asegurar que todo contenido creado desde ahora en KHORA se escriba exclusivamente en Backblaze B2, que cada escritura se valide físicamente por GET/read-back y SHA-256/longitud, y que la indisponibilidad de los objetos históricos Vercel Blob se represente claramente por archivo sin bloquear las operaciones nuevas ni el contenido textual.

## Comportamiento requerido

### Objetos nuevos · Backblaze B2

- Todas las rutas de escritura de audio, importación, transcripción y derivados usan el adaptador B2.
- La envoltura cifrada KHC1 se conserva.
- Después del PUT se realiza GET físico autenticado del mismo objeto.
- Se comparan longitud y SHA-256 de los bytes leídos con los bytes escritos.
- Solo después del cotejo se devuelve el localizador para registrar la parte como verificada.
- Un error de autorización, PUT, GET o integridad detiene la operación. No hay fallback de escritura a Blob.
- Las credenciales existentes se usan desde la configuración segura; no se imprimen, copian al repositorio ni se crean claves nuevas por esta tarea.

### Objetos históricos · Vercel Blob

- Los localizadores históricos permanecen sin cambios.
- Mientras la lectura esté suspendida, se identifica cada archivo como:
  Vercel Blob · temporalmente no disponible · recuperación/migración pendiente.
- La API usa una respuesta estructurada de indisponibilidad temporal, distinta de not_found, corrupción o pérdida.
- No se ejecutan probes repetidos a cada objeto cuando el proveedor está suspendido; la bandera de lectura legacy permanece desactivada hasta reactivación operativa.
- Si una sesión mezcla partes Blob y B2, se conservan los estados individuales. Las partes B2 accesibles pueden reproducirse; una reconstrucción completa no se declara posible mientras falte una parte requerida.
- El texto, checkpoints, versiones y edición textual continúan disponibles aunque el audio Blob no lo esté.

## Secuencia

1. Clasificar referencias por proveedor/generación sin alterar los localizadores.
2. Pausar la lectura legacy mediante configuración independiente del selector B2.
3. Exponer proveedor, generación, disponibilidad y estado de migración en el manifiesto y pipeline.
4. Normalizar las respuestas de playback/reconstrucción para que el Blob bloqueado sea 503 temporarily_unavailable, no una falsa declaración de archivo perdido.
5. Mostrar el indicador por parte en el reproductor y deshabilitar solo las acciones que requieran el conjunto de bytes no disponible.
6. Asegurar que putEncryptedObject() hace GET/read-back, coteja longitud/SHA-256 y falla cerrado.
7. Ejecutar pruebas del adaptador, rutas, pipeline/UI, build y aceptación E2E.

## Criterios de aceptación

| Criterio | Evidencia exigida | Estado |
|---|---|---|
| Localizador nuevo siempre B2 | Adaptador B2-only, todas las rutas nuevas usan el adaptador; prueba negativa sin fallback | PASS en código y suite focal; captura productiva autenticada pendiente |
| Integridad de escritura nueva | GET/read-back posterior al PUT; longitud y SHA-256 idénticos | PASS sintético en suite del adaptador; el roundtrip de una captura productiva autenticada tras recarga sigue pendiente |
| Blob legacy claramente identificado | Estado por archivo y respuesta 503 estructurada, sin marcar corrupción/pérdida | Implementado y desplegado; smoke visual autenticado pendiente por SSO |
| Contenido de texto aislado del audio legacy | Guardar/editar texto y checkpoints con Blob inaccesible | Implementación separada; demostración autenticada en sesión real pendiente |
| Sesión mixta | Partes B2 utilizables; partes Blob señalan espera de recuperación; MP3 completo bloqueado si falta audio requerido | Implementado en manifiesto/pipeline/UI; E2E real pendiente |
| Prueba E2E autenticada | Captura real, registro B2, recarga y read-back de texto/audio con referencias/bytes/SHA cotejados | PENDIENTE — requiere sesión KHORA autenticada autorizada |
| Publicación | Build y typecheck del commit exacto PASS; preflight B2 y deployment Production | PASS — `dpl_6M6ebaAvNPpAtRspfX5QhffEJvVJ` READY; SHA `f0224c1`; preflight read-only PASS; Next build/TypeScript PASS, 78/78 páginas. Acceso autenticado de navegador pendiente |

## Exclusiones

No incluye migrar los objetos históricos Blob, copiar sus bytes, cambiar referencias SQL/JSONB, aplicar ledger/backfill, borrar originales, habilitar de nuevo el acceso Blob, hacer doble escritura, incorporar proveedor adicional ni alterar CORS/seguridad del bucket.

La migración histórica se reabrirá en una tarea/fase posterior cuando el operador reactive/pague Vercel Blob, se compruebe GET y autorice expresamente la migración. Hasta entonces, los datos permanecen en sus localizadores originales y el estado de recuperación continúa pendiente.

## Estado de implementación

Los cambios están integrados en `main` (commit `f0224c1368fb15a3452335a44305c6efa85eef79`) y publicados en Vercel Production (`dpl_6M6ebaAvNPpAtRspfX5QhffEJvVJ`, `READY`). El preflight Production confirmó `native_auth`, `master_key`, `bucket_identity`, `bucket_private` y `sse_b2_default`: PASS. El build de Production se ejecutó con `node --import tsx scripts/preflight-object-storage.ts && next build --webpack`; `migrate-runtime.mjs` se omitió deliberadamente y no se ejecutaron migraciones SQL/Neon. El Preview del mismo código de aplicación (SHA `9c171f798c03a24246b6fcff55c3f68a5d073cec`) completó TypeScript, UI Contract, cuatro suites focales (40 PASS/0 FAIL según el acta de validación) y Next build. La suite global conserva fallos ajenos al alcance y no se declara PASS.

El endpoint público `https://khora-web.vercel.app/` respondió al lector de comprobación con `login_required` por la protección SSO; los perfiles de navegador conectados no tienen una sesión KHORA registrada. Por tanto no se completó la prueba autenticada de captura/recarga/read-back. No afirmar aceptación E2E ni cierre de B2-006 hasta realizarla.

No se ejecutó migración histórica, backfill, actualización de referencias Neon ni borrado de originales Blob. Los objetos históricos siguen en sus localizadores; la recuperación/migración continúa pendiente de reactivación de Blob y nueva autorización.


## Disposición de cierre · 2026-11-10 · reenfoque de CUSTODIA

**Estado de gestión:** RESUELTA POR REENFOQUE. El operador definió que el único objetivo actual del frente es el inventario forense de dictados/archivos conservados y la conciliación del panel «Recuperar capturas» (CUSTODIA-01).

Este cierre es administrativo y de alcance. No significa que el objetivo técnico histórico de este expediente se haya ejecutado, probado o aceptado; en particular, no convierte builds, preflights, E2E pendientes, migraciones diferidas o propuestas en PASS. Se conserva todo el contenido y evidencia histórica de este README.

No reabrir ni ejecutar este expediente dentro del alcance actual. Sus referencias a objetos, localizadores o diagnósticos podrán consultarse como fuentes de evidencia subordinadas a CUSTODIA-01, sin reactivar el objetivo anterior. No se ha modificado código, Neon, B2, Blob, configuración ni producción.
