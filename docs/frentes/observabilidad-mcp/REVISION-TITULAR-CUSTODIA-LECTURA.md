# Revisión del contrato de lectura de Custodia — dictamen del titular pendiente

**Frente:** Khora MCP / Observabilidad MCP
**Rama:** work/obs-mcp-custodia-tools-20261030-01a18dcb
**Base de esta iteración:** b197137737262c94bdb5564ee9181c978f27d60f
**OCP:** v0.3.8 al iniciar; actualización a v0.3.9 en esta iteración.
**Estado:** PREPARADO PARA REVISIÓN · NO ACEPTADO POR EL TITULAR.
**Datos utilizados:** solo fixtures sintéticos; no se consultaron registros reales, Neon Production ni Blob Production.

Este documento solicita dictamen al titular de Custodia. No modifica ni sustituye frentes/custodia/OBJETO-CANONICO.md ni frentes/custodia/CONTROL-RESPONSABILIDAD.json. Ninguna propuesta de este documento se convierte en política de Custodia hasta que el titular la acepte expresamente.

## 1. Propiedad y aislamiento de registros

### Estado técnico

La regla de atribución de sesión es:

    COALESCE(dictado_session.custodia_owner,
             dictado_session.checkpoint_usuario,
             volcado.usuario) = actor_autenticado

Se corrigió un defecto real en owns(): el SQL comparaba el propietario con $1, que corresponde a session_id, aunque el actor se envía como $2. La condición ahora compara contra $2. Una prueba de regresión comprueba los parámetros y la denegación de un actor ajeno.

Las consultas de metadatos de partes en revisiones e integridad repiten el predicado del propietario en la misma sentencia SQL que lee dictado_audio_parte. La comprobación inicial de titularidad no sustituye ese filtro en las consultas secundarias.

Los cursores de catálogo/revisiones se firman y se vinculan al actor y al contexto correspondiente. Detectan manipulación o transferencia y deriva de metadatos; no mantienen una transacción de base de datos abierta entre solicitudes paginadas.

### Dictamen solicitado

1. ¿La prioridad custodia_owner → checkpoint_usuario → volcado.usuario es la autoridad correcta para registros actuales e históricos?
2. ¿El actor debe compararse con igualdad exacta sensible a mayúsculas o existe una normalización canónica que deba aplicarse al persistir y comparar?
3. Si custodia_owner atribuye una sesión al actor actual, ¿debe poder consultar checkpoints históricos cuyo dictado_checkpoint.usuario sea diferente, o es correcto que la lectura de revisiones exija además usuario = actor?
4. ¿Una sesión y sus partes deben seguir siendo visibles para su propietario cuando se elimina volcado y las FKs quedan en NULL?

**Recomendación provisional:** conservar el predicado de propietario tanto en la comprobación inicial como en las lecturas secundarias. No ampliar la identidad por coincidencia parcial, nombre o correo inferido.

## 2. Alcance de las consultas MCP

Las tres herramientas requieren un scope especializado y el gate norm:turn.

| Herramienta | Scope | Alcance de salida |
|---|---|---|
| khora_custodia_catalogo | custodia:metadata:read | Identificadores y estado mínimo de sesión, fechas, archivo vinculado, conteos de revisiones/partes, bytes y estado MP3 |
| khora_custodia_revisiones | custodia:metadata:read | Orden temporal, hash de revisión y resumen de manifiesto/partes; no devuelve snapshot |
| khora_custodia_verificar_integridad | custodia:integrity:verify | Estado por parte tras comprobación física; no devuelve URL, bytes ni audio Base64 |

El catálogo excluye título, preview, texto, snapshot, URL Blob, audio y credenciales. Las revisiones distinguen la hora de persistencia del servidor del reloj del cliente. Una marca histórica verificado no se presenta como prueba física actual. La herramienta de integridad realiza una nueva lectura y expone únicamente su resultado resumido.

### Acceso indirecto al snapshot — decisión sensible

dictado_checkpoint.snapshot se persiste cifrado mediante cifrarTexto(JSON.stringify(s)) y puede contener texto, parcial, titulo, audioPartes, dialogo y corteAudio. MCP lee esa columna y readManifest() la descifra en memoria mediante descifrarTexto() para extraer corteAudio.hastaParte. El resto del snapshot no se devuelve al modelo.

Por tanto, el scope de metadatos ocasiona acceso en memoria a un payload cifrado más amplio que el dato final expuesto. No se devuelve la transcripción, pero esta es una frontera real de confidencialidad en el servidor.

