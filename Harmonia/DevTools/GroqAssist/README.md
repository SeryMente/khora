# Groq Assist · Harmonia

**Ubicación:** `Harmonia/DevTools/GroqAssist/`  
**Entrada:** `harmonia.diagnostic-report.v1` → `harmonia.dev-triage-input.v1`  
**Resultado cognitivo:** `harmonia.dev-triage-result.v1`  
**Ruta:** `harmonia.cognitive-route.v1`  
**Decisión de política:** `harmonia.policy-decision.v1`  
**Versión:** 0.2.0 (local, no publicada)

## Función y límites

Groq Assist es una herramienta local de ingeniería para reducir el trabajo diagnóstico y conducir a pruebas locales ya aprobadas. No es un agente general, no modifica repositorios y no es dependencia de `Extension/` ni de `Collector/`.

La extensión conserva la medición T1/T2 y el colector su persistencia determinista. Groq no participa en el cronómetro, la correlación de ciclos, la captura de la interfaz ni el almacenamiento de telemetría.

## Arquitectura local-first

El ciclo efectivo es:

1. `compileEvidence(report)` reduce el informe a agregados estructurales allowlisted.
2. `validateEvidenceEnvelope(input)` verifica esquema exacto, tipos, límites, enums, relaciones y agregados. Cualquier campo adicional o inconsistencia aborta antes de construir la llamada HTTP.
3. `fallbackTriage(input)` ejecuta primero el diagnóstico determinista local.
4. `routeCognitiveTask(...)` elige una ruta pura y no ejecutable:
   - `collect_more_evidence`: evidencia insuficiente; no llama a Groq ni ejecuta pruebas.
   - `local_deterministic`: diagnóstico local accionable con confianza ≥ 0.90; evita la llamada externa.
   - `groq_analysis`: solo para evidencia suficiente, ambigua y de bajo riesgo, si la llave de API está disponible.
   - `local_fallback`: conserva el diagnóstico local cuando faltan compuertas o Groq falla.
   - `operator_review`, `chatgpt_architecture`, `policy_firewall`, `codex_contract_review` o `chatgpt_escalation`: rutas descriptivas para responsabilidades fuera del triage; el router nunca las despacha.
5. Si se consulta Groq, su respuesta Structured Output debe superar `validateModelResult`: esquema cerrado, campos exactos, referencias allowlisted y escenario conocido.
6. `authorizeOperation` aplica el Policy Firewall inmediatamente antes del proceso hijo.
7. `runScenario` ejecuta como máximo una prueba fija; devuelve únicamente estado y conteos categóricos.

El router no recibe ni devuelve credenciales, no inicia procesos y no autoriza operaciones. `dispatch` siempre es false: seleccionar un responsable no equivale a ejecutar su trabajo.

## Cognitive Router

Módulo: `cognitive-router.mjs`.

Es una política pura. No acepta claves de API, instrucciones libres, comandos ni propiedades extra. Su prioridad es evitar inferencias innecesarias: primero determina suficiencia; después usa la conclusión local si es inequívoca; solo luego considera Groq. Los riesgos altos/críticos se escalan a revisión humana, nunca a inferencia remota automática.

Para tareas de implementación se requiere contrato validado y autorización del operador antes de clasificarla como candidata para Codex. Aun entonces, no se lanza Codex; esta versión no implementa un ejecutor de Codex.

## Evidence Validator

Módulo: `evidence-validator.mjs`.

- Acepta únicamente `harmonia.dev-triage-input.v1`, contrato `1.0`, con estructura completa y claves exactas.
- Comprueba contadores enteros acotados, versiones, booleanos, duraciones, porcentajes, señales conocidas y relaciones matemáticas entre totales.
- Rechaza propiedades adicionales, texto libre, IDs, campos desconocidos, valores fuera de rango e inconsistencias.
- Devuelve una copia aislada del objeto validado.
- La suficiencia mínima requiere al menos una pestaña informante y un snapshot. No se infiere suficiencia a partir de la existencia del informe solamente.

Un error de validación aborta; no se omite el validador ni se intenta enviar el informe original como fallback.

## Policy Firewall

Módulo: `policy-firewall.mjs`.

La única operación permitida en esta versión es:

`actor=harmonia · operation=run_fixed_diagnostic_test · workspace=groqassist_tests`

Solo admite los nueve `scenario_id` del catálogo estático. El catálogo del firewall y el mapa del runner se cotejan al cargar el módulo; una diferencia detiene la inicialización.

Las capacidades `shell`, `network`, `writes` y `secret_access` deben ser exactamente false. Se rechazan campos extra, actores, operaciones, workspaces y escenarios desconocidos. El runner además exige que `cwd` sea exactamente la raíz de Harmonia y ejecuta una ruta de test absoluta, argv fijo, `shell:false`, timeout de 60 segundos y entorno hijo mínimo.

