import re

with open('scripts/khora/khora-v6.5.4.ps1', 'r') as f:
    content = f.read()

p_respaldo = re.search(r'        # Push final del log \+ WIP si hay token disponible\n(.*?)        } else { Info "Sin token en memoria.*?}\n        }', content, re.DOTALL).group(0) + '\n'
p_apps = re.search(r'        # Cerrar apps\n(.*?)Ok "Chrome cerrado."\n', content, re.DOTALL).group(0)
p_guardian = re.search(r'        # Deadline \+ Guardian off\n(.*?)Remove-Item \$gp -Force -ErrorAction SilentlyContinue }\n', content, re.DOTALL).group(0)
p_datos = re.search(r'        # Borrar workdir \(repo \+ logwin \+ portables\)\n(.*?)        if \(-not \(Test-Path \$REPO_DIR\)\) { Ok "Repo local eliminado.*?}\n        }\n', content, re.DOTALL).group(0)
p_git = re.search(r'        # Git config global\n(.*?)Ok "Git config limpiado.*?.\n', content, re.DOTALL).group(0)
p_cred = re.search(r'        # Credential Manager\n(.*?)Ok "\$found credencial\(es\) eliminada.*?.\n', content, re.DOTALL).group(0)
p_hist = re.search(r'        # Historial PowerShell de TODOS los perfiles \(agnostico\)\n(.*?)try { \[Microsoft.PowerShell.PSConsoleReadLine\]::ClearHistory\(\) } catch {}\n', content, re.DOTALL).group(0)
p_vscode = re.search(r'        # VS Code datos \(usuario actual\)\n(.*?)\n        }\n', content, re.DOTALL).group(0) + '\n'
p_chrome = re.search(r'        # Chrome - TODOS los perfiles del usuario actual\n(.*?)else { Info "Sin datos de Chrome." }\n', content, re.DOTALL).group(0)
p_temp = re.search(r'        # Temporales \+ caches dev\n(.*?)Ok "Temporales borrados."\n', content, re.DOTALL).group(0)
p_win = re.search(r'        # Recientes de Windows \+ RunMRU\n(.*?)try { Remove-ItemProperty "HKCU.*?RunMRU limpiado." } catch {}\n', content, re.DOTALL).group(0)
p_secure = re.search(r'        # Borrado seguro del espacio libre del workdir\n(.*?)} else { Info "cipher no disponible; omitido." }\n', content, re.DOTALL).group(0)
p_token = re.search(r'        # Revocacion de token \(best-effort\)\n(.*?)Ok "Token eliminado de la memoria de este proceso."\n', content, re.DOTALL).group(0)

new_middle = (
    p_respaldo +
    p_datos +
    p_git +
    p_cred +
    p_token +
    p_apps +
    p_guardian +
    p_hist +
    p_vscode +
    p_chrome +
    p_temp +
    p_win +
    p_secure
)

match = re.search(r'        # Push final del log \+ WIP si hay token disponible\n(.*?)Ok "Token eliminado de la memoria de este proceso."\n', content, re.DOTALL)
if match:
    old_middle = match.group(0)
    content = content.replace(old_middle, new_middle)
    with open('scripts/khora/khora-v6.5.4.ps1', 'w') as f:
        f.write(content)
    print("Reorder successful")
else:
    print("Reorder failed, couldn't match")
