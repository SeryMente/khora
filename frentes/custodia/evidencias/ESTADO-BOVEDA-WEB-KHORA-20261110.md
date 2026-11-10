# CUSTODIA · Estado de la bóveda web KHORA y su acceso delegado · 2026-11-10

## 1. Evidencia de interfaz

La salida de interfaz proporcionada por el operador se conserva, con los dos prefijos parciales de Bearer Token redactados, en `originales/SALIDA-INTERFAZ-SEGURIDAD-BOVEDA-20261110.md`.

Estado informado por la UI:
- Control MCP: generación de seguridad #1; último refresh OAuth 20/10/2026 9:36:21 a.m.
- Dos Bearer Tokens manuales activos. Scopes efectivos visibles: `runtime:read`, `volcados:read`, `norm:turn`; último uso Nunca. No son credenciales del agente local ni una sesión de Entorno Persistente.
- Bóveda web KHORA: CERRADA; TTL de sesión 30 minutos.
- Capacidad local: 1 emitida, 0 activas, 1 expirada, 0 revocadas; la única emisión visible venció el 03/10/2026.
- Entorno Persistente: catálogo no cargado; dos repositorios seleccionados. No se emitió una sesión ni se ejecutó el bootstrap.

## 2. Qué hace realmente Restablecer PIN olvidado

Código de producción consultado en `main`:
- `khora-web/app/components/os/PaginaBoveda.tsx`, blob `10f435f666076bca494f81bda2cf89e66e59ff12`.
- `khora-web/app/api/boveda/route.ts`, blob `afb2f6e7e400792a4d8233e9fd0cdc5b0c3ce1ab`.
- `khora-web/lib/server/boveda.ts`, blob `e7d904d1376e717bb4fdcf65907c68ccad3c8184`.

La UI envía `POST /api/boveda` con `{pin, reset:true}`. El endpoint comprueba la sesión y el correo propietario, y llama a `definirPin(pin)`. Esa función calcula un hash Scrypt nuevo con una sal aleatoria y actualiza únicamente la fila `boveda_pin`. Después se emite una cookie temporal de desbloqueo, con TTL 30 minutos.

El restablecimiento **no escribe ni rota `X_KHORA_KEY`**, no re-cifra `github_credentials`, no cambia los ciphertext de grabaciones/Volcados y no crea una llave maestra EP. La consecuencia directa es reemplazar el PIN anterior e iniciar una sesión web temporal. No se ejecutó desde CUSTODIA.

## 3. Por qué el PIN no recupera la clave de cifrado

El sellado del desbloqueo usa `AUTH_SECRET || X_KHORA_KEY`; el PIN es una puerta de acceso a la interfaz. Las credenciales GitHub en la tabla `github_credentials` se cifran/descifran con las funciones `cifrarTexto/descifrarTexto` dependientes de `X_KHORA_KEY` (`khora-web/lib/server/github-credentials.ts`, blob `1ada8df88b193e500434ad5a9002e7a28825cb70`).

Si `X_KHORA_KEY` está ausente o no coincide con la usada al cifrar, el usuario puede obtener la cookie de desbloqueo, pero el ciphertext preexistente puede continuar ilegible. La rotación de la llave sin re-cifrado impediría recuperarlo.

## 4. Estado consultable sin revelar valores

La vista `Secretos de GitHub` separa los usos:
- `norm`: token específico para lectura de `SeryMente/metodologia`.
- `ep`: token específico para repositorios de trabajo, incluido KHORA.

El GET `/api/security/github-credentials` devuelve únicamente `purpose`, `configured` y `updatedAt`; el panel no vuelve a mostrar ningún token. Esta lectura requiere una sesión web propietaria y cookie de desbloqueo. Es por tanto el siguiente read-only útil tras un restablecimiento de PIN efectuado por el operador.

El endpoint `POST /api/ep/github-credential` necesita una sesión EP con scopes `ep:bootstrap` y `ep:github:read`, verifica que el sujeto sea el propietario y recupera solo la credencial `ep`. Si el decrypt falla, responde `GITHUB_VAULT_UNAVAILABLE`; no revela el valor. Los dos Bearer Tokens manuales visibles en Control MCP no muestran esos scopes y no se deben reutilizar como si fueran tokens EP.

## 5. Capacidad del agente local y precauciones

El panel de capacidad local emite una credencial efímera de una hora, scope fijo `canonical-vault`, y su emisión revoca cualquier capacidad local activa anterior. No es un Bearer Token MCP. El historial visible registra la única emisión como expirada el 03/10/2026. No se emitió una nueva capacidad.

No revocar tokens MCP existentes; no emitir tokens alternos; no copiar secretos al chat; no restablecer ni rotar `X_KHORA_KEY`; no modificar registros ni ciphertext.

## 6. Próxima acción

El operador puede usar la acción **Restablecer PIN olvidado** de la bóveda web KHORA, eligiendo el PIN nuevo directamente en la interfaz y sin comunicarlo a ChatGPT. Esto reemplaza el PIN, no la llave. Después, copiar solo el estado del panel Secretos de GitHub para los usos `norm` y `ep` (configurado/ausente y fecha). No revelar ni copiar ningún valor.

Con esos metadatos se determina si hay una credencial `ep` que merezca una lectura autenticada de prueba. Si el estado es configurado pero el endpoint no puede descifrarla, preservar el ciphertext y tratar la llave criptográfica como bloqueo aparte. El objetivo primario sigue siendo el archivo de registros en CUSTODIA-01.
