with open("kernel/tests/resolucion/test_resolucion.py", "r") as f:
    content = f.read()

new_methods = r"""
    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        self.llamadas.append(solicitud)
        if self.veredicto_forzado:
            return RespuestaLLM(texto=self.veredicto_forzado, modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=""))

        prompt = solicitud.prompt
        prompt_lower = prompt.lower()
        texto = "NEW"

        if "candidato existente: sarah_connor" in prompt_lower and "nueva entidad: sarah" in prompt_lower:
            texto = "MERGE"
        elif "candidato existente: target" in prompt_lower and "nueva entidad: target" in prompt_lower:
            texto = "MERGE"
        elif "candidato existente: john" in prompt_lower and "nueva entidad: john" in prompt_lower:
            texto = "MERGE"
        elif "candidato existente: terminator" in prompt_lower and "nueva entidad: terminator" in prompt_lower:
            texto = "MERGE"
        elif "matiz" in prompt_lower:
            texto = "MATIZ"
        elif "opuesta" in prompt_lower or "niega" in prompt_lower or "odio" in prompt_lower:
            texto = "NEW"
        elif "candidato existente: " in prompt_lower:
            texto = "MERGE"

        return RespuestaLLM(texto=texto, modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=""))

"""

import re
content = re.sub(
    r'    def generar\(self, solicitud: SolicitudLLM\) -> RespuestaLLM:.*?(?=def _prov\(\):)',
    new_methods,
    content,
    flags=re.DOTALL
)

with open("kernel/tests/resolucion/test_resolucion.py", "w") as f:
    f.write(content)
