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
