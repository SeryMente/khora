with open("kernel/src/khora_kernel/resolucion/_resolver.py", "r") as f:
    content = f.read()

import re
content = re.sub(
    r'triples_resueltos = \[\]',
    'triples_resueltos: list[Triple] = []',
    content
)

with open("kernel/src/khora_kernel/resolucion/_resolver.py", "w") as f:
    f.write(content)
