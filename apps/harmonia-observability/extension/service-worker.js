try { importScripts('local-auth.js'); } catch {}
const COLLECTOR='http://127.0.0.1:47321';
const TOKEN=String(globalThis.HARMONIA_TOKEN||'');
let state={active:false,tabId:null,sessionId:null,startedAt:null,collector:false,lastError:null,events:0};
const ready=chrome.storage.local.get(['harmoniaState']).then(r=>{if(r.harmoniaState)state={...state,...r.harmoniaState};}).catch(()=>{});
const save=()=>chrome.storage.local.set({harmoniaState:state});
function headers(extra={}){return {...extra,'x-harmonia-token':TOKEN};}
function safePageUrl(raw){try{const u=new URL(raw);return u.origin+u.pathname.replace(/\/c\/[^/]+/,'/c/[conversation]').replace(/\/g\/[^/]+/,'/g/[gpt]');}catch{return 'https://chatgpt.com/';}}
async function health(){if(!TOKEN){state.collector=false;state.lastError='Falta configurar extension/local-auth.js; no se enviará información sin autenticación.';await save();return false;}try{const r=await fetch(`${COLLECTOR}/health`,{headers:headers(),cache:'no-store'});state.collector=r.ok;state.lastError=r.ok?null:`Colector respondió HTTP ${r.status}`;}catch(e){state.collector=false;state.lastError=String(e.message||e);}await save();return state.collector;}
async function coverageRecord(event){
 if(event.type!=='ui.surface.scan')return;
 const p=event.payload||{}, allowedFeatures=Array.isArray(p.features)?p.features.filter(x=>typeof x==='string'&&x.length<100):[];
 const controls=Array.isArray(p.controls)?p.controls:[];
 const unknown=controls.filter(c=>!c.testId&&!c.label).map(c=>[c.tag,c.role,c.type,c.placeholder].join('|')).filter(Boolean).slice(0,100);
 const current=(await chrome.storage.local.get(['harmoniaCoverage'])).harmoniaCoverage||{schema:'harmonia.coverage-index.v1',observedFeatureIds:[],unknownControls:[],scanCount:0,observations:0};
 current.observedFeatureIds=[...new Set([...current.observedFeatureIds,...allowedFeatures])].sort();
 current.unknownControls=[...new Set([...current.unknownControls,...unknown])].slice(0,100);
 current.scanCount=(current.scanCount||0)+1;current.lastScanAt=event.capturedAt;current.lastFeatureIds=allowedFeatures;
 current.lastControlCount=controls.length;current.lastNodeCount=p.structure?.total||0;
 current.stylesheetCount=p.counts?.styleSheets||0;current.lastPrivacy=p.privacy||{};
 current.observations=(current.observations||0)+1;
 await chrome.storage.local.set({harmoniaCoverage:current});
}
async function emit(type,payload={},source='extension'){
 const event={schema:'harmonia.event.v1',eventId:crypto.randomUUID(),sessionId:state.sessionId,conversation:state.tabId?`tab-${state.tabId}`:null,type,source,capturedAt:new Date().toISOString(),payload};
 try{await coverageRecord(event);const r=await fetch(`${COLLECTOR}/events`,{method:'POST',headers:headers({'content-type':'application/json'}),body:JSON.stringify(event)});if(!r.ok)throw new Error(`Colector HTTP ${r.status}`);state.collector=true;state.events++;state.lastError=null;}catch(e){state.collector=false;state.lastError=String(e.message||e);}await save();return event;
}
function valid(url=''){try{return new URL(url).hostname==='chatgpt.com';}catch{return false;}}
async function start(tab){
 if(state.active)throw new Error('Ya hay una captura activa.');
 if(!tab?.id||!valid(tab.url))throw new Error('Elige una pestaña abierta en chatgpt.com.');
 if(!await health())throw new Error(state.lastError||'Inicia primero el colector local.');
 state={active:true,tabId:tab.id,sessionId:crypto.randomUUID(),startedAt:new Date().toISOString(),collector:true,lastError:null,events:0};await save();
 try{
  await chrome.debugger.attach({tabId:tab.id},'1.3');
  for(const method of ['Runtime.enable','Log.enable'])await chrome.debugger.sendCommand({tabId:tab.id},method);
  await emit('capture.started',{url:safePageUrl(tab.url),version:'0.2.0',mode:'interface-architecture-only',privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false}});
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
  await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:start',sessionId:state.sessionId});
  return state;
 }catch(e){try{await chrome.debugger.detach({tabId:tab.id});}catch{}state={...state,active:false,tabId:null,sessionId:null,lastError:String(e.message||e)};await save();throw e;}
}
async function stop(reason='manual'){
 if(!state.active)return state;
 const old={...state};
 try{await chrome.tabs.sendMessage(old.tabId,{kind:'harmonia:stop'});}catch{}
 await new Promise(resolve=>setTimeout(resolve,120));
 await emit('capture.stopped',{reason,durationMs:Date.now()-Date.parse(old.startedAt)});
 try{await chrome.debugger.detach({tabId:old.tabId});}catch{}
 state={...state,active:false,tabId:null,sessionId:null,startedAt:null};await save();return state;
}
chrome.runtime.onMessage.addListener((m,s,respond)=>{
 (async()=>{await ready;if(m.kind==='harmonia:get'){await health();return {...state,coverage:(await chrome.storage.local.get(['harmoniaCoverage'])).harmoniaCoverage||null};}if(m.kind==='harmonia:start'){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});return start(tab);}if(m.kind==='harmonia:stop')return stop();if(m.kind==='harmonia:event'&&state.active&&s.tab?.id===state.tabId)return emit(m.event.type,m.event.payload,'page-observer');throw new Error('Mensaje no reconocido.');})().then(v=>respond({ok:true,value:v})).catch(e=>respond({ok:false,error:String(e.message||e)}));return true;
});
chrome.debugger.onEvent.addListener((src,method,params)=>{
 if(!state.active||src.tabId!==state.tabId)return;
 if(method==='Runtime.consoleAPICalled')emit('console.message',{level:params.type,argCount:(params.args||[]).length,argTypes:(params.args||[]).map(a=>a.type||'unknown'),timestamp:params.timestamp},'chrome.debugger');
 else if(method==='Runtime.exceptionThrown')emit('console.exception',{exceptionType:params.exceptionDetails?.exception?.type||null,lineNumber:params.exceptionDetails?.lineNumber||null,columnNumber:params.exceptionDetails?.columnNumber||null},'chrome.debugger');
 else if(method==='Log.entryAdded'){const e=params.entry||{};let pagePath=null;try{const u=new URL(e.url||'');pagePath=u.origin+u.pathname;}catch{}emit('console.entry',{source:e.source||null,level:e.level||null,url:pagePath,textLength:String(e.text||'').length,timestamp:e.timestamp||null},'chrome.debugger');}
});
chrome.debugger.onDetach.addListener((src,reason)=>{if(state.active&&src.tabId===state.tabId)stop(`debugger-detached:${reason}`);});
chrome.tabs.onRemoved.addListener(id=>{if(state.active&&id===state.tabId)stop('tab-closed');});
