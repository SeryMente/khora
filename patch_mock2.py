with open("kernel/tests/resolucion/test_resolucion.py", "r") as f:
    content = f.read()

# Fix mock judge for Target mapping to itself and no-dup
import re
content = re.sub(
    r'elif "sarah connor" in prompt_lower and "sarah" in prompt_lower:\n                texto = "MERGE"',
    '''elif "sarah connor" in prompt_lower and "sarah" in prompt_lower:
                texto = "MERGE"
            elif candidato == nueva_entidad:
                texto = "MERGE"''',
    content
)

new_methods = """
    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        self.llamadas.append(solicitud)
        if self.veredicto_forzado:
            texto = self.veredicto_forzado
        else:
            prompt_lower = solicitud.prompt.lower()
            if "opuesta" in prompt_lower or "niega" in prompt_lower or "odio" in prompt_lower:
                texto = "NEW"
            elif "matiz" in prompt_lower:
                texto = "MATIZ"
            elif "candidato existente: sarah_connor" in prompt_lower and "nueva entidad: sarah" in prompt_lower:
                texto = "MERGE"
            else:
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