**Dictamen solicitado:** ¿acepta el titular que el runtime MCP de metadatos lea y descifre el snapshot completo bajo el scope especializado, o requiere que el manifiesto de audio se almacene por separado en una columna/objeto mínimo consultable sin descifrar texto de la revisión? La segunda alternativa reduce el alcance de acceso, pero exige cambio de esquema y compatibilidad; no se implementa sin autorización.

## 3. Descifrado y lectura física de Blob

### Estado técnico observado

- El lector solicita HTTPS únicamente a hosts terminados en .blob.vercel-storage.com, no sigue redirecciones y usa cache no-store.
- Lee el objeto físico, ejecuta descifrarBytes() en memoria y comprueba longitud y SHA-256 del contenido resultante contra el manifiesto persistido.
- Las rutas de carga/importación revisadas cifran los bytes mediante cifrarBytes() antes de escribirlos en Blob. El formato binario usa la marca KHC1.
- La clave de cifrado se obtiene en servidor desde X_KHORA_KEY. Su valor no se leyó ni se obtuvo en esta iteración.
- Los buffers cifrados y los buffers claros temporales se limpian al salir de la función.

**Compatibilidad pendiente de dictamen:** descifrarBytes() conserva compatibilidad heredada: si el buffer no lleva la marca KHC1, devuelve el buffer sin cambios. La verificación posterior de longitud/SHA puede detectar una discrepancia, pero la función por sí sola no exige ciphertext. No se forzó rechazo de objetos sin marca al no estar demostrada la política de datos históricos.

**Dictamen solicitado:** confirmar si todo objeto de audio Custodia debe ser ciphertext KHC1 y, en ese caso, si debe imponerse un modo estricto que rechace objetos sin marca, con política expresa para legado. Confirmar también que X_KHORA_KEY es la clave de dominio esperada para todos los objetos Custodia.

## 4. Presupuesto acumulado de lectura

La rama corrige la ausencia previa de límite agregado: el lector ya no puede descargar 128 MiB por cada parte sin presupuesto global de ejecución.

**Límites implementados por invocación de khora_custodia_verificar_integridad (una página MCP):**
- Máximo agregado: **32 MiB de respuesta Blob**.
- Tiempo transcurrido máximo: **45 segundos**, desde el inicio de la herramienta, incluidas las comprobaciones de rol/propiedad y consultas SQL.
- Máximo por lectura individual: **30 segundos**, acotado por el tiempo restante.
- Máximo de página: 50 partes.
- Si una parte supera los bytes restantes, se clasifica UNVERIFIABLE y no se inicia la lectura si el tamaño declarado o Content-Length permite detectarlo anticipadamente.
- En streams sin Content-Length se cuenta el bloque entregado completo antes de cancelar si supera el saldo. Por granularidad del stream, el contador puede exceder el límite nominal hasta el tamaño del último bloque recibido; ese exceso no se descifra ni se verifica como válido.

**Límite importante:** el presupuesto se reinicia en cada llamada/página MCP. No se conserva un saldo global entre solicitudes paginadas. Por tanto, 32 MiB/45 s limita cada invocación, no una reconciliación de sesión completa que continúe mediante múltiples cursores.

**Dictamen solicitado:**
1. ¿Son adecuados 32 MiB y 45 s por llamada?
2. ¿Debe existir además un tope total para todo el recorrido paginado? Si sí, definir el presupuesto máximo y si debe persistirse un identificador de ejecución server-side con cursor firmado. No es seguro confiar en que el cliente conserve un contador sin autoridad.
3. ¿Es aceptable la granularidad del stream descrita para transferencias chunked, o se exige un límite estricto de bytes a nivel de red/proveedor?

**Pruebas de regresión:** casos separados simulan agotamiento acumulado de bytes y de tiempo entre dos partes, verificando que la segunda lectura no comience. Otra prueba comprueba el rechazo anticipado mediante Content-Length y la contabilización del bloque recibido cuando el encabezado falta.

## 5. ON DELETE CASCADE y conservación

La migración histórica 010 ya define dictado_audio_parte.session_id → dictado_session.session_id ON DELETE CASCADE. La migración 034 no modifica esa regla.

Las pruebas PostgreSQL aisladas verifican que:
- Borrar volcado aplica ON DELETE SET NULL a las referencias de sesión y parte; no elimina esos registros Custodia.
- Borrar una sesión queda bloqueado mientras existan checkpoints o registro MP3, por sus FKs NO ACTION.
- Después de retirar esos registros dependientes, borrar la sesión elimina en cascada las filas de dictado_audio_parte (registro/metadata).
- PostgreSQL no elimina el objeto físico guardado en Vercel Blob. La cascada puede dejar un Blob huérfano, sin fila relacional desde la que localizarlo.

