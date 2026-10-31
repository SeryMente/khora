# Puente local Jules por RDC · OAuth 2.1 / PKCE

## Propósito

Permitir que ChatGPT Free opere las siete herramientas Jules a través de la sesión RDC de Windows, utilizando la identidad y autorización OAuth ya gestionadas por Khora. No requiere generar, copiar, pegar ni mantener un Bearer manual.

El usuario propietario se autentica en Khora con la cuenta autorizada por \`MCP_ALLOWED_EMAIL\`. El servidor otorga únicamente \`jules:read\` y \`jules:write\` para este cliente; la cuenta Jules vinculada por \`JULES_API_KEY\` determina las fuentes y ramas que realmente están disponibles. Los sujetos distintos del propietario conservan ACL exacta y fail-closed.

## Arquitectura

    ChatGPT
      └─ Remote Desktop Commander (RDC)
           └─ Cliente MCP local · stdio
                └─ OAuth 2.1 Authorization Code + PKCE
                     └─ Khora Production · /api/oauth
                          └─ MCP /api/mcp
                               └─ JULES_API_KEY (solo servidor)
                                    └─ Jules API de Google

El puente no levanta un segundo servidor MCP ni abre un puerto de red permanente. Durante la autorización abre un callback HTTP efímero ligado exclusivamente a \`127.0.0.1\`, con estado aleatorio y PKCE S256. El callback no admite tráfico desde LAN.

## Autenticación y consentimiento

1. En el primer arranque, el cliente registra un cliente OAuth público efímero en Khora y prepara un callback loopback de puerto aleatorio.
2. Abre automáticamente la página de autorización de Khora en el navegador del usuario de Windows.
3. Khora exige una sesión autenticada cuyo correo coincida con \`MCP_ALLOWED_EMAIL\`; la pantalla muestra los permisos \`jules:read\` y \`jules:write\`.
4. El propietario confirma expresamente el consentimiento en esa pantalla. Si no está autenticado, Khora ejecuta su inicio de sesión habitual.
5. El callback local valida estado e issuer, y el cliente intercambia el código mediante PKCE. Nunca se muestra ni se solicita copiar el access token o refresh token.
6. El refresh token rotatorio se cifra con DPAPI CurrentUser y ACL restringida a la cuenta Windows activa y SYSTEM. El access token permanece en memoria y caduca en una hora.

La autorización explícita del propietario no se omite ni se simula. No se extraen cookies ni credenciales del navegador y no se reutiliza una sesión web por fuera de OAuth.

## Persistencia local

- Workspace provisional: \`Desktop\\Khora\\khora-main\`.
- Cliente: \`khora-web\\tools\\jules-rdc-bridge\\bridge.mjs\`.
- Lanzador RDC: \`khora-web\\tools\\jules-rdc-bridge\\jules.ps1\`.
- Custodia DPAPI: \`.khora-local\\jules-rdc-bridge\\oauth-refresh.dpapi\` (excluida de Git).
- La credencial cifrada contiene el client_id público y el refresh token; no contiene la API key de Jules.
- Cada rotación del refresh token se guarda y relee antes de utilizar el access token nuevo. Si la escritura o el cotejo DPAPI fallan, el puente falla cerrado.
- Al cambiar de usuario Windows o equipo, DPAPI CurrentUser impide descifrar el refresh token; se requiere una nueva autorización OAuth.
- Esta ubicación sigue siendo provisional. No afirma que OEP/Entorno Persistente esté implementado ni que el disco esté cifrado integralmente.

## Uso operativo por RDC

ChatGPT inicia el proceso de larga duración mediante RDC. El puente valida \`tools/list\` y solo emite \`ready\` cuando descubre las siete herramientas esperadas. Después recibe una línea JSON por solicitud en stdin y devuelve una línea JSON por resultado en stdout. Los secretos y prompts no se guardan en logs ni en archivos de texto.

Operaciones:

| Acción RDC | Herramienta MCP |
|---|---|
| \`sources\` | \`jules_list_sources\` |
| \`sessions\` | \`jules_list_sessions\` |
| \`get\` | \`jules_get_session\` |
| \`activities\` | \`jules_list_activities\` |
| \`create\` | \`jules_create_session\` |
| \`message\` | \`jules_send_message\` |
| \`approve\` | \`jules_approve_plan\` |

La aprobación del plan exige \`plan_id\` y \`plan_sha256\`. La limitación de Jules respecto de una aprobación condicional atómica permanece como residual T22; el doble preflight no se presenta como una garantía transaccional.

## Seguridad y límites

- Los scopes solicitados son exactamente \`jules:read\`, \`jules:write\` y \`offline_access\`; este último permite renovar la sesión sin volver a autenticar en cada arranque.
- El servidor verifica el correo del propietario contra \`MCP_ALLOWED_EMAIL\`; el puente no decide ni inventa la identidad.
- La cuenta Jules conectada en Khora determina las fuentes y ramas. Antes de crear una sesión, Khora valida fuente, rama y contexto.
- No se crean grants manuales por repositorio para el propietario.
- Otros sujetos siguen sujetos a ACL exacta y fail-closed.
- Jules conserva su propia API key en Khora Production. No se copia a Windows ni a ChatGPT.
- Access token y refresh token no se pasan en argumentos, variables de entorno, salida visible ni logs.
- Las llamadas de escritura no idempotentes no se reintentan automáticamente ante un resultado ambiguo.
- \`Disconnect\` elimina solo la copia local DPAPI; no equivale a revocar el consentimiento OAuth remoto. La revocación global de OAuth sigue disponible desde los controles de seguridad de Khora.
- Este cliente local operado mediante RDC es una ruta distinta de una conexión MCP nativa de ChatGPT. No modifica las limitaciones del plan ChatGPT ni las evita.
- No declara que OEP/Entorno Persistente ya esté activo.
