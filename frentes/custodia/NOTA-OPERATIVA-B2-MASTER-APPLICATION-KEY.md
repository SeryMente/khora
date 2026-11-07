# Nota operativa CUSTODIA — Persistencia Backblaze B2 con Master Application Key

**Propósito:** reutilizar el aprendizaje operativo de EP para simplificar la puesta en marcha de B2 en KHORA, sin crear Application Keys individuales. Esta nota es una guía de ejecución subordinada al OCP CUSTODIA y al código de la rama; no acredita una migración ejecutada ni autoriza un cutover productivo.

## 1. Decisión de cuenta y credencial

- Usar una **cuenta Backblaze B2 separada y dedicada a KHORA**. No reutilizar la cuenta/bucket de EP (OCP-MCP) ni mezclar prefijos de ambos frentes.
- Usar exclusivamente la **Master Application Key de la cuenta KHORA** como credencial operativa B2, sin crear claves individuales adicionales, conforme a la instrucción del operador.
- La Master Key tiene alcance administrativo/global dentro de esa cuenta. La separación de cuenta limita el radio de impacto, pero no convierte la clave en una credencial de mínimo privilegio. No usarla en navegador, cliente, extensión, logs, argumentos de proceso, Git ni chat. Mantenerla solo en el servidor y en la bóveda cifrada de secretos.
- No crear, rotar ni revocar claves durante la preparación de persistencia. No usar b2 key create como paso de instalación.
- Los nombres de variables que ya consume el adaptador son una interfaz de compatibilidad, no una afirmación de que exista una Application Key individual:
  - KHORA_B2_KEY_ID = **Master Key ID** de la cuenta KHORA.
  - KHORA_B2_APPLICATION_KEY = **Master Application Key** de la cuenta KHORA.
  - KHORA_B2_BUCKET_NAME = bucket dedicado de KHORA.
  - KHORA_B2_REGION = región real del bucket.
- Guardar los dos valores maestros en la bóveda de secretos autorizada, mediante captura en memoria y UI enmascarada; comprobar descifrado/read-back, ACL y respaldo. No mostrar ni registrar valores. No volver a escribir credenciales si ya existen y el cotejo exacto confirma que coinciden.

## 2. Camino mínimo y reproducible

1. **Cuenta y bucket:** confirmar que la cuenta es la de KHORA; crear/seleccionar un bucket privado dedicado. Mantener separados bucket de pruebas y bucket productivo. Registrar nombre, bucket ID y región, nunca secretos.
2. **Bóveda:** verificar Master Key ID + Master Application Key en la bóveda; no pasar secretos por clipboard salvo captura segura controlada, no incluirlos en comandos ni archivos .env versionados.
3. **Autenticación CLI aislada:** usar una caché B2 independiente de EP y de cualquier caché histórica. Inyectar la credencial solo al proceso que ejecuta la operación y restaurar/eliminar las variables al terminar. Ejecutar account authorize y account get; comprobar que la identidad corresponde a la cuenta KHORA.
4. **Preflight no destructivo:** consultar bucket, región, privacidad, cifrado, CORS y lifecycle. No modificar configuración automáticamente. La Master Key permite acciones globales; limitar cada comando por código y revisión al bucket KHORA y a los prefijos previstos.
5. **Transporte de aplicación:** reutilizar khora-web/lib/server/object-storage.ts. El servidor usa el SDK S3-compatible; el cliente nunca recibe la Master Key. Las cargas temporales se hacen con URL firmada de un solo objeto, expiración breve y CORS de origen exacto.
6. **Cifrado e integridad:** conservar el sobre cifrado KHC1 de KHORA y exigir SSE-B2/AES256. Tras subir, leer físicamente el objeto, comparar SHA-256 de los bytes cifrados, descifrar y comparar tamaño y SHA-256 del contenido claro.
7. **Inventario antes de migrar:** usar scripts/migrate_blob_to_b2.ts en modo inventario. Recorrer paginación completa de Blob y todas las familias de referencias; exigir SHA-256 y longitud coherentes. Cualquier URL sin metadatos, referencia contradictoria u objeto ausente queda en cuarentena.
8. **Backfill reanudable:** ejecutar primero en el entorno E2E aislado. Usar clave destino determinista, ledger 035 e idempotencia. Por cada objeto: leer Blob, validar KHC1, copiar a B2, leer B2 de vuelta, comparar hashes cifrados y claros, y solo entonces actualizar referencias Neon en una transacción. Conservar Blob original.
9. **Aceptación:** probar interrupción/reanudación, duplicados, conflictos, cuarentena, lecturas Blob y B2, referencias relacionales y JSONB, y restauración desde B2. Solo después de evidencia completa se propone un cutover separado.
10. **Producción:** no cambiar KHORA_OBJECT_STORAGE, no aplicar backfill productivo ni desplegar hasta que el propietario apruebe el alcance, se cierre el E2E y exista plan de reversión. La migración nunca borra los originales como parte de este procedimiento.

