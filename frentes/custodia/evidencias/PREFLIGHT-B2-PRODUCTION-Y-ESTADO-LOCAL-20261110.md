# Evidencia · preflight B2 de Production y estado del perfil local autorizado

Fecha: 2026-11-10
Repositorio: SeryMente/khora
Proyecto Vercel: khora-web
Alcance: lectura de metadatos Vercel, build logs de Production y metadata del perfil Chrome autorizado. No se leyeron valores secretos ni contenidos de IndexedDB.

## 1. Preflight B2 de Production · aprobado

- Deployment: dpl_6M6ebaAvNPpAtRspfX5QhffEJvVJ.
- Estado: READY · target production.
- Commit de main: f0224c1368fb15a3452335a44305c6efa85eef79.
- Build: bld_2w1gnkcim.
- Fecha: 2026-11-10T17:36:15.109Z.

El build ejecutó:

```text
node --import tsx scripts/preflight-object-storage.ts && next build --webpack
```

Resultado literal:

```text
[storage-preflight] native_auth=PASS master_key=PASS bucket_identity=PASS bucket_private=PASS sse_b2_default=PASS
[storage-preflight] read_only_gate=PASS; no objects, bucket settings, CORS rules, credentials or source data were changed
```

Esto acredita que, durante ese build de Production, B2 autenticó, la identidad de la Master Key fue validada, se reconoció el bucket privado y quedó confirmado SSE-B2 por defecto. **No acredita GET/read-back de objetos históricos individuales, SHA por objeto ni archivado E2E.**

## 2. Variables B2 presentes por nombre

La enumeración Production con decrypt=false mostró los nombres KHORA_B2_MASTER_APPLICATION_KEY_ID, KHORA_B2_MASTER_APPLICATION_KEY, KHORA_B2_BUCKET_ID, KHORA_B2_BUCKET_NAME, KHORA_OBJECT_STORAGE, KHORA_B2_PREFLIGHT y BLOB_READ_WRITE_TOKEN. No se leyeron valores. El preflight del build aporta evidencia funcional de autenticación y reconocimiento del bucket sin revelar secretos.

## 3. Vercel Blob sigue suspendido

- Store: khora-audio.
- ID: store_VyX9EI8q6DKhp4RV.
- billingState: suspended.
- status: limits-exceeded-suspended.
- usageQuotaExceeded: true.
- Un proyecto conectado: khora-web.

No se hizo GET, listado de objetos, reactivación ni modificación del store. La documentación oficial de Vercel indica que el store puede quedar pausado por alcanzar límites del plan o por suspensión del equipo de Vercel; recomienda revisar el Blob Dashboard y contactar soporte si la suspensión parece incorrecta: https://vercel.com/docs/vercel-blob/blocked-store. No se determinó cuál de las causas originó este estado ni el plan efectivo del equipo.

## 4. Perfil Chrome autorizado · presencia de ficheros IndexedDB

Ruta consultada solo por metadata: C:\Users\fila4\AppData\Local\Google\Chrome\User Data\Profile\IndexedDB.

| Almacén físico del origen khora-web.vercel.app | Archivos | Bytes |
|---|---:|---:|
| indexeddb.blob | 251 | 20.371.333 |
| indexeddb.leveldb | 9 | 5.808.530 |

Últimas modificaciones observadas: Blob 2026-11-10T15:21:58.381Z; LevelDB 2026-11-10T23:07:58.509Z.

Solo se consultaron nombres de rutas, conteos, tamaños y marcas temporales. No se abrieron registros, no se extrajeron datos, no se descifraron fragmentos y no se copiaron archivos. La presencia de archivos para el origen no prueba que la base lógica khora-custodia-v1 exista, que los 216 fragmentos estén presentes o que sean descifrables.

## 5. Clon local · no apto para runtime de CUSTODIA

- Ruta: C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA.
- Rama: work/harmonia-front-workspace-20261110.
- HEAD: 9fd5c18205e39b6db12c9152b07d8f880f6b256d.
- Árbol de trabajo: múltiples cambios y archivos no confirmados del frente Harmonia.
- khora-web/.env.local: ausente.
- khora-web/node_modules: ausente.
- No se observó servidor KHORA escuchando en los puertos 3000–3003, 8787 o 9222.

No se cambió de rama, no se instalaron dependencias, no se creó .env.local, no se iniciaron servicios y no se alteraron los cambios de Harmonia. Por protección de ese trabajo, este clon no se usará como runtime de Custodia hasta disponer de un entorno KHORA limpio y autenticado.

## 6. Próximos pasos

1. B2: completar GET/read-back físico y SHA de los objetos elegibles mediante un runtime KHORA autenticado. El preflight no sustituye esa comprobación.
2. Blob: el operador debe revisar khora-audio en https://vercel.com/dashboard/storage. Si el panel ofrece una vía de restauración por cuota, seguirla; si permanece bloqueado o la pausa parece incorrecta, abrir caso con soporte de Vercel y solicitar reactivación o lectura/exportación temporal. No borrar ni recrear el store.
3. Cuando Blob se reactive, comprobar un GET físico antes de habilitar KHORA_LEGACY_BLOB_READS_ENABLED. La compuerta de aplicación ausente es independiente del estado del proveedor; no se modificó.
4. Local: preparar runtime KHORA aislado del clon Harmonia y autenticado sobre el perfil autorizado; después procesar los 216 fragmentos bajo autorización C, conservar los originales y cotejar bytes/longitud/SHA.

## 7. No-acciones

No se modificaron configuración, secretos, despliegues, código, Neon, B2, Blob, bóvedas, perfil Chrome ni datos locales. No se creó ningún Volcado. No se procesaron fragmentos.