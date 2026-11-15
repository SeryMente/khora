# Matriz de normas operativas extraídas del corpus verbatim · D-041

**Frente:** KHORA / Harmonia  
**Fecha de auditoría:** 2026-11-13 · America/Mexico_City  
**OCP:** HARMONIA-v0.83  
**Especificación:** v1.3.0  
**Ciclo local UUIDv7:** `01a1d679-eb8b-7f26-b0fd-eb9c52c95877`  
**Naturaleza:** síntesis normativa trazable; no reemplaza ni reescribe instrucciones literales.  
**Alcance:** revisión de las fuentes disponibles del OCP §§5, 16–18 y los once archivos `HARMONIA-INSTRUCCIONES-VERBATIM-*.md` del directorio `originales/`. Se contrastó con las reglas del OCP y del backlog, incluyendo D-039–D-041.

---

## 1. Dictamen de cobertura documental

La revisión encuentra:

- D-001 a D-014: preservadas en el OCP, principalmente §5 y §§16–18; D-010 a D-012 están en sus secciones históricas.
- D-015 a D-024 y D-027 a D-031: preservadas en `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261110.md`, junto con las aclaraciones de precedencia.
- D-032: `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261111.md`.
- D-033: `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261112.md`.
- D-034: `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261112-D034.md`.
- D-035 a D-038: sus respectivos archivos del 2026-11-12.
- D-039 a D-041: sus respectivos archivos del 2026-11-13.

**Brecha:** no se encontró una instrucción literal D-025 ni D-026 en el OCP vigente, los archivos fuente examinados o las referencias locales consultadas. La secuencia documental salta de D-024 a D-027. No se asigna contenido ni se reconstruye el mensaje ausente. Queda pendiente recuperar la procedencia original o confirmar documentalmente que esas claves nunca fueron asignadas. Esta brecha no invalida la síntesis de las instrucciones efectivamente disponibles, pero impide afirmar continuidad numérica íntegra D-001…D-041.

## 2. Matriz de normas operativas

