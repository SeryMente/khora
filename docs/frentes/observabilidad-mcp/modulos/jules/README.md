# Módulo Jules · KHORA-MCP

**Tipo:** módulo de frente de trabajo (subfrente funcional), conforme al GOW v2.17.  
**Estado:** implementación modular en curso; no aceptado end-to-end.  
**FT padre:** KHORA-MCP.  
**OCP heredado:** `docs/frentes/observabilidad-mcp/`.  
**Control heredado:** `docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json`, generación 9. No existe control de responsabilidad independiente para el módulo.
**Titular del FT padre:** `chatgpt-khora-mcp-01a199dd-30ba-7843-92ae-278ff01d4229`.
**Corresponsabilidad acotada al módulo:** `chatgpt-khora-mcp-module-jules-01a19912-7918-7602-af7a-e2828585e314` (alias operativo local; no es ID nativo).  
**Evento de incorporación:** `KHORA-MCP-ADD-CO-RESPONSIBLE-JULES-20261101-8585E314`.

## 1. Propósito

**Instrucción de origen del operador (verbatim):**

> Espera da mnarcha atras, y haz que en  vez de asumir frente de Khora MCP, asumas y crees modulo Jules, en Khora MCP, ya hay infraestrucutra para modulos.

**Interpretación operativa:** encapsular la integración Jules como módulo funcional del servidor MCP de Khora, manteniendo sus siete herramientas, contratos, scopes especializados, cliente upstream, ACL por recurso, conexión ChatGPT Desktop/Codex por OAuth CIMD, y puente local OAuth/RDC como contingencia, telemetría/diagnóstico, pruebas y documentación. Jules continúa siendo una capacidad del endpoint MCP único, no un segundo servidor, FT, OCP ni control de responsabilidad.

## 2. Naturaleza y límites

El GOW v2.17 define «Módulo de frente de trabajo (subfrente funcional)» como una subdivisión interna de un FT que desarrolla una faceta delimitada con propósito, estado, tareas y entregables propios. Hereda la autoridad, el OCP y el control del FT padre; no es un FT independiente.

Por tanto, este módulo:
- hereda el OCP y el control único de KHORA-MCP;
- no crea `CONTROL-RESPONSABILIDAD.json`, folio SES ni generación independiente;
- conserva al titular del frente padre y limita la corresponsabilidad a `module:jules`;
- no crea una ruta de transporte ni endpoint paralelo;
- no retira ni degrada Jules del MCP de Khora;
- no autoriza por sí mismo escrituras en Production, cambios de secretos ni mutaciones de datos.

## 3. Arquitectura e infraestructura existente

El servidor MCP de Khora ya organiza capacidades en servicios separados bajo `khora-web/lib/server/mcp-*.ts`, con el contrato/catálogo de herramientas centralizado en `mcp-tool-contract.ts`. El módulo Jules sigue ese patrón del servidor; **no** se implementa como módulo de la extensión Chrome Aisthesis/Harmonia, porque esa infraestructura pertenece a otro runtime.

| Componente | Ubicación | Función |
|---|---|---|
| Registro de herramientas y scopes | `khora-web/lib/server/mcp-tool-contract.ts` | Mantiene el catálogo de las siete herramientas Jules y su seguridad por scope. |
| Implementación del módulo | `khora-web/lib/server/mcp-jules.ts` | Exporta `registerJulesMcpModule`; encapsula validación de recursos, ACL y registro de los siete handlers. |
| Host MCP único | `khora-web/app/api/mcp/route.ts` | Provee autenticación Bearer/OAuth, servidor, transporte y contexto; registra el módulo. |
| Cliente upstream | `khora-web/lib/jules/client.ts` | Acceso al API de Jules. |
| ACL | `khora-web/lib/server/jules-access.ts` | Valida sujeto, fuente, rama y capacidad en modo fail-closed. |
| Cliente ChatGPT Desktop/Codex | C:\Users\<usuario>\.codex\config.toml | Cliente Streamable HTTP del host MCP único, OAuth/CIMD y PKCE; configuración compartida con Codex CLI/IDE. |
| Puente local alternativo | `khora-web/tools/jules-rdc-bridge/` | Cliente MCP por stdio con OAuth PKCE y custodia local DPAPI CurrentUser. |
| Tarea de ejecución | [KHORA-MCP-TASK-003](../../📁%20🧭%20-%20Tareas%20provisionales/📁%20🧩%20-%20KHORA-MCP-TASK-003%20-%20Jules%20-%20puente%20local%20OAuth%20y%20RDC/README.md) | Conserva el plan de trabajo y la aceptación del puente local. |

## 4. Catálogo funcional

