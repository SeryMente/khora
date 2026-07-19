with open("kernel/src/khora_kernel/motor/_memoria.py", "r") as f:
    content = f.read()

import re
content = re.sub(
    r'def merge_entidad\(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: typing.List\[float\], matiz_de: str = None, needs_review: bool = False\) -> None:',
    r'def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: typing.List[float], matiz_de: typing.Optional[str] = None, needs_review: bool = False) -> None:',
    content
)

with open("kernel/src/khora_kernel/motor/_memoria.py", "w") as f:
    f.write(content)
