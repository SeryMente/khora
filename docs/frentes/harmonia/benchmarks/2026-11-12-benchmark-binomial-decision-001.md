# BENCH-GROQ-001 · Benchmark pareado para mejorar la implementación binómica

**Programa:** OMM-01-033  
**Fecha de diseño:** 2026-11-12 · America/Mexico_City  
**Estado:** PROTOCOLO Y ESTRUCTURA DE DATOS DEFINIDOS · EJECUCIÓN REAL PENDIENTE  
**Propósito:** decidir con evidencia qué partes de la implementación ChatGPT + Groq deben mantenerse, cambiarse, condicionarse o eliminarse.

## 1. Decisión que debe permitir

El benchmark no busca determinar qué modelo “responde mejor” en abstracto. Debe identificar si incorporar Groq al flujo de ingeniería produce cambios verificables en:

1. exactitud del diagnóstico de la incidencia real;
2. hallazgos nuevos, accionables y aceptados que el brazo base no obtuvo;
3. calidad de la prueba discriminante seleccionada;
4. tiempo total hasta una mejora verificada;
5. retrabajo, falsos positivos y regresiones;
6. uso de tokens y coste incremental por mejora aceptada.

Los datos deben permitir ajustar el Cognitive Router, el umbral de confianza local, el paquete de evidencia, el prompt, el catálogo de escenarios, el orden de intervención y las reglas de fallback. Si no permiten tomar esas decisiones, el benchmark se considera incompleto.

## 2. Brazos pareados

Cada par utiliza la misma incidencia, el mismo paquete de evidencia sanitizado, el mismo contrato de tarea, el mismo snapshot de código y los mismos criterios de aceptación.

- **Brazo A — referencia:** ChatGPT dirige el análisis; se usa el diagnóstico determinista local; Codex ejecuta el contrato de tarea acotado.
- **Brazo B — binómico:** ChatGPT conserva la autoridad de arquitectura y aceptación; Groq analiza independientemente el mismo paquete sanitizado sin ver previamente la respuesta de ChatGPT; ChatGPT reconcilia las dos salidas; el mismo Codex ejecuta un contrato equivalente bajo los mismos controles.

Codex se mantiene constante entre brazos para aislar la contribución marginal de Groq. Las ejecuciones A y B se realizan en snapshots aislados independientes; ninguna recibe el diff, la respuesta ni los resultados del otro brazo.

## 3. Tamaño y repetición del piloto

- **Cinco incidencias reales distintas** seleccionadas del backlog OMM-01.
- **Dos repeticiones independientes por incidencia y por brazo.**
- Total objetivo: **10 pares comparables / 20 ejecuciones de flujo**.
- Orden de ejecución alternado A→B y B→A para reducir sesgo temporal.
- Cada par conserva el mismo SHA-256 del paquete de evidencia, contrato y snapshot inicial.
- La temperatura/configuración del modelo, prompt y versiones se registran. Si se cambia una versión, se abre un bloque experimental nuevo; no se mezclan resultados.
- No se completa una fila con fixtures sintéticos, mocks o diagnósticos inventados. Los casos deben corresponder a problemas reales reproducibles o a observación natural verificable.

Cinco casos ofrecen un piloto exploratorio, no significancia estadística ni generalización universal. Las conclusiones se restringen a las clases de tarea realmente observadas.

## 4. Selección de casos

Se seleccionan cinco tareas no duplicadas del backlog, dando preferencia a defectos reproducibles y evidencia suficiente. La validación natural T1/T2 se incorpora cuando exista una traza natural verificable; no se sustituye por fixtures. No se declarará que los cinco casos ya están seleccionados hasta comprobar su evidencia.

Cada caso registra: case_id, task_class, tarea OMM vinculada, criterio de verdad, evidencia sanitizada, SHA-256 del paquete, SHA-256 del snapshot, contrato de aceptación y estado de verificación de la causa raíz.

## 5. Datos obligatorios por ejecución