| ID | Norma extraída | Instrucciones fuente | Regla operativa vigente y control |
|---|---|---|---|
| N-01 | Propósito rector: construir un bucle de observación, análisis, selección de mejora, desarrollo asistido, pruebas y actualización del backlog. | D-001, D-005, D-010, D-023, D-032, D-033, D-034 | El agente avanza desde instrucciones verbatim y evidencia, selecciona tareas no bloqueadas y deja un resultado reproducible. No declara BMO-01 alcanzado hasta cumplir sus criterios. |
| N-02 | La extensión debe observar la interfaz de la plataforma de uso principal y mantener telemetría útil para desarrollo continuo. | D-001–D-005, D-039, D-041 | Captura estructural minimizada y allowlisted; el contenido conversacional se persiste en el archivo documental separado, no en el JSONL de diagnóstico. |
| N-03 | Diseño agnóstico a plataforma, con prioridad inicial a ChatGPT y capacidad de adaptación futura. | D-003, D-004, D-005 | Mantener adaptadores/capas neutrales; no expandir a otras plataformas hasta resolver y validar el caso ChatGPT. |
| N-04 | No automatizar el envío ni la interacción conversacional de ChatGPT; las acciones sensibles de envío permanecen bajo control humano. | D-005, D-023 | El overlay no escribe en el compositor ni envía prompts. Cualquier prompt de continuidad, cuando exista, se prepara para envío manual. No se automatiza eludir límites del plan gratuito. |
| N-05 | La automatización de calidad de vida sí puede abarcar empaquetamiento y persistencia local de conversaciones. | D-005, D-023, D-040, D-041 | El archivado local puede activarse por señales propias, con integridad, cobertura explícita y sin automatizar controles de la plataforma. |
| N-06 | Las instrucciones del operador son criterio de verdad y deben conservarse literalmente. | D-005, D-020, D-021, D-023, D-035, D-039, D-040, D-041 | Cada instrucción sustantiva se guarda en `originales/` verbatim, sin normalización; se acompaña de lectura de vuelta y SHA-256. |
| N-07 | Toda tarea provisional debe nacer de una instrucción y ser razonablemente trazable a ella. | D-005, D-020, D-021, D-023, D-035, D-039–D-041 | Relación D-key → OMM/FUT → criterios → cambio → pruebas → evidencia/aceptación. La trazabilidad debe ser suficiente, no burocrática. |
| N-08 | Las instrucciones, interpretación, decisión, tarea y resultado son elementos separados. | D-005, D-023, D-035, D-041 | A literal nunca se sustituye por B; decisiones y estados se documentan fuera del original. Los originales históricos no se corrigen retrospectivamente. |
| N-09 | Mantener un backlog ordenado, dependencias válidas y trabajo extremo a extremo. | D-009, D-010, D-011, D-020, D-021, D-032–D-034 | El OCP es el registro rector de tareas; seleccionar la tarea disponible de mayor prioridad y no crear backlogs paralelos. «Resuelto» exige criterios y evidencia, no solo escritura de código. |
| N-10 | Recordar en cada ciclo el objetivo del sprint y el objetivo de ciclo en lenguaje simple. | D-024, D-034 | Cada cierre/continuidad visible debe mostrar propósito, subobjetivo, tarea activa, estado general y siguiente paso. |
| N-11 | Avanzar con rapidez, evitando comprobaciones innecesarias, pero sin sacrificar calidad. | D-017, D-018, D-020, D-021, D-029, D-032, D-037, D-038, D-041 | Ciclos cortos y pruebas discriminantes. Comunicar bloqueantes. No eliminar controles esenciales de privacidad, integridad, autorización o aceptación. |
| N-12 | Avisar cuando exista un bloqueo y pedir apoyo al operador solo cuando realmente sea necesario. | D-017, D-021, D-033, D-034, D-041 | Escalar decisiones de producto, autorización o acceso que correspondan al operador; resolver autónomamente las operaciones técnicas ordinarias. |
| N-13 | La operación técnica del frente se realiza mediante RDC y en el workspace de fila4. | D-006, D-007, D-029, D-036, D-037 | Usar la conexión RDC disponible y la ruta autorizada del repositorio fila4. Distinguir identidad del equipo, perfil propietario de los archivos y cuenta bajo la que corre el proceso RDC. |
| N-14 | Restricción posterior sobre navegación y pruebas: CLI/headless, sin usar el navegador principal como banco de pruebas. | D-015, D-016 | D-016 restringe la autorización amplia inicial de D-015. No abrir ni manipular el Chrome principal desde el agente. La extensión que el operador cargue en su perfil se diseña para funcionar allí, pero su aceptación natural se documenta separadamente. |
| N-15 | Entregar artefactos listos para carga y mantener el ciclo de recarga de desarrollo controlado. | D-007, D-011, D-014, D-019 | Los paquetes locales deben ser coherentes y verificables. La recarga manual reportada por el operador no prueba por sí sola la versión activa; las preguntas sobre autorrecarga no autorizan ejecutarla. |
| N-16 | Persistir el último tramo y reproducir literalmente la salida solicitada cuando se requiera continuidad. | D-012, D-023 | Mantener copia literal de la salida fuente; marcar recortes y no atribuirles cobertura íntegra ni metadatos nativos que no se expusieron. |
| N-17 | Groq es condicional y debe aportar mejora objetiva; no forma parte del runtime de Extension/Collector. | D-027, D-028, D-030, D-031 | Groq Assist permanece fuera de la extensión cargable y del colector. Solo se utiliza bajo hipótesis útil y credenciales obtenidas de la bóveda autorizada; no se simula el uso. D-031 prevalece sobre solicitudes previas de integración en runtime. |
| N-18 | La mejora binómica/benchmark debe producir datos utilizables para decidir cambios reales. | D-033, D-034 | No simular resultados ni declarar baseline inexistente como comparación real. Registrar método, muestras, procedencia, limitaciones, falsos positivos y decisión que habilita. La prioridad se rige por el alcance y bloqueos vigentes. |
| N-19 | Etiquetar datos y procedencia de conversaciones, ciclos y partes A/B, vinculándolos a OCP, frente y repositorio. | D-035, D-036 | Mantener identidad nativa y UUIDv7 local separados; registrar zona/precisión/fuente de timestamps. FOL1 gobierna folios globales y no se inventan mientras no esté activa. |
| N-20 | Mantener una especificación general técnica y revisarla en cada ciclo sustantivo. | D-038, D-041 | OCP conserva estado y backlog; Especificación General conserva el contrato técnico integral. Preservar versiones previas byte a byte antes de editar y actualizar índice/procedencia/README cuando exista delta. |
| N-21 | Revisar en paralelo la suficiencia de la observabilidad en cada tarea de desarrollo o mejora. | D-039, D-040, D-041 | OMM-FUT-006 obligatorio con fases O0–O5: necesidad, auditoría de línea base, dictamen, evidencia durante el trabajo, auditoría de salida y propuesta condicionada. |
| N-22 | No ampliar el sistema de observabilidad por rutina; usar los datos existentes y proponer expansiones solo con evidencia convergente. | D-039, D-041 | Inspeccionar primero el banco; registrar «observabilidad revisada / sin delta» si es suficiente. No crear otro banco general sin necesidad demostrada. Cambios de productor/esquema requieren autorización explícita. |
| N-23 | Mantener versionado SemVer vinculado a esfuerzos/tareas provisionales concretos. | D-039, D-040, D-041 | Una fila por esfuerzo definido; diferenciar versión planificada de construida/publicada. OMM-FUT-007/0.6.0 y OMM-FUT-008/0.7.0 son objetivos propuestos, no releases disponibles. |
| N-24 | Crear un Markdown de alta calidad por conversación y actualizar el mismo archivo en cada ciclo. | D-005, D-023, D-040, D-041 | Un archivo maestro por ID nativo, con metadatos expuestos, mensajes cronológicos y formato enriquecido; escritura atómica/idempotente, SHA/read-back y estado COMPLETE/PARTIAL. No inventar timestamps, modelos, IDs ni contenido no visible. |
| N-25 | La cobertura de conversaciones se amplía a todas las pestañas ChatGPT del ámbito autorizado. | D-041 | Completar/validar la observación multi-pestaña parcial de 0.5.0. Reconciliar múltiples tabs a un hilo nativo; conservar tabId como efímero; declarar suspensión, virtualización y conflictos como límites. |
| N-26 | Recoger señales arquitectónicas de la aplicación web para mantenimiento y mejora continua. | D-041 | Allowlist estructural y de bajo riesgo; no inspeccionar tráfico, cookies, tokens, estado React interno, secretos ni cuerpos no autorizados. No inferir backend a partir del DOM. |
| N-27 | El overlay permite valorar elementos concretos y añadir comentarios. | D-041 | Acción explícita sobre un ancla con calidad declarada; accesibilidad y no interferencia con controles nativos. Comentarios locales, no enviados al compositor ni a servicios externos. |
| N-28 | Los likes refuerzan patrones positivos; dislikes documentan necesidades de corrección. | D-041 | LIKE → REFUERZO; DISLIKE → SEÑAL_CORRECTIVA. No inferir una aceptación de producto ni convertir automáticamente DISLIKE en incidencia. |
| N-29 | Las incidencias deben tener gobernanza y trazabilidad de resolución. | D-041 | Triage antes de confirmar una incidencia; estados append-only, duplicado/no reproducible/diferido, vínculo con tarea, cambio, prueba, resolución y cierre. |
| N-30 | La persistencia local debe ser íntegra, recuperable y auditable. | D-005, D-020, D-021, D-035, D-038–D-041 | Escritura atómica cuando aplique, idempotencia, SHA-256, lectura de vuelta, historial de versiones y preservación de último snapshot COMPLETE ante captura parcial. |
| N-31 | No colapsar propuesta, autorización, ejecución, verificación, aceptación y publicación. | D-010, D-011, D-014, D-018, D-021, D-032, D-038, D-041 | Cada resultado declara su nivel. Prueba sintética ≠ aceptación natural; código local ≠ versión publicada; tarea provisional ≠ autorización de producción. |
| N-32 | La continuidad debe respetar seguridad, privacidad y límites de plataforma. | D-003–D-005, D-015–D-016, D-023, D-027, D-031, D-041 | No automatizar envío ni sortear límites; no copiar secretos; separar datos conversacionales, telemetría estructural, feedback e historial de gobernanza. |

