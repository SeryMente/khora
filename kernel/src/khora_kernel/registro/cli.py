# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import json
import sys
from pathlib import Path


def obtener_host():
    from khora_kernel.host import HostConfig, HostDeModulos
    from khora_kernel.ports.mocks.mock_memoria_organizada import MockMemoriaOrganizada

    config = HostConfig()

    # En un entorno de producción (CH-3), aquí se cargarían los drivers reales
    # (ej. el de Neo4j) desde la carpeta drivers/ si estuviesen disponibles.
    # Como fallback para que el CLI sea funcional en desarrollo, proveemos el mock.
    puertos = {
        "MemoriaOrganizada": MockMemoriaOrganizada()
    }

    host = HostDeModulos(
        config=config,
        registrar=lambda evento, contexto: None,
        puertos_disponibles=puertos
    )
    return host


def comando_registro(src_dir: Path):
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


def comando_exportar(destino: str):
    from khora_kernel.gravedad import exportar_grafo

    host = obtener_host()
    memoria = host.puertos_disponibles.get("MemoriaOrganizada")
    if not memoria:
        print("Error: Puerto MemoriaOrganizada no disponible en el Host.")
        sys.exit(1)

    print(f"Iniciando exportación hacia: {destino}")
    exportar_grafo(memoria, destino)
    print("Exportación completada exitosamente.")


def comando_importar(origen: str):
    from khora_kernel.gravedad import importar_grafo

    host = obtener_host()
    memoria = host.puertos_disponibles.get("MemoriaOrganizada")
    if not memoria:
        print("Error: Puerto MemoriaOrganizada no disponible en el Host.")
        sys.exit(1)

    print(f"Iniciando importación desde: {origen}")
    importar_grafo(memoria, origen)
    print("Importación completada exitosamente.")


def main():
    base_dir = Path(__file__).resolve().parent.parent.parent
    src_dir = base_dir / "khora_kernel"
    if not src_dir.exists():
        src_dir = Path(__file__).resolve().parent.parent

    # Parse arguments
    args = sys.argv[1:]

    # Support 'python -m khora_kernel.registro' backwards compatibility
    if not args or args[0] == "registro":
        comando_registro(src_dir)
        sys.exit(0)

    comando = args[0]

    if comando == "exportar":
        if len(args) < 2:
            print("Uso: khora exportar <destino>")
            sys.exit(1)
        comando_exportar(args[1])
    elif comando == "importar":
        if len(args) < 2:
            print("Uso: khora importar <origen>")
            sys.exit(1)
        comando_importar(args[1])

    elif comando == "audit":
        import subprocess
        kernel_dir = Path(__file__).resolve().parent.parent.parent.parent
        audit_script = kernel_dir / "tools" / "khora_audit.py"
        if not audit_script.exists():
            print(f"Error: No se encontró khora_audit.py en {audit_script}")
            sys.exit(1)
        result = subprocess.run([sys.executable, str(audit_script)] + args[1:])
        sys.exit(result.returncode)
    else:
        print("Uso: khora [registro|exportar|importar|audit]")
        sys.exit(1)

if __name__ == "__main__":
    main()
