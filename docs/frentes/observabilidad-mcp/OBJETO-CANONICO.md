# Observabilidad MCP — acceso a registros de Khora

## 1. Control e identidad
- Frente: **Observabilidad MCP**; identidad canónica `OBSERVABILIDAD-MCP`.
- Repositorio `SeryMente/khora`, main; OCP `docs/frentes/observabilidad-mcp/`.
- Versión v0.1.0; control independiente, generación 1, estado `unassigned`, sin titular ni folio.
- `MCP-OBS-DICTADO` es identidad histórica del objeto agregado anterior, no la identidad vigente de este frente.

## 2. LEER PRIMERO
Leer README, DUG, este OCP y `CONTROL-RESPONSABILIDAD.json`. El control está `unassigned`; nueva instancia aplica Metacanon §47 para adjudicar su sesión. No hereda la titularidad de Dictado.

**Propósito original dictado por el operador (verbatim):**

> Lo que vamos a hacer es asegurarnos que el MSP de Cora permita que cualquier modelo que tenga acceso al MSP pueda acceder a los registros de observabilidad para un esfuerzo específico. Por ejemplo, yo lo que quería hacer era resolver algunas cuestiones que tienen que ver con el proceso de dictado, pero no lo voy a hacer sino hasta que tengas acceso al MSP y que a su vez el MSP te permita tener los registros de eventos con el nivel de riqueza suficiente para que tengas ojos sobre la situación y puedas determinar la solución más adecuada. Entonces, esto supone algunas tareas generales en cuanto a la función de observabilidad del MSP y específicas en cuanto al propósito de desarrollo concreto, que en este caso es resolver el bug de dictado. No sé si lo tengas ya descrito o si lo tenga que volver a describir.

**Procedencia:** conversación «DICTADO», adjunto `turn0file0`, registro inicial 2026-10-28 16:11:37, 41.447 bytes, SHA-256 `04390ddfd6b347cd7cc8afb31bde7aed7016055cac6cb1eb6fad74c0917c43c2`. La forma «MSP» se conserva literalmente.

**Interpretación operativa separada:** el contexto técnico documentado en `SeryMente/khora` denomina MCP al servidor/protocolo y a sus herramientas de observabilidad; por eso «MSP» se interpreta aquí como MCP, sin alterar la cita. El propósito es que modelos/agentes MCP autorizados consulten registros de observabilidad suficientes para reconstruir el contexto causal. El primer caso de uso era diagnosticar un defecto de Dictado; corregir la pantalla/captura/transcripción pertenece al OCP Dictado.

## 3. Referencia metodológica
- DUG v363 · NX-363m; Metacanon 1.25; GOW 2.12.
- Fuente `SeryMente/metodologia/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`; blob `501f7f6ec8bfd0a8289eb0c1e3897c19a0281be7`; commit `b4bc9f8ef4485e44973e9c17f6c4f9a1119d698d`; leído 2026-10-30.
- MCP-NORMATIVO: DESACTIVADO. Es distinto del servidor MCP de producto Khora.

## 4. Propósito y alcance

**Propósito:** permitir que modelos/agentes compatibles y autorizados consulten registros de observabilidad de Khora para un esfuerzo específico, con acceso autenticado, solo lectura, filtros, paginación y riqueza suficiente para reconstruir secuencias causales.

**Incluye:** endpoint `/api/mcp`, catálogo y contratos; autenticación/OAuth/Bearer/scopes/gates; consulta de runtime/eventos, filtros, cursores, paginación y aislamiento por sesión; interoperabilidad de clientes; saneamiento de resultados; pruebas de contrato y ejecución real.

**Excluye:** pantalla y micrófono de Dictado; transcripción/edición; reparación de la UX de dictado; crear segundo almacén autoritativo; exponer audio/transcripción/tokens/secretos/payloads; modificar permisos, credenciales, seguridad o producción sin autorización propia. La instrumentación transversal sigue en `khora-web/docs/observability-services.md` como contrato compartido.

## 5. Roles y colaboración
Operador: dueño del propósito y autorizaciones. Titular actual: **no asignado**. Nueva instancia adjudica su sesión mediante el control. Dictado es consumidor inicial; no subordinado. Harmonia y otros frentes conservan su propia responsabilidad.

## 6. Autoridad
La creación y denominación del frente se ejecutan por instrucción C044; la titularidad no fue transferida y sigue unassigned. PR #342/#343 son candidatos relacionados, no integraciones aceptadas. Cambios de código, scopes, credenciales, seguridad o producción requieren autorización material y validación separadas.

## 7. Perfil de entorno
- Main de Khora observado en C044: `43ff0ad2bed21b375c658ac80e865d92aa7fd87b`.
- Servidor MCP: `khora-web/docs/normative-check.md`.
- Observabilidad transversal: `khora-web/docs/observability-services.md`.
- Rutas relacionadas: `khora-web/app/api/mcp/route.ts`, `khora-web/lib/server/mcp-observability.ts`, `khora-web/lib/server/service-observability.ts`.
- El historial referencia `eventos_sistema` y `khora_runtime_state`; revalidar esquema y código antes de afirmar estado técnico actual.
- No se usaron RDC, credenciales ni producción en C044.

## 8. Estado vivo
- PR #342: abierto, draft; handoff documental para acceso MCP desde ChatGPT Free vía RDC; 2 archivos/547 adiciones.
- PR #343: abierto, draft; filtros de severidad y aislamiento de sesión; 2 archivos/113 adiciones/6 eliminaciones. La descripción declara 2 pruebas focalizadas, no suite integral/CI/despliegue.
- PR #335: trabajo amplio de Ingreso U01–U06; fuera de titularidad exclusiva de este frente.
- C044 crea documentación y control sin titular. No hubo cambios de código ni pruebas; no aceptación integral.

## 9. Aceptación y viabilidad
Requiere: conexión autenticada real de cliente MCP; scopes mínimos/rechazos correctos; tools/list coherente con handlers; consultas filtradas y paginadas; aislamiento por sesión; correlación/c causación suficiente; privacidad comprobada sin audio/transcripción/secretos; pruebas de suite e integración y ejecución real documentada por SHA/entorno. Estado: **NO ACEPTADO INTEGRALMENTE**.

## 10. Formato de ciclo
Registrar identidad, control/folio/generación, DUG/Sam/Metacanon/GOW, última salida recuperable, delta, evidencias/entorno, pendientes, viabilidad, siguiente acción, continuidad y persistencia/read-back. Diferenciar reportado, ejecutado, probado, aceptado y desplegado.

## 11. Crónica y fuentes

### C001 — creación documental — 2026-10-30
Se separó del OCP Dictado el objetivo de acceso MCP a registros. El propósito original se preserva verbatim arriba; la interpretación se mantiene aparte. Se crea control gen. 1 unassigned. PR #342/#343 quedan asociados como candidatos abiertos/draft. Producto no modificado; pruebas no ejecutadas.

## 12. Reinstanciación
Nueva instancia: leer README, DUG, este OCP, control y manifiesto. El control está unassigned; adjudicar folio/sesión mediante Metacanon §47; no reutilizar el folio ni la titularidad de Dictado. Reconsultar los PR y diffs actuales. No modificar código, scopes, autenticación, credenciales o producción sin autorización.

## 13. Persistencia y revisión
Este OCP en main es el estado único de Observabilidad MCP; su control independiente permanece en `CONTROL-RESPONSABILIDAD.json`. El original de propósito y procedencia están en §2. No crear OCP/control paralelos ni afirmar ejecución MCP/aceptación sin evidencia.
