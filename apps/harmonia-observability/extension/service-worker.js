const COLLECTOR='http://127.0.0.1:47321';
let state={active:false,tabId:null,sessionId:null,startedAt:null,collector:false,lastError:null,events:0};
const save=()=>chrome.storage.local.set({harmoniaState:state});
async function emit(type,payload={},source='extension'){
  const event={schema:'harmonia.event.v1',eventId:crypto.randomUUID(),sessionId:state.sessionId,conversation:state.tabId?`tab-${state.tabId}`:null,type,source,capturedAt:new Date().toISOString(),payload};
  try{const r=await fetch(`${COLLECTOR}/events`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)});if(!r.ok)throw new Error(await r.text());state.collector=true;state.events++;state.lastError=null;}catch(e){state.collector=false;state.lastError=String(e.message||e);}await save();return event;
}
async function health(){try{const r=await fetch(`${COLLECTOR}/health`);state.collector=r.ok;}catch{state.collector=false;}await save();return state.collector;}
function valid(url=''){try{return new URL(url).hostname==='chatgpt.com';}catch{return false;}}
async function start(tab){if(state.active)throw new Error('Ya hay una captura activa.');if(!tab?.id||!valid(tab.url))throw new Error('Elige una pestaña abierta en chatgpt.com.');if(!await health())throw new Error('Inicia primero el colector local.');state={active:true,tabId:tab.id,sessionId:crypto.randomUUID(),startedAt:new Date().toISOString(),collector:true,lastError:null,events:0};await save();
  await chrome.debugger.attach({tabId:tab.id},'1.3');
  for(const method of ['Runtime.enable','Log.enable','DOM.enable','Page.enable']) await chrome.debugger.sendCommand({tabId:tab.id},method);
  await emit('capture.started',{url:tab.url,title:tab.title,coverage:{html:true,css:true,console:true,conversation:true,transientVisibleText:true,drafts:false,cookies:false,credentials:false,otherTabs:false}});
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
  await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:start',sessionId:state.sessionId});
  try{const snap=await chrome.debugger.sendCommand({tabId:tab.id},'DOMSnapshot.captureSnapshot',{computedStyles:['display','visibility','opacity','color','background-color','font-family','font-size'],includeDOMRects:true,includePaintOrder:false});await emit('dom.snapshot',snap,'chrome.debugger');}catch(e){await emit('capture.gap',{channel:'html/css',reason:String(e.message||e)},'extension');}
  return state;
}
async function stop(reason='manual'){if(!state.active)return state;const old={...state};try{await chrome.tabs.sendMessage(old.tabId,{kind:'harmonia:stop'});}catch{}await emit('capture.stopped',{reason,durationMs:Date.now()-Date.parse(old.startedAt)});try{await chrome.debugger.detach({tabId:old.tabId});}catch{}state={...state,active:false,tabId:null,sessionId:null,startedAt:null};await save();return state;}
chrome.runtime.onMessage.addListener((m,s,respond)=>{(async()=>{if(m.kind==='harmonia:get'){await health();return state;}if(m.kind==='harmonia:start'){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});return start(tab);}if(m.kind==='harmonia:stop')return stop();if(m.kind==='harmonia:event'&&state.active&&s.tab?.id===state.tabId)return emit(m.event.type,m.event.payload,'page-observer');throw new Error('Mensaje no reconocido.');})().then(v=>respond({ok:true,value:v})).catch(e=>respond({ok:false,error:String(e.message||e)}));return true;});
chrome.debugger.onEvent.addListener((src,method,params)=>{if(!state.active||src.tabId!==state.tabId)return;if(method==='Runtime.consoleAPICalled')emit('console.message',{level:params.type,args:(params.args||[]).map(a=>a.value??a.description??a.type),timestamp:params.timestamp},'chrome.debugger');else if(method==='Runtime.exceptionThrown')emit('console.exception',params,'chrome.debugger');else if(method==='Log.entryAdded')emit('console.entry',params.entry,'chrome.debugger');});
chrome.debugger.onDetach.addListener((src,reason)=>{if(state.active&&src.tabId===state.tabId)stop(`debugger-detached:${reason}`);});
chrome.tabs.onRemoved.addListener(id=>{if(state.active&&id===state.tabId)stop('tab-closed');});
