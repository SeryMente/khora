# KHORA-MCP-TASK-003 — Jules: integración ChatGPT Desktop/Codex y ciclo de desarrollo E2E

**Naturaleza:** tarea de implementación y aceptación del módulo funcional Jules dentro del único frente KHORA-MCP; no es FT, OCP ni control independiente.
**Estado:** en_curso
**Responsabilidad:** hereda OCP y control docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json, generación 9. Corresponsable arquitectónico del módulo: chatgpt-khora-mcp-module-jules-01a19912-7918-7602-af7a-e2828585e314; sin control, titularidad de FT ni folio propios.
**task_id:** KHORA-MCP-TASK-003
**scope_ref:** docs/frentes/observabilidad-mcp/
**module_ref:** [Módulo funcional Jules](../../modulos/jules/README.md)

## Enunciado

Entregar una integración operativa mediante la cual ChatGPT Desktop/Codex utilice las siete herramientas Jules expuestas por el único servidor MCP de Khora y pueda delegar, procesar y verificar trabajo de desarrollo de principio a fin. La integración primaria usa Streamable HTTP al endpoint canónico /api/mcp y OAuth/CIMD; el cliente local stdio/RDC se conserva solo como contingencia.

El método de trabajo debe cubrir: formular un encargo delimitado; identificar fuente y rama existentes; crear una sesión Jules; inspeccionar el plan generado y su huella; someter el plan a aprobación explícita del operador; enviar seguimiento solo con autorización; leer actividades; inspeccionar la PR/commit; ejecutar y evaluar pruebas; y entregar resultado con SHA y evidencia. No se crea ni aprueba trabajo real durante pruebas de lectura.

## Referencias

