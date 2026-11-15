# Harmonia · ciclo OMM-01-039 · candidata local 0.4.9

**Objetivo del sprint — OMM-01 / BMO-01:** alcanzar observación natural de ChatGPT Web Free, medición T1/T2, análisis por evidencia y mejora guiada con pruebas.

**Objetivo del ciclo:** mantener la continuidad de telemetría ante la navegación SPA de ChatGPT y la sustitución de la región principal, sin capturar URL ni estado de historial.

**Tarea seleccionada:** OMM-01-039 · P0 · continuidad de navegación SPA.

## Avance ejecutado

- Nueva Extension/history-bridge.js envuelve history.pushState y history.replaceState preservando contexto, argumentos y retorno; emite únicamente harmonia:history-change sin URL, estado, argumentos ni texto.
- content.js escucha esa señal y popstate/hashchange. Compara pathname solo en memoria; al cambiar, reinicia cycleObserver, renueva la identidad local UUIDv7 y fuerza un barrido.
- Los observadores permanecen anclados al documento estable, de modo que la sustitución de main no deja un target obsoleto.
- manifest.json, content.js, service-worker.js, build-info.json, popup.html, README y el inicializador quedan alineados en versión 0.4.9. El inicializador sigue comprobando el colector 0.4.8.1.
- MANIFEST-PROCEDENCIA-LOCAL.json actualizado a LOCAL-OMM-01-039-SPA-NAVIGATION-CONTINUITY; 29 archivos y ocho artefactos de prueba con SHA-256 y tamaños cotejados.
- La nota operativa de CYCLE-TELEMETRY.md quedó alineada con extensión 0.4.9 / colector 0.4.8.1.

## Verificación

- Suite Extension/Collector: siete archivos, 38/38 PASS.
- Las tres pruebas nuevas del puente pasan: pushState/replaceState, señal sin payload y prevención de doble instalación.
- node --check: content.js, history-bridge.js y service-worker.js PASS.
- manifest.json, build-info.json y MANIFEST-PROCEDENCIA-LOCAL.json: JSON válido.
- Parser Windows PowerShell 5.1: INICIAR-HARMONIA.ps1 y Collector/query.ps1 PASS.
- Consulta sintética query.ps1 -Cycles: estado MEASURED, métrica chatgpt-ui-generation.v1, duration_ms=600.
- El fixture oficial query-cycles.test.ps1 no existe en el workspace; no se declara ejecutado. GitHub Actions no se ejecutó ni se declara aprobado.

## Estado general

**BMO-01: NO ALCANZADO.** No hay aceptación natural T1/T2 ni cinco ciclos naturales correlacionados y persistidos. El puente se probó en VM Node, no en una pestaña real de ChatGPT.

La candidata 0.4.9 no se recargó ni se declaró activa en Chrome. No se abrió, enfocó, navegó, inspeccionó o modificó el Chrome principal.

## Continuidad y procedencia

- Workspace: C:Usersila4DesktopSeryMenteKHORA.
- Rama local: work/harmonia-front-workspace-20261110.
- HEAD local: 9fd5c18205e39b6db12c9152b07d8f880f6b256d.
- Conversación local UUIDv7: 01a1d0fd-681e-7243-a8ed-ca8e3dff2e71.
- Ciclo local UUIDv7: 01a1d1dc-f671-7823-93d8-7caca36e0b07.
- A: docs/frentes/harmonia/originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261112-D037.md; SHA-256 347BCF455E90C35D304D5B2A96E12CCB2163621B7BB67D5AA3513CD72F113301.
- OCP local v0.79, SHA-256 3359761D891386533D7391650B7423D20CFB61C8E1EAF201AAF32692CE05C61B. OCP v0.78 previo preservado byte a byte, SHA-256 999D4ABC9FD2AB1733543EC953CC91071F7F49174087D60F753BB420ACF5EAF4.
- No se modificó main; no commit, push, PR, merge ni despliegue. Se conservaron los cambios previos del worktree.

## Siguiente paso

Validar la inyección del puente y la navegación SPA en Chromium headless con perfil temporal, sin usar el Chrome principal. La aceptación natural T1/T2 sobre la sesión del operador permanece pendiente.

IPZ: v0.7 · antigüedad NO VERIFICADA.
DUG: Samantha v392 / NX-392m · Metacanon 1.30 · GOW embebido con discrepancia 2.21/2.22 · antigüedad NO VERIFICADA.
FOL1: PREPARADA / NO ACTIVA; CV/CY/A/B globales no asignados.
MCP normativo: DESACTIVADO.