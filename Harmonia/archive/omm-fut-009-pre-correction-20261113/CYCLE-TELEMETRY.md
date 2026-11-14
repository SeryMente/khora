# Harmonia · contrato de telemetría de ciclos

**Sprint:** HARMONIA OMM-01 — Observa · Mide · Mejora
**Contrato operativo:** v2.4 · extensión 0.4.9 / colector 0.4.8.1
**Adaptador prioritario:** chatgpt-web-free
**Adaptadores posteriores:** OpenWebUI de Cora y clientes API (diferidos).
**Fuente rectora:** OCP Harmonia §§6, 12, 16, 28, 30, 33, 34 y 36; este archivo describe el contrato y no prevalece sobre el OCP.

## 1. Propósito

Medir ciclos observables de ChatGPT Web gratuito usando señales gráficas de inicio y fin del procesamiento. El contrato de eventos es neutral; el mecanismo de detección pertenece a cada adaptador.

La métrica no representa inferencia interna pura del modelo. Compara ciclos entre revisiones conocidas del marco de trabajo, con método, cobertura y limitaciones explícitos.

## 2. Marcas temporales del adaptador ChatGPT Free

- **T0 — envío/correlación:** Enter o acción de envío confirmada o nuevo nodo de usuario detectado; no inicia el cronómetro.
- **T1 — inicio:** primera transición gráfica observable de inactividad a actividad después de identificar el nuevo turno. Si el indicador de actividad aparece antes de que el DOM adjunte el nodo de usuario, el observador correlaciona la señal dentro de la ventana acotada de 2.000 ms; una señal antigua no se reasigna a otro turno.
- **T2 — fin:** primera transición gráfica de actividad a inactividad posterior a T1, siempre que el DOM ya represente una respuesta del asistente atribuible al turno. La ventana de estabilidad confirma que la inactividad persiste; no mueve T2 ni se suma al KPI.
- **T3 — presentación final:** estado visual de respuesta disponible; métrica secundaria cuando pueda identificarse con evidencia.

KPI primario: chatgpt_ui_generation_ms = T2 - T1.

T1 y T2 se registran con reloj monotónico dentro del mismo contexto temporal. La marca UTC sirve para auditoría, no para calcular la duración.

### Señales candidatas (validación natural pendiente)

- aria-busy=true
- data-is-streaming=true
- controles visibles Stop/Detener generación
- indicadores visibles de progreso de agentes/tareas.

Los IDs normalizados se limitan a aria-busy, data-is-streaming, stop-control y agent-progress. La candidata 0.4.7 conserva aria-label en el attributeFilter del MutationObserver para detectar cambios de etiqueta del mismo botón entre enviar y detener generación. aria-label es un atributo observado, no una nueva señal semántica de actividad por sí sola.

Si T1 o T2 no son inequívocos, el ciclo no recibe duración.

## 2.1. Cobertura estructural auxiliar

El catálogo 0.1.3 añade diez superficies: navegación primaria, barra lateral, encabezado global, menú, listbox, diálogo, popover, selector de herramientas, combobox y selector de modelo. El detector registra solamente tipo de región, cantidad, cantidad visible y hasta ocho muestras estructurales por tipo: tag, rol allowlisted, test ID tokenizado, clases tokenizadas, número de hijos, visibilidad, expansión, tipo de popup, estado modal y disabled.

No lee texto de navegación, títulos de conversaciones, contenido de menús/diálogos, labels visibles, valores de campos ni href/URLs. Las mutaciones auxiliares observadas se limitan a atributos estructurales allowlisted; cambios de texto/aria-label no generan lecturas de contenido. La detección auxiliar solo aumenta el catálogo y el banco de superficies; no interviene en T1/T2 ni cambia chatgpt-ui-generation.v1.

## 3. Delimitación y límites

