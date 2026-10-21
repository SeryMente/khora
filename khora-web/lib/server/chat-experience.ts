/** Khora adapter for pinned Open WebUI. No tenant content/storage or native auth changes. */
export const KHORA_SCOPE = 'Solo responde con evidencia recuperada. Archivo personal: incorporación no verificada aquí.';
export const KHORA_PROMPTS = [
  { title: ['Consultar con fuentes', 'Rastrear una afirmación'], content: 'Quiero consultar un tema. Pídeme cuál y responde solo con evidencia incorporada, citando las fuentes utilizadas.' },
  { title: ['Aclarar qué falta', 'Sin inventar información'], content: 'Cuando falte evidencia para responder mi pregunta, indica qué se sabe, qué no y qué fuente haría falta.' },
];
const SPANISH_UI = {
  'How can I help you today?': 'Pregunta sobre el contenido incorporado',
  'Send a Message': 'Escribe tu pregunta', 'New Chat': 'Nueva conversación', 'Search': 'Buscar',
  'Search Chats': 'Buscar conversaciones', 'Chat history': 'Historial de conversaciones',
  'Open Sidebar': 'Abrir historial', 'Close Sidebar': 'Cerrar historial', 'User menu': 'Menú de usuario',
  'Temporary Chat': 'Conversación temporal', 'Controls': 'Controles', 'More': 'Más opciones',
  '{{count}} Sources': '{{count}} fuentes', 'Show sources': 'Ver fuentes', 'Sources': 'Fuentes', 'Source': 'Fuente', 'Suggested': 'Para empezar',
};

/** Uses official /api/config fields. Never broadens any native capability or grant. */
export function configureKhoraNativeUI(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('NATIVE_CONFIG_CONTRACT_CHANGED');
  const config = value as Record<string, unknown>;
  if (config.status !== true || typeof config.features !== 'object' || !config.features) throw Error('NATIVE_CONFIG_CONTRACT_CHANGED');
  const i18n = config.i18n && typeof config.i18n === 'object' ? config.i18n as Record<string, unknown> : {};
  const en = i18n['en-US'] && typeof i18n['en-US'] === 'object' ? i18n['en-US'] as Record<string, unknown> : {};
  const es = i18n['es-ES'] && typeof i18n['es-ES'] === 'object' ? i18n['es-ES'] as Record<string, unknown> : {};
  return { ...config, default_locale:'es-ES',
    i18n:{ ...i18n, 'en-US':{...en,...SPANISH_UI}, 'es-ES':{...es,...SPANISH_UI} },
    default_prompt_suggestions:KHORA_PROMPTS, default_prompt_suggestions_i18n:{},
  };
}

export async function presentNativeConfig(response: Response): Promise<Response> {
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/json')) return response;
  try {
    const json = configureKhoraNativeUI(await response.json());
    const headers = new Headers(response.headers); headers.delete('content-length');headers.delete('content-encoding');
    headers.set('Cache-Control','private, no-store'); headers.set('X-Khora-Native-Experience','enraizamiento-v1');
    return Response.json(json,{headers});
  } catch {
    return Response.json({error:'Chat configuration unavailable'},{status:503,headers:{'Cache-Control':'private, no-store'}});
  }
}

/** Only display metadata for the single existing native model; ownership/grants stay upstream. */
export async function presentNativeModels(response: Response): Promise<Response> {
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/json')) return response;
  const data = await response.clone().json().catch(() => null);
  if (!data || !Array.isArray(data.data)) return response;
  const models = data.data.map((model: Record<string, unknown>) => {
    if (model.id !== 'khora_epistwin') return model;
    const info = model.info && typeof model.info === 'object' ? model.info as Record<string, unknown> : {};
    const meta = info.meta && typeof info.meta === 'object' ? info.meta as Record<string, unknown> : {};
    return {...model, info:{...info, meta:{...meta, description:'Consulta con evidencia recuperada por el núcleo Khora. Si falta información, debe indicarlo.'}}};
  });
  const headers = new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('Cache-Control','private, no-store');
  return Response.json({...data,data:models},{headers});
}