El firewall no autoriza Codex, acceso a repositorios genéricos, escritura, borrado, despliegue, navegador, Chrome, MCP ni acceso a secretos. No es un sandbox del sistema operativo: es una barrera de política en el código local, complementaria a los permisos reales del proceso.

## Privacidad y compuertas externas

No se transmiten prompts, respuestas, textos de conversación, contenido del compositor, HTML/DOM, URLs, rutas, identificadores de sesión/conversación/ciclo/pestaña, etiquetas libres, errores libres, payloads crudos, código fuente ni diffs. Solo se transmite el sobre validado con contadores/categorías permitidos y el catálogo cerrado.

La llamada externa usa Chat Completions compatible con OpenAI, modelo `openai/gpt-oss-20b`, `reasoning_effort=low`, temperatura 0 y Structured Outputs estricto. No usa streaming, herramientas ni SDK externo.

La condición operativa para usar Groq es que EP Vault tenga una sesión activa y pueda inyectar únicamente GROQ_API_KEY al proceso autorizado. ZDR no es un requisito ni una variable del router. La entrada sigue limitada al sobre diagnóstico allowlisted y validado; no se exponen credenciales, conversación, DOM, rutas ni diffs.

No se ha realizado aún una llamada real a Groq ni se ha leído o copiado ninguna credencial. Los tests de transporte usan fetch simulado solo para verificar contrato y validación, nunca como resultado del benchmark. Si falta Vault, la sesión o la conectividad, se conserva el fallback local; ante evidencia inválida o política denegada se falla cerrado.

## API local

`runEngineeringCycle({ report, env?, fetchImpl?, cwd?, spawnSyncImpl? })` integra triage, enrutamiento y ejecución fija. `cwd` solo se acepta cuando coincide exactamente con la raíz de `Harmonia/`. Las funciones de inyección están destinadas a pruebas locales; no amplían la allowlist del firewall.

Ejemplo:

```js
import { readFile } from 'node:fs/promises';
import { runEngineeringCycle } from './scenario-runner.mjs';

const report = JSON.parse(await readFile('./diagnostic-report.json', 'utf8'));
const cycle = await runEngineeringCycle({ report, env: {} });
process.stdout.write(JSON.stringify(cycle, null, 2) + '\\n');
```

## Benchmark binómico y decisiones desde datos

El evaluador puro benchmark-analyzer.mjs recibe el dataset BENCH-GROQ-001 y genera decisión y métricas por brazo, muestra verificada, exactitud, precisión, mediana del tiempo hasta aceptación, falsos positivos, claims no sustentados, regresiones, tokens/coste, bandas de confianza y recomendaciones separadas por clase de tarea. No crea evidencia ni rellena casos.

Solo emite una decisión de integración cuando existen cinco casos distintos con causa raíz verificada y al menos diez pares verificados. Puede recomendar conservar Groq selectivamente, no integrarlo, desactivarlo para las clases probadas o solicitar más evidencia. Sus reglas se prueban en benchmark-analyzer.test.mjs; esos fixtures solo prueban el evaluador y no cuentan como datos del benchmark real.

## Resultados y aceptación

La respuesta reúne proveedor, motivo de fallback, ruta, códigos de diagnóstico, escenario y decisión del firewall. No incluye informe bruto, salida de proceso, rutas ni secretos. Un escenario no ejecutado por evidencia insuficiente no se representa como prueba exitosa. Cero pruebas coincidentes, error, salida no cero o timeout son fallos.

Los escenarios actuales son pruebas sintéticas preexistentes: no equivalen a observación natural de ChatGPT ni demuestran T1/T2 en producción. El benchmark de cinco incidencias reales sigue pendiente y es necesario para afirmar ahorro neto o mejora de precisión.

## Pruebas

Desde `Harmonia/`:

```powershell
node --test DevTools/GroqAssist/evidence-validator.test.mjs DevTools/GroqAssist/cognitive-router.test.mjs DevTools/GroqAssist/policy-firewall.test.mjs DevTools/GroqAssist/benchmark-analyzer.test.mjs DevTools/GroqAssist/assist.test.mjs DevTools/GroqAssist/scenario-runner.test.mjs
```

Suite activa completa (sin archivos de `archive/`):

```powershell
node --test Extension/cycle-observer.test.js Extension/service-worker.outbox.test.js Extension/surface-catalog.test.js Extension/popup.test.mjs Collector/cycle-telemetry.test.js Collector/tests/cycle-server.integration.test.js DevTools/GroqAssist/assist.test.mjs DevTools/GroqAssist/scenario-runner.test.mjs DevTools/GroqAssist/evidence-validator.test.mjs DevTools/GroqAssist/cognitive-router.test.mjs DevTools/GroqAssist/policy-firewall.test.mjs DevTools/GroqAssist/benchmark-analyzer.test.mjs
```

## Fuentes técnicas

- Groq Structured Outputs: https://console.groq.com/docs/structured-outputs
- Groq Reasoning: https://console.groq.com/docs/reasoning
- Groq Data Controls: https://console.groq.com/docs/your-data
