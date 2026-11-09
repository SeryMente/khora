# CUSTODIA-B2-006 · Habilitar archivado con Backblaze B2

> **Estado:** en_curso · **Prioridad:** P0 · **Hito:** 1 de 5.
> **Insumo disponible:** prediagnóstico parcial de CUSTODIA-B2-005; no se exige cerrar su diagnóstico residual para comenzar. **Desbloquea:** CUSTODIA-B2-005 (verificación residual) y CUSTODIA-B2-007 (tras aceptación E2E).
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.
> **Autorización vigente (2026-11-09):** el operador respondió «Correcto , actualiza tareas provisionales rapidamente, y resuelve.» a la solicitud explícita para actuar sobre credenciales B2 de Production y desplegar condicionado a pruebas. Se autoriza verificar/corregir únicamente variables B2 de Production mediante la bóveda canónica y desplegar solo tras pasar todos los gates técnicos. La autorización está recibida; la ejecución y aceptación siguen PENDIENTES.

## 1. Objetivo

**Prioridad aprobada por el operador el 2026-11-09:** devolver cuanto antes la capacidad de archivar en Cora/Khora. Este hito precede al diseño multialmacén; no se espera a que la persistencia definitiva esté diseñada.

Restablecer el archivo de registros de Cora/Khora usando Backblaze B2 como destino operativo inmediato, con captura de audio/texto, persistencia física, lectura de vuelta y vínculo a la sesión comprobados.

B2 es el medio inmediato para desbloquear el servicio; esta tarea no declara que deba ser el único proveedor final.

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


### Límite de acceso a bóveda local · 2026-11-09

- Se inspeccionó de forma no destructiva el equipo remoto PC10RCIF4EI4 (el único usado en este ciclo; no se accedió a equipos excluidos). En la ruta estándar del clon Khora no estaba el repositorio; tampoco apareció `secrets/env-vault.enc.json` ni el archivo temporal DPAPI de acceso de la bóveda bajo el perfil de ese equipo.
- Esta observación **no prueba** que el repositorio o la bóveda no existan en el equipo activo del operador; solo identifica que no están disponibles en el PC10 consultado.
- Consecuencia: no se pudo importar la bóveda canónica, comparar el par B2 local con el proveedor ni ejecutar el preflight real. No se leyeron ni modificaron credenciales, y no se realizó PUT/GET de objetos reales ni despliegue.
- Próximo paso local: desde el clon propietario con la bóveda presente y desbloqueada, importar únicamente las entradas B2 necesarias y ejecutar el preflight de solo lectura. El resultado debe mostrar únicamente etapa/código/HTTP/provider-code; nunca valores.
