# KHORA · Persistencia híbrida temporal Vercel Blob → Backblaze B2

**Estado:** contrato técnico adoptado; implementación en rama y pendiente de pruebas, merge y despliegue. No constituye aceptación E2E ni migración histórica.
**Fecha:** 2026-11-10
**Rama de trabajo:** `fix/custodia-legacy-blob-status-b2-writes-20261110`
**Alcance:** audio original, partes, importaciones, derivados MP3 y sus referencias en Neon.

## 1. Decisión operativa

KHORA operará temporalmente con dos generaciones de objetos y dos proveedores, sin replicación automática entre ellos:

- **Legado — Vercel Blob:** conserva íntegros los objetos ya escritos y sus localizadores actuales en Neon. Su migración a B2 queda expresamente PENDIENTE hasta que el propietario reactive/pague Vercel Blob y autorice el rescate.
- **Nuevas escrituras — Backblaze B2:** todo objeto creado desde la activación de este contrato se escribe exclusivamente en el bucket privado B2 de KHORA.
- **Neon PostgreSQL:** conserva el registro de negocio, el manifiesto, proveedor/localizador, bytes, SHA-256, estado de verificación y relación con sesión/volcado. La indisponibilidad del proveedor no borra ni invalida el texto, los checkpoints, las versiones ni los metadatos.

No se ejecutará backfill, no se cambiarán en bloque URLs históricas, no se borrarán originales Blob y no se hará fallback de una escritura B2 fallida hacia Blob.

## 2. Diagnóstico del cableado observado en main

La inspección de `main` confirma:

1. `lib/storage/object-reference.ts` distingue localizadores B2 del host heredado `*.blob.vercel-storage.com`.
2. `lib/server/object-storage.ts` enruta las lecturas según el localizador y `putEncryptedObject()` exige `KHORA_OBJECT_STORAGE=b2`; no implementa fallback de escritura a Vercel Blob.
3. Las rutas de captura `app/api/audio/route.ts`, importación `app/api/audio/importar/procesar/route.ts`, archivo de transcripción `app/api/transcribir/archivo/route.ts` y derivación `lib/server/audio-mp3.ts` usan `putEncryptedObject`.
4. `app/api/audio/[id]/manifiesto/route.ts` calcula actualmente `audio_status` principalmente desde la integridad del manifiesto. Ese cálculo no prueba que el proveedor remoto permita recuperar los bytes.
5. `app/api/audio/[id]/parte/[index]/route.ts` y `app/api/audio/[id]/route.ts` convierten fallos de lectura en errores genéricos de Blob. La UI puede terminar presentando como fallo de integridad/ausencia lo que en realidad es indisponibilidad temporal del proveedor.
6. `lib/server/pipeline.ts` clasifica audio usando metadatos de Neon y no separa de forma explícita proveedor histórico frente a proveedor nuevo.
7. `app/sistema/custodia/page.tsx` y `app/components/shared/PipelineView.tsx` ya presentan estados de audio, pero no expresan claramente «legado Vercel pendiente de recuperación» como estado distinto de «ausente», «corrupto» o «incompleto».

Conclusión: el encaminamiento básico B2/Blob y la escritura B2-only ya existen en el código inspeccionado. La brecha prioritaria es la semántica de disponibilidad por objeto, su exposición en manifiestos/pipeline/UI y la aceptación E2E real de la persistencia B2.

## 3. Contrato de proveedores y localizadores

El proveedor se deriva del localizador validado, nunca del nombre del archivo ni de una preferencia global:

- URL B2 dentro de la región/bucket configurados → `backblaze_b2`.
- URL HTTPS validada bajo `*.blob.vercel-storage.com` → `vercel_blob_legacy`.
- Cualquier otro host, esquema, query string, credencial embebida o localizador malformado → rechazado.

Cada parte del manifiesto debe exponer, sin secretos:

- `storage_provider`: `backblaze_b2` | `vercel_blob_legacy` | `unknown`.
- `storage_generation`: `new` | `legacy` | `unknown`.
- `availability`: `available_verified` | `temporarily_unavailable` | `not_checked` | `integrity_failed` | `not_found`.
- `migration_status`: `not_required` | `pending` | `copied_verified` | `reference_switched` | `source_retained`.