- El KPI mide el intervalo entre transiciones gráficas; no mide inferencia interna del servidor.
- El callback puede observar el cambio después de su ocurrencia visual por planificación de JavaScript o carga local. No se recopila CPU/RAM ni se corrige estadísticamente con esos recursos.
- La métrica no garantiza independencia absoluta del navegador o del scheduling local.
- settle_window_ms=1500 confirma persistencia de inactividad; no se añade al timestamp T2.
- Tiempo de red, duración desde Enter a respuesta visible y tiempo de resolución de un objetivo multi-turno son métricas distintas.
- No se acepta un cierre por respuesta intermedia, fragmento o señal no atribuible al ciclo.

## 4. Contrato común de eventos

El adaptador emite processing_started y processing_completed, normalizados como client.cycle.started y client.cycle.completed.

Campos mínimos: conversation_id, cycle_id (UUIDv7 local), platform_adapter, metric, measurement_method, framework_revision, phase, timestamp_utc, monotonic_ms, clock_source, clock_precision_ms, coverage, start_signal_ids y end_signal_id. duration_ms solo existe para un par medido válido.

Estados derivados: MEASURED, INCOMPLETE o NOT_MEASURED.

## 5. Compatibilidad con datos históricos

El campo histórico duration_ms de cobertura new-dom-node-v1 conserva su semántica anterior. No se migra ni se presenta como chatgpt_ui_generation_ms. El colector lo etiqueta LEGACY_MEASURED y lo resume por separado. Solo chatgpt-ui-generation.v1 entra en la mediana/P90 principales.

## 6. Correlación y estados

- T0 y el nodo de mensaje identifican/correlacionan el turno; no son T1.
- Una transición de actividad debe producirse después de identificar el nuevo nodo de usuario o quedar correlacionada con él dentro de la ventana acotada de 2.000 ms.
- T2 conserva la primera inactividad. El cierre solo se acepta cuando el DOM muestra una respuesta de asistente atribuible y la actividad continúa inactiva al finalizar el settle.
- Cancelaciones, reintentos, regeneraciones, reemplazo de pestaña, navegación SPA o pérdida de observación conservan cobertura/razón; no inventar duración.
- INCOMPLETE: inicio sin cierre. NOT_MEASURED: cobertura insuficiente o correlación inválida.

## 7. Persistencia y transporte

La extensión usa chrome.storage.local como cola durable local previa al colector, con límites configurados de 1.500 eventos o 4 MiB. Persiste eventos sanitizados en orden; reenvía cuando el colector loopback está disponible y autenticado; el colector aplica idempotencia por eventId. El colector 0.4.7.1 crea explícitamente el directorio diario tanto para `capture.*` como para `ui.surface.*` antes de escribir JSONL. La cola no equivale al almacén JSONL del colector ni sobrevive a que el titular elimine los datos de la extensión.

## 8. Privacidad

No almacenar prompts, respuestas, texto del compositor, texto de mensajes, valores de campos, texto de navegación, contenido de menús/diálogos, cookies, credenciales, cabeceras de autenticación ni cuerpos de solicitudes. No incluir identificadores de sesión/conversación/pestaña en el informe diagnóstico. Solo eventos sanitizados y metadatos estructurales allowlisted; la sanitización se aplica en la extensión y se vuelve a aplicar en el colector.

## 9. Estado de implementación y aceptación

La candidata local 0.4.7 implementa:
- transición de actividad gráfica para T1/T2;
- correlación acotada entre señal temprana y nodo de usuario;
- observación de cambios aria-label, aria-busy y data-is-streaming;
- contrato común, framework_revision, validación y separación de legado DOM;
- cola durable local, resumen agregado y popup;
- informe harmonia.diagnostic-report.v1 y lectura equivalente headless.
- catálogo de cobertura 0.1.3 con 54 capacidades y diez superficies auxiliares estructurales.
- saneamiento auxiliar por allowlist y persistencia de metadatos en el colector; no captura de contenido emergente.

