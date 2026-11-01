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

## Verificación local de esta sesión RDC (2026-11-01)

Repositorio local verificado en `PC-14`, rama `feat/custodia-b2-cutover-20261031`, sin cambios locales pendientes al iniciar la verificación.

- `npm run typecheck`: PASS, exit code 0.
- `npm run test:unit`: PASS, 594/594.
- `npm run ui:contract`: PASS.
- `npm run build`: PASS, exit code 0. Para el build de pruebas, `MCP_JWT_SECRET` debe establecerse solo al arrancar Next, no durante `prebuild`, porque contamina seis pruebas que usan su propia clave fija. La configuración Playwright quedó corregida para inyectarlo después del build.
- Playwright: 16/20 PASS. Cuatro fallos preexistentes/no relacionados con la migración: recorrido global de navegación que esperaba un error de grafo que no apareció, accesibilidad del grafo en desktop y mobile, y navegación ARIA de pestañas en mobile. La primera ejecución no pudo iniciar Chromium porque el navegador no estaba instalado; se instaló Chromium/Headless Shell y se repitió la suite.
- La prueba E2E de checkpoints de dictado pasó. No equivale a validar la migración Blob→B2.

La punta de la rama se sincronizó con `main` mediante merge commit `918440be3e8c9933274bc730ea38ce9c6f70cbf7`; se cotejaron los cambios desde el ancestro común y no hubo rutas solapadas (23 rutas de la PR frente a 5 rutas de main).

## Bloqueo restante para E2E de almacenamiento

La cuenta Vercel rechazó la creación del Blob store privado dedicado por `usage_threshold_limits_reached`. No se conectó ningún store productivo ni se modificaron variables de producción. Sigue faltando además el bucket B2 de pruebas y su clave restringida. Por tanto no se ejecutó preflight real, inventario Blob, copia B2, lectura física ni repunte Neon. La base Neon `custodia_b2_e2e` sigue vacía (0 filas en las cuatro tablas y ledger) y aislada.

La aceptación E2E de almacenamiento continúa **bloqueada por recursos de prueba de proveedor**; los checks de typecheck, build y unitarios no deben interpretarse como aceptación de la migración.


## Verificación adicional en PC-8 (2026-11-01) — checkout independiente y controles locales

### Identidad del árbol inspeccionado

- Equipo RDC: `PC-8` (Windows, PowerShell, Node.js 26.13.0).
- Checkout independiente: `C:\\Users\\PC 8\\Desktop\\Khora\\khora-main`.
- Rama: `feat/custodia-b2-cutover-20261031`.
- HEAD inicial verificado: `a2f3f866fdf699eff67b32f2b0de480fa981b096`, coincidente con `origin/feat/custodia-b2-cutover-20261031`.
- El árbol estaba limpio al iniciar. Se mantuvo separado del checkout `khora-mcp-main` que ya existía en el equipo.
- Se actualizó la referencia remota de `main` a `be43574107f0dd6b5336b229a473e30556423ebd`. La rama B2 tiene 44 commits por delante y 9 por detrás de ese main; los 9 commits nuevos de main observados en esta comprobación son cambios de continuidad/gobernanza KHORA-MCP. No se incorporaron automáticamente para evitar mezclar cambios ajenos al alcance B2.

### Instalación y validación reproducible

La instalación se ejecutó con `npm ci --no-audit --no-fund` y terminó con código 0; instaló 602 paquetes a partir del lockfile. npm advirtió que cinco scripts de paquetes no se ejecutaron automáticamente (`@google/genai`, `esbuild`, `ffmpeg-static`, `protobufjs`, `unrs-resolver`). No se habilitaron scripts adicionales ni se modificó el lockfile.

Resultados ejecutados sobre el árbol local de esta rama:

