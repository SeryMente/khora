import re
with open('scripts/khora/khora-v6.5.4.ps1', 'r') as f:
    c = f.read()

# Make sure token check doesn't bypass when we do have it
old = r'''            if ($script:TokSecure) {
                try {
                    Export-VSCodeConfig
                    Do-AutoWip'''

new = r'''            # Intentar pushear si hay token O si gh CLI está configurado
            if ($script:TokSecure -or (Confirm-GhCliAuth -CheckOnly)) {
                try {
                    Export-VSCodeConfig
                    Do-AutoWip'''

c = c.replace(old, new)

old_2 = r'''            } else { Info "Sin token en memoria (limpieza externa): push omitido; la compuerta de borrado revisara si quedo trabajo sin respaldo." }
        }
        # Borrar workdir (repo + logwin + portables)'''

new_2 = r'''            } else { Info "Sin token ni gh auth (limpieza externa): push omitido; la compuerta de borrado revisara si quedo trabajo sin respaldo." }
        }
        # Borrar workdir (repo + logwin + portables)'''

c = c.replace(old_2, new_2)

with open('scripts/khora/khora-v6.5.4.ps1', 'w') as f:
    f.write(c)
