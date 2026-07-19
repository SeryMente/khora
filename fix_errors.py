import re

with open("kernel/src/khora_kernel/api.py", "r") as f:
    content = f.read()

content = re.sub(r'nodos: List\[NodoSubgrafo\] = field\(default_factory=list\)', r'nodos: List[NodoSubgrafo] = field(default_factory=list) # type: ignore', content)
content = re.sub(r'aristas: List\[AristaSubgrafo\] = field\(default_factory=list\)', r'aristas: List[AristaSubgrafo] = field(default_factory=list) # type: ignore', content)
content = re.sub(r'metadata: dict', r'metadata: dict[str, Any]', content)

with open("kernel/src/khora_kernel/api.py", "w") as f:
    f.write("from typing import Any\n" + content)
