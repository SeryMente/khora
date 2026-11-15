# Dictado — ingreso por voz, captura y transcripción en Khora

## 1. Control e identidad

- Frente canónico: **Dictado**.
- Identidad canónica: `DICTADO`; `MCP-OBS-DICTADO` queda como identidad agregada histórica.
- Repositorio: `SeryMente/khora`, rama `main`.
- OCP heredado: `docs/frentes/dictado-voz/`.
- Versión: **v0.6.23 · DICTADO-v0.6.23**, no es versión de producto.
- Estado: titularidad transferida el 2026-11-15 (generación 6→7); original ChatGPT-DICTADO-20261115-1028.md incorporado y cotejado; implementación Fase 0/1 en rama aislada; no merge ni revalidación productiva.
- Control: generación **7**, folio PENDIENTE/NO ASIGNADO (FOL1 PREPARADA, NO ACTIVA), alias operativo chatgpt-dictado-01a1e010-10d7-7c58-92f3-38c493888dc4.
- UUIDv7 local de esta conversación: 01a1e010-10d7-7c58-92f3-38c493888dc4; no es ID nativo de plataforma. Instancia: chatgpt-dictado-INSTANCE-20261115-01A1E01010D77C5892F338C493888DC4.
- Frente independiente relacionado: Observabilidad MCP en `docs/frentes/observabilidad-mcp/`, con control propio sin titular asignado.
- Custodia es un frente independiente y ajeno a Dictado: no forma parte de su alcance, titularidad, backlog, dependencias ni aceptación.
- Material fuera del alcance estricto se conserva en la crónica y queda clasificado en §4; no se borra ni reasigna automáticamente.

## 2. LEER PRIMERO

Este OCP gobierna la experiencia de Dictado dentro de Khora: modalidades Dictado normal y Crónica, y la modalidad futura «Escuchar a Chrome / Organizar como diálogo». Dictado incluye pantalla y controles, captura explícita, transcripción, edición, continuidad y cierre mediante «Archivar registro». En Crónica incluye checklist guiado y creación de handoff autenticado a Integración. La publicación externa pertenece exclusivamente al frente Integración.

**No es el OCP de Observabilidad MCP.** Para acceso de modelos a registros, OAuth/scopes, filtros, cursores, salud y diagnóstico MCP, consultar `docs/frentes/observabilidad-mcp/OBJETO-CANONICO.md`. Ambos frentes tienen OCP y control independientes.

**C044 · titularidad:** el operador autorizó a esta conversación a sustituir la titularidad anterior y asumir únicamente Dictado. La transferencia no concede permisos de código, credenciales, proveedores, seguridad, despliegue ni aceptación funcional.

**Entrada de nuevas instancias:** leer `README.md`, este OCP, `CONTROL-RESPONSABILIDAD.json` y manifiesto. Verificar generación y folio; una titularidad distinta activa P037/Metacanon §42. No asumir Observabilidad MCP por proximidad documental.

Los contenidos de la etapa mixta permanecen como historia con procedencia; su inventario y límites se describen en §4.

## 3. Referencia metodológica

Fuente: SeryMente/metodologia/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html.
- **DUG:** Samantha v398; discrepancia de firma pendiente de resolver: header NX-398m, mención interna NX-397m.
- **Metacanon:** 1.31.
- **GOW:** 2.25.
- **Blob DUG:** 410c85c9afd36202c1e56cb519c677f3bc0205a1.
- **Lectura:** 2026-11-15; §ARR, ART-031/ART-032, Metacanon §4 y principios pertinentes consultados.
- **MCP-NORMATIVO:** DESACTIVADO.

Se leyó §ARR y se adquirió el DUG vigente; se revisaron la cascada y los principios pertinentes P001, P004, P005, P035, P037–P043, junto con Metacanon §§4, 29, 42, 46–48 y GOW 2.17. MCP-NORMATIVO permanece DESACTIVADO. El propósito original del nuevo frente Observabilidad MCP está preservado verbatim en su OCP con interpretación separada. El MCP-NORMATIVO del DUG es distinto del servidor MCP de producto de Khora.

## 4. Propósito y alcance

### Propósito
Mantener una experiencia fiable para introducir contenido en Khora mediante voz o texto, en dos modalidades activas: Dictado normal y Crónica. La modalidad «Escuchar a Chrome / Organizar como diálogo» se incorpora como frontera oficial de Dictado y queda implementada en Fase 2. La sesión no termina al completar el checklist: termina únicamente al confirmar «Archivar registro» y dejar asentado el handoff que corresponda.

### Modalidades incluidas

1. **Dictado normal:** captura explícita, recepción y transcripción de audio, edición y continuidad. Su comportamiento vigente no se altera por la modalidad Crónica.
2. **Crónica:** dictado o escritura guiados por cuatro pistas no obligatorias: **Fecha y hora** (solo lo mencionado en el relato), **Lugar**, **Momento** (vocabulario plano y cotidiano) y **Qué pasa** (hechos, acciones, emociones, sensaciones, observaciones e ideas). La detección es local y conservadora; no consulta Groq por tecla. No usa IP ni cabeceras para inferir lugar. eventTime representa tiempo referido en el relato y capturedAt la hora real de captura; nunca se sustituyen entre sí. Las pistas se recalculan sobre el texto visible, pueden resolverse o desmarcarse al editar y no bloquean dictado ni archivo.
3. **Autorización de publicación en Crónica:** el checkmark «Publicar automáticamente al archivar (Crónica y microblog)» permanece marcado y deshabilitado en la interfaz; el operador no puede retirar esta autorización desde la pantalla. Archivar Crónica requiere `autoPublish=true` y crea un handoff `queued`, `publication_authorized=true`, modalidad `cronica`, representación { cronica_sobria: true, microblog: { requested: true, max_characters: 280 } } y destinos `github_blog`, `facebook`, `x`, `tiktok`. El endpoint de archivado y la capa de persistencia rechazan nuevos handoffs con `autoPublish=false`. Los snapshots históricos pueden conservar el valor anterior durante recuperación, pero no autorizan crear un nuevo handoff desactivado.
4. **Escuchar a Chrome / Organizar como diálogo:** modalidad genérica, sin dependencia de una identidad concreta. La frontera incluye captura de Chrome y micrófono con transcripción en vivo como objetivo de Fase 2. La implementación de esta fase no altera el Diálogo actual; la evolución de su captura y transcripción se hará en Fase 2 dentro de Dictado.

### Contrato de cierre y handoff
Dictado termina al confirmar «Archivar registro». En Crónica, la misma transacción que sella el volcado crea un registro idempotente de handoff para Integración ligado a (session_id, volcado_id, version, source_sha256), con intent_id estable y propietario derivado de autenticación. Dictado entrega estado y autorización; no publica, no invoca APIs externas y no duplica conectores. El consumidor, revisión operativa y publicación en GitHub Blog/Facebook/X/TikTok pertenecen al frente Integración. Una fila queued indica entrega durable pendiente de consumo, no publicación completada.

### Fuera de alcance
- **Observabilidad MCP:** acceso a registros, scopes, filtros, paginación y diagnósticos; OCP independiente.
- **Evaluación y retroalimentación:** benchmark, métricas de experiencia, encuestas y feedback (CONTRATO-DICTADO-EXPERIENCE.md, khora-web/docs/dictado-experience.md).
- **Ingreso general y metadatos ajenos a Crónica:** categorías U01–U06 y cualquier mecanismo general de clasificación que no sea el checklist acotado aquí.
- **Voz y síntomas:** propuesta histórica no implementada; no autoriza inferencias de salud, ánimo o capacidad laboral.
- **Publicación externa:** ejecución de conectores, manejo de credenciales/proveedores, revisión de destino y respuesta de cada plataforma; pertenece a Integración.
- **Custodia:** frente independiente y fuera del alcance/backlog/titularidad de Dictado. Dictado solo usa los contratos de persistencia existentes sin apropiarse de sus mecanismos o datos.
- **Chat / Open WebUI:** completamente fuera de alcance.
- **Instrumentación transversal:** khora-web/docs/observability-services.md permanece compartida, sin duplicar almacén.
- Cambios de credenciales, seguridad, proveedores, gasto, despliegue y producción requieren autorización independiente.

No se alteran Adjuntar audio, Dictado normal, Diálogo actual, Custodia local/B2 ni Notas rápidas como parte del acuerdo de modalidad. No se incorporan llamadas a GitHub/Facebook/X/TikTok desde Dictado. Los originales y evidencias previos permanecen en sus ubicaciones.

## 5. Roles y colaboración

- Operador: dueño del propósito, consentimiento, decisiones materiales y aceptación humana.
- Asistencia responsable actual: esta instancia, control gen. 7; folio PENDIENTE/NO ASIGNADO; alias operativo chatgpt-dictado-01a1e010-10d7-7c58-92f3-38c493888dc4; UUIDv7 local 01a1e010-10d7-7c58-92f3-38c493888dc4.
- Constructor independiente: no asignado en C044; no inventar roles.
- Observabilidad MCP: frente independiente sin titular asignado en C044.
- Escritura: un escritor por cambio lógico; cualquier cambio de producto conserva autorización y validación propias.

## 6. Autoridad

| Decisión | Estado | Límite |
|---|---|---|
| Separar Dictado y Observabilidad MCP | Autorizada por instrucción directa C044 | Dos OCP y controles independientes. |
| Transferir Dictado gen. 3→4 | Autorizada por respuesta afirmativa directa | Exclusivamente Dictado. |
| Transferir Dictado gen. 4→5 | Autorizada por instrucción directa `Transfer Responsibility` del 2026-11-06 | Exclusivamente Dictado; no amplía permisos de código ni producción. |
| Transferir Dictado gen. 5→6 | Autorizada por dos respuestas afirmativas del operador; la segunda confirmó `TRANSFER_RESPONSIBILITY` | Exclusivamente Dictado; gen. 6; sin folio porque FOL1 no está activa. |
| Limitar Dictado a captura/transcripción/UI | Instrucción directa C044 | Benchmark, Diálogo, Ingreso general, MCP y publicación quedan fuera. |
| PR #335 | Candidato amplio de Ingreso U01–U06 | No se atribuye íntegramente a Dictado ni se fusiona por C044. |
| Código/seguridad/despliegue | No autorizados por este traspaso | Requieren compuertas propias. |
| Implementar Fase 0/Fase 1 de Crónica en rama aislada desde HEAD de main | Autorizada por instrucción directa del operador del 2026-11-15 | Solo frontera documental, UI Crónica, checklist local, snapshot/checkpoint y handoff transaccional; no autoriza merge, despliegue, migración productiva ni cambios del frente Integración. |
| Aceptación funcional | Pendiente | No inferir de evidencia histórica. |

La etapa mixta se conserva en la crónica y el Anexo A; sus citas no reactivan autorizaciones previas.

## 7. Perfil de entorno

- Repositorio público SeryMente/khora (visibilidad observada en GitHub); acceso GitHub de lectura/escritura verificado. No se cambió visibilidad ni configuración del repositorio.
- Rama `main`; base C044 `43ff0ad2bed21b375c658ac80e865d92aa7fd87b`.
- RDC utilizado para localizar, leer, obtener metadatos, calcular SHA-256 y preparar el original. No se abrió un checkout de desarrollo ni se modificó el entorno de producto.
- Producción no consultada ni modificada.
- Último release técnico histórico C030: main `f0dfbdcb2d79eb6289dacba272ddcc7ba2023063`, deployment `dpl_AG7NQGqD8VqjgVcJoFEaW8hHYiMr`, observado 2026-10-18; no revalidado.
- C044 es una separación documental; no altera código de producto.

## 8. Estado vivo

### Transferencia de responsabilidad gen. 5→6 — 2026-11-06

- **Autorización:** dos respuestas directas «Si» del operador; la segunda respondió a la pregunta explícita «¿Confirmas TRANSFER_RESPONSIBILITY?». Operación: sustitución del titular exclusivamente de Dictado.
- **Control previo:** generación 5; titular `chatgpt-dictado-01a1b26b-ef3c-788a-b7ea-e48d456f0beb`; blob `38afbbb1215a1fc821f5ac750fb9a055aa12dea7`.
- **Control nuevo:** generación 6; titular `chatgpt-dictado-01a1b2e1-a2dc-7881-aac7-ac9d900dd4e3`; instancia `chatgpt-dictado-INSTANCE-20261106-01A1B2E1A2DC7881AAC7AC9D900DD4E3`; UUIDv7 local `01a1b2e1-a2dc-7881-aac7-ac9d900dd4e3`; evento `DICTADO-TRANSFER-20261106-900DD4E3`.
- **Persistencia del control:** commit `d9e9e84820916dddb1ce31ba975d7f49265f9802`; blob nuevo `8fa5721013b47b88729b38869c712863bc6a69d7`. Lectura de vuelta de `main`: generación, alias, instancia, evento, generación anterior, SHA anterior y UUID cotejados.
- **Foliación:** `PENDIENTE/NO ASIGNADO`; FOL1 PREPARADA, NO ACTIVA. No se inventa folio ni se presenta el UUID local como ID nativo.
- **Límite:** el traspaso no amplía permisos sobre código, credenciales, proveedor, seguridad, workflows, despliegue, producción ni aceptación funcional.

### Transferencia de responsabilidad gen. 4→5 — 2026-11-06

- **Autorización literal:** «Transfer Responsibility», elegida por el operador en respuesta a la alternativa explícita entre sustituir al titular y añadir una segunda sesión. Operación ejecutada: `TRANSFER_RESPONSIBILITY`; no se añadió corresponsable.
- **Control previo:** generación 4; titular `chatgpt-dictado-ses-20261030-97109848`; blob `a954353055ef30770aae0b5ca40e1f61cfc3d8dd`.
- **Control vigente:** generación 5; alias `chatgpt-dictado-01a1b26b-ef3c-788a-b7ea-e48d456f0beb`; instancia `chatgpt-dictado-INSTANCE-20261106-01A1B26BEF3C`; UUIDv7 local `01a1b26b-ef3c-788a-b7ea-e48d456f0beb`; evento `DICTADO-TRANSFER-20261106-EAD64490`.
- **Persistencia del control:** commit `b779d7beea3c7b03316bf8165e11cedb94d3b4ea`; blob nuevo `38afbbb1215a1fc821f5ac750fb9a055aa12dea7`. Lectura de vuelta en `main`: 11 comprobaciones satisfactorias de generación, titularidad, autorización, evento, identidad local, folio y SHA.
- **Folio de sesión:** PENDIENTE/NO ASIGNADO. FOL1 está PREPARADA, NO ACTIVA; no se emite un folio hasta que la activación sea verificable.
- **Alcance:** responsabilidad exclusiva del OCP Dictado. No autoriza cambios de código, credenciales, proveedores, seguridad, workflows, despliegue, producción o aceptación funcional. No se ejecutaron pruebas ni cambios de producto durante el traspaso.
- **Estado funcional heredado:** permanece NO REVALIDADO; el cambio de titularidad no acredita que el producto esté corregido o aceptado.

### C044 · transferencia y separación
Control anterior: blob `ff3a148420e547323717a620c1c5b695a4fa79e5`, generación 3, titular `chatgpt-dictado-voz-SES-20261028-Q7M4N9K2`, folio `SES-20261028-Q7M4N9K2`. El operador autorizó sustituir exclusivamente esa titularidad. Se registra generación 4, folio `SES-20261030-97109848`, alias `chatgpt-dictado-ses-20261030-97109848`, UUIDv7 local `01a18d84-31e0-7dca-b0f7-90e4b3c58f12` y evento `DICTADO-TRANSFER-C044-SES-20261030-97109848`. La declaración de transferencia se considera completada tras cotejar la lectura de vuelta.

Observabilidad MCP dispone de OCP/control independientes; su control inicia `unassigned` y sin folio. Los paquetes heredados no dictado se listan en §4, preservando sus fuentes.

### Estado GitHub observado 2026-10-30
- **PR #335:** abierto, no fusionado, no draft; 321 archivos, 14.523 adiciones y 306 eliminaciones. Candidato amplio de Ingreso U01–U06; no atribuir íntegramente a Dictado.
- **PR #342:** abierto, draft; 2 archivos, 547 adiciones; handoff documental MCP.
- **PR #343:** abierto, draft; 2 archivos, 113 adiciones y 6 eliminaciones; corrección de filtros/aislamiento MCP. Su descripción declara 2 pruebas focalizadas, no suite integral ni CI.
- Los tres siguen abiertos/no fusionados; no se integran por esta separación.

### Producto
C044 no modifica código, datos, configuración, credenciales, scopes, seguridad, workflows, producción ni despliegue; tampoco ejecuta pruebas. Último corte técnico histórico C030, no revalidado. La separación documental no demuestra que el defecto de Dictado esté resuelto.

### C046 · Delimitación expresa entre Dictado y Custodia — 2026-11-14

- **Instrucción literal del operador:** «Elimina la transversalida ddel frente,Custodia no tien que ver contigo. No borres las stareas en frente custodia,solo borralas del frente Dictado».
- **Alcance vigente:** Dictado queda limitado a pantalla, captura explícita, transcripción, edición y continuidad del dictado.
- **Exclusión:** Custodia no es dependencia, colaboración, titularidad, backlog, tarea, contrato ni criterio de aceptación de Dictado. Sus tareas permanecen exclusivamente en el OCP y registros del frente Custodia.
- **Clasificación histórica:** las menciones a Custodia conservadas en ciclos anteriores, originales y evidencias son antecedentes de procedencia; no son tareas, dependencias ni responsabilidades vigentes de Dictado. En particular, la mención de CUSTODIA-04/SCI 354Q en C045 queda como antecedente histórico, no como seguimiento de este frente.
- **Preservación:** no se modificaron ni eliminaron el OCP, la lista provisional, el control ni las tareas del frente Custodia. Tampoco se borraron originales o evidencias históricas de Dictado.
- **Persistencia:** este ciclo modifica únicamente el OCP y el manifiesto del frente Dictado. Sin cambios de código, pruebas, PR, configuración, credenciales, proveedor, despliegue, datos ni producción.

## 9. Aceptación y viabilidad

La aceptación funcional exige evidencia actual de que: (1) el operador abre la pantalla específica e inicia/detiene el micrófono explícitamente; (2) la captura alimenta la transcripción y expone estados/errores veraces; (3) el texto aparece y puede editarse; (4) reanudar el dictado conserva el texto confirmado dentro de la propia experiencia de Dictado; (5) el recorrido terminal se prueba en navegador y micrófono real y la aceptación humana se registra por separado.

**Estado:** NO REVALIDADO EN C044. Evidencia histórica o sintética no sustituye uso físico ni aceptación del operador.

## 10. Formato de ciclo

Toda salida conserva: identidad Dictado/OCP/folio/generación y versiones DUG/Sam/Metacanon/GOW; última salida previa recuperable; delta de fuente/frente; avances con evidencia/entorno; pendientes/bloqueos; viabilidad contra propósito/aceptación; dependencias/estimación; siguiente acción; continuidad/prompts de roles existentes; persistencia con SHA/revisión/read-back.

No afirmar sincronización, titularidad, aceptación, pruebas, despliegue o lectura sin evidencia. Si la fuente central no puede verificarse: `METODOLOGÍA NO VERIFICADA`. MCP-NORMATIVO: DESACTIVADO.

## 11. Crónica y fuentes

### C044 — Separación de Dictado y Observabilidad MCP; transferencia — 2026-10-30

- Instrucción del operador preservada verbatim: «Si, y deja todo listo en github para que se reconzcan los frentes ya correctamente en instancias nue4vas». Procedencia directa de esta conversación; no es exportación nativa.
- Gobernanza adquirida: DUG v363 · NX-363m; Metacanon 1.25; GOW 2.12; blob `501f7f6ec8bfd0a8289eb0c1e3897c19a0281be7`, commit `b4bc9f8ef4485e44973e9c17f6c4f9a1119d698d`. Revisados P001/P004/P005/P037/P038 y §§39/42/47/48/51. MCP-NORMATIVO: DESACTIVADO.
- Control previo: `ff3a148420e547323717a620c1c5b695a4fa79e5`, gen. 3, folio `SES-20261028-Q7M4N9K2`, titular `chatgpt-dictado-voz-SES-20261028-Q7M4N9K2`. Autorización expresa para asumir Dictado únicamente.
- Nuevo folio `SES-20261030-97109848`, alias `chatgpt-dictado-ses-20261030-97109848`, UUIDv7 local `01a18d84-31e0-7dca-b0f7-90e4b3c58f12`, evento `DICTADO-TRANSFER-C044-SES-20261030-97109848`. Alias/UUID no son IDs nativos de plataforma.
- Dictado queda limitado a pantalla/captura/transcripción/edición/continuidad. Observabilidad MCP adquiere OCP propio y control sin titular asignado.
- Benchmark/feedback, Diálogo multipista, Ingreso general/crónica/metadatos, voz/síntomas y publicación editorial se preservan fuera del alcance de Dictado.
- PR #335 sigue candidato amplio de Ingreso; PR #342/#343 se relacionan con Observabilidad MCP. Todos permanecen abiertos y sin fusionar.
- No hubo cambios de producto ni pruebas en C044; aceptación física pendiente.


### C045 — Retoma documental, transferencia gen. 5→6 e incorporación del original — 2026-11-06

- **Instrucción de entrada:** «ChatGPT-DICTADO-20261106-1540.txt Documenta enpersistencia documental,del frente de trabajo Dictado. con rdc Y retoma desde y retoma repitiendo la salida del modelo del ultimo ciclo.» Se conserva la grafía del mensaje; la interpretación operativa fue localizar el original mediante RDC, adoptar el OCP Dictado, registrar la transferencia autorizada y preservar la salida final del modelo fuente.
- **Gobernanza adquirida desde main:** Samantha v377 · NX-377m; Metacanon 1.28; GOW 2.17; DUG blob `54064c8fe00f872023a455f06596061ed69062ae`; commit de referencia `8ee2482866b3dd085e58e05006727256d0274376`. Se consultaron §ARR, P001/P004/P005/P037/P038/P043, la arquitectura OCP de Metacanon §29 y los ámbitos GOW Persistencia documental y Gestión conversacional. MCP-NORMATIVO: DESACTIVADO.
- **Transferencia gen. 5→6:** autorizada expresamente por el operador y registrada en `CONTROL-RESPONSABILIDAD.json`; precondición SHA `38afbbb1215a1fc821f5ac750fb9a055aa12dea7`; commit `d9e9e84820916dddb1ce31ba975d7f49265f9802`; blob nuevo `8fa5721013b47b88729b38869c712863bc6a69d7`; read-back verificado. Alias operativo `chatgpt-dictado-01a1b2e1-a2dc-7881-aac7-ac9d900dd4e3`; UUIDv7 local `01a1b2e1-a2dc-7881-aac7-ac9d900dd4e3`; no ID nativo. Folio sigue pendiente porque FOL1 no está activa.
- **Original incorporado:** `originales/ChatGPT-DICTADO-20261106-1540.txt`. Fuente local RDC `C:\Users\fila4\Downloads\ChatGPT-DICTADO-20261106-1540.txt`; 70,248 bytes; 1,408 líneas; última actualización declarada 2026-11-06 15:38:23; exportación declarada 15:40:29. SHA-256 `B59FA7524DDAEB8CAAA06A422BBC11415C4AB4814DC2E920AC80658675EE768A`; Git blob `a022d13920cb80280dd3c5bb89475348f8c908b7`; commit `92f6c02044172143e01dee717aaf62f6e7ef588f`. Se comprobó round-trip UTF-8 y el SHA del blob remoto coincide con el blob de los bytes originales: identidad byte a byte verificada.
- **Procedencia y límites:** el encabezado del original identifica ChatGPT Exporter y un enlace a la conversación fuente; se conserva como exportación de herramienta, no como exportación nativa exhaustiva de ChatGPT. Escaneo acotado de seis familias de patrones de credenciales: cero coincidencias; no equivale a certificación exhaustiva de ausencia de secretos. El destino `SeryMente/khora` fue verificado como privado.
- **Última salida del modelo fuente:** el cierre persistido de la exportación, «SCI 354Q quedó activado. La bitácora inicial ya está registrada en la github.com; cada control tendrá su evidencia y resultado documentados.», fue recuperado y reproducido literalmente en la respuesta de retoma. No se reconstruyó ni se expandió la sigla SCI 354Q.
- **SCI 354Q:** la exportación conserva la activación y el registro inicial en PR #354. El seguimiento diario ya existente no fue alterado ni ejecutado nuevamente en esta retoma; el estado de CI descrito en la exportación es histórico, no una revalidación actual.
- **Alcance de este ciclo:** actualización documental del control, OCP y manifiesto. Sin cambios de código, pruebas, PR, configuración, credenciales, proveedor, despliegue, datos ni producción. El estado funcional del defecto de archivado permanece sujeto a la validación descrita por la tarea CUSTODIA-04 y el seguimiento SCI 354Q; no se declara resuelto por esta incorporación.

