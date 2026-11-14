# Registro de versiones · Harmonia Extension

**Repositorio:** SeryMente/khora  
**Paquete instalable:** `Harmonia/Extension/`  
**Registro rector de tareas:** `docs/frentes/harmonia/OBJETO-CANONICO.md` §12  
**Estado:** registro local, no publicado.

## Convención

Se utiliza SemVer `MAJOR.MINOR.PATCH`:

- **MAJOR:** cambio incompatible del contrato de eventos, persistencia o asociación.
- **MINOR:** capacidad funcional nueva, conservando compatibilidad del contrato anterior.
- **PATCH:** corrección localizada sin cambio de capacidad/contrato.

Harmonia permanece en serie `0.x`: el producto aún no alcanzó aceptación natural y BMO-01 sigue NO ALCANZADO. La versión identifica el paquete; la fila identifica la tarea provisional que contribuye a esa versión. Por eso una misma versión puede aparecer en varias filas: no se genera una versión diferente por cada tarea del mismo esfuerzo.

## Baseline anterior a D-039

**0.4.9 — Baseline 01 / PRE-D039**

Comprende todo el trabajo anterior al primer esfuerzo semiautomatizado descrito por D-039: extensión MV3, catálogo estructural, observador de ciclos, outbox, colector local, diagnósticos, continuidad de navegación SPA y la documentación/evidencia heredadas hasta OMM-01-040.

- Build de origen: `LOCAL-OMM-01-039-SPA-NAVIGATION-CONTINUITY`.
- Estado: candidata local histórica; no se declara aceptada ni publicada.
- La versión 0.4.9 se preserva como baseline. No se reescribe su historia para simular que incluía el nuevo reporte de frentes.

## Historial por tarea provisional

| Versión | Tarea provisional | Esfuerzo que incorpora | Estado verificable |
|---|---|---|---|
| **0.5.0** | **OMM-FUT-004** | Reporte de frentes por ventanas móviles de 24 h, 48 h, 72 h y 7 días; una conversación activa por frente, última actualización, etiqueta relativa y URL nativa de ChatGPT. Asociación inicial explícita por el operador; nunca se infiere leyendo mensajes. | Implementación local; pruebas de utilidades, almacén JSONL y API PASS. Aceptación en Chrome real pendiente. |
| **0.5.0** | **OMM-FUT-005** | Registro de versiones SemVer, nomenclatura por esfuerzo, historial por tarea provisional y separación entre baseline 0.4.9 e iteración 0.5.0. | Registro creado y metadatos locales del paquete alineados; aún no publicado. |
| **0.5.0** | **OMM-FUT-006** | Regla recurrente: todo esfuerzo de desarrollo/ampliación de Extension instancia en paralelo una revisión de suficiencia de observabilidad/datos, usa el banco existente y formula propuestas separadas solo cuando haya evidencia convergente. Cambios adicionales al observador requieren autorización del operador. | Primera iteración realizada en D-039; auditoría de suficiencia documentada. No se creó una base de datos paralela. |
| **0.6.0 (planificada)** | **OMM-FUT-007** | Archivado automático de la conversación ChatGPT actual: un único `.md` por ID nativo, regenerado/actualizado en cada ciclo, con calidad igual o superior a los exports de referencia de Downloads, escritor local atómico y sin incluir cuerpos en el banco de telemetría. | **PROVISIONAL / NO IMPLEMENTADA.** D-040 y auditoría de siete exports documentan el contrato y las brechas. No se modificó manifest/build-info ni se inició código 0.6.0. |
| **0.7.0 (propuesta)** | **OMM-FUT-008** | Extensión de la captura a pestañas múltiples de ChatGPT; telemetría estructural allowlisted de la aplicación; overlay contextual LIKE/DISLIKE/comentarios; registros locales de refuerzos, señales correctivas e incidencias con triage, estados e historial. | **PROVISIONAL / NO IMPLEMENTADA.** D-041 establece el diseño y las decisiones pendientes. Depende de cerrar 0.6.0/OMM-FUT-007; no se cambió código, manifest, permisos ni build-info. |

## Definición de 0.5.0

