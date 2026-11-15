# Harmonia · OMM-01/BMO-01 · OMM-01-039 · 2026-11-12

**Objetivo del sprint:** alcanzar BMO-01: observación natural de ChatGPT Web Free → medición T1/T2 → análisis basado en evidencia → mejora guiada → pruebas → continuidad documental.

**Objetivo del ciclo:** cerrar continuidad SPA en la instrumentación conversacional, cubriendo pushState/replaceState y evitando que las observaciones queden huérfanas ante la sustitución de main.

**Tarea seleccionada:** OMM-01-039 · P0 · continuidad de navegación SPA.

## Contexto, autorización y entorno

- Instrucción literal D-037 conservada en originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261112-D037.md; SHA-256 347BCF455E90C35D304D5B2A96E12CCB2163621B7BB67D5AA3513CD72F113301.
- La conexión RDC disponible se utilizó como puente elevado CENTRALMantenimientoRCI. El proceso RDC tenía perfil C:UsersMantenimientoRCI y trabajó sobre el directorio verificado C:Usersila4DesktopSeryMenteKHORA. La identidad de proceso no se confundió con la identidad del perfil destino.
- Dispositivo/conexión observado: PC10RCIF4EI4 / 952ad493-0a54-48a8-b0a2-de7aba24b0e4; solo dato de procedencia de esta sesión.
- Repositorio Git: SeryMente/khora; rama work/harmonia-front-workspace-20261110; HEAD base local 9fd5c18205e39b6db12c9152b07d8f880f6b256d. Worktree ya tenía modificaciones y archivos no versionados de ciclos anteriores; se conservaron sin limpieza ni reset.

## Implementación local

- Candidata Harmonia MV3 0.4.9; build LOCAL-OMM-01-039-SPA-NAVIGATION-CONTINUITY.
- Nuevo Extension/history-bridge.js para envolver history.pushState y history.replaceState sin alterar argumentos/retorno/this y emitir solo harmonia:history-change, sin URL ni history.state.
- content.js escucha la señal y popstate/hashchange. El pathname se compara solo en memoria; al cambiar se reinicia el observador de ciclos, se renueva UUIDv7 local y se fuerza un barrido.
- Observadores estructurales y de ciclos permanecen anclados al documento estable para tolerar la sustitución de main.
- manifest.json, build-info.json, popup.html y README alineados en 0.4.9.
- La tarea se registró como OMM-01-039; no se reutilizó OMM-01-032, que corresponde al ejecutor Codex CLI.

## Verificación ejecutada

- Suite Extension/Collector: siete archivos JavaScript/MJS, 38/38 PASS.
- Tres pruebas nuevas del puente History: señal genérica tras pushState/replaceState, no exposición de URL/estado y protección contra doble instalación.
- node --check: content.js PASS; history-bridge.js PASS; service-worker.js PASS.
- manifest.json, build-info.json y MANIFEST-PROCEDENCIA-LOCAL.json parsean como JSON. Se recalcularon 29 archivos y ocho artefactos de prueba; SHA-256 y tamaños coinciden en todos.
- INICIAR-HARMONIA.ps1 y Collector/query.ps1: parser Windows PowerShell 5.1 PASS. El inicializador acepta Extension 0.4.9 y mantiene la comprobación de Collector 0.4.8.1.
- Consulta sintética local de query.ps1 -Cycles: estado MEASURED, métrica chatgpt-ui-generation.v1 y duración 600 ms.
- El fixture oficial query-cycles.test.ps1 no existe en el workspace y no fue ejecutado.
- CYCLE-TELEMETRY.md actualiza su encabezado operativo a extensión 0.4.9 / colector 0.4.8.1. No se ejecutó GitHub Actions; no hay declaración CI PASS.

## Resultado, límites y estado del sprint

**Resultado:** candidata local 0.4.9 preparada; código y pruebas de contrato SPA implementados y verificados sintéticamente.

**No demostrado:** inyección del recurso en pestaña real de ChatGPT, navegación SPA natural, reemplazo natural de main, T1/T2 natural y persistencia natural. La candidata no se recargó ni se declaró activa en Chrome. No se abrió ni modificó el Chrome principal.

**BMO-01: NO ALCANZADO.** Continúan pendientes la aceptación natural de T1/T2 y cinco ciclos naturales correlacionados/persistidos.

No se modificó main; no commit, push, PR, merge ni despliegue. Todo permanece en el worktree local no comprometido.

## Trazabilidad A/B y referencias

- Conversación local UUIDv7: 01a1d0fd-681e-7243-a8ed-ca8e3dff2e71.
- Ciclo local UUIDv7: 01a1d1dc-f671-7823-93d8-7caca36e0b07.
- A: docs\frentes\harmonia\originales\HARMONIA-INSTRUCCIONES-VERBATIM-20261112-D037.md
- SHA-256 A: 347BCF455E90C35D304D5B2A96E12CCB2163621B7BB67D5AA3513CD72F113301; bytes: 487.
- B: docs\frentes\harmonia\originales\HARMONIA-CICLO-20261112-OMM-01-039-B.md
- SHA-256 B: 3E7C7DBCE4511CC0DF7785FAF7468C2622869DD83A2A3B5BD9AA24392AF4FF6E; bytes: 3803.
- OCP local: v0.79 / HARMONIA-v0.79; SHA-256: 26774C8CFFA9A38A019DC07F5D298B2EED7BCF23D906FC22C18ADEC8FD32D198.
- Archivo OCP v0.78 previo: archive/OBJETO-CANONICO-v0.78-pre-spa-navigation-20261112.md; SHA-256 999D4ABC9FD2AB1733543EC953CC91071F7F49174087D60F753BB420ACF5EAF4, cotejado byte a byte.
- DUG: Samantha v392 / NX-392m; Metacanon 1.30; GOW embebido con discrepancia registrada; MCP-NORMATIVO DESACTIVADO.
- FOL1 PREPARADA / NO ACTIVA; folios globales CV/CY/A/B no asignados.

## Siguiente acción

Ejecutar integración aislada de Chromium headless con perfil temporal para verificar carga del recurso MAIN world y señal de navegación SPA, sin usar el Chrome principal. La aceptación natural sobre ChatGPT permanece separada y corresponde al operador.