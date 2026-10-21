try { importScripts('local-auth.js'); } catch {}
const COLLECTOR='http://127.0.0.1:47321';
const TOKEN=String(globalThis.HARMONIA_TOKEN||'');
const STORE={sessions:'harmoniaAutoSessions',enabled:'harmoniaAutoEnabled',events:'harmoniaEventCount',coverage:'harmoniaCoverage'};
let sessions={};
let autoEnabled=true;
let eventCount=0;
let lastError=null;
let collector=false;
let coverageQueue=Promise.resolve();
const ready=(async()=>{
  const saved=await chrome.storage.local.get([STORE.sessions,STORE.enabled,STORE.events]);
  sessions=saved[STORE.sessions]||{};
  autoEnabled=saved[STORE.enabled]!==false;
  eventCount=Number(saved[STORE.events]||0);
  await chrome.storage.local.set({[STORE.enabled]:autoEnabled});
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
  const live=new Set(tabs.filter(t=>t.id&&valid(t.url)).map(t=>String(t.id)));
  for(const key of Object.keys(sessions))if(!live.has(key))delete sessions[key];
  await saveSessions();
  if(autoEnabled)await injectExistingTabs(tabs);
})();
function saveSessions(){return chrome.storage.local.set({[STORE.sessions]:sessions,[STORE.enabled]:autoEnabled,[STORE.events]:eventCount});}
function headers(extra={}){return {...extra,'x-harmonia-token':TOKEN};}
function valid(url=''){try{return new URL(url).hostname==='chatgpt.com'&&new URL(url).protocol==='https:';}catch{return false;}}
function safePageUrl(raw){try{const u=new URL(raw);return u.origin+u.pathname.replace(/\/c\/[^/]+/,'/c/[conversation]').replace(/\/g\/[^/]+/,'/g/[gpt]');}catch{return 'https://chatgpt.com/';}}
async function checkHealth(){
  if(!TOKEN){collector=false;lastError='Falta la credencial local de Harmonia.';return false;}
  try{const r=await fetch(`${COLLECTOR}/health`,{headers:headers(),cache:'no-store'});collector=r.ok;lastError=r.ok?null:`Colector respondió HTTP ${r.status}`;}
  catch(e){collector=false;lastError=String(e.message||e);}
  return collector;
}
async function updateCoverage(event){
 if(event.type!=='ui.surface.scan')return;
 coverageQueue=coverageQueue.then(async()=>{
  const p=event.payload||{},allowedFeatures=Array.isArray(p.features)?p.features.filter(x=>typeof x==='string'&&x.length<120):[];
  const controls=Array.isArray(p.controls)?p.controls:[];
  const unknown=controls.filter(c=>!c.testId&&!c.label).map(c=>[c.tag,c.role,c.type,c.placeholder].join('|')).filter(Boolean).slice(0,100);
  const saved=await chrome.storage.local.get([STORE.coverage]);
  const current=saved[STORE.coverage]||{schema:'harmonia.coverage-index.v1',observedFeatureIds:[],unknownControls:[],scanCount:0,observations:0};
  current.observedFeatureIds=[...new Set([...(current.observedFeatureIds||[]),...allowedFeatures])].sort();
  current.unknownControls=[...new Set([...(current.unknownControls||[]),...unknown])].slice(0,100);
  current.scanCount=(current.scanCount||0)+1;current.lastScanAt=event.capturedAt;
  current.lastFeatureIds=allowedFeatures;current.lastControlCount=controls.length;current.lastNodeCount=p.structure?.total||0;
  current.stylesheetCount=p.counts?.styleSheets||0;current.lastPrivacy=p.privacy||{};
  current.observations=(current.observations||0)+1;current.lastSessionId=event.sessionId;
  await chrome.storage.local.set({[STORE.coverage]:current});
 }).catch(e=>{lastError='Falló el índice local: '+String(e.message||e);});
 return coverageQueue;
}
async function postEvent(tabId,session,type,payload={},source='extension'){
 const event={schema:'harmonia.event.v1',eventId:crypto.randomUUID(),sessionId:session.id,conversation:`tab-${tabId}`,type,source,capturedAt:new Date().toISOString(),payload};
 if(type==='ui.surface.scan')await updateCoverage(event);
 if(!TOKEN){collector=false;lastError='No existe credencial local; evento no enviado.';return false;}
 try{
  const r=await fetch(`${COLLECTOR}/events`,{method:'POST',headers:headers({'content-type':'application/json'}),body:JSON.stringify(event)});
  if(!r.ok)throw new Error(`Colector HTTP ${r.status}`);
  collector=true;lastError=null;eventCount++;session.events=(session.events||0)+1;session.lastAt=event.capturedAt;
  await saveSessions();return true;
 }catch(e){collector=false;lastError=String(e.message||e);return false;}
}
async function ensureSession(tab){
 const key=String(tab.id);
 if(sessions[key])return sessions[key];
 if(!autoEnabled||!tab?.id||!valid(tab.url))return null;
 const session={id:crypto.randomUUID(),startedAt:new Date().toISOString(),lastAt:null,events:0,url:safePageUrl(tab.url)};
 sessions[key]=session;
 await saveSessions();
 await postEvent(tab.id,session,'capture.started',{url:session.url,version:'0.3.0',mode:'automatic-interface-architecture',privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true}});
 return session;
}
async function onObservedEvent(message,sender){
 const tab=sender.tab;
 if(!autoEnabled||!tab?.id||!valid(tab.url))return false;
 const session=await ensureSession(tab);
 if(!session)return false;
 const type=String(message?.event?.type||'');
 if(type!=='ui.surface.scan')return false;
 const p=message.event.payload||{};
 // Enforce a structure-only event contract even if the content script is stale or malformed.
 const allowed={catalogVersion:p.catalogVersion,features:Array.isArray(p.features)?p.features.filter(x=>typeof x==='string').slice(0,100):[],
  controls:Array.isArray(p.controls)?p.controls.slice(0,100):[],structure:p.structure&&typeof p.structure==='object'?{nodes:Array.isArray(p.structure.nodes)?p.structure.nodes.slice(0,280):[],total:Number(p.structure.total||0),truncated:!!p.structure.truncated}:{nodes:[],total:0,truncated:true},
  stylesheets:Array.isArray(p.stylesheets)?p.stylesheets.slice(0,80).map(s=>({index:s.index,path:String(s.path||'').slice(0,180),crossOriginOrInaccessible:!!s.crossOriginOrInaccessible,ruleCount:s.ruleCount??null})):[],
  viewport:p.viewport&&typeof p.viewport==='object'?{width:Number(p.viewport.width||0),height:Number(p.viewport.height||0),devicePixelRatio:Number(p.viewport.devicePixelRatio||1)}:null,
  layout:p.layout&&typeof p.layout==='object'?p.layout:{},counts:p.counts&&typeof p.counts==='object'?p.counts:{},
  privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true}};
 await postEvent(tab.id,session,'ui.surface.scan',allowed,'page-observer');
 return true;
}
async function stopSession(tabId,reason){
 const key=String(tabId),session=sessions[key];if(!session)return;
 await postEvent(tabId,session,'capture.stopped',{reason,durationMs:Date.now()-Date.parse(session.startedAt)});
 delete sessions[key];await saveSessions();
}
async function injectTab(tab){
 if(!autoEnabled||!tab?.id||!valid(tab.url))return;
 try{
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
  await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:start',automatic:true});
 }
 catch(e){lastError='No se pudo activar observación en una pestaña: '+String(e.message||e);}
}
async function injectExistingTabs(tabs){
 for(const tab of tabs||[]){if(!valid(tab.url))continue;await injectTab(tab);}
}
async function setAutoEnabled(value){
 await ready;autoEnabled=!!value;
 await chrome.storage.local.set({[STORE.enabled]:autoEnabled});
 const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
 if(autoEnabled){await injectExistingTabs(tabs);}
 else{
  for(const tab of tabs){if(!tab.id)continue;try{await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:stop'});}catch{}await stopSession(tab.id,'automatic-capture-paused');}
 }
 return {autoEnabled,activeTabs:Object.keys(sessions).length};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 (async()=>{
  await ready;
  if(message.kind==='harmonia:auto-settings')return {enabled:autoEnabled};
  if(message.kind==='harmonia:get'){
   await checkHealth();
   const saved=await chrome.storage.local.get([STORE.coverage]);
   return {version:'0.3.0',autoEnabled,active:autoEnabled&&Object.keys(sessions).length>0,activeTabs:Object.keys(sessions).length,
    sessions:Object.entries(sessions).map(([tabId,s])=>({tabId,startedAt:s.startedAt,lastAt:s.lastAt,events:s.events})),
    collector,lastError,events:eventCount,coverage:saved[STORE.coverage]||null};
  }
  if(message.kind==='harmonia:set-auto')return setAutoEnabled(message.enabled);
  if(message.kind==='harmonia:event'&&sender.tab?.id)return onObservedEvent(message,sender);
  throw new Error('Mensaje no reconocido.');
 })().then(value=>respond({ok:true,value})).catch(error=>respond({ok:false,error:String(error.message||error)}));
 return true;
});
async function removeOrStopTab(tabId){
 const key=String(tabId);
 if(sessions[key])await stopSession(tabId,'tab-closed-or-left-chatgpt');
}
chrome.tabs.onRemoved.addListener(tabId=>{void ready.then(()=>removeOrStopTab(tabId));});
chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab)=>{
 void ready.then(async()=>{
  if(!autoEnabled)return;
  if(tab?.url&&!valid(tab.url)){await removeOrStopTab(tabId);return;}
  if(changeInfo.status==='complete'&&valid(tab?.url))await injectTab(tab);
 });
});
chrome.runtime.onInstalled.addListener(()=>{void ready.then(async()=>{if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});});
chrome.runtime.onStartup.addListener(()=>{void ready.then(async()=>{if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});});
