# Auditoría de suficiencia de datos · Reporte de frentes activos · D-039

**Frente:** Harmonia  
**Tarea provisional:** OMM-FUT-004  
**Regla recurrente aplicada:** OMM-FUT-006  
**Ciclo local UUIDv7:** `01a1d653-2042-70fc-b73e-2ec4ac841ce8`  
**Fecha de corte:** 2026-11-13 · America/Mexico_City  
**Repositorio/estado:** KHORA, rama local `work/harmonia-front-workspace-20261110`; no publicado.

## 1. Pregunta de calidad

¿El conjunto de datos observado actualmente permite responder, con alta confianza, qué frentes de la organización se trabajaron en las ventanas móviles de 24 h, 48 h, 72 h y 7 días, mostrando solo nombre del frente, fecha/hora de última actualización, etiqueta relativa y URL de la conversación más reciente/activa?

**Dictamen:** el banco anterior era útil para inspeccionar la estructura de ChatGPT y probar el observador, pero era insuficiente para este caso de uso. No contenía una relación verificable entre frente y conversación, ni el ID nativo/URL de la conversación, ni un timestamp semántico de última actividad del hilo. Se inició el desarrollo para cerrar esas brechas con asociación explícita y eventos mínimos de actividad.

## 2. Fuentes examinadas y calidad de evidencia

### 2.1. Runtime local del colector

Ruta existente: `%LOCALAPPDATA%\Harmonia\surface-index-v0.4.0\data`.

| Indicador | Evidencia observada |
|---|---:|
| Archivos JSONL | 70 |
| Eventos parseados | 3,190 |
| Registros malformados | 0 |
| Sesiones | 54 |
| Tamaño agregado reportado por el índice | 62,337,098 bytes |
| Huellas de superficie únicas | 1,336 |
| Trazas diagnósticas de ciclo | 1,271 |
| Cobertura de observación natural | 43 % |
| Cobertura documental del catálogo | 78 % |
| Cobertura combinada declarada | 60 % |

Distribución de los 3,190 eventos:

| Tipo | Cantidad |
|---|---:|
| `capture.started` | 53 |
| `capture.stopped` | 31 |
| `diag.cycle.trace` | 1,271 |
| `ui.surface.reused` | 786 |
| `ui.surface.scan` | 1,049 |
| **Total** | **3,190** |

Rango observado en el índice: primer evento `2026-11-10T22:31:33.794Z`; último evento `2026-11-12T18:49:12.513Z` (12 de noviembre, 12:49:12 en America/Mexico_City). El último evento del pool ya tenía más de 24 horas al corte de esta auditoría. Este runtime no demuestra actividad de un frente en la ventana de 24 h del 13 de noviembre.

Los tipos anteriores describen sesiones de captura, barridos/reutilización de superficies y diagnósticos. No son por sí mismos mensajes de usuario, respuestas del asistente ni actividad de un frente.

### 2.2. Esquema de evento heredado

Los eventos contienen campos como `capturedAt`, `eventId`, `sessionId`, `conversation`, `payload`, `schema`, `source` y `type`.

- `conversation` se usa como referencia de pestaña (`tab-{id}`), no como ID nativo de una conversación de ChatGPT.
- Las rutas de conversación se anonimizan antes de persistir eventos generales: el colector reemplaza `/c/{id}` por `/c/[conversation]` y el grupo GPT por `/g/[gpt]`.
- No hay un `front_id`, nombre de frente ni relación de asociación.
- No hay un título de conversación, `nativeConversationId` ni URL de conversación que permita abrir el hilo.
- `capturedAt` fecha un evento/sesión de observación, no la última actualización del hilo.
- Los datos agregados de `diag.cycle.trace` no equivalen a eventos de ciclo completos persistidos. En los 3,190 registros inspeccionados no aparecen los tipos `client.cycle.started` / `client.cycle.completed` como eventos JSONL de actividad.

La extensión tenía código de ciclo que podía reconocer mensajes/estados de forma estructural e identificar ciclos con UUIDv7 locales en memoria. La limitación era que el contrato persistido del pool no conservaba el vínculo a la URL nativa y al frente. Un UUIDv7 local no reemplaza el ID nativo de ChatGPT.

### 2.3. Traza histórica redactada y fixture sintética

- Traza redactada `HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl`: 627 eventos válidos (10 `capture.started`, 611 `console.observed`, 6 `capture.stopped`). Sin asociación de frente, URL/ID nativo o contenido de mensajes. Es evidencia histórica de captura, no un dataset de trabajo por frente.
- Fixture `HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl`: 11 eventos sintéticos. Sirve para probar transformaciones deterministas; no prueba comportamiento natural ni cobertura de conversaciones reales.

No se mezclan fixtures sintéticas con observaciones naturales al calcular suficiencia, cobertura o actividad.

### 2.4. Metadatos de exportaciones nativas disponibles

Los encabezados de exportaciones oficiales son una fuente distinta: pueden aportar nombre, ID nativo, fecha de actualización del hilo y URL. No convierten el pool estructural en una telemetría de actividad continua y no prueban por sí solos que no exista una conversación más reciente no exportada.

