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

## 14. Coordinación provisional de tareas MCP — 2026-10-30

Esta delimitación es organizativa y provisional. No modifica la taxonomía de frentes de Metodología, la identidad canónica `OBSERVABILIDAD-MCP`, el OCP ni el control existentes. El producto conserva un solo frente MCP y este documento sigue siendo su único OCP.

### 14.1 Tarea provisional: General

**Titular de esta actividad:** la intervención registrada en el control de este frente, generación 2, alias operativo `chatgpt-khora-mcp-SES-20261030-01A18DCB`. El alias no es un ID nativo de conversación; `owner_thread` permanece null. La titularidad corresponde solo a la intervención y deberá cerrarse o transferirse mediante el control existente al terminar; no se presume indefinida.

**Responsabilidad provisional General:**
- Arquitectura general del servidor y componentes compartidos.
- Infraestructura compartida, transporte y despacho de herramientas.
- Autenticación y autorización compartidas.
- Contratos generales MCP, observabilidad y diagnóstico transversal.
- Seguridad e infraestructura de ejecución.
- Despliegue y mantenimiento general, sujetos a autorización independiente para cada operación.
- Integración de capacidades no específicas de Jules.
- En esta intervención: herramientas de consulta de Custodia autorizadas en la solicitud de adjudicación, sin mutar el frente Custodia ni datos productivos.

### 14.2 Tarea provisional: Jules

**Responsabilidad reservada a otro hilo de trabajo, no asumida por General:**
- Integración con la API de Google Jules.
- Creación y seguimiento de sesiones.
- Recuperación de planes, actividades y mensajes.
- Aprobación explícita de planes.
- Recuperación y respuesta a solicitudes de retroalimentación.
- Herramientas MCP especializadas de Jules.
- ACL y permisos específicos de Jules.
- Validación de repositorios y ramas.
- Gestión de errores y continuidad de sesiones.
- Pruebas y aceptación de la integración Jules.
- Habilitación del ciclo bidireccional ChatGPT–Jules.

General no implementará ni alterará componentes específicos de Jules sin coordinación expresa con el hilo responsable.

### 14.3 Componentes compartidos y protocolo de colisión

Los siguientes archivos son superficies compartidas que pueden ser necesarias para registrar cualquier herramienta MCP, aplicar scopes o publicar OAuth. No pertenecen en exclusiva a Jules ni a General:

- `khora-web/app/api/mcp/route.ts`: servidor, autenticación, despacho, registro y compuerta normativa.
- `khora-web/lib/server/mcp-tool-contract.ts`: catálogo y contratos de herramientas.
- `khora-web/lib/server/mcp-manual-token.ts`: scopes admitidos por tokens manuales.
- `khora-web/lib/server/mcp-config.ts` y `khora-web/app/.well-known/oauth-authorization-server/route.ts`: metadatos OAuth/protected-resource.
- `khora-web/app/api/oauth/token/route.ts` y `khora-web/app/oauth/authorize/page.tsx`: intercambio y consentimiento de scopes.
- `khora-web/app/sistema/mcp/page.tsx`: interfaz de emisión y selección de scopes.\n- `khora-web/lib/server/audio-mp3.ts`: helper compartido de lectura/descifrado/validación Blob; cualquier cambio afecta también la lectura de audio existente.\n- `khora-web/docs/normative-check.md`: catálogo y contrato documental único del servidor.\n- `khora-web/tests/unit/mcp_tool_auth_metadata.test.ts`, `mcp_contract_concordance.test.ts`, `mcp_diagnostics.test.ts`: pruebas de contrato/transporte compartidas; `mcp_custodia.test.ts` añade cobertura de la capacidad específica General.

El servicio `khora-web/lib/server/mcp-custodia.ts` es específico de las herramientas de metadatos/integridad de Custodia de esta actividad General; no es infraestructura Jules ni cambia los objetos del frente Custodia.

**Reglas de serialización:** identificar la superficie compartida antes de cada modificación; no escribir simultáneamente el mismo archivo desde ramas/tareas diferentes; coordinar previamente cambios de ruta, tipos, permisos, contratos, OAuth, pruebas o documentación que puedan alterar el comportamiento de la otra tarea. Una integración posterior deberá reconciliar commits y huellas de ambas líneas sin sobreescribir cambios ajenos. La mera existencia de ramas separadas no acredita que no haya colisiones.

**Límite de conocimiento de este asiento:** esta intervención no inspeccionó la rama, commits ni archivos de trabajo del hilo Jules. Por tanto, no afirma conocer su estado ni que la coordinación entre hilos ya haya ocurrido. Los componentes listados constituyen el inventario inicial de puntos compartidos para esa coordinación.

### 14.4 Estado de esta intervención y continuidad

- Control de responsabilidad existente: generación 2, estado `assigned`, alias General arriba indicado; blob leído `93d7ec6fd51dd57c20b8818cfe34ba9bd14e08c3`. No se creó otro control.
- OCP: esta actualización se realiza en la rama de trabajo, sobre el archivo canónico existente; el blob de origen verificado antes de la escritura fue `a3b1335c7b3b13d5ce3e1cbf4ea50f8c0866cd36`. La copia en `main` permanece sin modificar hasta una integración autorizada.
- Rama General: `work/obs-mcp-custodia-tools-20261030-01a18dcb`, creada desde `d6c9911615a3633f6ce38c1b8a2459f1e4823df5`. En la consulta de 2026-10-30, `main` había avanzado dos commits posteriores, identificados como cambios exclusivamente de Harmonia; no se incorporaron ni se hizo rebase.
- Implementación General en curso: servicio de consulta Custodia, tres herramientas MCP y scopes especializados; el catálogo usa cursor por fecha de creación estable y la lectura de Blob distingue HTTP 404 de fallos de acceso/transitorios. Pruebas unitarias añadidas para catálogo, revisiones, aislamiento, saneamiento y estados de integridad, todavía no ejecutadas. La implementación y el registro en esta rama no equivalen a merge, despliegue ni aceptación productiva.
- Pruebas de código: archivos de prueba incorporados, ejecución pendiente en entorno reconstruido para esta sesión. Se intentó crear sandbox efímero con clon de la rama, pero el proveedor devolvió `git clone failed`; no quedó sandbox disponible y no se ejecutó ningún comando de pruebas. No declarar cobertura validada hasta ejecutar comandos y registrar resultados.
- Protección: no se modificaron objetos, controles, tareas ni datos de Custodia; no se realizaron escrituras/recuperaciones productivas; no se copiaron credenciales productivas.
- No se fusionó la rama, no se abrió merge y no se desplegó.

Al cierre de General, actualizar este mismo OCP y leerlo de vuelta; después liberar o transferir la titularidad temporal en el control existente conforme al procedimiento aplicable. La tarea Jules conserva su continuidad en el mismo OCP y no requiere un objeto documental paralelo.