## 3. Precedencia, tensiones y decisiones resueltas

### 3.1. Medición temporal frente a gobernanza vigente

D-001–D-004 y D-010 establecieron la intención inicial de medir T1/T2 y duraciones. Esas instrucciones se conservan como historia, pero no autorizan ejecutar hoy métricas que la gobernanza DUG/Metacanon §52 desactiva. El OCP §13 establece que T1/T2 y `duration_ms` heredados son NO CONFORMES. D-041 demuestra rutas activas y 31 eventos históricos con `durationMs`; OMM-FUT-009 queda como corrección provisional. La precedencia vigente es la restricción normativa más reciente, sin borrar la intención histórica.

### 3.2. Navegador principal frente a CLI/headless

D-015 otorgó una autorización amplia inicial; D-016 la restringió posteriormente a CLI/headless. Para pruebas del agente prevalece D-016. Esta regla no impide diseñar una extensión que el propio operador instale en Chrome y use normalmente; impide que el agente manipule el navegador principal como entorno de pruebas.

### 3.3. Groq dentro/fuera de la extensión

D-027–D-030 exploraron uso de Groq para acelerar el desarrollo. D-031 es la decisión posterior: Groq no forma parte de Extension ni Collector; GroqAssist queda fuera del runtime cargable.

### 3.4. Automatización local frente a automatización de ChatGPT

