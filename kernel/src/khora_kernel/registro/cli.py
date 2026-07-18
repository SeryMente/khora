import json
import sys
from pathlib import Path


def main():
    # If run as `python -m khora_kernel.registro`, sys.argv is ['<path>/__main__.py']
    # If run via entrypoint, sys.argv is ['khora', 'registro']

    if len(sys.argv) > 1 and sys.argv[0].endswith("khora") and sys.argv[1] != "registro":
        print("Uso: khora registro")
        sys.exit(1)

    base_dir = Path(__file__).resolve().parent.parent.parent
    src_dir = base_dir / "khora_kernel"
    # To support running directly or when installed
    if not src_dir.exists():
        src_dir = Path(__file__).resolve().parent.parent

    fichas_dir = src_dir / "registro" / "fichas"

    if not fichas_dir.exists():
        print(f"Directorio de fichas no encontrado en: {fichas_dir}")
        sys.exit(1)

    from typing import Any, Dict, List
    fichas: List[Dict[str, Any]] = []
    for file_path in fichas_dir.glob("*.json"):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                # type ignore is needed since json.load returns Any
                fichas.append(data) # type: ignore

    # Sort for consistent output
    fichas.sort(key=lambda x: str(x.get("id", "")))

    print("=======================================")
    print("REGISTRO JERÁRQUICO DE COMPONENTES")
    print("=======================================")
    for ficha in fichas:
        print(f"ID: {ficha.get('id')}")
        print(f"  Descripción : {ficha.get('descripcion')}")
        print(f"  Versión     : {ficha.get('version')} | Estado: {ficha.get('estado_ciclo')}")
        print(f"  Costo Reemplazo: Talla {ficha.get('costo_reemplazo_talla')} - {ficha.get('costo_reemplazo_nota')}")
        if ficha.get('estado_ciclo') == "Provisional" or ficha.get('reemplazo_nombrado'):
            print(f"  Reemplazo Nombrado: {ficha.get('reemplazo_nombrado')}")
        print(f"  Fecha       : {ficha.get('fecha_inscripcion')}")
        puerto = ficha.get('puerto_satisfecho')
        if puerto:
            print(f"  Puerto      : {puerto}")
        print("---------------------------------------")

if __name__ == "__main__":
    main()
