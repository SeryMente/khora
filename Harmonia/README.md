# Harmonia · frente de KHORA

**Candidata local:** 0.6.0  
**Build:** LOCAL-OMM-FUT-009-STRUCTURAL-ACTIVITY-RETIRE-TEMPORAL-METRICS  
**Baseline anterior inmediato:** 0.5.0 · preservado byte a byte en archive/omm-fut-009-pre-correction-20261113/  
**Gobierno:** Samantha v396 / NX-396m · Metacanon §52 desactiva métricas temporales  
**CI local:** 104/104 PASS · GitHub Actions / PR / merge pendientes  
**Hito:** BMO-01 — Bucle Mínimo Operativo (**NO ALCANZADO**)

## Reporte de frentes activos · OMM-FUT-004

El popup de Extension permite asociar explícitamente la conversación ChatGPT activa a un frente y consultar la actividad en ventanas móviles 24 h, 48 h, 72 h y 7 días. La fila muestra nombre del frente, etiqueta relativa, fecha/hora local y URL canónica de la conversación activa. No infiere el frente leyendo el contenido de los mensajes.

Eventos nuevos: `front.assignment` y `front.activity`; almacenamiento reutilizado: outbox local, JSONL e índice existentes. La asociación nueva reemplaza la anterior para el reporte actual sin borrar el historial.

Auditoría del dataset: `docs/frentes/harmonia/evidencias/HARMONIA-AUDITORIA-DATOS-FRENTES-D039.md`. Registro SemVer: `docs/frentes/harmonia/REGISTRO-VERSIONES-EXTENSION.md`. OCP y especificación general son las fuentes de backlog y definición técnica.

## Regla recurrente de observabilidad · OMM-FUT-006

Cada esfuerzo de desarrollo o ampliación de Extension ejecuta en paralelo una revisión de suficiencia de la observabilidad y del banco existente. Los hallazgos se acumulan; una tarea discreta de mejora se propone cuando haya evidencia convergente y requiere autorización del operador antes de cambiar los productores o el contrato de datos.


**Sprint:** HARMONIA OMM-01 — Observa · Mide · Mejora
**Hito:** BMO-01 — Bucle Mínimo Operativo (**NO ALCANZADO**)

Este directorio contiene el workspace local de Harmonia. La carpeta cargable de Chrome es Extension/; manifest.json permanece directamente en su raíz.

## Alcance y propósito

Harmonia construye un bucle semiautomatizado de observabilidad y mejora: observar metadatos estructurales de ChatGPT Web gratuito, medir los ciclos gráficos, mantener un catálogo local de cobertura y guiar mejoras de la extensión según las instrucciones verbatim y las intervenciones del operador. El contrato de telemetría es neutral para futuros adaptadores como OpenWebUI de Cora y clientes API, pero su implementación inmediata prioriza ChatGPT Web gratuito.

La UI debe evolucionar hacia una presentación moderna, pulida y simplificada. El banco de observabilidad contiene señales, atributos allowlisted, tipos de superficie, versiones, estados, cobertura y métricas; no texto de conversación.

## Candidata 0.4.7

- Manifest V3, versión 0.4.7.
- Build metadata: Extension/build-info.json, revisión LOCAL-OMM-01-008-AUXILIARY-UI-SURFACES.
- Catálogo 0.1.3 con 54 capacidades: añade 10 categorías estructurales de navegación, barra lateral, encabezado, menús, listas de opciones, diálogos, popovers, selector de herramientas y selector de modelo.
- Extension/surface-catalog.js inspecciona como máximo 8 muestras por categoría y solo emite tags, roles, test IDs y clases allowlisted, contadores, visibilidad y estados estructurales. Nunca lee textos, etiquetas visibles, URLs ni valores de controles.
- T1/T2 se calculan a partir de transiciones gráficas de actividad/inactividad, no de inserción del nodo del usuario como cronómetro.
- cycle-observer.js escucha cambios en aria-label, además de aria-busy, data-is-streaming y otros atributos relevantes. Esto cubre el caso en que ChatGPT cambia la etiqueta del mismo control de enviar a detener generación.
- KPI candidato: chatgpt_ui_generation_ms = T2 - T1, métrica chatgpt-ui-generation.v1, adaptador chatgpt-web-free.
- La ventana settle_window_ms=1500 confirma el cierre; no se suma a la duración T1–T2.
- Pruebas específicas de superficies auxiliares, saneamiento offline y colector: PASS. La duración sintética histórica de 469,1 ms no valida captura natural ni la ampliación 0.4.7.

