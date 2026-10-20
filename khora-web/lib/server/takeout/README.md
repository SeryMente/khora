# Importador Takeout — implementación parcial 0.1.0

**No habilitado para datos reales.** Este directorio no es un segundo objeto
canónico. Estado del frente y permisos en
[el objeto existente](https://github.com/SeryMente/khora/blob/docs/llavero-harmonia-20261018/docs/frentes/llavero-harmonia/OBJETO-CANONICO.md).
Base de código: producción informada `4ff209fba2bd02d6e61516c7c598e7260ae69871`,
no `main`. Rama aislada `feat/takeout-import-3fea4187`; ningún despliegue autorizado
por este archivo. Promoción serializada por el hilo central.

## Frontera implementada

- `transfer.mjs`: fuente Google Drive estricta, nunca fetch de URL arbitrario ni
  enlace del email Takeout; metadatos/versiones antes y después de cada rango;
  bloques de 8 MiB, cifrado obligatorio, relectura/digest de cada bloque y digest
  del archivo completo en el paso final. Una transferencia no es ingesta corpus.
- `encrypted-store.mjs`: exige autorización externa por propietario/ruta en cada
  operación, KHC1 y tamaño exactos; bloquea el fallback histórico de texto claro.
- `b2-store.ts`: binding al cifrador y adaptador privados existentes; no nuevas
  credenciales, políticas de bucket, claves ni proveedor. El parámetro heredado
  `access:'public'` pertenece a la firma del adaptador: NO hace público B2.
- `google-auth.mjs`: protocolo de autorización de Google acotado a `drive.file`,
  PKCE S256, URL de retorno HTTPS configurada, mismo usuario/same-browser state,
  consumo atómico de un solo uso y errores sin texto privado del proveedor.
  Incluye renovación del permiso vinculada al dueño/cliente y conservación de rotación de refresh token; el llamador aún debe serializar y guardar cifrado antes de usarlo. NO es ruta HTTP, sesión Khora, almacenamiento de tokens ni Google Picker.
- `tests/unit/takeout.test.ts` conecta los ensayos aislados con el descubrimiento
  `.test.ts` del runner existente; el proceso hijo usa una allowlist de entorno,
  sin heredar claves reales. Requiere Node con stripTypeScriptTypes (22.6+).

## Condiciones obligatorias antes de exponer una ruta

1. `auth()` real y propietario verificado, sin inferir identidad de Notion/Google.
   Operaciones de escritura: validación de origen/CSRF; respuestas `no-store`;
   sin tokens, referencias de objeto o autobiografía en logs/telemetría.
2. Configuración Google Cloud legítima y verificada: client ID/secret, redirect
   exacto `/api/takeout/google/callback`, consentimiento y Picker con `drive.file`.
   El login OIDC de Khora NO concede lectura de Drive. El ID pegado NO concede
   acceso. Añadir a Drive el Takeout es el primer canal previsto, no soporte
   universal del enlace de correo. Las partes divididas requieren manifiesto.
3. Guardar transacción OAuth y tokens SOLO cifrados del lado servidor, con dueño,
   expiración y consumo SQL atómico. Cookie de estado HttpOnly, Secure, SameSite=Lax,
   Path acotado y Max-Age<=600s; correlación servidor y sesión en callback.
   Nunca pedir cookies ni contraseñas Google al operador.
4. Recibos cifrados en almacén duradero, lease y revisión/CAS vinculados a dueño y
   trabajo; commit solo después de relectura. Fallo tras escritura puede dejar
   un objeto cifrado huérfano: conciliación acotada, NO borrado automático de
   originales. Idempotencia de reanudación no implica cero objetos huérfanos.
5. Runtime duradero aprobado y cualificado. La llamada final `advanceTransfer`
   relee TODO el archivo; no colocarla en una petición serverless ordinaria.
   Render del frente Chat NO se asume disponible. Vercel Functions NO equivale
   a worker duradero. No cambiar esta frontera para simular cierre.
6. Preflight real de volumen, cuota B2/transferencias, límites y presupuesto.
   El techo técnico de 50 GiB NO es cuota gratuita ni certificación de archivos
   de ese tamaño. No iniciar un archivo real por estar bajo ese techo.
7. Parser de archivos maduro con límites de expansión/memoria, zip-slip, enlaces,
   duplicados, ZIP64/multipart y rechazo seguro; nunca ejecutar HTML/scripts
   ni mandar contenido a LLM externo. Parser/índice aún NO implementados.
8. Consumidor de `khora.corpus-autobiografico`, especificación0.2.0/esquema0.1.0,
   fuente `49de30bde952152f14c1fe67a07bf11a329e89cb`, validación cerrada y gobierno
   real: candidatos privados y no revisados, tiempo del hecho separado de captura,
   originales y hashes anclados, sin aceptación/publicación automática. Adaptador
   de ingesta, almacenamiento de unidades y revisión aún NO implementados.
9. Recuperación, cancelación, revocación y retención aprobadas; ensayo sintético
   contra Google/B2/DB reales y prueba autenticada. Host compartido puede observar
   sesión/pantalla; cifrado servidor no es zero-knowledge ni enclave confiable.

## Ensayo y evidencia

`node --test khora-web/tests/unit/takeout-transfer.test.mjs khora-web/tests/unit/takeout-google-auth.test.mjs`

76 casos sintéticos, cifrador canónico exacto KHC1/AES-256-GCM; red Google y
almacenamiento en memoria simulados de forma explícita. NO es certificación
criptográfica, revisión independiente ni prueba integral productiva. El binding
B2 tiene comprobación de sintaxis; falta comprobación global de tipos y build.
No se modifican package/lock/configuración/DB/custodia/audio/grafo/EP.
