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
