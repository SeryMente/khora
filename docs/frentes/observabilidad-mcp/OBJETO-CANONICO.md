# Observabilidad MCP — acceso a registros de Khora

## 1. Control e identidad
- Frente: **Observabilidad MCP**; identidad canónica `OBSERVABILIDAD-MCP`.
- Repositorio `SeryMente/khora`; OCP único `docs/frentes/observabilidad-mcp/`, conservado en su ruta heredada. Versión v0.3.1 en la rama General; `main` conserva v0.1.0 hasta una integración autorizada.
- Control independiente, generación 2, estado `assigned`; titular operativo temporal `chatgpt-khora-mcp-SES-20261030-01A18DCB`; folio `SES-20261030-01A18DCB`; blob del control `93d7ec6fd51dd57c20b8818cfe34ba9bd14e08c3`.
- `MCP-OBS-DICTADO` es identidad histórica del objeto agregado anterior, no la identidad vigente de este frente.

## 2. LEER PRIMERO
Leer README, DUG, este OCP y `CONTROL-RESPONSABILIDAD.json`. El control está adjudicado en generación 2 al titular operativo temporal indicado en §1. No heredar titularidad de Dictado; al cierre, liberar o transferir mediante el mismo control.

**Propósito original dictado por el operador (verbatim):**

> Lo que vamos a hacer es asegurarnos que el MSP de Cora permita que cualquier modelo que tenga acceso al MSP pueda acceder a los registros de observabilidad para un esfuerzo específico. Por ejemplo, yo lo que quería hacer era resolver algunas cuestiones que tienen que ver con el proceso de dictado, pero no lo voy a hacer sino hasta que tengas acceso al MSP y que a su vez el MSP te permita tener los registros de eventos con el nivel de riqueza suficiente para que tengas ojos sobre la situación y puedas determinar la solución más adecuada. Entonces, esto supone algunas tareas generales en cuanto a la función de observabilidad del MSP y específicas en cuanto al propósito de desarrollo concreto, que en este caso es resolver el bug de dictado. No sé si lo tengas ya descrito o si lo tenga que volver a describir.

**Procedencia:** conversación «DICTADO», adjunto `turn0file0`, registro inicial 2026-10-28 16:11:37, 41.447 bytes, SHA-256 `04390ddfd6b347cd7cc8afb31bde7aed7016055cac6cb1eb6fad74c0917c43c2`. La forma «MSP» se conserva literalmente.

**Interpretación operativa separada:** el contexto técnico documentado en `SeryMente/khora` denomina MCP al servidor/protocolo y a sus herramientas de observabilidad; por eso «MSP» se interpreta aquí como MCP, sin alterar la cita. El propósito es que modelos/agentes MCP autorizados consulten registros de observabilidad suficientes para reconstruir el contexto causal. El primer caso de uso era diagnosticar un defecto de Dictado; corregir la pantalla/captura/transcripción pertenece al OCP Dictado.

## 3. Referencia metodológica
- DUG v368 · NX-368m; Metacanon 1.26; GOW 2.14.
- Fuente canónica `SeryMente/metodologia/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`; blob `2ba096f565807d7c19df0a9a8cab9e8410110a15`, verificado también en el commit `1412057878829b71b5c262879d6341cbceac1fb4`.
- La categoría A identifica la pertenencia al CNP sin ordinales adicionales; los decimales solo ordenan la preponderancia relativa dentro de A. Se conserva la revisión manual de los principios aplicables y del GOW.
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
- `khora-web/app/sistema/mcp/page.tsx`: interfaz de emisión y selección de scopes.
- `khora-web/lib/server/audio-mp3.ts`: helper compartido de lectura/descifrado/validación Blob; cualquier cambio afecta también la lectura de audio existente.
- `khora-web/docs/normative-check.md`: catálogo y contrato documental único del servidor.
- `khora-web/tests/unit/mcp_tool_auth_metadata.test.ts`, `mcp_contract_concordance.test.ts`, `mcp_diagnostics.test.ts`: pruebas de contrato/transporte compartidas; `mcp_custodia.test.ts` añade cobertura de la capacidad específica General.

El servicio `khora-web/lib/server/mcp-custodia.ts` es específico de las herramientas de metadatos/integridad de Custodia de esta actividad General; no es infraestructura Jules ni cambia los objetos del frente Custodia.

**Reglas de serialización:** identificar la superficie compartida antes de cada modificación; no escribir simultáneamente el mismo archivo desde ramas/tareas diferentes; coordinar previamente cambios de ruta, tipos, permisos, contratos, OAuth, pruebas o documentación que puedan alterar el comportamiento de la otra tarea. Una integración posterior deberá reconciliar commits y huellas de ambas líneas sin sobreescribir cambios ajenos. La mera existencia de ramas separadas no acredita que no haya colisiones.

