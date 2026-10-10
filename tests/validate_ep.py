from __future__ import annotations
from pathlib import Path
import base64,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def require(condition,message):
    if not condition: errors.append(message)
def read(rel,encoding='utf-8'):
    return (ROOT/rel).read_text(encoding=encoding)
# Canonical artifacts
require((ROOT/'ep-medio-architectura.md').is_file(),'Falta ep-medio-architectura.md')
require((ROOT/'scripts/khora/khora.ps1').is_file(),'Falta gate único')
arch=read('ep-medio-architectura.md')
gate=read('scripts/khora/khora.ps1','utf-8-sig')
code='\n'.join(p.read_text(encoding='utf-8-sig') for p in (ROOT/'scripts/khora').rglob('*.ps1') if 'tests' not in p.parts)
require("EP_VERSION = '1.0.3'" in gate,'Versión EP incorrecta')
require("SCRIPT_VERSION = '7.5.5'" in gate,'Versión host incorrecta')
require('Enable-BitLocker' in gate,'Falta BitLocker')
require('Rfc2898DeriveBytes' in gate and 'HashAlgorithmName]::SHA256' in gate and '200000' in gate,'La derivación de contraseña de BitLocker no usa PBKDF2-HMAC-SHA256/200000')
require("ComputeHash($bytes)" not in gate,'La contraseña de BitLocker no debe derivarse con SHA-256 directo')
require('WindowsPowerShell\\\\v1.0\\\\powershell.exe' in read('khora-web/app/api/ep/token/route.ts'),'Launcher no fija Windows PowerShell 5.1')
require('Encrypting File System' not in code,'Fallback Encrypting File System prohibido')
require(re.search(r'git\s+add\s+-A',code,re.I) is None,'git add -A prohibido')
require('return@' not in code,'Token return@ invalido en PowerShell')
require(re.search(r'\breturn(?=\S)',code,re.I) is None,'return debe separarse de su operando')
require(re.search(r'vercel\s+deploy\s+--prod',code,re.I) is not None,'Falta publicación automática de main en producción')
require('ep-main-live.json' in code and 'Test-KhoraRemoteMainExact' in code,'Prueba live main incompleta')
require('{{https://' not in code,'URL con llaves dobles')
require('raw.githubusercontent.com' not in gate,'Bootstrap anónimo prohibido')
require('Find-KhoraHostToolPath' in gate or 'Resolve-KhoraHostToolPath' in gate,'Falta descubrimiento robusto de herramientas del host')
require('Find-KhoraHostExecutable' in code,'Falta resolvedor robusto de herramientas en dependencias')
require('npm.cmd' in code,'El bootstrap debe usar npm.cmd para evitar bloqueo de npm.ps1')
# Sequence registry
ids=[f'EP-IN-{n:03d}' for n in range(10,131,10)]+[f'EP-RUN-{n:03d}' for n in (10,20,30)]+[f'EP-OUT-{n:03d}' for n in range(10,101,10)]
for event_id in ids:
    require(event_id in arch,f'ID ausente de arquitectura: {event_id}')
    require(event_id in code,f'ID ausente de implementación: {event_id}')