| Control | Resultado | Alcance / limitación |
|---|---|---|
| `npm run typecheck` | PASS · exit 0 | `tsc --noEmit` sobre el checkout PC-8. |
| `node --import tsx --test tests/unit/object-storage.test.ts` | PASS · 22/22 | Pruebas unitarias de localizadores, validación de claves/URLs, sobre cifrado y staging firmado; usa credenciales sintéticas y no contacta B2 real. |
| `npm run ui:contract` | PASS · exit 0 | Contrato de navegación íntegro. |
| `npm run ui-review:check` | PASS · exit 0 | Escenarios, identificadores UI y componentes compartidos íntegros. |
| `npm run test:unit` | 593 PASS / 1 FAIL de 594 | Único fallo: `methodology_contract_sync.test.ts` no pudo invocar `gh api` porque GitHub CLI no tenía autenticación en PC-8 (`gh auth login` o `GH_TOKEN`). No se insertó un token ni se alteraron las credenciales. No se atribuye ese fallo a B2. |
| `node --import tsx scripts/preflight-experience.ts` | NOT_REQUESTED | La prueba de almacenamiento de experiencia no se activó; no hubo conexión a Neon. |
| `node scripts/build-extension.mjs` | PASS | Se generó `public/downloads/harmonia-v0.3.5.zip`; el artefacto está excluido por `.gitignore`. |
| `npx next build --webpack` | PASS · exit 0 | Build optimizado completado; TypeScript finalizado y 78 páginas estáticas generadas. Se observaron advertencias existentes de middleware deprecado y APIs Node no soportadas por Edge Runtime en dependencias `next`/`jose`; no bloquearon el build. Se usaron únicamente secretos efímeros generados en memoria para la compilación y se retiraron al terminar. |

Los logs locales de npm, typecheck, unitarias y build se conservaron fuera del repositorio en `C:\\Temp\\khora-b2-*.log`. `node_modules` y el ZIP de extensión están excluidos por `.gitignore`. No se versionan artefactos generados.

### Inspección de recursos y límites de proveedor

- En el proceso de PC-8 no estaban definidas variables de entorno de B2, Blob ni Neon.
- Se inspeccionaron únicamente los nombres de entradas de la bóveda cifrada del repositorio: no contiene las variables necesarias para un entorno B2/Blob/Neon E2E de pruebas. No se descifraron entradas ni se expusieron secretos.
- No había archivo de acceso temporal DPAPI a la bóveda. El archivo local `.b2_account_info` no se abrió ni se utilizó.
- No se encontró un Vercel Blob test store/token ni un bucket B2 de pruebas con prefijo `khora-custodia-e2e-` y clave de aplicación restringida.
- El fixture SQL y el migrador mantienen su allowlist para `custodia-b2-migration-test-20261031 / custodia_b2_e2e`. No se configuró una conexión ni se aplicó la migración 035, porque eso no sustituye ni resuelve la ausencia de los proveedores de prueba.
- No se ejecutaron `KHORA_B2_PREFLIGHT=1`, el inventario real de Blob, `--apply`, la subida/lectura física real de B2 ni el repunte de referencias Neon. No hubo operaciones de red B2/Blob/Neon durante esta verificación local.

### Dictamen técnico al cierre de esta revisión local

El adaptador B2, las referencias de objetos, el migrador no destructivo, la migración SQL 035, el fixture sintético y el preflight permanecen presentes en la rama. El árbol compila y las 22 pruebas focalizadas de almacenamiento pasan. Eso demuestra integridad estática/local del código inspeccionado; **no demuestra conectividad, compatibilidad efectiva del bucket, CORS, lectura física, restauración ni migración E2E de objetos reales**.

El bloqueo para completar la aceptación E2E de almacenamiento sigue siendo de recursos de prueba de proveedor: se requiere un Blob test store/token dedicado y un bucket B2 no productivo con clave restringida al prefijo de prueba, además de la conexión Neon no productiva allowlisted. No se deben sustituir por credenciales/almacenes de producción. Hasta que esos recursos existan y se verifiquen, la migración permanece **IMPLEMENTACIÓN LOCAL VALIDADA PARCIALMENTE · E2E DE PROVEEDOR BLOQUEADO**.

### Acciones expresamente no realizadas

No se modificó `KHORA_OBJECT_STORAGE`; no se cambiaron variables de Vercel; no se copiaron secretos; no se aprovisionaron buckets ni claves; no se modificó CORS; no se aplicó SQL ni backfill productivo; no se copiaron/reapuntaron/eliminaron objetos; no se desplegó ni fusionó la PR #348. El origen Blob permanece intacto.
