try { importScripts('local-auth.js'); } catch {}
importScripts('region-policy.js');
const COLLECTOR='http://127.0.0.1:47321';
const TOKEN=String(globalThis.HARMONIA_TOKEN||'');
const STORE={sessions:'harmoniaAutoSessions',enabled:'harmoniaAutoEnabled',events:'harmoniaEventCount',fingerprints:'harmoniaKnownSurfaceFingerprints',repositorySync:'harmoniaRepositorySync',regionCoverage:'harmoniaRegionCoverage',regionLeaders:'harmoniaRegionLeaders'};
const REPO_BUILD_INFO='https://raw.githubusercontent.com/SeryMente/khora/main/apps/harmonia-observability/extension/build-info.json';
const REPO_CATALOG='https://raw.githubusercontent.com/SeryMente/khora/main/apps/harmonia-observability/coverage-catalog.json';
const REPO_SYNC_ALARM='harmonia-repository-sync';
let sessions={};
let autoEnabled=true;
let eventCount=0;
let lastError=null;
let collector=false;
let collectorHealth=null;
let knownFingerprints=new Set();
let regionCoverage={};
let regionLeaders={};
let surfaceQueue=Promise.resolve();
const ready=(async()=>{
  const saved=await chrome.storage.local.get([STORE.sessions,STORE.enabled,STORE.events,STORE.fingerprints,STORE.regionCoverage,STORE.regionLeaders]);
  sessions=saved[STORE.sessions]||{};
  autoEnabled=saved[STORE.enabled]!==false;
  eventCount=Number(saved[STORE.events]||0);
  knownFingerprints=new Set(Array.isArray(saved[STORE.fingerprints])?saved[STORE.fingerprints]:[]);
  regionCoverage=saved[STORE.regionCoverage]&&typeof saved[STORE.regionCoverage]==='object'?saved[STORE.regionCoverage]:{};
  regionLeaders=saved[STORE.regionLeaders]&&typeof saved[STORE.regionLeaders]==='object'?saved[STORE.regionLeaders]:{};
  await chrome.storage.local.set({[STORE.enabled]:autoEnabled});
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
  const live=new Set(tabs.filter(tab=>tab.id&&valid(tab.url)).map(tab=>String(tab.id)));
  for(const key of Object.keys(sessions))if(!live.has(key))delete sessions[key];
  await saveSessions();
  await refreshKnownFingerprints();
  await refreshRegionCoverage();
  await syncRepository();
  chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});
})();
let storageQueue=Promise.resolve();
function saveSessions(){
 const snapshot=Object.fromEntries(Object.entries(sessions).map(([key,session])=>[key,{...session}]));
 const state={[STORE.sessions]:snapshot,[STORE.enabled]:autoEnabled,[STORE.events]:eventCount,[STORE.regionCoverage]:regionCoverage,[STORE.regionLeaders]:regionLeaders};
 storageQueue=storageQueue.then(()=>chrome.storage.local.set(state));
 return storageQueue;
}
function headers(extra={}){return {...extra,'x-harmonia-token':TOKEN};}
function valid(url=''){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='chatgpt.com';}catch{return false;}}
function regionFor(url){return HarmoniaRegionPolicy.classifyRegion(url);}
function privacyContract(){return {visibleMessageTextCaptured:true,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,hiddenReasoningCaptured:false,menusExcluded:true,consoleValuesRedacted:true};}
function safePageUrl(raw){try{const u=new URL(raw);return u.origin+u.pathname.replace(/\/c\/[^/]+/,'/c/[conversation]').replace(/\/g\/[^/]+/,'/g/[gpt]');}catch{return 'https://chatgpt.com/';}}
async function checkHealth(){
  if(!TOKEN){collector=false;collectorHealth=null;lastError='Falta la credencial local de Harmonia.';return false;}
  try{
    const response=await fetch(COLLECTOR+'/health',{headers:headers(),cache:'no-store'});
    collectorHealth=response.ok?await response.json():null;
    collector=!!(response.ok&&collectorHealth&&collectorHealth.ok);
    lastError=collector?null:'Colector HTTP '+response.status;
  }catch(error){collector=false;collectorHealth=null;lastError=String(error.message||error);}
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
  const [localResponse,remoteBuildResponse,remoteCatalogResponse]=await Promise.all([
   fetch(chrome.runtime.getURL('build-info.json'),{cache:'no-store'}),
   fetch(REPO_BUILD_INFO,{cache:'no-store',headers:{'Accept':'application/json'}}),
   fetch(REPO_CATALOG,{cache:'no-store',headers:{'Accept':'application/json'}})
  ]);
  if(!localResponse.ok||!remoteBuildResponse.ok||!remoteCatalogResponse.ok)throw new Error('No se pudieron leer los metadatos y el catálogo desde main.');
  const [localBuild,remoteBuild,remoteCatalog]=await Promise.all([localResponse.json(),remoteBuildResponse.json(),remoteCatalogResponse.json()]);
  if(localBuild.schema!=='harmonia.repository-build.v1'||remoteBuild.schema!=='harmonia.repository-build.v1'||typeof remoteBuild.sourceRevision!=='string'||!/^([0-9a-f]{7,40})$/i.test(remoteBuild.sourceRevision))throw new Error('Los metadatos de versión del repositorio no superaron la validación.');
  if(remoteCatalog.schema!=='harmonia.coverage-catalog.v1'||!Array.isArray(remoteCatalog.features)||!Array.isArray(remoteCatalog.sources))throw new Error('El catálogo del repositorio tiene un esquema inesperado.');
  const manifest=chrome.runtime.getManifest();
  const localVersion=String(manifest.version||localBuild.version||'0.0.0');
  const remoteVersion=String(remoteBuild.version||'0.0.0');
  const codeUpdateAvailable=compareVersions(remoteVersion,localVersion)>0||String(remoteBuild.sourceRevision)!==String(localBuild.sourceRevision);
  const catalogUpdateAvailable=String(remoteCatalog.version)!==String(localBuild.catalogVersion||'')||JSON.stringify(remoteCatalog)!==JSON.stringify(previous.catalog||null);
  const status=codeUpdateAvailable?'update-available':catalogUpdateAvailable?'catalog-updated':'current';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(remoteCatalog)));
  const catalogSha256=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const state={schema:'harmonia.repository-sync.v1',repository:'SeryMente/khora',branch:'main',sourcePath:'apps/harmonia-observability',
   status,checkedAt,lastSuccessfulSyncAt:checkedAt,localVersion,remoteVersion,localRevision:String(localBuild.sourceRevision),remoteRevision:String(remoteBuild.sourceRevision),
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
async function postEvent(tabId,session,type,payload={},source='extension'){
 const event={schema:'harmonia.event.v1',eventId:crypto.randomUUID(),sessionId:session.id,conversation:`tab-${tabId}`,type,source,capturedAt:new Date().toISOString(),payload};
 if(!TOKEN){collector=false;lastError='No existe credencial local; evento no enviado.';return {ok:false};}
 try{
  const response=await fetch(`${COLLECTOR}/events`,{method:'POST',headers:headers({'content-type':'application/json'}),body:JSON.stringify(event)});
  if(!response.ok)throw new Error(`Colector HTTP ${response.status}`);
  const ack=await response.json();
  collector=true;lastError=null;eventCount++;session.events=(session.events||0)+1;session.lastAt=event.capturedAt;
  await saveSessions();
  return {ok:true,storedType:ack.storedType||type,deduplicated:!!ack.deduplicated,eventId:event.eventId,regionExploration:ack.regionExploration||null};
 }catch(error){collector=false;lastError=String(error.message||error);return {ok:false,error:lastError};}
}
const sessionInitializers={};
async function refreshRegionCoverage(){
 if(!TOKEN)return regionCoverage;
 try{const response=await fetch(`${COLLECTOR}/coverage`,{headers:headers(),cache:'no-store'});if(!response.ok)throw new Error(`Colector HTTP ${response.status}`);
  const coverage=await response.json();regionCoverage=coverage.regions&&typeof coverage.regions==='object'?coverage.regions:{};
  await chrome.storage.local.set({[STORE.regionCoverage]:regionCoverage});
 }catch(error){lastError='No se pudo actualizar el estado de exploración regional: '+String(error.message||error);}
 return regionCoverage;
}
function regionStatus(key){
 const state=regionCoverage[key];
 if(!state)return HarmoniaRegionPolicy.getRegionDescriptor(key).completionSupported?'exploring':'unmapped';
 if(state.status==='complete'&&state.policyVersion===HarmoniaRegionPolicy.POLICY_VERSION&&state.catalogVersion==='0.1.2')return 'complete';
 return state.status||'exploring';
}
async function ensureRegionLeader(regionKey,preferredTabId){
 if(regionStatus(regionKey)!=='complete')return null;
 const tabs=(await chrome.tabs.query({url:'https://chatgpt.com/*'})).filter(t=>regionFor(t.url)===regionKey);
 const candidate=HarmoniaRegionPolicy.chooseLeader(tabs,regionLeaders[regionKey],preferredTabId);
 if(candidate===null){delete regionLeaders[regionKey];await chrome.storage.local.set({[STORE.regionLeaders]:regionLeaders});return null;}
 if(regionLeaders[regionKey]!==candidate){regionLeaders[regionKey]=candidate;await chrome.storage.local.set({[STORE.regionLeaders]:regionLeaders});}
 return candidate;
}
async function canObserveTab(tab){
 if(!autoEnabled||!tab?.id||!valid(tab.url))return false;
 const key=regionFor(tab.url);if(regionStatus(key)!=='complete')return true;
 return (await ensureRegionLeader(key,tab.id))===tab.id;
}
async function reconcileRegionLeaders(regionKey,preferredTabId,refresh=false){
 if(!regionKey)return;if(refresh)await refreshRegionCoverage();
 if(regionStatus(regionKey)!=='complete'){
  delete regionLeaders[regionKey];await chrome.storage.local.set({[STORE.regionLeaders]:regionLeaders});
  return;
 }
 const tabs=(await chrome.tabs.query({url:'https://chatgpt.com/*'})).filter(t=>regionFor(t.url)===regionKey);
 const leader=HarmoniaRegionPolicy.chooseLeader(tabs,regionLeaders[regionKey],preferredTabId);
 if(leader===null){delete regionLeaders[regionKey];await chrome.storage.local.set({[STORE.regionLeaders]:regionLeaders});return;}
 regionLeaders[regionKey]=leader;await chrome.storage.local.set({[STORE.regionLeaders]:regionLeaders});
 for(const tab of tabs){if(!tab.id)continue;if(tab.id===leader){if(autoEnabled)await injectTab(tab,true);continue;}
  try{await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:standby-structure'});}catch{}
 }
}

async function ensureSession(tab){
 const key=String(tab.id),regionKey=regionFor(tab.url);
 if(sessionInitializers[key])return sessionInitializers[key];
 if(!autoEnabled||!tab?.id||!valid(tab.url))return null;
 if(sessions[key]&&sessions[key].regionKey===regionKey)return sessions[key];
 if(sessions[key])await stopSession(tab.id,'region-navigation');
 sessionInitializers[key]=(async()=>{
  const session={id:crypto.randomUUID(),startedAt:new Date().toISOString(),lastAt:null,events:0,url:safePageUrl(tab.url),regionKey};
  sessions[key]=session;await saveSessions();
  await postEvent(tab.id,session,'capture.started',{url:session.url,version:'0.4.0',mode:'automatic-interface-observation',regionKey,privacy:privacyContract()});
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
 const layout=p.layout&&typeof p.layout==='object'?p.layout:{},sanitizedLayout={};
 for(const key of ['main','composer','assistant']){
  const value=layout[key];if(!value||typeof value!=='object')continue;
  sanitizedLayout[key]={tag:boundedString(value.tag,24),role:boundedString(value.role,30),testId:boundedString(value.testId,70),
   classes:Array.isArray(value.classes)?value.classes.slice(0,5).map(x=>boundedString(x,50)):[],
   display:boundedString(value.display,24),position:boundedString(value.position,24),flexDirection:boundedString(value.flexDirection,24),overflow:boundedString(value.overflow,24),
   fontSize:boundedString(value.fontSize,16),width:Number(value.width||0),height:Number(value.height||0)};
 }
 return {catalogVersion:boundedString(p.catalogVersion,24),fingerprint:boundedString(p.fingerprint,64),
  regionKey:['conversation','home','project','gpt','search','share','other'].includes(p.regionKey)?p.regionKey:'other',
  regionPolicyVersion:boundedString(p.regionPolicyVersion,24),
  features:Array.isArray(p.features)?p.features.filter(x=>typeof x==='string'&&x.length<120).slice(0,100):[],controls,
  structure:sanitizeStructure(p.structure),stylesheets,
  viewport:p.viewport&&typeof p.viewport==='object'?{width:Number(p.viewport.width||0),height:Number(p.viewport.height||0),devicePixelRatio:Number(p.viewport.devicePixelRatio||1)}:null,
  layout:sanitizedLayout,
  counts:{controls:controls.length,userMessages:Number(p.counts?.userMessages||0),assistantMessages:Number(p.counts?.assistantMessages||0),styleSheets:Number(p.counts?.styleSheets||stylesheets.length)},
  privacy:{visibleMessageTextCaptured:true,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,hiddenReasoningCaptured:false,menusExcluded:true}};
}
function compactSurface(sanitized){
 return {catalogVersion:sanitized.catalogVersion,fingerprint:sanitized.fingerprint,regionKey:sanitized.regionKey,
  regionPolicyVersion:sanitized.regionPolicyVersion,features:sanitized.features,
  controlCount:sanitized.controls.length,nodeCount:sanitized.structure.total,stylesheetCount:sanitized.stylesheets.length,viewport:sanitized.viewport,
  privacy:{visibleMessageTextCaptured:true,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,hiddenReasoningCaptured:false,menusExcluded:true}};
}
async function processSurfaceScan(tab,session,payload){
 if(!(await canObserveTab(tab)))return false;
 payload.regionKey=regionFor(tab.url);payload.regionPolicyVersion=HarmoniaRegionPolicy.POLICY_VERSION;
 const sanitized=sanitizeScan(payload);
 if(!/^[0-9a-f]{64}$/.test(sanitized.fingerprint))throw new Error('La firma estructural no es válida.');
 const alreadyKnown=knownFingerprints.has(sanitized.fingerprint),type=alreadyKnown?'ui.surface.reused':'ui.surface.scan';
 const response=await postEvent(tab.id,session,type,alreadyKnown?compactSurface(sanitized):sanitized,'page-observer');
 if(!response.ok)return false;
 await rememberFingerprint(sanitized.fingerprint);
 if(response.regionExploration&&typeof response.regionExploration==='object'){
  const key=payload.regionKey||regionFor(tab.url);regionCoverage[key]=response.regionExploration;
  await chrome.storage.local.set({[STORE.regionCoverage]:regionCoverage});await reconcileRegionLeaders(key,tab.id);
 }
 return true;
}
async function onObservedEvent(message,sender){
 const tab=sender.tab;if(!autoEnabled||!tab?.id||!valid(tab.url))return false;
 const type=String(message?.event?.type||'');
 if(!['ui.surface.scan','conversation.visible.delta','console.observed'].includes(type))return false;
 const session=await ensureSession(tab);if(!session)return false;
 const payload=message.event.payload||{},regionKey=regionFor(tab.url);
 const isStructuralObserver=type==='ui.surface.scan'?await canObserveTab(tab):false;
 if(!HarmoniaRegionPolicy.canObserveEvent(regionStatus(regionKey),isStructuralObserver,type)){
  if(type==='ui.surface.scan'){try{await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:standby-structure'});}catch{}}
  return false;
 }
 if(type==='ui.surface.scan'){
  const next=surfaceQueue.then(()=>processSurfaceScan(tab,session,payload),()=>processSurfaceScan(tab,session,payload));
  surfaceQueue=next.catch(error=>{lastError=String(error.message||error);});return next;
 }
 payload.regionKey=regionKey;return (await postEvent(tab.id,session,type,payload,'page-observer')).ok;
}
async function stopSession(tabId,reason){
 const key=String(tabId),session=sessions[key];if(!session)return;
 await postEvent(tabId,session,'capture.stopped',{reason,durationMs:Date.now()-Date.parse(session.startedAt)});
 delete sessions[key];await saveSessions();
}
function installConsoleBridgeMainWorld(){
 if(window.__harmoniaConsoleBridgeV1?.installed)return;
 const originals={},handlers=[];
 const redact=value=>String(value||'').slice(0,4000)
  .replace(/\bBearer\s+[^\s]+/gi,'Bearer [REDACTED]')
  .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g,'[REDACTED_KEY]')
  .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,'[REDACTED_JWT]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[REDACTED_EMAIL]')
  .replace(/([?&](?:token|key|auth|code|session|password|secret)=)[^&#\s]+/gi,'$1[REDACTED]');
 const emit=(level,entries)=>{try{window.dispatchEvent(new CustomEvent('harmonia:console-observed',{detail:{level,entries:entries.slice(0,10),observedAt:Date.now()}}));}catch{}};
 const summarize=value=>{
  if(value instanceof Error)return {type:'Error',value:redact(value.name+': '+value.message+' '+String(value.stack||'')).slice(0,2000)};
  if(typeof value==='string')return {type:'string',value:redact(value).slice(0,1000)};
  if(value===null)return {type:'null',value:'null'};
  if(['number','boolean','undefined','bigint','symbol'].includes(typeof value))return {type:typeof value,value:redact(value).slice(0,120)};
  if(typeof value==='object')return {type:Array.isArray(value)?'array':'object',value:'keys='+Object.keys(value).slice(0,20).join(',')};
  return {type:typeof value,value:''};
 };
 for(const level of ['log','info','warn','error','debug']){
  if(typeof console[level]!=='function')continue;
  originals[level]=console[level];const original=console[level].bind(console);
  console[level]=function(...args){emit(level,args.slice(0,10).map(summarize));return original(...args);};
 }
 const onError=event=>emit('error',[{type:'uncaught-error',value:redact(event?.message||'Uncaught page error').slice(0,2000)}]);
 const onRejection=event=>{
  const reason=event?.reason;
  const value=reason instanceof Error?reason.name+': '+reason.message:(typeof reason==='string'?reason:(reason&&typeof reason==='object'?'Promise rejection object keys='+Object.keys(reason).slice(0,20).join(','):String(reason)));
  emit('error',[{type:'unhandled-rejection',value:redact(value).slice(0,2000)}]);
 };
 window.addEventListener('error',onError);handlers.push(['error',onError]);
 window.addEventListener('unhandledrejection',onRejection);handlers.push(['unhandledrejection',onRejection]);
 Object.defineProperty(window,'__harmoniaConsoleBridgeV1',{configurable:true,value:{installed:true,originals,handlers}});
}
async function removeConsoleBridge(tabId){
 try{await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:function(){
  const bridge=window.__harmoniaConsoleBridgeV1;if(!bridge)return;
  for(const [level,original] of Object.entries(bridge.originals||{}))try{console[level]=original;}catch{}
  for(const [name,handler] of bridge.handlers||[])try{window.removeEventListener(name,handler);}catch{}
  try{delete window.__harmoniaConsoleBridgeV1;}catch{}
 }});}catch{}
}
async function injectTab(tab,force=false){
 if(!autoEnabled||!tab?.id||!valid(tab.url))return;
 const structureObserver=force?true:await canObserveTab(tab);
 try{
  await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:installConsoleBridgeMainWorld});
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['region-policy.js','content.js']});
  await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:start',automatic:true,regionKey:regionFor(tab.url),structureObserver});
 }catch(error){lastError='No se pudo activar observación en una pestaña: '+String(error.message||error);}
}
async function injectExistingTabs(tabs){for(const tab of tabs||[]){if(valid(tab.url))await injectTab(tab);}}
async function setAutoEnabled(value){
 await ready;autoEnabled=!!value;await chrome.storage.local.set({[STORE.enabled]:autoEnabled});
 const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
 if(autoEnabled)await injectExistingTabs(tabs);
 else for(const tab of tabs){if(!tab.id)continue;try{await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:stop'});}catch{}await stopSession(tab.id,'automatic-capture-paused');await removeConsoleBridge(tab.id);}
 return {autoEnabled,activeTabs:Object.keys(sessions).length};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 (async()=>{
  await ready;
  if(message.kind==='harmonia:auto-settings')return {enabled:autoEnabled,observe:autoEnabled?await canObserveTab(sender.tab):false,regionKey:sender.tab?.url?regionFor(sender.tab.url):null};
  if(message.kind==='harmonia:open-dashboard'){
   const url=chrome.runtime.getURL('dashboard.html'),tabs=await chrome.tabs.query({url});
   if(tabs[0]?.id){await chrome.tabs.update(tabs[0].id,{active:true});return {opened:true,reused:true,tabId:tabs[0].id};}
   const tab=await chrome.tabs.create({url});return {opened:true,reused:false,tabId:tab.id};
  }
  if(message.kind==='harmonia:sync-repository')return syncRepository();
  if(message.kind==='harmonia:get'){
   await checkHealth();await refreshRegionCoverage();
   const syncData=await chrome.storage.local.get([STORE.repositorySync]);
   let coverage=null;
   if(collector){try{const response=await fetch(`${COLLECTOR}/coverage`,{headers:headers(),cache:'no-store'});if(response.ok)coverage=await response.json();else throw new Error(`Colector HTTP ${response.status}`);}catch(error){lastError=String(error.message||error);}}
   return {version:'0.4.0',autoEnabled,active:autoEnabled&&Object.keys(sessions).length>0,activeTabs:Object.keys(sessions).length,
    sessions:Object.entries(sessions).map(([tabId,session])=>({tabId,startedAt:session.startedAt,lastAt:session.lastAt,events:session.events,regionKey:session.regionKey})),
    regionCoverage,regionLeaders,collector,collectorHealth:collectorHealth?{updatedAt:collectorHealth.updatedAt,totalBytes:collectorHealth.totalBytes,uniqueSurfaces:collectorHealth.uniqueSurfaces,sessions:collectorHealth.sessions}:null,lastError,events:eventCount,coverage,repositorySync:syncData[STORE.repositorySync]||null};
  }
  if(message.kind==='harmonia:set-auto')return setAutoEnabled(message.enabled);
  if(message.kind==='harmonia:event'&&sender.tab?.id)return onObservedEvent(message,sender);
  throw new Error('Mensaje no reconocido.');
 })().then(value=>respond({ok:true,value})).catch(error=>respond({ok:false,error:String(error.message||error)}));
 return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{void ready.then(async()=>{
 const previous=sessions[String(tabId)],regionKey=previous?.regionKey;await stopSession(tabId,'tab-closed');if(regionKey)await reconcileRegionLeaders(regionKey,undefined,true);
});});
chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab)=>{void ready.then(async()=>{
 if(!changeInfo.url||!tab?.url)return;
 const previous=sessions[String(tabId)],oldRegion=previous?.regionKey;
 if(!valid(tab.url)){await stopSession(tabId,'tab-left-chatgpt');await removeConsoleBridge(tabId);if(oldRegion)await reconcileRegionLeaders(oldRegion,undefined,true);return;}
 const nextRegion=regionFor(tab.url);
 if(oldRegion&&oldRegion!==nextRegion)await stopSession(tabId,'region-navigation');
 if(autoEnabled)await injectTab(tab);
 if(oldRegion&&oldRegion!==nextRegion)await reconcileRegionLeaders(oldRegion,undefined,true);
 await reconcileRegionLeaders(nextRegion,tabId,true);
});});
void ready.then(async()=>{if(autoEnabled){const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});await injectExistingTabs(tabs);for(const key of Object.keys(regionCoverage))await reconcileRegionLeaders(key);}});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===REPO_SYNC_ALARM)void syncRepository();});
chrome.runtime.onInstalled.addListener(()=>{void ready.then(async()=>{chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});await syncRepository();if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});});
chrome.runtime.onStartup.addListener(()=>{void ready.then(async()=>{chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});await syncRepository();if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});});