**Dictamen solicitado:** confirmar la política de conservación para (a) sesión, (b) partes y metadatos, (c) checkpoints, (d) derivado MP3 y (e) objetos físicos Blob. ¿Debe mantenerse CASCADE para las filas de partes o se requiere bloqueo/retención explícita? ¿Quién ejecuta la limpieza de Blob y con qué evidencia de retención? Esta rama no cambia FKs ni elimina Blob.

## 6. Privilegios efectivos de KHORA_READONLY_DATABASE_URL

La migración 034 exige que exista un rol de grupo preaprovisionado khora_lector: NOLOGIN, no superusuario, sin BYPASSRLS, CREATEDB, CREATEROLE ni replicación. No crea un login ni genera credenciales.

Concede SELECT por columna y no SELECT de tabla completa:
- dictado_session: identidad, vínculo de archivo, estado, marcas temporales y campos de titular.
- dictado_audio_parte: sesión, índice, bytes, SHA-256, URL Blob y estado de verificación.
- dictado_checkpoint: identidad/revisión, sesión, usuario, fechas, hash y snapshot cifrado.
- dictado_mp3: sesión, estado, captura completa, partes fuente y fecha de actualización.
- volcado: únicamente id, folio, usuario y session_id.

Revoca privilegios previos de tabla y columna para PUBLIC y khora_lector antes de aplicar la lista permitida. El guard de runtime valida privilegios efectivos de la conexión: pertenencia al grupo, ausencia de atributos privilegiados, SELECT requerido, ausencia de SELECT fuera de la allowlist y ausencia de INSERT/UPDATE/DELETE/TRUNCATE. Si no puede demostrarlo, falla cerrado antes de consultar registros.

**Dictamen solicitado:** comprobar/provisionar que el login al que apunta KHORA_READONLY_DATABASE_URL es miembro heredante de khora_lector y no posee privilegios directos o heredados adicionales. Confirmar que la conexión no es superusuario ni BYPASSRLS. La conexión real no se abrió ni se leyó su URL/credencial; el rol efectivo en Production sigue NO VERIFICADO.

## 7. Evidencia local y gates remotos

| Evidencia local reproducible | Resultado |
|---|---|
| TypeScript: npm run typecheck | PASS |
| Unitarias completas | PASS, 594/594 |
| Migración 034 en PGlite: esquema nuevo | PASS |
| Migración 034 en PGlite: esquema preexistente | PASS |
| Idempotencia, grants/columnas, ausencia DML y FKs | PASS |
| ui-review:check y ui:contract | PASS |
| Build Next.js | PASÓ con AUTH_SECRET aleatorio y efímero limitado al proceso local; 78/78 páginas |

PGlite ejecuta PostgreSQL aislado en memoria con fixtures sintéticos; no acredita el estado real de Neon Production. Las pruebas mock de Blob no son lecturas reales de Vercel Blob.

**Gates remotos/pending independientes:** OAuth real end-to-end, inspección autorizada del rol efectivo de KHORA_READONLY_DATABASE_URL sin exponer credenciales, ejecución aprobada de 034 en Neon, lectura de Blob reales y autorización del titular. Los checks de Vercel son un gate remoto de cuenta/plan, independiente de las pruebas locales. Un build local correcto no equivale a CI remota aprobada ni a deployment.

## 8. Dictamen del titular

| Bloque | Dictamen | Observación/condición |
|---|---|---|
| Propiedad y fallback de titular | PENDIENTE | |
| Identidad exacta/normalización de actor | PENDIENTE | |
| Snapshot cifrado accesible para metadatos | PENDIENTE | |
| Scope custodia:metadata:read y gate norm:turn | PENDIENTE | |
| Lectura física/descifrado KHC1 y legado | PENDIENTE | |
| Presupuesto 32 MiB/45 s por página | PENDIENTE | |
| Presupuesto total entre páginas | PENDIENTE | |
| ON DELETE CASCADE y política de retención | PENDIENTE | |
| Privilegios efectivos de KHORA_READONLY_DATABASE_URL | PENDIENTE | |

El silencio no equivale a aceptación. Hasta que el titular emita su dictamen, el cierre del contrato de lectura permanece PENDIENTE, aunque las correcciones y pruebas locales estén preparadas.

## 9. Límites de esta iteración

No se leyeron datos reales de Custodia ni secretos productivos; no se conectó a Neon Production ni a Vercel Blob Production; no se ejecutó la migración 034 en producción; no se cambió la política FK; no se modificaron los objetos canónicos de Custodia; no se abrió PR, fusionó ni desplegó.
