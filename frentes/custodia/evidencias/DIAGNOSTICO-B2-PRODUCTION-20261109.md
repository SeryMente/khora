# Evidencia de diagnóstico B2 y estado del archivado · 2026-11-09

**Tipo:** evidencia operativa de solo lectura, minimizada y sanitizada.  
**OCP padre:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).  
**Tarea principal:** CUSTODIA-B2-006.  
**Diagnóstico residual:** CUSTODIA-B2-005.  
**Ciclo local UUIDv7:** `01a1c193-eccc-77e3-a7f7-4c29b0de0df0`.  
**A de retoma local UUIDv7:** `01a1c193-eccc-78ad-bcb1-a7f102ff4733`.  
**Folio global:** PENDIENTE/NO ASIGNADO · FOL1 inactivo.

## 1. Identidad de código y despliegues observados

| Recurso | Referencia | Resultado observado | Alcance de la evidencia |
|---|---|---|---|
| Producción READY más reciente entre los despliegues consultados | `dpl_Dczf3WWnPG4cnCaJhf6PS8MzmxLe`, commit `b52003ee1809ad506db74e8ee97f0905f7aae91a` | READY | Publicación del código S3-compatible anterior; no acredita preflight B2 ni roundtrip correcto. |
| Intento Production de B2 con cliente S3-compatible | `dpl_36DeUEnuz2zoWtMJqp1BsZjWASUJ`, commit `b52003ee1809ad506db74e8ee97f0905f7aae91a` | ERROR | El preflight `encrypted_roundtrip` terminó en `storage_provider_request_failed`. |
| Intento Production con API nativa B2 | `dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f`, commit `7be5712a19aa98837e6d34449585ecb40e634af3` | ERROR | Falló en `b2_authorize_account` con `storage_b2_authorization_failed`; no se registró HTTP status ni código nativo de Backblaze. |
| Preflight con import roto | `dpl_4ohubN6WFbQ2fVHTZ1FL5M6xR8ui`, commit `b52003ee1809ad506db74e8ee97f0905f7aae91a` | ERROR | El build registró `ERR_MODULE_NOT_FOUND` para el módulo `khora-web/lib/server/cripto`; no es un rechazo de credenciales B2. |
| Preview de PR #362 | `dpl_9gWxfH72UD2b2S115QpEUwa2M9Bt`, commit `3b684a870a21ccf2f200ee684687beea42e3b235` | READY | Build compilado; no demostró autenticación, PUT/GET físico ni archivado E2E. |

PR #355 está integrada en `main` mediante merge `8489a09c03a330b85f3e31297415ada7a19fe10e`. Su corrección de reintento/drenaje de partes pendientes antes de archivar es un arreglo real del flujo cliente, pero no soluciona la autenticación B2. PR #362 sigue OPEN · DRAFT · NOT MERGED y agrega diagnóstico saneado de HTTP status/código B2; no se afirma que la prueba unitaria añadida haya pasado.

## 2. Orden efectivo de los hooks de build y mutación histórica

El log de `dpl_36DeUEnuz2zoWtMJqp1BsZjWASUJ` registró este comando:

```sh
if [ "$VERCEL_ENV" = "production" ]; then
  node scripts/migrate-runtime.mjs && node --import tsx scripts/preflight-object-storage.ts
fi && next build --webpack
```

En ese intento, `migrate-runtime.mjs` se ejecutó antes del preflight. El log dice literalmente que se aplicaron las migraciones 023–029 de runtime, OAuth, evidencia normativa, Bearer manual y ledger de orden. El script inspeccionado enumera además `032_graph_twins.sql`; el log consultado no permite afirmar por sí solo si esa última migración quedó aplicada. Esta mutación de esquema ya ocurrió en el intento histórico; no se debe registrar como «no ejecutada».

El log de `dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f` registró un orden posterior distinto:

```sh
if [ "$VERCEL_ENV" = "production" ]; then
  node --import tsx scripts/preflight-object-storage.ts && node scripts/migrate-runtime.mjs
fi && next build --webpack
```

El preflight nativo falló en `b2_authorize_account`, por lo que el operador lógico `&&` impidió que `migrate-runtime.mjs` se ejecutara en ese intento.

**Regla inmediata:** no repetir el hook ni provocar un nuevo build Production sin verificar qué migraciones se aplicaron realmente y sin una ruta autorizada que no reejecute SQL productivo. La autorización B2 recibida no autoriza SQL/backfill/migraciones productivas adicionales.

## 3. Metadatos de variables Production

Se consultaron solo nombres, targets y tipos de variables; no se solicitó ni se leyó ningún valor descifrado.

