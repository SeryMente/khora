# Contrato de modulos - sombrilla Aisthesis

Aisthesis es un **shell**: no implementa integraciones, las **hospeda**. Cada
integracion de CoMind es un modulo enchufable bajo `modules/<id>/`.

## Para anadir un modulo
1. Crea `modules/<id>/module.json` con: `id, name, version, enabled, background,
   content[], hostPermissions[], settings[], panel`.
2. (Opcional) `modules/<id>/background.js`: **script clasico** que registra sus
   propios listeners de chrome. El shell lo carga via importScripts si `enabled`.
3. (Opcional) content scripts y un `panel.html` de ajustes.
4. Refleja el modulo en `core/registry.js` (lo lee el service worker) y agrega
   sus `content_scripts` + `host_permissions` en `manifest.json`.

## Reglas (Chrome Dev / CoMind)
- **Secretos NUNCA hardcodeados.** Leelos de `chrome.storage.local` (o de
  `self.AISTHESIS_CFG`, que el shell cachea). El usuario los pone en Ajustes.
- **NO-SIMULACION:** sin selectores/clics inventados; API primero.
- **Telemetria -> Logos** con el contrato del modulo (`<id>.telemetry`).
- Un modulo deshabilitado (`enabled:false`) no se carga ni pide permisos.