La duración sintética no cuenta para BMO-01 ni demuestra captura natural.

## Persistencia y diagnóstico

La extensión conserva eventos sanitizados en chrome.storage.local antes de depender del colector. El popup expone un informe JSON harmonia.diagnostic-report.v1 mediante el botón Copiar informe y mediante superficies consultables en Chromium headless. El informe incluye versión, estado de observación, cola, ciclos agregados, mediana/P90, cobertura, sincronización y errores acotados; excluye contenido conversacional, credenciales, identificadores de sesión y eventos crudos.

El operador confirma que 0.4.7 está instalada. La ejecución del scanner queda corroborada por artefactos locales recientes con catalogVersion 0.1.3 y features de navegación, barra lateral, encabezado, diálogo, popover y selector. Esta verificación no interactuó con Chrome principal. La evidencia T1/T2 natural sigue pendiente; no se requieren capturas ni texto de chats.

## Diagnóstico T1/T2 y separación de Groq

La candidata 0.4.7 conserva el diagnóstico estructural 0.4.6 al observador de ciclos: snapshots, región principal, nodos de usuario/asistente, señales allowlisted y su visibilidad, flancos, correlación, admisión T1, cierre T2 y resultado del envío al worker/colector. El popup incorpora estos datos al informe harmonia.diagnostic-report.v1 sin exponer IDs de pestaña, conversación o ciclo.

El error de T1 no se decide por IA: las transiciones y los tiempos siguen siendo deterministas y locales.

La extensión y el colector NO incorporan Groq ni dependen de su API. El módulo opcional Groq Assist permanece en DevTools/GroqAssist/, fuera del paquete cargable de Chrome; puede quedar apartado sin afectar la observación, T1/T2 ni telemetría.

No se realizan llamadas a Groq desde Extension/ o Collector/. La clave no se incluye en el paquete ni en el repositorio.

## Estado operativo

- Candidata local: 0.4.7; manifest y build-info coinciden (catálogo 0.1.3).
- Instalación: reportada por el operador y corroborada indirectamente por superficies locales recientes con catálogo 0.1.3.
- Ingeniería: **35/35 pruebas PASS** en la suite Extension/Collector y Groq Assist local (API simulada; sin llamada real). Los cinco scripts PowerShell pasan el parser.
- T1/T2 naturales: pendientes.
- Colector: build local 0.4.7.1, catálogo 0.1.3; HEALTH=OK, mismo almacén fila4 y 401 sin credencial. Persistencia real activa: 21 sesiones, 433 barridos, 431 superficies únicas, 20/54 capacidades observadas (40%) y 59% combinado; seis features auxiliares observadas. La integración comprueba `capture.started` y `ui.surface.scan` desde directorios vacíos. Ciclos T1/T2: 0; validación natural pendiente.
- Codex CLI: bloqueado hasta resolver autenticación y contexto autorizado.
- BMO-01: NO ALCANZADO; se exigen cinco ciclos naturales correlacionados/persistidos, métricas y cobertura, privacidad, matriz y una iteración real de desarrollo asistido.

## Reglas operativas

Toda operación técnica se realiza por RDC. No solicitar al operador ejecutar CMD, PowerShell, scripts ni comandos. Las pruebas de navegador usan CLI y Chromium headless con perfiles temporales; no abrir, enfocar, navegar, inspeccionar ni modificar el Chrome principal. Los perfiles temporales se eliminan al cerrar las pruebas.

No capturar prompts, respuestas, borradores, texto del compositor, cookies, credenciales, tokens, cuerpos de solicitudes ni identificadores de sesión/conversación/pestaña. No automatizar la interacción con ChatGPT, no enviar prompts ni accionar controles para sortear límites de uso. El procesamiento local de una exportación oficial descargada por el titular es una tarea separada.