- Presentes en target Production: `KHORA_OBJECT_STORAGE`, `KHORA_B2_PREFLIGHT`, `KHORA_B2_BUCKET_NAME`, `KHORA_B2_BUCKET_ID`, `KHORA_B2_KEY_ID`, `KHORA_B2_APPLICATION_KEY`.
- No aparecen en ese inventario las entradas `KHORA_B2_MASTER_APPLICATION_KEY_ID` ni `KHORA_B2_MASTER_APPLICATION_KEY`.
- El código `khora-web/lib/server/object-storage.ts` consulta primero los nombres canónicos `KHORA_B2_MASTER_APPLICATION_KEY_ID` / `KHORA_B2_MASTER_APPLICATION_KEY` y, como fallback, los nombres heredados `KHORA_B2_KEY_ID` / `KHORA_B2_APPLICATION_KEY`.
- La ausencia de las entradas canónicas en Vercel no demuestra que estén ausentes de la bóveda local. El error exacto de autorización todavía no identifica qué componente del par fue rechazado.

## 4. Bóveda y dispositivo

El operador comunica que la sesión actual de EP Vault está abierta y que las notas efímeras contienen los valores necesarios de Key ID y Master Application Key. No se ha leído aún el contenido de esas notas ni se ha promovido a la bóveda formal.

La anotación anterior sobre PC10 se declara **OBSOLETA COMO BLOQUEO ACTUAL**: el operador identificó esa sesión como efímera y de días anteriores y ordenó descartarla. No volver a usar ni investigar esa sesión. «PSK14» es la referencia textual actual de la conexión remota según la instrucción del operador, pero el enlace concreto entre esa etiqueta, el dispositivo físico y el perfil de Windows no queda verificado por este diagnóstico.

No se copiaron secretos al repositorio, al chat o a argumentos de comando. Se requiere identificar el endpoint vigente y comprobar que el proceso operativo corre bajo un perfil permitido antes de leer las notas o modificar la bóveda.

## 5. Criterio de salida y estado

- La autenticación B2 actual queda **FALLIDA EN LA ÚLTIMA EVIDENCIA DE DESPLIEGUE DISPONIBLE**, no «corregida».
- PUT/GET físico con verificación SHA-256/longitud y archivado E2E siguen **PENDIENTES**.
- El archivado productivo de Cora/Khora sigue **NO RESTABLECIDO / NO DEMOSTRADO**.
- No se afirma que Vercel Blob continúe suspendido en este instante: el estado de cuota disponible es histórico y no se consultó directamente el store en esta retoma.
- No se atribuyen a archivado errores OIDC/PostgreSQL sin correlación de solicitud comprobada.
- La solución de cliente de PR #355 sí está integrada, pero el bloqueo del proveedor de almacenamiento sigue siendo independiente.

## 6. Próxima secuencia mínima

1. Conectar el equipo correcto que mantiene abierta la sesión EP Vault y validar su identidad efectiva antes de operar; no reutilizar PC10 ni trabajar bajo un perfil prohibido.
2. Leer las notas efímeras sin mostrar los valores y promover cada valor, por separado, a la bóveda canónica mediante el flujo autorizado de portapapeles. Leer de vuelta y comparar sin imprimir secretos.
3. Importar solo las dos variables canónicas y ejecutar el preflight B2 de solo lectura. Registrar únicamente etapa, HTTP status y código saneado.
4. Si autentica, verificar cuenta/capacidades/bucket privado. Después, con autorización/entorno adecuado, efectuar PUT/GET sintético, comparar bytes/longitud/SHA-256 y validar el flujo de partes/manifest/archivado.
5. Resolver el hook de build/migraciones antes de cualquier release. No ejecutar SQL productivo adicional por inferencia.

**No se ejecutó en esta retoma:** lectura de secretos, importación de bóveda, cambio de variables Vercel, escritura en B2, mutación SQL, merge, deploy o cutover de producción.

### Hallazgo causal adicional · 2026-11-09 · Vercel legacy key ID no es Master Key

La lectura controlada de KHORA_B2_KEY_ID desde Vercel Production, sin imprimir el valor, mostró que **no coincide con el Account ID** de la cuenta KHORA (58b62b4593c8). El Master Application Key ID validado desde PC-7 sí coincide con ese Account ID. Por ello, las variables heredadas actuales no representan la Master Key esperada por el adaptador de KHORA y no deben simplemente renombrarse.

**Corrección necesaria:** reemplazar, no renombrar, las dos entradas heredadas de Production con la pareja real KHORA_B2_MASTER_APPLICATION_KEY_ID / KHORA_B2_MASTER_APPLICATION_KEY leída desde la bóveda local y transferida por Vercel CLI autenticado. No descifrar ni copiar los valores a chat, consola o archivos de documentación.
