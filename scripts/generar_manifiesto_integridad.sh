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

# Conserva el alcance explícito del manifiesto, elimina rutas inexistentes y recalcula cada SHA-256 de forma determinista
mapfile -t MANIFEST_FILES < <(awk '{print $2}' "${MANIFEST_PATH}" | sort -u)

: > "${TMP_PATH}"
missing=0

for path in "${MANIFEST_FILES[@]}"; do
  if [ -f "${path}" ]; then
    sha256sum "${path}" >> "${TMP_PATH}"
  else
    echo "Advertencia: se omite ruta inexistente del manifiesto: ${path}" >&2
    missing=$((missing + 1))
  fi
done

if [ "${missing}" -gt 0 ]; then
  echo "Se eliminaron ${missing} rutas obsoletas del manifiesto."
fi

mv "${TMP_PATH}" "${MANIFEST_PATH}"
echo "Manifiesto de integridad actualizado exitosamente."
