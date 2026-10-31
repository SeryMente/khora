# Migración no destructiva de Vercel Blob a Backblaze B2

## Objetivo

Mover los objetos de audio cifrados referenciados por Khora desde Vercel Blob a Backblaze B2, verificar la copia física y cambiar las referencias de Neon sin borrar el origen. La migración conserva lectura dual mientras existan referencias Blob.

## Componentes

- Transporte dual: \`lib/server/object-storage.ts\`.
- Validación de localizadores: \`lib/storage/object-reference.ts\`.
- Registro reanudable: \`db/migrations/035_custodia_blob_b2_migration.sql\`.
- Backfill: \`scripts/migrate_blob_to_b2.ts\`.
- Comando: \`npm run migrate:blob-to-b2\`.

El backfill recorre todas las páginas de Vercel Blob. Por cada URL de origen:
1. Agrupa referencias de \`dictado_audio_parte\`, \`dictado_mp3\`, \`dictado_mp3_historial\`, \`volcado.audio_url\` y \`volcado.audio_partes\`.
2. Exige un único SHA-256 y tamaño de contenido en claro. Las URL con metadatos ausentes o contradictorios quedan en cuarentena.
3. Descarga el objeto Blob cifrado, exige el sobre KHC1 y verifica longitud y SHA-256 tras descifrar.
4. Copia a una clave B2 determinista y privada, con cifrado del lado del servidor.
5. Lee de vuelta físicamente B2, compara SHA-256 de los bytes cifrados y vuelve a descifrar para comprobar tamaño y SHA-256 en claro.
6. En una transacción, actualiza todas las referencias relacionales y JSONB; registra el resultado en el ledger.
7. Conserva siempre el Blob original.

La clave destino es determinista por hash de la URL de origen. Repetir el comando no crea copias adicionales: verifica el objeto existente y continúa el repunte de referencias pendiente.

## Requisitos de ejecución

En el entorno controlado del operador deben estar disponibles, sin imprimirlos ni compartir sus valores:

- \`DATABASE_URL_UNPOOLED\`: conexión directa al Neon branch autorizado.
- \`X_KHORA_KEY\`: clave necesaria para descifrar KHC1 y verificar el contenido.
- \`BLOB_READ_WRITE_TOKEN\`: token del almacén Vercel Blob de Khora.
- \`KHORA_B2_BUCKET_NAME\`, \`KHORA_B2_KEY_ID\`, \`KHORA_B2_APPLICATION_KEY\`.
- \`KHORA_B2_REGION\` (opcional; valor por defecto \`us-east-005\`).

## Secuencia

1. Aplicar la migración SQL 035 en un branch Neon de prueba y verificar que la tabla \`custodia_blob_b2_migration\` existe.
2. Ejecutar inventario en modo lectura:

   \`\`\`bash
   npm run migrate:blob-to-b2
   \`\`\`

3. Revisar el resumen. No autorizar el backfill mientras haya conflictos inexplicados, URLs ausentes del listado físico o fallos de lectura.
4. En un branch Neon de prueba con una copia adecuada de los metadatos, ejecutar lotes pequeños:

   \`\`\`bash
   npm run migrate:blob-to-b2 -- --apply --confirm=KHORA_BLOB_TO_B2 --limit=10
   \`\`\`

5. Repetir lotes hasta completar todos los candidatos elegibles. El ledger permite reanudar tras interrupciones. No borrar objetos de Blob.
6. Comparar conteos antes y después: referencias Blob elegibles, referencias B2, estados del ledger y objetos físicos verificados. Probar reproducción, transcripción, MP3, exportación original y las referencias JSONB.
7. Solo tras pruebas de preview y aceptación, planificar por separado el cambio de \`KHORA_OBJECT_STORAGE=b2\` en producción. El cambio de proveedor no se ejecuta desde este script.

## Criterios de aceptación

- Cada referencia movida tiene objeto B2 físico, lectura de vuelta y SHA-256 verificados.
- No quedan URLs Blob en las cuatro familias de referencias salvo elementos en cuarentena documentada.
- Ninguna lectura de B2 depende de acceso público: el servidor firma GET de corta duración.
- Los flujos existentes leen tanto Blob como B2 durante la transición.
- Las copias originales de Blob permanecen intactas hasta autorización de retiro específica.
- La migración no se declara completa si existen referencias no reconciliadas, errores o discrepancias.

## Límites

El script no cambia el selector productivo, no aplica migraciones SQL por sí mismo y no borra Vercel Blob. La migración SQL 035 debe aplicarse por el procedimiento autorizado de Neon antes de ejecutar el backfill. No ejecutar \`--apply\` directamente contra producción antes de completar pruebas en un branch de prueba y comprobar el estado de los despliegues.