export const KHORA_EXPERIENCE_CSS = `
:root{--khora-context-height:88px}
#khora-context{position:fixed;inset:0 0 auto;z-index:80;box-sizing:border-box;height:var(--khora-context-height);padding:8px 20px 8px 60px;border-bottom:1px solid #e6e5e3;background:#fff;color:#2c2c2b;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.4;display:flex;align-items:center;justify-content:space-between;gap:16px}
#khora-context strong{font-size:15px;font-weight:600}#khora-context p{margin:2px 0 0;color:#615e59;max-width:780px;font-size:14px}
#khora-context nav{display:flex;gap:12px;flex-shrink:0;align-items:center}#khora-context a{min-height:44px;padding:10px 12px;display:inline-flex;align-items:center;border-radius:8px;text-decoration:none;color:inherit;white-space:nowrap}#khora-context a:hover{background:#f0efed}#khora-context a:focus-visible{outline:2px solid #2783de;outline-offset:2px}
[data-khora-native-root]{display:block!important;position:fixed;inset:var(--khora-context-height) 0 0;overflow:hidden;height:calc(100dvh - var(--khora-context-height));min-height:0}
[data-khora-native-root] .h-screen,[data-khora-native-root] #app{height:calc(100dvh - var(--khora-context-height))!important;max-height:calc(100dvh - var(--khora-context-height))!important}
[data-khora-native-root] nav,[data-khora-native-root] .sticky.top-0{background:#fff}
.dark [data-khora-native-root] nav,.dark [data-khora-native-root] .sticky.top-0{background:#191919}
#voice-input-button,button[id^="speak-button-"],button[aria-label="Voice mode" i],button[aria-label="Modo de voz" i],button[aria-label="Modo voz" i],#voice-mode-button,#model-selector-model-button{display:none!important}
.dark #khora-context{background:#191919;color:#fff;border-color:#454543}.dark #khora-context p{color:#c0bdb7}.dark #khora-context a:hover{background:#383836}
@media(max-width:600px){:root{--khora-context-height:144px}#khora-context{padding:8px 16px;gap:4px;flex-direction:column;align-items:stretch;justify-content:center}#khora-context strong{font-size:14px}#khora-context p{font-size:14px}#khora-context nav{gap:8px;justify-content:flex-end}#khora-context a{padding:8px 10px;min-height:44px}}
`;

/** No regex over conversation content; only the exact pinned boot root is adapted. */
export function addKhoraExperience(html: string): string {
  if (html.includes('id="khora-context"')) return html;
  const root='<div style="display: contents">';
  if (html.split(root).length!==2 || html.split('</head>').length!==2) throw Error('NATIVE_EXPERIENCE_CONTRACT_CHANGED');
  const start = `<style data-khora-experience="enraizamiento-v1">${KHORA_EXPERIENCE_CSS}</style><script data-khora-locale>if(!new URL(location.href).searchParams.has('lang')){const u=new URL(location.href);u.searchParams.set('lang','es-ES');history.replaceState(null,'',u.pathname+u.search+u.hash);}</script>`;
  const context = `<header id="khora-context" aria-label="Contexto de Khora"><div><strong>Conversación con fuentes</strong><p>${KHORA_SCOPE}</p></div><nav aria-label="Accesos de Khora"><a href="/sistema/ingreso">Captura</a><a href="/sistema">Volver a Khora</a></nav></header>`;
  return html.replace('</head>',start+'</head>').replace(root,context+'<div style="display: contents" data-khora-native-root>');
}

export const RECOVERY_DELAYS_MS = [1500,3000,5000,8000,12000,15000,15000,15000] as const;
export function nativeDocumentPath(path: string): boolean {return path==='/'||path==='/auth'||/^\/c\/[0-9a-f-]{36}$/.test(path);}

