# Migración no destructiva de Vercel Blob a Backblaze B2

## Objetivo y alcance de esta fase

Mover objetos de audio cifrados desde Vercel Blob a Backblaze B2, verificar físicamente cada copia y repuntar referencias Neon de forma transaccional, conservando siempre el Blob de origen. La aplicación mantiene lectura dual mientras existan referencias Blob.

La fase actual es **E2E no productiva**. No incluye cambiar el selector productivo, aplicar el backfill a datos productivos, desplegar ni realizar cutover.

## Componentes

- Transporte dual: `lib/server/object-storage.ts`.
- Validación de localizadores: `lib/storage/object-reference.ts`.
- Registro reanudable: `db/migrations/035_custodia_blob_b2_migration.sql`.
- Backfill: `scripts/migrate_blob_to_b2.ts`.
- Fixture aislado: `db/fixtures/custodia_b2_e2e.sql`.
- Comando: `npm run migrate:blob-to-b2`.

El backfill recorre todas las páginas del almacén Blob configurado. Por cada URL:
1. Agrupa referencias de `dictado_audio_parte`, `dictado_mp3`, `dictado_mp3_historial`, `volcado.audio_url` y `volcado.audio_partes`.
2. Exige un único SHA-256 y tamaño de contenido en claro. Las URL con metadatos ausentes o contradictorios quedan en cuarentena.
3. Descarga el objeto cifrado, exige el sobre KHC1 y verifica longitud y SHA-256 después de descifrar.
4. Copia a una clave B2 determinista y privada, con cifrado del lado del servidor.
5. Lee físicamente el objeto de B2, compara SHA-256 de los bytes cifrados y vuelve a descifrar para comprobar tamaño y SHA-256 en claro.
6. En una transacción, actualiza las referencias relacionales y JSONB; comprueba que no quede ninguna referencia al origen y registra el resultado en el ledger.
7. Conserva siempre el Blob original.

La clave destino es determinista por hash de la URL de origen. Una repetición verifica el objeto existente y continúa el repunte pendiente sin crear otra copia.

## Blanco de pruebas autorizado

El migrador de esta rama está bloqueado intencionadamente a estos destinos:

- Neon project: `still-sunset-02412999`.
- Neon branch: `custodia-b2-migration-test-20261031`.
- Endpoint host: `ep-cool-pond-ahenbh4b.c-3.us-east-1.aws.neon.tech`.
- Base de datos: `custodia_b2_e2e`.
- Fixture: `db/fixtures/custodia_b2_e2e.sql`.

La base `custodia_b2_e2e` se creó vacía y contiene solamente las tablas mínimas de fixture y el ledger 035. La base heredada `neondb` no es destino de la migración y no debe utilizarse para estas pruebas. No se deben ejecutar consultas de inventario contra `neondb`.

El guard del migrador exige el nombre de branch tanto en `NEON_BRANCH` como en `--target-branch`, coteja el host y nombre de base exactos, comprueba un marcador de entorno no productivo y verifica el store ID embebido en el token Blob frente al ID esperado. En modo apply exige además un bucket B2 con prefijo `khora-custodia-e2e-` y coincidencia con el nombre esperado configurado. No retirar estos guards para resolver un bloqueo de configuración.

## Requisitos de ejecución

Los siguientes valores deben estar disponibles en un entorno de pruebas aislado, sin imprimirlos ni compartirlos:

- `DATABASE_URL_UNPOOLED`: conexión directa a `custodia_b2_e2e` en el endpoint allowlisted.
- `NEON_BRANCH=custodia-b2-migration-test-20261031`.
- `KHORA_B2_MIGRATION_ENV=nonproduction`.
- `KHORA_BLOB_B2_E2E=1`.
- `BLOB_READ_WRITE_TOKEN`: token dedicado al Blob store sintético de pruebas.
- `KHORA_BLOB_B2_SOURCE_STORE_ID`: store ID contenido en ese token, sin prefijo `store_`.
- `X_KHORA_KEY`: clave de cifrado válida para los fixtures KHC1 sintéticos.
- Para apply: `KHORA_B2_BUCKET_NAME`, `KHORA_B2_KEY_ID`, `KHORA_B2_APPLICATION_KEY`, `KHORA_B2_EXPECTED_TEST_BUCKET`; el bucket debe tener el prefijo no productivo indicado.
- `KHORA_B2_REGION` (opcional; valor por defecto `us-east-005`).