## 3. Errores de EP que CUSTODIA debe evitar

- No confundir Master Application Key con una key restringida: el proveedor puede devolver permisos globales de cuenta, aunque la intención sea operar un solo bucket.
- No reutilizar la caché SQLite B2 de otro frente. Crear caché separada por cuenta/propósito y fijar explícitamente el archivo de cuenta por proceso.
- No ejecutar CLI empaquetada si el disco temporal no tiene espacio: B2 CLI puede extraer runtime a %TEMP%; comprobar espacio antes. No borrar carpetas temporales ajenas; retirar solo carpetas _MEI creadas y verificadas por esa ejecución.
- No interpretar un wrapper de validación fallido como fallo de transferencia sin revisar el esquema real de file info. Verificar los nombres de campos devueltos por la versión de CLI.
- No dar por válida una subida porque el comando devolvió éxito. Exigir file info, tamaño, cifrado SSE-B2/AES256, File ID, descarga física y SHA-256 coincidente.
- No llamar restauración multiubicación a descargar al mismo host que hizo la subida. La aceptación exige otro equipo o medio físico independiente y read-back verificable.
- No borrar el objeto sintético de prueba por automatismo si el recibo lo declara retenido. Cualquier borrado debe ser explícito, acotado y autorizado.
- No afirmar que el código está desplegado o que los datos reales migraron por el hecho de que el adaptador o las pruebas unitarias existan.

## 4. Variables y límites del código actual

El adaptador y el preflight actuales leen KHORA_B2_KEY_ID y KHORA_B2_APPLICATION_KEY. Se pueden poblar con los valores de la Master Key de la **cuenta separada KHORA** sin crear Application Keys individuales. La Master Key permanece exclusivamente en el servidor. Los guards del migrador E2E deben conservarse: branch/base allowlisted, store ID sintético y bucket de pruebas con prefijo no productivo. No sustituir esos guards por la cuenta productiva ni apuntar el fixture a neondb.

El preflight puede crear y retirar objetos sintéticos de diagnóstico dentro de sus prefijos propios; nunca debe enumerar, descargar ni borrar objetos de usuario. Las reglas CORS deben permitir únicamente el origen exacto de KHORA y los headers necesarios.

## 5. Estado y criterio de cierre

Esta nota documenta el camino; no demuestra que la Master Key KHORA ya exista, esté guardada, autenticada o conectada. La rama CUSTODIA-B2 inspeccionada contiene adaptador dual, ledger y migrador reanudable, pero el PR #348 sigue en borrador y la validación E2E real está pendiente. El siguiente paso operativo es provisionar/verificar la cuenta KHORA separada y sus valores Master mediante la bóveda, después ejecutar preflight y E2E sintético en los destinos allowlisted. No se autoriza aquí migrar datos reales, modificar Neon productivo, cambiar el selector de producción, desplegar ni borrar Vercel Blob.

**Principio de operación:** una cuenta separada por proyecto + Master Key de esa cuenta en bóveda cifrada + caché B2 aislada + bucket privado dedicado + KHC1/SSE-B2 + backfill reanudable + read-back SHA-256 + referencias transaccionales + originales Blob retenidos.