- OCP padre, §§4.3–4.6, 9, 22 y 29.
- [Módulo funcional Jules](../../modulos/jules/README.md).
- [ChatGPT/Codex MCP configuration](https://developers.openai.com/codex/mcp/).
- [ChatGPT MCP client documentation](https://developers.openai.com/chatgpt/guides/mcp/).

## Alcance de implementación

1. Conectar ChatGPT Desktop/Codex al host MCP único de Khora por Streamable HTTP, usando el recurso https://khora-web.vercel.app/api/mcp.
2. Autenticar como cliente público mediante CIMD oficial de ChatGPT, Authorization Code + PKCE S256, callback oficial y scopes mínimos; prohibido Bearer literal, copiar/pegar tokens o extraer cookies/sesiones.
3. Descubrir y validar las siete herramientas y sus scopes: cuatro lecturas jules:read; tres escrituras jules:write; ninguna herramienta Jules requiere norm:turn.
4. Corregir el handler de creación para que requirePlanApproval=true se aplique también al propietario. La herramienta jules_approve_plan exige plan_id y plan_sha256, relee el estado y conserva el residual T22.
5. Mantener scopes y catálogo de solo lectura hasta que la protección obligatoria de aprobación esté en el código publicado y verificado. Después, habilitar escritura con consentimiento OAuth específico y aprobación de herramienta por usuario en ChatGPT.
6. Validar ACL exacta y fail-closed para sujetos adicionales; el propietario opera únicamente sobre fuentes/ramas que expone la cuenta Jules configurada en Khora.
7. Formalizar el método de trabajo de desarrollo: encargo → sesión → plan → aprobación humana → seguimiento → PR/commit → tests → informe de resultado y límites.
8. Conservar el puente local stdio/RDC + DPAPI como alternativa documentada; no es la ruta principal ni requisito de cierre si la integración Desktop/Codex funciona.
9. Verificar el residual T22: Jules no ofrece aprobación condicional atómica por plan_id/ETag/If-Match; el doble preflight reduce, pero no elimina la ventana de carrera.

## Estado observado al corte 2026-11-06

- Checkout local bajo C:\Users\fila4\Desktop\Khora\khora-main; rama feat/khora-mcp-module-jules-20261101; merge local no forzado de origin/main: 190ed77cf0faadeae1ae7b9e5909177a0aad23d3. Aún no publicado.
- Validaciones locales del checkout reconciliado: 53/53 pruebas focalizadas OAuth/Jules; 572/572 unitarias; typecheck, ui:contract y ui-review:check PASS; npx next build --webpack PASS, Next.js 16.4.0, 78/78 páginas.
- Production consultado: metadata OAuth/Protected Resource HTTP 200; metadata CIMD oficial y callback ChatGPT cotejados; solicitud de autorización redirigida a inicio de sesión Khora sin error de cliente/redirect. No se completó login ni consentimiento.
- ChatGPT Desktop/Codex: configuración khora_jules HTTP/OAuth persistida y verificada en C:\Users\fila4\.codex\config.toml; actualmente expone solo cuatro herramientas read-only y jules:read offline_access. SHA-256 de la configuración después de read-back: 4E43B3E96B2344B78E4EF025AD60638255F4CC37C6760B3D5C7DCC9456CD8637. La aplicación debe recargar la configuración y el propietario debe completar su consentimiento visible.
- El deployment Production está en el commit anterior 953e69484eabb4e8dc8221d1d8fc188373531bfa; el main actual contiene soporte de callback loopback que Production todavía no acepta. La ruta principal seleccionada no depende de loopback.
- Hallazgo de seguridad funcional: el handler de main permite requirePlanApproval: !developerOwner; el módulo extraído de la rama exige requirePlanApproval: true para todos los sujetos. Las escrituras permanecen deshabilitadas en la configuración local hasta que la corrección esté desplegada y validada.
- No hay consentimiento OAuth, token de acceso, lectura autenticada real, sesión Jules real, mensaje enviado, plan aprobado, merge de PR ni despliegue nuevo en este corte.

## Dependencias y límites

- TASK-001 está completada; se conserva como antecedente de workspace y continuidad.
- TASK-002 no es dependencia global ni bloquea este resultado. Solo sus contratos compartidos mínimos (OAuth, transporte, catálogo y scopes) son dependencias técnicas de Jules.
- No copiar valores de variables sensibles de Production a Preview/Windows; no leer secretos; JULES_API_KEY permanece exclusivamente en Production.
- No crear sesiones, enviar mensajes ni aprobar planes durante smoke tests de lectura. Una ejecución real requiere un encargo concreto del operador y aprobación explícita del plan presentado.
- No fusionar ni desplegar Production por inferencia; la rama/PR debe quedar revisada y las compuertas de seguridad/aceptación cumplidas.

## Siguiente actuación

1. Actualizar y validar la documentación del módulo y la secuencia de TASK-003; completar git diff --check y JSON read-back.
2. Ejecutar OAuth desde ChatGPT Desktop/Codex después de que la aplicación recargue config.toml; completar consentimiento visible del propietario.
3. Verificar tools/list autenticado y lecturas reales de fuentes, sesiones y actividades.
4. Asegurar requirePlanApproval=true para todos los sujetos, verificar pruebas focalizadas y build; publicar la rama/PR para revisión. No habilitar escritura hasta que Production contenga la corrección.
5. Con la corrección desplegada y consentida, habilitar jules:write y ejecutar con el operador un primer encargo acotado, aprobación de plan y verificación de PR/resultado.

## Criterio de cierre

ChatGPT Desktop/Codex conectado al endpoint MCP de Khora mediante OAuth CIMD; siete herramientas descubiertas con scopes correctos; lecturas autenticadas reales verificadas; la creación de sesiones exige aprobación de plan para todos los sujetos; el operador puede revisar/aprobar el plan y ChatGPT puede supervisar actividades y verificar PR/commit/tests mediante un ciclo real autorizado; errores de autorización fail-closed; T22 documentado; SHA y evidencias leídos de vuelta. No requiere terminar las tareas ajenas a Jules de TASK-002.

## Registro de ejecución — 2026-11-01 · RDC 015RENTA01

**Entorno:** sesión RDC nueva `aacf2eb5-17f4-428e-9242-c24a1fe4a2ec`; Windows perfil `C:\Users\PC`; el estado volátil de la sesión anterior se considera perdido. Checkout dedicado `Desktop\Khora\khora-jules-main`, rama `feat/khora-mcp-module-jules-20261101`, HEAD previo `c5f56d070e0a5f4cb0956f5f2ee6094e18a05f73`.

**UI Quality E2E:** ejecutados `shell-v2.spec.ts`, `ui-quality.spec.ts` y `dictado-observability-checkpoints.spec.ts` con Playwright/Chromium; resultado **15/20 PASS, 5 FAIL**, exit code 1. Pasaron accesibilidad básica desktop/mobile, navegación, aliases, contrato ING-DIRECT, ARIA, submenús/viewports y prerender de 9 pantallas. Fallaron: (1) checkpoint `REARME_INSTANCIA_ANTERIOR` de dictado; (2) expectativa antigua de error shell en `/grafo` frente a `no_autenticado`; (3–4) fixture de grafo sin entidad sintética en desktop/mobile; (5) splash persistente por encima del umbral del test de tema desktop. No se clasifican como resueltos; requieren alinear harness/contratos y repetir. No son evidencia de fallo ni de éxito de los handlers Jules.

**Integridad:** checkout sin cambios de código de producto; `git diff --check` pasó en el corte previo a reconciliación; artefactos `test-results` ignorados por Git. Servidor local limitado a `127.0.0.1:3000` detenido al terminar. No se usaron datos productivos, credenciales, OAuth ni llamadas autenticadas a Jules.

**Estado:** evidencia de UI general parcial. No equivale a aceptación del puente Jules, no acredita `tools/list`, OAuth, DPAPI, lecturas reales ni CI. TASK-003 permanece `en_curso`.
