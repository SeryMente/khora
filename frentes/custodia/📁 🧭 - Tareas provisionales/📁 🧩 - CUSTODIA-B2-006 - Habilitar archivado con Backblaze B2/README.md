# CUSTODIA-B2-006 · Persistencia nueva B2 y disponibilidad por archivo legacy

> **Estado:** EN CURSO · **Prioridad:** P0 · **Hito:** publicación de persistencia híbrida.  
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
| Localizador nuevo siempre B2 | Prueba de rutas B2-only y ausencia de fallback Blob | PENDIENTE |
| Integridad de escritura nueva | GET físico posterior al PUT; longitud y SHA-256 idénticos | PENDIENTE |
| Blob legacy claramente identificado | Estado por archivo y respuesta 503 estructurada, sin marcar corrupción/pérdida | PENDIENTE |
| Contenido de texto aislado del audio legacy | Guardar/editar texto y checkpoints con Blob inaccesible | PENDIENTE |
| Sesión mixta | Partes B2 utilizables; partes Blob señalan espera de recuperación; MP3 completo bloqueado si falta audio requerido | PENDIENTE |
| Prueba E2E autenticada | Captura real, registro B2, recarga y read-back de texto/audio con referencias/bytes/SHA cotejados | PENDIENTE |
| Publicación | Build y typecheck del commit exacto PASS; smoke checks de la deployment | PENDIENTE |

## Exclusiones

No incluye migrar los objetos históricos Blob, copiar sus bytes, cambiar referencias SQL/JSONB, aplicar ledger/backfill, borrar originales, habilitar de nuevo el acceso Blob, hacer doble escritura, incorporar proveedor adicional ni alterar CORS/seguridad del bucket.

La migración histórica se reabrirá en una tarea/fase posterior cuando el operador reactive/pague Vercel Blob, se compruebe GET y autorice expresamente la migración. Hasta entonces, los datos permanecen en sus localizadores originales y el estado de recuperación continúa pendiente.

## Estado de implementación

La rama fix/custodia-legacy-blob-status-b2-writes-20261110 contiene los cambios de esta entrega. No marcar criterios como PASS ni considerar B2 garantizado hasta que las pruebas se ejecuten sobre el commit exacto y se acepte la recuperación E2E autenticada.
