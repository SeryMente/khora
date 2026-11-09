# CUSTODIA-B2-006 · Habilitar archivado con Backblaze B2

> **Estado:** en_curso · **Prioridad:** P0 · **Hito:** 1 de 5.
> **Insumo disponible:** prediagnóstico parcial de CUSTODIA-B2-005; no se exige cerrar su diagnóstico residual para comenzar. **Desbloquea:** CUSTODIA-B2-005 (verificación residual) y CUSTODIA-B2-007 (tras aceptación E2E).
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.
> **Autorización vigente:** corrección en rama y pruebas no productivas. Producción conserva una compuerta separada; no hay permiso de merge, deploy o cutover productivo.

## 1. Objetivo

**Prioridad aprobada por el operador el 2026-11-09:** devolver cuanto antes la capacidad de archivar en Cora/Khora. Este hito precede al diseño multialmacén; no se espera a que la persistencia definitiva esté diseñada.

Restablecer el archivo de registros de Cora/Khora usando Backblaze B2 como destino operativo inmediato, con captura de audio/texto, persistencia física, lectura de vuelta y vínculo a la sesión comprobados.

B2 es el medio inmediato para desbloquear el servicio; esta tarea no declara que deba ser el único proveedor final.

## 2. Precondiciones

- El prediagnóstico CUSTODIA-B2-005 ya documenta los bloqueos observados; la causa B2 exacta se puede completar durante esta reparación sin postergar su inicio.
- El acceso a la cuenta/bucket correcto de Khora debe comprobarse con la identidad autorizada.
- La credencial necesaria debe existir en la bóveda autorizada de Khora; no se leen valores ni se sustituye/rota una clave sin autorización específica.
- La rama de código se basa en main reconciliado y cuenta con pruebas del fallo previo.

Si se requiere cambiar/rotar una credencial o modificar producción, se detiene solo esa mutación y se solicita la autorización específica correspondiente. No se imprimen ni transportan secretos por chat.

## 3. Alcance

**Incluye**
- Corregir el problema identificado de autenticación/configuración B2 en una rama.
- Validar autenticación, cuenta, capacidades requeridas, bucket privado y región.
- Hacer PUT/GET físico de un objeto sintético cifrado, comparando bytes, longitud y SHA-256.
- Verificar subida de partes, vínculo persistido, manifiesto y archivado de extremo a extremo en entorno no productivo.
- Comprobar reintentos, interrupción de red y recuperación tras recarga.

**No incluye**
- Fallback silencioso a Blob mientras se implementa el desbloqueo B2.
- Merge, deploy o cambio de selector en producción sin autorización específica.
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
- **Bloqueo actual:** falta instrumentar diagnóstico saneado y verificar el par de credenciales existente con la bóveda autorizada. Esta tarea no lee ni rota secretos ni cambia producción.

## 7. Salida

Cora vuelve a aceptar y archivar registros de prueba de extremo a extremo en el entorno autorizado. La publicación de producción y la aceptación con una cuenta propietaria real son una compuerta independiente; no se infieren del éxito no productivo.


### Avance técnico · PR #362 · 2026-11-09

- Rama: `fix/custodia-b2-auth-diagnostics-20261109`.
- PR: [#362](https://github.com/SeryMente/khora/pull/362), OPEN · DRAFT · NOT MERGED.
- Punta: `3b684a870a21ccf2f200ee684687beea42e3b235`; 3 archivos de código/prueba cambiados: `object-storage.ts`, `preflight-object-storage.ts` y `object-storage.test.ts`.
- La corrección conserva el HTTP status y el código JSON de B2 bajo validación estricta y los expone en el preflight sin imprimir claves, tokens, cabeceras Authorization, cuerpos ni mensajes libres.
- La prueba unitaria sintética cubre HTTP 401/`unauthorized`; se añadió pero no se ejecutó en esta sesión. GitHub Actions no devolvió workflow runs para la punta; los checks Vercel fallan por la limitación del plan/repo privado de organización.
- La PR no se integró ni desplegó. No cambia credenciales ni variables. Su finalidad es poder diagnosticar la autorización con evidencia segura; no demuestra todavía archivado operativo.

**Siguiente bloqueo:** ejecutar esta versión con acceso B2 autorizado para captar `http_status` y `provider_code`, resolver el par de credenciales desde la bóveda autorizada si procede y repetir el PUT/GET físico y el archivado E2E. La mutación productiva continúa separada y no está autorizada por este alcance.


### Confirmación de la versión productiva activa · 2026-11-09

- Una resolución de `khora-web.vercel.app` devuelve actualmente el deployment `dpl_Dczf3WWnPG4cnCaJhf6PS8MzmxLe`, estado READY, commit `b52003ee1809ad506db74e8ee97f0905f7aae91a`.
- El log de ese build muestra el comando `node scripts/migrate-runtime.mjs; next build --webpack`; **no ejecutó `preflight-object-storage.ts`**. Su estado READY no es una prueba de autenticación B2.
- El archivo `khora-web/lib/server/object-storage.ts` en ese commit usa AWS SDK `S3Client` y las variables `KHORA_B2_KEY_ID` / `KHORA_B2_APPLICATION_KEY`. El ensayo de roundtrip de ese mismo commit falló con `storage_provider_request_failed`.
- El commit posterior `7be5712a` migró al transporte nativo B2, pero su preflight productivo falló en `b2_authorize_account` con `storage_b2_authorization_failed`.
- Backblaze documenta el uso de claves estándar para integraciones S3-compatible y distingue la Master Application Key para acceso completo a la cuenta; la API nativa v4 acepta Master o claves normales. No se debe mezclar una Master Key con el cliente S3-compatible esperando que funcione. Referencias: [guía oficial de claves](https://help.backblaze.com/hc/en-us/articles/360052129034-Creating-and-Managing-Application-Keys) y [b2_authorize_account v4](https://www.backblaze.com/apidocs/b2-authorize-account).

**Conclusión:** el alias productivo está aún sobre el transporte S3-compatible y no prueba su roundtrip. El transporte nativo es el camino técnico preparado, pero no puede pasar a producción hasta resolver el par de autenticación B2 y demostrar PUT/GET con SHA/bytes.


### Preview de validación del código · 2026-11-09

- Se creó el deployment preview `dpl_9gWxfH72UD2b2S115QpEUwa2M9Bt`, URL `https://khora-ghmy4m41f-victorhugotorresmendez-8991s-projects.vercel.app`, desde la rama `fix/custodia-b2-auth-diagnostics-20261109`, commit `3b684a870a21ccf2f200ee684687beea42e3b235`.
- Último estado observado: BUILDING, en `next build --webpack`. No se declara aún aprobado.
- Las credenciales B2 consultadas se encuentran asociadas únicamente a Production; el preview no dispone de ellas. El preflight de B2 está condicionado a Production, por lo que este preview solo puede validar compilación, nunca autenticación B2 ni archivado físico.
- Es un preview aislado: no tiene alias productivo y no modifica el servicio activo.
