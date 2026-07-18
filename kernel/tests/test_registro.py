import json
import re
from pathlib import Path


def test_trazabilidad_bidireccional_req():
    """
    Verifica que:
    1. Todo archivo en src/khora_kernel/registro/fichas/ tenga un correspondiente # @req: <id> en el código.
    2. Todo # @req: <id> en el código tenga una ficha en src/khora_kernel/registro/fichas/.
    """
    base_dir = Path(__file__).resolve().parent.parent
    src_dir = base_dir / "src" / "khora_kernel"
    fichas_dir = src_dir / "registro" / "fichas"

    # Obtener IDs de las fichas
    fichas_ids = set()
    for file_path in fichas_dir.glob("*.json"):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            fichas_ids.add(data["id"])

    # Buscar # @req: <id> en el código
    req_regex = re.compile(r"#\s*@req:\s*([a-zA-Z0-9_\-\.]+)")
    codigo_ids = set()

    for py_file in src_dir.rglob("*.py"):
        try:
            with open(py_file, "r", encoding="utf-8") as f:
                content = f.read()
                matches = req_regex.findall(content)
                for match in matches:
                    codigo_ids.add(match.strip())
        except Exception:
            pass

    fichas_huerfanas = fichas_ids - codigo_ids
    codigo_huerfano = codigo_ids - fichas_ids

    errores = []
    if fichas_huerfanas:
        errores.append(f"Fichas sin código vivo: {fichas_huerfanas}")
    if codigo_huerfano:
        errores.append(f"Código con @req sin ficha: {codigo_huerfano}")

    assert not errores, "\\n".join(errores)