### C042 — Transferencia autorizada y verificable de titularidad — 2026-10-28

- **Objetivo/autoridad:** el operador pidió asumir la responsabilidad del OCP Dictado de voz con autorización previa y respondió literalmente «Sí.» a la pregunta directa de sustitución de titularidad. El original de usuario y la pregunta visible constan en `docs/frentes/dictado-voz/originales/CONTINUIDAD-C042-20261028.jsonl` (U01/A01), lectura de vuelta exacta; no se archiva razonamiento interno.
- **Fuente metodológica adquirida:** `SeryMente/metodologia/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`, blob `16c93745311a5405166a31b583c2a648fda0d044`; Samantha **v353 · NX-353m**, Metacanon **1.21 · METACANON-OBJETOS-v1.21**, GOW **2.3**. Se revisó la cascada P001, colisión P037/§42 y el GOW en el documento único; MCP-NORMATIVO permanece DESACTIVADO.
- **Preflight/CAS:** el control antes de escribir era blob `09b9e497abf16771827b2602308562abc4484ed2`, generación 2, titular anterior `chatgpt-dictado-voz-SES-20261025-H6N3Q8W2`. La actualización condicionada fue aceptada; nueva generación 3, folio `SES-20261028-Q7M4N9K2`, alias operativo `chatgpt-dictado-voz-SES-20261028-Q7M4N9K2`. Lecturas de vuelta confirmaron la generación, el folio, la titularidad, la autorización y `readback_verified=true`. Evento `DICTADO-RESPONSABILIDAD-TRANSFER-SES-20261028-Q7M4N9K2`. La identidad nativa no fue expuesta; el alias no se presenta como ID nativo.
- **Colisión de folio:** búsquedas exactas en el repositorio y en el índice de búsqueda de SeryMente no devolvieron coincidencias; como el índice no equivale a enumeración exhaustiva de todos los controles, unicidad global **NO VERIFICADA**.
- **Estado y límite:** el primer corte de transferencia quedó en v0.6.16; la auditoría focalizada del PR se incorporó en **v0.6.17 / `MCP-OBS-DICTADO-v0.6.17`**. Estado vivo, prompts y manifiesto quedan sincronizados. No se tocó código de producto, credenciales, proveedor, permisos, despliegue o facturación. La autorización cubre la titularidad de este FT, no los cambios productivos.
- **Sincronización y revisión focalizada de PR #335:** GitHub devuelve `open`, `merged=false`, `draft=false`, `mergeable=false`, base `b528660e16552633d232a2397cbe42441a03438c`, head `7bd496247f116e91ff7871781a67ebface10d545` y 350 archivos cambiados. La inspección de parches confirma eliminación del control autoritativo de dictado, eliminación del índice de frentes del README y eliminación de `apps/harmonia-observability/MANIFEST-HUELLAS.json`. `TRAZABILIDAD-U01-U06.md` marca requisitos como `FALTA/PARCIAL/SUPUESTO`, en tensión con el encabezado candidato que asegura U06 implementado/verificado. El manifiesto candidato declara v0.6.34/metacanon 1.8; el OCP candidato v0.6.35. El OCP de `main` sigue siendo la fuente viva, ya que el PR no está integrado. Esta inspección es focalizada: no se revisó individualmente el diff completo de 350 archivos.
- **Continuación:** reconciliar el historial del OCP y el alcance/evidencia de PR #335 antes de considerar fusión normal; cualquier ejecución de producto sigue sujeta a autorización propia y a pruebas/compuertas verificadas.

### C041 — Transferencia autorizada y auditoría de sincronización con el último PR — 2026-10-25

- **Instrucción literal del operador:** «Khora es Cora.

