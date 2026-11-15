# D-042 · Resolución local de OMM-FUT-009 y preparación de integración · B

**Frente:** KHORA / Harmonia  
**Fecha de ciclo:** 2026-11-13 · America/Mexico_City  
**Conversación local UUIDv7:** 01a1d679-eb87-7290-b58c-26c4d7104253  
**Ciclo local UUIDv7:** 01a1d6bd-35a3-75b1-92f8-853155f9610b  
**DUG:** Samantha v396 / NX-396m · GOW 2.24 · HTML blob 038e29762038c96afa7291b86ba4c12fab338ff0  
**Metacanon:** metadata 1.31; objeto embebido 1.30; discrepancia no resuelta. La sección estructurada vigente meta-52 desactiva métricas temporales.  
**FOL1:** PREPARADO / NO ACTIVO; folios globales CV/CY/A/B NO ASIGNADOS.

---

## 1. Instrucción y decisión de trabajo

D-042 pide acelerar usando GitHub y CI local, integrar el resultado a main, mantener calidad, usar el backlog del frente, el criterio de verdad verbatim y observabilidad recurrente.

Se adoptó esta ruta:
1. Adquirir DUG desde el repositorio canónico y verificar la regla temporal actual.
2. Inspeccionar origin/main, el árbol local y los contratos reales antes de modificar.
3. Preservar baseline 0.5.0 antes de la corrección.
4. Ejecutar OMM-FUT-009 con cambios de productor, colector, API, query, UI y analizador.
5. Crear CI local reutilizable y workflow de GitHub para el árbol real Harmonia/**.
6. Actualizar OCP, especificación, SemVer, README, índice y procedencia.
7. Integrar desde una worktree limpia derivada del último origin/main, no empujar la rama local histórica ni su árbol sucio.

## 2. Dictamen de verdad normativa

La inspección del DUG v396 muestra dos representaciones incompatibles de la versión Metacanon: 1.31 en metadatos del documento y 1.30 en el objeto JSON embebido. La sección estructurada meta-52 está titulada «Métricas temporales · desactivadas» y prohíbe registrar/estimar duración de ciclos, latencia, tiempo de procesamiento, tiempo activo, esperas y comparativas temporales. Este texto es la regla aplicada por Harmonia. La discrepancia se registra; no se modifica el DUG ni se presume una corrección.

## 3. Ejecución de OMM-FUT-009

**Estado:** IMPLEMENTADA LOCALMENTE / VERIFICADA POR CI LOCAL. No equivale a aceptación natural ni publicación.

### 3.1. Extension
- Se añadió activity-observer.js para registrar solo estados estructurales ACTIVE/INACTIVE y transiciones INITIALIZED/ACTIVATED/DEACTIVATED.
- Payload allowlisted: señales aria-busy, data-is-streaming, stop-control, agent-progress; presencia/conteo de main; conteos visibles de nodos user/assistant.
- No hay reloj monotónico, temporizador de settle, restas, T1/T2 ni duración.
- Manifest carga activity-observer.js; cycle-observer.js quedó como interfaz retirada que rechaza su ejecución.
- Popup muestra estados y transiciones; no muestra medianas/P90 ni tiempo de generación.
- Service worker migra eventos temporales heredados del outbox a harmoniaLegacyTemporalQuarantine. La operación actualiza la clave de cuarentena y la cola remitible conjuntamente. Si falla la escritura, no se envía nada y la cola original queda intacta.

### 3.2. Collector / consulta
- Se añadió activity-telemetry.js, con validación estricta de propiedades, tipos, transiciones, señales y conteos.
- ui.activity.state y diag.activity.trace son los únicos contratos nuevos de observación.
- Los eventos T1/T2 heredados son rechazados HTTP 410; los campos temporales adicionales son rechazados por el saneador.
- capture.stopped conserva solo la razón; no persiste durationMs.
- /activity y /activity-diagnostics devuelven agregados estructurales.
- /cycles y /cycle-diagnostics responden HTTP 410.
- /index omite cycles y cycleDiagnostics.
- query.ps1 -Cycles se bloquea y -Activity consulta estados/transiciones. La salida de sesiones filtra claves temporales sin modificar archivos JSONL.

### 3.3. GroqAssist y benchmark
- El contrato de entrada pasa a harmonia.dev-triage-input.v2, con allowlist exacta de señales, conteos, tabs y estados.
- Groq no recibe timestamp, ID de conversación/sesión/pestaña, cuerpo de chat, URL, ruta, código ni eventos crudos.
- Escenarios locales cerrados usan pruebas estructurales predefinidas, no comandos del modelo.
- El benchmark elimina mediana de tiempo hasta aceptación y todos los campos *_ms; el nuevo resultado es harmonia.binomial-benchmark-analysis.v2.
- Los datasets que contengan duración, latencia o métricas temporales fallan cerrados.

### 3.4. Histórico y cuarentena
- Los 70 JSONL del banco local no se reescribieron.
- Los 31 eventos históricos capture.stopped que incluyen payload.durationMs permanecen byte-preservados; no se exportan como métricas válidas ni se muestran en consultas actuales.
- Los eventos temporales pendientes de la cola local Chrome se preservan íntegros en harmoniaLegacyTemporalQuarantine y no se retransmiten.
- Si la cuarentena no puede persistirse, la cola original se mantiene y se bloquea el envío.

### 3.5. Baseline anterior
Los 18 archivos de código/pruebas afectados y los dos scripts operativos INICIAR-HARMONIA.ps1 / DETENER-HARMONIA.ps1 de la candidata 0.5.0 se copiaron (20 artefactos) a Harmonia/archive/omm-fut-009-pre-correction-20261113/; tamaños y SHA-256 fuente/copia se cotejaron. No se borró ni sobrescribió el baseline.

## 4. CI local y GitHub

### 4.1. CI reproducible
- Script: Harmonia/CI-LOCAL.ps1.
- Workflow: .github/workflows/harmonia-validation.yml.
- Alcance del workflow: Harmonia/** y su propio YAML; Windows latest, Node 22 y PowerShell.
- Gate: sintaxis de módulos JS/MJS, tests Node, parser PowerShell, JSON, consistencia manifest/build-info, scripts de manifest, contratos /activity y scan de productores temporales runtime.

### 4.2. Resultado ejecutado
- 37 módulos JavaScript/MJS: sintaxis PASS.
- 19 archivos de prueba, **104/104 PASS**.
- 6 scripts PowerShell: parser PASS.
- 9 archivos JSON: parse PASS.
- Contratos del inicializador/parada 0.6.0 y migración del índice heredado: PASS.
- Manifest/build-info version alignment: PASS.
- Manifest content scripts: PASS.
- Scanner de productores temporales: PASS.
- Resultado final: HARMONIA_CI_RESULT=PASS, proceso PowerShell exit code 0.

Esta es CI local reproducible. GitHub Actions aún no se ha ejecutado/observado en un PR de la rama limpia.

### 4.3. Estado Git
- Último origin/main consultado antes de integración: 3abdecfa552547851621c98fcdda4e93147f1893.
- La rama local heredada work/harmonia-front-workspace-20261110 parte de 9fd5c18205e39b6db12c9152b07d8f880f6b256d y conserva cambios ajenos de ciclos previos; no se empuja.
- El plan es crear una worktree limpia sobre el último origin/main, incluir solo archivos pertinentes, reejecutar exactamente el mismo gate, crear PR y fusionar después de GitHub Actions PASS.
- Hasta ese momento no se declara commit, push, PR, merge ni main actualizado.

## 5. SemVer y backlog

- OMM-FUT-009: 0.6.0, implementada localmente; GitHub/aceptación pendiente.
- OMM-FUT-007: 0.7.0, P1 provisional; archivo Markdown maestro por conversación desde DOM visible.
- OMM-FUT-008: 0.8.0, P1 provisional; completar multi-pestaña, overlay, feedback y triage.
- OMM-FUT-010: P2 provisional sin versión; D-025/D-026 no localizadas.
- OMM-FUT-006: regla recurrente O0–O5; se ejecutó durante D-042.

## 6. Límites

- No se instaló ni recargó Chrome.
- No se realizó aceptación natural de estados ACTIVE/INACTIVE en ChatGPT real.
- BMO-01 permanece NO ALCANZADO.
- No se modificaron los JSONL históricos.
- No se integró aún a main.
- El DUG no se modificó; la discrepancia 1.31/1.30 permanece registrada.
- No se asignan folios globales mientras FOL1 siga PREPARADO / NO ACTIVO.

**Conclusión:** OMM-FUT-009 está ejecutada y verificada en el workspace local con CI reproducible PASS. La integración a main queda como el siguiente tramo, desde una worktree limpia y con CI GitHub verificada; no se debe confundir la implementación local con publicación o aceptación natural.
