# 📝 KHORA-MCP-TASK-003 · Jules — puente local OAuth y RDC

**Naturaleza:** OCP provisional de tarea del frente Khora MCP; no es un frente independiente ni una unidad taxonómica canonizada.  
**Estado:** `en_curso`  
**Responsabilidad:** heredada del control único `docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json`, generación 10; titular global `chatgpt-khora-mcp-01a1c17f-ca60-73bb-8045-48eeff29141d`; arquitectura interna, scopes, ACL y aceptación Jules permanecen bajo su corresponsable modular; esta tarea no tiene control, titularidad, sesión ni folio propios.  
**task_id:** `KHORA-MCP-TASK-003`  
**scope_ref:** `docs/frentes/observabilidad-mcp/`

## Enunciado

Habilitar el uso de las herramientas Jules del servidor MCP de Khora desde ChatGPT mediante un cliente MCP local por `stdio`, operado a través de la sesión RDC autorizada, autenticado contra Khora Production con OAuth 2.1 Authorization Code + PKCE. El flujo no exige crear, copiar o pegar Bearers, no extrae cookies ni credenciales de navegador y no convierte el puente local en una conexión MCP nativa de ChatGPT Free.

## Referencia de origen

- OCP padre, §22.1–22.7, con los enunciados literales del operador, decisión, arquitectura y criterios de seguridad.
- [PR #347 — feat(mcp): enable Jules via provisional RDC local bridge](https://github.com/SeryMente/khora/pull/347), fusionado en commit `4530e03a33c5e1743ab9646eb6c862b3c458c605`.
- Exportación de conversación [ChatGPT-Khora MCP-20261031-1846.md](../../historial/ChatGPT-Khora%20MCP-20261031-1846.md).

## Alcance

1. Cliente local `bridge.mjs` y lanzador `jules.ps1`, con transporte estándar `stdio`; sin servidor local adicional ni listener permanente.
2. OAuth 2.1 Authorization Code + PKCE y registro dinámico del cliente, con callback exacto `http://127.0.0.1:<puerto>/oauth/callback` y validación de allowlist.
3. Custodia del refresh token mediante DPAPI CurrentUser y ACL del perfil Windows vigente; access token solo en memoria; `JULES_API_KEY` solo en Vercel Production.
4. Verificar `tools/list` y las siete herramientas: `jules_list_sources`, `jules_list_sessions`, `jules_get_session`, `jules_list_activities`, `jules_create_session`, `jules_send_message` y `jules_approve_plan`.
5. Confirmar `jules:read` y `jules:write` según herramienta y sujeto. Para el smoke test inicial, ejecutar solo lecturas autenticadas de fuentes/sesiones.
6. Mantener documentado el riesgo T22: el proveedor Jules no ofrece aprobación condicional atómica por `plan_id`/ETag/If-Match; doble preflight no elimina toda la ventana de carrera.

## Estado observado al registrar la tarea

- PR #347: **fusionado** en `main`; el código fue validado en PC-14 con 572/572 pruebas, typecheck, contratos y build local de 78/78 páginas. Son resultados históricos de ese equipo, no pruebas repetidas en el nuevo perfil.
- Preview anterior: **no aceptable**; devolvió 503 por ausencia de configuración de OAuth/MCP en Preview. No copiar secretos productivos ni declarar éxito por un deployment READY.
- Production: los metadatos OAuth y de recurso protegido se observaron con HTTP 200 en la revisión anterior. No se ha realizado aún consentimiento OAuth real ni una llamada autenticada a las siete herramientas.
- El perfil Windows actual no tiene el DPAPI de PC-14. Requiere nuevo consentimiento y aprovisionamiento local.

## Dependencias y límites

- TASK-001 restaura el workspace; TASK-002 confirma la base general MCP que utiliza Jules.
- La pantalla oficial de consentimiento de Khora requiere confirmación expresa del propietario para `jules:read` y `jules:write`. No se sustituye por extracción de sesión ni por Bearer manual.
- No descargar secretos Vercel/Jules, ni mover credenciales DPAPI entre perfiles.
- No crear sesiones Jules ni aprobar planes durante un smoke test de solo lectura. Cualquier operación real de escritura exige una petición específica del operador.
- La conexión RDC actual expone terminal/archivos/procesos, no interacción gráfica con el navegador. El consentimiento se detiene en esa compuerta humana si la herramienta no puede realizarse de forma legítima y visible.

## Siguiente actuación

Con TASK-001 y la base de TASK-002 verificadas, ejecutar el puente desde el workspace actual; abrir el flujo OAuth oficial; obtener consentimiento explícito del propietario; guardar y releer la credencial DPAPI en el perfil Windows nuevo; verificar `tools/list` con las siete herramientas y leer fuentes/sesiones reales. Resolver de forma aislada la configuración Preview sin reutilizar secretos de Production.

## Criterio de cierre

Consentimiento OAuth real verificado; refresh token cifrado y releído bajo el SID actual; cliente local operativo por `stdio`; las siete herramientas aparecen con los scopes adecuados; `jules_list_sources` y `jules_list_sessions` devuelven datos autenticados reales; errores de autorización se mantienen fail-closed; límites de T22 y de ChatGPT Free constan sin simular aceptación de escritura. La creación de sesiones o aprobación de planes queda fuera del smoke test y requiere instrucción expresa adicional.