- `manifest.json.version`, popup, `build-info.json` y revisión del worker declaran `0.5.0`.
- Build: `LOCAL-OMM-FUT-004-005-006-FRONT-ACTIVITY-REPORT`.
- Usa la cola, JSONL e índice del colector existente; no crea un segundo banco de eventos.
- El identificador de conversación que entrega ChatGPT permanece separado de los UUIDv7 locales de conversación/ciclo de Harmonia y del ID de pestaña.
- La URL guardada se reduce al origen y ruta canónica de conversación de ChatGPT; se eliminan query y fragment. No se guardan texto de prompt ni respuesta.
- El reporte elige como máximo una conversación actual por frente. Si se asocia una conversación nueva, la asociación anterior deja de ser activa; sus eventos históricos permanecen en JSONL.
- Las marcas de actualización son fechas UTC del evento observado/exportado. No son duraciones ni métricas de procesamiento.
- La zona de presentación es `America/Mexico_City`. Si la fuente histórica no declara zona, la normalización se etiqueta como supuesto, no como dato confirmado.

## Puertas de aceptación

1. Los cuatro filtros son ventanas móviles desde el instante de consulta, no semanas calendario.
2. No mostrar un frente sin asociación explícita o fuente de conversación verificable.
3. No mostrar más de una URL por frente; mostrar solo la conversación activa/asociación más reciente.
4. Los eventos de actividad se limitan a inicio/cierre observable de ciclo y metadatos allowlisted.
5. Query, fragmentos, texto conversacional, títulos inferidos y contenido del compositor quedan fuera del contrato.
6. La reasignación a otra conversación invalida la asociación activa anterior para el reporte, sin borrar JSONL.
7. El colector, el outbox local y el índice reportan el mismo contrato.
8. Pruebas aisladas PASS; la aceptación natural y BMO-01 se registran por separado y no se infieren de pruebas sintéticas.

---
**Regla de integridad:** no sobrescribir filas históricas. Toda revisión de un esfuerzo genera una nueva fila/versión; el baseline 0.4.9 permanece como antecedente exacto y la candidata 0.5.0 no se declara desplegada hasta su aceptación.


**Nota D-041 / OMM-FUT-009:** no se asigna versión SemVer todavía. La tarea provisional de retirar telemetría temporal no conforme con Metacanon §52 debe delimitar su impacto en Extension/Collector/DevTools antes de fijar versión. No usar el número 0.7.0 propuesto para OMM-FUT-008 como sustituto de esta tarea.

## Ajuste de roadmap SemVer · D-042 · OMM-FUT-009

La previsión anterior D-040/D-041 de 0.6.0 para OMM-FUT-007 y 0.7.0 para OMM-FUT-008 se conserva como antecedente histórico. D-042 introduce una ruptura deliberada del contrato temporal T1/T2 y de las rutas /cycles; por precedencia de esta nueva implementación el roadmap vigente queda:

| Versión | Tarea | Cambio | Estado |
|---|---|---|---|
| **0.6.0** | **OMM-FUT-009** | Retirada del contrato temporal T1/T2, duration/latency, estadísticas temporales y API de ciclos; nuevo contrato estructural ACTIVE/INACTIVE, cuarentena local del outbox legado y benchmark Groq sin criterios temporales. | **IMPLEMENTADA LOCAL / CI LOCAL PASS**; pendiente GitHub Actions, PR/merge, recarga y aceptación natural. |
| **0.7.0 (objetivo)** | **OMM-FUT-007** | Archivo Markdown maestro por conversación, actualizado por ciclo desde DOM visible. | PROVISIONAL / NO IMPLEMENTADA. |
| **0.8.0 (propuesta)** | **OMM-FUT-008** | Completar multi-pestaña, reconciliar archivo por conversación y overlay contextual con gobernanza de feedback/incidencias. | PROVISIONAL / NO IMPLEMENTADA. |
| **Sin versión** | **OMM-FUT-010** | Recuperar/confirmar la procedencia de D-025/D-026. | P2 PROVISIONAL; fuentes no localizadas. |

La 0.6.0 es candidata local; la asignación SemVer no significa aceptación ni publicación. La versión del paquete, manifest.json, build-info.json, popup, worker y Collector debe coincidir. OMM-FUT-006 permanece regla recurrente y no consume versión independiente.
