# Resultado operativo de CUSTODIA · límite de tres ciclos · 2026-11-11

**Instrucción del operador:** terminar CUSTODIA en un máximo de tres ciclos; evitar complejidad y fragmentación; recuperar instrucciones vigentes y ejecutar el archivo extremo a extremo sin usar la interfaz ni el dispositivo local.

## 1. Instrucción y autorización recuperadas

Se releyeron CONTROL-RESPONSABILIDAD.json (generación 11), INSTRUCCION-ARCHIVO-RECUPERABILIDAD-20261110.md e INSTRUCCION-AUTORIZACION-ARCHIVO-PRODUCTION-20261110.md.

El objetivo literal es archivar todos los registros recuperables y dejar como pendientes solo los que tengan impedimento actual. La autorización CUSTODIA-ARCHIVE-AUTH-20261110 incluye: descifrar checkpoints y metadatos estrictamente necesarios; lectura física/read-back B2; procesamiento verificable de 216 fragmentos locales de dos sesiones; lectura Blob cuando el proveedor lo permita; creación y vínculo idempotente de Volcados/sesiones/partes en Neon Production; preservar originales y excluir registros ajenos o sin titularidad demostrada.

Se mantienen las exclusiones: no borrar/sobrescribir originales, no asignar otros titulares, no crear Application Keys B2 adicionales, no mezclar credenciales EP, no declarar Blob perdido por suspensión. La instrucción posterior del operador excluye usar monitor, Chrome local, IndexedDB y RDC para esta ejecución.

## 2. Validación actual de inventario y almacenamiento

SELECT agregado en Neon Production, con el predicado completo de titularidad `COALESCE(dictado_session.custodia_owner, dictado_session.checkpoint_usuario, volcado.usuario)`, devolvió:

| Métrica | Resultado |
|---|---:|
| Sesiones atribuibles | 95 |
| Ya vinculadas a Volcado | 16 |
| Pendientes sin Volcado | 79 |
| Pendientes con audio | 44 |
| Partes de audio pendientes | 1.039 |
| Referencias B2 | 785 |
| Referencias Vercel Blob | 254 |

El deployment Production más reciente consultado es READY, commit `f0224c1368fb15a3452335a44305c6efa85eef79`. Su log de build registra `[storage-preflight] native_auth=PASS master_key=PASS bucket_identity=PASS bucket_private=PASS sse_b2_default=PASS` y `read_only_gate=PASS`. Esto demuestra que B2 pasó el preflight nativo durante ese build; no demuestra read-back físico de cada objeto ni ejecución de archivo.

El store Vercel Blob `khora-audio` fue reconsultado y permanece `limits-exceeded-suspended`, `billingState=suspended`, `usageQuotaExceeded=true`, con 636 objetos declarados y 1.010.497.194 bytes. No se hizo list ni GET; la lectura legacy sigue fallando cerrada y no se habilitó.

## 3. Resultado de la ejecución por vías existentes

- `POST /api/dictado` es la ruta primaria que ejecuta `reclamarSesion()` y `guardarDictado()`. Requiere NextAuth del propietario.
- `POST /api/dictado/checkpoint?recover=1` también requiere NextAuth. La ruta `GET /api/dictado/checkpoint` y el endpoint Vault Agent también obtienen el titular de `auth()`.
- `guardarDictado()` mantiene transacción, vínculo por sessionId, idempotencia y cotejo del checkpoint. No se sustituyó por SQL directo.
- No existe una identidad de servicio CUSTODIA activa documentada. `INTERNAL_TRIGGER_SECRET` se usa en Jules/orquestador y no se reutilizó. OAuth/MCP no ofrece scope de escritura CUSTODIA; MCP normativo permanece DESACTIVADO.
- La consulta Vercel de variables Production, incluso con `decrypt=true`, devuelve `decrypted=false` y sin valor para `DATABASE_URL`, `X_KHORA_KEY`, `AUTH_SECRET` y las dos variables Master Application Key. No se copiaron secretos al chat ni al repositorio.
- El código `khora-web/lib/server/cripto.ts` necesita `X_KHORA_KEY` para descifrar KHC1. Sin ese valor y sin sesión autorizada no puede recuperarse el texto de checkpoints ni ejecutarse el escritor canónico desde este canal.

**Resultado ejecutado:** no se invocó la ruta de archivo, no se crearon Volcados, no se modificaron filas de negocio y no se hizo GET de objetos. No se falsificó identidad, no se creó un actor privilegiado nuevo y no se ejecutó la reconciliación global que podría hacer DDL incluso en DRY_RUN.

## 4. Residuales y su bloqueo actual

| Unidad | Estado final de este ciclo | Bloqueo concreto |
|---|---|---|
| 79 sesiones sin Volcado | BLOQUEADO_AHORA | No existe contexto NextAuth del titular ni lector de checkpoints autenticado disponible en este canal. |
| 785 partes B2 | PENDIENTE_INTEGRIDAD | B2 pasó preflight, pero falta read-back físico por el lector autorizado con sujeto del titular. |
| 254 partes Blob | BLOQUEADO_AHORA | Store suspendido/cuota excedida; no se habilitó lectura legacy. |
| 216 fragmentos locales | BLOQUEADO_AHORA | Se prohíbe el acceso al dispositivo/IndexedDB/RDC; no hay canal local alternativo autorizado disponible. |
| Índice 317 | PENDIENTE_INTEGRIDAD | Eventos prueban intento de 82.195 bytes y `audio_no_verificable`; no hay recibo/localizador físico. |
| 216 frente a 993 locales históricos | NO CONCILIADO | Universos y momentos distintos, sin manifiesto de origen que demuestre relación. |

## 5. Cierre del límite de tres ciclos

1. **Ciclo 1 — instrucciones:** recuperadas y cotejadas las instrucciones, autorización y exclusiones del control generación 11.
2. **Ciclo 2 — ejecución:** se revalidó Neon, se confirmó B2 preflight PASS, se reconsultó la suspensión Blob y se comprobaron las compuertas reales de identidad y descifrado. No había canal ejecutable de archivo sin suplantar al titular o crear una identidad nueva.
3. **Ciclo 3 — consolidación:** inventario y residuales clasificados; evidencia final persistida y leída de vuelta.

**Dictamen:** el trabajo de estos tres ciclos queda cerrado por límite operativo, pero CUSTODIA-01 NO queda técnicamente terminado. La recuperación no puede declararse hecha sin identidad NextAuth del titular, acceso a X_KHORA_KEY y lecturas físicas autorizadas. Los 79 pendientes permanecen en el expediente sin ser marcados como perdidos.

**No-acciones:** cero escrituras de negocio en Neon; cero Volcados nuevos; cero GET/list/descifrado B2/Blob; cero cambios de Production/secretos/deploy; cero acceso a monitor, Chrome local, IndexedDB o RDC.