El operador define propósito y acepta resultados. El agente selecciona la siguiente tarea no bloqueada según instrucciones verbatim y observabilidad; comunica de inmediato los bloqueos y evita comprobaciones burocráticas sin reducir la calidad final.

## Fuente de verdad

- OCP: docs/frentes/harmonia/OBJETO-CANONICO.md.
- Instrucciones verbatim D-001…D-031: §5 del OCP y docs/frentes/harmonia/originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261110.md.
- Backlog único: §12 del OCP.
- Criterios BMO-01: §16 del OCP.
- Evidencia del observador 0.4.7 y colector 0.4.7.1: §§31–34 del OCP y tests Extension/Collector.

Los estados en secciones cronológicas antiguas son snapshots históricos y no sustituyen §12 ni la versión/build declaradas arriba.


## Candidata 0.4.8 · diagnóstico T1/T2

Build local: `LOCAL-OMM-01-031-CYCLE-DIAGNOSTIC-TRACE`; colector `0.4.8.1`; catálogo sin cambios `0.1.3`.

La traza `diag.cycle.trace` permite separar inicialización, región principal, mensajes, conteos de señales visibles/excluidas, flancos, correlación, decisión del observador y resultado de entrega al worker/colector. El contenido se restringe a enums, booleanos, tiempos monotónicos relativos y contadores acotados. No captura prompts, respuestas, texto, etiquetas, URLs, valores de campos ni IDs de conversación/pestaña/ciclo en el payload.

Límites: 96 trazas por sesión de captura y 20.000 en el índice del colector. `queued_outbox` significa sólo persistencia local en Chrome; `posted` significa aceptación HTTP 2xx del colector. El resumen del popup contiene agregados, no trazas en bruto. Las trazas se guardan aparte y nunca cuentan como ciclos ni alteran el KPI. La instrumentación no demuestra por sí sola que los selectores detecten un ciclo real; la aceptación requiere un par natural T1/T2 correlacionado y presente en `/cycles`.

La candidata local no está declarada instalada ni recargada por este cambio. No se intervino Chrome principal.

## Candidata 0.4.9 · continuidad de navegación SPA

- Se añade Extension/history-bridge.js, ejecutado en el mundo principal mediante un recurso web accesible limitado a https://chatgpt.com/*.
- El puente observa history.pushState y history.replaceState y emite únicamente harmonia:history-change; no incorpora URL, argumentos, estado ni texto al evento.
- content.js atiende esa señal y los eventos nativos popstate/hashchange. Compara window.location.pathname solo en memoria; al cambiar, reinicia el observador de ciclos para generar una identidad local nueva y fuerza un barrido de superficie.
- La observación estructural y de ciclos permanece anclada al documento estable, por lo que la sustitución de <main> no deja huérfanos los observadores.
- Pruebas añadidas: preservación de retorno y contexto de History, señal genérica sin datos de navegación y guardia contra doble instalación. Aceptación natural en ChatGPT Web continúa pendiente.
## Snapshot D-040 · Archivado Markdown por conversación

- Instrucción original: docs/frentes/harmonia/originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261113-D040.md.
- OCP v0.82; especificación general v1.2.0.
- OMM-FUT-007: tarea provisional para un documento Markdown maestro por conversación, actualizado por ciclo. **No implementada**; versión 0.6.0 planificada.
- Benchmark auditado: siete exports reales de C:\Users\fila4\Downloads; ver docs/frentes/harmonia/evidencias/HARMONIA-AUDITORIA-CALIDAD-MARKDOWN-D040.md.
- El pool de observabilidad no conserva cuerpos de mensajes. La ruta futura lee DOM visible de la conversación actual y guarda el cuerpo local fuera del JSONL; no se enviará a servicios externos.
- OMM-FUT-006 recurrente aplicada en paralelo: revisión de suficiencia de los datos, sin crear otro banco ni modificar productores.
- Extension y Collector permanecen en 0.5.0; no se cambió código, manifest, build-info, permisos ni directorio de salida. Sin instalación/recarga de Chrome ni aceptación natural.