| Frente | Última fuente nativa completa localizada | Qué permite afirmar | Límite |
|---|---|---|---|
| Harmonia | Export `ChatGPT-HARMONIA-20261113-1145.md`; Updated 2026-11-13 10:50:59; URL/ID incluidos en encabezado. | Hay una conversación fuente con timestamp y URL verificables desde el exportador. | El encabezado no declara zona; la conversión a America/Mexico_City es una normalización configurada, no una zona confirmada por el archivo. |
| Dictado | `ChatGPT-DICTADO-20261106-1540.txt`; Updated 2026-11-06 15:38:23. | Exportación completa localizada con URL/ID y fecha de actualización. | No acredita que no exista una conversación posterior aún no exportada. Zona no declarada. |
| Khora MCP | Export `ChatGPT-Khora MCP-20261101-1912.md`; Updated 2026-11-01 19:04:29. | Último export completo identificado en el material consultado. | Fuera de la ventana de 7 días al corte; no prueba que no haya otro hilo posterior. |
| Custodia | Hay un resumen de continuidad de 2026-11-12 y un export anterior. | Existe actividad documental reciente asociada al frente. | El resumen más reciente carece de URL nativa e instante exacto de actualización; el export anterior no se puede declarar conversación vigente. |
| Notas | Resumen de 2026-11-12. | Existe contexto de frente y trabajo reciente en material de continuidad. | ID nativo y URL no expuestos; no es posible generar una fila verificable con link. |
| Tareas automáticas | OCP localizado. | El frente existe en la organización. | No se encontró exportación/URL nativa asociable ni control de conversación. |

El exportador no incluye zona horaria en estos encabezados. Para el bootstrap visible, los timestamps históricos se normalizan con la zona configurada `America/Mexico_City`, anotando esa suposición. Los eventos nuevos de la extensión usan timestamps ISO UTC emitidos en el evento. La zona de presentación no debe alterar el instante fuente.

## 3. Evaluación frente a los requisitos del vector

| Requisito | Pool heredado | Condición de suficiencia | Cierre en 0.5.0 |
|---|---|---|---|
| Enumerar solo frentes trabajados | No existe identidad de frente | Se requiere asociación verificable frente↔conversación | Catálogo explícito de frentes; asociación manual por operador |
| ID nativo de conversación | No persistido | Extraer solo de la ruta autorizada de ChatGPT | Parseo estricto del ID desde URL `/c/{id}` o `/g/{id}/c/{id}` |
| URL de la última conversación | URL sanitizada/redactada | Guardar una sola URL canónica, sin query/fragment | `conversation_url` allowlisted y canonicalizada |
| Fecha/hora de última actualización | `capturedAt` de evento de captura | Usar instante de ciclo observable o `Updated` del exportador | `updated_at` de inicio/cierre de ciclo y seeds tipados de exportación |
| Una conversación por frente | No hay relación front↔thread | Reasignación debe invalidar la anterior en el conjunto activo | El índice mantiene una asociación activa por frente; el historial JSONL permanece |
| Ventanas móviles | No hay API por frente | 24 h/48 h/72 h/168 h exactas respecto del instante de consulta | Filtro móvil implementado |
| Etiquetas de lectura rápida | No hay etiquetas temporales | Formatos relativos y horarios locales, sin perder la fecha/hora absoluta | Etiquetas en español y fecha/hora local adicional |
| Privacidad | No se captura cuerpo de mensaje en el nuevo contrato | No leer texto de prompt/respuesta para asociar frentes | Payload cerrado; no admite campos extra como prompt/response |

**Resultado de suficiencia:** el dataset heredado es **adecuado para investigación estructural**, **parcial para secuenciar señales de ciclos**, e **insuficiente por sí solo para reporting por frente**. La primera solución depende de combinar: catálogo de frentes, selección explícita de conversación, ID/URL canónica, evento de ciclo y timestamp. No se requiere una base paralela: se reutilizan el outbox, los JSONL y el `index.json` existentes.

## 4. Diseño implementado para el primer esfuerzo

### 4.1. Asociación

- El operador abre la conversación de ChatGPT correspondiente al frente y la asocia desde el popup.
- El sistema no intenta inferir el frente a partir de prompts, respuestas, títulos ni textos.
- Asociar una conversación nueva al mismo frente sustituye la asociación activa anterior.
- El histórico JSONL de la asociación anterior no se borra; deja de participar en el reporte actual.

### 4.2. Eventos nuevos

**`front.assignment`** registra una elección explícita: `front_id`, `front_name`, `conversation_id`, `conversation_url`, `association=operator_selection` y `assigned_at`.

**`front.activity`** se deriva de eventos ya detectados por el observador de ciclos: `user_turn_started` o `assistant_response_completed`, con `updated_at`, IDs locales de conversación/ciclo y la URL canónica asociada.

El evento no persiste texto, título, query string, fragment, valores del compositor ni argumentos de navegación. La URL nativa de conversación sí se conserva porque es un requisito literal del reporte; no equivale a capturar el cuerpo de la conversación.

### 4.3. Consulta

