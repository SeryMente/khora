# Observabilidad MCP — acceso a registros de Khora

## 1. Control e identidad
- Frente: **Observabilidad MCP**; identidad canónica `OBSERVABILIDAD-MCP`.
- Repositorio `SeryMente/khora`, main; OCP `docs/frentes/observabilidad-mcp/`.
- Versión v0.2.0; control independiente, generación 2, estado `assigned`; titular operativo temporal `chatgpt-khora-mcp-SES-20261030-01A18DCB`; folio `SES-20261030-01A18DCB`; blob del control `93d7ec6fd51dd57c20b8818cfe34ba9bd14e08c3`.
- `MCP-OBS-DICTADO` es identidad histórica del objeto agregado anterior, no la identidad vigente de este frente.

## 2. LEER PRIMERO
Leer README, DUG, este OCP y `CONTROL-RESPONSABILIDAD.json`. El control está adjudicado en generación 2 al titular operativo temporal indicado en §1. No heredar titularidad de Dictado; al cierre, liberar o transferir mediante el mismo control.

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
Operador: dueño del propósito y autorizaciones. Titular actual de esta intervención: **General**, bajo la adjudicación temporal descrita en §1. **Jules** es una tarea provisional paralela atendida por otro hilo, no subordinada ni asumida por General. Dictado es consumidor inicial; no subordinado. Harmonia y otros frentes conservan su propia responsabilidad.

## 6. Autoridad
La creación y denominación del frente se ejecutaron por instrucción C044. La titularidad de esta intervención se adjudicó después mediante el control existente, generación 2. El alcance de implementación de General fue autorizado expresamente el 2026-10-30; merge, apertura de merge y despliegue a producción permanecen excluidos y requieren autorización independiente. Jules conserva su responsabilidad en el otro hilo.

## 7. Perfil de entorno
- Main de Khora en la última verificación de este ciclo: `8f9b98b61d58aa5c1dd1afee0c128c7ed4592ff7`.
- Servidor MCP: `khora-web/docs/normative-check.md`.
- Observabilidad transversal: `khora-web/docs/observability-services.md`.
- Rutas relacionadas: `khora-web/app/api/mcp/route.ts`, `khora-web/lib/server/mcp-observability.ts`, `khora-web/lib/server/service-observability.ts`.
- El historial referencia `eventos_sistema` y `khora_runtime_state`; revalidar esquema y código antes de afirmar estado técnico actual.
- No se usaron RDC, credenciales ni producción en C044.

## 8. Estado histórico de C044 (no es el estado actual)
- PR #342: abierto, draft; handoff documental para acceso MCP desde ChatGPT Free vía RDC; 2 archivos/547 adiciones.
- PR #343: abierto, draft; filtros de severidad y aislamiento de sesión; 2 archivos/113 adiciones/6 eliminaciones. La descripción declara 2 pruebas focalizadas, no suite integral/CI/despliegue.
- PR #335: trabajo amplio de Ingreso U01–U06; fuera de titularidad exclusiva de este frente.
- En C044 se creó documentación y control sin titular. Ese asiento histórico no describe la adjudicación ni la implementación de General registradas en §14.

## 9. Aceptación y viabilidad
Requiere: conexión autenticada real de cliente MCP; scopes mínimos/rechazos correctos; tools/list coherente con handlers; consultas filtradas y paginadas; aislamiento por sesión; correlación/c causación suficiente; privacidad comprobada sin audio/transcripción/secretos; pruebas de suite e integración y ejecución real documentada por SHA/entorno. Estado: **NO ACEPTADO INTEGRALMENTE**.

## 10. Formato de ciclo
Registrar identidad, control/folio/generación, DUG/Sam/Metacanon/GOW, última salida recuperable, delta, evidencias/entorno, pendientes, viabilidad, siguiente acción, continuidad y persistencia/read-back. Diferenciar reportado, ejecutado, probado, aceptado y desplegado.

## 11. Crónica y fuentes

### C001 — creación documental — 2026-10-30
Se separó del OCP Dictado el objetivo de acceso MCP a registros. El propósito original se preserva verbatim arriba; la interpretación se mantiene aparte. Se crea control gen. 1 unassigned. PR #342/#343 quedan asociados como candidatos abiertos/draft. Producto no modificado; pruebas no ejecutadas.

## 12. Reinstanciación
Nueva instancia: leer README, DUG, este OCP y el control existente; verificar generación, huella y titularidad vigentes. No crear control ni OCP paralelo. Reconocer las tareas provisionales General y Jules; coordinar antes de modificar superficies compartidas. Reconsultar refs, PR y diffs actuales. No reutilizar titularidad de Dictado.