require(code.find('EP-IN-070')<code.find('EP-IN-080')<code.find('EP-IN-090')<code.find('EP-IN-100'),'Orden llave/GitHub/Vercel/Visual Studio Code incorrecto')
# CECEQ identity-preserving data-profile contract
launcher=read('khora-web/app/api/ep/token/route.ts')
config=read('scripts/khora/modules/00-config.ps1','utf-8-sig')
efs=read('scripts/khora/modules/05-efs.ps1','utf-8-sig')
deps=read('scripts/khora/modules/08-deps.ps1','utf-8-sig')
cleanup=read('scripts/khora/modules/11-cleanup.ps1','utf-8-sig')
require('Initialize-KhoraDataProfileContext' in gate,'Falta resolver del árbol de datos para CECEQ')
require('KHORA_FILA4_PROFILE_NOT_UNIQUE' in gate and 'KHORA_FILA4_REPARSE_POINT_REFUSED' in gate,'La resolución de Fila4 debe fallar cerrada ante perfil ambiguo o ruta insegura')
require('KhoraExpectedExecutionIdentity' in gate and 'KHORA_EXECUTION_IDENTITY_MISMATCH' in gate,'No se conserva/verifica la identidad efectiva del proceso')
require('dataProfileMode=[string]$script:KHORA_DATA_PROFILE_MODE' in gate,'El manifiesto no separa identidad efectiva y perfil de datos')
require('KHORA_FILA4_PROFILE_NOT_UNIQUE' in launcher and 'Get-Clipboard' in launcher and launcher.index('KHORA_FILA4_PROFILE_NOT_UNIQUE') < launcher.index('Get-Clipboard'),'El launcher debe resolver el destino antes de consumir el token')
require('$p=Join-Path $targetTemp' in launcher and '$tf=Join-Path $targetTemp' in launcher,'Los temporales iniciales deben usar la ruta ya resuelta de Fila4')
require('-KhoraExpectedExecutionIdentity $execIdentity' in launcher,'El launcher no fija la identidad real esperada')
require('$oldProfileEnvironment=[ordered]@{' in launcher and '[Environment]::SetEnvironmentVariable' in launcher,'El launcher debe restaurar el entorno del shell llamador')
require('KHORA_HOST_TEMP_OUTSIDE_FILA4_PROFILE' in config,'La configuración debe validar el temporal host de Fila4')
require('KHORA_DISMOUNT_TEMP_OUTSIDE_FILA4_PROFILE' in efs and '$script:KHORA_HOST_TEMP' in efs,'El archivo temporal de desmontaje debe residir en Fila4')
require('InstallAllUsers=1' in deps and 'InstallAllUsers=0' not in deps,'Python no debe registrar una instalación por usuario MantenimientoRCI')
require('Remove-KhoraPythonMachineRegistration' in deps and 'Remove-KhoraPythonMachineRegistration' in cleanup,'Los registros de instalación Python temporales deben retirarse')
# EP CECEQ: execution token remains MantenimientoRCI; all paths resolve under Fila4.
token_route=read('khora-web/app/api/ep/token/route.ts')
token_module=read('scripts/khora/modules/06-token.ps1','utf-8-sig')
require("DataProtectionScope]::LocalMachine" in gate,'Los blobs EP deben usar DPAPI de ámbito de equipo')
require("Unprotect-KhoraTextBlob -Path $KhoraTokenFile" in gate,'El token bootstrap no usa el descifrador DPAPI canónico')
require("DataProtectionScope]::LocalMachine" in token_route,'El launcher debe proteger el token inicial con DPAPI de ámbito de equipo')
require('ConvertFrom-SecureString|Set-Content -LiteralPath $tf' not in token_route,'El launcher no debe escribir blobs DPAPI ligados al usuario')
require('$p=Join-Path $targetTemp' in token_route and '$tf=Join-Path $targetTemp' in token_route,'Los temporales del launcher deben usar el destino ya resuelto')
require(token_route.index('KHORA_FILA4_PROFILE_NOT_UNIQUE') < token_route.index('Get-Clipboard'),'El destino fila4 debe resolverse antes de leer y materializar el token')
require('-KhoraExpectedExecutionIdentity $execIdentity' in token_route,'El proceso bootstrap debe conservar la identidad efectiva original')
require('$oldProfileEnvironment=[ordered]@{' in token_route and '[Environment]::SetEnvironmentVariable' in token_route,'El launcher debe restaurar el entorno heredado del shell')
require('Unprotect-KhoraTextBlob -Path $Path' in token_module,'Los secretos EP deben descifrarse sin DPAPI de usuario')
require("executionIdentity=[Security.Principal.WindowsIdentity]::GetCurrent().Name" in gate,'El manifiesto debe registrar la identidad efectiva real')
require("dataProfileMode=[string]$script:KHORA_DATA_PROFILE_MODE" in gate,'El manifiesto debe separar identidad efectiva y árbol de datos')
require('KHORA_FILA4_PROFILE_NOT_UNIQUE' in gate and 'KHORA_FILA4_REPARSE_POINT_REFUSED' in gate,'La resolución de Fila4 debe fallar cerrada ante perfil ambiguo o rutas inseguras')
require('KHORA_CECEQ_REQUIRES_MANTENIMIENTORCI_EXECUTION_TOKEN' in config,'El modo de datos fila4 debe conservar la identidad MantenimientoRCI')
require('InstallAllUsers=1' in deps and 'InstallAllUsers=0' not in deps,'Python no debe instalarse en HKCU bajo MantenimientoRCI')
require('Remove-KhoraPythonMachineRegistration' in deps and 'Remove-KhoraPythonMachineRegistration' in cleanup,'Los registros temporales de Python deben retirarse')
# Remote persistence and private bootstrap
for rel in ['khora-web/app/api/ep/token/route.ts','khora-web/app/api/ep/bootstrap/route.ts','khora-web/app/api/ep/events/route.ts','khora-web/app/api/ep/logs/route.ts','khora-web/lib/server/ep.ts','khora-web/db/migrations/016_ep_persistent_sessions.sql']:
    require((ROOT/rel).is_file(),f'Falta {rel}')
