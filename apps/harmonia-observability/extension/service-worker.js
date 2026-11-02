try { importScripts('local-auth.js'); } catch {}
importScripts('durable-outbox.js');
const COLLECTOR='http://127.0.0.1:47321';
const TOKEN=String(globalThis.HARMONIA_TOKEN||'');
const STORE={sessions:'harmoniaAutoSessions',enabled:'harmoniaAutoEnabled',events:'harmoniaEventCount',fingerprints:'harmoniaKnownSurfaceFingerprints',repositorySync:'harmoniaRepositorySync'};
const REPO_BUILD_INFO='https://raw.githubusercontent.com/SeryMente/khora/main/apps/harmonia-observability/extension/build-info.json';
const REPO_MANIFEST='https://raw.githubusercontent.com/SeryMente/khora/main/apps/harmonia-observability/extension/manifest.json';
const REPO_CATALOG='https://raw.githubusercontent.com/SeryMente/khora/main/apps/harmonia-observability/coverage-catalog.json';
const REPO_SYNC_ALARM='harmonia-repository-sync';
const OUTBOX_RETRY_ALARM='harmonia-outbox-retry';
let sessions={};
let autoEnabled=true;
let eventCount=0;
let lastError=null;
let collector=false;
let knownFingerprints=new Set();
let surfaceQueue=Promise.resolve();
let outboxFlushPromise=null;
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
  await syncRepository();
  chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});
  chrome.alarms.create(OUTBOX_RETRY_ALARM,{delayInMinutes:1,periodInMinutes:1});
  void flushOutbox();
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
function compareVersions(a,b){
 const pa=String(a||'0.0.0').split('.').map(x=>Number.parseInt(x,10)||0),pb=String(b||'0.0.0').split('.').map(x=>Number.parseInt(x,10)||0);
 for(let i=0;i<3;i++){if((pa[i]||0)>(pb[i]||0))return 1;if((pa[i]||0)<(pb[i]||0))return -1;}
 return 0;
}
async function syncRepository(){
 const checkedAt=new Date().toISOString();
 const saved=await chrome.storage.local.get([STORE.repositorySync]);
 const previous=saved[STORE.repositorySync]||{};
 try{
  const [localResponse,remoteBuildResponse,remoteManifestResponse,remoteCatalogResponse]=await Promise.all([
   fetch(chrome.runtime.getURL('build-info.json'),{cache:'no-store'}),
   fetch(REPO_BUILD_INFO,{cache:'no-store',headers:{'Accept':'application/json'}}),
   fetch(REPO_MANIFEST,{cache:'no-store',headers:{'Accept':'application/json'}}),
   fetch(REPO_CATALOG,{cache:'no-store',headers:{'Accept':'application/json'}})
  ]);
  if(!localResponse.ok||!remoteCatalogResponse.ok)throw new Error('No se pudieron leer el build local o el catálogo desde main.');
  const [localBuild,remoteCatalog]=await Promise.all([localResponse.json(),remoteCatalogResponse.json()]);
  if(localBuild.schema!=='harmonia.repository-build.v1'||typeof localBuild.sourceRevision!=='string'||!/^([0-9a-f]{7,40})$/i.test(localBuild.sourceRevision))throw new Error('Los metadatos locales de versión no superaron la validación.');
  if(remoteCatalog.schema!=='harmonia.coverage-catalog.v1'||!Array.isArray(remoteCatalog.features)||!Array.isArray(remoteCatalog.sources))throw new Error('El catálogo del repositorio tiene un esquema inesperado.');
  let remoteVersion=null,remoteRevision=null,revisionCheckMode='manifest-version-only';
  if(remoteBuildResponse.ok){
   const remoteBuild=await remoteBuildResponse.json();
   if(remoteBuild.schema==='harmonia.repository-build.v1'&&typeof remoteBuild.version==='string'&&typeof remoteBuild.sourceRevision==='string'&&/^([0-9a-f]{7,40})$/i.test(remoteBuild.sourceRevision)){
    remoteVersion=remoteBuild.version;remoteRevision=remoteBuild.sourceRevision;revisionCheckMode='build-info';
   }
  }
  if(!remoteVersion){
   if(!remoteManifestResponse.ok)throw new Error('No se encontró build-info.json ni manifest.json remoto válido en main.');
   const remoteManifest=await remoteManifestResponse.json();
   if(remoteManifest.manifest_version!==3||typeof remoteManifest.version!=='string'||!(/^\d+\.\d+\.\d+$/.test(remoteManifest.version)))throw new Error('El manifiesto MV3 remoto no superó la validación.');
   remoteVersion=remoteManifest.version;
  }
  const manifest=chrome.runtime.getManifest();
  const localVersion=String(manifest.version||localBuild.version||'0.0.0');
  const codeUpdateAvailable=compareVersions(remoteVersion,localVersion)>0||(remoteRevision!==null&&remoteRevision!==String(localBuild.sourceRevision));
  const catalogUpdateAvailable=String(remoteCatalog.version)!==String(localBuild.catalogVersion||'')||JSON.stringify(remoteCatalog)!==JSON.stringify(previous.catalog||null);
  const status=codeUpdateAvailable?'update-available':catalogUpdateAvailable?'catalog-updated':'current';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(remoteCatalog)));
  const catalogSha256=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const state={schema:'harmonia.repository-sync.v1',repository:'SeryMente/khora',branch:'main',sourcePath:'apps/harmonia-observability',
   status,checkedAt,lastSuccessfulSyncAt:checkedAt,localVersion,remoteVersion,localRevision:String(localBuild.sourceRevision),remoteRevision,revisionCheckMode,
   updateAvailable:codeUpdateAvailable,catalogVersion:String(remoteCatalog.version||''),catalogSha256,catalog:remoteCatalog,error:null,
   policy:'Solo sincroniza metadatos y catálogo JSON validados; nunca descarga ni ejecuta JavaScript remoto.'};
  await chrome.storage.local.set({[STORE.repositorySync]:state});
  return state;
 }catch(error){
  const state={...previous,schema:'harmonia.repository-sync.v1',repository:'SeryMente/khora',branch:'main',status:'error',checkedAt,
   lastSuccessfulSyncAt:previous.lastSuccessfulSyncAt||null,error:String(error.message||error),
   policy:'Solo sincroniza metadatos y catálogo JSON validados; nunca descarga ni ejecuta JavaScript remoto.'};
  await chrome.storage.local.set({[STORE.repositorySync]:state});
  return state;
 }
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
async function flushOutbox(){
 if(outboxFlushPromise)return outboxFlushPromise;
 outboxFlushPromise=(async()=>{
  const acknowledgedIds=[];
  if(!TOKEN)return {acknowledgedIds,blocked:'local-auth-missing'};
  const pending=await HarmoniaDurableOutbox.listPending(100);
  for(const record of pending){
   const event=record.event;
   try{
    const response=await fetch(COLLECTOR+'/events',{method:'POST',headers:headers({'content-type':'application/json'}),body:JSON.stringify(event)});
    if(!response.ok){
     await HarmoniaDurableOutbox.defer(event.eventId,'collector-http-'+response.status);
     collector=false;lastError='Colector respondió HTTP '+response.status;
     break;
    }
    const ack=await response.json();
    if(!ack||ack.ok!==true||ack.eventId!==event.eventId){
     await HarmoniaDurableOutbox.defer(event.eventId,'collector-ack-mismatch');
     collector=false;lastError='Confirmación del colector no correlacionada.';
     break;
    }
    await HarmoniaDurableOutbox.acknowledge(event.eventId);
    acknowledgedIds.push(event.eventId);
    collector=true;lastError=null;eventCount++;
    const tabMatch=String(event.conversation||'').match(/^tab-(\d+)$/);
    if(tabMatch){
     const session=sessions[tabMatch[1]];
     if(session&&session.id===event.sessionId){session.events=(session.events||0)+1;session.lastAt=event.capturedAt;}
    }
    await saveSessions();
   }catch(error){
    try{await HarmoniaDurableOutbox.defer(event.eventId,'collector-network-or-storage-error');}catch{}
    collector=false;lastError='Entrega local pendiente: '+String(error.message||error);
    break;
   }
  }
  return {acknowledgedIds,pendingCount:(await HarmoniaDurableOutbox.status()).pendingCount};
 })().finally(()=>{outboxFlushPromise=null;});
 return outboxFlushPromise;
}
async function postEvent(tabId,session,type,payload={},source='extension'){
 const event={schema:'harmonia.event.v1',eventId:crypto.randomUUID(),sessionId:session.id,conversation:'tab-'+tabId,type,source,capturedAt:new Date().toISOString(),payload};
 try{
  await HarmoniaDurableOutbox.enqueue(event);
  session.lastAt=event.capturedAt;
  await saveSessions();
  const result=await flushOutbox();
  return {ok:true,durable:true,collectorStored:result.acknowledgedIds.includes(event.eventId),eventId:event.eventId,pendingCount:result.pendingCount};
 }catch(error){
  collector=false;lastError='No se pudo confirmar la cola local durable: '+String(error.message||error);
  return {ok:false,durable:false,error:lastError};
 }
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
  if(message.kind==='harmonia:sync-repository')return syncRepository();
  if(message.kind==='harmonia:get'){
   await checkHealth();
   const syncData=await chrome.storage.local.get([STORE.repositorySync]);
   let coverage=null;
   let epStatus=null;
   if(collector){
    try{
     const [coverageResponse,epResponse]=await Promise.all([
      fetch(COLLECTOR+'/coverage',{headers:headers(),cache:'no-store'}),
      fetch(COLLECTOR+'/ep/status',{headers:headers(),cache:'no-store'})
     ]);
     if(coverageResponse.ok)coverage=await coverageResponse.json();
     else throw new Error('Colector HTTP '+coverageResponse.status);
     if(epResponse.ok)epStatus=await epResponse.json();
    }catch(error){lastError=String(error.message||error);}
   }
   if(collector)await flushOutbox();
   const localOutbox=await HarmoniaDurableOutbox.status();
   return {version:'0.3.0',autoEnabled,active:autoEnabled&&Object.keys(sessions).length>0,activeTabs:Object.keys(sessions).length,
    localOutbox,epStatus,sessions:Object.entries(sessions).map(([tabId,session])=>({tabId,startedAt:session.startedAt,lastAt:session.lastAt,events:session.events})),
    collector,lastError,events:eventCount,coverage,repositorySync:syncData[STORE.repositorySync]||null};
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
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===REPO_SYNC_ALARM)void syncRepository();if(alarm.name===OUTBOX_RETRY_ALARM)void flushOutbox();});
chrome.runtime.onInstalled.addListener(()=>{void ready.then(async()=>{chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});chrome.alarms.create(OUTBOX_RETRY_ALARM,{delayInMinutes:1,periodInMinutes:1});await syncRepository();void flushOutbox();if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});});
chrome.runtime.onStartup.addListener(()=>{void ready.then(async()=>{chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});await syncRepository();if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});});
