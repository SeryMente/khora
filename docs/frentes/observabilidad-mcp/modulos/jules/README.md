# Módulo Jules · KHORA-MCP

**Tipo:** módulo de frente de trabajo (subfrente funcional), conforme al GOW v2.17.  
**Estado:** implementación modular en curso; no aceptado end-to-end.  
**FT padre:** KHORA-MCP.  
**OCP heredado:** `docs/frentes/observabilidad-mcp/`.  
**Control heredado:** `docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json`, generación 8. No existe control de responsabilidad independiente para el módulo.  
**Titular del FT padre:** `chatgpt-khora-mcp-01a19962-c730-7308-975-5bb49e2d`.  
**Corresponsabilidad acotada al módulo:** `chatgpt-khora-mcp-module-jules-01a19912-7918-7602-af7a-e2828585e314` (alias operativo local; no es ID nativo).  
**Evento de incorporación:** `KHORA-MCP-ADD-CO-RESPONSIBLE-JULES-20261101-8585E314`.

## 1. Propósito

**Instrucción de origen del operador (verbatim):**

> Espera da mnarcha atras, y haz que en  vez de asumir frente de Khora MCP, asumas y crees modulo Jules, en Khora MCP, ya hay infraestrucutra para modulos.

**Interpretación operativa:** encapsular la integración Jules como módulo funcional del servidor MCP de Khora, manteniendo sus siete herramientas, contratos, scopes especializados, cliente upstream, ACL por recurso, puente local OAuth/RDC, telemetría/diagnóstico, pruebas y documentación. Jules continúa siendo una capacidad del endpoint MCP único, no un segundo servidor, FT, OCP ni control de responsabilidad.

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
| Puente local | `khora-web/tools/jules-rdc-bridge/` | Cliente MCP por stdio con OAuth PKCE y custodia local DPAPI CurrentUser. |
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

**Implementado en la rama:** extracción del bloque de handlers a `mcp-jules.ts`; el host registra el módulo mediante `registerJulesMcpModule`; el fixture de pruebas transpila y carga el módulo separado; el test de contrato comprueba el registro modular y la existencia de las siete herramientas y scopes.

**Pendiente de ejecutar/verificar:** suite unitaria, TypeScript, lint, build y CI de esta rama; pruebas OAuth/RDC en el perfil vigente; smoke test autenticado de solo lectura de fuentes/sesiones; revisión de logs y reconciliación de cualquier fallo. Los resultados históricos del PC-14 no se presentan como ejecución actual.

**No realizado:** merge, despliegue, cambios de Production, rotación/eliminación de secretos, migraciones o escrituras/deletes en Neon, creación de sesión Jules real o aprobación de plan.

## 7. Criterios de aceptación del módulo

1. El host MCP único registra los siete handlers desde `mcp-jules.ts`; no hay endpoint duplicado.
2. `tools/list`, `MCP_TOOL_SCOPES`, metadata OAuth, consentimiento, intercambio de tokens y tokens manuales concuerdan.
3. Las cuatro lecturas requieren `jules:read`; las tres escrituras requieren `jules:write`; no se añade `norm:turn` a Jules por implicación.
4. ACL y validación exacta de fuente/rama siguen fail-closed.
5. Los tests cubren autorización, límites de recursos, plan cambiante y errores saneados.
6. La suite y build se ejecutan en la rama actual y se conservan sus salidas verificables.
7. La prueba local OAuth/RDC se completa con consentimiento visible, refresh token bajo DPAPI CurrentUser del SID vigente y read-back.
8. Las lecturas autenticadas reales devuelven fuentes/sesiones y se verifica su procedencia.
9. El operador acepta la evidencia antes de cualquier merge/deploy o modificación de Production.

## 8. Próximo checkpoint

Completar pruebas locales del módulo extraído, resolver cualquier discrepancia de importación/fixture, actualizar la crónica del OCP padre y dejar una PR de revisión sin merge. La aceptación de escritura Jules se excluye del smoke test de lectura y requerirá instrucción expresa independiente.
