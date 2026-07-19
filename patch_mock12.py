with open("kernel/tests/resolucion/test_resolucion.py", "r") as f:
    content = f.read()

import re
# Fix the broken file completely by replacing test_golden
content = re.sub(
    r'@pytest\.mark\.xfail.*?def test_golden\(\):.*',
    '''@pytest.mark.xfail(strict=True, reason="0 duplicados sobre data/golden/j8_pares.jsonl. NO-SIMULACIÓN: prohibido fabricar pares 'realistas'. Causa exacta: 0 pares reales disponibles en el entorno.")
def test_golden():
    import json
    with open("data/golden/j8_pares.jsonl", "r") as f:
        lineas = f.readlines()
    if not lineas or lineas == ["\\n"] or lineas == [""]:
        raise AssertionError("No hay datos reales para golden set")''',
    content,
    flags=re.DOTALL
)

with open("kernel/tests/resolucion/test_resolucion.py", "w") as f:
    f.write(content)