- Filtros admitidos: `24h`, `48h`, `72h`, `7d`.
- Endpoint autenticado local: `GET /fronts?window={24h|48h|72h|7d}`.
- Resultado: una sola fila por frente con nombre, instante UTC, etiqueta relativa, fecha/hora local y URL canónica de la conversación activa.
- La consulta utiliza el almacén existente del colector y combina únicamente fuentes de conversación explícitas.
- Sin colector, el popup puede presentar seeds de exportación y eventos en el outbox local; no inventa filas para frentes sin ID/URL/timestamp.

### 4.4. Rótulos temporales

Se adopta la legibilidad de fechas relativas de Todoist, no su motor de planificación. La documentación oficial de Todoist indica que su reconocimiento de fecha natural interpreta expresiones como “in 2 hours”, “in the morning” (09:00), “in the afternoon” (12:00) y “this weekend” (sábado próximo). Harmonia muestra etiquetas retrospectivas en español (`hace 2 h`, `hoy`, `ayer · mediodía`, `fin de semana pasado · sábado`) y mantiene junto a ellas la fecha/hora local absoluta. Fuente: https://www.todoist.com/help/todoist/features/schedule-a-date-and-time-for-your-todoist-tasks-q7VobO (consultada 2026-11-13).

No se usa la etiqueta relativa para medir latencias ni duración del procesamiento. Las ventanas son filtros de timestamps de actividad, no cronómetros.

## 5. Mejoras candidatas de observabilidad detectadas

Se separan las necesidades confirmadas de las propuestas todavía no autorizadas.

### OBS-PROP-001 · Alinear atributos de control con la política de privacidad

**Evidencia:** `content.js` lee `aria-label` y `placeholder`; `service-worker.js` y el colector conservan `label` y `placeholder` en controles sanitizados, mientras el contrato declara `labelsCaptured:false`.  
**Riesgo:** los valores pueden contener texto visible de interfaz y la bandera actual no describe lo que realmente persiste el pool.  
**Propuesta:** revisar todos los campos de texto derivados de controles, decidir una allowlist estricta y alinear payload, sanitización, flags, documentación y tests. El reporte por frente no necesita esos atributos.  
**Estado:** propuesta técnica para autorización del operador; no se modifica en este esfuerzo.

### OBS-PROP-002 · Importación y reconciliación incremental de exportaciones

**Evidencia:** seis frentes OCP, pero solo un subconjunto tiene exportaciones completas con ID nativo/URL/Updated. Resúmenes de continuidad recientes no necesariamente contienen esos campos. Las zonas horarias de exportaciones no están declaradas.  
**Riesgo:** un frente puede parecer inactivo aunque exista una conversación nueva no exportada o no asociada; no puede probarse que el inventario de exports sea completo.  
**Propuesta:** construir un importador local, idempotente y source-aware que acepte exportaciones oficiales descargadas por el titular, actualice solo metadatos de encabezado, preserve timestamp original/zona desconocida/hash y destaque conflictos entre hilos. No extraer contenido de ChatGPT Web.  
**Estado:** propuesta técnica para autorización; la tarea OMM-FUT-004 usa los seeds explícitos disponibles y comunica su límite.

Las dos propuestas se muestran porque la evidencia converge en una discrepancia concreta o una laguna repetida. No reciben IDs OMM-FUT ni se incorporan como tareas comprometidas hasta la autorización del operador.

## 6. Criterio recurrente de suficiencia

Desde D-039, cada esfuerzo que desarrolle, mejore o amplíe Extension ejecuta en paralelo una revisión de observabilidad:

1. Identificar qué datos del banco actual serían necesarios para cumplir la tarea.
2. Medir cobertura, procedencia, actualidad, precisión y sesgos del pool, separando natural, exportado, reportado, sintético e inferido.
3. Construir la capacidad solicitada usando los datos existentes cuando sea posible; no abrir un almacén nuevo por comodidad.
4. Detectar campos faltantes, privacidad contradictoria, sesgos de asociación o cobertura histórica.
5. Acumular evidencia ciclo a ciclo; cuando una carencia se vuelve reproducible y material, producir una propuesta de tarea independiente con evidencia, impacto y criterio de aceptación.
6. Presentar esa propuesta al operador para autorización antes de expandir el observador o cambiar el contrato de datos.

No se exige una tarea nueva en cada ciclo. Una iteración recurrente puede concluir «revisada / sin cambio adicional» mientras acumula evidencia.

## 7. Estado y límites de esta auditoría

- La auditoría distingue runtime natural, exportaciones completas, resúmenes de continuidad y fixtures sintéticas.
- El nuevo reporte y las pruebas se encuentran en una candidata local; no se ha validado el popup en una sesión natural de Chrome.
- La marca de última actividad del nuevo contrato registra el instante observable del inicio/cierre de ciclo; no calcula duración.
- El DUG Samantha v393 contiene señales humanas y estructuradas discrepantes en §§4/37/52. Este esfuerzo no intenta enmendar ni resolver esa discrepancia y no implementa T1/T2/duration_ms.
- Se mantiene BMO-01 NO ALCANZADO hasta la aceptación natural y sus otros criterios.
