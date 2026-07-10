# Modulo `caza` — Cazagangas (port fiel + fusion)

Port fiel de **Cazagangas MV3 v0.9.41** (27 archivos) dentro de la sombrilla **Aisthesis**.
El codigo se copio caracter por caracter; los unicos cambios son los "imprescindibles para convivir":

## Cambios de fusion (minimos)
1. **Token de Notion externalizado.** En el original estaba hardcodeado en `notion.js`,
   `notion-update.js` y `notion-espejo.js`. Aqui se lee de `chrome.storage.local.NOTION_TOKEN`
   (el secreto unico de la sombrilla; fallback `cazagangas.token`). **No se reproduce en el repo.**
2. **Service worker unico.** `background.js` se envolvio en IIFE y lo carga `core/shell.sw.js`
   por `importScripts`. No captura `chrome.action.onClicked` (el icono lo arbitra la sombrilla:
   abre el panel unico). El cerebro se abre desde el panel o por mensaje `{tipo:"caza:abrir-cerebro"}`.
3. **Rutas.** `abrirCerebro()` apunta a `modules/caza/runtime.html`. El resto de scripts y
   `theme.css` se cargan relativos a `runtime.html` (siguen siendo hermanos), sin cambios.
4. **Integridad compartida.** El `integrity.json` por-modulo se elimino; ahora hay un
   `integrity.json` UNICO en la raiz del paquete (regenerado), que `integridad.js` verifica
   con SHA-256 y muestra en su chip.

## Orden de carga (literal, en runtime.html)
purga → autorecarga → telemetria → scoring → celular → aprendizaje → runtime → notion →
opciones → enriquecer → notion-update → descubrir → sonda → notion-espejo → cosecha-auto →
integridad → shell.

## Storage namespaced
`cazagangas.*` (config, hallazgos, synced, enriquecidos, descubrimiento, observatorio,
pipeline, runControl, telemetry, aprendizaje.*, espejo, purga.v1, ui). No colisiona con `globo.*`.

## Companions (fuera del runtime de Chrome)
`cazagangas-overlay.ahk` y `cazagangas-modo-comida.ps1` se conservan como utilidades de escritorio.
