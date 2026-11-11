# R5 · Ruta de archivo primario y límite de API de servicio

**Fecha:** 2026-11-11  
**Frente/tarea:** CUSTODIA / CUSTODIA-01  
**Objetivo del ciclo:** comprobar si existe una ruta con credencial de servicio distinta de NextAuth que cree un Volcado canónico desde un checkpoint huérfano conservando identidad, vínculo, cifrado, manifiesto e idempotencia.  
**Resultado:** no se localizó una ruta de servicio con ese contrato. Existe un endpoint genérico de archivo textual autenticado por NextAuth, pero no conserva el vínculo a la sesión/checkpoint; la API key del puente solo efectúa ingesta secundaria en Neo4j de Volcados preexistentes.

## 1. Fuentes y blobs cotejados en `main`

Commit de referencia: `c708901caa2500eb48d6723b709cee7db0d9904b`.

| Archivo | Blob SHA | Resultado relevante |
|---|---|---|
| `khora-web/app/api/dictado/route.ts` | `5371878d65ca35f4fd13601679509a6898a0dd77` | Única ruta que llama a `guardarDictado()`; requiere NextAuth, deriva el correo de sesión y valida `reclamarSesion()`. |
| `khora-web/lib/server/dictado.ts` | `911fc6ab6e1ba3d09753ce5554b64294ead64863` | Escritor canónico de Volcado vinculado a `sessionId`; comprueba manifiesto de audio, firma e idempotencia. |
| `khora-web/app/api/volcado/route.ts` | `400dd28503a4af26a5911ab14b2e9103466d2ec2` | POST genérico con NextAuth; acepta texto/título, no sesión, revisión ni manifiesto. |
| `khora-web/lib/server/volcados.ts` | `d0c6d863efccccdf8f566b1ab64db61be649ce9f` | `archivarVolcado()` crea ID aleatorio, cifra texto y calcula SHA, pero su contrato no acepta `sessionId`, `revisionId` ni audioPartes. |
| `khora-web/app/api/dictado/checkpoint/route.ts` | `86138d60e1a2d25d277c468dc9af90f460334243` | GET/POST y recuperación de checkpoint requieren NextAuth; no crean Volcado. |
| `khora-web/lib/server/custodia-recuperacion.ts` | `278a479db46e6f2bed72ea7d31f88cc373fa67d1` | Catálogo/recuperación de checkpoint bajo correo autenticado; la recuperación crea una sesión/checkpoint derivado, no un Volcado. |
| `khora-web/app/api/ingesta/route.ts` | `f8b97837c1308525c0f1b6189c6fbd6dce321746` | Requiere NextAuth, lee un Volcado existente y su versión/SHA aprobados y luego llama al kernel. |
| `api/main.py` | `bae368f07159b99c31b6c97f2bde64fb7936e57b` | Middleware exige `X-Khora-Key` = `KHORA_API_KEY`; `/api/v1/ingesta` escribe en el grafo Neo4j usando la terna de un Volcado preexistente. |
| `khora-web/middleware.ts` | `dbd01817872994a7229dcb329716fb9f724d1814` | La aplicación web mantiene autenticación NextAuth global; no define bypass de servicio para rutas de archivo. |
| `khora-web/scripts/repair_volcados.ts` | `8e1fe849f83b81019a527c03affcef9a72fa6d9a` | Reparador de Volcados existentes, con operaciones mutativas cuando no se usa `--dry-run`; no crea Volcados desde checkpoints. |

## 2. Escritor canónico y endpoint genérico: contratos distintos

La ruta `POST /api/dictado` es el único escritor de archivo primario enlazado a una captura: obtiene el email mediante `auth()`, llama a `reclamarSesion(sessionId,email)` y luego a `guardarDictado()`. La función verifica el checkpoint real para la fuente dialogada, compara las partes persistidas con el manifiesto presentado, preserva el original y resuelve reintentos mediante identidad de sesión/contenido.

También existe `POST /api/volcado`, pero no es un sustituto válido para CUSTODIA-01:
- exige una sesión NextAuth;
- acepta texto y título, pero no recibe `sessionId`, `revisionId`, fuente de checkpoint ni manifiesto de audio;
- llama a `archivarVolcado()`, que genera un ID aleatorio por llamada y no implementa idempotencia basada en la sesión fuente;
- guarda un Volcado textual, pero no crea el vínculo `dictado_session.volcado_id` ni demuestra que el texto procede de un checkpoint histórico concreto.

Usar esa ruta para las 79 sesiones crearía archivos desligados de las sesiones originales y permitiría duplicados en reintentos. No se invocó.

## 3. Límite de la credencial de servicio

El puente FastAPI comprueba globalmente `X-Khora-Key` contra `KHORA_API_KEY`. Su `verify_key()` está vacío porque la verificación se hace en middleware. La única ruta de escritura de datos relevante hallada, `POST /api/v1/ingesta`, exige `volcado_id`, `version` y `sha256`; valida el hash del payload y crea/procesa el InformationObject en Neo4j. No inserta un Volcado canónico en Neon, no lee checkpoints KHC1 y no establece titularidad de una sesión.

La envoltura web `POST /api/ingesta` requiere NextAuth y consulta el Volcado/versionado aprobados antes de invocar el puente. No convierte la API key servidor-servidor en identidad de propietario.

`POST /api/eventos` no es archivador: exige NextAuth (salvo bypass de prueba) y escribe telemetría. Su GET admite clave de servicio solo para diagnóstico/lectura de eventos. Tampoco se utiliza.

## 4. Rutas descartadas y no-acciones

- `recuperarCheckpoint()` solo crea una sesión/checkpoint derivado de una revisión seleccionada; no crea el Volcado primario.
- `scripts/repair_volcados.ts` repara/transiciona registros Volcado existentes y, por defecto, tiene `dryRun=false`. No se ejecutó porque puede modificar datos ajenos al objetivo y no resuelve checkpoints sin Volcado.
- `scripts/custodia-worker.ts` sigue siendo el ejecutor secundario descrito en R4; no se ejecutó.
- No se invocó `/api/volcado`, `/api/ingesta`, `/api/v1/ingesta`, `/api/eventos` ni rutas de checkpoint.
- No se leyeron secretos, checkpoints en plaintext ni contenido privado; no hubo consultas de escritura, Volcados nuevos, B2/Blob GET, cambios de código de producto, variables, bucket, deployment o configuración. No se utilizó monitor, Chrome local ni RDC.

## 5. Dictamen y estado del objetivo

No se encontró una ruta de servicio autenticada que cree el Volcado canónico a partir de un checkpoint huérfano. El endpoint genérico textual no ofrece vínculo ni idempotencia de sesión; el servicio con API key escribe únicamente en Neo4j después de la existencia de un Volcado aprobado. La única ruta primaria correcta está ligada a NextAuth del titular y a `guardarDictado()`.

Por tanto, no se justifica intentar un archivo con identidad de servicio inventada, usar una API key genérica como identidad, escribir directamente en Neon, ni reutilizar el endpoint genérico como atajo. El bloqueo de ejecución de CUSTODIA-01 sigue siendo real: obtener un contexto runtime autorizado del titular y las dependencias KHC1/almacenamiento o mantener individualizados los residuales concretamente bloqueados.

**Inventario sin cambio:** 95 sesiones atribuibles, 16 enlazadas excluidas, 79 sin Volcado; 1.039 partes de audio (785 B2 y 254 Blob por metadata), 29 checkpoints textuales potencialmente significativos y 216 fragmentos locales preservados. Cero Volcados nuevos en este ciclo. CUSTODIA-01 permanece EN CURSO.
