# CUSTODIA-B2-006 · Habilitar archivado con Backblaze B2

> **Estado:** en_curso · **Prioridad:** P0 · **Hito:** 1 de 5.
> **Insumo disponible:** prediagnóstico parcial de CUSTODIA-B2-005; no se exige cerrar su diagnóstico residual para comenzar. **Desbloquea:** CUSTODIA-B2-005 (verificación residual) y CUSTODIA-B2-007 (tras aceptación E2E).
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.
> **Autorización vigente (2026-11-09):** el operador respondió «Correcto , actualiza tareas provisionales rapidamente, y resuelve.» a la solicitud explícita para actuar sobre credenciales B2 de Production y desplegar condicionado a pruebas. Se autoriza verificar/corregir únicamente variables B2 de Production mediante la bóveda canónica y desplegar solo tras pasar todos los gates técnicos. La autorización está recibida; la ejecución y aceptación siguen PENDIENTES.

## 1. Objetivo

**Prioridad aprobada por el operador el 2026-11-09:** devolver cuanto antes la capacidad de archivar en Cora/Khora. Este hito precede al diseño multialmacén; no se espera a que la persistencia definitiva esté diseñada.

Restablecer el archivo de registros de Cora/Khora usando Backblaze B2 como destino operativo inmediato, con captura de audio/texto, persistencia física, lectura de vuelta y vínculo a la sesión comprobados.

B2 es el destino único de todas las nuevas escrituras desde ahora. Vercel Blob conserva temporalmente solo lectura histórica hasta completar el backfill a B2; no se permite fallback silencioso a Blob para nuevas escrituras.

## 2. Precondiciones

- El prediagnóstico CUSTODIA-B2-005 ya documenta los bloqueos observados; la causa B2 exacta se puede completar durante esta reparación sin postergar su inicio.
- El acceso a la cuenta/bucket correcto de Khora debe comprobarse con la identidad autorizada.
- La credencial necesaria debe comprobarse desde la bóveda canónica autorizada de Khora. Existe autorización específica para verificar/corregir solo el par B2 de Production; nunca se revelan sus valores. No rotar una clave sin evidencia de que la existente es incorrecta o no recuperable.
- La rama de código se basa en main reconciliado y cuenta con pruebas del fallo previo.

La verificación/corrección B2 Production está autorizada dentro del alcance documentado. Cualquier cambio ajeno a esas variables, SQL/backfill/migración productiva, cambio de seguridad/CORS o alteración de objetos originales sigue bloqueado. No se imprimen ni transportan secretos por chat.

## 3. Alcance

**Incluye**
- Corregir el problema identificado de autenticación/configuración B2 en una rama.
- Validar autenticación, cuenta, capacidades requeridas, bucket privado y región.
- Hacer PUT/GET físico de un objeto sintético cifrado, comparando bytes, longitud y SHA-256.
- Verificar subida de partes, vínculo persistido, manifiesto y archivado de extremo a extremo en entorno no productivo.
- Comprobar reintentos, interrupción de red y recuperación tras recarga.

**No incluye**
- Fallback silencioso a Blob mientras se implementa el desbloqueo B2.
- Desplegar antes de superar las pruebas. El despliegue productivo solo está autorizado de forma condicionada tras los gates completos.
- SQL/backfill en Neon Production.
- Borrado/sobrescritura de fuentes históricas o cambio de seguridad/CORS del bucket.

## 4. Secuencia mínima

1. Corregir solo la causa confirmada en CUSTODIA-B2-005.
2. Ejecutar preflight B2 real de solo lectura.
3. Ejecutar PUT → GET → SHA/longitud/KHC1 sobre objeto sintético.
4. Ejecutar dictado con varias partes y confirmar cada parte por lectura de vuelta y vínculo.
5. Ejecutar «Archivar registro», recargar y recuperar la captura archivada.
6. Preparar el recibo de aceptación y una compuerta separada para producción.

## 5. Criterios de aceptación

| Criterio | Evidencia exigida | Resultado |
|---|---|---|
| B2 autentica y el bucket es el correcto/privado | Preflight real con recibo saneado | PENDIENTE |
| Objeto sintético se conserva físicamente | PUT/GET y SHA-256/longitud coincidentes | PENDIENTE |
| Cada parte queda vinculada y verificada | Registro de parte más read-back físico | PENDIENTE |
| El archivado concluye sin omitir partes | E2E con múltiples partes y manifiesto íntegro | PENDIENTE |
| Se recupera tras recarga | Read-back de texto/audio desde el flujo de recuperación | PENDIENTE |
| No hay fallback silencioso | Pruebas de error y revisión de rutas | PENDIENTE |

