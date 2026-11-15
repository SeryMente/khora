## Harmonia · OMM-01/BMO-01

**Objetivo del sprint:** alcanzar el bucle mínimo operativo: observación natural de ChatGPT Web Free → medición T1/T2 → análisis basado en evidencia → selección de una mejora → ejecución asistida por Codex bajo límites → pruebas → actualización del backlog y selección del siguiente trabajo.

**Resultado del ciclo:** se preparó el contrato transversal de metadatos, el índice inicial de conversaciones/ciclos y la corrección de política RDC. BMO-01 sigue NO ALCANZADO: no hay evidencia natural T1/T2 ni cinco ciclos naturales correlacionados y persistidos. No se intervino el Chrome principal.

### 1. Formato de salida y fuentes normativas

El análisis transversal localizó estas piezas y sus funciones:

- Metacanon §4: diez componentes obligatorios de salida por ciclo (identidad/gobierno; estado y contexto; delta; avance y entorno; pendientes; viabilidad; tiempo/ciclos; siguiente acción; continuidad; persistencia).
- Metacanon §28: registro verificable de cada ciclo sustantivo; preservación literal de A y B; exclusión de acuses triviales y llamadas de herramienta sin delta.
- P035: continuidad entre conversaciones/frentes.
- P041: preservación de originales, procedencia, SHA y lectura de vuelta.
- P042: foliación global y por OCP solo cuando FOL1 esté ACTIVO; mientras tanto, referencia local y entrada consolidada A/B.
- ART-020: Gestión conversacional y sus dos módulos internos.
- ART-024: contrato concreto de Registro conversacional y Trazabilidad semántica.
- GOW v2.19: vocabulario común de conversación, ciclo, A/B, folio y referencia local.
- Harmonia §4.1, §4.4, §5, §12 y §41.2: reglas de interacción, ciclo del frente, instrucciones verbatim, backlog único y recordatorio visible del sprint.
- ART-027: telemetría de recuperaciones Sink; no debe asociarse a conversaciones/ciclos ni mezclarse con T1/T2.

No se encontró un artefacto normativo independiente denominado AT; se aplicó como análisis transversal de las fuentes anteriores.

### 2. Contrato y cobertura inicial

OCP actualizado localmente a HARMONIA-v0.78. Se agregó §42 y cuatro tareas provisionales OMM-01-035 a 038. Se actualizaron las referencias activas al DUG v389 · NX-389m.

Se crearon y leyeron de vuelta:

- docs/frentes/harmonia/continuidad/HARMONIA-DATASET-INDEX.schema.json
- docs/frentes/harmonia/continuidad/HARMONIA-DATASET-INDEX.json

El índice registra cinco conversaciones: cuatro exportaciones históricas verificadas y una referencia local para esta conversación. Las cuatro exportaciones históricas conservan nombre, ID declarado por el exportador, created_at/updated_at/exported_at, SHA-256, Git blob y ruta. Sus ciclos internos siguen PENDING_SEGMENTATION. El índice está marcado PARTIAL.

La primera exportación conocida fue generada el 2026-10-30 19:15:45; la conversación declara creación el 2026-10-30 11:31:55. Los encabezados no especifican zona horaria ni el instante de primera persistencia local. La solicitud ChatGPT-HARMONIA-20261106-1715 sigue NOT CAPTURED/NOT LOCATED en las rutas consultadas; la búsqueda histórica no fue exhaustiva.

Para la conversación actual no están expuestos el nombre ni el ID nativo. Se usan exclusivamente referencias locales:
- Conversación: 01a1d0fd-681e-7243-a8ed-ca8e3dff2e71
- Ciclo: 01a1d0fd-681e-72c2-9c7b-1610e6c2d6a5

A está preservada en D-036. B es esta salida visible. Los UUIDv7 son referencias locales, no IDs nativos ni folios FOL1. FOL1 continúa PREPARADO_PENDIENTE_ACTIVACION; no se han asignado folios globales CV/CY/A/B. El A/B conversacional no se confunde con los brazos A/B del benchmark BENCH-GROQ-001.

