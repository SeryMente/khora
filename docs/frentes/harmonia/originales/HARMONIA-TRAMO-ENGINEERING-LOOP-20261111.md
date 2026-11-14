# Harmonia — implementación del bucle local de ingeniería

**Corte:** 2026-11-11 · America/Mexico_City  
**Frente:** KHORA / Harmonia · **Sprint:** OMM-01 — Observa · Mide · Mejora  
**UUIDv7 local:** 01a1ccc8-f8df-7d83-bbb6-eca64522cb95  
**Instrucción de continuidad:** “Sigue, avanza, dame resultados.”  
**Naturaleza:** continuidad técnica y evidencia de implementación local. No es ID nativo de conversación ni folio formal.

## 1. Resultado principal

Se conectó Groq Assist con un ejecutor local de pruebas predefinidas. La función pública `runEngineeringCycle({ report, env?, fetchImpl?, cwd?, spawnSyncImpl? })` ejecuta:

1. Compilación de evidencia estructural allowlisted y triage local determinista por defecto; Groq es opcional y conserva sus compuertas propias.
2. Validación del resultado `harmonia.dev-triage-result.v1`.
3. Resolución del único campo de decisión, `scenario_id`, contra un mapa cerrado de nueve escenarios.
4. Ejecución de una sola prueba Node predefinida con parámetros fijos.
5. Devolución de diagnóstico acotado y resumen categórico TAP; no se devuelve informe bruto, stdout ni stderr.

No es un agente autónomo con permisos para modificar código. El modelo no puede proponer comandos, rutas, argumentos, regex ni fragmentos de shell. Codex sigue siendo el implementador de cambios de producto y debe trabajar con TDD y evidencia.

## 2. Diseño y seguridad del ejecutor

- Ejecutable fijo: `process.execPath`.
- Argumentos fijos: `--test --test-name-pattern <patrón-fijo> <archivo-fijo>`.
- `shell: false`; timeout: 60.000 ms.
- Allowlist de escenarios en código fuente; no se deriva de texto generado por el modelo.
- `INSUFFICIENT_EVIDENCE`: no lanza ningún proceso.
- ID desconocido/hostil: rechazo antes del lanzamiento.
- Cero tests coincidentes, fallo del proceso o timeout nunca se reportan como éxito.
- El proceso hijo recibe únicamente variables básicas del sistema necesarias para Node en Windows. No hereda `GROQ_API_KEY`, EP Vault, marca ZDR ni contexto interno `NODE_TEST_CONTEXT`.
- Se encontró y corrigió una causa real de falsos ceros: el hijo heredaba `NODE_TEST_CONTEXT` del runner `node:test`. La suite de integración reprodujo el problema y pasó después de aislar el entorno.
- Se corrigió el mapeo semántico de `ROOT_NOT_FOUND`, `SIGNAL_NOT_VISIBLE` y `NO_RISING_EDGE` para enlazar cada uno a la prueba existente más directamente pertinente.

## 3. Escenarios allowlisted

- `ROOT_NOT_FOUND` → informe estructural vacío ante documento ausente.
- `USER_NODE_MISSING` → nodo DOM de usuario no inicia T1 por sí solo; la señal visible de procesamiento emite T1.
- `SIGNAL_NOT_VISIBLE` → medición de visibilidad y cambios estructurales.
- `NO_RISING_EDGE` → diagnóstico de contadores de actividad, T1, T2 y sink.
- `CORRELATION_ORDER` → señal de procesamiento anterior al nodo de usuario.
- `START_REJECTED` → rechazo de inicio sin señal allowlisted.
- `SINK_FAILURE` → rechazo del colector y conservación de evento pendiente.
- `WORKER_PERSISTENCE` → cola local duradera y resumen de ciclo gráfico.
- `T2_SETTLE` → T2 requiere respuesta del asistente y estado UI inactivo.

Los patrones se ejecutan contra los tests nombrados existentes y se verifican realmente. No se crea evidencia natural ni se altera el KPI T1/T2.

