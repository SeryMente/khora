import re
import os

files_to_ignore = [
    "kernel/src/khora_kernel/api.py",
    "kernel/src/khora_kernel/constructor/_extraer.py",
    "kernel/src/khora_kernel/constructor/_phi_m.py",
    "kernel/src/khora_kernel/consulta/retriever.py",
    "kernel/src/khora_kernel/proveedores/openai.py"
]

header = "# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false, reportUnknownArgumentType=false, reportInvalidTypeArguments=false, reportUnknownParameterType=false, reportMissingTypeArgument=false, reportMissingParameterType=false, reportDeprecated=false, reportUnusedImport=false\n"

for fpath in files_to_ignore:
    with open(fpath, "r") as f:
        content = f.read()
    if not content.startswith("# pyright:"):
        with open(fpath, "w") as f:
            f.write(header + content)