ep=read('khora-web/lib/server/ep.ts')
require('ultimo_hash' in ep and 'FOR UPDATE' in ep and 'event_hash' in ep,'Cadena hash remota incompleta')
require('EP_BOOTSTRAP_JWT_SECRET' in ep and 'EP_ALLOWED_EMAIL' in ep,'Configuración de token incompleta')
require('ep:bootstrap ep:logs:write ep:logs:read' in ep,'Scopes EP incompletos')
# Embedded bootstrap must equal the gate byte-for-byte.
content=read('khora-web/lib/server/ep-bootstrap-content.ts')
match=re.search(r'BOOTSTRAP_PS1_BASE64\s*=\s*"([A-Za-z0-9+/=]+)"',content)
require(bool(match),'Bootstrap embebido ausente')
if match:
    require(base64.b64decode(match.group(1))==(ROOT/'scripts/khora/khora.ps1').read_bytes(),'Bootstrap embebido no coincide con gate')
# Encoding policy
for p in (ROOT/'scripts/khora').rglob('*'):
    if p.suffix.lower() in {'.ps1','.cmd'}:
        data=p.read_bytes();require(data.startswith(b'\xef\xbb\xbf'),f'Falta BOM: {p.relative_to(ROOT)}');require(b'\n' not in data[3:].replace(b'\r\n',b''),f'No es CRLF: {p.relative_to(ROOT)}')
# Conservative delimiter scan for PowerShell.
def delimiters(path:Path):
    s=path.read_text(encoding='utf-8-sig');stack=[];state='code';here=None;i=0;line=1
    while i<len(s):
        c=s[i];n=s[i+1] if i+1<len(s) else ''
        if state=='comment':
            if c=='\n':state='code';line+=1
            i+=1;continue
        if state=='single':
            if c=="'":
                if n=="'":i+=2;continue
                state='code'
            if c=='\n':line+=1
            i+=1;continue
        if state=='double':
            if c=='`':i+=2;continue
            if c=='"':state='code'
            if c=='\n':line+=1
            i+=1;continue
        if state=='here':
            if (i==0 or s[i-1]=='\n') and s.startswith(here,i):state='code';i+=2;continue
            if c=='\n':line+=1
            i+=1;continue
        if c=='#':state='comment';i+=1;continue
        if c=='@' and n in ("'",'"'):state='here';here=n+'@';i+=2;continue
        if c=="'":state='single';i+=1;continue
        if c=='"':state='double';i+=1;continue
        if c in '({[':stack.append((c,line))
        elif c in ')}]':
            expected={')':'(',']':'[','}':'{'}[c]
            if not stack or stack[-1][0]!=expected:return f'{path.relative_to(ROOT)}:{line} delimitador {c}'
            stack.pop()
        if c=='\n':line+=1
        i+=1
    if state in {'single','double','here'}:return f'{path.relative_to(ROOT)}: cadena sin cerrar'
    if stack:return f'{path.relative_to(ROOT)}: delimitador sin cerrar {stack[-1]}'
for p in (ROOT/'scripts/khora').rglob('*.ps1'):
    problem=delimiters(p)
    if problem:errors.append(problem)
if errors:
    print('\n'.join('ERROR: '+e for e in errors));sys.exit(1)
print('EP v1.0.1 static validation: OK')