## 4. Evidencia de pruebas

**TDD del runner:**
- RED inicial: `ERR_MODULE_NOT_FOUND` al importar el módulo inexistente.
- RED adicional: mapeos no pertinentes y herencia de variables sensibles detectados por pruebas específicas.
- GREEN final de runner: **13/13 PASS**.
- Cada uno de los nueve escenarios se ejecutó realmente contra su test nombrado y produjo al menos un test.
- `runEngineeringCycle` se probó con informe de ejemplo y fallback local; `INSUFFICIENT_EVIDENCE` no despacha nada.

**Ejecución real de extremo a extremo (informe de ejemplo, `env: {}`, sin red ni credenciales):**
- Provider: `local-fallback`.
- Motivo: `api_key_unavailable`.
- Diagnóstico: `no_rising_edge`.
- Escenario: `NO_RISING_EDGE`.
- Experimento: **passed**, 1/1 test.

**Suite activa completa:** **54/54 PASS**, cero fallos, ocho archivos de prueba; Extension, Collector y DevTools, excluyendo archivos históricos de `archive/`.
- JavaScript/MJS: 18/18 archivos pasaron `node --check`.
- JSON: 7/7 archivos válidos.

## 5. Groq y privacidad

- No se hizo ninguna llamada real a Groq ni se consumió cuota.
- Las pruebas de transporte de `assist.mjs` siguen usando fetch simulado.
- `runEngineeringCycle` usa fallback local si no hay credencial; en esta prueba se inyectó un entorno vacío.
- La compuerta `HARMONIA_GROQ_ZDR_VERIFIED=true` no demuestra ZDR por sí sola; el wrapper `-ZdrVerified` es una afirmación manual, no una consulta de Data Controls. No habilitar llamadas reales sin comprobar la cuenta.
- Groq permanece fuera de Extension/ y Collector/. El cronómetro T1/T2 continúa local y determinista.
- El coordinador no consume ni transmite prompts/respuestas ni ejecuta comandos redactados por el modelo.

## 6. Estado del producto y límites

- Extensión candidata 0.4.8; build-info 0.4.8; popup ahora muestra 0.4.8 y coincide con el manifiesto. El test de coherencia ya está incluido.
- La extensión no se cargó ni recargó en Chrome. No se abrió, enfocó, navegó, inspeccionó ni modificó Chrome principal.
- La candidata está preparada en `KHORA/Harmonia/Extension/`, pero no se declara instalada ni activa.
- Ciclos T1/T2 naturales aceptados: 0 / no verificados.
- BMO-01: NO ALCANZADO. Cinco ciclos naturales correlacionados y persistidos siguen pendientes.
- Colector: proceso local ya observado escuchando en `127.0.0.1:47321`; la consulta sin credencial a `/health` devuelve 401 esperado. En este ciclo no se autenticó el endpoint ni se declara HEALTH=OK fresco.

## 7. Persistencia e integridad

- Plan: `docs/superpowers/plans/2026-11-11-harmonia-scenario-runner.md`; pasos ejecutados marcados.
- Archivos de implementación: `Harmonia/DevTools/GroqAssist/scenario-runner.mjs`, `scenario-runner.test.mjs`, `README.md`.
- OCP previo v0.73 preservado antes de la edición en `archive/OBJETO-CANONICO-v0.73-pre-scenario-runner-20261111.md`; SHA-256 del original y respaldo coincidentes: `BF1AFBC88650A16FD2DB23592EAE5FD0255F765F65D9130713C18CCE8557B6C8`.
- La revisión `git diff --check` del worktree completo continúa detectando trailing whitespace histórico en OCP y líneas de instrucciones verbatim. No se realizó una limpieza general ni se reescribieron esas líneas.
- Rama: `work/harmonia-front-workspace-20261110`.
- HEAD: `9fd5c18205e39b6db12c9152b07d8f880f6b256d`.
- Sin commit, push, PR, merge, publicación ni despliegue. No se limpió ni reseteó el worktree.