/** Error HTML retains real 5xx status. Bounded user-present GET probes, never POST/SSE replay. */
export function nativeUnavailablePage(status=503, presentationFailure=false): Response {
  const code=status>=500&&status<=599?status:503;
  const title=presentationFailure?'No se pudo cargar la presentación del chat':'No se ha podido abrir el chat';
  const recovery = presentationFailure ? '' : `<script>
const delays=${JSON.stringify(RECOVERY_DELAYS_MS)};let attempt=0;let running=false;let stopped=false;let timer;
addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);});
const info=document.getElementById('connection-state');const retry=document.getElementById('retry-chat');
async function connect(){if(running||stopped)return;running=true;retry.disabled=true;info.textContent='Comprobando conexión…';
try{const r=await fetch(location.href,{method:'GET',cache:'no-store',headers:{Accept:'text/html'},signal:AbortSignal.timeout(18000)});if(r.ok&&r.headers.get('X-Khora-Native-Presentation')==='pinned-css-inline-v1'){stopped=true;location.replace(location.href);return;}if(r.status===401||r.status===403){stopped=true;info.textContent='La sesión necesita revisión. Vuelve a entrar en Khora.';return;}}catch{}finally{running=false;retry.disabled=false;}
if(attempt<delays.length){info.textContent='Conexión no disponible. Reintento '+(attempt+1)+' de '+delays.length+'…';timer=setTimeout(connect,delays[attempt++]);}else{info.textContent='El chat continúa sin responder. Puedes reintentar o seguir en Captura.';}}
retry.addEventListener('click',()=>{if(!running){clearTimeout(timer);attempt=0;stopped=false;connect();}});timer=setTimeout(connect,delays[attempt++]);
</script>`;
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Khora</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;min-height:100dvh;display:grid;place-items:center;background:#f9f8f7;color:#2c2c2b;font:16px/1.55 system-ui,sans-serif}main{width:min(100%,640px);padding:40px;border:1px solid #e6e5e3;border-radius:12px;background:#fff}small{color:#615e59}h1{font-size:30px;line-height:1.2;margin:14px 0}p{margin:16px 0}nav{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}a,button{font:inherit;min-height:44px;border:1px solid #d6d3ce;border-radius:8px;padding:10px 16px;text-decoration:none;color:inherit;background:#fff}button{background:#2c2c2b;color:#fff;cursor:pointer}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:3px solid #2783de;outline-offset:3px}@media(prefers-color-scheme:dark){body{background:#191919;color:#fff}main{background:#202020;border-color:#454543}small{color:#c0bdb7}a{background:#202020;color:#fff}button{background:#fff;color:#191919}}@media(max-width:500px){main{padding:24px}h1{font-size:26px}nav>*{width:100%;text-align:center}}</style></head><body><main><small>KHORA · CONVERSACIÓN</small><h1>${title}</h1><p>${presentationFailure?'El servicio respondió, pero no se pudo verificar la presentación del chat. Se detuvo la carga para no mostrar una interfaz incompleta.':'La conexión con el servicio interno no está disponible en este momento. Este estado no indica si el servicio está arrancando o si tiene un fallo.'}</p><p>Desde esta pantalla no se envía ni se vuelve a enviar ningún mensaje.</p><p id="connection-state" role="status" aria-live="polite">${presentationFailure?'Se detuvo la carga para no mostrar una interfaz incompleta.':'Comprobando si se puede recuperar la conexión…'}</p><nav><button id="retry-chat" type="button"${presentationFailure?' onclick="location.reload()"':''}>Reintentar</button><a href="/sistema/ingreso">Ir a Captura</a><a href="/sistema">Volver a Khora</a></nav></main>${recovery}</body></html>`;
  return new Response(html,{status:code,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Retry-After':'5','X-Khora-Native-Experience':'unavailable-v1'}});
}