**Límite de conocimiento de este asiento:** esta intervención no inspeccionó la rama, commits ni archivos de trabajo del hilo Jules. Por tanto, no afirma conocer su estado ni que la coordinación entre hilos ya haya ocurrido. Los componentes listados constituyen el inventario inicial de puntos compartidos para esa coordinación.

### 14.4 Estado de esta intervención y continuidad

- Control de responsabilidad existente: generación 2, estado `assigned`, alias General arriba indicado; blob leído `93d7ec6fd51dd57c20b8818cfe34ba9bd14e08c3`. No se creó otro control.
- OCP: esta actualización se realiza en la rama de trabajo, sobre el archivo canónico existente; el blob de origen verificado antes de la escritura fue `a3b1335c7b3b13d5ce3e1cbf4ea50f8c0866cd36`. La copia en `main` permanece sin modificar hasta una integración autorizada.
- Rama General: `work/obs-mcp-custodia-tools-20261030-01a18dcb`, creada desde `d6c9911615a3633f6ce38c1b8a2459f1e4823df5`. Última verificación: merge-base `d6c991...`; `main` en `8f9b98b61d58aa5c1dd1afee0c128c7ed4592ff7`, seis commits posterior a la base autorizada. El diff contiene 18 archivos y no contiene rutas `frentes/custodia/**` ni `docs/frentes/custodia/**`. La rama permanece divergente; no se hizo rebase ni merge. Reconciliar la divergencia y coordinar componentes compartidos antes de integrar.
- Implementación General en curso: servicio `khora-web/lib/server/mcp-custodia.ts`, tres herramientas MCP y scopes especializados; el catálogo usa cursor estable por fecha de creación, incluye sesiones incompletas/selladas/sin checkpoint/sin partes y las herramientas siguen detrás del gate `norm:turn`. Los scopes especializados no se sustituyen con `volcados:read` ni se preseleccionan. Se añadió al helper compartido `audio-mp3.ts` una clasificación específica de HTTP 404 (`blob_no_encontrado`) para distinguir ausencia real de fallos transitorios; afecta también a los consumidores existentes de audio/MP3 y requiere revisión coordinada antes de integrar. No se probó con un Blob real.
- Pruebas ejecutadas en PC-14 (Windows 11; Node 26.13.0; directorio temporal reconstruido): `mcp_custodia.test.ts` 6/6, `mcp_tool_auth_metadata.test.ts` 4/4, `mcp_contract_concordance.test.ts` 10/10 y `mcp_diagnostics.test.ts` 30/30; total **50 aprobadas, 0 fallidas**. La concordancia ejecutó el código real de la ruta y el transporte HTTP Streamable MCP con el SDK; las fronteras externas (Next Response, identidad, base de datos, almacenamiento y servicios de negocio) fueron simuladas. Diagnóstico ejercitó redacciones, autorización, consultas y clasificación de fallos con fixtures. El harness usó copias exactas de los archivos relevantes de esta rama y dependencias mínimas (`tsx`, `pg`, `zod`, SDK MCP y TypeScript). En las pruebas de servicio Custodia, `audio-mp3.ts` fue un stub porque se inyecta el lector Blob; no se probó lectura real de Blob ni OAuth/PostgreSQL productivos. También pasó `tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node,pg` sobre `mcp_custodia.test.ts`, `mcp-custodia.ts`, `mcp-db.ts`, `cripto.ts` y el stub `audio-mp3.ts`; el primer intento reveló `any[]` en el cursor y se corrigió a tupla `[string,string]` antes del pase final.
- Límites de validación: no se ejecutaron la suite integral `npm run test:unit`, `typecheck`, build, pruebas de integración con PostgreSQL, OAuth real, `tools/list` autenticado, Blob productivo ni E2E. PC-14 no tenía sesión `gh` autenticada; `git ls-remote` no respondió y se terminó, por lo que no se clonó el repositorio ni se supuso persistencia local. La prueba no tocó servicios ni datos productivos.
- No se fusionó la rama, no se abrió merge y no se desplegó.

## 15. Reanudación PC-14 y validación actualizada — 2026-10-30

### 15.1 Gobierno y control

- DUG vigente leído desde SeryMente/metodologia/main: v368 · NX-368m; Metacanon 1.26; GOW 2.14; blob del documento 2ba096f565807d7c19df0a9a8cab9e8410110a15.
- La modificación autorizada del control generación 1→2 ya constaba persistida antes de esta reanudación. El control fue leído de nuevo: blob 93d7ec6fd51dd57c20b8818cfe34ba9bd14e08c3, generación 2, estado assigned, titular operativo chatgpt-khora-mcp-SES-20261030-01A18DCB, folio SES-20261030-01A18DCB. No se repitió la escritura ni se incrementó la generación.
- El OCP v0.3.0 se registra únicamente en la rama General. main conserva el OCP v0.1.0, blob a3b1335c7b3b13d5ce3e1cbf4ea50f8c0866cd36. No hay un segundo OCP ni un segundo control.

