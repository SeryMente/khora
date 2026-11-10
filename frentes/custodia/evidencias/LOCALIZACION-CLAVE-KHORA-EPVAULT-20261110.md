# CUSTODIA · Evidencia de localización de la llave KHORA y las bóvedas EP · 2026-11-10

## 1. Identidad y pregunta

Se conserva la instrucción literal en `originales/INSTRUCCION-LOCALIZACION-CLAVE-KHORA-EPVAULT-20261110.md`. El operador pregunta por la variable `X_KHORA_KEY`, menciona LastPass y solicita localizar una bóveda previa y la arquitectura EP. No se solicitó ni se registró ninguna contraseña en la conversación.

## 2. Qué es X_KHORA_KEY

En `khora-web/lib/server/cripto.ts` de `main`, `X_KHORA_KEY` es la raíz criptográfica de la aplicación para cifrar/descifrar checkpoints, snapshots y textos de Volcado mediante AES-256-GCM; la función también define el envelope KHC1 para bytes/audio. No es la contraseña maestra de EP Vault ni la contraseña de LastPass.

El runbook `docs/deploy-01-runbook.md` documenta históricamente que el valor de `KHORA_API_KEY` se ingresa como alias `X_KHORA_KEY` en Vercel. La bóveda de KHORA `secrets/env-vault.enc.json` contiene una entrada cifrada llamada `KHORA_API_KEY`, pero no `X_KHORA_KEY`. No se ha descifrado la entrada ni se ha comprobado que su valor actual coincida con el alias de producción. No afirmar equivalencia vigente sin validación autenticada.

## 3. EP-ARCHITECTURE.md y canon

`EP-ARCHITECTURE.md` en `main` (blob `a906f57f7eab5bd948ec7272cad3d2e2d3ce9b18`) es solo una redirección de compatibilidad y dice que la especificación normativa es `ep-medio-architectura.md`. El propio archivo redirección menciona v1.0.1, pero la fuente canónica actual consultada es **Entorno Persistente Medio · Arquitectura canónica v1.0.4**, firma `NX-326m`, blob `382e4a929a984a96926fd6f9080f80bedd109a0b`.

La arquitectura distingue expresamente la llave maestra de EP, el token Khora de sesión, el PAT GitHub y `VERCEL_TOKEN`. La llave EP protege BitLocker/entorno y es independiente de `X_KHORA_KEY`.

## 4. Ubicaciones de bóvedas y respaldos localizados

### 4.1 Bóveda KHORA

- Archivo local presente: `C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA\secrets\env-vault.enc.json`, 3.607 bytes.
- Esquema histórico local: nueve entradas cifradas: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `VERCEL_TOKEN`, `GROQ_API_KEY`, `KHORA_API_KEY`, `MCP_OAUTH_CLIENT_SECRET`, `MCP_JWT_SECRET`, `MCP_OAUTH_REDIRECT_URIS`. No se imprimieron valores ni ciphertext.
- La bóveda tiene historial en GitHub (29-jul, 15-ago y 03-oct de 2026); las versiones consultadas mantienen esos nombres de entrada. No se encontró `X_KHORA_KEY` como entrada propia. Es ciphertext y no se descifró.

### 4.2 EP Vault reconstruida

- Bóveda activa en disco: `C:\Users\fila4\Desktop\SeryMente\EP-Vault\ep-env-vault.enc.json`, 2.048 bytes.
- Copias dentro de los respaldos EP del 10-nov:
  - `EP-Backup-Provisional-20261110-102853-R1.zip` (24.151.023 bytes; 442 entradas).
  - `EP-Backup-Provisional-20261110-164004-R2.zip` (119.076.640 bytes; 3.289 entradas).
- Los dos respaldos incluyen la bóveda EP anterior de 2.048 bytes (actualizada el 09-nov) y una copia de `EP/local-state/Khora/secrets/ep-env-vault.enc.json`: R1 2.156 bytes (actualizada 10-nov 16:01Z); R2 2.200 bytes (actualizada 10-nov 17:54Z).
- Las cinco copias EP inspeccionadas comparten schema `ep-env-vault/1`, KDF PBKDF2-HMAC-SHA256, 600.000 iteraciones y la misma huella de sal (prefijo SHA-256 de sal: `86DC60D97AA6`). El contenido permanece cifrado; no se imprimió ni extrajo.
- Los manifiestos R1/R2 declaran que `secretValuesRead=false` y el ZIP no agrega cifrado adicional al ciphertext ya cifrado.
- R2 excluye expresamente varios respaldos históricos `.pre-*.bak`, el journal/lock y estado DPAPI de sesión. Esos elementos no están dentro del ZIP. No se localizaron en las rutas actuales consultadas.

## 5. DPAPI y ventana EP

- La arquitectura/implementación documenta sesiones DPAPI `CurrentUser` para compartir temporalmente la clave de la bóveda EP entre procesos del mismo usuario Windows. El archivo esperado es `ep-env-vault.session.dpapi.json` en el directorio de la bóveda, con TTL limitado.
- El diagnóstico local de 10-nov 21:18Z registra `sessionFileExists=false`, `sessionActive=false` y `VAULT_SESSION_NOT_OPEN`.
- No se encontraron `vault-key.dpapi`, `vault-key.guardian.dpapi`, `vault-agent-master.dpapi.json`, sesión DPAPI compartida ni archivos `*.note.json` en las ubicaciones inspeccionadas.
- El proceso de la GUI EP Vault permanece abierto bajo `CENTRAL\fila4`, pero su UI informa estado `SELLADA`; no existe sesión abierta vigente en la comprobación actual.
- Una lectura histórica de 10-nov 15:57Z reportó sesión activa y 18 nombres de variables accesibles sin revelar valores; ese TTL expiró a las 16:12Z. Es evidencia histórica, no estado actual.

## 6. Resultado y límites

**Localizado:** ciphertext de ambas bóvedas, copias R1/R2 y código/contrato de desbloqueo EP. **No localizado:** llave maestra EP en DPAPI vigente, sesión DPAPI compartida vigente, notas DPAPI recuperables, respaldos `.bak` en las rutas revisadas, valor accesible de `X_KHORA_KEY` o `KHORA_API_KEY`.

No se intentó fuerza bruta, no se ingresaron contraseñas, no se modificaron ni sobrescribieron bóvedas, no se generó una llave nueva, no se alteraron variables Vercel/EP y no se imprimieron secretos. La existencia de ciphertext no equivale a recuperación del contenido.

## 7. Próximo paso permitido

La GUI EP Vault está disponible localmente y sellada. Si el operador recuerda la contraseña maestra EP, puede introducirla directamente en la ventana local (nunca en el chat). Tras un desbloqueo exitoso, leer primero metadatos/nombres de variables y validar el nombre de `KHORA_API_KEY` sin revelar su valor. Para usarlo, ejecutar un proceso hijo con allowlist exacta, desde la propia ventana/sesión, de modo que el secreto permanezca en memoria del proceso y no en argumentos, logs o salida.

Si la contraseña maestra no se recuerda, mantener el ciphertext y sus respaldos intactos. No existe una ruta DPAPI vigente identificada que permita descifrar automáticamente esta bóveda en la sesión actual. La recuperación de LastPass queda fuera de las herramientas/repositorios consultados y no debe darse por posible ni imposible sin evidencia adicional.
