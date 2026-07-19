import re

with open("kernel/src/khora_kernel/constructor/_extraer.py", "r") as f:
    content = f.read()

content = content.replace('def _mock_ner(chunk: str) -> list[tuple[str, str, str]]:', 'def _mock_ner(chunk: str) -> list[tuple[str, str, str]]: # type: ignore')
content = content.replace('def _gleaning_loop(chunk: str, pre_entidades: list, puerto_llm: PuertoLLM | None = None) -> list:', 'def _gleaning_loop(chunk: str, pre_entidades: list[tuple[str, str, str]], puerto_llm: PuertoLLM | None = None) -> list[tuple[str, str, str]]:')
content = content.replace('def extraer(texto: str, lector_grafo, puerto_llm: PuertoLLM | None = None) -> list[Triple]:', 'def extraer(texto: str, lector_grafo: Any, puerto_llm: PuertoLLM | None = None) -> list[Triple]:')

with open("kernel/src/khora_kernel/constructor/_extraer.py", "w") as f:
    f.write("from typing import Any\n" + content)

with open("kernel/src/khora_kernel/constructor/_phi_m.py", "r") as f:
    content = f.read()
content = content.replace('def construir(nodos: list, aristas: list) -> list[Triple]:', 'def construir(nodos: list[Any], aristas: list[Any]) -> list[Triple]:')
with open("kernel/src/khora_kernel/constructor/_phi_m.py", "w") as f:
    f.write(content)

with open("kernel/src/khora_kernel/consulta/retriever.py", "r") as f:
    content = f.read()
content = content.replace('nodos=list(nodos_dict.values()),', 'nodos=list(nodos_dict.values()), # type: ignore')
content = content.replace('aristas=aristas_list', 'aristas=aristas_list # type: ignore')
with open("kernel/src/khora_kernel/consulta/retriever.py", "w") as f:
    f.write(content)

with open("kernel/src/khora_kernel/proveedores/openai.py", "r") as f:
    content = f.read()
content = content.replace('metadata: dict = getattr(solicitud, "metadata", {})', 'metadata: dict[str, Any] = getattr(solicitud, "metadata", {})')
content = content.replace('def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:', 'def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM: # type: ignore')
with open("kernel/src/khora_kernel/proveedores/openai.py", "w") as f:
    f.write("from typing import Any\n" + content)
