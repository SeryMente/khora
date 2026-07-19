with open("kernel/tests/resolucion/test_resolucion.py", "r") as f:
    content = f.read()
import re
content = re.sub(
    r'@pytest.mark.xfail\(reason="0 duplicados.*?"\)',
    '@pytest.mark.xfail(strict=True, reason="0 duplicados sobre data/golden/j8_pares.jsonl. NO-SIMULACIÓN: prohibido fabricar pares \'realistas\'. Causa exacta: 0 pares reales disponibles en el entorno.")',
    content
)
with open("kernel/tests/resolucion/test_resolucion.py", "w") as f:
    f.write(content)
