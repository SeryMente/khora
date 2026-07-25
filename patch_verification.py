import re

with open('scripts/khora/khora-v6.5.4.ps1', 'r') as f:
    c = f.read()

# Let's verify we didn't accidentally delete anything in POST-LIMPIEZA while reordering
if 'Step "VERIFICACION POST-LIMPIEZA"' in c:
    print("VERIFICACION POST-LIMPIEZA is present.")
else:
    print("WARNING: VERIFICACION POST-LIMPIEZA not found!")

# Let's verify the reordering
print("Reordering check:")
match = re.search(r'L "STEP" "=== LIMPIEZA NUCLEAR \(motivo: \$reason\) ===(.*?)} finally {', c, re.DOTALL)
if match:
    cleanup = match.group(1)

    steps = [
        "Respaldo final al repo",
        "Borrando datos de trabajo",
        "Git config global",
        "Credential Manager",
        "Token",
        "Cerrando aplicaciones",
        "Deteniendo red de seguridad",
        "Historial PowerShell (todos los perfiles)",
        "VS Code - datos y cache",
        "Chrome - limpieza total (todos los perfiles)",
        "Temporales y caches",
        "Recientes de Windows",
        "Borrado seguro (sobrescritura de espacio libre)",
        "VERIFICACION POST-LIMPIEZA"
    ]

    for step in steps:
        if f'Step "{step}"' in cleanup:
            print(f"FOUND: {step}")
        else:
            print(f"MISSING: {step}")
