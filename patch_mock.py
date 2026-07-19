with open("kernel/tests/resolucion/test_resolucion.py", "r") as f:
    content = f.read()

import re
content = re.sub(
    r'if canonical_key in self.entidades:.*?\n\s+else:',
    '''if canonical_key in self.entidades:
            if provenance_raw not in self.entidades[canonical_key]["provenance"]:
                self.entidades[canonical_key]["provenance"].append(provenance_raw)
        else:''',
    content,
    flags=re.DOTALL
)

with open("kernel/tests/resolucion/test_resolucion.py", "w") as f:
    f.write(content)
