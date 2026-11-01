# 📝 KHORA-MCP-TASK-002 · General — acceso MCP, catálogo y observabilidad

**Naturaleza:** OCP provisional de tarea del frente Khora MCP; no es un frente independiente ni una unidad taxonómica canonizada.  
**Estado:** `en_curso`  
**Responsabilidad:** heredada del control `docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json`, generación 5; sin control, titularidad, sesión ni folio propios.  
**task_id:** `KHORA-MCP-TASK-002`  
**scope_ref:** `docs/frentes/observabilidad-mcp/`

## Enunciado

Asegurar la base general del servidor MCP de Khora para que clientes y modelos autorizados puedan descubrir y utilizar sus capacidades, con autenticación, scopes, contratos, filtros y controles de acceso verificables; ofrecer acceso de lectura suficientemente rico a la observabilidad para diagnosticar el runtime sin asumir autoridad sobre Dictado ni sobre otros frentes.

## Referencia de origen

- OCP padre, §4.1 «Observabilidad — tarea provisional General», §§5–9 y §20.
- Original conversacional del frente: [ChatGPT-Khora MCP-20261030-1856.txt](../../historial/ChatGPT-Khora%20MCP-20261030-1856.txt).
- Estado técnico vigente y pruebas de API/MCP en `main`; la descripción del alcance no equivale a aceptación de todas sus capacidades.

## Alcance

1. Endpoint `/api/mcp`, transporte, catálogo y contratos de herramientas, recursos y prompts realmente expuestos.
2. OAuth, identidad del sujeto, scopes, permisos y gates; respuesta fail-closed para sujetos o recursos no autorizados.
3. Consultas de runtime y eventos con filtros, cursores, paginación, aislamiento por sesión y saneamiento.
4. Interoperabilidad de clientes MCP y comprobación de `tools/list`/capacidades; distinguir metadatos públicos de invocaciones autenticadas.
5. Diagnóstico de Dictado como primer caso de consumo, sin modificar su UX, datos, audio ni control.
6. Documentación y comprobación de disponibilidad/despliegues sin inferir aceptación por el estado READY de Vercel.

## Estado observado al registrar la tarea

- El endpoint de Production tiene metadatos OAuth y de recurso protegido observados con HTTP 200 en la revisión anterior.
- La lectura de `/api/mcp` desde la herramienta web de Vercel quedó bloqueada por la protección SSO; esto no demuestra fallo del servidor ni acredita llamadas autenticadas.
- El Preview de la rama del puente devolvió HTTP 503 (`MCP authorization server not configured` y `MCP_CONFIG_MISSING`); se observó que el entorno Preview carecía de variables. No se copiarán secretos de Production para corregirlo.
- No se ha demostrado en esta retoma una llamada autenticada y autorizada a las herramientas generales desde un cliente real.

## Dependencias y límites

- La fuente de estado es `main` del repositorio Khora y el despliegue/entorno verificado de Vercel.
- Los permisos se prueban con identidad y scopes reales; no se inventan grants ni se elevan permisos por conveniencia.
- Los secretos de Production no se descargan al host local ni se duplican en Preview. Un Preview solo se habilita mediante configuración de prueba/no producción expresamente segura.
- MCP normativo permanece **DESACTIVADO** y no debe confundirse con el servidor MCP de producto Khora.
- La tarea no autoriza modificaciones al frente Dictado; solo habilita su diagnóstico desde el ámbito permitido.

## Siguiente actuación

Después de recuperar el workspace (TASK-001), revalidar desde un cliente autenticado el catálogo general y las herramientas de lectura, comprobar gates positivos/negativos y ejecutar una consulta real de observabilidad con alcance limitado. Revisar Preview sin exponer credenciales de Production.

## Criterio de cierre

El catálogo real y los contratos se leen de vuelta; scopes y gates positivos/negativos se prueban con identidad real; al menos una consulta de observabilidad autenticada devuelve datos reales, con filtros/paginación y aislamiento comprobados; el resultado no expone contenido excluido ni altera Dictado. Los metadatos HTTP 200 por sí solos no satisfacen el criterio.
