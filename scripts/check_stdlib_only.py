import ast
import sys
import argparse
from pathlib import Path

def is_stdlib_or_internal(module_name: str, allowed_internal: str) -> bool:
    if not module_name:
        return True

    base_module = module_name.split('.')[0]

    if base_module == allowed_internal:
        return True

    if base_module in sys.stdlib_module_names:
        return True

    return False

def check_file(filepath: Path, allowed_internal: str) -> list[str]:
    violations = []
    try:
        content = filepath.read_text(encoding='utf-8')
        tree = ast.parse(content, filename=str(filepath))

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if not is_stdlib_or_internal(alias.name, allowed_internal):
                        violations.append(f"{filepath}:{node.lineno} - Import ilegal: '{alias.name}'")
            elif isinstance(node, ast.ImportFrom):
                # node.level > 0 indica que es un import relativo, ej: from . import X
                # Los imports relativos en el kernel los tratamos como válidos por estar dentro de khora_kernel
                if node.level == 0 and node.module and not is_stdlib_or_internal(node.module, allowed_internal):
                    violations.append(f"{filepath}:{node.lineno} - Import ilegal: 'from {node.module} import ...'")

    except Exception as e:
        violations.append(f"{filepath}: Error parsing file - {e}")

    return violations

def main():
    parser = argparse.ArgumentParser(description="Asegura que los imports pertenezcan solo a la stdlib o al paquete interno permitido.")
    parser.add_argument("directories", nargs="+", type=Path, help="Directorios a escanear")
    parser.add_argument("--internal-pkg", default="khora_kernel", help="Nombre del paquete interno permitido")
    args = parser.parse_args()

    all_violations = []

    for directory in args.directories:
        if not directory.exists():
            print(f"Warning: Directorio {directory} no existe. Ignorando.")
            continue

        for py_file in directory.rglob("*.py"):
            violations = check_file(py_file, args.internal_pkg)
            all_violations.extend(violations)

    if all_violations:
        print("❌ G6: Se detectaron imports fuera de la stdlib o del kernel:\n")
        for v in all_violations:
            print(f"  {v}")
        sys.exit(1)
    else:
        print("✅ G6: Todos los imports en las rutas inspeccionadas son válidos.")
        sys.exit(0)

if __name__ == "__main__":
    main()
