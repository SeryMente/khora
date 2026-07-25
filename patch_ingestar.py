import re

with open("kernel/src/khora_kernel/poblacion/_ingestar.py", "r") as f:
    content = f.read()

# Replace escribir_ingesta with fusionar_ingesta if available
new_write = """    # 4. Escribir vía memoria SOLO con MERGE o FUSIÓN
    if hasattr(memoria, 'fusionar_ingesta'):
        triples_escritos = memoria.fusionar_ingesta(triples_resueltos, objeto.provenance)
    else:
        triples_escritos = memoria.escribir_ingesta(triples_resueltos, objeto.provenance)"""

content = re.sub(
    r"# 4\. Escribir vía memoria SOLO con MERGE\s+triples_escritos = memoria\.escribir_ingesta\(triples_resueltos, objeto\.provenance\)",
    new_write,
    content
)

with open("kernel/src/khora_kernel/poblacion/_ingestar.py", "w") as f:
    f.write(content)
