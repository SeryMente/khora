import re

with open("kernel/src/khora_kernel/poblacion/_ingestar.py", "r") as f:
    content = f.read()

content = content.replace("def buscar_entidades_candidatas(self, label_norm: str) -> List[dict]:", "def buscar_entidades_candidatas(self, label_norm: str) -> List[Any]:")

with open("kernel/src/khora_kernel/poblacion/_ingestar.py", "w") as f:
    f.write(content)