## Snapshot D-041 · Gobernanza de feedback e incidencias

- OCP vigente local: **v0.83**; Especificación General: **v1.3.0**.
- OMM-FUT-006 incorpora la auditoría de observabilidad por tarea con fases O0–O5 (entrada, línea base, suficiencia, ejecución, cierre y expansión).
- OMM-FUT-008 está **PROVISIONAL / NO IMPLEMENTADA**. Propone captura de pestañas múltiples, un único Markdown por conversación, telemetría estructural allowlisted y overlay contextual LIKE/DISLIKE/comentarios.
- LIKE produce refuerzo; DISLIKE produce señal correctiva; solo el triage confirma una incidencia formal.
- Diseño: `docs/frentes/harmonia/originales/HARMONIA-CICLO-20261113-D041-EXPANSION-INCIDENCIAS-B.md`. Instrucción literal: `docs/frentes/harmonia/originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261113-D041.md`.
- Versión 0.7.0 es solo propuesta y depende de cerrar 0.6.0/OMM-FUT-007. La candidata instalada/local sigue en 0.5.0; no se han modificado extensión, permisos ni colector. BMO-01 NO ALCANZADO.

## D-041 · Auditoría de observabilidad heredada

OMM-FUT-008 (P1 provisional) completa las capacidades multi-pestaña parciales de la candidata 0.5.0 y añade archivado Markdown por conversación, overlay y triage. OMM-FUT-009 (P1 provisional) propone retirar métricas temporales no conformes: se encontraron 31/31 eventos `capture.stopped` con `durationMs` en el banco local y rutas activas de cálculo temporal. No se modificó código ni histórico; ambas tareas siguen pendientes de autorización/implementación.


## D-041 · Matriz normativa del frente

La matriz N-01…N-32, con procedencia D-key y precedencias, está en `docs/frentes/harmonia/originales/HARMONIA-MATRIZ-NORMAS-OPERATIVAS-VERBATIM-D041.md`. D-025/D-026 no tienen fuente localizada; OMM-FUT-010 es una tarea documental P2 provisional.

## Candidata local 0.6.0 · D-042 / OMM-FUT-009

**Estado:** implementada localmente; CI local PASS; GitHub Actions y merge a main pendientes. Manifest/build-info/Collector: 0.6.0.

- La telemetría temporal T1/T2, duration, latencia y estadísticas temporales se retiró según Metacanon §52.
- El popup registra actividad estructural ACTIVE/INACTIVE y transiciones.
- Collector rechaza eventos/campos temporales y devuelve HTTP 410 en /cycles y /cycle-diagnostics; la nueva API usa /activity y /activity-diagnostics.
- El inicializador valida la versión 0.6.0, actualiza un colector anterior mediante cierre autenticado y la parada admite CENTRAL\\fila4/CENTRAL\\MantenimientoRCI usando el AppData propietario de fila4.
- Los agregados y referencias de ciclos heredados en index.json se conservan en legacyTemporalAggregateQuarantine y se excluyen del índice activo y de la API.
- Los eventos temporales del outbox legado se preservan en cuarentena local; si falla el guardado de cuarentena, se bloquea el envío.
- Los JSONL históricos no se reescribieron: 31 eventos capture.stopped conservan durationMs byte a byte y se excluyen de las consultas/métricas actuales.
- GroqAssist y el benchmark no consumen ni comparan duración/latencia; el benchmark rechaza datasets con campos temporales.
- Baseline 0.5.0 preservado en Harmonia/archive/omm-fut-009-pre-correction-20261113/.

**CI local:** 104/104 pruebas; 37 módulos JS/MJS sintaxis PASS; 6 scripts PowerShell parser PASS; 9 JSON parse PASS; contratos de inicializador/parada y migración de índice heredado PASS; escaneo de productores temporales PASS. Esto no equivale a aceptación natural de Chrome. BMO-01 sigue NO ALCANZADO.

**Roadmap vigente:** 0.6.0 OMM-FUT-009; 0.7.0 OMM-FUT-007; 0.8.0 OMM-FUT-008; OMM-FUT-010 P2 sin versión.
