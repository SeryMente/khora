#!/usr/bin/env bash
set -euo pipefail

# Generador determinista del manifiesto de integridad ep-integrity-manifest.sha256
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_PATH="${ROOT_DIR}/ep-integrity-manifest.sha256"
TMP_PATH="${MANIFEST_PATH}.tmp"

if [ ! -f "${MANIFEST_PATH}" ]; then
  echo "Error: No se encontró el manifiesto base ${MANIFEST_PATH}" >&2
  exit 1
fi

cd "${ROOT_DIR}"

# Extrae la lista de rutas del manifiesto existente, las ordena de forma estable y recalcula el sha256
awk '{print $2}' "${MANIFEST_PATH}" | sort -u | xargs sha256sum > "${TMP_PATH}"

mv "${TMP_PATH}" "${MANIFEST_PATH}"
echo "Manifiesto de integridad actualizado exitosamente."
