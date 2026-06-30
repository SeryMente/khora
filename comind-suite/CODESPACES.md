# Trabajar en un mismo Codespace (CoMind / Kosmos)

Un Codespace es **por repositorio**. Como `aisthesis/` y `demiurgo/` viven en
el mismo monorepo (`SeryMente/comind`), **un solo Codespace cubre las dos
piezas**. El `.devcontainer/` ya deja Node 20 + `npm install` de demiurgo listo.

## demiurgo/ (worker de nube) -> ideal en Codespace
- `cd demiurgo && npm run check` / `npm start` (o `GLOBO_RUN_ONCE=1`).
- Define los secretos como **Codespaces secrets** (Settings > Secrets and
  variables > Codespaces): `NOTION_TOKEN`, `GLOBO_COOKIE`/`GLOBO_USER`/`GLOBO_PASS`,
  `GLOBO_CALLS_DB_ID`, etc. NO los pongas en `.env` versionado.
- El Codespace tiene red, asi que el worker corre de verdad ahi.

## aisthesis/ (extension Chrome) -> se EDITA en Codespace, se INSTALA local
- Una extension Chrome se carga en TU Chrome local (`chrome://extensions` >
  Cargar descomprimida). No se puede "instalar" dentro del navegador del
  Codespace en la nube.
- Flujo: editas en el Codespace -> `git pull` en tu maquina (o VS Code Desktop
  conectado al Codespace) -> apuntas "Cargar descomprimida" a la carpeta
  `aisthesis/` local.
- El **native messaging** (host AHK en `native/`) tambien exige tu SO local;
  no funciona dentro del Codespace.

## Resumen
| Pieza | Editar en Codespace | Ejecutar/instalar |
|---|---|---|
| demiurgo | si | si (en el Codespace) |
| aisthesis | si | local (Chrome + AHK de tu maquina) |
