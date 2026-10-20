# C050 · evidencia de almacenamiento · snapshot de trabajo

Este expediente no contiene secretos. Estado vigente y continuación: OBJETO-CANONICO.md §8.

## Provisión y prueba nativa
- Depósito privado khora-userdata-ecea4187, us-east-005, SSE-B2, conserva versiones, sin ObjectLock.
- Caps reales10GB/1GB diario de descarga/2500B/2500C por día, sin tarjeta ni plan pagado.
- Respuesta autorizada: exactamente depósito35b8cbd6623b54a5a9130c18/prefijokhora/, sin writeKeys/deleteBuckets.
- Prueba nativa: syntheticOnly=true, restrictedBucketAndPrefix=true, encryptedWrite=true, privateReadAndDecrypt=true, anonymousStatus=401, syntheticDeleted=true. Proceso540, resultado leíble no secreto. Prueba de objeto sintético, no migración ni datos de usuario.
- Configuración: proceso17652 terminó0; KHORA_B2_KEY_ID, KHORA_B2_APPLICATION_KEY, KHORA_B2_BUCKET_ID y KHORA_B2_BUCKET_NAME presentes sensibles en producción. Solo se inspeccionaron metadatos de retorno. Switch productivo no alterado.

## Código y pruebas
- Base4fb3b7d5f07efef770eac398646ff9d87f86b505. Rama aisladafeat/storage-b2-20261020.
- SDK S3 y presigner oficiales; no criptografía propia nueva. FormatoKHC1 y cifrarBytes/descifrarBytes existentes se conservan.
- Pruebas nuevas22/22, sin omisiones; tsc--noEmit0 por proceso7660.
- npmci proceso5924 exit0; instalación SDK proceso5348 exit0.
- Prebuild integral proceso17824 falló:750tests/747pass/1fail/2skip; falta credencial dedicada metodológica local, no eludirla. Omisiones heredadas SQLeditorial y generadorPython.
- CORS leído después de guardar desdeGUI: solo s3_head/s3_get y origen canónico; OPTIONS PUT403 tanto origen canónico como ajeno. No confirma carga directa.
- Compuerta opt-in preparada; nueva comprobación global de tipos0. Diagnóstico Next directo falló al recopilar páginas por AUTH_SECRET obligatorio ausente en checkout local. Entorno Vercel confirma credencial metodológica sensible de producción. Candidata remota y prueba S3/CORS aún pendientes.

## Referencias oficiales consultadas
- https://www.backblaze.com/apidocs/b2-authorize-account
- https://www.backblaze.com/apidocs/b2-get-upload-url
- https://www.backblaze.com/apidocs/b2-upload-file
- https://www.backblaze.com/apidocs/b2-delete-file-version
- https://www.backblaze.com/docs/cloud-storage-application-key-capabilities
- https://www.backblaze.com/docs/cloud-storage-data-caps-and-alerts

## Fronteras
No se borraron originales ni se cerró Hito1, ni se migró PostgreSQL/Neo4j ni se habilitó publicación. Registros de terminal no contienen contraseñas, claves, tokens, códigos de verificación ni sus huellas. La claveB2 no se halla en archivos del repo ni argumentos del proceso; transferencia cifrada efímera y entrada estándar al CLI.

## Resultado remoto posterior, 2026-10-20
- Commit205b7c20f7f8ab3f56e2c68b8b07065df0bc014a, rama feat/storage-b2-20261020, base4fb3b7d5f07efef770eac398646ff9d87f86b505.22rutas explícitas, push/cabeza cotejados;18archivos preparados cotejados porSHA256.
- Proceso8492 exit0/321.58s. Candidata dpl_M4A14hSMrDhyweitkorboeM896Ch, READY, sin promoción de este central.
- Log remoto750tests/748pass/0fail/2skip heredados; TypeScript y contratosUI/navegación0; Next81páginas. No borrar skips heredados ni decir sin omisiones.
- Mensajes exactos: `[storage-preflight] encrypted roundtrip, exact hashes, anonymous denial, signed upload, exact-origin CORS passed`; `[storage-preflight] exact synthetic versions removed`.
- Proceso18688: API candidata /api/version200/SHA205b7c20/ramaesperada/production; audio y token de importación401sin sesión. No autenticar por bypass de aplicación.
- Incidente real: orden remota reejecutó migrador legado pese a --local-config externo. Proceso19092: fetch91d72939 exit0, diff de migrador+SQL contra205b7c20 exit0/salida vacía. Registro Notion actualizado; no afirmar sin migraciones ni sin efectosDB.
- Proceso19968: alias canónico khora-web.vercel.app→dpl_GE4jRo82xrPH9qr8B55L68vmGY9J. Proceso20844: /api/version canónico401. Metadata CLI sin GitSHA no permite atribuir revisión. Constructor Enraizamiento3 identificó sus dosCLI y fuente; ver §8 del canon para acuerdo de integración, no borrar ni promover por encima.
- Universo-datos informó contrato corpus autobiográfico arquitectura0.2.0/ejecutable0.1.0, commit49de30bde952152f14c1fe67a07bf11a329e89cb, sin merge/deploy/integración de consumidores. Reporte atribuido, no adopción implícita de sus23rutas ni código modificado por esa noticia.
- Los diagnósticos auxiliares ASCII/archivo parcial fallaron antes de mutación, fueron registrados y corregidos. Ninguna salida contiene secretos.