D-005/D-023 permiten automatizar tareas locales de calidad de vida, como exportación/archivo y preparar una solicitud de continuidad, pero exigen que el operador realice el envío manual. D-041 amplía el overlay y archivo local, no el envío ni el control conversacional de ChatGPT.

### 3.5. Identidades y folios

Los UUIDv7 de conversación/ciclo, ID nativo de ChatGPT, tabId, identidad de dispositivo RDC y perfil de usuario son identidades diferentes. No sustituir unas por otras. FOL1 PREPARADO / NO ACTIVO implica que no se emiten folios globales CV/CY/A/B.

## 4. Tareas provisionales relacionadas

| Tarea | Relación normativa | Estado |
|---|---|---|
| OMM-FUT-006 | N-21, N-22: auditoría recurrente de observabilidad O0–O5 | RECURRENTE / ACTIVA COMO REGLA |
| OMM-FUT-007 | N-24: Markdown maestro por conversación actual | PROVISIONAL / NO IMPLEMENTADA; versión objetivo 0.6.0 |
| OMM-FUT-008 | N-25 a N-29: multitabs, telemetría estructural, overlay, refuerzos e incidencias | PROVISIONAL / NO IMPLEMENTADA; 0.7.0 propuesta después de 0.6.0 |
| OMM-FUT-009 | N-21, N-22, N-31, N-32: retirar telemetría temporal no conforme y resolver histórico autorizado | PROVISIONAL / NO IMPLEMENTADA; sin SemVer asignado |
| OMM-FUT-010 | N-06, N-07, N-08, N-19: cerrar la brecha del corpus y confirmar procedencia de D-025/D-026 | PROVISIONAL / NO IMPLEMENTADA; P2, sin versión |

## 5. OMM-FUT-010 · Cerrar integridad de corpus verbatim y referencias faltantes

**Padre:** OMM-01-038, con vínculo normativo directo a OMM-01-035.  
**Prioridad:** P2.  
**Estado:** PROVISIONAL / NO IMPLEMENTADA.  
**Propósito:** recuperar o confirmar la procedencia de D-025/D-026, verificar la secuencia documental y mantener la matriz N-01…N-32 alineada con cada fuente literal disponible.  
**Alcance:** buscar únicamente fuentes locales/autorizadas de continuidad; no reconstruir texto desde recuerdos, inferencias ni resúmenes. Si no se recupera una fuente, dejar el hueco explícito y no inventar un original.  
**Criterios de salida:** (1) cada D-key localizado tiene ruta y SHA/read-back; (2) D-025/D-026 tienen fuente verificada o quedan formalmente declarados como no recuperables/no asignados; (3) cada norma tiene fuente(s) trazables; (4) contradicciones/prevalencias están documentadas; (5) matriz y OCP se actualizan sin alterar originales.  
**Límite:** D-041 no recupera ni inventa D-025/D-026; esta tarea no autoriza transferir conversaciones privadas a servicios externos.

## 6. Estado, alcance y limitaciones de esta matriz

- La matriz compara el OCP histórico y los 11 archivos de instrucciones disponibles. No afirma que exista un archivo individual para cada clave D.
- D-025 y D-026 no aparecieron en los repositorios documentales consultados; quedan como hueco, no como instrucciones reconstruidas.
- La tabla N-01…N-32 es una extracción operativa de los requisitos encontrados y de las precedencias que ya figuran en el OCP. Los originales mantienen primacía.
- D-001–D-004 y D-010 conservan peticiones históricas de medición temporal; su ejecución queda bloqueada por la norma vigente Metacanon §52, no por una edición del texto literal.
- Las reglas de acceso y operación se aplican por alcance y temporalidad. La autorización histórica amplia de D-015 queda restringida por D-016.
- La matriz se elaboró en D-041. No se modificaron Extension, Collector, sus permisos, manifest, productores ni el banco JSONL.
- Fecha/hora nativas de los mensajes D-001…D-041: no se reconstruyen aquí cuando no fueron expuestas en sus fuentes; los timestamps de archivos representan persistencia local únicamente.

**Dictamen:** las normas verificables quedan estructuradas y vinculadas a tareas/decisiones. La cobertura documental sigue abierta únicamente para D-025/D-026 y para cualquier fuente futura que se demuestre fuera del corpus local inspeccionado.
