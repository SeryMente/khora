#!/usr/bin/env bash
# Instalador de un solo comando para el monorepo CoMind / Kosmos.
# Uso en un Codespace (tras subir/descomprimir el repo):
#   cd comind-suite && bash setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> CoMind / Kosmos :: setup"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
echo "    node: $(node -v 2>/dev/null || echo 'NO ENCONTRADO')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "    [!] Se requiere Node >=20 (el devcontainer ya lo trae)."
fi

# --- demiurgo (worker de nube) ---
echo "==> demiurgo: npm install"
( cd demiurgo && npm install --no-audit --no-fund )

echo "==> demiurgo: smoke check"
( cd demiurgo && npm run check )

if [ ! -f demiurgo/.env ]; then
  cp demiurgo/.env.example demiurgo/.env
  echo "==> creado demiurgo/.env (a partir de .env.example) -- EDITA tus secretos"
else
  echo "==> demiurgo/.env ya existe (no se toca)"
fi

# --- aisthesis (extension) : no requiere build ---
echo "==> aisthesis: extension estatica, no requiere build/install aqui."
echo "    Se carga local: chrome://extensions > Cargar descomprimida > carpeta aisthesis/"

cat <<'NEXT'

==================== LISTO ====================
Demiurgo (worker de nube):
  cd demiurgo
  # edita .env con NOTION_TOKEN, GLOBO_* (o usa Codespaces secrets)
  npm start          # always-on
  npm run once       # una sola ronda (GLOBO_RUN_ONCE=1)

Aisthesis (extension Chrome): se instala en TU Chrome local
  (ver CODESPACES.md)
===============================================
NEXT
