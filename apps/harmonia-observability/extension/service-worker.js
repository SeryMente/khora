try { importScripts('local-auth.js'); } catch {}
const COLLECTOR='http://127.0.0.1:47321';
const TOKEN=String(globalThis.HARMONIA_TOKEN||'');
const STORE={sessions:'harmoniaAutoSessions',enabled:'harmoniaAutoEnabled',events:'harmoniaEventCount',fingerprints:'harmoniaKnownSurfaceFingerprints'};
let sessions={};
let autoEnabled=true;
let eventCount=0;
let lastError=null;
let collector=false;
let knownFingerprints=new Set();
let surfaceQueue=Promise.resolve();
const ready=(async()=>{
  const saved=await chrome.storage.local.get([STORE.sessions,STORE.enabled,STORE.events,STORE.fingerprints]);
  sessions=saved[STORE.sessions]||{};
  autoEnabled=saved[STORE.enabled]!==false;
  eventCount=Number(saved[STORE.events]||0);
  knownFingerprints=new Set(Array.isArray(saved[STORE.fingerprints])?saved[STORE.fingerprints]:[]);
  await chrome.storage.local.set({[STORE.enabled]:autoEnabled});
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
  const live=new Set(tabs.filter(tab=>tab.id&&valid(tab.url)).map(tab=>String(tab.id)));
  for(const key of Object.keys(sessions))if(!live.has(key))delete sessions[key];
  await saveSessions();
  await refreshKnownFingerprints();
})();
let storageQueue=Promise.resolve();
function saveSessions(){
 const snapshot=Object.fromEntries(Object.entries(sessions).map(([key,session])=>[key,{...session}]));
 const state={[STORE.sessions]:snapshot,[STORE.enabled]:autoEnabled,[STORE.events]:eventCount};
 storageQueue=storageQueue.then(()=>chrome.storage.local.set(state));
 return storageQueue;
}
function headers(extra={}){return {...extra,'x-harmonia-token':TOKEN};}
function valid(url=''){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='chatgpt.com';}catch{return false;}}
function safePageUrl(raw){try{const u=new URL(raw);return u.origin+u.pathname.replace(/\/c\/[^/]+/,'/c/[conversation]').replace(/\/g\/[^/]+/,'/g/[gpt]');}catch{return 'https://chatgpt.com/';}}
async function checkHealth(){
  if(!TOKEN){collector=false;lastError='Falta la credencial local de Harmonia.';return false;}
  try{const response=await fetch(`${COLLECTOR}/health`,{headers:headers(),cache:'no-store'});collector=response.ok;lastError=response.ok?null:`Colector respondió HTTP ${response.status}`;}
  catch(error){collector=false;lastError=String(error.message||error);}
  return collector;
}
async function refreshKnownFingerprints(){
 if(!TOKEN)return;
 try{
  const response=await fetch(`${COLLECTOR}/fingerprints`,{headers:headers(),cache:'no-store'});
  if(!response.ok)throw new Error(`Colector HTTP ${response.status}`);
  const data=await response.json();
  knownFingerprints=new Set(Array.isArray(data.fingerprints)?data.fingerprints.filter(fp=>/^[0-9a-f]{64}$/.test(fp)):[]);
  await chrome.storage.local.set({[STORE.fingerprints]:[...knownFingerprints]});
 }catch(error){
  knownFingerprints=new Set();
  await chrome.storage.local.set({[STORE.fingerprints]:[]});
  lastError='No se pudo restaurar el índice de superficies: '+String(error.message||error);
 }
}
async function rememberFingerprint(fingerprint){
 knownFingerprints.delete(fingerprint);knownFingerprints.add(fingerprint);
 while(knownFingerprints.size>5000)knownFingerprints.delete(knownFingerprints.values().next().value);
 await chrome.storage.local.set({[STORE.fingerprints]:[...knownFingerprints]});
}
async function postEvent(tabId,session,type,payload={},source='extension'){
 const event={schema:'harmonia.event.v1',eventId:crypto.randomUUID(),sessionId:session.id,conversation:`tab-${tabId}`,type,source,capturedAt:new Date().toISOString(),payload};
 if(!TOKEN){collector=false;lastError='No existe credencial local; evento no enviado.';return {ok:false};}
 try{
  const response=await fetch(`${COLLECTOR}/events`,{method:'POST',headers:headers({'content-type':'application/json'}),body:JSON.stringify(event)});
  if(!response.ok)throw new Error(`Colector HTTP ${response.status}`);
  const ack=await response.json();
  collector=true;lastError=null;eventCount++;session.events=(session.events||0)+1;session.lastAt=event.capturedAt;
  await saveSessions();
  return {ok:true,storedType:ack.storedType||type,deduplicated:!!ack.deduplicated,eventId:event.eventId};
 }catch(error){collector=false;lastError=String(error.message||error);return {ok:false,error:lastError};}
}
const sessionInitializers={};
async function ensureSession(tab){
 const key=String(tab.id);
 if(sessionInitializers[key])return sessionInitializers[key];
 if(sessions[key])return sessions[key];
 if(!autoEnabled||!tab?.id||!valid(tab.url))return null;
 sessionInitializers[key]=(async()=>{
  const session={id:crypto.randomUUID(),startedAt:new Date().toISOString(),lastAt:null,events:0,url:safePageUrl(tab.url)};
  sessions[key]=session;await saveSessions();
  await postEvent(tab.id,session,'capture.started',{url:session.url,version:'0.3.0',mode:'automatic-interface-architecture',privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true}});
  return session;
 })();
 try{return await sessionInitializers[key];}finally{delete sessionInitializers[key];}
}
function boundedString(value,max=90){return typeof value==='string'?value.slice(0,max):'';}
function sanitizeControl(control){
 return {tag:boundedString(control?.tag,24),role:boundedString(control?.role,40),label:boundedString(control?.label,90),testId:boundedString(control?.testId,70),placeholder:boundedString(control?.placeholder,80),type:boundedString(control?.type,24),disabled:!!control?.disabled,expanded:boundedString(control?.expanded,10)};
}
function sanitizeStructure(structure){
 const nodes=Array.isArray(structure?.nodes)?structure.nodes.slice(0,280).map(node=>({
  depth:Number(node?.depth||0),tag:boundedString(node?.tag,24),role:boundedString(node?.role,40),testId:boundedString(node?.testId,70),
  classes:Array.isArray(node?.classes)?node.classes.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,50)):[],
  messageRole:boundedString(node?.messageRole,20),ariaLive:boundedString(node?.ariaLive,30),ariaBusy:boundedString(node?.ariaBusy,10),childElements:Number(node?.childElements||0)
 })): [];
 return {nodes,total:Number(structure?.total||0),truncated:!!structure?.truncated};
}
function sanitizeScan(p){
 const controls=Array.isArray(p.controls)?p.controls.slice(0,100).map(sanitizeControl):[];
 const stylesheets=Array.isArray(p.stylesheets)?p.stylesheets.slice(0,80).map(sheet=>({index:Number(sheet?.index||0),path:boundedString(sheet?.path,180),crossOriginOrInaccessible:!!sheet?.crossOriginOrInaccessible,ruleCount:sheet?.ruleCount??null})):[];
 const layout=p.layout&&typeof p.layout==='object'?p.layout:{};
 const sanitizedLayout={};
 for(const key of ['main','composer','assistant']){
  const value=layout[key];
  if(!value||typeof value!=='object')continue;
  sanitizedLayout[key]={tag:boundedString(value.tag,24),role:boundedString(value.role,30),testId:boundedString(value.testId,70),
   classes:Array.isArray(value.classes)?value.classes.slice(0,5).map(x=>boundedString(x,50)):[],
   display:boundedString(value.display,24),position:boundedString(value.position,24),flexDirection:boundedString(value.flexDirection,24),overflow:boundedString(value.overflow,24),
   fontSize:boundedString(value.fontSize,16),width:Number(value.width||0),height:Number(value.height||0)};
 }
 return {catalogVersion:boundedString(p.catalogVersion,24),fingerprint:boundedString(p.fingerprint,64),
  features:Array.isArray(p.features)?p.features.filter(x=>typeof x==='string'&&x.length<120).slice(0,100):[],controls,
  structure:sanitizeStructure(p.structure),stylesheets,
  viewport:p.viewport&&typeof p.viewport==='object'?{width:Number(p.viewport.width||0),height:Number(p.viewport.height||0),devicePixelRatio:Number(p.viewport.devicePixelRatio||1)}:null,
  layout:sanitizedLayout,
  counts:{controls:controls.length,userMessages:Number(p.counts?.userMessages||0),assistantMessages:Number(p.counts?.assistantMessages||0),styleSheets:Number(p.counts?.styleSheets||stylesheets.length)},
  privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true}};
}
function compactSurface(sanitized){
 return {catalogVersion:sanitized.catalogVersion,fingerprint:sanitized.fingerprint,features:sanitized.features,
  controlCount:sanitized.controls.length,nodeCount:sanitized.structure.total,stylesheetCount:sanitized.stylesheets.length,viewport:sanitized.viewport,
  privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true}};
}
async function processSurfaceScan(tab,session,payload){
 const sanitized=sanitizeScan(payload);
 if(!/^[0-9a-f]{64}$/.test(sanitized.fingerprint))throw new Error('La firma estructural no es válida.');
 const alreadyKnown=knownFingerprints.has(sanitized.fingerprint);
 const type=alreadyKnown?'ui.surface.reused':'ui.surface.scan';
 const body=alreadyKnown?compactSurface(sanitized):sanitized;
 const response=await postEvent(tab.id,session,type,body,'page-observer');
 if(!response.ok)return false;
 await rememberFingerprint(sanitized.fingerprint);
 return true;
}
async function onObservedEvent(message,sender){
 const tab=sender.tab;
 if(!autoEnabled||!tab?.id||!valid(tab.url))return false;
 const type=String(message?.event?.type||'');
 if(type!=='ui.surface.scan')return false;
 const session=await ensureSession(tab);
 if(!session)return false;
 const payload=message.event.payload||{};
 const run=()=>processSurfaceScan(tab,session,payload);
 const next=surfaceQueue.then(run,run);
 surfaceQueue=next.catch(error=>{lastError=String(error.message||error);});
 return next;
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
 }catch(error){lastError='No se pudo activar observación en una pestaña: '+String(error.message||error);}
}
async function injectExistingTabs(tabs){
 for(const tab of tabs||[]){if(!valid(tab.url))continue;await injectTab(tab);}
}
async function setAutoEnabled(value){
 await ready;autoEnabled=!!value;
 await chrome.storage.local.set({[STORE.enabled]:autoEnabled});
 const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
 if(autoEnabled)await injectExistingTabs(tabs);
 else for(const tab of tabs){if(!tab.id)continue;try{await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:stop'});}catch{}await stopSession(tab.id,'automatic-capture-paused');}
 return {autoEnabled,activeTabs:Object.keys(sessions).length};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 (async()=>{
  await ready;
  if(message.kind==='harmonia:auto-settings')return {enabled:autoEnabled};
  if(message.kind==='harmonia:get'){
   await checkHealth();
   let coverage=null;
   if(collector){try{const response=await fetch(`${COLLECTOR}/coverage`,{headers:headers(),cache:'no-store'});if(response.ok)coverage=await response.json();else throw new Error(`Colector HTTP ${response.status}`);}catch(error){lastError=String(error.message||error);}}
   return {version:'0.3.0',autoEnabled,active:autoEnabled&&Object.keys(sessions).length>0,activeTabs:Object.keys(sessions).length,
    sessions:Object.entries(sessions).map(([tabId,session])=>({tabId,startedAt:session.startedAt,lastAt:session.lastAt,events:session.events})),
    collector,lastError,events:eventCount,coverage};
  }
  if(message.kind==='harmonia:set-auto')return setAutoEnabled(message.enabled);
  if(message.kind==='harmonia:event'&&sender.tab?.id)return onObservedEvent(message,sender);
  throw new Error('Mensaje no reconocido.');
 })().then(value=>respond({ok:true,value})).catch(error=>respond({ok:false,error:String(error.message||error)}));
 return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{void ready.then(()=>stopSession(tabId,'tab-closed'));});
chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab)=>{
 void ready.then(async()=>{
  if(!autoEnabled)return;
  if(tab?.url&&!valid(tab.url))await stopSession(tabId,'tab-left-chatgpt');
 });
});
void ready.then(async()=>{if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});