## 13. Persistencia y revisión
Este archivo es el único OCP de Observabilidad MCP. La actualización de esta intervención vive en la rama General hasta una integración autorizada; `main` conserva su propia versión y no se ha modificado. El control único permanece en `CONTROL-RESPONSABILIDAD.json`. No crear OCP/control paralelos ni afirmar ejecución MCP/aceptación sin evidencia.

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
- `khora-web/app/sistema/mcp/page.tsx`: interfaz de emisión y selección de scopes.\n- `khora-web/lib/server/audio-mp3.ts`: helper compartido de lectura/descifrado/validación Blob; cualquier cambio afecta también la lectura de audio existente.
- `khora-web/docs/normative-check.md`: catálogo y contrato documental único del servidor.
- `khora-web/tests/unit/mcp_tool_auth_metadata.test.ts`, `mcp_contract_concordance.test.ts`, `mcp_diagnostics.test.ts`: pruebas de contrato/transporte compartidas; `mcp_custodia.test.ts` añade cobertura de la capacidad específica General.

El servicio `khora-web/lib/server/mcp-custodia.ts` es específico de las herramientas de metadatos/integridad de Custodia de esta actividad General; no es infraestructura Jules ni cambia los objetos del frente Custodia.

**Reglas de serialización:** identificar la superficie compartida antes de cada modificación; no escribir simultáneamente el mismo archivo desde ramas/tareas diferentes; coordinar previamente cambios de ruta, tipos, permisos, contratos, OAuth, pruebas o documentación que puedan alterar el comportamiento de la otra tarea. Una integración posterior deberá reconciliar commits y huellas de ambas líneas sin sobreescribir cambios ajenos. La mera existencia de ramas separadas no acredita que no haya colisiones.

**Límite de conocimiento de este asiento:** esta intervención no inspeccionó la rama, commits ni archivos de trabajo del hilo Jules. Por tanto, no afirma conocer su estado ni que la coordinación entre hilos ya haya ocurrido. Los componentes listados constituyen el inventario inicial de puntos compartidos para esa coordinación.

### 14.4 Estado de esta intervención y continuidad

- Control de responsabilidad existente: generación 2, estado `assigned`, alias General arriba indicado; blob leído `93d7ec6fd51dd57c20b8818cfe34ba9bd14e08c3`. No se creó otro control.
- OCP: esta actualización se realiza en la rama de trabajo, sobre el archivo canónico existente; el blob de origen verificado antes de la escritura fue `a3b1335c7b3b13d5ce3e1cbf4ea50f8c0866cd36`. La copia en `main` permanece sin modificar hasta una integración autorizada.
- Rama General: `work/obs-mcp-custodia-tools-20261030-01a18dcb`, creada desde `d6c9911615a3633f6ce38c1b8a2459f1e4823df5`. En la consulta de 2026-10-30, `main` había avanzado seis commits desde la base autorizada (último SHA observado `8f9b98b61d58aa5c1dd1afee0c128c7ed4592ff7`); la divergencia no se ha reconciliado, no se incorporaron esos commits ni se hizo rebase.
- Implementación General en curso: servicio de consulta Custodia, tres herramientas MCP y scopes especializados; el catálogo usa cursor por fecha de creación estable y la lectura de Blob distingue HTTP 404 de fallos de acceso/transitorios. Pruebas unitarias añadidas para catálogo, revisiones, aislamiento, saneamiento y estados de integridad, todavía no ejecutadas. La implementación y el registro en esta rama no equivalen a merge, despliegue ni aceptación productiva.
- Pruebas de código: archivos de prueba incorporados, ejecución pendiente en entorno reconstruido para esta sesión. Se intentó crear sandbox efímero con clon de la rama, pero el proveedor devolvió `git clone failed`; no quedó sandbox disponible y no se ejecutó ningún comando de pruebas. No declarar cobertura validada hasta ejecutar comandos y registrar resultados.
- Protección: no se modificaron objetos, controles, tareas ni datos de Custodia; no se realizaron escrituras/recuperaciones productivas; no se copiaron credenciales productivas.
- No se fusionó la rama, no se abrió merge y no se desplegó.

Al cierre de General, actualizar este mismo OCP y leerlo de vuelta; después liberar o transferir la titularidad temporal en el control existente conforme al procedimiento aplicable. La tarea Jules conserva su continuidad en el mismo OCP y no requiere un objeto documental paralelo.