Los campos de disponibilidad física se mantienen separados de `estado_verificacion`: este último documenta la verificación histórica al ingresar; no promete que el objeto siga accesible hoy.

## 4. Comportamiento de lectura durante la suspensión de Blob

Para los localizadores `vercel_blob_legacy`:

- La interfaz debe mostrar: **«Audio histórico en Vercel Blob · temporalmente no disponible · migración pendiente»**.
- No debe etiquetarlo como eliminado, corrupto, inexistente ni recuperable hasta comprobarlo.
- Si el propietario decide pausar los intentos de lectura mientras el store está suspendido, un selector de configuración explícito debe devolver un error tipado `storage_legacy_temporarily_unavailable` sin llamar al proveedor. Al reactivar el acceso de Vercel, se habilitará la lectura sin cambiar localizadores.
- Si se intenta leer y el proveedor responde 403 por suspensión, el backend normalizará el resultado al mismo estado temporal, sin filtrar URLs internas ni detalles de credenciales.
- La reproducción, descarga, transcripción y generación MP3 que dependan de esas partes se deshabilitan o informan claramente que están pendientes. No se presenta un MP3 como disponible si depende de partes históricas no recuperables.
- El texto, las versiones, los checkpoints, la edición y el resto del registro permanecen accesibles y operativos.

Para los localizadores B2:

- La lectura usa exclusivamente el transporte B2 autenticado.
- Un fallo B2 se reporta como fallo B2; nunca dispara lectura de Blob como fallback.
- La UI solo mostrará **«Backblaze B2 · verificado»** cuando exista evidencia de read-back físico y cotejo de longitud/SHA-256 para ese objeto.

## 5. Contrato de nuevas escrituras

Todas las nuevas escrituras de objetos pasan por el adaptador común y requieren:

1. `KHORA_OBJECT_STORAGE=b2` y configuración/credenciales B2 válidas.
2. Cifrado KHC1 antes de abandonar el servidor, según el contrato vigente.
3. Escritura en bucket privado B2 con cifrado del lado del servidor.
4. GET/read-back del objeto escrito.
5. Descifrado y cotejo de longitud y SHA-256 contra los bytes originales.
6. Solo después, registro/vínculo en Neon con localizador B2 y estado `verificado`.

Si falla cualquier paso, no se registra el objeto como verificado ni se usa Vercel Blob como destino alternativo. El flujo devuelve un error específico de persistencia y conserva evidencia suficiente para reintento/reconciliación sin perder texto/checkpoints ya persistidos.

El acceso a los registros de texto y checkpoints no debe depender de que un audio histórico Blob esté disponible. La escritura del nuevo audio B2 debe ser una transacción lógica independiente del estado de los objetos históricos.

## 6. Estados de UI recomendados

| Estado | Etiqueta visible | Acciones |
|---|---|---|
| B2 con read-back correcto | Backblaze B2 · verificado | Reproducir, descargar y procesar según permisos |
| Blob legado pausado/suspendido | Vercel Blob · temporalmente no disponible · migración pendiente | Deshabilitar solo acciones que necesitan los bytes; conservar texto y metadatos |
| Proveedor no consultado | Almacenamiento no comprobado | Permitir consulta bajo demanda; no afirmar disponibilidad |
| Bytes ausentes confirmados | Archivo no encontrado | Mostrar incidente de ausencia; no confundir con suspensión |
| Hash/descifrado no coincide | Integridad no válida | Bloquear reproducción/procesamiento y abrir incidente |

El estado global del volcado debe poder ser mixto: por ejemplo, partes antiguas en Blob pendientes y partes nuevas en B2 verificadas. La indisponibilidad de una parte no degrada automáticamente las demás.

## 7. Migración histórica futura (fuera del alcance de este corte)

Cuando Vercel Blob vuelva a permitir lectura y exista autorización expresa para rescatar:

1. Enumerar todos los objetos con paginación exhaustiva.
2. Cotejar cada localizador con las referencias Neon, incluidas las ocurrencias JSONB.
3. Descargar cada objeto original y calcular SHA-256 de bytes cifrados; validar también longitud y envelope KHC1 sin alterar el original.
4. Copiar a B2 bajo clave determinista y no sobrescribible.
5. Leer de vuelta B2 y cotejar bytes/longitud/SHA-256.
6. Registrar recibo por objeto y reconciliar cada ocurrencia de referencia de forma transaccional y exacta.
7. Mantener el original Blob intacto hasta aceptación explícita del propietario y política de retención.
8. La migración puede reanudarse por objeto; no se permite declarar completitud con páginas, referencias o hashes pendientes.

Hasta que ese proceso se ejecute y se acepte, `migration_status=pending`.

## 8. Pruebas y criterios de aceptación

### A. Aislamiento del legado
- Un objeto Blob marcado como temporalmente inaccesible no impide consultar el texto, editarlo, guardar versiones ni crear checkpoints.
- La UI muestra estado temporal pendiente, no ausencia/corrupción.
- Las acciones que requieren bytes Blob informan la indisponibilidad concreta.
- La prueba no debe realizar escrituras, eliminaciones ni cambios de referencias históricas.

### B. Nuevas escrituras
- Captura normal, captura por partes, importación, archivo de transcripción y MP3 derivado escriben en B2.
- Cada flujo ejecuta GET/read-back y SHA-256.
- Un fallo B2 no provoca fallback a Blob.
- Un fallo de audio no revierte texto/checkpoint ya persistido.
- Recarga de página y nueva sesión pueden recuperar un objeto B2 real autorizado.

### C. Mezcla de generaciones
- Un registro con partes Blob y B2 muestra proveedor/estado por parte.
- El reproductor no afirma que la sesión completa esté disponible si una parte requerida está temporalmente bloqueada.
- Una parte B2 sana puede probarse/recuperarse independientemente de una parte Blob pendiente, sin fabricar continuidad acústica ni marcar completa una captura parcial.

### D. Producción
- Typecheck, suite unitaria, contratos UI y pruebas E2E focales en Preview.
- Prueba E2E física con sesión autenticada y datos sintéticos/no sensibles.
- Read-back independiente tras recarga.
- Confirmar que la configuración Production selecciona B2 y que no hay fallback de escritura.
- No promover a Production ni cambiar datos Neon de producción hasta que el operador autorice el corte y las pruebas estén verdes.

## 9. Fuera de alcance y prohibiciones

- No migrar ahora los 636 objetos Blob.
- No borrar, mover, sobrescribir ni renombrar objetos Blob.
- No reescribir referencias históricas en Neon.
- No convertir una suspensión 403 en «archivo perdido».
- No declarar verificación física basándose solo en filas Neon o estado READY de un deployment.
- No cambiar credenciales ni crear Application Keys adicionales.
- No activar una arquitectura de fallback dual de escritura.

## 10. Estado técnico de la entrega

- Inventario Vercel Blob: 636/636 objetos enumerados.
- Lectura de contenido probada: 0/5 vía SDK y 0/5 vía URL/CDN; ambas rutas devolvieron `blob_read_forbidden`.
- Copias históricas en B2: 0.
- Referencias Neon cambiadas por backfill: 0.
- Objetos Blob eliminados: 0.
- B2: preflight/autorización, bucket privado y prueba sintética PUT/GET/SHA-256 acreditados en el ciclo previo; archivado E2E productivo con sesión propietaria y read-back tras recarga todavía no aceptado.
- Implementación en rama `fix/custodia-legacy-blob-status-b2-writes-20261110`: lectura legacy desactivada por defecto mediante `KHORA_LEGACY_BLOB_READS_ENABLED`; clasificación de proveedor por localizador; `putEncryptedObject()` requiere GET/read-back y SHA-256/longitud; manifiesto y pipeline exponen estado por objeto; rutas de reproducción normalizan legacy suspendido a 503; reproductor muestra estado y preserva texto.
- Se añadieron pruebas unitarias para estado legacy pausado, clasificación B2, read-back B2 y fallo cerrado ante hash/longitud discordantes. Su ejecución en el commit final aún debe acreditarse.
- Rama no fusionada ni desplegada. Captura autenticada E2E y recuperación después de recarga siguen pendientes.