### 3. Política RDC reconciliada

Se eliminó la exigencia de un único UUID/dispositivo RDC autorizado. CONTROL-RESPONSABILIDAD.json mantiene titularidad y generación 15, pero deja device_binding=NONE. La conexión Mantenimientorci se registra como conexión actual reportada por el operador y puente para elevar RDC. En esta sesión se observó el proceso como central\mantenimientorci, perfil C:\Users\MantenimientoRCI, trabajando sobre el workspace KHORA ubicado en C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA. El UUID del endpoint usado es solo procedencia de esta sesión, no un pin futuro. No se transfirieron credenciales.

### 4. Inventario completo de tareas OMM-01

Fuente operativa única: OCP §12 y §12.1. Las secciones históricas del OCP no son colas paralelas.

| ID | Prioridad | Tarea | Estado |
|---|---|---|---|
| OMM-01-000 | P0 | Mantener el OCP canónico, archivo de versiones, instrucciones literales y trazabilidad. | HECHO local; originales y registro complementario preservados. |
| OMM-01-001 | P0 | Mantener paquete MV3 coherente y cargable, con versión/build/procedencia alineadas. | Candidata 0.4.8 preparada; no recargada ni declarada activa en Chrome. |
| OMM-01-002 | P0 | Resolver Codex CLI, sandbox workspace-write y revisión de diff. | PARCIAL; autenticación y prueba temporal de escritura validadas; falta contrato de tarea y revisión de cambios de producto. |
| OMM-01-003 | P0 | Validar naturalmente la señal gráfica T1 en ChatGPT Free. | Sintéticos PASS; T1 natural no verificada. |
| OMM-01-004 | P0 | Validar T2 frente a respuesta final, streaming, herramientas e intermedios. | Lógica candidata; T2 natural pendiente. |
| OMM-01-005 | P0 | Mantener núcleo semántico, UUIDv7 local, reloj monotónico, cobertura y validación de pares. | Implementado; sintéticos PASS; aceptación natural pendiente. |
| OMM-01-006 | P0 | Mantener adaptador chatgpt-web-free y KPI T2−T1, separado de legado DOM. | Candidata 0.4.8; aceptación natural pendiente. |
| OMM-01-007 | P0 | Completar matriz de ciclos y privacidad, separando pruebas sintéticas/naturales. | Suite local sintética 40/40 PASS; matriz natural pendiente; sin llamada real Groq. |
| OMM-01-008 | P1 | Ampliar catálogo estructural de navegación y superficies sin leer contenido. | Implementado 0.4.7/0.4.8; catálogo 0.1.3; última instantánea histórica 732 barridos y 638 superficies únicas. |
| OMM-01-009 | P1 | Validar popup y consulta KPI: mediana/P90, cobertura, cola y diagnóstico. | Informe JSON agregado implementado; traza natural pendiente. |
| OMM-01-010 | P1 | Mantener build-info local y modo catalog-only sin ejecutar código remoto. | Implementado para 0.4.8. |
| OMM-01-011 | P1 | Etiquetar ciclos con framework_revision y habilitar comparaciones entre revisiones. | Etiquetado actualizado; comparación/benchmark de modelos pendiente. |
| OMM-01-012 | P1 | Detectar botón Chat nuevo y distinguir límite/nueva conversación; solo avisar. | Pendiente; no bloquea BMO-01. |
| OMM-01-013 | P1 | Procesar exportaciones oficiales descargadas por el titular en Markdown local. | Pendiente; sin extracción programática de la plataforma. |
| OMM-01-014 | P2 | Identificar control S y documentar su efecto sin activación automática. | Pendiente. |
| OMM-01-015 | P2 | Preparar prompt local de reanudación para envío manual. | Pendiente; sin autoenvío ni pulsación de Enter. |
| OMM-01-016 | P1 | Ejecutar iteraciones semiautomatizadas con Codex, diff, pruebas y actualización del OCP. | PARCIAL; auditoría Codex y ejecución local revisada; sin bucle Codex autónomo de escritura/revisión. |
| OMM-01-017 | P1 | Preservar continuidad y salida literal de origen separada del estado actual. | HECHO local; originales conservados. |
| OMM-01-018 | P0 | Confirmar arranque, inyección, primer barrido, eventos y persistencia offline. | Colector 0.4.8.1 actualizado; HEALTH OK y rechazo 401 de token ausente; cero eventos naturales verificados. |
| OMM-01-019 | P1 | Evaluar recarga de extensión sin recargar pestañas ChatGPT ni interrumpir generación. | Diseño documentado; no integrada; solo perfiles headless de prueba. |
| OMM-01-020 | P0 | Endurecer observador y exponer cobertura local separada de observación natural. | Base 0.4.2 y corrección 0.4.4; pruebas 21/21; natural pendiente. |
| OMM-01-021 | P1 | Exportar informe JSON diagnóstico sin contenido y exponerlo a Chromium headless. | Implementado con diagnóstico agregado. |
| OMM-01-022 | P0 | Detectar cambios aria-label T1/T2 en el mismo control. | Corrección conservada; pruebas del observador PASS. |
| OMM-01-023 | P1 | Simplificar y modernizar popup: jerarquía, contraste, accesibilidad y textos. | UI heredada; validación visual/natural pendiente. |
| OMM-01-025 | P0 | Instrumentar diagnóstico agregado de etapas T1/T2 sin identificadores. | Implementado en extensión 0.4.8/colector 0.4.8.1; 40/40 pruebas; aceptación natural pendiente. |
| OMM-01-026 | P1 | Implementar Groq Assist local con evidencia allowlisted, experimento cerrado y fallback. | Implementado local; transporte real no ejecutado por falta de sesión Vault. ZDR no es compuerta. |
| OMM-01-027 | P1 | Comparar Groq frente a análisis local en cinco casos reales. | BENCH-GROQ-001 definido; dataset vacío y casos no seleccionados; requiere Vault para llamadas reales. |
| OMM-01-028 | P1 | Conectar Groq Assist con runner local de escenarios cerrados y feedback acotado. | Implementado localmente; nueve escenarios cerrados y fallback. |
| OMM-01-029 | P1 | Implementar Cognitive Router local-first y escalamiento gobernado. | Implementado local; sin dependencia ZDR. |
| OMM-01-030 | P0 | Implementar Evidence Validator y Policy Firewall deterministas. | Implementado local; nueve escenarios inmutables; pruebas PASS. |
| OMM-01-031 | P0 | Instrumentar y persistir diagnóstico T1/T2 por etapas sin contenido. | Implementado local; sintéticos PASS; aceptación natural pendiente. |
| OMM-01-032 | P0 | Integrar Codex como ejecutor local acotado con snapshot aislado, contrato, diff y pruebas. | PARCIAL; Codex probado en directorio temporal; wrapper snapshot/contrato/diff gate pendiente. |
| OMM-01-033 | P0 | Ejecutar benchmark pareado ChatGPT/Codex frente a ChatGPT/Groq/Codex. | Protocolo y esquema listos; cero casos verificados, pares o llamadas reales Groq. |
| OMM-01-034 | P0 | Mantener avance continuo y mostrar objetivo, dependencias, siguiente tarea y cierre. | Regla continua activa. |
| OMM-01-035 | P0 | Almacenar verbatim todas las instrucciones del operador para este frente. | Regla continua; D-035 y D-036 preservados. |
| OMM-01-036 | P1 | Etiquetar el conjunto disponible con fechas, horas, nombres y disponibilidad. | Esquema e índice iniciales creados; retroinventario y segmentación histórica pendientes. |
| OMM-01-037 | P1 | Foliación de conversación, ciclos y partes A/B, asociada a OCP/frentes/repositorios. | Referencias UUIDv7 locales; FOL1 no activa; folios globales pendientes. |
| OMM-01-038 | P1 | Localizar el formato de salida y preparar metadatos de observabilidad para conversaciones/ciclos. | AT y contrato §42 preparados; integración extensión/colector y backfill A/B pendientes. |