No reutilizar variables de producción ni copiar credenciales productivas a Preview. Actualmente no se ha verificado ni configurado un Blob store sintético dedicado ni un bucket B2 E2E.

## Secuencia E2E

1. Confirmar el branch y base Neon allowlisted. Aplicar el fixture SQL solamente en `custodia_b2_e2e`; verificar las cinco tablas y el índice del ledger.
2. Crear objetos y referencias sintéticos en el Blob test store y en las cuatro familias de tablas. Usar hashes/longitudes calculados sobre el contenido claro y objetos cifrados KHC1 sintéticos. No importar filas ni URLs de producción.
3. Ejecutar el inventario en modo lectura:

   ```bash
   npm run migrate:blob-to-b2 -- --target-branch=custodia-b2-migration-test-20261031
   ```

4. Comprobar que el resumen contiene el número esperado de objetos físicos y referencias, sin faltantes ni conflictos inexplicados. No iniciar apply si hay cuarentena inesperada o error.
5. Ejecutar un primer lote de una referencia:

   ```bash
   npm run migrate:blob-to-b2 -- --apply --target-branch=custodia-b2-migration-test-20261031 --confirm=KHORA_BLOB_TO_B2_NONPROD --limit=1
   ```

6. Leer de vuelta el objeto B2, validar KHC1, hash cifrado, longitud y hash en claro. Comprobar que todas las referencias relacionales y JSONB migraron y que el ledger marca `references_updated` con el conteo exacto.
7. Repetir el comando para probar idempotencia y reanudación. No deben crearse copias duplicadas ni modificarse objetos de origen.
8. Ejecutar pruebas adicionales de escritura/lectura por el adaptador, upload firmado de staging, reproducción, transcripción, MP3 y exportación original usando exclusivamente fixtures y stores de prueba.
9. Registrar por separado resultados del migrador, APIs, browser E2E, checks CI y bloqueos de proveedor. No inferir que el cutover está aprobado.

## Criterios de aceptación

- Cada objeto sintético migrado tiene lectura física Blob y B2, sobre KHC1 válido, hash cifrado y hash de contenido claro verificados.
- No quedan referencias Blob sintéticas elegibles en las cuatro familias; excepciones quedan en cuarentena explícita.
- El ledger refleja todas las ocurrencias actualizadas, incluidas múltiples entradas JSONB dentro de una fila.
- Repetición/reanudación no produce copias extra ni pierde referencias.
- La lectura B2 usa GET firmado de corta duración; el bucket permanece privado.
- Los flujos de captura, staging, lectura, reproducción, transcripción, MP3 y exportación pasan pruebas reproducibles.
- No se elimina ningún Blob de origen ni se altera producción.

## Límites actuales y bloqueo externo

El SQL 035 y el fixture se encuentran preparados en el entorno Neon no productivo. El migrador está protegido por allowlist de branch, endpoint, base y almacenes de prueba. Sin embargo, **no se ha ejecutado el inventario, apply, preflight ni E2E contra proveedores reales** porque aún faltan un Vercel Blob test store/token y un bucket/clave B2 de prueba. Los checks de preview del proveedor también están bloqueados por la restricción del plan frente al repositorio privado.

El script no cambia `KHORA_OBJECT_STORAGE`, no despliega, no elimina Blob y no tiene permiso para apuntar a producción. Cualquier cambio productivo o cutover exige una autorización posterior e independiente.
