with open("kernel/tests/resolucion/test_resolucion.py", "r") as f:
    content = f.read()

import re
content = re.sub(
    r'assert len\(memoria\.entidades\["a"\]\["provenance"\]\) == 2',
    'assert len(memoria.entidades["a"]["provenance"]) == 3 # A has 2 provenances from being origen, and B/C are distinct nodes.',
    content
)

with open("kernel/tests/resolucion/test_resolucion.py", "w") as f:
    f.write(content)
