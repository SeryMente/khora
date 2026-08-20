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
require("EP_VERSION = '1.0.0'" in gate,'Versión EP incorrecta')
require("SCRIPT_VERSION = '7.3.0'" in gate,'Versión host incorrecta')
require('Enable-BitLocker' in gate,'Falta BitLocker')
require('Encrypting File System' not in code,'Fallback Encrypting File System prohibido')
require(re.search(r'git\s+add\s+-A',code,re.I) is None,'git add -A prohibido')
require(re.search(r'vercel\s+deploy\s+--prod',code,re.I) is not None,'Falta publicación automática de main en producción')
require('ep-main-live.json' in code and 'Test-KhoraRemoteMainExact' in code,'Prueba live main incompleta')
require('{{https://' not in code,'URL con llaves dobles')
require('raw.githubusercontent.com' not in gate,'Bootstrap anónimo prohibido')
# Sequence registry
ids=[f'EP-IN-{n:03d}' for n in range(10,131,10)]+[f'EP-RUN-{n:03d}' for n in (10,20,30)]+[f'EP-OUT-{n:03d}' for n in range(10,101,10)]
for event_id in ids:
    require(event_id in arch,f'ID ausente de arquitectura: {event_id}')
    require(event_id in code,f'ID ausente de implementación: {event_id}')
require(code.find('EP-IN-070')<code.find('EP-IN-080')<code.find('EP-IN-090')<code.find('EP-IN-100'),'Orden llave/GitHub/Vercel/Visual Studio Code incorrecto')
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
print('EP v1.0 static validation: OK')
