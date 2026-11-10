<!-- EVIDENCE_VERSION=0.1; EVIDENCE_STATUS=STATIC_CODE_INSPECTION; PRODUCTION_TEST=NOT_RUN -->
# Dependencia de X_KHORA_KEY en catálogo y recuperación · 2026-11-10

> **Tipo:** evidencia técnica de inspección estática del código en la rama `fix/cora-recovery-inventory-20261110`.  
> **Resultado:** dependencia criptográfica confirmada; estado operativo de Production y causalidad por registro no verificados.  
> **No realizado:** no se leyó el valor de la variable, no se consultaron datos personales, no se ejecutó un endpoint productivo, no se descifró ni modificó ciphertext, no se cambió código ni configuración.

## 1. Función criptográfica exacta

Fuente: [`khora-web/lib/server/cripto.ts`](https://github.com/SeryMente/khora/blob/fix/cora-recovery-inventory-20261110/khora-web/lib/server/cripto.ts), blob `92427a1cacf745142a760802247105726373faf6`.

- `llave()` lee exclusivamente `process.env.X_KHORA_KEY`; exige longitud mínima de 16 caracteres.
- Si el valor tiene exactamente 64 caracteres hexadecimales, se interpreta como 32 bytes hexadecimales. En otro caso se deriva una clave de 32 bytes mediante `scryptSync(valor, "khora-boveda-v09", 32)`.
- El módulo utiliza **AES-256-GCM**, cifrado autenticado.
- Texto: `cifrarTexto/descifrarTexto`; sobre con prefijo `khc1.`, IV aleatorio de 12 bytes, etiqueta de autenticación y ciphertext en Base64URL.
- Binario: `cifrarBytes/descifrarBytes`; sobre con marca `KHC1`, IV de 12 bytes, etiqueta de autenticación de 16 bytes y ciphertext.
- `descifrarTexto` conserva compatibilidad con texto sin el prefijo cifrado; `descifrarBytes` deja pasar objetos sin marca KHC1. Por tanto, no debe afirmarse que cada campo histórico o cada byte de la base está cifrado con esta llave.

La misma llave derivada debe estar disponible en el runtime para descifrar los payloads creados con ella. Un valor ausente o distinto no permite validar la etiqueta GCM del ciphertext anterior.

## 2. Dependencia directa del panel «Recuperar capturas»

Fuentes:
- [`khora-web/lib/server/custodia-recuperacion.ts`](https://github.com/SeryMente/khora/blob/fix/cora-recovery-inventory-20261110/khora-web/lib/server/custodia-recuperacion.ts), blob `278a479db46e6f2bed72ea7d31f88cc373fa67d1`.
- [`khora-web/app/api/dictado/checkpoint/route.ts`](https://github.com/SeryMente/khora/blob/fix/cora-recovery-inventory-20261110/khora-web/app/api/dictado/checkpoint/route.ts), blob `86138d60e1a2d25d277c468dc9af90f460334243`.

La ruta `GET /api/dictado/checkpoint?catalog=1` delega en `catalogoRecuperacion()`. La consulta SQL obtiene sesiones abiertas del propietario y el snapshot de checkpoint más reciente. Al construir cada tarjeta, el catálogo ejecuta `descifrarTexto(snapshot)` y extrae título, vista previa, caracteres, duración y partes de audio.

El procesamiento completo está dentro de un `try/catch`: si el descifrado de un snapshot cifrado falla por llave ausente/divergente, la función devuelve `503 catalogo_no_disponible`. Así, una o más filas y ciphertext pueden seguir físicamente en Neon, pero la página del catálogo puede no llegar a mostrarse. El catálogo no necesita leer Blob para efectuar esa consulta; esta dependencia es distinta del proveedor de audio.

El endpoint de revisiones `?revisions=1&sessionId=...` también descifra cada snapshot. La lectura de una captura `?sessionId=...` descifra el snapshot y `checkpoint_text`. La recuperación `POST ?recover=1` descifra la revisión seleccionada antes de crear la captura hija. La llave, por ello, puede bloquear tanto la generación de tarjetas/previews como la lectura y restauración del checkpoint.

## 3. Contenido cifrado y operaciones posteriores

Call sites verificados en la misma rama:

- **Checkpoints y snapshots:** la ruta de checkpoint aplica `cifrarTexto` al texto y al JSON de snapshot, y `descifrarTexto` al leerlos.
- **Audio por partes:** [`khora-web/app/api/audio/route.ts`](https://github.com/SeryMente/khora/blob/fix/cora-recovery-inventory-20261110/khora-web/app/api/audio/route.ts), blob `af7a1f3dcffc4c96f734ee06d746d91820567fea`: cifra los bytes antes de escribirlos y descifra la lectura de vuelta para verificar SHA-256/longitud. Las rutas de exportación/lectura también llaman a `descifrarBytes`.
- **MP3 derivado:** [`khora-web/lib/server/audio-mp3.ts`](https://github.com/SeryMente/khora/blob/fix/cora-recovery-inventory-20261110/khora-web/lib/server/audio-mp3.ts), blob `d8730b7078df84349cffab6fbc223ec1d94c01f6`: cifra el derivado y descifra cada original antes de verificarlo/convertirlo.
- **Texto de Volcados y versiones:** [`khora-web/lib/server/volcados.ts`](https://github.com/SeryMente/khora/blob/fix/cora-recovery-inventory-20261110/khora-web/lib/server/volcados.ts), blob `d0c6d863efccccdf8f566b1ab64db61be649ce9f`: escribe y lee texto usando los helpers criptográficos.
- **Credenciales GitHub almacenadas por KHORA:** [`khora-web/lib/server/github-credentials.ts`](https://github.com/SeryMente/khora/blob/fix/cora-recovery-inventory-20261110/khora-web/lib/server/github-credentials.ts), blob `1ada8df88b193e500434ad5a9002e7a28825cb70`: cifra/descifra el objeto que contiene la credencial.

Uso secundario y condicionado: `khora-web/lib/server/boveda.ts` toma `AUTH_SECRET || X_KHORA_KEY` para firmar la cookie de desbloqueo web. Si `AUTH_SECRET` está configurada, esta función usa aquella; no sustituye la dependencia directa de `cripto.ts`, que exige `X_KHORA_KEY`.

## 4. ¿Los registros posteriores requieren la llave?

**Sí, para toda operación cuyo contenido pase por `cifrarTexto` o `cifrarBytes`.** En los flujos actuales esto incluye los nuevos checkpoints/snapshots, partes de audio, MP3 y texto de Volcados/versiones; también las credenciales GitHub guardadas por el servidor. La misma llave debe continuar disponible para su lectura posterior.

No significa que cada fila, metadato o columna de Neon esté cifrada con ella. IDs, titularidad, marcas de tiempo, referencias, estados, tamaños y hashes pueden permanecer como metadatos consultables. Además, los helpers conservan compatibilidad con valores históricos no marcados como cifrados.

Si falta la variable, los flujos de escritura que invocan los helpers fallan; no deben generar un secreto sustituto silenciosamente. Si se cambia a otra llave, el ciphertext creado con la anterior no se vuelve descifrable por usar la nueva. No hay evidencia aquí de un keyring multiversión ni de una migración criptográfica automática.

## 5. Diferencia frente a Vercel Blob

Son dos compuertas independientes:

- **Vercel Blob suspendido:** impide obtener físicamente los bytes históricos alojados allí. Aun con la llave correcta, no hay descifrado posible mientras el GET del objeto no funcione.
- **X_KHORA_KEY ausente/divergente:** puede impedir descifrar snapshots en Neon antes de que el panel termine de formar las tarjetas; también impide descifrar bytes KHC1 después de recuperarlos desde B2 o Blob.
- **Ambos problemas simultáneos:** bloquean tanto la carga de tarjetas que dependen de snapshots cifrados como la lectura del audio legacy. Resolver uno no resuelve el otro.

No deben confundirse además con falta de revisión/checkpoint o falta de titularidad: las 35 sesiones históricas sin revisión del inventario y las 81 sesiones sin titularidad conservan esas condiciones propias; recuperar la llave no crea revisiones ni asigna propietarios.

## 6. Estado probatorio y backlog recomendado

**Confirmado por código:** dependencia de la llave en catálogo, checkpoints, recuperación, audio, Volcados y credenciales GitHub.

**No verificado:** que Production carezca de la llave, que la llave configurada haya cambiado, que los registros concretos ausentes del panel fallen por descifrado o que cada objeto histórico esté marcado KHC1/khc1. La prueba de una credencial EP, si el operador la ejecuta, solo comprueba que la llave del runtime descifra ese ciphertext específico; no revela la llave ni demuestra por sí sola que todos los registros históricos usen la misma versión.

**Siguiente backlog dentro de CUSTODIA-01:**
1. Verificar por vía autenticada y sin imprimir secretos que Production conserva la llave actual; usar únicamente un endpoint de lectura segura autorizado.
2. Comprobar el catálogo paginado y el resultado de revisiones después de validar el descifrado; separar fallos de llave, revisión ausente, titularidad y almacenamiento.
3. Probar por separado un objeto B2 accesible y un objeto Blob solo cuando el proveedor permita GET; cotejar bytes/longitud/SHA después del descifrado.
4. Si un fallo de snapshot individual provoca que toda la página devuelva 503, evaluar una propuesta de código para aislar el error por tarjeta y comunicar un estado no descifrable sin ocultar los demás registros. No ejecutar esa modificación sin autorización específica.
5. Mantener la misma llave: no rotar, sustituir, regenerar ni re-cifrar durante el rescate.

**Límite de este hallazgo:** inspección de código únicamente. No se ejecutó catálogo, endpoint de recuperación, lectura B2/Blob, consulta Neon ni prueba en Vercel Production.
