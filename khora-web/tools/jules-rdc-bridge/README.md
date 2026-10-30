# Puente local Jules por RDC · provisional

## Propósito

Permitir que ChatGPT Free opere las siete herramientas Jules a través de la sesión RDC autorizada, sin depender de la conexión MCP personalizada de escritura de ChatGPT web.

No instala un servidor MCP local ni abre puertos. Es un cliente MCP local de Khora Production que ChatGPT controla mediante comandos JSON enviados por stdin a través de Remote Desktop Commander.

## Arquitectura

    ChatGPT
      └─ Remote Desktop Commander (RDC)
           └─ Windows PowerShell / bridge.mjs
                └─ HTTPS https://khora-web.vercel.app/api/mcp
                     └─ Khora MCP Production
                          └─ JULES_API_KEY (permanece en Vercel)
                               └─ Jules API de Google

La API key de Jules no se copia a Windows. El único secreto local es un Bearer manual de Khora con scopes mínimos jules:read y jules:write.

## Instalación provisional

Workspace actual de esta sesión Windows:

- Repositorio: Desktop\Khora\khora-main.
- Runtime: khora-web\tools\jules-rdc-bridge\.
- Credencial local excluida de Git: .khora-local\jules-rdc-bridge\bearer.dpapi.

Esta ubicación es provisional y no afirma que OEP/Entorno Persistente esté implementado. Cuando OEP esté operativo, el proyecto completo puede trasladarse al workspace cifrado como Desktop\EP\KHORA; la ruta relativa del código y del archivo local no cambia. El Bearer DPAPI está ligado al perfil Windows actual: si se cambia de usuario o máquina, se debe volver a provisionar desde Khora.

## Única provisión de credencial

1. Abrir https://khora-web.vercel.app/sistema/mcp con la cuenta propietaria.
2. En Bearer Token manual, usar la etiqueta Jules-RDC y expiración de 90 días.
3. Dejar seleccionados solo jules:read y jules:write; desmarcar runtime:read, volcados:read y norm:turn.
4. Generar el Bearer y copiar el token, no el texto Bearer seguido de un espacio.
5. En una ventana local de Windows PowerShell, ejecutar (ajustar solo la ruta si el workspace se ha movido):

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\Khora\khora-main\khora-web\tools\jules-rdc-bridge\jules.ps1" -Action Setup

6. Pegar el token en el prompt de entrada oculta. La consola no lo muestra. El script lo protege con DPAPI CurrentUser, ACL limitada al usuario actual y SYSTEM, y verifica la lectura de vuelta. No pegarlo en ChatGPT, en una orden ni en un archivo de texto.

El secreto se guarda solo en .khora-local\jules-rdc-bridge\bearer.dpapi; no se imprime ni se registra.

## Arrancar la conexión para ChatGPT/RDC

Ejecutar en la sesión Windows actual:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\Khora\khora-main\khora-web\tools\jules-rdc-bridge\jules.ps1" -Action Start

El proceso queda escuchando JSON por stdin. RDC envía una línea por acción y recibe una línea JSON por respuesta. Ejemplos:

Listar fuentes y ramas:

    {"id":"1","action":"sources","page_size":50}

Listar sesiones:

    {"id":"2","action":"sessions","page_size":30}

Consultar una sesión y sus actividades:

    {"id":"3","action":"get","session_id":"sessions/ID"}
    {"id":"4","action":"activities","session_id":"sessions/ID","page_size":50}

Crear una tarea (fuente y rama deben proceder del catálogo real de Jules):

    {"id":"5","action":"create","source":"sources/github/owner/repo","starting_branch":"main","title":"Título breve","prompt":"Objetivo, alcance, restricciones y aceptación..."}

Enviar seguimiento:

    {"id":"6","action":"message","session_id":"sessions/ID","prompt":"Instrucción de seguimiento..."}

Aprobar un plan ya inspeccionado, con el plan_id y plan_sha256 devueltos en actividades:

    {"id":"7","action":"approve","session_id":"sessions/ID","plan_id":"PLAN_ID","plan_sha256":"SHA256_DE_64_HEX"}

Cerrar el proceso:

    {"id":"8","action":"shutdown"}

jules_create_session crea una sesión con AUTO_CREATE_PR. Para el propietario configurado, el plan se autoaprueba; otros sujetos conservan aprobación manual y ACL exacta. Las operaciones de escritura no se reintentan automáticamente ante resultado ambiguo.

## Controles y límites

- tools/list debe devolver las siete herramientas Jules antes de publicar el evento ready.
- Las llamadas viajan por HTTPS al MCP de Khora Production; el endpoint local no escucha en ninguna interfaz de red.
- La identidad propietaria se valida en Khora mediante MCP_ALLOWED_EMAIL; el acceso se limita a fuentes y ramas expuestas por la cuenta Jules vinculada al servidor.
- No se crean grants ACL por repositorio para el propietario. Los sujetos adicionales mantienen ACL exacta y fail-closed.
- El Bearer puede revocarse por token desde Control MCP. -Action Remove elimina solo la copia local; no revoca el token remoto.
- El Bearer caduca a los 90 días. Si vence, emitir uno nuevo y repetir Setup.
- En este host C: no está cifrado con BitLocker y OEP no está materializado. DPAPI protege el Bearer en reposo, pero los archivos del repositorio no quedan bajo el cifrado integral de EP. No afirmar que el workspace es un Entorno Persistente operativo.
- No se registran los prompts, respuestas ni la credencial en ficheros locales del puente.