**Tareas futuras (no forman parte de la cola inmediata):**

| ID | Tarea | Estado |
|---|---|---|
| OMM-FUT-001 | Guía para incorporar adaptadores sobre el contrato neutral. | DIFERIDO. |
| OMM-FUT-002 | Adaptador OpenWebUI de Cora. | DIFERIDO. |
| OMM-FUT-003 | Adaptadores para clientes API/streaming externos. | DIFERIDO. |

El identificador OMM-01-024 no aparece en el backlog actual; se conserva el hueco y no se renumeran tareas. Total: 38 tareas OMM-01 activas/provisionales, más 3 futuras.

### 5. Integridad y estado de cierre

- OCP v0.78 SHA-256: 999D4ABC9FD2AB1733543EC953CC91071F7F49174087D60F753BB420ACF5EAF4.
- CONTROL responsabilidad generación 15; titular y alias sin cambio; device_binding=NONE.
- D-035 SHA-256: C3212F0CA475E2E90B68953D2010617923DB9C9E990526FA55743F5B550B8E38.
- D-036 SHA-256: 44029062974E3490DABD55442A4562876E6D887E7D2A812E900D112FB444D22E.
- El índice y el esquema se leyeron de vuelta y parsearon como JSON.
- El índice conserva cinco conversaciones y cobertura PARTIAL; las cuatro conversaciones históricas no se segmentan aún en ciclos A/B.
- No hubo commit, push, merge, PR, despliegue, modificación de main, limpieza del worktree, ni intervención del Chrome principal.