## 6. Estado de bloqueo observado · 2026-11-09

- El proyecto Vercel `khora-web` tiene variables de entorno de producción con los nombres `KHORA_OBJECT_STORAGE`, `KHORA_B2_BUCKET_NAME`, `KHORA_B2_BUCKET_ID`, `KHORA_B2_KEY_ID` y `KHORA_B2_APPLICATION_KEY`; se consultaron únicamente nombres, targets y tipos, nunca valores.
- El deployment productivo `dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f`, commit `7be5712a19aa98837e6d34449585ecb40e634af3`, falló al ejecutar el preflight nativo en `b2_authorize_account` con `storage_b2_authorization_failed`. El build no conserva el HTTP status ni el código devuelto por B2.
- Según Backblaze, un HTTP 401 de `b2_authorize_account` puede significar `unauthorized` (par applicationKeyId/applicationKey incorrecto) o `unsupported` (clave no compatible con la versión de API). No se ha observado el status real de este deployment; no se atribuye todavía una causa concreta. [Documentación oficial de Backblaze](https://www.backblaze.com/apidocs/b2-authorize-account).
- La corrección de cola/reintento del botón de archivo en PR #355 sí está integrada en `main` mediante merge `8489a09c03a330b85f3e31297415ada7a19fe10e` y tuvo un deployment `READY` `dpl_HRPV5F7FteWVZquUjfZcumA52atg`. Eso no resuelve la autenticación B2.
- **Bloqueo técnico actual:** el par de credenciales B2 aún no se ha validado contra la bóveda canónica. La lectura de metadatos Vercel confirmó las variables B2 en target Production, pero sus valores no fueron descifrados ni leídos. La causa del rechazo sigue sin identificar.
- **Estado de autorización:** autorización recibida; verificación/corrección de B2 Production permitida solo dentro del alcance anterior. Ejecución, PUT/GET físico, E2E y despliegue siguen PENDIENTES.

## 7. Salida

Cora vuelve a aceptar y archivar registros de prueba de extremo a extremo en el entorno autorizado. La publicación de producción y la aceptación con una cuenta propietaria real son una compuerta independiente; no se infieren del éxito no productivo.


### Avance técnico · PR #362 · 2026-11-09

- Rama: `fix/custodia-b2-auth-diagnostics-20261109`.
- PR: [#362](https://github.com/SeryMente/khora/pull/362), OPEN · DRAFT · NOT MERGED.
- Punta: `3b684a870a21ccf2f200ee684687beea42e3b235`; 3 archivos de código/prueba cambiados: `object-storage.ts`, `preflight-object-storage.ts` y `object-storage.test.ts`.
- La corrección conserva el HTTP status y el código JSON de B2 bajo validación estricta y los expone en el preflight sin imprimir claves, tokens, cabeceras Authorization, cuerpos ni mensajes libres.
- La prueba unitaria sintética cubre HTTP 401/`unauthorized`; se añadió pero no se ejecutó en esta sesión. GitHub Actions no devolvió workflow runs para la punta; los checks Vercel fallan por la limitación del plan/repo privado de organización.
- La PR no se integró ni desplegó a Production. La Preview existente quedó READY (build y TypeScript PASS, 78/78 páginas estáticas), pero no ejecutó el preflight B2 porque las variables están limitadas a Production. La prueba unitaria añadida no se ejecutó. La PR no demuestra archivado operativo.

**Siguiente paso:** desbloquear la verificación desde la bóveda canónica, ejecutar preflight saneado, PUT/GET físico sintético y E2E. El despliegue productivo queda autorizado solo después de que todas las pruebas pasen. Antes debe inspeccionarse `migrate-runtime`; si produce mutaciones de Neon Production fuera de la autorización, detener el despliegue.


### Confirmación de la versión productiva activa · 2026-11-09

- Una resolución de `khora-web.vercel.app` devuelve actualmente el deployment `dpl_Dczf3WWnPG4cnCaJhf6PS8MzmxLe`, estado READY, commit `b52003ee1809ad506db74e8ee97f0905f7aae91a`.
- El log de ese build muestra el comando `node scripts/migrate-runtime.mjs; next build --webpack`; **no ejecutó `preflight-object-storage.ts`**. Su estado READY no es una prueba de autenticación B2.
- El archivo `khora-web/lib/server/object-storage.ts` en ese commit usa AWS SDK `S3Client` y las variables `KHORA_B2_KEY_ID` / `KHORA_B2_APPLICATION_KEY`. El ensayo de roundtrip de ese mismo commit falló con `storage_provider_request_failed`.
- El commit posterior `7be5712a` migró al transporte nativo B2, pero su preflight productivo falló en `b2_authorize_account` con `storage_b2_authorization_failed`.
- Backblaze documenta el uso de claves estándar para integraciones S3-compatible y distingue la Master Application Key para acceso completo a la cuenta; la API nativa v4 acepta Master o claves normales. No se debe mezclar una Master Key con el cliente S3-compatible esperando que funcione. Referencias: [guía oficial de claves](https://help.backblaze.com/hc/en-us/articles/360052129034-Creating-and-Managing-Application-Keys) y [b2_authorize_account v4](https://www.backblaze.com/apidocs/b2-authorize-account).

**Conclusión:** el alias productivo está aún sobre el transporte S3-compatible y no prueba su roundtrip. El transporte nativo es el camino técnico preparado, pero no puede pasar a producción hasta resolver el par de autenticación B2 y demostrar PUT/GET con SHA/bytes.


### Preview de validación del código · 2026-11-09

- Se creó el deployment preview `dpl_9gWxfH72UD2b2S115QpEUwa2M9Bt`, URL `https://khora-ghmy4m41f-victorhugotorresmendez-8991s-projects.vercel.app`, desde la rama `fix/custodia-b2-auth-diagnostics-20261109`, commit `3b684a870a21ccf2f200ee684687beea42e3b235`.
- Estado final: READY. Build: `Compiled successfully in 37.2s`; TypeScript: PASS (16.8s); páginas estáticas: 78/78; `Build Completed in /vercel/output`. No se ejecutaron unitarias ni preflight B2; no se declara persistencia física ni archivado E2E.
- Las credenciales B2 consultadas se encuentran asociadas únicamente a Production; el preview no dispone de ellas. El preflight de B2 está condicionado a Production, por lo que este preview solo puede validar compilación, nunca autenticación B2 ni archivado físico.
- Es un preview aislado: no tiene alias productivo y no modifica el servicio activo.


### Autorización y compuerta · 2026-11-09

El asentimiento contextual del operador queda enlazado al original A [INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md](../../originales/INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md), UUIDv7 local `01a1c17d-189a-7fea-a644-6be002e2c07a`. Alcance autorizado: verificar/corregir solo las variables B2 de Production mediante la bóveda canónica y desplegar a producción únicamente tras pasar todos los criterios de aceptación. La autorización no equivale a ejecución ni permite mostrar secretos. Antes del despliegue se inspeccionará el hook de build `migrate-runtime`; si ejecuta mutaciones de Neon Production fuera de la autorización, el despliegue se detendrá. No se autoriza SQL/backfill productivo, cambios de CORS/seguridad ni borrado/sobrescritura de fuentes.


### Nota de acceso local anterior · SUPERSEDIDA EN ESTA RETOMA

- La mención de PC10RCIF4EI4 describe una sesión efímera antigua, de días previos. El operador indicó expresamente que debe descartarse; no es la estación activa ni un bloqueo vigente.
- No volver a utilizar ni a investigar esa sesión PC10. No inferir que la bóveda o el clon estén ausentes en el equipo actual por la inspección histórica.
- La instrucción actual reporta EP Vault abierta con las notas efímeras de Key ID y Master Application Key. No se ha leído ni promovido ninguno de esos valores en este ciclo.
- «PSK14» es el identificador literal informado para la conexión RDS. Su correspondencia con un dispositivo y, especialmente, con la identidad efectiva del perfil operativo no está verificada. Antes de cualquier operación local se debe validar `whoami`, SID y perfil de destino autorizado; no utilizar PC 13 ni MantenimientoRCI.
- No copiar secretos a chat, documentación, argumentos, historial de shell o logs. Promover cada valor mediante la bóveda canónica y el flujo de portapapeles autorizado, de forma individual, con read-back sin imprimirlo.

### Orden de build y efecto real de migraciones · CORREGIDO · 2026-11-09

La inspección cruzada de eventos Vercel corrige la nota previa: no todos los intentos se detuvieron antes de migrar.

1. **Deployment `dpl_36DeUEnuz2zoWtMJqp1BsZjWASUJ` · commit `b52003ee1809ad506db74e8ee97f0905f7aae91a`.** El comando observado ejecutó primero `node scripts/migrate-runtime.mjs` y después `node --import tsx scripts/preflight-object-storage.ts`. El log del proveedor informa: «Migraciones 023-029 de runtime, OAuth, evidencia normativa, Bearer manual y ledger de orden aplicadas». Tras ello, el preflight falló en `encrypted_roundtrip` con `storage_provider_request_failed`. Por tanto, es falso afirmar que el hook nunca se ejecutó.
2. **Deployment `dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f` · commit `7be5712a19aa98837e6d34449585ecb40e634af3`.** El comando observado fue `preflight-object-storage.ts && migrate-runtime.mjs`. El preflight nativo falló en `b2_authorize_account` con `storage_b2_authorization_failed`; por la semántica de `&&`, ese intento no alcanzó el hook de migraciones.
3. El archivo inspeccionado `khora-web/scripts/migrate-runtime.mjs` enumera 023–029 y `032_graph_twins.sql`. El log confirma expresamente la aplicación de 023–029; no permite confirmar por separado el resultado de 032. No inferirlo.
4. La autorización recibida cubre exclusivamente la comprobación/corrección B2 y el despliegue condicionado a todos los gates; no cubre nuevas migraciones, SQL ni backfill productivo. El hecho histórico de que un build ya haya ejecutado 023–029 no autoriza repetirlo.

**Gate vigente:** no provocar otro build/deployment Production mientras el hook pueda volver a ejecutar mutaciones de Neon sin verificar el estado aplicado y sin un procedimiento aprobado que evite mutaciones fuera de alcance. Registrar cualquier comprobación de esquema solo mediante evidencia autorizada y no destructiva. No retirar a ciegas el hook ni cambiar el comportamiento del proyecto sin revisión presencial del operador, dado que afecta seguridad/arquitectura.

### Retoma actual · EP Vault y diagnóstico B2 · 2026-11-09

- **Instrucción A:** [INSTRUCCION-RETOMA-CUSTODIA-20261109.md](../../originales/INSTRUCCION-RETOMA-CUSTODIA-20261109.md) · UUIDv7 local `01a1c193-eccc-78ad-bcb1-a7f102ff4733`.
- **Evidencia vigente:** [DIAGNOSTICO-B2-PRODUCTION-20261109.md](../../evidencias/DIAGNOSTICO-B2-PRODUCTION-20261109.md).
- En el inventario no descifrado de Vercel Production existen los nombres heredados `KHORA_B2_KEY_ID` y `KHORA_B2_APPLICATION_KEY`, además de `KHORA_OBJECT_STORAGE`, `KHORA_B2_PREFLIGHT`, `KHORA_B2_BUCKET_NAME` y `KHORA_B2_BUCKET_ID`. No aparecen los nombres canónicos `KHORA_B2_MASTER_APPLICATION_KEY_ID` y `KHORA_B2_MASTER_APPLICATION_KEY`. Los valores no fueron leídos.
- El código nativo prioriza los nombres canónicos y usa los heredados como fallback. La falta de nombres canónicos en Vercel es una diferencia de configuración constatada, pero no basta para concluir qué credencial concreta B2 rechazó.
- El operador reporta que EP Vault sigue abierta y que las notas efímeras contienen ambos valores. No se ha leído el contenido, no se ha promovido a la bóveda formal, no se han importado variables y no se ha ejecutado el preflight desde esa sesión.
- El último preflight nativo disponible sigue siendo fallo de autenticación B2. El HTTP status y el código del proveedor no se conservan en ese deployment; PR #362 añade captura saneada pero continúa OPEN · DRAFT · NOT MERGED, y su preview no dispone de las variables Production.
- **Estado de aceptación:** autenticación, PUT/GET físico, SHA-256/bytes, vínculo/manifiesto de partes, archivado E2E y recuperación tras recarga siguen PENDIENTES. Cora/Khora no se declara restaurada.

**Siguiente acción causal:** resolver la conexión RDS referida como `PSK14`, validar que el proceso opere bajo un perfil autorizado y comprobar la sesión abierta de EP Vault. Después promover cada valor individualmente a la bóveda canónica mediante portapapeles, leer de vuelta sin imprimir secretos e importar solo las dos variables canónicas para ejecutar el preflight de solo lectura. No usar PC10, no exponer secretos, no rotar por sospecha y no reintentar despliegue productivo con migraciones.



### Intento urgente de transferencia EP Vault → bóveda fila4 · 2026-11-09

- **Instrucción A:** [INSTRUCCION-TRANSFERENCIA-EPVAULT-FILA4-20261109.md](../../originales/INSTRUCCION-TRANSFERENCIA-EPVAULT-FILA4-20261109.md), UUIDv7 local `01a1c19d-259d-7348-ab19-4ba87044a8d8`.
- **Resultado B:** [SALIDA-MODELO-TRANSFERENCIA-EPVAULT-FILA4-20261109.md](../../originales/SALIDA-MODELO-TRANSFERENCIA-EPVAULT-FILA4-20261109.md), UUIDv7 local `01a1c19d-259d-7afb-b310-e259a5d77f9d`.
- PC-14 (device ID `4fc35a07-2192-4b88-81ec-96cb450d565e`) respondió a una consulta read-only, pero la identidad efectiva fue `PC-14\PC 13`, perfil `C:\Users\PC 13`; no es la identidad destino fila4.
- Una llamada posterior del conector Desktop Commander devolvió cuota mensual agotada y pausa de llamadas; el propio servicio indica no reintentar ni reconectar. No se efectuaron más llamadas después de ese mensaje.
- **No se leyó el contenido** de las notas efímeras; no se extrajeron ni copiaron secretos; no se ejecutó `Set-KhoraEnvVaultVariable`, no se cambió la bóveda destino, no se modificó Vercel y no se ejecutó preflight.
- Estado del requisito de transferencia: **NO EJECUTADO / NO PERSISTIDO**. No marcar como guardadas ni como verificadas las variables `KHORA_B2_MASTER_APPLICATION_KEY_ID` y `KHORA_B2_MASTER_APPLICATION_KEY`.
- **Siguiente paso:** resolver el límite de uso desde el panel de Desktop Commander y habilitar acceso bajo la identidad efectiva autorizada `CENTRAL\fila4`; después recuperar la nota, guardar cada variable por separado y verificar la lectura de vuelta cifrada, sin imprimir valores.



### Retoma operativa y rectificación · 2026-11-09 · PC-7

**Instrucción vigente:** restablecer el acceso KHORA a Backblaze B2, dirigir allí todas las escrituras nuevas y después copiar a B2 todo el histórico de Vercel Blob. La cuenta Backblaze es exclusiva de KHORA; la Master Application Key se usa de forma ubicua. No generar Application Keys adicionales ni sustituirla por credenciales EP.

**Identidad RDC:** PC-7 es la única terminal RDC disponible; la sesión real observada es PC-7\\PC 7. No solicitar ni asumir CENTRAL\\fila4, PSK14, PC-14 ni otra terminal. La instrucción del operador supersede cualquier referencia histórica que los presente como requisito.

**Comprobación B2 ejecutada desde PC-7 mediante EP Vault sin imprimir valores:**
- b2_authorize_account: PASS.
- El Key ID coincide con el Account ID y la respuesta expone capacidades maestras de lectura, listado, escritura y eliminación. No se aplicó restricción por bucket ni prefijo; esa amplitud es intencional porque la cuenta es exclusiva de KHORA.
- Bucket khora-userdata-ecea4187, ID 35b8cbd6623b54a5a9130c18, pertenece a la cuenta autenticada y es allPrivate.
- Esto confirma autenticación y metadatos del bucket, no PUT/GET físico.

**Vercel Production, metadatos sin descifrar valores:**
- KHORA_OBJECT_STORAGE ya está seleccionado para B2; KHORA_B2_PREFLIGHT=1.
- Bucket name/ID ya configurados.
- Existen nombres heredados KHORA_B2_KEY_ID y KHORA_B2_APPLICATION_KEY.
- Faltan KHORA_B2_MASTER_APPLICATION_KEY_ID y KHORA_B2_MASTER_APPLICATION_KEY, nombres canónicos priorizados por el código actual.
- Los valores secretos no fueron descifrados ni copiados a documentación.

**Pruebas físicas:** no se completó el PUT/GET sintético en este ciclo; los intentos del script se detuvieron por errores locales de PowerShell antes de completar la subida. No hay SHA de read-back ni objeto de prueba acreditado. Tampoco se ha desplegado un runtime nuevo.

**Siguiente secuencia inmediata:** terminar PUT/GET/SHA-256 sintético B2; transferir los dos valores existentes a las variables canónicas de Production sin mostrar valores; ejecutar preflight; desplegar y comprobar logs/archivado E2E; estabilizar; realizar backfill no destructivo de Blob.