Sí, autorizo. Luego verifica que lo que permite saber cuál fue el último desarrollo coincida con el pull request en GitHub del último desarrollo. Es decir, para saber si el frente de trabajo está actualizado con GitHub sincronizado.» El original y las salidas visibles relevantes se conservan en `originales/CONTINUIDAD-C041-20261025.jsonl`; lectura de vuelta exacta, no exportación nativa completa.
- **Metodología adquirida desde `SeryMente/metodologia/main`:** Gobernanza única v341 · NX-341m, blob `86c8867cfbbb34d3582a11c759a6e55b8e9f9ccb`; Metacanon 1.21 y GOW 2.2 están integrados en el mismo HTML canónico. La fuente prevalece sobre las versiones de instrucciones/copies antiguas. MCP-NORMATIVO: DESACTIVADO.
- **Transferencia de responsabilidad:** control anterior blob `0f0b02a5bc9cd976ac5ab8e5b3e5a8a853866adb`, generación 1. Autorización afirmativa registrada; commit de transferencia `9fa5a25c2f7378165ce8e9ef7bbf1472263e61cb`, control nuevo blob `b4d6f60f5c21771e6434f97955a0b3231c52b46e`, generación 2, folio `SES-20261025-H6N3Q8W2`, alias operativo `chatgpt-dictado-voz-SES-20261025-H6N3Q8W2`. Lectura de vuelta confirmó titularidad, generación y autorización.
- **Último PR candidato del frente:** [#335](https://github.com/SeryMente/khora/pull/335), «feat(ingreso): cumplir instrucciones U01-U06 del operador de extremo a extremo», actualizado el 2026-10-25. Estado `open`, merged `false`, `draft=false`, head `7bd496247f116e91ff7871781a67ebface10d545`, rama `feat/u06-sobre-ingreso-work-1990819938695134734`, base `b528660e16552633d232a2397cbe42441a03438c`. El objeto de esa rama declara v0.6.35 (blob `f84c9ccab2ae637918f8d9579d95b3e259d2a350`, 3337 bytes UTF-8); en `main`, el objeto anterior era v0.6.14 (blob `8d0466379d8e8b8356ec46001dc61dbf7839f78f`, 212299 bytes UTF-8).
- **Diferencias verificadas:** la candidata comprime el OCP de 208743 caracteres a 3251, elimina el control de responsabilidad y cambia/elimina recursos de otras áreas. La matriz U01–U06 no respalda la afirmación uniforme de completitud: mantiene varios requisitos `FALTA/PARCIAL`; el OCP candidato afirma U06 verificado y dice que el PR está en borrador, aunque GitHub devuelve `draft=false`. La matriz indica que #334 se cierra sin merge, pero #334 y #330 siguen abiertos y sin fusionar en GitHub.
- **Cotejo de rama:** la herramienta compare reportó estado `diverged`, `4` commits ahead y `2` behind para el snapshot; PR #335 sigue abierto y sin integración en `main`. No se consideró el despliegue/push de una rama como integración canónica.
- **Veredicto:** **NO SINCRONIZADO**. No se fusionó PR #335, no se modificó código, no se declaró validación E2E ni producción. El último corte técnico aceptado que sigue documentado es C030 y no se revalidó en C041. El próximo trabajo debe reconciliar primero el historial del OCP, conservar el control y limitar el diff al alcance autorizado; luego contrastar pruebas/checks y solicitar la fusión normal cuando el diff sea seguro.

### C032 — Recuperación del tramo final verbatim y especificación del checklist — 2026-10-22

- **Fuente examinada:** archivo adjunto `Texto pegado(6).txt`. Se revisó su tramo final y se contrastó con el OCP vigente en `main` y con el objeto recuperable de la rama histórica `feat/ingreso-autobiografico-20261019`.
- **Original nuevo:** `originales/INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl`. Conserva seis entradas directas del operador enfocadas en el sprint por fases, los veintidós elementos, la expresión pública de Momento, Backblaze/audio, el cierre de extremo a extremo y, con prioridad máxima, el mensaje largo del 21 de octubre. La lectura remota del original coincide exactamente.
- **U06 es la instrucción prioritaria y no estaba en el OCP de `main`** antes de C032. Incluye el diseño de un checklist cuyos elementos se deshacen/desmoronan al alcanzar contenido suficiente; análisis en vivo con Groq; Fecha/Hora inicialmente resueltas y activables si fallan las verificaciones; intento de obtener IPv4 para Lugar; metadatos de adquisición exhaustivos para todos los tipos de entrada; Momento jerárquico y ampliable por IA con criterios de normalización y excepción acotada; y crónica personal libre, no limitada a una actividad. Su cierre solicita literalmente un checklist ordenado y amigable, no una pared de texto.
- **Otras instrucciones verbatim recuperadas:** U01/U02 preguntan por el sprint por fases y sus veintidós elementos; U03 dice que el Momento se aclare en la publicación del microblog sin explicitarlo forzosamente en el relato; U04 pide que Backblaze sea el almacenamiento de datos de usuario; U05 dice «Nueva conexion, termina de extremo a extremo». El comando PowerShell/RDC que sigue a U05 permanece en el archivo fuente completo y no fue ejecutado en C032 ni copiado al extracto focalizado.
- **Separación de evidencia:** los cinco hitos y ejemplos de categorías de Momento que aparecen en el archivo son síntesis del asistente. No se presentaron como citas completas del operador ni como criterios ratificados por sí mismos.
- **Discrepancia de versión:** el transcript contiene una respuesta del asistente que afirma persistencia en C054/v0.6.46; no se pudo verificar ese corte en `main`. El objeto recuperado de la rama histórica está en v0.6.34 y tampoco contiene las frases clave. La afirmación se registra como histórica/no verificada.
- **Privacidad/viabilidad:** la solicitud de una huella de adquisición exhaustiva se preserva literalmente. No autoriza por sí sola rastreo encubierto o recolección indiscriminada. IPv4 no equivale a ubicación física; la hora de captura no equivale al momento del hecho. Cualquier desarrollo requiere revisión explícita de privacidad, consentimiento, minimización, seguridad y retención.
- **Sin cambios de producto:** no se modificó código, no se ejecutaron pruebas de Groq/Backblaze, no se usó RDC ni se cambiaron credenciales o despliegues. El estado técnico sigue en el último corte anterior C030; los requisitos de U03–U06 no están acreditados como implementados en producción.
- **Alcance del cierre:** se documentó el tramo final solicitado. No se declara que esté agotada toda la cobertura verbatim histórica del OCP.

### C031 — Retoma de responsabilidad y preservación literal de la conversación — 2026-10-22

- **Solicitud literal del operador (U01):** «asume de responsabilidad del repositorio Cora frente de trabajo dictado.» Se normaliza el producto/repositorio a **Khora** conforme a la metodología; el original conserva la forma «Cora».
- **Solicitud de continuidad literal (U02):** «Cuando lo tengas, procesa esta conversación de manera minuciosa porque apenas voy a migrar hacia ChatGPT de Notion y hay algunas entradas aquí verbatim, hacia el final, que no están incluidas en el OCP. Entonces identifícalas y documéntalas y cuando ya tengas el contexto y el objeto canónico de persistencia esté documentado, me dices para decirte qué es lo que sigue a continuación.»
- **Custodia de diálogo:** `originales/CONTINUIDAD-C031-20261022.jsonl` conserva U01/U02 verbatim y tres comentarios visibles del asistente distinguidos por rol, precedidos de un registro de alcance. Lectura de vuelta exacta; blob `afb6acb0571f2a24c3726afc55bf500e6ab4fa48`, commit de creación `c5d4eaa97f0b4b63a4f203093d8ecb1ab7fda654`. No hay ID nativo de conversación ni exportación nativa exhaustiva; no se inventan timestamps ausentes.
- **Adjudicación inicial:** no existía `docs/frentes/dictado-voz/CONTROL-RESPONSABILIDAD.json` en `main` (lectura directa devolvió 404) ni se encontró otro control para el frente en las búsquedas de repositorio accesibles. Se creó de forma create-only, no mediante sobrescritura de un titular identificado. Read-back exacto: blob `0f0b02a5bc9cd976ac5ab8e5b3e5a8a853866adb`, commit `42405f47abc91bf73d65ba3c32b2d19b7c0dc32c`, generación 1, folio `SES-20261022-C7N4M2Q8`, alias operativo `chatgpt-dictado-voz-SES-20261022-C7N4M2Q8`; ID nativo de ChatGPT no expuesto. No se transfirió un propietario previo conocido.
- **Colisión de folio:** la búsqueda exacta devolvió cero coincidencias en los nueve repositorios que el conector expuso; se inspeccionaron además controles accesibles, pero la cobertura no es exhaustiva. La unicidad global queda **NO VERIFICADA**.
- **Salida previa del modelo:** no se halló en el OCP una última respuesta completa inequívoca para reproducir en este ciclo. `originales/CONTINUIDAD-C021.md` es histórica y no se usó como si fuera la última salida. Estado normativo: **«Última salida previa: NO DISPONIBLE / NO VERIFICADA»**.
- **Contexto adoptado:** el objeto es `MCP-OBS-DICTADO`, en `SeryMente/khora/main/docs/frentes/dictado-voz/OBJETO-CANONICO.md`. Su última versión anterior era v0.6.12/C030: publicación técnica funcional verificada, pero compuertas globales efectivas y aceptación humana pendientes; el acceso previo a logs de Vercel devolvió 403. Ese estado técnico no se actualizó ni se revalidó en C031.
- **Cierre de alcance:** en este ciclo solo se actualizan custodia, control, objeto canónico, prompts y manifiesto. No se tocaron código, despliegue, claves, credenciales, facturación, permisos ni entorno local. MCP-NORMATIVO: DESACTIVADO. Conforme a U02, la siguiente acción inmediata queda en manos del operador; no se inicia el siguiente trabajo de producto antes de recibir su instrucción.

### C030 — Compuerta efectiva fallida, sin promoción ni diagnóstico inventado — 2026-10-18

- El antecedente C010 confirma que el Build Command propio salta npm prebuild; se corrigió la expectativa, sin declarar retrospectivamente aprobadas las pruebas globales. Comando versionado inicial excedió 256 caracteres y fue rechazado antes de crear despliegue. Se redujo a 122 caracteres reutilizando npm run prebuild y conservando migración productiva + next build.
- Preview ec0a47d, dpl_252P53oY97VyHAvWKdEbzo2tqP8X: ERROR, ENOENT genérico, buildStep, comando exited with 1. El endpoint de logs específico devuelve 403 por scope. Causa concreta NO VERIFICADA. No se relajan pruebas, no se promueve ni se cambia producción para ocultarlo. Configuración se conserva inactiva en evidencias/C030-vercel-gates-candidate.json, no en khora-web/vercel.json. Recibo C030-gate-blocker.json; siguiente requisito exacto §8.
- Cotejo integral de anexos disponibles detectó hash antiguo de evidencias/dialogo.test.ts tras ampliar 13→15 pruebas. Blob remoto bd84597fb390e12c0ff0a6b6c1125efd1258f3cc coincide con archivo real de 7331 bytes; se regenera el manifiesto de todos los anexos locales y se conserva entrada anterior como historia. No fue corrupción ni pérdida del archivo remoto.
- Calibración: la publicación funcional sí concluyó; el cierre global previsto en un ciclo quedó bloqueado al ejecutar la compuerta efectiva. Tiempo restante no estimable sin log autorizado. No renovar un plazo ficticio ni exigir al operador repetir la evidencia ya conservada.

### C030 — Publicación técnica y cierre de custodia documental — 2026-10-18

- Corrección de evidencia: el antecedente C010 identifica Build Command propio que omite npm prebuild. Por eso READY de 06c36c/f0dfbdc no acredita ejecución de las cuatro compuertas globales. Se prepara khora-web/vercel.json con tipos/revisión/navegación/unitarias, preflights existentes y migración runtime solo en producción, antes del mismo next build. No se cambia el criterio de prueba, proveedor, permisos, plan o configuración de seguridad. Build con esta configuración aún pendiente; mantener ese límite explícito.

- Solicitud 326 integrada normalmente, expectedHeadSha 1cb887e; GitHub confirma merged=true y commit main f0dfbdcb2d79eb6289dacba272ddcc7ba2023063. No se alteraron controles de rama. Build productivo dpl_AG7NQGqD8VqjgVcJoFEaW8hHYiMr READY, target production, alias sin error y /api/version HTTP 200 con mismo SHA/rama/entorno comprobados. Recibo evidencias/C030-release.json.
- Smoke sin acceso privado: checkpoint bootstrap 401, eventos GET 401, Ingreso 307 al inicio de sesión. No son pruebas de almacenamiento/transcripción autenticados. El transcriptor real y una sesión humana siguen pendientes; no se declara extremo a extremo real certificado. Las pruebas dirigidas sí cubren comportamiento cliente, cifrado local, reintentos y SQL aislado.
- Rollback identificable antes de C030: main 3356bfc, despliegue dpl_5eSqULJMyN3B1VhEbFbqh9p4Fxox. No ejecutado. Sin cambios en claves, facturación, protecciones, proveedores ni dispositivos remotos.
- Reconciliación del manifiesto: latest_release/latest_verified_release pasan al mismo recibo C030 comprobado; sus valores divergentes previos se preservan como historia. Nuevos originales literales y anexos previos no se borran. La falta de archivo histórico íntegro y del documento paralelo sigue explícita.
- Estimación: publicación técnica terminada en este ciclo; aceptación física no estimable sin prueba voluntaria. Documentación posterior al release no constituye nueva funcionalidad ni acredita otra sesión. El siguiente paso es aceptación, no reiniciar implementación.

### C030 — Compuertas remotas y extensión hasta archivo — 2026-10-18

- GitHub conexión 3 y Vercel reconectados; repositorio privado revalidado. Se conserva el único escritor. La solicitud 326 contiene b36231 y 06c36c; el segundo commit encadena las cuatro compuertas existentes en prebuild sin dependencias nuevas ni cambiar su criterio. Preview dpl_HkHzVpp8ymTiueVnGXYs6vmvtha8 READY, sin error de alias. No se obtuvieron logs individuales ni check-runs (403); otros proyectos Vercel/Netlify fallan ajenos a khora-web y no se cambian planes para ocultarlo.
- Ambos arneses publicados se ejecutaron desde ubicación portable. El de captura se extendió y aprobó archivo incierto 503, bloqueo de edición, reintento con idéntico cuerpo, dos audios cifrados retenidos y ninguna ingesta automática, en ambas presentaciones. HTTP, identidad y proveedor siguen fixtures, no infraestructura humana.
- Registro central de errores actualizado de forma posterior, sin fingir cumplimiento anterior; el recibo C030 conserva incidentes del arnés. La estimación de un ciclo técnico se mantiene condicionada al merge/despliegue normal; duración humana no estimable.
- Antes de integrar, estado/prompt sincronizados, evidencia/manifesto cotejados y lectura remota requerida. No declarar cerradas las brechas de archivo verbatim histórico ni documento paralelo ausente.

### C030 — Reportes servicio de voz histórico/dictado, corrección causal y cierre solicitado — 2026-10-18

- Originales literales de instrucciones nuevas: originales/C030-instrucciones.md. El operador aprueba separar captura/presentación y solicita señal de parada, observabilidad, corrección y publicación; no autoriza nuevos proveedores, diagnóstico clínico ni cambios de seguridad.
- Navegación reactiva reproducida: la propia replaceState cambia el prop de recuperación y ejecutaba cleanup que detenía audio. Corrección: distinguir URL propia y recuperación externa, impedir cambio de sesión durante captura y liberar permisos si se desmonta antes de iniciar.
- Ambos formatos, captura corta, fragmentos finales, IndexedDB cifrado y recuperación explícita pasan en Chromium con red/proveedor sustituidos. Dictado normal comprueba transición inmediata, fallo HTTP 503 y reintento, bloqueo de transcripción incompleta y eventos sin texto. 15 pruebas unitarias dirigidas y typecheck estricto dirigido aprobados. Evidencias no se presentan como sesión humana.
- Defecto adicional demostrado en PostgreSQL aislado: reintentos idénticos con metadatos opcionales NULL se rechazaban por igualdad SQL ternaria. Igualdad null-safe mantiene rechazo de huella/bytes/fuente distintos y sesión sellada. Telemetría no puede invalidar COMMIT de custodia. Tiempos de captura enteros compatibles con almacenamiento INTEGER.
- Observabilidad: se añaden eventos de confirmación/fallo por parte y duración del cierre con pendientes, metadatos permitidos sin transcripción/audio. Acceso a logs productivos con teamId devuelve 403; no es ausencia de eventos. Inspección del despliegue sin scope explícito acredita producción base 3356bfc READY, no esta corrección.
- Canonización: trece bloques, mismo objeto, estados literales sincronizados en ambos prompts, contrato actualizado, originales nuevos y recibos en carpeta autorizada. Auditoría previa no acredita todos los ciclos del adjunto completo almacenados verbatim; Preparacion-benchmark-y-retroalimentacion.md sigue no recuperado. No se declara acceso total ni archivo íntegro del adjunto histórico con códigos de autenticación.
- Estimación: un ciclo técnico bajo acceso/build verdes; cierre humano no estimable sin sesión real. Siguiente checkpoint exacto §8. Ningún segundo constructor ni acceso remoto usado para implementar.


### C029 — Publicación verificada de Diálogo integrado — 2026-10-18

- Original literal del operador: «Listo publcia». GitHub completó autorización como 1interprete1; Vercel como victorhugotorresmendez-8991. Repo privado y permiso push comprobados. Clon completo y npm ci desde lockfile, sin modificar producto ni otras identidades.
- Incidencias resueltas y registradas antes de continuar: vercel link añadió duplicados a .gitignore, clean gate abortó. Recuperación inline node -e perdió comillas bajo PowerShell y abortó sin escritura; retirada esa vía. Archivo .cjs validado restauró solo bytes originales de .gitignore, luego limpieza completa confirmada. No pruebas debilitadas ni secretos en Git.
- Candidato 906e87fef29e46ef1e640e7423aa7543bc52569d: typecheck, ui:contract, ui-review:check, test:unit (545/545, 0 fallos/omitidas) y npm run build incl. prebuild, todos exit 0. Configuración real del proyecto cargada en proceso desde carpeta protegida externa; log hashes conservados en evidencias/C029.json. Árbol limpio tras matriz.
- Solicitud 323 sacada de borrador y fusionada normalmente con expectedHeadSha. GitHub confirmó main 77d8ee012d4cbc2a719af0684a1e47434e00d56d; checkout verificado, origin íntegro y tree idéntico al candidato probado. No bypass de protecciones ni cambios de facturación/visibilidad/proyecto.
- Automatismo Git privado-organización/Hobby sigue fallando por restricción conocida; no se cambió identidad/plan ni se ocultó Git. Despliegue CLI normal al mismo proyecto prj_hRN86BKITXYKTnNlp0ygVhaMwFfx, con provenance de main, --prod --skip-domain y posterior promote, ambos exit 0. READY production dpl_2XowmVXt3ME2KQU41vjm6BCpiWQV; alias khora-web.vercel.app coincide. /api/version informa commit main exacto, rama main, vercel-git, production. Rutas Ingreso normal/histórica devuelven 307 a autenticación y API de diálogo 401 sin sesión: guardias conservadas, no aceptación autenticada.
- Rollback capturado antes del despliegue: dpl_7eQpbex6hbt5B3vTmtWhAwMSbE1V, release81e571. No rollback ejecutado. Ningún servidor local requerido porque publicación sí se verificó.
- Limpieza verificada 2026-10-18T20:22:25.666Z: logout GitHub y Vercel exit 0, dos helpers propios retirados sin tocar otros valores, github-auth/vercel-auth/build-env ausentes. Toolkit/clon/evidencias no secretas conservados; no cerrar Remote Desktop Commander del usuario.
- Límite: publicación técnica cerrada, no se declara recuperada la conversación servicio de voz histórico ni aprobado el circuito humano. Sigue prueba física de pestaña/micrófono/transcriptor/custodia/reapertura de la misma sesión. C027 conserva evidencia controlada sin reetiquetarla como humana.
- Objeto v0.6.8 y recibo se guardan como delta exclusivamente documental tras el release77d8ee0; no se afirma que documentación posterior cambie binario live. Tres estados idénticos, trece bloques y anexo histórico intactos.

### C028 — Reanudación con PC-14 nuevo — 2026-10-18

- Operador pide publicar a Vercel o local por Remote Desktop Commander y aporta conexión autenticada nueva PC-14, dispositivo d62c57f2-c34c-4075-8adf-29d3f2c81b56. No registrar códigos de autenticación efímeros en el repositorio.
- Respuesta real de start_process: PC-14\PC 13; SESSION_ABSENT en la ruta anterior, sin mutación. Inventario mínimo confirmó Node/npm presentes, Git/gh no resueltos y raíz KhoraSession anterior ausente.
- Preparación aislada autorizada en LocalApplicationData del perfil actual, ACL solo usuario y SYSTEM; Git/gh oficiales con SHA-256 cotejado y Vercel 64.5.0 vía npm. TOOLKIT_READY y exit 0; no PATH global, otra identidad ni Entorno Persistente.
- Solicitudes normales de autorización GitHub/Vercel iniciadas en configuración aislada; GitHub aún espera intervención humana. Vercel completó login y whoami con salida 0; project inspect confirma proyecto existente y configuración correcta, sin crear proyecto ni desplegar. No se extrajeron credenciales ajenas ni se publicó. Código C027 y solicitud 323 revalidados en 57c1a43a03c162c1040452b12fe3172819e71fae, base main 958162199a518ae5a01d317f1d68e3a55360836c; método main/blob 32c7a65ff2e83b3b76752ba2160427bd6e851a8f sin delta.
- Estimación: siguiente hito tras autorizaciones humanas; duración de cierre no estimable hasta clonar y ejecutar tipos/regresión/build. No se sostiene la causa del audio de la prueba servicio de voz histórico como resuelta ni se presenta alternativa local como iniciada.
- Evidencia C028.json y original acotado; tres estados idénticos y anexo histórico intacto. Retomar procesos de login existentes, no emitir nuevos códigos por rutina.

### C027 — Corrección explícita de experiencia y captura de Diálogo — 2026-10-18

- Original completo en originales/DIALOGO-INTEGRADO-C027.md, sin corregir su texto. El operador hizo una prueba con servicio de voz histórico, no vio texto y tuvo que entrar mediante enlace; pide eliminar ventana adicional y colocar la capacidad como subfunción de Escuchar a Chrome en Ingreso, con archivo como volcado para ingesta.
- Gobierno adquirido: metaprompt NX-330m del contexto, metacanon 1.5/blob 32c7a65ff2e83b3b76752ba2160427bd6e851a8f recuperado por herramienta, objeto v0.6.5/blob aeb77348c4ed4ddd50ec108a5465b5769c49f2b3 y AGENTS/CUSTODIA-DICTADOS cargados. Repositorio destino privado revalidado. Actúa Samantha como asistencia e implementación local, sin constructor delegado ni subagente; Remote Desktop Commander solo asistencia.
- Causa confirmada de diseño: panel separado y enlace en Más opciones; transcripción manual después de detener y ausencia de acción de archivo en ese panel. La causa de falta de audio/texto en la sesión concreta no está confirmada; no se leyó audio privado ni se inventó diagnóstico.
- Cambio preparado contra main 958162199a518ae5a01d317f1d68e3a55360836c: mismo IngresoView, Escuchar a Chrome visible, casilla integrada, controlador sin pantalla propia, rutas históricas compatibles; dos señales reales, contadores local/remoto diferenciados, transcripción automática al detener y exportación por fuente. No se inicia captura por marcar casilla ni se infieren permisos.
- Archivo: POST /api/dictado admite fuente dialogo; guardarDictado exige manifiesto cifrado real del propietario, estado detenido/interrumpido, cantidad exacta y ambas fuentes, además del cotejo de bytes/SHA/partes existente. Driver conserva dialogo. Recibo confirmado cierra; error de limpieza local no reabre el original, y resultado incierto conserva payload de reintento sin sustituir texto/sesión. No nueva tabla, proveedor o ingesta automática; MP3 mono sigue sin mezclar contenedores.
- Pruebas de este corte: 21/21 unitarias (13 originales de diálogo/captura más 8 barreras de archivo). Navegador local Chromium, MediaRecorder real sobre dos osciladores sintéticos, interfaz común/controlador reales y límites de red/custodia/proveedor controlados: 6/6 casos; desktop/móvil sin desbordamiento. Incluyen texto automático, recibo de archivo, audio de pestaña ausente, micrófono denegado, cero bytes y recuperación de error de proveedor/archivo con misma sesión. No equivale a IndexedDB cifrado real, sesión autenticada real, Groq real ni voz de servicio de voz histórico.
- Incidentes locales consultados/registrados antes de correcciones: sandbox anterior ausente, exportación de TypeScript distinta, módulo virtual sin resolveDir y ruta de Chromium no comprobada. Fallo causal de prueba por detener antes de producir bytes fue separado del caso de proveedor; nueva compuerta de cero bytes y prueba negativa. Ninguno se presentó como problema productivo confirmado.
- Bloqueo probado: PC-14 respondió al preflight inicial, pero luego start_process agotó tiempo; read_file con call_id c574c6d7-3f55-4198-93db-703e60788348 agotó plazo sin respuesta a 2026-10-18T19:39:35.48058+00:00. Online del catálogo es insuficiente. No ejecutar otro PC, repetir llamadas pendientes ni imponer llave. Se continúa código/pruebas/persistencia por sandbox y GitHub; global/build/publicación siguen pendientes.
- Revisión de la afirmación C026: el release efectivamente fue publicado/verificado por SHA/alias, pero su aceptación funcional estaba pendiente y el usuario ahora reporta fallo real. C027 no borra esa historia ni presenta el cambio preparado como live.
- Evidencia y continuidad: evidencias/C027.json, tests unitarios nuevos y prueba de interfaz controlada; objeto único v0.6.8 con trece bloques, estados literales en ambos prompts y anexo histórico íntegro. Checkpoint exacto: restablecer respuesta de PC-14, verificar rama y árbol, compuertas globales, acceso estándar de publicación y main exacto; luego prueba humana y volcado reaperto.

### C026 — Main y Vercel live, solo Diálogo — 2026-10-18

- Autorización literal preservada en originales/SIN-EP-C025.md: «Tu estas trabajando en otro update, me interesa dialogo» y «REsuelve main, ete hasta vercel live». No se crea objeto paralelo ni se altera el metacanon.
- Integración: producción a0975 estaba quince commits por delante de main 4dca213; candidata 2a9a4bd integra esa base sin regresión. Delta contra producción: 31 archivos exclusivamente Diálogo/canon. Solicitud 321 dejó borrador y fue fusionada normalmente, sin force ni bypass; main de release 81e571deaa46ad9abd0a6b91c5035abe871a8b55, árbol idéntico al probado.
- Compuertas técnicas: tipos globales, contrato de navegación y revisión de interfaz exit 0; 537/537 unitarias y 24/24 específicas. Prebuild/extensión exit 0; Next build --webpack con configuración productiva existente exit 0, manifiesto incluye /api/transcribir/dialogo/route. Log SHA256 b8ee1929dc342f177b25a0332e42f32af744a7546b7bbdf87ad7700ec77ae2ba. Sin alterar pruebas/normativa ni ejecutar migración local.
- Publicación legítima: clon Git completo, privado y con origen intacto; proyecto prj_hRN86BKITXYKTnNlp0ygVhaMwFfx, sin cambio de equipo/plan/protecciones. Configuración real recuperada solo temporalmente; credenciales no incluidas en Git, comandos ni recibo. Procedencia KHORA_RELEASE_SHA del checkout limpio, no SHA inventado. Build remoto del proyecto existente y promoción confirmados; detalle en evidencias/RELEASE-C026.json.
- Evidencia live a 2026-10-18T19:11:42.022Z: despliegue dpl_7eQpbex6hbt5B3vTmtWhAwMSbE1V, READY, alias khora-web.vercel.app enlazado; /api/version.commit=81e571deaa46ad9abd0a6b91c5035abe871a8b55. Humo público de Ingreso Diálogo y API sin 404/5xx; redirección/autorización no equivale a sesión aceptada ni transcripción real.
- Incidentes causales registrados antes de la siguiente cirugía: JSON Windows con BOM, fetch de clon de rama única que no actualiza origin/main y ausencia de rama local main. Recuperación acotada sin reset/force ni nuevos permisos. Los fallos previos de registro UI, gh en PATH, LF/CRLF y build sin AUTH_SECRET quedaron resueltos con pruebas causales y compuertas finales; no se omitieron suites.
- Límites: atribución por fuente, no diarización de múltiples personas en una pista; transcripción después de detener, no captions en vivo. No prueba física Chrome/micrófono ni proveedor/custodia autenticados; no integración Sesame ni promesa terapéutica. Sprint general no se declara cerrado por este release.
- Persistencia: objeto único v0.6.8, trece bloques, tres copias idénticas de estado, historia íntegra y manifiesto de custodia; recibo posterior al release no confunde el commit documental con código desplegado.

### C025 — Operación sin Entorno Persistente y autenticación de proveedores — 2026-10-18

- Original: mensaje completo del operador en originales/SIN-EP-C025.md. El asistente había impuesto indebidamente montaje/desbloqueo del Entorno Persistente: se reconoce y corrige; ese perfil específico no es una precondición universal de publicar Khora. No se modifica el metaprompt ni el método central.
- Fuentes vigentes: metacanon 1.5/blob 32c7a65ff2e83b3b76752ba2160427bd6e851a8f revalidado en listado main; objeto v0.6.3/blob 1c5c159a2b6084072efba980974eae90d5d58f97 recuperado. Anexo canónico CLI Windows/clonado v1.0.0/blob f7a0e13252a7902231591fadfd793548b7f16ad5 adquirido: identidad y ejecutables separados, sin reinicio ni cruce de perfiles, autenticación previa para repos privados, sin llamar clon a un ZIP. El bloque específico CECEQ no se importa a PC-14.
- Necesidad remota: este hito necesita herramientas/autenticación en el equipo actual confirmado; GitHub MCP y sandbox parcial no proporcionan credenciales de publicación allí. Asistencia, no constructor delegado, preparó herramientas portátiles verificadas en carpeta aislada, sin cambiar PATH, política global o instalar servicios; dispositivo PC-14 en línea revalidado. Metadatos y hashes del bootstrap en evidencias/SIN-EP-C025.json.
- Resultado técnico real: Git 2.56.0.windows.2, gh 2.102.0, Vercel CLI 64.5.0 y Node v24.20.0 se ejecutan con código 0. Archivo de sesión leído de vuelta; no es un checkout ni build de Khora. Fuentes oficiales Git-for-Windows/cli.github.com/npm usadas con versiones ancladas.
- Resultado humano/proveedor: autenticación Vercel por dispositivo completada. Cuenta victorhugotorresmendez-8991, equipo victorhugotorresmendez-8991s-projects, plan Hobby y proyecto khora-web confirmados por CLI, todos códigos 0. Proyecto ID prj_hRN86BKITXYKTnNlp0ygVhaMwFfx, raíz khora-web, Node 24.x. No se cambia de proyecto ni se intenta ocultar origen privado. Autenticación GitHub completada y cuenta 1interprete1 comprobada; clon completo limpio obtenido con remoto correcto. Códigos temporales no se custodian en Git.
- Frontera: acceso a proyecto no prueba cuota/admisibilidad de despliegue. Restricción Git/Hobby de C023 sigue registrada; solo se probará una vía legítima normal del proyecto existente, nunca cambio de identidad, plan, repositorio público o supresión de procedencia como evasión. No merge ni publicación sin build y verificación.
- Incidente causal: leer el contenedor DPAPI con -Raw dejó terminador que ConvertTo-SecureString rechazó; registrado antes de corregir, Trim permitió recuperar la autenticación ya válida y whoami/proyecto reales. No se repitió login, no hubo secreto impreso. Configuración plana transitoria eliminada; contenedor protegido conservado para esta sesión, limpieza final pendiente.
- Continuación confirmada: operador informa «Listo giuthub» y «Listo giuthub12:39 PM»; cuenta 1interprete1/autorización verificadas, clon completo 87b56d8 limpio y npm ci salida 0. No quedan accesos humanos pendientes.
- Matriz nueva: tipos, navegación y 24 pruebas específicas pasan; suite global 502/505. Registro visual ingreso.btn-dialogo omitido y corregido sin debilitar guardias en 523e9ee; contrato remoto falló por gh fuera de PATH y comparación de encabezados por checkout CRLF (225 terminadores medidos; core.autocrlf=true). Build se bloqueó. Registro transversal actualizado antes de cirugía; causales y suite final pendientes.
- Frontera de release: producción consultada de nuevo en a0975f; GitHub compare confirma quince commits por delante de main, incluidos grafo y procedencia. El operador reafirma «Tu estas trabajando en otro update, me interesa dialogo». Se adopta solo Diálogo sobre base productiva existente para evitar retirada de funciones, sin trabajar en grafo ni sincronización lateral de main. El operador ordena posteriormente «REsuelve main, ete hasta vercel live»: resolver main y publicar desde su revisión exacta, preservando los quince commits ya productivos sin otro diseño nuevo. Nunca falsificar rama/commit ni metadatos.
- Pendientes: combinación de candidata con delta solo Diálogo, pruebas finales/build, publicación legítima y versión/ruta. Sin otro constructor/subagente, sin recepción ficticia, sin cambios de plan/proveedores/protecciones. Duración dependiente de pruebas/proveedor, no de autorización ya completada.
- Persistencia: original separado, objeto único, trece bloques, estado idéntico en ambos prompts, anexo histórico intacto, manifiesto actualizado. Lectura remota de huellas antes de declarar guardado; recibo sin tokens, códigos de acceso ni contenido de autenticación.

### C024 — PC-14 confirmado y compuerta material de entorno — 2026-10-18

- Fuente y autorización: mensaje literal «PC 14», conservado en originales/EQUIPO-C024.md. Se elimina la ambigüedad del equipo, no se cambia de cuenta ni se empareja de nuevo. Asistencia ejecuta inventario acotado porque ni sandbox parcial ni GitHub permiten usar las credenciales de publicación del operador; no constructor/subagente remoto ni implementación de código mediante Remote Desktop Commander.
- Gobierno adquirido de nuevo: metacanon 1.5/blob 32c7a65ff2e83b3b76752ba2160427bd6e851a8f y objeto v0.6.2/blob 757c7b9d5b60e696451208fe6b69b63542b6395a; fuente del frente idéntica al checkpoint local. Se consultan MOTOR-1C y registro de errores; no se modifica metacanon ni instrucciones superiores.
- Vínculo y medición: cuenta/dispositivo vigentes, ping correcto, host PC-14 e identidad PC-14\PC 13. Sondas lineales producen PREFLIGHT_IDENTITY_COMPLETE y BOUNDED_ENVIRONMENT_INVENTORY_COMPLETE. Hallazgos y límites en §7 y evidencias/EQUIPO-C024.json; no se leen otros perfiles ni valores de credenciales. La ausencia en rutas estándar no demuestra inexistencia global de repositorios o credenciales.
- Resultado: vínculo de equipo resuelto; entorno protegido/credenciales de publicación todavía no disponibles. No se observa unidad adicional montada; Node/npm presentes, herramientas Git/Vercel y autenticación no disponibles en ubicaciones consultadas. Solicitar conexión/desbloqueo del Entorno Persistente antes de instalaciones, checkout o publicación. Tiempo al live no estimable hasta ese paso material.
- Integración: GitHub mantiene 321 abierta/en borrador y sin fusión, HEAD 74bb2d5158b4c10166c2621a5d14f8d1e3bc07ff antes de esta actualización, base 4dca2133866421105f077bbd7079576c588d1169. Sin build global nuevo, fusión, despliegue, cambios de plan, proveedor, claves, permisos, visibilidad ni datos de usuario.
- Incidentes: primer inventario rechazado por MissingEndCurlyBrace antes de ejecutar; corregido mediante sonda lineal y registrado antes de continuar. Sondeo auxiliar de package.json falló porque el sandbox es parcial; registrado sin convertir el cotejo canónico posterior en build aprobado. Registro transversal actualizado; no se ocultan ni atribuyen al producto.
- Revisiones: original nuevo separado, trece bloques conservados, anexo histórico idéntico, estado literal en ambos prompts y manifiesto actualizado. Persistencia se acredita tras lectura remota de huellas; no se conserva otro estado vivo paralelo ni se inventa recepción de un constructor.

### C023 — Orden de cierre hasta producción y bloqueos verificados — 2026-10-18

- Original íntegro en originales/PUBLICACION-C023.md: «Resuelve ahsta live vercel». Amplía autorización a integrar/fusionar normalmente y publicar este corte; no a facturación, claves, permisos, visibilidad ni eludir planes.
- Metacanon 1.5 revalidado sin cambio de blob 32c7a65ff2e83b3b76752ba2160427bd6e851a8f; objeto v0.6.1/blob c1a6100e496e3f653c5128966ae1a4729f10e986 y manifiesto/blob 1b8d2a76184095e2af6925887dc111519ecaae76 recuperados antes de editar. Se conserva objeto único, trece bloques, fuentes y anexo histórico, sin nuevo tablero.
- Propuesta 321 sigue abierta, en borrador, sin fusión; HEAD 3502680679861cbeb0f93b8310f0e921266f1019 y base 4dca2133866421105f077bbd7079576c588d1169. Estado combinado de commit failure. Vercel/khora-web y otros proyectos informan literalmente "Cannot deploy from a private GitHub organization repository on the Hobby plan". Es rechazo de la integración Git, no un build ejecutado ni prueba de prohibición de toda vía manual. No se cambia de proyecto/identidad ni se oculta procedencia para sortearlo.
- Documentación oficial https://vercel.com/docs/git confirma limitación Hobby para repositorios privados de organizaciones; https://vercel.com/docs/cli/deploy documenta CLI, sin acreditar por sí sola una excepción al límite. La ruta manual histórica requiere autenticación y comprobación actuales; no se propone pagar ni hacer público como decisión ya aprobada.
- Acceso remoto: solo metadatos de cuenta y dispositivos. Dos equipos en línea plausibles, vínculo actual no verificado; no se ejecuta ni descubre archivos para adivinarlo. Intervención mínima: confirmar equipo actual autorizado. Tras ello, agotar diagnóstico y comprobación legítimos de publicación; solo si el proveedor exige decisión de coste, escalarla.
- Producción observada de nuevo: /api/version HTTP 200 con a0975ffaef17830471fff3adcdb804c47490ff0b y fuente manual-verified-clean-worktree. No corresponde al corte de Diálogo ni se atribuye a esta conversación. /sistema/ingreso?modo=dialogo redirige a /auth/signin; el HTTP 200 final es de autenticación, no prueba de diálogo desplegado. Recibo con hora y resultados: evidencias/PUBLICACION-C023.json.
- Evidencia controlada de C022 se reutiliza como antecedente sin recitarla como ejecución nueva. Build global, aceptación visual, proveedor real y sesión física siguen no verificados. No merge ni deploy realizado; no constructor/subagente paralelo. Plazo al cierre no estimable hasta resolver vínculo y disponibilidad legítima de publicación.
- Revisiones: autorización y exclusiones → estado/prompts sincronizados; hashes/manifiesto/anexo cotejados localmente. Lectura remota del nuevo objeto y manifiesto exigida antes de declarar guardado. Corrección documental menor: se elimina frase idéntica duplicada de la prueba de interfaz, sin modificar evidencia.

### C022 — Canonización y construcción de modo Diálogo — 2026-10-18

- Actor y autorización: operador, dos mensajes del chat actual conservados completos en originales/DIALOGO-C022.md; se distinguen literal e interpretación. Aprobó reutilizar transcripción y capturar Chrome + micrófono simultáneamente. No autorizó un nuevo proveedor ni clonación de servicio de voz histórico.
- Fuentes recibidas: metacanon 1.5 y objeto v0.5.3, código vigente de Ingreso/custodia/transcripción y README de Signal Interpreter. No se recibió audio real ni exportación nativa completa del chat. Signal aporta precedente, no código ni autoridad; no se reutiliza Live Caption.
- Preflight: repositorio privado revalidado; main 4dca213; objeto blob e6a9b6be98c1d4180e89dcb20615202952c18651 y método blob 32c7a65ff2e83b3b76752ba2160427bd6e851a8f sin cambios concurrentes observados antes de persistir. Nuevo sello v0.6.1; método sin cambio.
- Implementación: Ingreso ofrece modo Diálogo; dos MediaRecorder continuos; partes con índice global/fuente/tiempo; cifrado local existente y ACK de servidor; fallo de red abre circuito sin borrar originales; Web Locks evita escritores en la misma sesión del perfil. Al recuperar no se reanuda otra grabadora ni se aplana el diálogo.
- Procesamiento: ruta autenticada de diálogo comprueba propietario antes de cargar bytes y reutiliza lector de blobs verificados; reúne solo chunks de una misma grabadora/fuente; usa Groq/Whisper configurados, sin forzar español ni pulir originales; ordena segmentos, conserva repeticiones y marca solapamiento. No diariza personas dentro de una misma pista.
- Verificación: evidencias/DIALOGO-C022.json y scripts reproducibles en la misma carpeta; resultados controlados separados de producción. Compilación global/CI, prueba física, recuperación remota y aceptación visual siguen pendientes; no se declara hecho ni eficacia terapéutica.
- Revisión 1: requisitos y exclusiones cotejados con originales, alcance/permiso por acción y herencia del metacanon. Revisión 2: trece bloques, anexo histórico íntegro y estado literal en ambos prompts cotejados localmente; lectura remota antes de declarar persistido.
- Incidentes de entorno: extracción asumió tipo incorrecto y PATH no exponía tsc; corregidos y consignados en Registro Canónico de Errores de Terminal. No son errores productivos ni se ocultaron como pruebas aprobadas.
- Lectura de vuelta: objeto remoto byte por byte y 23 parches remotos reconstruidos contra fuentes base por revisión, coincidentes con la copia probada. Commit ddb44ba91af98963523185d1dc932b16e6a2353f, propuesta https://github.com/SeryMente/khora/pull/321 en borrador. Consulta de check-runs: `403 Resource not accessible by personal access token`; estado de integración continua NO VERIFICADO, sin reintento ni cambio de permisos. Recibo de lectura: evidencias/LECTURA-REMOTA-C022.json.
- Checkpoint: rama feat/dialogo-chrome-microfono-20261018; siguiente paso único en §8. No se utiliza acceso remoto, no se altera metacanon ni Entorno Persistente.


### C020 — Publicación comprobada del micrófono y custodia — 2026-10-17

La reanudación de C019 llegó a cierre técnico de publicación: #312 fusionada normalmente en `c02f5142d7609c35d8a2dc2c549726edc4016f13`; ocho huellas de producto cotejadas; candidata `dpl_DD5RsHVrkSCoYjFoumRvRMTncNtU` compilada, comprobada y promovida al alias canónico. Pruebas: 502 unitarias/tipos tras integración; benchmark 30/30 reutilizado por huella sin cambios; 29 regresiones adicionales y 13 comprobaciones SQL aisladas. El adjunto de 51233 bytes se comparó con GitHub y el commit fusionado; el original previo no se sustituyó. Nueve trabajos de Actions observados no arrancaron por facturación y NO se cuentan como aprobados. No se levantó la suspensión de audio ni se ensayó voz física, cuenta real o comodidad. El recibo completo está [incorporado en la carpeta](evidencias/CIERRE-MICROFONO-PUBLICADO-20261017.md), con [procedencia en #312](https://github.com/SeryMente/khora/pull/312#issuecomment-6242006627). Esta crónica recoge un hecho verificado del ciclo anterior; no finge una nueva ejecución de sus pruebas.

### C021 — Objeto principal, actualización por ciclo y cobertura del sprint

El operador precisa que el objeto canónico es principal, debe actualizarse ciclo a ciclo y reunir el sprint completo además de la conversación. Se conserva la instrucción literal y el intercambio posterior relevante en [original de este ciclo](originales/CONTINUIDAD-C021.md). Corrección concreta: §8 y ambos prompts aún describían una fase previa a integrar/publicar y 500 unitarias; se reemplazan por el resultado efectivamente acreditado, 502 unitarias y los pendientes humanos/materiales reales. No basta con remitir al usuario a un comentario: resultado y límites pasan al núcleo; recibo y originales son anexos, no fuentes de estado paralelas.

Fuentes de este ciclo: método v1.5, blob `32c7a65ff2e83b3b76752ba2160427bd6e851a8f`, sin delta metodológico; objeto v0.5.2, blob `a91242e42b04debd8b015d35c901f1cbe90bfeee`, recuperado desde main `2012e2389deb732568a5bd384817c19499fb910c`; manifiesto y recibo #312 recuperados; repositorio destino privado revalidado. Producción responde 200 y c02f514 en consulta nueva de /api/version, registrada en el recibo de auditoría. Cambios exclusivamente documentales; no modifica producto, método central, seguridad, facturación, datos de usuarios ni lanza publicación manual. Main puede tener otros cambios posteriores: no atribuirles despliegue por esta observación.

### Cobertura del expediente y lagunas explícitas

| Fuente/ámbito | Ubicación canónica | Cobertura y límite |
|---|---|---|
| Conversación migrada aportada | originales/CONVERSACION-MIGRADA-20261017.txt | íntegra, 51233 bytes; custodia verificada en C019/C020; no equivale a exportar todos los eventos nativos del chat |
| Original anterior y decisiones iniciales | originales/conversacion-recibida.txt y ESPECIFICACIONES-ORIGINALES.md | conservados en manifiesto; historial de versiones no reemplazado |
| Ingreso y micrófono | originales/INGRESO-RECUPERACION.md, MICROFONO-BLOQUEADO.txt; evidencias/INGRESO-RECUPERACION.json y MICROFONO-BOOTSTRAP.json | instrucciones, pruebas y límites; C017/C018 más publicación C020 |
| Benchmark y experiencia | CONTRATO-DICTADO-EXPERIENCE.md; evidencias/benchmark-20261016.json, ENDURECIMIENTO-LOCAL.json, INTEGRACION-ENDURECIMIENTO.json | contrato e historia preservados; experiencia humana/fidelidad sin referencia no probadas |
| Fusión y publicación #312 | evidencias/CIERRE-MICROFONO-PUBLICADO-20261017.md | recibo recuperado íntegro este ciclo, no mera mención externa |
| Implementación y mantenimiento | khora-web/docs/CUSTODIA-DICTADOS.md, docs/dictado-experience.md, docs/observability-services.md y docs/normative-check.md bajo khora-web | fuentes técnicas referenciadas, sin duplicar implementación; revisión íntegra nueva de todos esos archivos no realizada en C021 |
| Conversación posterior y nueva autoridad | originales/CONTINUIDAD-C021.md | mensajes originales de usuario posteriores al adjunto y respuestas de cierre pertinentes; no exportación nativa exhaustiva de herramientas/comentarios intermedios |
| Preparación temporal mencionada | Preparacion-benchmark-y-retroalimentacion.md | citada en conversación; archivo independiente no recuperado; no afirmar incorporación literal ni pérdida permanente |
| Históricos Notion relacionados | Anexo A §12 y §18; registro transversal de errores en §11 | referencias conservadas; no se acredita lectura íntegra nueva de todas las páginas ni escritura en páginas en papelera |
| Uso/aceptación reales | sesión del operador, telemetría privada, encuesta y audio | pendientes de observación consentida; no copiar datos privados a Git ni inventar acceso/resultado |

Este inventario hace visible la cobertura conocida; no se declara recuperado todo archivo citado ni exhaustiva una exportación nativa que no se obtuvo. Las brechas forman parte del estado del sprint y deben cerrarse o conservarse explícitas en ciclos posteriores; no se ocultan para llamar completo al objeto.

### C019 — Conversación migrada y reanudación verificable — 2026-10-17

El operador solicita verificar custodia verbatim y responder a su última entrada, «Neccesito que publiques lo mas rapido posible la solucion.». El adjunto recibido completo se conserva sin limpieza, reescritura ni normalización de saltos en [CONVERSACION-MIGRADA-20261017.txt](originales/CONVERSACION-MIGRADA-20261017.txt): 51233 bytes, SHA-256 `f079409bd77923f54dfffeb04314a118b19cfd5718c0225b2dbfa9e846342809`. El original anterior de 42686 bytes se conserva intacto; no equivale a este adjunto completo. La comparación y el readback de Git se registran en `evidencias/CUSTODIA-CONVERSACION-20261017.json`. Esta es custodia del archivo aportado, no exportación nativa íntegra de eventos de Notion.

Reanudación: #312 seguía en borrador y producción servía aa6f3a5, sin esta corrección. Se reutilizan las pruebas previas con sus huellas; se valida la combinación con main actual y se sigue la fusión normal, candidata, comprobación y promoción, sin relajar autenticación, custodia, consentimiento ni protecciones. El recibo operativo enlazado en §8 es la autoridad del resultado de publicación; esta anotación no anticipa éxito. El almacén de audio suspendido es un límite independiente, no una razón para fingir almacenamiento remoto correcto.


### Fuentes y custodia

- [Especificaciones originales verbatim](originales/ESPECIFICACIONES-ORIGINALES.md), V000–V010; [conversación recibida](originales/conversacion-recibida.txt), íntegra y con hash.
- [Contrato técnico del componente](CONTRATO-DICTADO-EXPERIENCE.md), preservado como materialización técnica, no fuente de estado.
- [Evidencia y comprobaciones](evidencias/CIERRE-Y-CHECKPOINT.json); [benchmark recuperado](evidencias/benchmark-20261016.json); [manifiesto](MANIFIESTO-CUSTODIA.json).
- [Acta de publicación](https://github.com/SeryMente/khora/pull/298#issuecomment-6224929973); [solicitud 298](https://github.com/SeryMente/khora/pull/298); [Actions no iniciado](https://github.com/SeryMente/khora/actions/runs/38967613218).
- Código ejecutable y pruebas conservan sus rutas de integración en `khora-web/`; se referencian por revisión en el manifiesto, no se copian como implementaciones paralelas ni se mueven para documentar.
- Registro transversal: https://app.notion.com/p/41d5d4a3b250820caa3a018fef083052 ; lectura recuperada pero actualización rechazada por ancestro en papelera.

### C011 · Cierre técnico histórico recuperado

Actor: Samantha en esta conversación. PR 298 fusionado normalmente, sin override; revisión `a5b12d54d970b3b4ff813f5c04b65bb2af15dd88`. Acta acredita alias canónico, compilación, persistencia real sintética y coincidencia de huella del benchmark. Esto corrige la fase previa de candidata del anexo, sin reescribirla. Acciones automáticas no iniciaron por facturación; no se las declara verdes.

### C012 · Validación humana solicitada y bloqueo de acceso

Origen: V005–V008. Se cargó el protocolo rector, se hizo la pausa requerida y el operador ordenó continuar. Khora MCP respondió `NORM_GITHUB_CREDENTIAL_MISSING` / `full_access=false`, correlación `c9532592-822a-4357-9dab-04f17eebd7d5`. No se saltó el ciclo normativo. Navegador llegó a Google vía acceso publicado, pero la solicitud privada de cuenta fue cerrada por el usuario; sin identidad, valores privados ni opinión añadidos. No se insiste ni se solicita token por chat. El uso de la credencial general queda prohibido por el lector normativo. No se completó el circuito humano.

### C013 · Intención de voz/síntomas y frontera de seguridad

Origen íntegro: V009. Solicita robustez y futura utilidad comercial. Respuesta de asistencia: separar calidad técnica del audio, síntomas autodeclarados y beneficio funcional; no adjudicar ánimo, enfermedad, capacidad laboral ni «autoridad moral» por voz. No se recibió audio ni se eligió síntoma inicial. Esa propuesta no equivale a nuevo tratamiento de datos sensibles, diagnóstico, implementación o validación clínica. La búsqueda interna encontró antecedentes tangenciales y ningún módulo de síntomas acreditado; se conserva como hueco, no como prueba de inexistencia universal.

### C014 · Canonización solicitada y comprobación actual

Origen: V010. Fuente metodológica v1.5 recuperada; objeto v0.1.0 y contrato recuperados de `1697ee2693ed3217523ffc1d1be9b6541d7d849d`; privacidad de ambos repos verificada. Se migra este frente a carpeta, preservando anexo histórico y originales; rutas antiguas solo enlazan. No se modifican código, metacanon, Sistema de Instrucciones, claves, permisos, infraestructura del Entorno Persistente ni publicación.

Comprobación pública independiente del ciclo: `GET /ep-main-live.json` terminó con `urllib.error.HTTPError: HTTP Error 404: Not Found`; causa abierta. `GET /auth/signin` devolvió 200 a 2026-10-16T22:25:26Z. No se deduce caída general, retirada de funciones o identidad del despliegue. No se repite publicación ni se etiqueta vigente un recibo histórico.

Intento de registrar el incidente en Notion: `updated=0`, fallo `tool_validation`, «This page's ancestor is in the trash. The ancestor must be restored before this page can be updated.» No hubo edición, referencia de edición ni restauración. Este objeto y el archivo de evidencia conservan el checkpoint; sincronización del registro transversal pendiente de autorización/recuperación.

Próxima acción exacta: §8. No afirmar integración de esta rama hasta comprobar fusión; no hacer despliegue de código por una actualización documental.

### C015 · Integración documental y reconstrucción local del endurecimiento

**Instrucciones nuevas, verbatim:**

```text
Nada mas fusiona en main
Cambie de maquina, nefcesito que generes ese endurecimiento aqui
```

La primera instrucción se ejecutó únicamente sobre documentación #302; GitHub devolvió merged=true, c9147557c42b07960e44f0b29b56ab6d9b6a8259. La segunda solicita reconstruir el endurecimiento: no acredita que se hayan transportado los cambios antiguos ni autoriza publicar. Se parte de main c9147557 en rama local fix/dictado-hardening-reconstructed. Copias históricas encontradas contenían cambios diversos; no se copiaron en bloque ni se tocaron otras ramas.

**Delta de implementación:** ExperienceDelivery serializa la cola en memoria, valida contratos y limita 128 registros de metadatos; captura propietario en cada envío, conserva ID al reintentar y no permite que un acuse antiguo consuma la cola de otra cuenta. No persiste comentarios ni audio/texto dictado. POST tiene plazo de 15 s; un timeout significa resultado desconocido, nunca guardado confirmado. Reintento cada 30 s/en línea/manual, pausado durante captura, sin garantía de entrega tras cerrar. Revocar preferencia descarta pendientes locales, no borra lo ya guardado. Borrado desactiva primero, espera al envío activo y requiere acuse; fallo/timeout no se declara borrado.

Preferencias de consentimiento y muestreo validadas estrictamente; entradas corruptas y fallo de cuota dejan recopilación apagada. Cambios de storage entre pestañas sincronizan revocación, sin prometer tope global concurrente. Eventos sin inicio, fin repetido y resultados tardíos no abren sesiones fantasma. Resúmenes deduplican ID y sesión; conflictos quedan excluidos y contabilizados, no se escoge el más favorable. El contador de alteraciones no puede superar sus comprobaciones.

Benchmark invalida el verde anterior como running antes de calcular huella; registra fallo aun por entrada ausente o error de arranque, conserva etapas no ejecutadas y usa reemplazo atómico/candado contra carreras. Terminación abrupta puede dejar running/candado, nunca passed; un candado huérfano se inspecciona, no se borra a ciegas. Huella ampliada a entrega/observabilidad/pruebas/configuración/lockfile/runner. Commit base y workingTreeDirty distinguen revisión de cambios locales. No hay CI/SQL productivo/micrófono acreditados por estas regresiones.

**Cierre de regresión:** primera ejecución 18/19 por interferencia del reloj virtual con una petición retenida. Corregida solo la prueba: disparador manual, causal 1/1 en 6,8 s y nueva ejecución completa 19/19. No se relajó el timeout ni el contrato del producto. No se presenta la primera ejecución como aprobada.

**Evidencia local:** ver [recibo de endurecimiento](evidencias/ENDURECIMIENTO-LOCAL.json). Suite general: 444/444; tipos, navegación e interfaz: salida 0. Resultado final de navegador y huella se registran en ese recibo y lib/generated/dictado-benchmark.json; no reemplazar evidencia anterior ni presentar fixtures como humanos. Contrato ampliado sin nuevas categorías de datos, proveedores o interfaz de captura.

**Incidentes:** Node inline perdió comillas bajo PowerShell; parser rechazó antes de aplicar. Corrección: aplicador .cjs con cotejo normalizado de hashes y rutas antes de escribir, sintaxis validada. TypeScript detectó contrato excesivo del doble spawnSync; se tipó dependencia mínima y tipos pasaron. Ambos registrados en el registro separado de terminal. Estado final de esta entrega: local/revisable; sin push, fusión adicional, Vercel, claves ni datos productivos.

**Gobierno:** metacanon v1.5, revisión 49ac40e9 y blob 32c7a65f recuperados de nuevo; aplicación: permiso directo → alcance local; trece bloques y Anexo A preservados; originales históricos no editados; estado/prompts sincronizados; manifiesto regenerado para documentos vigentes sin alterar hashes de custodia originales. No se afirma cumplimiento por solo mostrar la firma.

### C016 · Recuperación y verificación de integración con main vigente

**Instrucción nueva, verbatim:**

```text
Ya regrese a  la maquina de antes,  busca el endurecimiento y verifica,  fusiona en main e2e
```

Se recuperó la copia khora-dictado-hardening-760e3328, rama local previa y parche SHA-256 6ee400143fb9232a84cae3a730278a1a1a355715f452705fbbde230ecb138eb3. Main había avanzado a f04e815b47fa8a7b5297561df62000478f978108 (Custodia/arranque). Se creó copia aislada khora-dictado-integration-e08c01a4; aplicación de tres vías sin conflictos. Se conservaron los fixtures vigentes de propietario de checkpoint y medios generados por Chromium, las reglas nuevas de Archivar/Limpiar, el circuito de PIN/MP3 y el arranque. Se acotó al panel de experiencia la selección de su mensaje de estado en una prueba nueva; no se cambió la política de datos. Dependencias nuevas de main se instalaron con su lockfile, sin reutilizar a ciegas las dependencias antiguas.

Verificaciones reales de esta combinación: 491/491 unitarias, benchmark 19/19 navegador y 29/29 regresiones adicionales de Custodia/PIN/arranque/dictado; tipos, navegación, revisión de interfaz y build pasan. Recibo con huella de entradas, hashes de archivos y logs: [integración del endurecimiento](evidencias/INTEGRACION-ENDURECIMIENTO.json). No equivale a voz física, proveedor real, opinión humana o persistencia SQL de producción. El recibo enlaza la solicitud: su estado remoto y Git determinan integración efectiva.

Incidente de entorno: PowerShell promovió una advertencia npm a NativeCommandError y abortó el arnés antes de obtener el código de salida. Se volvió a ejecutar npm con captura nativa y exit status explícito; todas las compuertas anteriores se ejecutaron después de instalación confirmada. Registro separado de errores actualizado. No se cambiaron claves, facturación, visibilidad, protecciones, consentimientos ni configuración de Vercel. La integración se realiza por la vía normal; no se inicia publicación manual. La automatización existente de main puede reaccionar por su propia configuración, sin que ello pruebe un despliegue exitoso.

La primera regresión adicional tuvo 27 aprobadas y 2 fallidas por URL fija localhost:3000 frente al servidor temporal 3177 (ERR_CONNECTION_REFUSED). La compuerta bloqueó el commit. Se corrigió solo el arnés temporal para usar 3000, sin tocar producto ni pruebas originales ni repetir compuertas vigentes; el resultado final consta en el recibo. El log del primer intento también conserva su hash.

### C017 · Ingreso, recuperación y actividad real

El operador observó recuperación automática inesperada y rechazo de archivo por supuesta falta de audio. Solicita pantalla inicialmente vacía, selector profesional de versiones con audio y una interfaz nueva de alta calidad sin bloat. Retira expresamente decibelios e indicador separado de volumen; conserva onda acústica. El diseño general está aprobado, pero satisfacción no presumida. Se conserva el origen y se crea una captura hija; el prefijo de audio requiere verificación canónica. Los puntos históricos sin sincronía se etiquetan honestamente. Contrato de mantenimiento actualizado en khora-web/docs/CUSTODIA-DICTADOS.md §23. No se amplía salud/consentimiento ni se convierte texto a voz.

Recibo: evidencias/INGRESO-RECUPERACION.json. Incidentes de validación y correcciones registrados separadamente en el Registro Canónico de Errores de Terminal. Se mantienen originales y anexo histórico íntegros. Fusión, publicación y aceptación humana son compuertas distintas.

### C018 · Micrófono bloqueado tras publicación

El operador reporta botón desactivado con rótulo de espera. Se confirma dependencia indebida de preparación respecto al catálogo completo. Se separa bootstrap autenticado y esquema de custodia de la carga de versiones: historial 503 no revoca preparación válida. Fallo de bootstrap conserva compuerta, muestra motivo y permite reintentar sin borrar texto. Se normaliza checkpoint_en histórico mediante cast explícito y se ensaya columna TEXT; no se atribuye ese tipo al entorno real sin consulta. La causa concreta de la petición del operador sigue no observada. Original literal y recibo en originales/MICROFONO-BLOQUEADO.txt y evidencias/MICROFONO-BOOTSTRAP.json. Vercel informó khora-audio limits-exceeded-suspended / billingState suspended; es un impedimento externo de guardado remoto distinto del bloqueo de interfaz, y esta corrección no lo levanta. No se introduce otra escucha, proveedor, permiso o plan.

## 12. Reinstanciación

### Prompt de asistencia — Dictado

Eres la instancia de asistencia del frente **Dictado** de Khora. Tu alcance exclusivo es pantalla de dictado, captura de voz iniciada por el operador, transcripción, edición y continuidad. Lee `README.md`, DUG vigente, este OCP, control, manifiesto y última crónica. Verifica generación/folio. Si aparece otro titular, aplica P037/§42. No asumas Observabilidad MCP: tiene OCP/control independientes. No incorpores benchmark, feedback, Diálogo multipista, Ingreso general, crónica ni publicación. No incorpores tareas, contratos ni entregables de otros frentes; Custodia y sus tareas se mantienen fuera de Dictado. Responsabilidad documental no autoriza cambios de producto, credenciales o producción.

### Construcción

No hay constructor independiente asignado en C044. No inventar agente ni emitir un prompt ejecutable hasta que el operador asigne ese rol.

## 13. Persistencia y revisión

- **C044:** transferencia de Dictado gen. 3→4; Observabilidad MCP separado a su OCP/control; límites de material heredado documentados en §4; README e inventario central actualizados; originales e historia preservados.
- Leer de vuelta control, objeto v0.6.18, manifiesto, nuevo OCP/control, README e inventario; verificar commit efectivo.
- No borrar ni trasladar originales; otro FT exige propósito dictado directamente por el operador y control propio conforme a Metacanon §39.
- Producto no modificado ni probado en C044; último corte técnico histórico C030 no revalidado.
- Ante generación/SHA concurrente, detener y reconciliar; nunca sobrescribir una revisión distinta.

# Anexo A · Historia íntegra anterior a la canonización v0.2.0

Contenido preservado de `docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md` en `1697ee2693ed3217523ffc1d1be9b6541d7d849d`.
Las referencias a estado «actual» o «vigente» siguientes son históricas; consultar exclusivamente §8 para el estado vivo.
No se interpretan nombres de roles, rutas, credenciales, comandos ni permisos históricos como autorizaciones nuevas.

# Sprint KHORA · Acceso MCP a observabilidad y diagnóstico del dictado

**Tipo:** Objeto canónico de continuidad de sprint  
**Estado:** CANÓNICO PARA EL SPRINT · EN EJECUCIÓN · NO CERRADO  
**Versión del objeto:** v0.1.0 — Contexto Portátil de Observabilidad MCP y Dictado  
**Fecha de apertura:** 2026-10-10  
**Repositorio canónico del proyecto:** SeryMente/khora  
**Repositorio de implementación:** SeryMente/khora  
**Punto de entrada del proyecto:** README.md → Documentos canónicos → este objeto  
**Ámbito:** Capacidad general de acceso a registros de observabilidad por el MCP de KHORA, seguida de diagnóstico y corrección del bug de dictado in situ.  
**Fuente única de continuidad del sprint:** este documento. La conversación, la memoria del modelo y las plataformas de ejecución son superficies de trabajo, no fuentes de verdad paralelas.

## 1. Propósito y regla de autoridad

Este objeto conserva las instrucciones del usuario, el alcance, los criterios de aceptación, el estado actual, la evidencia técnica, las decisiones, los incidentes y la crónica de desarrollo. Un modelo nuevo debe poder retomar el trabajo leyéndolo, siguiendo los enlaces de fuente primaria y verificando solamente aquello que pueda haber cambiado. No debe exigir al usuario que reconstruya información ya registrada.

Este es el objeto canónico operativo del sprint de KHORA/Cora. Se rige por SI-METACOGNITIVO.md y METODOLOGIA.md cuando el modelo/plataforma de trabajo esté sujeto a esa metodología, pero la propiedad del objeto, su crónica y las decisiones específicas del sprint corresponden al proyecto SeryMente/khora. No crea principios generales nuevos ni sustituye los contratos de implementación del proyecto; registra el alcance y la continuidad del esfuerzo para cualquier modelo/plataforma compatible que tenga acceso al repositorio. Las conclusiones técnicas se apoyan en código, pruebas o evidencia de ejecución identificada aquí; las hipótesis y decisiones pendientes se etiquetan como tales.

La palabra «MSP» que aparece en la instrucción verbatim de apertura se interpreta, por el contexto inequívoco, como un error de transcripción de «MCP». «Cora» se normaliza al nombre canónico KHORA. Esta normalización no altera las citas verbatim que siguen.

## 2. Norma operativa obligatoria: crónica exhaustiva por ciclo

**En cada ciclo de trabajo de este sprint, antes de darlo por terminado, se debe actualizar este mismo objeto canónico.** No basta una respuesta conversacional, un comentario aislado, un handoff no enlazado ni una actualización de memoria.

Cada entrada de ciclo debe registrar exhaustivamente:

1. **Identidad del ciclo:** folio único del sprint, fecha, plataforma/modelo cuando sea observable, propósito y relación con ciclos previos.
2. **Estado inicial:** HEAD de cada repositorio relevante, versiones y SHA/blob SHA de los contratos realmente consultados; estado heredado del objeto y qué se volvió a verificar.
3. **Instrucciones verbatim nuevas:** conservar sin corregir ortografía, gramática, puntuación, terminología ni intención expresiva. Añadir la interpretación operativa normalizada en un campo separado.
4. **Avances concretos:** inspecciones realizadas, archivos y secciones leídos, decisiones, cambios de código/documentación, commits, despliegues, resultados de pruebas y evidencia de read-back. Distinguir «creado», «publicado», «desplegado» y «verificado en ejecución».
5. **Incidentes y resultados negativos:** síntoma, contexto, hora si está disponible, componente, evidencia, impacto, causa confirmada o hipótesis, mitigación, estado y próximo experimento. Registrar también comandos/pruebas fallidos, accesos denegados, resultados vacíos, divergencias de versión y bloqueos; nunca convertir un fallo en éxito implícito.
6. **Crónica causal:** narrar qué se intentó, qué se observó, qué cambió el diagnóstico y por qué se eligió o descartó cada vía. Preservar tanto los resultados positivos como los negativos.
7. **Evidencia y reproducibilidad:** enlaces estables al código/documento, SHA del commit o blob, nombre de prueba, comando o procedimiento de ejecución, resultado real y límites de esa evidencia. Un enlace a código no prueba que la ruta de producción ejecute esa revisión.
8. **Estado final y continuidad:** qué está demostrado, qué permanece desconocido, qué no debe repetirse, qué dependencia bloquea el siguiente paso, siguiente acción concreta y criterios de cierre aún abiertos.

### 2.1 Integridad del historial

- Mantener arriba un resumen breve del estado operativo vigente, pero conservar la crónica anterior en orden cronológico. No reescribir retrospectivamente el historial para hacerlo parecer más limpio.
- Corregir una entrada previa mediante una nota posterior que explique la discrepancia, la evidencia nueva y la fecha; no borrar incidentes ni resultados negativos.
- Cada ciclo debe terminar con una tabla de acciones/criterios: HECHO Y VERIFICADO, IMPLEMENTADO PERO NO VERIFICADO, PENDIENTE, BLOQUEADO o DESCARTADO CON MOTIVO.
- Si no se realizó una acción, anotarla como no realizada. No afirmar acceso real al MCP, reproducción del bug, ejecución de pruebas, publicación ni despliegue sin evidencia.
- No guardar credenciales, tokens Bearer, secretos, transcripciones verbatim de usuarios, audio ni payloads privados en este repositorio. Registrar solo referencias saneadas, IDs no sensibles, hashes y metadatos suficientes para reproducir.
- Al cambiar de conversación, modelo, proveedor o plataforma, el primer acto de continuidad es leer este objeto; luego comprobar la vigencia de las fuentes que hayan podido cambiar. No se reinicia el diagnóstico desde cero ni se considera la memoria conversacional autoridad.
- El orden de autoridad es: SI y Metodología vigentes; este objeto para alcance, decisiones y continuidad del sprint; repositorio KHORA para implementación real; evidencia de ejecución para afirmar comportamiento desplegado. Un texto histórico de Notion no prevalece sobre código y contratos vigentes.

## 3. Instrucciones canónicas del usuario, conservadas verbatim

### 3.1 Solicitud que originó la auditoría

> Revisa toda la especificacion  del MCP de Khora, en reposiutorio. Notion.  Se exhaustivo. Tomte tu tiempo,  esfuerzte es importnte

### 3.2 Especificación verbatim del sprint

> Bueno, para este sprint vas a documentar un objeto canónico en el repositorio de manera similar a lo que se hizo para entorno persistente en el repositorio de metodología, para que siempre dispongamos de una ventana de contexto de la más alta calidad y que podamos retomar el esfuerzo de desarrollo utilizando únicamente ese objeto canónico, independientemente del modelo o la plataforma que se esté utilizando, permitiendo siempre retomar el trabajo donde se quedó. Esto implica que como norma operativa, y esto lo tienes que anotar en el objeto canónico, cada ciclo debe de documentarse de manera exhaustiva todos los avances, todos los incidentes y toda la crónica del desarrollo. Además, debes de documentar en ese objeto mis instrucciones verbatim para que se tomen como especificación canónica del sprint. Lo que vamos a hacer es asegurarnos que el MSP de Cora permita que cualquier modelo que tenga acceso al MSP pueda acceder a los registros de observabilidad para un esfuerzo específico. Por ejemplo, yo lo que quería hacer era resolver algunas cuestiones que tienen que ver con el proceso de dictado, pero no lo voy a hacer sino hasta que tengas acceso al MSP y que a su vez el MSP te permita tener los registros de eventos con el nivel de riqueza suficiente para que tengas ojos sobre la situación y puedas determinar la solución más adecuada. Entonces, esto supone algunas tareas generales en cuanto a la función de observabilidad del MSP y específicas en cuanto al propósito de desarrollo concreto, que en este caso es resolver el bug de dictado. No sé si lo tengas ya descrito o si lo tenga que volver a describir.

Estas citas constituyen la especificación de intención del sprint. Las decisiones de implementación aún no confirmadas se mantienen como decisiones pendientes; no se inventa una autorización concreta a partir de una hipótesis.

## 4. Objetivo, alcance y exclusiones

### 4.1 Objetivo general

Conseguir que cualquier modelo o agente compatible con MCP, autorizado para el recurso MCP de KHORA y con los permisos necesarios, pueda consultar los registros de observabilidad que sean relevantes para un esfuerzo de desarrollo específico. El acceso debe ser real, autenticado, de solo lectura para observabilidad, filtrable, paginable, suficientemente rico para reconstruir la secuencia causal y verificable en ejecución.

«Cualquier modelo» significa interoperabilidad del protocolo y ausencia de dependencia funcional injustificada de un proveedor concreto. No significa acceso anónimo, omisión de autenticación, concesión indiscriminada de permisos ni exposición de datos sensibles. Cada cliente debe contar con credenciales y scopes autorizados.

### 4.2 Objetivo específico del caso inicial

Resolver el bug de dictado relacionado con la edición in situ de la transcripción y la reanudación del dictado. La reparación del bug es una fase posterior: no se debe iniciar un cambio correctivo de código hasta que el cliente de trabajo haya demostrado acceso al MCP y que el flujo de observabilidad permita examinar el incidente con riqueza suficiente. Se permiten inspecciones estáticas y preparación de pruebas para caracterizar el problema y cerrar las brechas de observabilidad.

### 4.3 Fuera de alcance salvo instrucción posterior

- Rediseñar todo el sistema de telemetría de KHORA sin relación material con el objetivo.
- Dar acceso a los volcados íntegros cuando basten registros saneados.
- Añadir un segundo almacén autoritativo de eventos.
- Resolver o atribuir a este sprint fallos de workflows no investigados que no estén relacionados de forma demostrable.
- Declarar el problema resuelto por mera presencia de código, documentación, tests estáticos o un deployment creado.

## 5. Estado inicial verificado y línea base

### 5.1 Metodología transversal

En la apertura se verificó la rama main de SeryMente/metodologia mediante doble lectura del HEAD:

- HEAD H1: e79fd5c66c15a13af0755e1ddb0e60babad08791
- HEAD H2: e79fd5c66c15a13af0755e1ddb0e60babad08791
- Resultado de estabilidad: H1 = H2.
- SI-METACOGNITIVO.md: versión v1.6.21 — Ordenamiento por Preponderancia y Categorías.
- Git blob SHA del SI en ese snapshot: 151333921ca3214c0adee3996cc80d5f23adb2d5.
- Integridad de recuperación del archivo: 41.280 caracteres, 470 líneas; cabecera y cierre presentes y coherentes con el mismo blob.
- METODOLOGIA.md leído como snapshot de apertura: v0.14.9 — Bootstrap Anclado por Commit y Hash; blob SHA e0dc6157d2bc95bca8dff5fde354d601b163a814.
- BOOTSTRAP-CONTEXTO-GLOBAL.md leído como snapshot de apertura; blob SHA 785e4034bb6eecc01521e573e3c3c16259944057.
- El HEAD indicado es la línea base de apertura, no el HEAD final posterior a esta publicación.

### 5.2 Repositorio de implementación KHORA

- Repositorio: https://github.com/SeryMente/khora
- Rama inspeccionada: main.
- HEAD de referencia observado en la auditoría: e2d89dbdc7aa0f537cea94188abdecb5e99215a3.
- Fecha del commit reportada por GitHub: 2026-10-09 20:44:40 UTC.
- Ruta MCP: khora-web/app/api/mcp/route.ts.
- Versión declarada por el objeto McpServer en el código inspeccionado: 1.3.0.
- Blob SHA de route.ts inspeccionado: 4a6831ac56604b3b02c29d4c63063ba496a6a70e.
- Endpoint canónico de implementación: /api/mcp, sin que esta referencia pruebe por sí sola disponibilidad autenticada desde una conversación externa.

### 5.3 Fuentes de implementación y contrato inspeccionadas

- [Ruta MCP y lista de herramientas](https://github.com/SeryMente/khora/blob/main/khora-web/app/api/mcp/route.ts)
- [Observabilidad MCP](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/mcp-observability.ts)
- [Contrato de eventos de observación](https://github.com/SeryMente/khora/blob/main/khora-web/lib/contracts/observation.ts)
- [Contrato de lotes de observación Harmonia](https://github.com/SeryMente/khora/blob/main/khora-web/lib/contracts/observation-batch.ts)
- [Observabilidad de fronteras de servicio](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/service-observability.ts)
- [Contrato documental de observabilidad](https://github.com/SeryMente/khora/blob/main/khora-web/docs/observability-services.md)
- [Control de tokens manuales](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/mcp-manual-token.ts)
- [Prueba de cobertura de observabilidad](https://github.com/SeryMente/khora/blob/main/khora-web/tests/unit/service_observability_coverage.test.ts)
- [Prueba de metadatos y scopes MCP](https://github.com/SeryMente/khora/blob/main/khora-web/tests/unit/mcp_tool_auth_metadata.test.ts)

El estado de estos archivos deberá actualizarse por read-back tras cualquier cambio. Los SHA de apertura no deben reutilizarse como prueba de la versión futura.

## 6. Arquitectura MCP observada

La implementación inspeccionada publica 15 herramientas agrupables en tres capacidades, además de salud:

| Grupo | Herramientas |
|---|---|
| Observabilidad del runtime | khora_observacion_instantanea, khora_eventos_recientes, khora_eventos_desde, khora_estado_vivo |
| Volcados y revisión | khora_resumen, khora_listar_volcados, khora_leer_volcado, khora_buscar_volcados, khora_versiones_volcado, khora_ui_review |
| Ciclo normativo | khora_norm_open_turn, khora_norm_apply_principle, khora_norm_verify_turn, khora_norm_release_turn |
| Salud | khora_mcp_health |

La implementación del endpoint registra también la versión del servidor y los esquemas que publica. Antes de dar por interoperable una herramienta se debe cotejar el esquema anunciado mediante MCP tools/list con el esquema aceptado por su handler, no solo leer el registro de código.

### 6.1 Scopes y gate de ejecución

Scopes declarados:

- runtime:read — consulta de observabilidad.
- volcados:read — consulta de volcados y revisión.
- norm:turn — operaciones del ciclo normativo y gate que actualmente precede a las herramientas sustantivas.
- offline_access — aparece en metadatos OAuth para el flujo de refresh.

Hallazgo de apertura: las herramientas operativas están envueltas en un gate que exige _norm_turn_token, _thinking_mode y _output_format_version además del scope específico. Por eso runtime:read por sí solo no basta para ejecutar las herramientas de observabilidad en el estado actual del código; el cliente también debe completar la apertura normativa y disponer de norm:turn. La UI de token manual permite elegir scopes, por lo que la dependencia no queda suficientemente anticipada a un usuario que genere un token parcial.

Acción requerida: determinar y documentar el contrato de mínimo privilegio para el caso de uso de observabilidad. La opción inicial a validar es runtime:read + norm:turn con apertura válida de ciclo, sin volcados:read cuando la tarea no necesite contenido de volcados. No ampliar permisos automáticamente ni modificar el gate sin prueba de contrato y evaluación de seguridad.

### 6.2 Clientes y portabilidad entre plataformas

La especificación del sprint requiere verificar un cliente distinto de la plataforma que inspiró el gate. El código normativo actual fija REQUIRED_PLATFORM = ChatGPT y publica instrucciones que mencionan ChatGPT. Aunque el server rellena ese contexto internamente, esto no demuestra por sí solo que un agente de otro proveedor pueda completar el protocolo de manera veraz y estable.

Acción requerida: ensayar la secuencia con al menos un cliente externo compatible con MCP y registrar cada llamada, parámetros admitidos, rechazo y resultado. Determinar si platform debe convertirse en metadato de cliente explícito, normalizado y no falsificable, o si hace falta desacoplar la verificación de observabilidad de los atributos específicos de ChatGPT. No presentar esa decisión como tomada hasta tener prueba y análisis de compatibilidad.

## 7. Almacén y riqueza de la evidencia

### 7.1 Fuentes persistentes detectadas

- eventos_sistema: registro durable de eventos de dominio y eventos de frontera; contempla fase, estado, mensaje, detalle, volcado, versión, correlación, tiempos, hash anterior y hash del evento, UUID/idempotencia, resultado, componente, causación, intento, secuencia, sesión, release SHA, duración, métricas, reason code y clase de privacidad.
- khora_runtime_state: estado semántico del runtime observado, incluyendo sesión, ruta, pantalla, actividad, visibilidad, foco, release SHA, origen y marca temporal.

La instrumentación de fronteras complementa los eventos de dominio. No se debe crear un segundo almacén autoritativo.

### 7.2 Capacidad y límites de las herramientas de observabilidad

khora_observacion_instantanea combina el estado de runtime, la última observación, actividad de los últimos cinco minutos, fallos de los últimos sesenta minutos y un cursor global. Considera obsoleto el estado semántico al superar los 15 segundos sin actualización.

khora_eventos_recientes permite filtrar por intervalo temporal, sesión, componente, severidad, resultado, fase, scope y categoría. La ventana se limita a 86.400 segundos y el máximo a 200 eventos por consulta.

khora_eventos_desde permite consultar de forma incremental desde un cursor global monotónico, filtrar por sesión y paginar hasta 200 eventos por página. Es la vía preferida para reconstruir secuencias largas sin depender de la ventana reciente. La consulta inicial con cursor 0 no debe usarse sin evaluar el volumen y paginar hasta cubrir el intervalo del incidente.

### 7.3 Integridad y correlación

Hallazgos de apertura pendientes de validación de extremo a extremo:

- Las consultas MCP seleccionan event_hash, pero no hash_anterior. Con la salida disponible de estas herramientas el cliente no obtiene todos los elementos para verificar por sí solo la continuidad de la cadena hash.
- El middleware HTTP asigna X-Khora-Correlation-Id, mientras la envoltura de tool calls registra eventos de servicio sin pasar explícitamente el ID de la petición. No se ha demostrado que todos los eventos de frontera y herramienta mantengan una correlación común.
- No se ha validado en producción que todos los dominios relevantes adjunten session_id, attempt_id, causation_id y release_sha de forma consistente.

Estas brechas no implican que todos los eventos sean inútiles; establecen qué pruebas debe superar la observabilidad para ser suficiente para el diagnóstico forense solicitado.

### 7.4 Privacidad

La telemetría de observación de Harmonia prohíbe claves y contenidos identificables como audio crudo, transcripción, tokens, secretos, mensajes y contenido textual; además limita valores de cadenas. Los eventos de dominio tradicionales poseen una ruta de saneamiento distinta y la consulta MCP puede devolver detalle y métricas ya persistidas.

Antes de exponer registros a modelos adicionales, revisar los campos realmente devueltos y añadir pruebas de contrato que impidan la salida de transcript/audio/payloads privados. Los eventos de diagnóstico deben registrar identificadores, transiciones, códigos de error, duraciones y métricas saneadas, no el texto dictado ni audio.

## 8. Instrumentación requerida para el caso de dictado

### 8.1 Ruta de código

La máquina de estados de la interfaz está en [IngresoWorkspace.tsx](https://github.com/SeryMente/khora/blob/main/khora-web/app/components/ingreso/IngresoWorkspace.tsx). El componente de presentación está en [IngresoView.tsx](https://github.com/SeryMente/khora/blob/main/khora-web/app/components/shared/IngresoView.tsx). La persistencia de dictado está en [dictado.ts](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/dictado.ts), la transcripción de audio en [transcribir.ts](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/transcribir.ts), y la retranscripción de una sesión en [transcribirSesion.ts](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/transcribirSesion.ts).

### 8.2 Eventos que deben poder reconstruirse

La evidencia existente incluye eventos de backend para custodia/registro de partes, fallo de custodia del dictado, fallos de Groq, respuesta vacía, éxito de transcripción, procesamiento incremental y protección frente a pérdida de texto. Los identificadores encontrados incluyen DIC-001, DIC-002, DIC-003, TRS-001, TRS-002 y TRS-003.

Brecha identificada: la interfaz de ingreso no parece persistir eventos suficientemente específicos para reconstruir el ciclo exacto pausa por edición → confirmación/cancelación → reanudación del reconocedor. Los callbacks del reconocedor cambian el estado de UI y reintentan, pero la secuencia no queda documentada íntegramente como traza causal persistente.

El contrato de observabilidad debe permitir, sin guardar transcripción ni audio, reconstruir como mínimo:

- inicio/detención del dictado y modo de entrada;
- comienzo de edición in situ, pausa del reconocedor y detención de grabación;
- confirmación o cancelación de la edición;
- comienzo y resultado de la reanudación;
- inicio, finalización, error o aborto del reconocedor;
- intento de rearme/reintento, instancia obsoleta detectada, reinicio suprimido y número de instancia activa;
- finalización o fallo de subida de audio, transcripción autoritativa, reconciliación y custodia;
- correlación entre evento de UI, sesión de dictado, request de servicio, evento de dominio, dependencia y release.

Los nombres exactos de los eventos y su ubicación final son decisión de implementación pendiente. Los eventos deben usar IDs y métricas saneadas, no texto dictado, y deben sobrevivir al cierre de la página cuando describan trabajo ya enviado al servidor.

## 9. Bug de dictado: definición de trabajo y estatus epistemológico

### 9.1 Lo conocido

El esfuerzo específico busca corregir un bug del proceso de dictado que involucra la edición in situ y la continuidad de la captura/transcripción. El contrato visible actual anuncia que la escucha se reanuda automáticamente al salir de edición cuando el dictado estaba activo; el código pausa el reconocedor durante la edición y lo crea de nuevo al reanudar.

El historial de Notion contiene antecedentes del frente FIX-DICTADO, incluyendo problemas históricos con “recognition: aborted”, timeout y la necesidad de que la transcripción aparezca en vivo. Esos antecedentes son contexto útil, pero no se consideran automáticamente el mismo incidente que el bug actual.

### 9.2 Hipótesis técnica inicial, no causa confirmada

En la implementación estática de IngresoWorkspace.tsx, el callback onend de cada instancia de SpeechRecognition puede programar un rearme si activoRef.current es verdadero. La pausa por edición detiene la instancia anterior y limpia recRef; al reanudar, se activa el flag y se crea un nuevo reconocedor. El callback tardío de la instancia anterior no parece verificar que esa instancia continúe siendo la vigente antes de rearmarse.

Hipótesis: un onend tardío de una instancia vieja podría reactivar el reconocedor anterior después de comenzar una instancia nueva, provocando concurrencia, resultados incoherentes o interrupción de la escucha.

Esta es una hipótesis derivada de lectura estática; no está confirmada por reproducción, logs ni prueba que fuerce la carrera. No cambiar código únicamente sobre esta hipótesis.

### 9.3 Cobertura de pruebas observada

- [edicion_in_situ.test.ts](https://github.com/SeryMente/khora/blob/main/khora-web/tests/unit/edicion_in_situ.test.ts) prueba la decisión confirmar/desactivar y la llamada a reanudar, pero no reproduce el ciclo de vida real de instancias SpeechRecognition concurrentes.
- [dictado-sin-perdida.spec.ts](https://github.com/SeryMente/khora/blob/main/khora-web/e2e/contracts/dictado-sin-perdida.spec.ts) cubre preservación de texto durante dictado normal y detención y la reconciliación de una respuesta autoritativa truncada; no prueba explícitamente editar, confirmar/cancelar y reanudar con un callback tardío del reconocedor anterior.

La cobertura correcta del bug requiere una prueba dirigida que fuerce eventos onend/onerror tardíos de la instancia anterior, confirme identidad de la instancia activa, y compruebe que no se producen dos reconocedores activos ni pérdida/duplicación de texto durante la transición.

### 9.4 Información aún no adjudicada

No está registrada en la especificación inicial una reproducción actual y exacta en producción: secuencia de acciones del operador, síntoma literal, frecuencia, navegador/runtime, hora, ID de sesión y versión desplegada. La tarea no exige al usuario volver a narrar todo: este objeto retiene lo conocido y permite continuar con inspección e instrumentación. Antes de modificar el comportamiento del dictado debe obtenerse una reproducción concreta o evidencia de eventos que identifique cuál de los síntomas históricos corresponde al problema actual. Si se obtiene del operador, registrar sus palabras verbatim en la entrada del ciclo correspondiente.

## 10. Brechas abiertas y plan por fases

| ID | Fase | Condición de salida | Estado inicial |
|---|---|---|---|
| S0 | Canon y continuidad | Objeto creado en el repositorio KHORA, instrucciones verbatim registradas, README de KHORA enlazado y ambos artefactos verificados por read-back | VERIFICADO |
| S1 | Acceso real a MCP | Cliente de trabajo autenticado, llamada real a khora_mcp_health y al menos una herramienta de observabilidad; resultado y herramienta/cliente quedan registrados | PENDIENTE |
| S2 | Portabilidad entre modelos | Un cliente alterno compatible puede abrir/ejecutar el protocolo y consultar eventos sin asumir una plataforma concreta incorrectamente | PENDIENTE |
| S3 | Scopes y mínimo privilegio | Contrato funcional de scopes documentado y probado; errores de insuficiencia de scope claros; no se concede volcados:read sin necesidad | PENDIENTE |
| S4 | Riqueza y causalidad | Se obtienen eventos de sesión y frontera con filtros, cursor, correlación, release y error suficiente; se demuestran integridad y límites | PENDIENTE |
| S5 | Instrumentación de dictado | El ciclo de edición/reanudación y los errores del recognizer se pueden reconstruir mediante una traza saneada | PENDIENTE |
| S6 | Reproducción del bug | Se reproduce el síntoma actual y se identifica causa o conjunto acotado de hipótesis con evidencia | NO INICIADO |
| S7 | Corrección | Parche mínimo más prueba de regresión dirigida a la causa demostrada | NO INICIADO |
| S8 | Verificación de extremo a extremo | Pruebas, build, consulta MCP de evidencia posterior al cambio y read-back de código/versión real | NO INICIADO |
| S9 | Cierre | Evidencia de solución, notas de versión, incidentes cerrados o residuales declarados, estado y siguiente objetivo actualizado | NO INICIADO |

La existencia de herramientas o contratos no satisface S1, S2 ni S4. El endpoint debe ejecutar con credenciales válidas y devolver datos reales del almacén.

## 11. Criterios de aceptación del sprint

El sprint no se cierra hasta demostrar todos los siguientes criterios:

1. Un modelo o agente externo al modelo/plataforma de origen puede conectarse al mismo endpoint MCP por un mecanismo de autenticación soportado, con scopes autorizados y sin workaround informal.
2. El cliente puede ejecutar health y consultar eventos recientes y desde cursor, filtrados por una sesión/esfuerzo de prueba, y recibir evidencia real y paginable del almacén.
3. Las herramientas anuncian esquemas que coinciden con sus validadores; el gate normativo, sus scopes y el comportamiento de errores están documentados y cubiertos por pruebas.
4. Los eventos del esfuerzo concreto son suficientemente ricos para seguir una cadena desde interacción de dictado hasta servicio/transcripción/custodia, incluidos fallos y resultados parciales. La correlación no depende únicamente de inferir por proximidad temporal.
5. Los logs no exponen transcripciones, audio, secretos ni payloads privados innecesarios. Se define el mínimo privilegio de observabilidad.
6. El bug de dictado se reproduce o se diagnostica con evidencia suficiente, se establece causa confirmada o se documenta por qué solo puede concluirse una hipótesis, y el parche cuenta con pruebas de regresión.
7. Se confirma el resultado en la ruta de ejecución pertinente. El test local, el commit o el deployment no sustituyen el read-back de versión y los eventos post-cambio.
8. Toda evidencia negativa y limitación remanente está registrada, y un modelo nuevo puede continuar leyendo únicamente este objeto y sus referencias sin pedir la reconstrucción del historial.

## 12. Documentos Notion relacionados: material histórico, no autoridad superior

- [Capa de Integración · Khora](https://app.notion.com/p/87b5d4a3-b250-83b3-a1f3-81c04ad9860c) — contexto de la capa de integración.
- [Khora · IAR · Planeación provisional consolidada y registro vivo](https://app.notion.com/p/f375d4a3-b250-83aa-818c-0173bcf85e78) — registro de planificación y observabilidad.
- [Observabilidad de Servicios de Cora, contrato de implementación en KHORA](https://github.com/SeryMente/khora/blob/main/khora-web/docs/observability-services.md) — contrato actualmente alojado en el repositorio de código.
- [Handoff FIX-DICTADO de 2026-08-05](https://app.notion.com/p/e3d5d4a3-b250-82d0-96a7-01ed334e76ab) — antecedentes históricos del dictado, no prueba del síntoma actual.

Estas páginas de Notion no sustituyen la comprobación de código, versión y datos actuales. El conector las devolvió como documentos cuyo estado de verificación canónica no se confirmó.

## 13. Incidentes, riesgos y observaciones iniciales

### I-001 · Acceso MCP real aún no demostrado

**Clase:** bloqueo para S1.  
**Evidencia:** la auditoría inicial pudo inspeccionar el repositorio y documentos, pero no ejecutó llamadas autenticadas al MCP de KHORA desde la conversación.  
**Impacto:** no hay evidencia real de que este cliente pueda consultar los eventos de producción.  
**Acción:** comprobar la conectividad y autenticación con una herramienta de observabilidad y registrar respuesta saneada. No guardar tokens.

### I-002 · Scope parcial incompatible con el gate actual

**Clase:** brecha de contrato/experiencia de cliente.  
**Evidencia:** tools de runtime requieren runtime:read y además el gate de ciclo requiere norm:turn y parámetros normativos. La interfaz de tokens manuales permite seleccionar scopes individualmente.  
**Impacto:** un token etiquetado como de lectura de runtime puede no ser suficiente para la operación que el usuario espera.  
**Acción:** prueba negativa con runtime:read únicamente; prueba positiva con la combinación mínima autorizada; aclarar contrato o rediseñar coherentemente. No relajar autorización sin análisis.

### I-003 · Contrato normativo publicado divergente

**Clase:** inconsistencia del esquema MCP.  
**Evidencia:** el contrato canónico de salida en KHORA declara v1.7.6, mientras textos del servidor y normative-check.md aún mencionan v1.7.2. Además, el schema publicado de khora_norm_verify_turn no declara receipt.output como lo requiere el validador de ejecución.  
**Impacto:** clientes MCP pueden construir llamadas a partir de un contrato publicado incompleto o desactualizado y recibir rechazo en el handler.  
**Acción:** sincronizar esquema y validador desde una fuente canónica y comprobar paridad automáticamente. No confundir la versión del servidor MCP 1.3.0 con la versión del contrato de salida.

### I-004 · Correlación de fronteras MCP sin prueba completa

**Clase:** limitación de observabilidad causal.  
**Evidencia:** eventos de servicio del endpoint pueden registrar una correlación generada en el contexto de servicio si no heredan el ID HTTP; no se observó un paso explícito del ID entrante en la envoltura de tool call.  
**Impacto:** reconstrucción causal menos determinista.  
**Acción:** prueba de integración que confirme si request, tool call y dominio comparten correlation_id; corregir si falla.

### I-005 · Carga probatoria insuficiente para el bug de dictado

**Clase:** brecha de instrumentación de UI.  
**Evidencia:** lectura estática de IngresoWorkspace.tsx y tests consultados.  
**Impacto:** no puede afirmarse que el MCP vaya a mostrar cuándo se pausó/reanudó el recognizer o si existieron dos instancias.  
**Acción:** especificar e implementar telemetría saneada y prueba de carrera después de demostrar el acceso S1.

### I-006 · Callback tardío del recognizer, hipótesis

**Clase:** hipótesis técnica.  
**Evidencia:** el callback onend parece basarse en activoRef.current sin comprobar que la instancia que emite el evento sea la actual; la pausa/reanudación sustituye la instancia.  
**Impacto potencial:** rearme de instancia obsoleta y coexistencia de reconocedores.  
**Estado:** NO CONFIRMADO.  
**Acción:** prueba controlada con evento tardío de la instancia previa; no presentar como causa antes de reproducir.

### I-007 · Workflows programados de GitHub en estado failure, sin adjudicar

**Clase:** señal adyacente, fuera de alcance inmediato hasta demostrar relación.  
**Evidencia observada en la lista de ejecuciones del 2026-10-10 sobre el HEAD e2d89db: Sync Todoist and Notion, Board Orchestrator, Khora API Healthcheck y Jules Auto-Respond Cron reportaban conclusión failure en ejecuciones programadas recientes.  
**Impacto:** desconocido. No se leyó aquí el detalle completo de sus logs; no se afirma que causen el problema MCP ni el bug de dictado.  
**Acción:** investigar sus logs solo si el healthcheck o la evidencia de acceso MCP indican una relación material, o si se amplía el alcance.

## 14. Protocolo de ejecución para todo modelo/plataforma

Al retomar el sprint, ejecutar esta secuencia conceptual y registrar las evidencias disponibles:

1. Leer este documento completo y sus secciones finales de crónica/estado.
2. Verificar el HEAD actual de los repositorios de Metodología y KHORA y releer los archivos que sustentan la siguiente acción; no asumir que los SHA de apertura continúan vigentes.
3. Verificar si ya existe una conexión MCP autorizada en la plataforma actual. Si existe, usar el cliente MCP real; si no existe, registrar la limitación exacta y proceder con inspección/documentación solo cuando sea útil. No fingir acceso.
4. Si hay acceso: consultar health, abrir el ciclo normativo requerido por el server, recuperar eventos con los mínimos scopes, identificar ventana/sesión/IDs, paginar hasta cubrir evidencia pertinente y guardar los resultados saneados y referencias de eventos en esta crónica.
5. Comprobar que la riqueza del registro alcanza los criterios de aceptación antes de tocar el bug.
6. Instrumentar, reproducir, formular diagnóstico y corregir en ese orden. Si la reproducción revela un problema distinto de la hipótesis actual, actualizar el diagnóstico y conservar la hipótesis anterior como descartada o no confirmada.
7. Tras cada cambio: inspeccionar diff, ejecutar las pruebas pertinentes, registrar resultados, publicar y verificar read-back cuando la autorización y el alcance lo permitan. Nunca afirmar “producción verificada” si solo se verificó localmente.
8. Actualizar el resumen de estado y añadir la nueva entrada de crónica en este documento antes de finalizar el ciclo.

## 15. Plantilla obligatoria para nuevas entradas de crónica

Copiar esta estructura al final en cada ciclo y rellenar los campos con evidencia concreta:

### MCP-OBS-DICTADO/CNNN · AAAA-MM-DD · Título del ciclo

**Propósito del ciclo:**  
**Instrucciones verbatim recibidas en este ciclo:**  
**Plataforma/modelo y capacidades MCP disponibles (si se conocen):**  
**HEAD inicial Metodología / SHA relevante:**  
**HEAD inicial KHORA / SHA relevantes:**  
**Estado heredado del objeto:**  
**Acciones ejecutadas:**  
**Avances verificados:**  
**Cambios de archivos/commits/diff:**  
**Pruebas ejecutadas y resultado literal:**  
**Llamadas MCP reales, herramienta, filtros/cursor y resultado saneado:**  
**Incidentes/resultados negativos:**  
**Hechos confirmados:**  
**Hipótesis y supuestos:**  
**Decisiones tomadas y motivo:**  
**Decisiones pendientes/bloqueos:**  
**Estado final por fase S0–S9:**  
**Siguiente acción concreta:**  
**Actualización del resumen superior realizada:** sí/no.

Cada ciclo puede incluir varias entradas de evidencia, pero no debe omitir ninguna de estas categorías. Si una categoría no aplica, escribir “No aplica en este ciclo” con el motivo; no dejar que la ausencia de contenido se interprete como ejecución satisfactoria.

## 16. Crónica del sprint

### MCP-OBS-DICTADO/C001 · 2026-10-10 · Auditoría documental inicial del MCP y análisis preliminar del dictado

**Propósito:** inspeccionar la especificación del MCP de KHORA en GitHub y Notion, con énfasis en determinar si su observabilidad sirve para diagnosticar un bug del dictado.

**Fuentes consultadas:** árbol y HEAD de SeryMente/khora; route.ts; módulo de observabilidad MCP; contratos de observación; contratos de observabilidad de servicios; autenticación OAuth y token manual; middleware; pruebas unitarias de scopes, observabilidad y edición in situ; componentes de ingreso y transcripción; búsqueda de documentos Notion relativos al MCP, la capa de integración, los eventos y FIX-DICTADO.

**Avances verificados:**
- Se identificaron las 15 herramientas publicadas en el código y la diferencia entre lectura de eventos y lectura de volcados.
- Se identificaron los scopes runtime:read, volcados:read y norm:turn, además del gate que exige un turno normativo en herramientas sustantivas.
- Se confirmó estáticamente que el registro events_sistema/eventos_sistema y khora_runtime_state están diseñados para consulta MCP y que existen eventos de backend para dictado y transcripción.
- Se identificaron un desajuste de versión del contrato normativo y una diferencia entre el schema publicado de khora_norm_verify_turn y el validador de ejecución.
- Se determinó que Notion aporta antecedentes e integración, pero no se localizó una página única suficientemente completa y versionada que sea la especificación del servidor MCP actual.
- Se identificó una brecha de instrumentación para la transición pausa de edición/confirmación/reanudación del reconocedor.

**Hipótesis registrada:** posible rearme de una instancia SpeechRecognition antigua por callback onend tardío después de reanudar el dictado. No se reprodujo ni confirmó.

**Incidentes/limitaciones:** no se realizaron llamadas MCP autenticadas desde la conversación; no se leyeron registros de producción; no se ejecutó suite de pruebas ni se reprodujo el bug. Ninguna de estas acciones puede declararse completada.

**Resultado:** auditoría estática concluida como línea base documental; acceso runtime, portabilidad entre modelos, riqueza causal y corrección del bug continúan pendientes.

### MCP-OBS-DICTADO/C002 · 2026-10-10 · Corrección de ubicación del objeto y verificación inicial

**Propósito:** crear una fuente de continuidad portable, conservar literalmente las instrucciones del usuario y establecer el protocolo obligatorio de documentación por ciclo.

**Acciones ejecutadas inicialmente:** el primer intento publicó el objeto en SeryMente/metodologia y modificó sus índices. Tras la corrección expresa del usuario —«El objeto canónico es para Cora, no para metodología.»— esa ubicación se reconoce como incorrecta para el sprint. Se decide mantener el objeto canónico en SeryMente/khora y revertir únicamente las modificaciones introducidas por este esfuerzo en Metodología. La instrucción correctiva forma parte de la crónica y no se elimina.

**Revisión normativa:** la cabecera del SI se verificó en el snapshot estable H1=H2, con versión v1.6.21 — Ordenamiento por Preponderancia y Categorías, blob SHA 151333921ca3214c0adee3996cc80d5f23adb2d5. La revisión no implica una actualización del SI.

**Publicación en KHORA verificada:** objeto creado en `docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md`, commit `a221c540c928e8d0ca3a770566c22d413bba1c6b`; read-back del objeto con blob SHA `5413cb303b2f8a7008c9772f6780e6a08fff6b27`, 42.267 caracteres/421 líneas. El índice en `README.md` se publicó en commit `4e91294d09067379a4dfbfa73562498aa15c04d9`; blob SHA posterior de README `64a990f6bbcf030239c39b9c6ac8337cf327c9ca`. El índice y el objeto se relevaron desde `main` y se confirmó que el enlace relativo apunta a la ruta creada.

**Corrección de ubicación completada y verificada por read-back:** la primera publicación en `SeryMente/metodologia` fue una ubicación incorrecta. El objeto canónico operativo reside exclusivamente en `SeryMente/khora/docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md`, enlazado desde el README de KHORA. Se retiró el duplicado de Metodología en commit `e32c499e698204a9ebf25af08cd30c54c5c8a1f2`; los cambios compensatorios fueron `d185f5cb19b5b6f984e41dbec419cae571cbe8fb` (METODOLOGIA.md), `50f643aa023bbcd6f74b2455e95a64f752adeaf6` (BOOTSTRAP-CONTEXTO-GLOBAL.md) y `0d2066f22e02821aa585cd5fdae38f1877d5f559` (README.md). El read-back confirmó que los tres archivos de Metodología volvieron exactamente a sus blobs originales de apertura: `e0dc6157d2bc95bca8dff5fde354d601b163a814`, `785e4034bb6eecc01521e573e3c3c16259944057` y `7ba4ddba0bd6728c36c4e9245895c9f73867a55e`. No se reescribió el historial remoto.

### MCP-OBS-DICTADO/C003 · 2026-10-10 · Instrumentación persistente de checkpoints de dictado

**Propósito:** instrumentar exclusivamente el dictado por GitHub, con checkpoints en las transiciones diagnósticas, persistencia central e integridad de los eventos.

**Instrucción verbatim:**

> Trabaja exclusivamente en la observavilidad de khora
> 
> 1. El sistema debe de guardar en persistencia,  quiza vercel blob,  no estoy sguro,   todo el registro de eventos..  Se consideran datos de usuario.
> 2. Lo debe de persistir,  con la frecuencia neesaria.&#x20;
> 3. Ademas de otros metodos,  ya que no se restringe a esto, checkpoints por proceso se establecen,  en  este momento necesito que veriques de extremo a extremo el proceso dedl dictado, y encuentres checkpoints adecuados,  cuando se inicia el dictado,  cuando se detiene pr edicion ipso facto,  es decir mapea todos lo0s puntoss en los que es posible que ocurra algo que pueda servir observar tanto para el desarrollo y mejroa contina, como para diagnostico de bugs.&#x20;
> 4. Asegurte que los checkpoints desencadenan un envio actualizado del registo de eventos debidamente estriucturado y hecho para que se tenga claridad sobre lo ocurrido.&#x20;
> 5. Por ahjora enfocate nada mas en el proceso de dictado para los checkpoitns.&#x20;
> 6. Trabaja de manera que todo lo que te digo en  est entrdada se cumpla cabalmente.
> 7. No te detengas hjasta terminar. Por nada del mundo.
> 8. Imponte  unmaximo grado  de rigurosa implacable calidad en la atencion al detalle y la calidad
> 9. Trabaja con  github nada mas,  sinrdc.
> 10. Si no has resuelto todo esto en  un solo cilo habras fallado en la ejecucion.&#x20;
> 11. Vuelvo en unas hjoras.&#x20;
> 
> COMIENZA YA

**Interpretación operativa:** instrumentar Micrófono/Web Speech y Chrome Live Caption; marcar eventos como datos de usuario; mantener los registros completos en el sistema de eventos persistentes; enviar los eventos en cada checkpoint; no incluir texto, audio, URL privada ni secretos en la telemetría; no corregir todavía la causa del bug de dictado.

**Línea base:** HEAD main `35d00868758ff5d481983ed2415a8cff71011cc1`. Component `IngresoWorkspace.tsx` blob `eed47f0c7705f2c472d8b87c8c286e060d2a132e`; server `lib/server/eventos.ts` blob `48e59087a125c7155374bfacc64ff860ba2b1bd8`; contract `lib/contracts/observation.ts` blob `e468ef66b1e90914a9e6b5c656ca4ae0a9b7451d`; ingest route `app/api/eventos/route.ts` blob `45329eafb9238c4fb85d294b83426bf0f1790f4f`.

**Persistencia elegida:** se reutiliza POST /api/eventos → registrarEventosBatch → eventos_sistema, con deduplicación por UUID/idempotencia, cadena hash y outbox. No se añade una copia paralela a Vercel Blob: los eventos requieren consulta estructurada y ya hay un almacén canónico. El texto del checkpoint sigue cifrado y separado; la telemetría nunca guarda el texto literal.

**Checkpoints instrumentados:**

| Etapa | Eventos / propósito |
| --- | --- |
| Montaje y recuperación | WORKSPACE_READY, CHECKPOINT_RECUPERADO, ERROR_RECUPERACION_CHECKPOINT y RECUPERACION_OMITIDA_POR_SESION_ACTIVA; estado de recuperación/capacidad sin contenido verbal. |
| Inicio ASR | DICTADO_INICIO_SOLICITADO/ACEPTADO/FALLIDO, CAPACIDAD_RECONOCIMIENTO_AUSENTE, RECONOCEDOR_CONSTRUIDO/INICIADO/START_FALLIDO. Separa solicitud, construcción y start. |
| Micrófono / MediaRecorder | SOLICITUD_MICROFONO, MICROFONO_PERMITIDO, ERROR_INICIO_GRABACION, GRABACION_INICIADA/DETENIDA, ERROR_GRABADORA, FRAGMENTOS_RECIBIDOS, GRABACION_PARO_SOLICITADO/FALLIDO. Mide tiempos, bytes y fragmentos. |
| Resultados de voz | RESULTADO_FINAL_RECIBIDO y RESULTADO_PARCIAL_RECIBIDO; registra longitud/segmentos, no frases. Los parciales se limitan por frecuencia. |
| Errores y rearme | ERROR_RECONOCEDOR, EVENTO_FIN_RECONOCEDOR, RECONEXION_PROGRAMADA/INICIADA/FALLIDA/REINTENTADA y RECONOCIMIENTO_NO_REANUDABLE. |
| Hipótesis de instancia antigua | REARME_INSTANCIA_ANTERIOR compara la instancia del callback con recRef.current. Es señal diagnóstica; no confirma ni corrige la hipótesis I-006. |
| Checkpoint | CHECKPOINT_INICIADO/PERSISTIDO/FALLIDO con carácter-count, duración, modo forzado y resultado HTTP; el texto original no viaja en telemetría. |
| Edición in situ | EDICION_IN_SITU_INICIADA, DICTADO_PAUSA_POR_EDICION, DICTADO_PAUSADO_POR_EDICION, fallo de parada y contadores de longitud. Registra el paro inmediato en el primer cambio del editor. |
| Confirmación/cancelación y reanudación | EDICION_IN_SITU_CIERRE_INICIADO/CONFIRMADA/CANCELADA/CIERRE_FALLIDO y REANUDACION_POR_EDICION_SOLICITADA/COMPLETADA/FALLIDA. Captura espera de finalización/subida y vuelta al recognizer. |
| Chrome Live Caption | CAPTURA_CHROME_PREPARADA, COMANDO_CHROME_ENVIADO, BRIDGE_CHROME_ESTADO, CAPTURA_CHROME_ESTADO/FALLIDA, SEGMENTO_CHROME_RECIBIDO, PARTE_CHROME_INVALIDA/VERIFICADA, CAPTURA_CHROME_DETENIDA/PARO_FALLIDO y PARADA_CHROME_ACK_TIMEOUT. |
| Upload/transcripción | PARTE_AUDIO_SUBIDA_INICIADA/PERSISTIDA/FALLIDA y TRANSCRIPCION_AUTORITATIVA_INICIADA/OMITIDA/COMPLETADA/FALLIDA. Sin URL ni bytes de audio en payload. |
| Cierre/guardado/limpieza | DICTADO_DETENCION_SOLICITADA/DETENIDO, GUARDADO_DICTADO_INICIADO/COMPLETADO/FALLIDO, AUTOBLOQUEO_CHECKPOINT_INICIADO/COMPLETADO y CAPTURA_LIMPIADA. |

**Contrato de evento:** OBS-1 con UUID, fase dictado, componente ingreso_workspace, correlación por sesión, causation_id, intento, secuencia, tiempo de cliente, duración, severity/outcome, reason_code, métricas escalares autorizadas y privacy_class USER_DATA. Las cadenas y claves no autorizadas se descartan en el cliente. El servidor traduce PENDING a START, SKIPPED a SKIP, PARTIAL a INFO y los fallos a FAIL; sequence=1000 produce DIC-001, nunca DIC-000.

**Envío y confirmación:** se encola en sessionStorage con respaldo en memoria y se programa POST en 100 ms; hitos críticos también fuerzan envío y se reintenta en online, pagehide, cambio de visibilidad y checkpoints siguientes. Un lote se retira solamente con acuse donde accepted + duplicates igual al número enviado y rejected=0. La deduplicación reutiliza UUID y clave idempotente. La persistencia central se considera acreditada solo tras acuse del endpoint.

**Límites y no-resultados:** no se añade Blob paralelo; no se modificó intencionalmente la lógica funcional de reconexión para no anticipar el diagnóstico. La hipótesis I-006 permanece NO CONFIRMADA. El HEAD inicial presentaba workflows fallidos; los logs disponibles devolvieron 404 y no se adjudica su causa. No se ejecutó MCP autenticado, ni pruebas de runtime ni validación de producción en este punto.

**Siguiente actualización obligatoria:** C004 deberá añadir el SHA del commit publicado, read-back de cada fichero y resultados reales de GitHub Actions. Hasta que los checks se ejecuten, S2 permanece IMPLEMENTADO/PENDIENTE DE VERIFICACIÓN.

## 17. Estado operativo vigente y siguiente acción

**Estado general:** ABIERTO · IMPLEMENTACIÓN DE OBSERVABILIDAD DEL DICTADO EN VALIDACIÓN.  
**S0:** VERIFICADO. Objeto canónico en KHORA y entrada en README comprobados por read-back.  
**S1:** acceso MCP autenticado y consulta de registros reales siguen pendientes.  
**S2:** instrumentación del dictado, contrato USER_DATA, cola de envío con reintento y pruebas unitarias/E2E están publicadas y leídas de vuelta. Los reintentos más recientes de CI/UI Quality siguen fallando antes de iniciar pasos (runner_id=0); CI, persistencia real y producción permanecen PENDIENTES DE VERIFICACIÓN.  
**El bug de dictado no está diagnosticado ni corregido en este sprint.**  
**No se ha probado una conexión MCP autenticada ni runtime de producción en este ciclo.**  
**No se afirma despliegue ni verificación de producción.**

La siguiente acción es recuperar GitHub Actions y ejecutar CI/UI Quality; sus jobs actuales no asignan runner y no permiten conocer el resultado de las pruebas. Después se debe verificar la ingestión en un entorno autorizado, recuperar eventos por MCP y solo entonces diagnosticar/corregir el bug. La instrumentación registra callbacks tardíos sin dar por probada la causa.

## 18. Referencias canónicas

- [SI-METACOGNITIVO.md](https://github.com/SeryMente/metodologia/blob/main/SI-METACOGNITIVO.md)
- [METODOLOGIA.md](https://github.com/SeryMente/metodologia/blob/main/METODOLOGIA.md)
- [BOOTSTRAP-CONTEXTO-GLOBAL.md](https://github.com/SeryMente/metodologia/blob/main/BOOTSTRAP-CONTEXTO-GLOBAL.md)
- [ANEXO-ENTORNO-PERSISTENTE-HIBRIDO-EP-WP-LAB.md](https://github.com/SeryMente/metodologia/blob/main/ANEXO-ENTORNO-PERSISTENTE-HIBRIDO-EP-WP-LAB.md)
- [Repositorio canónico del proyecto KHORA](https://github.com/SeryMente/khora)
- [Objeto del sprint dentro del repositorio KHORA](https://github.com/SeryMente/khora/blob/main/docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md)
- [MCP endpoint implementation](https://github.com/SeryMente/khora/blob/main/khora-web/app/api/mcp/route.ts)
- [Observability services contract](https://github.com/SeryMente/khora/blob/main/khora-web/docs/observability-services.md)

El objeto se conserva como texto canónico portable. Para cualquier afirmación dinámica —acceso real, estado de producción, contenido actual de eventos, resultado de un test o versión desplegada— se debe obtener evidencia nueva del recurso correspondiente y registrar el resultado en esta crónica.


## 19. Invariantes del colector

- Todos los eventos del flujo se clasifican USER_DATA; el sobre observacional admite únicamente valores escalares permitidos y no transporta texto dictado, audio, URL privada ni tokens.
- El identificador causal apunta al evento más reciente de la misma sesión. La secuencia es ascendente por sesión.
- Una respuesta HTTP 200 que contenga rechazos no confirma persistencia de todo el lote. Cualquier rechazo, resumen incompleto o error conserva la cola.
- Los parciales de reconocimiento se muestrean como máximo cada cinco segundos y las señales de fragmentos se emiten cada diez chunks; los hitos, errores, uploads, checkpoints y transiciones de edición se registran individualmente.
- Vercel Blob no se añade como copia paralela sin una necesidad específica: eventos_sistema/outbox es la fuente estructurada existente, y el texto se conserva en su ruta cifrada separada.
- Los callbacks tardíos se observan sin alterar su comportamiento funcional hasta que una reproducción determine la causa.


### MCP-OBS-DICTADO/C004 · 2026-10-10 · Read-back, endurecimiento de entrega y límites de CI

**Instrucción nueva recibida verbatim:** “Continua”.

**Línea base de continuidad:** KHORA main en el commit bb406c61e4456ea8e7d40fbeaab343ab1f39c8a2, cuyo mensaje es “test(observability): cover inline dictation checkpoint lifecycle”. Se mantuvo el ámbito exclusivamente en la observabilidad del dictado y se trabajó únicamente con GitHub; no se utilizó RDC, no se consultó Vercel como evidencia de publicación y no se alteró deliberadamente la conducta funcional del reconocedor obsoleto.

**Auditoría estática de la instrumentación leída desde main:** el componente Ingreso contiene 68 puntos literales de registro y 61 nombres de evento distintos. Se compararon las claves de métricas presentes en sus objetos de evento con la lista ALLOWED_METRICS del colector: no quedó ninguna clave utilizada fuera de la lista. Ningún nombre de evento literal inspeccionado coincide con los patrones de fuga prohibidos por el colector. Los eventos transmiten longitudes, estados, contadores, tiempos, bytes y reason codes normalizados, no fragmentos de texto ni audio.

**Contrato de persistencia trazado desde el código:** el cliente envía lotes a POST /api/eventos con cookies same-origin. La ruta exige sesión autenticada salvo la excepción interna de pruebas, comprueba el estado del almacén y llama a registrarEventosBatch. El servidor valida el envelope con validateObservationPrivacy, traduce la fase y el estado, conserva fase/severidad/outcome/metrics en el detalle, asigna UUID e idempotencia y escribe en eventos_sistema con la tabla outbox existente. La migración 021 establece privacy_class como TEXT con default SYSTEM_AUDIT, sin un enum que bloquee USER_DATA. El colector considera el lote entregado solo si accepted + duplicates es igual al tamaño del lote y rejected es cero.

**Corrección de robustez adicional:** se añadió reintento automático con backoff exponencial acotado cuando ocurre error HTTP/red, el servidor informa rechazos o quedan eventos tras las rondas máximas de drenaje. El evento conserva UUID y clave idempotente durante el reintento; la cola queda pendiente hasta el acuse completo. La tipificación del timer se ajustó a ReturnType<typeof window.setTimeout> para alinear el tipo del temporizador con la API del navegador y evitar diferencias de ReturnType entre DOM y Node.

**Pruebas escritas para el ciclo:**
- Pruebas unitarias de clase USER_DATA, saneamiento de transcript/unapproved metric, confirmación de lotes, recuperación tras error HTTP, conservación ante rechazo explícito y reintento con UUID estable.
- Pruebas duraderas de ingesta USER_DATA, conservación de severity/phase/outcome, mapeo de FAILURE a FAIL, PENDING a START y SKIPPED a SKIP, además de la secuencia que excede 999.
- Prueba E2E de navegador con un reconocedor simulado: inicio, foco/edición inmediata, pausa, confirmación, reanudación y evento de callback onend tardío de una instancia anterior; también comprueba que el texto simulado y el editado no se filtren a la telemetría. Sus endpoints de eventos/checkpoint están interceptados, por lo que la prueba verifica el flujo cliente, no una escritura real en Postgres.
- Las pruebas se han añadido y se han leído de vuelta desde GitHub, pero no se afirma que hayan sido ejecutadas correctamente.

**GitHub Actions — evidencia y limitación:** el commit de instrumentación y la prueba E2E es bb406c61e4456ea8e7d40fbeaab343ab1f39c8a2. El run CI 38071515684, intento 2, quedó en failure; sus jobs 114269824344 (khora-web-gate), 114269824577 (api-tests) y 114269824693 (calidad) terminaron con runner_id=0 y cero pasos. UI Quality run 38071515845, intento 2, quedó en failure; jobs 114269830277 (UI E2E) y 114269830488 (UI Contract) también terminaron con runner_id=0 y cero pasos. El deploy run 38071515779 y el job 114269705877 concluyeron de igual modo, antes de ejecutar pasos. Los intentos previos de obtener logs devolvieron HTTP 404 de los blobs de logs. Estos resultados acreditan que los workflows no ejecutaron sus pasos; no acreditan un fallo de compilación o de pruebas introducido por este cambio, ni permiten atribuir la causa subyacente.

**Contrato diferente revisado:** ObservationBatchSchema usa otro formato de ingesta para el origen harmonia-extension y exige ANONYMIZED_TELEMETRY. El flujo instrumentado aquí se envía directamente al endpoint POST /api/eventos en formato ObservationEnvelope OBS-1, que sí declara USER_DATA. No se modificó ObservationBatchSchema para no mezclar ambos contratos ni desviar esta tarea de la persistencia duradera del dictado.

**Resultados no verificados y pendientes:** no hay conexión MCP autenticada demostrada en este ciclo, ni consulta de eventos reales de producción, ni reproducción con micrófono real, ni test ejecutado por runner, ni prueba de una inserción real a Postgres. El bug funcional del dictado continúa NO CONFIRMADO y NO CORREGIDO; REARME_INSTANCIA_ANTERIOR es una señal diagnóstica instrumentada y la prueba E2E simula ese evento. No se declara despliegue ni disponibilidad en producción.

**Read-back de la base de código desde main en el commit bb406c61e4456ea8e7d40fbeaab343ab1f39c8a2:**

- khora-web/app/components/ingreso/IngresoWorkspace.tsx: blob 9eb3d878504322f07db8607b5cfe7f8f548b8cc6; 68862 caracteres, 1449 líneas.
- khora-web/lib/contracts/observation.ts: blob 7f6b0d606af00acc80f3845eaf73fa1b773382cb; 3781 caracteres, 103 líneas.
- khora-web/lib/server/eventos.ts: blob 48f81945bebf4728fbdcfcdddebbccc93293029c; 20217 caracteres, 660 líneas.
- khora-web/tests/unit/dictado_observability.test.ts: blob 5501f55e07c8a9fa550fa31e0016458084539d12; 7914 caracteres, 188 líneas.
- khora-web/tests/unit/eventos_durables.test.ts: blob fd73a1d0194f53ff51a73ee3f7e83d38bbb48342; 13781 caracteres, 403 líneas.
- khora-web/e2e/contracts/dictado-observability-checkpoints.spec.ts: blob a84b6e5c977bf595765a0bfa38a070966d7f4abc; 4949 caracteres, 134 líneas.

**Estado del ciclo:** implementación y pruebas escritas publicadas; revisión estática y read-back completados; CI, persistencia real y producción pendientes de verificación. El próximo paso técnico es recuperar la ejecución de GitHub Actions para que CI/UI Quality asignen runners, ejecuten las suites y expongan logs. Después se debe comprobar la ingestión durable en un entorno autorizado y consultar esos eventos a través del MCP real antes de abordar la corrección funcional del dictado.



## Addendum de verificación final de C004 · 2026-10-10

La lectura de vuelta tras el commit C004 confirma que la corrección de tipo de timer también quedó publicada. En este punto el HEAD de main fue 3b1b27cf0ac4e6c308475f500cee75b6028bffe8 (docs(observability): record readback and CI execution limits); el único código respecto del HEAD previo cambia el tipo de retorno de los timers del colector a ReturnType<typeof window.setTimeout>. La auditoría de métricas continuó sin claves utilizadas fuera de ALLOWED_METRICS: 68 puntos literales, 61 nombres de evento distintos y cero nombres de evento que coincidan con los patrones de fuga probados.

**Read-back exacto de main al HEAD 3b1b27cf0ac4e6c308475f500cee75b6028bffe8:**
- khora-web/lib/client/dictado-observability.ts — blob 96ad3e77cd03ffd8ecfb490358d4ab1b6289939d; 10,694 caracteres / 263 líneas.
- khora-web/tests/unit/dictado_observability.test.ts — blob 5501f55e07c8a9fa550fa31e0016458084539d12; 7,914 caracteres / 188 líneas.
- khora-web/app/components/ingreso/IngresoWorkspace.tsx — blob 9eb3d878504322f07db8607b5cfe7f8f548b8cc6; 68,862 caracteres / 1,449 líneas.
- khora-web/lib/contracts/observation.ts — blob 7f6b0d606af00acc80f3845eaf73fa1b773382cb; 3,781 caracteres / 103 líneas.
- khora-web/lib/server/eventos.ts — blob 48f81945bebf4728fbdcfcdddebbccc93293029c; 20,217 caracteres / 660 líneas.
- khora-web/tests/unit/eventos_durables.test.ts — blob fd73a1d0194f53ff51a73ee3f7e83d38bbb48342; 13,781 caracteres / 403 líneas.
- khora-web/e2e/contracts/dictado-observability-checkpoints.spec.ts — blob a84b6e5c977bf595765a0bfa38a070966d7f4abc; 4,949 caracteres / 134 líneas.
- docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md (antes de este addendum) — blob 132acbed4cc956a6a81ed92cc38a5b9682ea54c6; 58,109 caracteres / 526 líneas.
- Versión de paquete observada en khora-web/package.json: 0.3.8; no se incrementó el release del producto porque el build, las pruebas y el despliegue no pudieron verificarse.

**Nueva evidencia de workflows para el HEAD 3b1b27cf0ac4e6c308475f500cee75b6028bffe8:**
- CI: run 38076870773, intento 2, failure. Los jobs 114285689046 (khora-web-gate), 114285689218 (calidad) y 114285689298 (api-tests) terminaron entre 18:43:09Z y 18:43:11Z, cada uno con runner_id=0 y cero pasos.
- UI Quality: run 38076870781, intento 2, failure. Los jobs 114285699743 (UI E2E) y 114285699909 (UI Contract) terminaron entre 18:43:12Z y 18:43:14Z, también con runner_id=0 y cero pasos.
- Se volvió a solicitar el reintento de ambos workflows; ambos quedaron en el mismo resultado. La descarga de logs del job 114285689046 volvió a devolver HTTP 404 BlobNotFound, por lo que no hay mensaje remoto que identifique la causa del rechazo al asignar runner.
- Deploy to Production (Vercel), run 38076870776, falló igualmente sin runner/pasos. No se afirma despliegue en producción.

El fallo de infraestructura de ejecución sigue siendo un impedimento objetivo para cerrar verificación automatizada. No se cambia código de workflows ni permisos del repositorio como parte de esta tarea de observabilidad. La implementación está publicada y leída de vuelta; las pruebas están definidas pero no ejecutadas por CI, y el acceso MCP/persistencia real permanecen pendientes.



### Addendum de cierre de cobertura E2E — base 63c08bff331456bc8834994f62e8ac899f073061

Se amplió la prueba E2E para cubrir también la parada normal después del ciclo edición/reanudación. Ahora la prueba espera DICTADO_DETENCION_SOLICITADA y DICTADO_DETENIDO con el selector estable ingreso.btn-detener, además de verificar inicio, pausa por edición, confirmación, reanudación, callback de la instancia antigua y ausencia del texto en la telemetría. El test sigue aislado mediante interceptación de POST /api/eventos y /api/dictado/checkpoint; no representa una prueba de persistencia contra la base real y aún no ha sido ejecutado por un runner.

Blob de la E2E ampliada: 143af621028ce1e775ecd5b35d8c17654e603ecf.



### Addendum CI — integración explícita de la E2E de dictado — base 4103f31be53a47233cb60c0b7f4024a3691974b8

La inspección de .github/workflows/ui-quality.yml mostró que el job UI E2E invocaba Playwright con una lista explícita de solo dos specs, de modo que la nueva prueba e2e/contracts/dictado-observability-checkpoints.spec.ts no se ejecutaría en CI aun estando dentro de testDir/testMatch. Se actualizó el comando de ese job para incluir el spec de observabilidad del dictado. El runner unitario scripts/run_unit_tests.mjs sí descubre automáticamente todos los archivos tests/unit/*.test.ts, por lo que las cuatro pruebas nuevas del colector entran en el conjunto unitario.

La revisión de workflows después del cambio continúa bloqueada por el problema preexistente de asignación: runs concluyen como failure en dos segundos, runner_id=0 y cero pasos. La E2E ya está conectada al workflow, pero no se afirma que haya sido ejecutada.



### Ajuste final de selector E2E — base e5ef3ba910642a0e5851f53fc99b1bd2ba5c6d93

Se reemplazó la aserción inicial genérica sobre h1 por la disponibilidad del control estable ingreso.btn-iniciar, evitando dependencia del número de encabezados de la página. La E2E sigue incluyendo la parada normal después de validar la secuencia de pausa/reanudación.

Blob actualizado de la E2E: 745441c25acc95c0c9c88ca68c4af0b80ab62c50.



### Punto de control final de publicación — base 9788a0dd9211917a40ff617ed3caad0b92d7ddeb

La publicación final de código revisada desde main es 9788a0dd9211917a40ff617ed3caad0b92d7ddeb, mensaje “test(observability): stabilize dictation E2E entry selector”. La E2E de checkpoints es el blob 745441c25acc95c0c9c88ca68c4af0b80ab62c50; el workflow UI Quality que ahora la invoca es el blob 8a8d1cb0746d311894369d2a9c17778b8b1d3ffd. La suite unitaria se descubrió por inspección de run_unit_tests.mjs: recoge todos los archivos .test.ts del directorio tests/unit.

Los nuevos workflows lanzados para ese commit no llegaron a ejecutar pasos:
- CI run 38077145933: failure; 114286388455 (khora-web-gate), 114286388634 (calidad) y 114286388647 (api-tests), todos runner_id=0 y cero pasos.
- UI Quality run 38077145921: failure; 114286388702 (UI E2E) y 114286388900 (UI Contract), runner_id=0 y cero pasos.
- Deploy to Production run 38077145918: failure; 114286388671 (deploy-and-notify), runner_id=0 y cero pasos.

Este resultado confirma un bloqueo de ejecución de GitHub Actions, no la salida de una compilación, pruebas o despliegue. No hay evidencia suficiente para afirmar que la aplicación se haya desplegado o que la persistencia se haya probado contra Postgres en ejecución.

Estado del producto leído en package.json: khora-web 0.3.8. El nombre de la actualización de código documentada para este ciclo es Observabilidad end-to-end del dictado / C004. El objeto del sprint conserva su versión propia v0.1.0 — Contexto Portátil de Observabilidad MCP y Dictado.

### Addendum C005 — Validación E2E local del dictado por RDC — base e976509cc08471d063dfe7ec962b7749e007bdf7

Se verificó una conexión RDC activa y se creó una copia de trabajo aislada desde `main` en e976509cc08471d063dfe7ec962b7749e007bdf7; la copia preexistente del Escritorio estaba atrasada y contenía modificaciones locales, por lo que no se sobrescribió.

La primera compilación descubrió que `IngresoWorkspace` referenciaba `archivado`/`setArchivado` sin declarar el estado. Se añadió el estado y su reinicio en `limpiar`. También se corrigieron dos bloqueos de TypeScript del código de observabilidad (`USER_DATA` en el adaptador CAP-0 y los tipos de los timers de navegador), se alinearon los fixtures de UI Review con sus contratos actuales y se tipó el callback de selección de volcados. No se modificó el workflow ni se dejó una opción de omisión de TypeScript en la configuración del producto.

**Evidencia local reproducible (Windows, Node v24.0.0, npm 11.3.0):**
- Instalación de dependencias: `npm.cmd ci --ignore-scripts` terminó con exit code 0 (659 paquetes). Se necesitó `--ignore-scripts` porque la ejecución de un script de ciclo de vida de npm falló con `ERR_INVALID_ARG_TYPE`; el build y la E2E posterior se ejecutaron por separado.
- TypeScript: `npm.cmd run typecheck` — exit code 0.
- Unitarias dirigidas: `node --import tsx --test tests/unit/dictado_observability.test.ts tests/unit/eventos_durables.test.ts` — 12 pasaron, 0 fallaron.
- E2E dirigida: `npm.cmd run e2e -- e2e/contracts/dictado-observability-checkpoints.spec.ts --reporter=line` — exit code 0; 1 prueba pasó en Chromium (1.4 minutos), con compilación normal y la configuración original restaurada. La secuencia cubre inicio, pausa por edición in situ, confirmación, reanudación, callback tardío de instancia anterior y parada normal.

**Bloqueos/alcance restante:**
- La suite unitaria completa continúa en rojo fuera del flujo de observabilidad: `tests/unit/ingesta.test.ts` recibe HTTP 400 donde sus casos esperan otros estados HTTP, y `tests/unit/methodology_contract_sync.test.ts` compara un contrato local v1.7.6 contra la versión canónica esperada v1.7.7 y difiere también en el estado RA. No se cambiaron esos contratos/pruebas en este ciclo.
- La E2E intercepta `POST /api/eventos` y `/api/dictado/checkpoint`; valida el flujo cliente/UI, no una inserción y lectura reales de Postgres. La persistencia real y la recuperación mediante MCP autenticado siguen pendientes.
- Los workflows de GitHub Actions no han sido desbloqueados: los intentos anteriores siguen fallando antes de ejecutar pasos (`runner_id=0`, cero pasos). La validación local no se presenta como CI exitoso ni como despliegue de producción.

Nombre de la actualización de código: **Observabilidad end-to-end del dictado / C005**. Versión del objeto de sprint: **v0.1.0 — Contexto Portátil de Observabilidad MCP y Dictado**. La versión de paquete `khora-web` permanece en **0.3.8**.

### Addendum C006 — Readback posterior a la publicación y estado actual de Actions — base e93987ee1caaee4d437bfbd594fbdc2fe091569b

La publicación C005 quedó confirmada en `main` con el commit `e93987ee1caaee4d437bfbd594fbdc2fe091569b`. Se consultaron de nuevo los workflows disparados por ese SHA; el bloqueo de asignación de runner persiste también después de publicar las correcciones y la evidencia local:

- CI run 38079276808: jobs `calidad`, `khora-web-gate` y `api-tests`; todos failure, `runner_id=0`, nombre de runner vacío y cero pasos.
- UI Quality run 38079276806: jobs `UI Contract` y `UI E2E`; ambos failure, `runner_id=0`, cero pasos.
- Deploy to Production (Vercel) run 38079276845: job `deploy-and-notify`, failure, `runner_id=0`, cero pasos.
- Integrity Manifest Refresh run 38079276874 y sync-repos run 38079276869: ambos failure antes de ejecutar pasos, `runner_id=0`.

En consecuencia, el E2E local de dictado y el typecheck están verificados en la copia de trabajo, pero GitHub Actions no ejecutó los mismos tests y no hay despliegue exitoso confirmado. La E2E simula el reconocedor e intercepta los endpoints de checkpoint/eventos; la escritura y lectura de Postgres y el readback MCP autenticado siguen siendo los últimos pasos de validación funcional real.

### Addendum C007 — Propuesta revisable de concordancia documental y contratos — 2026-10-16

**Base de código inspeccionada:** `dbc73afada1ad29abf46f4599d22cc3158a9a986`. **Estado:** propuesta para revisión; no aceptación multiplataforma, fusión ni despliegue. Se conserva este sprint como fuente de continuidad.

**Aprobación específica:** a la propuesta «unifique los esquemas anunciados con sus validadores, documente los permisos mínimos efectivos y añada pruebas de concordancia, sin ampliar permisos, admitir nuevos clientes, retirar la compuerta normativa, fusionar ni desplegar», el operador respondió «Si, aprobado.». Ese alcance no autoriza rediseñar identidad de plataforma ni cambiar políticas de autenticación.

**Diagnóstico:** quince herramientas registradas y quince anunciadas; duplicación manual de JSON Schema con un comprobante incompleto (incluida ausencia de output), dependencia de `norm:turn` además de los permisos de negocio y referencia literal de instrucciones a v1.7.2 cuando el contrato local es v1.7.6. La identidad normativa sigue fijada en ChatGPT; no puede declararse portabilidad a Notion por cambiar solo documentación. Metadatos públicos y respuesta anónima 401 observados en el inventario no prueban llamadas autenticadas. No apareció conexión Khora utilizable en el inventario de conexiones de esta conversación.

**Propuesta preparada:** derivar tools/list de las mismas formas Zod registradas; compartir el esquema estructural del comprobante con el verificador conservando los tipos públicos; derivar la versión anunciada de su constante vigente; añadir cobertura de concordancia; ampliar la documentación existente con catálogo de quince capacidades, permisos efectivos, dependencias, recuperación, matriz pendiente de clientes y enlace desde README. Se preservan handlers, verificaciones semánticas, política OAuth, scopes, identidad, revocación y formato normativo. No se modifica package.json ni el lockfile.

**Evidencia local dirigida:**
- Instalación aislada, sin scripts de instalación y sin tocar dependencias del producto: TypeScript 5.9.3, Zod 4.4.3, SDK MCP 1.30.0, tsx 4.19.2 y tipos Node 20.19.43.
- Comprobación de tipos dirigida sobre módulos modificados y pruebas de contratos: código 0; no es el typecheck integral de Khora ni incluye todos los imports de la ruta Next.js.
- `mcp_contract_concordance.test.ts` y `mcp_tool_auth_metadata.test.ts`: ocho pruebas aprobadas. JSON serializado validado independientemente, concordancia de las quince formas registradas, controles obligatorios, comprobante completo, evidencia condicional, preservación de extras, rechazo de plataforma distinta y rechazo anterior a red.
- `norm_check_parser.test.ts` existente: siete regresiones aprobadas. Total dirigido: quince aprobadas, cero fallidas.
- Cliente y servidor SDK conectados en memoria: tools/list y llamadas a las quince herramientas con manejadores de prueba; comprobante sin output rechazado sin ejecutar el manejador. No es una llamada al servidor productivo ni prueba de OAuth/Postgres.
- Cotejo contra la base por árbol de sintaxis: quince handlers de negocio idénticos y veintitrés funciones restantes del verificador idénticas. Comprobación diferencial de 232 entradas estructurales mutadas: cero entradas inválidas nuevas aceptadas y cero diferencias en ese conjunto acotado; no es prueba exhaustiva de equivalencia.
- Incidentes locales de dependencias, configuración de módulos/tipos y extracción de helper corregidos y registrados en el Registro Canónico de Errores de Terminal de Khora antes de publicar. El cotejo de formato encontró espacios finales en una línea documental modificada; se eliminaron antes de la comprobación final.

**Límites:** fixture parcial del repositorio; compilación/suite integrales, integración de la ruta Next.js, CI, despliegue y autenticación real NO VERIFICADOS por C007. No se accedió al equipo del operador ni se leyeron dictados productivos. No se probaron revocación real, permisos reales, persistencia normativa, lectura completa ni fricción de instalación. Los fallos históricos de Actions/contrato canónico descritos en C005/C006 permanecen antecedentes: no se presenta su estado actual como revalidado.

**Checkpoint:** revisar la propuesta en borrador y ejecutar los gates integrales en un checkout completo antes de considerar una fusión. Para la conexión Notion + segundo cliente, presentar y aprobar por separado el diseño de identidad normativa legítima y la admisión de clientes; no suplantar ChatGPT ni suprimir el ciclo. Medir después tiempo hasta operación válida, intervenciones y recuperación sobre sesiones auténticas, sin inventar una línea base. El objetivo general del encargo sigue ABIERTO.

**Revisión de secretos C007:** GitHub devolvió «Repository does not have GitHub Advanced Security enabled.»; no se habilitó ni se presenta ese escáner como ejecutado. Inspección local del diff añadido con siete familias de patrones de credenciales: cero coincidencias; fixtures sintéticos explícitos, sin credenciales recibidas. Es una comprobación acotada, no certificación exhaustiva de ausencia de secretos. Se cotejó además identidad literal de la autenticación y de requireNormativeTurn contra la base.

### C007.1 — Endurecimiento y documento único

Instrucción del operador: «Bien, endurecelo. Sin bloat. Que quede fino. perfecto. Eficiente.»; ampliación: «Que hjaya un documento que lo documente tood.». Se conserva `khora-web/docs/normative-check.md`, ahora titulado **Servidor MCP de Khora — documento canónico**, como única guía operativa enlazada desde README; el sprint mantiene evidencia/historia, no otro manual. Se consolidan los flujos repetidos y se cubren transporte, configuración, quince capacidades, esquemas, permisos efectivos, ciclo, datos/efectos, diagnóstico, compatibilidad y mantenimiento.

Las pruebas ya no reconstruyen withNormTurn ni las excepciones al gate: cargan la ruta completa y el transporte HTTP real del SDK mediante una lista cerrada de dependencias. Se sustituyen identidad/almacenamiento/servicios externos; no se acredita criptografía, OAuth, SQL ni despliegue reales. Cubren descubrimiento y llamadas de las quince herramientas; controles retirados antes del servicio; falta/revocación de autenticación, permisos y turno denegados; configuración ausente; límites/entradas inválidas; campos obligatorios anidados; concordancia del documento con el catálogo y versión. La fuente se transpila una sola vez por proceso de pruebas. No se cambia código productivo en este endurecimiento.

**Resultado local:** tipos dirigidos código 0; diecinueve pruebas aprobadas, cero fallidas. Suite integral, compilación Next.js completa, conexiones reales y fricción productiva siguen pendientes. Continúan sin autorización fusión, despliegue, ampliación de clientes/permisos y rediseño de identidad. No se crea documento paralelo, no se cambia privacidad ni se adquieren planes. Base de esta revisión: 97300985c9d1cf48d66cf3bda8d654887041b936; las pruebas nuevas sustituyen las reconstrucciones previas, no acumulan otro simulacro de registro.


### C007.2 — Auditoría de resultados y autenticación normativa · 2026-10-16

- Base main comprobada: `dbc73afada1ad29abf46f4599d22cc3158a9a986`; propuesta previa: `a80f3daf02c4282ea485ac783d5de8fbf32a48b4`. Este cambio es solo documental; sin fusión, despliegue ni modificación de credenciales/compuertas.
- Conexión Khora registrada en Notion, quince herramientas descubiertas; salud real: `UNAVAILABLE`, `missing_scopes: []`, `SI_MAIN_FETCH_404`. Apertura de ciclo falló con la misma razón; dictados no recuperados. No acredita identidad normativa legítima ni despliegue de la propuesta.
- GitHub autenticado confirmó `SeryMente/metodologia` privado y archivos canónicos en `main`. La implementación normativa llama a GitHub sin `Authorization`; no usa `GITHUB_TOKEN`. No se consultaron secretos del servidor ni se acreditó su configuración desplegada.
- Archivos locales de herramientas de volcados, observabilidad, servicio normativo y verificador cotejados por SHA de blob con main. Cuatro reproducciones causales aisladas confirmaron consulta sin autenticación, búsqueda incompleta como vacía, historial fallido como vacío y descifrado histórico sin bandera. Son pruebas del defecto, no pruebas de arreglo.
- Matriz de capas/resultados, credenciales y contrato propuesto incorporados al documento canónico existente, sección Diagnóstico; no crear otro manual. Cobertura estática y cuatro reproducciones no equivalen a pruebas exhaustivas de todos los resultados.
- Checkpoint: aprobación específica de diagnóstico público/privado y acceso servidor mínimo al repositorio normativo → implementación revisable + pruebas por rama → validación integral/autenticada → autorización separada de fusión/despliegue. Identidad/admisión multiplataforma siguen requiriendo diseño aprobado.


### C007.3 — Diagnóstico seguro y lectura normativa autenticada · 2026-10-16

**Aprobación:** el operador respondió «Si.» a implementar diagnóstico público saneado, detalle sensible solo en registro autorizado y credencial servidor con lectura mínima del repositorio normativo privado. Sin ampliar acceso a dictados, retirar compuertas, fusionar ni desplegar. Se publica en la misma propuesta #296; no otro sprint/manual. Base main `dbc73afada1ad29abf46f4599d22cc3158a9a986`; cabeza anterior `fbd94643b15069ff90ac65e149cfe095cb3ae607`.

**Implementación:** registro de códigos/recuperación/evidencia permitida; envoltura de las quince herramientas sobre registro público del SDK (incluye fallos anteriores al callback); normalización de errores HTTP MCP/OAuth/manual/revocación sin consumir cuerpos exitosos con credenciales; razones sensibles de autorización solo correlacionadas; redacción mínima del redirect de consentimiento, sin cambiar identidad ni diseño. Diez consultas normativas ahora usan helper autenticado con secreto dedicado `KHORA_NORM_GITHUB_TOKEN`, host/repositorio fijo, sin redirecciones/fallback amplio, diez segundos/ocho MiB y JSON válido. Snapshot/hashes/ledger/compuertas se conservan.

**Correcciones causales:** búsqueda ilegible declara parcialidad/cobertura; historial SQL fallido distingue secciones de vacío; descifrado histórico señala fallo e impide éxito; revisión/renderizado propaga error real y no URL interna. Base de datos diferencia configuración/esquema/permiso/disponibilidad. Runtime ausente/obsoleto y verificación rechazada/incompleta son resultados distintos. Auditoría fallida (false/excepción/presupuesto 750 ms) se declara sin repetir negocio; true es requisito para afirmar persistencia.

**Evidencia local:** Node 24, TypeScript 5.9.3, SDK 1.30.0, Zod 4.4.3, tsx 4.19.2, fixture parcial y dependencias aisladas. Cuatro suites dirigidas: **47 aprobadas, cero fallidas**; comprobación de tipos dirigida código 0. Ruta completa/transporte reales con identidad, almacenamiento y servicios externos sustituidos; pruebas de llamadas fallidas de los quince servicios, esquema real del SDK/no filtración, GitHub 401/403/404/429/500/422, red/JSON/timeout/tamaño y restricción de destino, resultados parciales/historial/descifrado, errores HTTP estándar, auditoría false y excepción, cuerpos de éxito intactos y redacción de consentimiento. Incidentes de alias, clasificación del SDK y dependencia no descargada registrados y corregidos; no son fallos productivos.

**Límites y checkpoint:** código revisable, no reparación productiva acreditada. Sin secreto provisionado, fusión/despliegue ni dictados recuperados. Falta build/typecheck/suite integrales en checkout completo, pruebas de ramas reales OAuth/SQL/criptografía y proveedor, revisión de seguridad, validación privada de alcance efectivo de credencial y autorización separada de despliegue. Después: probar nueva salud/apertura de ciclo, identidad legítima aprobada, Notion + segundo cliente, recuperación íntegra, revocación controlada y fricción real. Identidad ChatGPT permanece intacta; no suplantarla. C007.2 conserva el diagnóstico histórico; su pendiente de aprobación queda satisfecha solo para el alcance descrito aquí. El objetivo general continúa abierto.


### C007.4 — Fusión autorizada a main y comprobación real de dictados · 2026-10-16

El operador instruyó «Todo enel repño actualizado? hazlo main» y pidió revisar acceso y razón de error. Se retiró el estado borrador y se fusionó #296 por merge, comprobando cabeza esperada `336d6bea2e1d8d6f89a400e21a74840d73eab9b4`; GitHub confirmó `merged: true`, commit `93b77fc0cc1b3fb62ca69fdc725d18f8730bc6ee`. La consulta de check-runs volvió a ser denegada con HTTP 403 «Resource not accessible by personal access token»; no se presenta como CI aprobado. La fusión no ejecutó ni acredita validación integral. Los 47 tests dirigidos son evidencia del ciclo anterior, no una nueva ejecución en este ciclo.

Comprobación autenticada real: `khora_mcp_health` devolvió `ok:false`, `status:UNAVAILABLE`, `full_access:false`, `missing_scopes:[]`, `reason:SI_MAIN_FETCH_404`; `khora_norm_open_turn` devolvió `SI_MAIN_FETCH_404`. No se obtuvo token de turno ni se pudieron invocar legítimamente listado/lectura: dictados NO RECUPERADOS. El error observado sigue siendo el mensaje antiguo y no demuestra qué revisión corre ni el estado de secretos. En la base, la petición normativa a GitHub era anónima hacia repo privado; el código fusionado requiere credencial dedicada. No confundir ninguno de esos hechos con prueba de que el token Bearer de dictados esté defectuoso.

Se actualizan estado del documento único y continuidad; no se modifican credenciales, scopes, identidad o compuertas ni se ejecuta despliegue manual. Pendientes: validación integral/seguridad, alcance efectivo y provisionamiento privado del secreto normativo, revisión desplegada y nueva comprobación. La identidad normativa legítima en Notion sigue requiriendo diseño/aprobación propios. El objetivo funcional permanece abierto.


### C007.5 — Explicaciones de acceso en lenguaje sencillo · 2026-10-16

Autorización expresa: «Asi de simple quiero las explicaciones para codigo de error de acceso almcp, redactalas conmucho cuidado, actualiza el repo, y que todo main». Base verificada: main `0e28f9b22cd47051c9c430c8c5eba08b2d338d41`. Se cambian textos, no política: descripción breve de qué pasó y acción comprensible indicando quién debe realizarla. Se nombra SeryMente/metodologia al explicar acceso a instrucciones privadas; credencial servidor distinta de acceso a dictados; un 404 no se convierte en certeza de credencial ausente o archivo borrado. Causa desconocida declarada, sin códigos como sustituto de explicación. Motivos de autorización protegidos también redactados con claridad, conservando su separación de respuestas públicas resistentes a enumeración.

Registro ejecutable existente y documento único actualizados, sin otro manual. Pruebas de inventario de mensajes, brevedad, ausencia de jerga/código como explicación, causa desconocida y ambigüedad 404. Regresión dirigida: **49 pruebas aprobadas, cero fallidas; tipos dirigidos código 0**, fixture parcial. No se acredita build/suite integrales ni despliegue por estas pruebas. Códigos, metadatos, evidencia permitida, reintentos, scopes, autenticación, ledger y compuertas sin cambios. Publicación directamente a main autorizada; no se provisionan secretos ni se ejecuta despliegue manual. No hay nueva prueba productiva de dictados en este ciclo: el último antecedente continúa en C007.4.


### C008 — Benchmark de uso y retroalimentación a medida · preparación e implementación · 2026-10-16

**Instrucciones nuevas:** «Que la encueta admita entrada manual adicional. Continua». El ciclo previo pidió recuperar el contexto migrado, usar medición y opinión para mejorar funciones hechas a medida y estudiar encuestas tras el uso, no avisos aleatorios fuera de contexto. La conversación adjunta confirma la reparación para el operador («Quedó bien»); esa comprobación humana histórica no se vuelve una ejecución nueva.

**Base:** main `a7cb55683ee4ad2e6f6d7e3c16a6d7635b609e65`, posterior a la revisión de preparación `1eedb3711268206ee5cd37743c1f3cd31ba5ec70`. Producción: marcador ep-main-live.json HTTP 200, `8206cd7aefc14dc615182c77081037fec6cd2e69`. /api/version devolvió sin-metadatos-de-git y no se usa como prueba suficiente de versión. #297 confirmado fusionado y comentario de publicación leído. La ruta Ingreso ahora monta IngresoWorkspace: no modificar la antigua ubicación del monolito.

**Diseño y cambios revisables:** encuesta opcional y no interruptiva con valoración, motivo y comentario libre (también comentario solo), datos privados por propietario, comentario cifrado con mecanismo existente, exportación/borrado, telemetría nueva inicialmente opt-in. Separar benchmark reproducible, mediciones de uso y opiniones muestreadas/voluntarias. El contrato no inventa fidelidad ni medición visual completa. Se conserva observabilidad anterior sin convertirla en un almacén público de comentarios. Guía operativa única de la capacidad: [Dictado · Benchmark, uso real y retroalimentación](../khora-web/docs/dictado-experience.md).

**Entorno:** Remote Desktop Commander activo bajo CENTRAL/MantenimientoRCI, distinto del perfil anterior fila4; ruta histórica ausente. Fuente canónica confirmada mediante API. Checkout temporal propio `khora-benchmark-12e2074e`; remoto SeryMente/khora; no acceso a credenciales de otro perfil. GitHub MCP principal requiere reconexión; conexión alternativa y gh funcionan con la fuente correcta. Vercel whoami/project ls/link confirman cuenta y proyecto khora-web. No inferir variables disponibles por meramente vincular proyecto.

**Incidentes:** PowerShell anidado consumió variables y falló antes del payload; corregido usando shell directo. Preflight abortó por ruta histórica ausente; se preparó checkout aislado con remoto verificado. npm stderr/warning se convirtió en NativeCommandError por ErrorActionPreference Stop; repetición mediante cmd y evaluación de exit code aprobó npm ci, Node 24/tsx comprobados. Clonado presenta modificación de finales de línea en scripts/khora/khora.ps1; no se stagea ni modifica el contenido del Entorno Persistente. El espejo khora-vercel es antiguo (julio) y se descarta; 404 de candidatos no implica falta de acceso a la fuente. Registro canónico de errores actualizado y leído para confirmar.

**Estado de este punto:** IMPLEMENTADO EN PROPUESTA, NO VERIFICADO. Artefacto de benchmark comienza not_run. Pruebas, revisión de seguridad/interfaz, persistencia real, fusión y despliegue aún pendientes. No se amplía aprobación histórica de #297 a fallos de módulos ajenos ni se afirma que Actions o el proveedor real funcionan. Tras ejecutar se añadirá evidencia nueva sin reescribir estos resultados.


### C009 · Verificación y compuerta de publicación · 2026-10-16
- Instrucción adicional: «Que la encuesta admita entrada manual adicional. Continua». Implementada entrada libre opcional de hasta 1000 caracteres; se admite comentario sin valoración.
- Rama `feat/dictado-benchmark-feedback-20261016`, código probado `185f09b`: benchmark dirigido 20/20; navegador 14/14; suite unitaria completa 402/402; tipos, contratos/revisión de interfaz y build correctos. Reconocimiento y SQL externos controlados: NO equivalen a validación de voz o base productiva.
- Artefacto publicado por código: `khora-web/lib/generated/dictado-benchmark.json`; especificación completa: `khora-web/docs/dictado-experience.md`.
- Descarga local Vercel no valida DATABASE_URL ni clave; causa abierta. No se modifican secretos. Se añade compuerta de almacenamiento opt-in para candidata sin promoción de dominio: escritura, cifrado, lectura y borrado de propietario sintético.
- Hasta verificar esa candidata: NO desplegado en dominio público, NO persistencia productiva certificada.


### C010 · Candidata verificada y aislamiento de perfil · 2026-10-16
Código probado `11fde5a7da7aec46b9873103ddf13213ba1c6c4f`: benchmark aprobado, 15 pruebas de navegador; suite unitaria, tipos, ui-review:check y ui:contract con salida 0. Se añadió regresión de cambio de perfil: se reinician consentimiento, borrador, muestra y sesión de métricas; 401 invalida el informe anterior.

Candidata Vercel `khora-6zly05101-victorhugotorresmendez-8991s-projects.vercel.app`, sin promover dominio: build productivo real correcto y compuerta `EXPERIENCE_STORAGE_PREFLIGHT=passed write+cipher+read+delete (synthetic owner only)`. Verificados SQL real, comentario cifrado en reposo (payload sin texto), lectura descifrada y borrado de filas sintéticas. No hubo sustitución de claves. Esto resuelve el falso negativo de configuración descargada, NO valida todavía sesión humana ni micrófono físico.

El proyecto Vercel usa un Build Command propio que no invoca npm prebuild. Para esta candidata se pasó configuración local temporal que antepone la compuerta y conserva después la secuencia existente de migración runtime + `next build --webpack`. No se modificó la configuración permanente del proyecto ni infraestructura del Entorno Persistente. La publicación final debe exportar main exacto, generar la procedencia y acreditar el alias; no promover esta candidata de rama como si fuese main.

### Controles externos no ejecutados
GitHub Actions, ejecución 38967613218, no inició trabajos: `The job was not started because recent account payments have failed or your spending limit needs to be increased.` Los estados Vercel de integración GitHub también señalan restricción de repositorio privado de organización en plan Hobby. No se modifican facturación, plan, visibilidad, permisos ni protecciones. Las comprobaciones ejecutadas directamente y el build Vercel son evidencia independiente, no equivalencia a Actions verde. La integración solo puede usar merge normal, sin anulación administrativa de controles.

## Acuerdo del frente y estado Fase 0/1 — 2026-11-15

- **Fase 0 acordada:** Crónica y Escuchar a Chrome / Organizar como diálogo forman parte de Dictado según los límites de §4. La modalidad de Chrome/diálogo descrita es objetivo de Fase 2; el comportamiento del Diálogo actual no se modifica en esta fase.
- **Fase 1 implementada en rama de trabajo:** selector Dictado/Crónica en Ingreso; checklist local reversible de cuatro pistas; eventTime separado de capturedAt; checkmark activo por defecto, desactivable y persistido en CapturaSnapshot y /api/dictado/checkpoint.
- **Límite de archivo:** el endpoint /api/dictado sella el volcado y, para Crónica, escribe integration_handoff dentro de la misma transacción PostgreSQL. La clave durable incluye session_id, volcado_id, version y source_sha256; la idempotencia de reintento usa intent_id + session_id.
- **Estados:** checkmark activo = queued + auto_publish=true + publication_authorized=true; checkmark inactivo = disabled + ambos flags false. El propietario se deriva de auth().user.email. event_time y captured_at se almacenan separados.
- **Consumidor Integración:** no se identificó consumidor que ejecute destinos externos dentro de main. La fila queued queda lista para Integración; Dictado no realiza llamadas a plataformas ni declara publicación completada.
- **Rama inicial:** feat/dictado-cronica-fase0-1-20261115, creada desde HEAD de main fae473c21985d38623d4b693c10af32176536b95. No se integran PR #335, #330, #334 ni #354.
- **No regresión y fronteras:** no se alteran Dictado normal, Adjuntar audio, Diálogo actual, Custodia local/B2 ni Notas rápidas; Chat/Open WebUI queda fuera. No se añaden APIs externas de publicación en Dictado.
- **Commits verificados:** Fase 0 documental `007cbf738c864b37e0e083c04338002af7da4433`; Fase 1 código/migración/pruebas `40803dec7a863c505cfa9f55e51cb1a4c0e74154`. Ambos descienden del HEAD base `fae473c21985d38623d4b693c10af32176536b95`.
- **Verificación:** `npm run typecheck` salida 0; `npm run ui:contract` salida 0; `npm run ui-review:check` salida 0; `npm run test:unit` 615/615, cero fallos/omitidos; `npm run build` `BUILD_EXIT=0`, Next compiló, TypeScript pasó y generó 78/78 páginas; la fase prebuild ejecutó de nuevo los gates. El preflight de almacenamiento B2 quedó omitido por `KHORA_B2_PREFLIGHT` desactivado.
- **E2E:** Chromium ejecutó `e2e/dictado-cronica.spec.ts`, `e2e/contracts/ingreso.spec.ts` y `e2e/dictado-edicion-continuidad.spec.ts`: 13/13 correctas, salida 0. Incluye checkmark activo/inactivo, checklist 4/4 y 0/4 sin bloqueo, payload normal sin handoff y regresión de continuidad/edición.
- **Límite de evidencia:** persistencia/idempotencia del helper se verificó con dobles de PostgreSQL y pruebas de contrato; no se ejecutó contra PostgreSQL/Neon real. La migración 034 no se ha aplicado a ninguna base productiva. No se realizó despliegue.
- **Aceptación pendiente:** no equivale a merge, migración productiva, consumidor Integración operativo, publicación de extremo a extremo ni aceptación humana.


## Estado de implementación Fase 2/3 — Diálogo en vivo y master estéreo único (2026-11-15)

### Implementación en rama acumulativa
- Rama: feat/dialogo-live-master-audio-fase2-3-20261115, creada desde el HEAD de feat/dictado-cronica-fase0-1-20261115 (d9bd212b3b9d7bddd16b8145c898fb4ae134e132). No se modifica main ni se fusiona ninguna rama histórica de PR.
- Controles dentro de Dictado: «Iniciar dictado» (micrófono implícito), «Escuchar a Chrome» y «Organizar como diálogo» marcado y deshabilitado cuando está activo el modo diálogo. Se elimina el control de micrófono separado.
- Captura original: los MediaRecorder independientes por fuente permanecen como pistas originales de Custodia. El AudioWorklet consume copias derivadas, nunca sustituye ni condiciona el almacenamiento original. El micrófono se solicita con audio:true; el navegador no necesita reportar ni desactivar control de eco, supresión de ruido o ganancia automática.
- Transcripción viva no autoritativa: AudioWorklet deriva ventanas WAV PCM16 mono de 16 kHz, duración 6.5 s y paso 6 s (500 ms de solapamiento). El downmix detecta señal estéreo en oposición de fase y evita que se cancele a silencio. USUARIO y CHROME mantienen colas FIFO independientes y acotadas, reintentos limitados, respeto acotado de Retry-After ante 429 y errores recuperables sin detener las grabadoras de custodia.
- Servidor: /api/transcribir/dialogo/segmento exige autenticación, sesión del propietario, fuente, secuencia/timing y WAV PCM16 de tamaño y encabezado exactos; Groq Whisper whisper-large-v3 se invoca exclusivamente desde el servidor Khora. No se expone la API key en el navegador.
- Integridad de edición: segmentosRaw conserva las transcripciones recibidas por fuente/secuencia/tiempo como evidencia inmutable dentro del snapshot cifrado. La deduplicación y reconciliación de solapamientos solo producen una proyección de pantalla. displayText permanece editable; si hay cambios humanos, los segmentos tardíos se dejan pendientes y solo se añaden al final mediante acción explícita.
- Fallback: /api/transcribir/dialogo queda reservado a reconstrucción post-cierre de las fuentes/ventanas fallidas, a partir de pistas originales ya custodiadas. No es el carril principal ni sustituye una transcripción viva correcta.

### Master descargable y límite de Custodia
- Hay una sola descarga de audio para el diálogo: WAV PCM16 estéreo sincronizado, canal izquierdo USUARIO y canal derecho CHROME. Se genera al solicitar la descarga desde las dos pistas originales verificadas; no se guarda como reemplazo, no altera sus bytes, su SHA-256, sus metadatos ni las rutas existentes de Custodia local/B2.
- La ruta /api/transcribir/dialogo/master autentica al dueño, vuelve a leer los blobs originales mediante la comprobación existente de tamaño y SHA, deriva el master y devuelve su SHA-256. El navegador verifica esa huella antes de iniciar la descarga. No se cambian custodia-local.ts, /api/dictado/checkpoint, /api/audio, el cifrado IndexedDB, el contrato B2 ni el protocolo de subida/read-back.
- La transcripción nunca es requisito para conservar audio. Un fallo de Groq, de una cola o del AudioWorklet no detiene ni degrada la grabación original; las limitaciones de custodia remota continúan señalándose por el circuito existente.

### Evidencia, límites y aceptación pendiente
- Validaciones automatizadas ejecutadas para esta rama: typecheck, ui:contract, ui-review:check, test:unit, build y E2E Chromium de Dictado/Crónica/Diálogo y continuidad. Los resultados y hashes de commits se registran en la evidencia del ciclo al cerrar la rama.
- Las pruebas unitarias cubren PCM16/WAV, duración y solapamiento de ventanas, downmix anti-fase, colas/reintentos/429, reconciliación de pantalla, raw/display, protección de edición, contrato de ventana y endpoint, codificación de master estéreo y ruta autenticada de descarga.
- Pendiente de aceptación acústica humana: realizar una sesión real en Chrome seleccionando la pestaña y activando «Compartir audio», conceder micrófono, hablar y reproducir voz remota simultáneamente, validar atribución L/R, sincronización/desfase, deriva, latencia, clipping, cancelación por fase y estabilidad durante varios minutos. Descargar el master, comparar su SHA del cliente con el servidor y confirmar que las huellas y bytes de las pistas originales antes/después permanecen idénticos.
- No se ejecutó prueba acústica real con hardware/navegador del operador, llamada real a Groq ni preflight B2 real. El preflight B2 quedó omitido por configuración (KHORA_B2_PREFLIGHT no habilitado). No hubo despliegue ni cambios de Neon/producción.
- No se declara aceptado el audio en condiciones reales hasta completar la prueba descrita y registrar la aceptación humana.

## 13. Evidencia de cierre de Fase 2/3 — 2026-11-15

- Base inmutable de esta rama: feat/dictado-cronica-fase0-1-20261115 en d9bd212b3b9d7bddd16b8145c898fb4ae134e132. Rama acumulativa: feat/dialogo-live-master-audio-fase2-3-20261115. El commit de implementación es 7ba03c83bd3037189766f729ccb86b45a86ba2c5 (feat(dialogo): add live transcription and stereo master); las pruebas finales adicionales se registran en ed37b78d2979f262799504b5908a738c893fd428 (test(dictado): cover bounded live dialogue fallback).
- Verificación final: npm run typecheck PASS; npm run ui:contract PASS; npm run ui-review:check PASS; npm run test:unit PASS, 636/636, 0 fallos; npm run build PASS, exit code 0, runtime 98.70 s, TypeScript 5.5 s y SSG 78/78. Playwright Chromium: 14/14 aprobadas, 44.6 s (Diálogo, Ingreso, Crónica y continuidad/edición).
- El servidor de build incluye las rutas /api/transcribir/dialogo/segmento y /api/transcribir/dialogo/master. Los checks de contrato UI y ui-review reconocen los controles añadidos. git diff --check pasó.
- Compilación: Next.js 16.4.0 terminó correctamente. Emitió advertencias de dependencias que usan APIs de Node no disponibles en Edge Runtime y la advertencia de la convención middleware deprecada; no impidieron la compilación.
- Prebuild de almacenamiento: EXPERIENCE_STORAGE_PREFLIGHT=not_requested; B2 se omitió porque KHORA_B2_PREFLIGHT no estaba habilitado. No se escribió ni alteró B2. No se aplicó ninguna migración ni se realizó operación de escritura contra Neon; no hubo despliegue ni llamadas reales a Groq.
- Integridad de Custodia: no se modificaron custodia-local.ts, /api/audio, IndexedDB cifrado, B2, ni el flujo de subida y SHA/read-back. El schema del checkpoint solo se extendió aditivamente para admitir segmentos crudos de diálogo. El master se deriva desde pistas originales que se vuelven a leer con la verificación existente; ninguna pista se sustituye por el master.
- La rama acumula Crónica + Diálogo y no integra ramas históricas de PR. main no se modificó. La publicación remota de esta rama se verifica de forma independiente por lectura de vuelta del ref.
- Aceptación acústica humana sigue PENDIENTE: probar en Chrome real seleccionando pestaña con Compartir audio, habilitar micrófono, hablar simultáneamente con audio remoto, medir atribución de canales, sincronía/desfase, deriva, latencia, clipping, cancelación de fase y estabilidad de varios minutos. Descargar el único master WAV, cotejar SHA-256 y comprobar que los originales mantienen sus bytes/huellas antes y después. No declarar aceptación acústica a partir de mocks, WebM sintético o E2E visual.
