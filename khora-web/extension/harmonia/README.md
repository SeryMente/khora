# Aisthesis (Halcon) - sombrilla CoMind

Extension Chrome MV3 que actua como **sombrilla** de TODAS las integraciones de
CoMind. No es una sola integracion: es el shell modular donde se enchufan.

- `core/` - shell: service worker raiz (`shell.sw.js`) + `registry.js`.
- `modules/` - integraciones enchufables:
  - `globo/` - motor REAL (v3.32): Llamadas de Globo -> Notion. Activo.
  - `caza/`  - Cazagangas. Pendiente de fuente real (inactivo).
- `ui/` - Ajustes de la sombrilla (token Notion, IDs) + lista de modulos.
- `MODULE-CONTRACT.md` - como anadir una integracion nueva.

## Seguridad
Los secretos (NOTION_TOKEN, etc.) se configuran en **Ajustes** y viven en
`chrome.storage` del navegador. **Nada de tokens en el codigo.**

## Instalar (load unpacked)
chrome://extensions > Modo desarrollador > Cargar descomprimida > carpeta `aisthesis/`.
Luego abre Opciones y pega tu NOTION_TOKEN.

Version: 0.2.0