| Grupo | Datos que se registran | Decisión habilitada |
|---|---|---|
| Identidad experimental | case_id, pair_id, repetición, brazo, timestamp, versión del protocolo | asegurar comparabilidad y reproducibilidad |
| Insumos | task_class, OMM ID, SHA-256 de evidencia/snapshot/contrato, versión del prompt | localizar qué tareas/contextos producen valor |
| Modelos | proveedor, modelo, versión/fecha, configuración y latencia | comparar modelos y aislar cambios de configuración |
| Diagnóstico | código de causa, escenario elegido, referencias de evidencia, confianza | recalibrar router, umbrales y catálogo |
| Hallazgos | IDs normalizados de hallazgos, si son únicos frente al brazo A, accionables, verificados y aceptados | medir valor incremental real de Groq |
| Calidad | claims sin soporte, falsos positivos, causa correcta, regresiones, resultado de pruebas | endurecer prompt/esquema/validador o retirar rutas deficientes |
| Ejecución | iteraciones, reintentos, tiempo de análisis, tiempo Codex, tiempo total hasta aceptación | optimizar el orden ChatGPT/Groq/Codex |
| Consumo | tokens de entrada/salida por proveedor, coste observado o calculado y fuente de tarifa | decidir cuándo conviene invocar Groq |

No se envían secretos, credenciales, contenido conversacional, HTML/DOM, URLs, identificadores de sesión ni diffs a Groq. La entrada externa se limita al sobre diagnóstico allowlisted. El benchmark no depende de ZDR ni lo registra como condición de ejecución.

## 6. Verdad de referencia y evaluación

La causa raíz se establece después mediante evidencia independiente: reproducción, prueba discriminante, inspección local y aceptación del resultado. La coincidencia entre dos modelos no se toma como verdad de referencia.

El evaluador compara las salidas A/B sin conocer el nombre del modelo cuando sea practicable. Un hallazgo solo cuenta como valor incremental cuando:
- no estaba presente en el brazo A;
- se apoya en campos de evidencia existentes;
- lleva a una acción o prueba concreta;
- la acción/prueba confirma el hallazgo;
- el cambio supera los criterios de aceptación y no introduce regresiones.

Un acierto verbal sin una acción comprobada no cuenta como mejora aceptada. En cada brazo, run.accepted indica si el resultado de ese brazo superó su contrato de aceptación; pair.verification.root_cause_verified confirma la verdad de referencia independiente; paired_inputs_equal confirma que evidencia, snapshot y contrato fueron iguales entre brazos; record_reviewed confirma que el evaluador revisó el par completo. La persona evaluadora se registra en verified_by. El evaluador nunca infiere estos estados a partir del acuerdo entre modelos.

## 7. Métricas principales

**Primarias**
- exactitud de causa raíz sobre casos con verdad de referencia verificada;
- número y proporción de hallazgos únicos de Groq aceptados;
- tasa de tareas que alcanzan aceptación;
- mediana del tiempo total hasta aceptación por brazo;
- retrabajo/iteraciones hasta resultado aceptado.

**De control**
- falsos positivos y claims no sustentados;
- regresiones y fallos de pruebas;
- latencia y tokens por proveedor;
- coste incremental total y coste por hallazgo único aceptado;
- cobertura por task_class y banda de confianza local.

Se publican siempre numeradores, denominadores y resultados por caso. No presentar solo promedios ni mezclar tareas distintas sin estratificar. El evaluador produce decisión global y por task_class, además de bandas de confianza.

## 8. Reglas de decisión predefinidas

Aplicar las reglas al conjunto completo y también por clase de tarea:

