with open("kernel/tests/resolucion/test_resolucion.py", "r") as f:
    content = f.read()
import re
content = re.sub(
    r'if not lineas:\n        pytest.fail\("Falla forzada.*?"\)',
    'if not lineas:\n        raise AssertionError("No hay datos reales para golden set")',
    content
)
with open("kernel/tests/resolucion/test_resolucion.py", "w") as f:
    f.write(content)