| Herramienta | Scope | Propósito |
|---|---|---|
| `jules_list_sources` | `jules:read` | Listar fuentes y ramas disponibles. |
| `jules_list_sessions` | `jules:read` | Listar sesiones con filtrado de recursos autorizados. |
| `jules_get_session` | `jules:read` | Consultar una sesión tras validar fuente y rama. |
| `jules_list_activities` | `jules:read` | Leer actividades paginadas y huella de plan. |
| `jules_create_session` | `jules:write` | Crear una sesión en fuente/rama verificadas. |
| `jules_send_message` | `jules:write` | Enviar seguimiento en estados admitidos. |
| `jules_approve_plan` | `jules:write` | Aprobar solo el plan actual cotejado mediante doble preflight. |

Las herramientas Jules usan sus scopes propios y no requieren `norm:turn`; se mantiene ese gate para las demás herramientas sustantivas del MCP que así lo exigen. El catálogo de `MCP_TOOL_SCOPES` sigue siendo la fuente ejecutable de scopes. La llamada `tools/list` publica herramientas según los scopes del Bearer.

## 5. Seguridad

- El propietario MCP configurado conserva acceso a las fuentes que la cuenta Jules conectada expone sin filas ACL por repositorio; ese bypass de ACL no elimina la aprobación explícita del plan.
- Cualquier otro sujeto requiere una concesión exacta `subject + source + branch + capability` en `khora_private.jules_source_acl`; la ausencia o indisponibilidad de ACL deniega la operación.
- `jules:read` y `jules:write` permanecen separados.
- Toda creación fuerza `requirePlanApproval=true`, también para el propietario; la ejecución del plan exige la llamada explícita `jules_approve_plan`.
- `JULES_API_KEY` solo reside en el entorno seguro del servidor. No se copia a repositorios, archivos locales, prompts o registros.
- El puente local usa Authorization Code + PKCE y DPAPI CurrentUser; no extrae cookies ni credenciales de navegador y no copia secretos Vercel a Windows.
- Las escrituras upstream no idempotentes no se reintentan ciegamente ante resultado ambiguo.
- La aprobación de planes conserva el residual T22: Jules no ofrece precondicionamiento atómico por plan/ETag; el doble preflight reduce, pero no elimina, la ventana de carrera.

## 6. Estado y evidencia

**Implementado en el checkout reconciliado:** módulo mcp-jules.ts registrado en el host común; siete herramientas/handlers y scopes separados; consentimiento CIMD/OAuth preparado para ChatGPT Desktop/Codex. La creación de sesión en el módulo exige requirePlanApproval=true para todos los sujetos.

**Verificado en el corte 2026-11-06:** 53/53 pruebas focalizadas OAuth/Jules; suite completa 572/572; typecheck, contrato UI y UI Review PASS; build Next.js 16.4.0 PASS con 78/78 páginas. La configuración local khora_jules HTTP/OAuth fue leída de vuelta. Production acepta la metadata/callback CIMD ChatGPT y redirige a login normal, pero no se completó consentimiento ni invocación autenticada.

**Bloqueo explícito de escritura:** Production consultado sigue desplegado en 953e69484eabb4e8dc8221d1d8fc188373531bfa, donde el propietario puede evitar la aprobación (requirePlanApproval: !developerOwner). El módulo extraído de la rama obliga a aprobación en todos los casos. El host ChatGPT local expone únicamente las cuatro herramientas read-only hasta que la corrección se publique y compruebe.

**No realizado:** OAuth consent real, token autenticado, tools/list live, lecturas reales de fuentes/sesiones, creación de sesión, envío de mensaje, aprobación de plan, merge de PR o despliegue nuevo.

## 7. Criterios de aceptación del módulo

1. El host MCP único registra los siete handlers desde mcp-jules.ts; no hay endpoint duplicado.
2. ChatGPT Desktop/Codex conecta por Streamable HTTP a /api/mcp mediante OAuth/CIMD y consentimiento del propietario.
3. tools/list, metadata OAuth, scopes y handlers concuerdan: cuatro lecturas jules:read, tres escrituras jules:write, sin norm:turn para Jules.
4. Toda creación aplica requirePlanApproval=true, también al propietario; jules_approve_plan exige plan_id y plan_sha256.
5. ACL por sujeto/fuente/rama/capacidad y validación de recursos siguen fail-closed; residual T22 documentado.
6. Suite, typecheck, contratos y build se ejecutan y conservan por SHA.
7. Fuentes, sesiones y actividades reales se leen con identidad autenticada; posteriormente, un encargo real autorizado se procesa con aprobación humana del plan, seguimiento y verificación de PR/commit/tests.
8. La configuración local no contiene Bearer literal ni secretos; la escritura requiere scopes y aprobación explícita por herramienta.
9. El puente local RDC/DPAPI queda como alternativa, no como dependencia de la integración Desktop.

## 8. Próximo checkpoint

Completar el consentimiento OAuth desde ChatGPT Desktop/Codex y verificar cuatro herramientas de lectura en vivo. Mantener las escrituras deshabilitadas hasta publicar y comprobar en Production la exigencia requirePlanApproval=true para todos los sujetos; después, ampliar scope y catálogo de escritura con aprobación del operador. No crear una sesión real durante el smoke test.