Suite automatizada de esta candidata: **35/35 PASS** (observador, service worker, catálogo auxiliar, colector y Groq Assist local con transporte simulado); cinco scripts PowerShell pasan el parser. La integración del colector prueba `capture.started` y el primer `ui.surface.scan` desde dos directorios diarios inexistentes, además de saneamiento y cobertura. La E2E histórica de 469,1 ms es sintética y no valida captura natural.

El operador confirma la instalación de 0.4.7; artefactos recientes con catalogVersion 0.1.3 y features auxiliares verifican que el scanner se ejecutó. El colector 0.4.7.1 responde HEALTH=OK con catálogo 0.1.3 y rechaza peticiones sin credencial (HTTP 401). La consulta de cierre reporta 21 sesiones, 433 barridos, 431 superficies únicas, 20/54 capacidades observadas (40%) y 59% combinado; seis features auxiliares están presentes. El endpoint `/cycles` aún devuelve 0 registros: no hay T1/T2 natural aceptado. BMO-01 permanece NO ALCANZADO hasta cinco ciclos naturales aceptados y el resto de criterios del OCP §16.4.

## 10. Gobernanza

ART-027 de DUG define telemetría separada para frecuencia de consulta de principios. No mide ni infiere aplicación normativa por ciclo. Este contrato registra tiempos operativos de interfaz y no modifica ART-027.

## 11. Referencias

- OCP Harmonia: docs/frentes/harmonia/OBJETO-CANONICO.md.
- DUG v388 / NX-388m.
- OpenAI Terms of Use: https://openai.com/es-US/policies/row-terms-of-use/


## 12. Traza diagnóstica del observador — contrato v2.4

La candidata 0.4.8 añade el evento independiente `diag.cycle.trace`. Su propósito es identificar el primer eslabón fallido de la observación natural sin alterar la métrica ni la máquina de estados T1/T2.

Etapas permitidas: `observer_started`, `main_state`, `signal_state`, `user_turn_observed`, `activity_edge`, `correlation`, `cycle_decision` y `worker_ack`. Las únicas señales admitidas son `aria-busy`, `data-is-streaming`, `stop-control` y `agent-progress`. Para cada señal se limita el registro a contadores de coincidencias, exclusiones y elementos visibles. Se permiten booleanos, contadores acotados, tiempo monotónico relativo y enums definidos por el validador; se rechazan claves adicionales y strings libres.

La extensión limita el envío a 96 trazas por sesión de captura. El service worker impone el mismo límite persistente por sesión, asigna una secuencia local y no incluye IDs de pestaña, conversación ni ciclo en el payload. El colector admite hasta 20.000 trazas de diagnóstico en el índice; al alcanzar el máximo rechaza la nueva traza con HTTP 429 y no borra datos previos. El resumen autenticado `GET /cycle-diagnostics` expone únicamente el total, conteos por etapa/entrega y última etapa/marca temporal, sin IDs ni payloads.

La entrega se interpreta por separado:
- `posted`: el colector contestó 2xx y aceptó el evento.
- `queued_outbox`: sólo está preservado localmente en `chrome.storage.local`; todavía no prueba persistencia del colector.
- `network_error`, `http_4xx`, `http_5xx`: resultado de entrega diferenciado; las trazas diagnósticas rechazadas 4xx no se vuelven a encolar como eventos inválidos.

Las trazas no se añaden a `index.cycles`, no afectan `chatgpt-ui-generation.v1`, no modifican medianas/P90 y no se interpretan como ciclos medidos. La persistencia JSONL conserva el sobre interno de sesión para partición/idempotencia; el payload diagnóstico no contiene identificadores personales ni de conversación. La presencia de una traza de inicio tampoco demuestra T2: sólo un par natural started/completed aceptado por el validador aparece en `/cycles`.

La versión 0.4.8 añade la observación de la discrepancia entre coincidencias estructurales, exclusiones y visibilidad, además de cambios de estado del contenedor `main`. No cambia los selectores, los filtros de visibilidad/exclusión, la correlación de 2.000 ms, el settle de 1.500 ms ni la definición/duración del KPI.
