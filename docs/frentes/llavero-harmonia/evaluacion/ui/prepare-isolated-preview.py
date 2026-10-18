from pathlib import Path
import json
import os
w=Path(os.environ['KHORA_UI_WORKSPACE']).resolve();r=w/'repo';(w/'preview').mkdir(exist_ok=True)
(w/'preview/navigation.tsx').write_text('''import {useSyncExternalStore} from 'react';
const subscribe=(fn:()=>void)=>{window.addEventListener('khora-preview-navigation',fn);window.addEventListener('popstate',fn);return()=>{window.removeEventListener('khora-preview-navigation',fn);window.removeEventListener('popstate',fn);}};
export function useSearchParams(){const search=useSyncExternalStore(subscribe,()=>window.location.search,()=> '');return new URLSearchParams(search);}
export function useRouter(){return {replace:(url:string)=>{history.replaceState({},'',url);window.dispatchEvent(new Event('khora-preview-navigation'));}};}
''')
(w/'preview/stub.tsx').write_text('''export default function UnchangedModule(){return <p>Módulo existente no incluido en la vista previa aislada.</p>;}''')
(w/'preview/entry.tsx').write_text('''import {createRoot} from 'react-dom/client';
import SeguridadPage from '../repo/khora-web/app/sistema/seguridad/page';
import {PortableVaultView} from '../repo/khora-web/app/components/shared/PortableVaultView';
const q=new URLSearchParams(location.search);
const theme=q.get('theme')||'dark';document.documentElement.dataset.theme=theme;
if(!q.has('tab')&&!q.has('overview')&&!q.has('scenario')){history.replaceState({},'',location.pathname+'?tab=boveda-portable'+(theme==='light'?'&theme=light':''));}
createRoot(document.getElementById('root')!).render(q.has('scenario')?<main style={{maxWidth:1088,margin:'auto',padding:32}}><PortableVaultView state="unavailable"/></main>:<SeguridadPage/>);
''')
(w/'preview/base.css').write_text('''@import "tailwindcss";
@source "../repo/khora-web/app/sistema/seguridad/page.tsx";
:root{--khora-bg:#0A0A0B;--khora-surface:#17181A;--khora-ink:#C7CCD1;--khora-accent:#8A9BA8;--khora-border:#23252A;color-scheme:dark;}
html[data-theme=light]{--khora-bg:#F4F2EF;--khora-surface:#FFF;--khora-ink:#1C1D1F;--khora-accent:#4D6273;--khora-border:#B9BDC1;color-scheme:light;}
body{margin:0;background:var(--khora-bg);color:var(--khora-ink);font-family:Arial,sans-serif;}
.preview-banner{padding:10px 24px;border-bottom:1px solid var(--khora-border);font-size:14px;font-family:Arial,sans-serif;}
''')
(w/'preview/build.mjs').write_text('''import * as esbuild from 'esbuild';import path from 'node:path';
const root=process.cwd();
await esbuild.build({entryPoints:['preview/entry.tsx'],bundle:true,outfile:'preview/app.js',jsx:'automatic',minify:true,plugins:[{name:'preview-only-mocks',setup(b){
b.onResolve({filter:/^next\\/navigation$/},()=>({path:path.join(root,'preview/navigation.tsx')}));
b.onResolve({filter:/^@\\/app\\/(components\\/ep|components\\/os|sistema\\/mcp)/},()=>({path:path.join(root,'preview/stub.tsx')}));
b.onResolve({filter:/^@\\//},a=>({path:path.join(root,'repo/khora-web',a.path.slice(2))+'.tsx'}));
}}]});
''')
# Typecheck exact changed sources with explicit sandbox-only mocks for unchanged Next/old panels.
(w/'preview/types.d.ts').write_text('''declare module '*.module.css' {const c:Record<string,string>;export default c;}
declare module 'next/navigation' {export function useRouter():{replace:(url:string,options?:{scroll?:boolean})=>void};export function useSearchParams():URLSearchParams;}
declare module '@/app/components/ep/EntornoPersistentePanel' {const C:import('react').ComponentType;export default C;}
declare module '@/app/components/os/PaginaBoveda' {const C:import('react').ComponentType;export default C;}
declare module '@/app/sistema/mcp/page' {const C:import('react').ComponentType;export default C;}
''')
(w/'tsconfig.json').write_text(json.dumps({'compilerOptions':{'target':'ES2020','lib':['DOM','ES2020'],'jsx':'react-jsx','module':'ESNext','moduleResolution':'bundler','strict':True,'noEmit':True,'skipLibCheck':True,'baseUrl':'.','paths':{'@/*':['repo/khora-web/*']}},'include':['preview/types.d.ts','repo/khora-web/app/components/shared/PortableVaultView.tsx','repo/khora-web/app/sistema/seguridad/page.tsx','repo/khora-web/app/navigation/registry.ts','repo/khora-web/lib/ui-review/types.ts','repo/khora-web/lib/ui-review/registry.ts']}))
print('Prepared real-source preview; mocks isolated and excluded from repository.')