- **Conservar e integrar Groq en una clase:** al menos 3 de las 5 incidencias muestran una mejora única, verificada y aceptada atribuible a Groq, o se demuestra una mejora de al menos 10 puntos porcentuales en exactitud, o una reducción de al menos 15% en la mediana del tiempo total; sin regresiones críticas y sin degradación relevante de precisión.
- **Restringir por tarea/confianza:** si el valor aparece solo en una clase de tarea o una banda de confianza, el router debe invocar Groq únicamente en ese segmento.
- **Ajustar prompt/esquema/validador:** si hay diagnósticos correctos con claims no sustentados, evidencia mal citada, escenarios incorrectos o recomendaciones no accionables.
- **Ajustar paquete de evidencia:** si los errores se concentran en ausencia de campos necesarios; cualquier campo nuevo debe justificarse por una decisión que habilite y seguir la allowlist.
- **Ajustar catálogo/pruebas:** si el diagnóstico es plausible pero la prueba elegida no discrimina entre hipótesis.
- **No integrar o retirar Groq de una clase:** si no aporta hallazgos únicos aceptados ni mejora exactitud/tiempo, o aumenta falsos positivos, retrabajo o regresiones.
- **Pedir más evidencia:** si no hay cinco casos reales verificables o los pares no comparten insumos equivalentes. No emitir conclusiones de superioridad con una muestra incompleta.

Los umbrales son criterios de decisión del piloto, no afirmaciones de significancia estadística. El coste por mejora aceptada se reporta en todos los casos; la integración permanente queda sujeta al valor operativo y al presupuesto autorizado.

## 9. Mapa de datos a cambios concretos

| Patrón observado | Cambio candidato en la implementación binómica |
|---|---|
| Groq aporta una causa correcta no detectada localmente, repetida y verificada | añadir discriminador/campo allowlisted y crear prueba específica |
| La ganancia aparece solo con baja confianza local | recalibrar umbral y ruta del Cognitive Router por banda |
| La ganancia se concentra en una clase | activar Groq solo para esa clase; no invocarlo globalmente |
| Groq repite el fallback local | elevar la exigencia de ambigüedad o evitar la llamada |
| Groq cita campos no presentes o inventa causas | endurecer prompt, schema, Evidence Validator y criterios de rechazo |
| Groq acierta la causa pero el escenario no reproduce/falsifica | corregir catálogo y mapeo de escenarios del runner |
| La precisión aumenta pero el tiempo/coste neto empeora | invocación selectiva según valor esperado y coste medido |
| No hay mejora verificada | conservar fallback local y desactivar la ruta para esa clase |

## 10. Estado inicial y bloqueos

- BENCH-001 es una prueba de viabilidad del ejecutor Codex; **no** mide la contribución marginal de Groq y no se contará como resultado del benchmark binómico.
- BENCH-GROQ-001 tiene el protocolo, las variables y los umbrales definidos; el dataset permanece vacío.
- El router y run-via-vault.ps1 se están ajustando para que ZDR no sea una compuerta.
- La localización autorizada no encontró EPVault-CLI.cmd en la ruta de instalación consultada y EP_VAULT_CLI no está configurada. No se leyó ni copió la clave. Sin Vault activo no puede hacerse una llamada real; no se reemplazará por mocks.
- No se registran llamadas Groq reales, ahorros ni hallazgos aceptados hasta que existan respuestas reales y verificación independiente.

## 11. Artefactos de datos

- 2026-11-12-benchmark-binomial-decision-001.md: protocolo y reglas de decisión.
- 2026-11-12-benchmark-binomial-data-template.json: plantilla vacía de casos/pares.
- 2026-11-12-benchmark-binomial-data.schema.json: estructura de validación del dataset.
- 2026-11-12-benchmark-binomial-data.schema.json: estructura de validación del dataset.
- Harmonia/DevTools/GroqAssist/benchmark-analyzer.mjs y benchmark-analyzer.test.mjs: agregador de métricas y generador determinista de decisiones.
- El evaluador exige cinco casos distintos, diez pares, repeticiones R1/R2 por caso, causa raíz verificada, insumos pareados idénticos y revisión independiente antes de emitir una decisión.
- BENCH-001 permanece separado como evidencia del smoke test Codex.