### 15.2 Rama y reconciliación

- Rama work/obs-mcp-custodia-tools-20261030-01a18dcb; último commit de código verificado antes de este checkpoint documental: 70669594c6b706ffcd9fc4670ff222ceafa3a754.
- Base y merge-base: d6c9911615a3633f6ce38c1b8a2459f1e4823df5. main observado: 8f9b98b61d58aa5c1dd1afee0c128c7ed4592ff7.
- Comparación inmediatamente anterior a este checkpoint: rama 39 commits adelante y 6 detrás. Los seis commits posteriores de main modifican únicamente docs/frentes/harmonia/**; no hay solapamiento por ruta con los 18 archivos del diff General.
- No se hizo rebase, merge, PR ni despliegue. La búsqueda de PR por la rama no devolvió solicitudes. La coordinación efectiva con el otro hilo Jules sigue sin verificarse; la modificación de superficies compartidas debe esperar ese cotejo.
- No hay modificaciones en frentes/custodia/** ni docs/frentes/custodia/**. No se ejecutaron escrituras ni recuperaciones productivas.

### 15.3 Validación repetida en PC-14

- Entorno observado: PC-14, Windows, Node.js 26.13.0, npm 11.20.0. No existe clon local de Khora; se utilizó el harness aislado en C:\Users\PC 13\AppData\Local\Temp\khora-general-validation.
- Se cotejaron hashes Git-blob de 14 archivos locales contra la rama remota: 13/14 coinciden exactamente. El único distinto es audio-mp3.ts, sustituido intencionalmente por un stub en el harness para inyectar el lector Blob. Por eso la prueba no certifica el helper Blob real.
- Smoke test SQL adicional: **9 aserciones aprobadas** en PGlite contra las funciones reales del servicio y un esquema sintético mínimo que refleja las columnas/tipos comprobados en el esquema fuente de Khora. Cubrió catálogo de tres tipos de sesión (propietario directo, checkpoint heredado y archivo vinculado) en dos páginas; exclusión de otra cuenta; revisiones sin exposición de snapshot; integridad en dos páginas; rechazo de acceso cruzado. Datos ficticios y lector Blob inyectado. No fue conexión Neon, lectura Blob real ni ejecución integral de migraciones.
- Suite focalizada repetida: mcp_custodia.test.ts 6/6; mcp_tool_auth_metadata.test.ts 4/4; mcp_contract_concordance.test.ts 10/10; mcp_diagnostics.test.ts 30/30. Total: 50 aprobadas, 0 fallidas.
- La concordancia ejercita la ruta MCP real y el transporte HTTP Streamable MCP con el SDK; la fixture sustituye fronteras externas y registra servicios de negocio simulados. Las pruebas de servicio Custodia ejecutan el módulo real con base de datos simulada, snapshots cifrados de prueba e inyector Blob. No se ejecutó PostgreSQL ni Blob real.
- tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node,pg pasó sobre mcp_custodia.test.ts, mcp-custodia.ts, mcp-db.ts, cripto.ts y el stub audio-mp3.ts. Fue necesario instalar @types/node y @types/pg sin guardar dependencias ni modificar el lockfile del harness.
- No se ejecutaron npm run test:unit integral, typecheck del repositorio completo, build, E2E, OAuth productivo, conexión PostgreSQL real, Blob real ni tools/list contra el endpoint productivo.

### 15.4 Disponibilidad y siguiente compuerta

- Las herramientas y scopes están implementados en la rama, no en producción.
- khora_custodia_catalogo y khora_custodia_revisiones requieren custodia:metadata:read y el gate operativo norm:turn.
- khora_custodia_verificar_integridad requiere custodia:integrity:verify y norm:turn. volcados:read no sustituye ninguno de los scopes especializados.
- El catálogo utiliza paginación por cursor estable; el máximo de página es 100. Revisiones usan cursor estable y máximo 100. Integridad verifica Blob por partes, con máximo 50 por llamada y continuación mediante despues_de_parte.
- Para que Custodia pueda empezar una investigación con evidencia productiva, todavía se requiere una autorización independiente para integrar/desplegar, además de coordinación con Jules sobre superficies compartidas. Hasta entonces, la rama no habilita el endpoint productivo ni debe presentarse como disponible.
- Estado de aceptación: IMPLEMENTADO EN RAMA Y VALIDADO CON PRUEBAS AISLADAS; NO DISPONIBLE EN PRODUCCIÓN; NO ACEPTADO INTEGRALMENTE.

Al cierre de General, actualizar este mismo OCP y leerlo de vuelta; después liberar o transferir la titularidad temporal en el control existente conforme al procedimiento aplicable. La tarea Jules conserva su continuidad en el mismo OCP y no requiere un objeto documental paralelo.