### 6. Siguiente secuencia recomendada

1. Segmentar los ciclos históricos solo desde sus exportaciones originales, conservando literalidad y procedencia.
2. Integrar el esquema de metadatos al cierre del ciclo y a la persistencia de la extensión/colector, sin añadir IDs de conversación/ciclo al payload de Groq.
3. Continuar la ruta P0 de BMO-01: obtener observación natural T1/T2 y cinco ciclos naturales correlacionados y persistidos.
4. Mantener FOL1 pendiente hasta que el registro maestro esté activo; mientras tanto, usar UUIDv7 local.

### 7. Referencias del ciclo

- Conversación local: 01a1d0fd-681e-7243-a8ed-ca8e3dff2e71.
- Ciclo local: 01a1d0fd-681e-72c2-9c7b-1610e6c2d6a5.
- DUG: v389 · NX-389m; Metacanon 1.30; GOW 2.19.
- Metodología main: 4fbe05aaf36bd8cd4c150988d668078cbb4034cd; edad d.h.m: 00.00.27.
- KHORA main: 2239553edd61a1ccf9eb481ee78f78dcf3f36081; edad d.h.m: 00.00.51.

IPZ: v0.7 · edad NO VERIFICADA; instalación nativa NO VERIFICADA.
DUG: v389 · NX-389m · edad d.h.m 00.00.27.
CONV: PENDIENTE / NO ASIGNADO (FOL1 no activa) | OCP: PENDIENTE / NO ASIGNADO.
CICLO 1: PENDIENTE / NO ASIGNADO | OCP: PENDIENTE / NO ASIGNADO.
A: PENDIENTE / NO ASIGNADO | OCP: PENDIENTE / NO ASIGNADO.
B: PENDIENTE / NO ASIGNADO | OCP: PENDIENTE / NO ASIGNADO.
FOL1: PREPARADO_PENDIENTE_ACTIVACION. MCP-NORMATIVO: DESACTIVADO.