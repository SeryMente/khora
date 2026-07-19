with open("kernel/tests/resolucion/test_resolucion.py", "r") as f:
    content = f.read()

import re
content = re.sub(
    r'if not lineas or lineas == \["\n',
    r'if not lineas or lineas == ["\\n"]:\n',
    content
)

with open("kernel/tests/resolucion/test_resolucion.py", "w") as f:
    f.write(content)
