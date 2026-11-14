try { importScripts('local-auth.js'); } catch {}
importScripts('front-activity.js');
const COLLECTOR='http://127.0.0.1:47321';
const TOKEN=String(globalThis.HARMONIA_TOKEN||'');
const STORE={sessions:'harmoniaAutoSessions',enabled:'harmoniaAutoEnabled',events:'harmoniaEventCount',fingerprints:'harmoniaKnownSurfaceFingerprints',repositorySync:'harmoniaRepositorySync',outbox:'harmoniaPendingEvents',legacyTemporalQuarantine:'harmoniaLegacyTemporalQuarantine',frontAssignments:'harmoniaFrontAssignments'};
const REPO_BUILD_INFO='https://raw.githubusercontent.com/SeryMente/khora/main/Harmonia/Extension/build-info.json';
const REPO_CATALOG='https://raw.githubusercontent.com/SeryMente/khora/main/Harmonia/coverage-catalog.json';
const REPO_SYNC_ALARM='harmonia-repository-sync';
const OUTBOX_FLUSH_ALARM='harmonia-outbox-flush';
const FRAMEWORK_REVISION='HARMONIA-v0.6.0+DUG-v396-NX-396m';
let sessions={};
let frontAssignments={};
let frontRegistry=[];
let autoEnabled=true;
let eventCount=0;
let lastError=null;
let collector=false;
let knownFingerprints=new Set();
let surfaceQueue=Promise.resolve();
let activityQueue=Promise.resolve();
let outbox=[];
let legacyTemporalQuarantine=[];
let temporalQuarantineBlocked=false;
let outboxQueue=Promise.resolve();
let flushPromise=null;
const MAX_OUTBOX_EVENTS=1500;
const MAX_OUTBOX_BYTES=4*1024*1024;
const MAX_ACTIVITY_DIAGNOSTICS_PER_SESSION=96;
const LEGACY_TEMPORAL_EVENT_TYPES=new Set(['client.cycle.started','client.cycle.completed','diag.cycle.trace']);
const LEGACY_TEMPORAL_FIELD_KEYS=new Set([
 'durationMs','duration_ms','legacyDurationMs','legacy_duration_ms',
 'elapsed_ms','elapsedMs','monotonic_ms','monotonicMs',
 'clock_precision_ms','clockPrecisionMs','settle_window_ms','settleWindowMs',
 'meanMs','medianMs','p90Ms','legacyMedianMs','legacyP90Ms',
 'latencyMs','latency_ms','waitMs','wait_ms','processingDuration','processing_ms'
]);
function containsLegacyTemporalField(value){
 if(Array.isArray(value))return value.some(containsLegacyTemporalField);
 if(!value||typeof value!=='object')return false;
 for(const [key,child] of Object.entries(value)){
  if(LEGACY_TEMPORAL_FIELD_KEYS.has(key)||containsLegacyTemporalField(child))return true;
 }
 return false;
}
function isLegacyTemporalEvent(event){
 return !!event&&typeof event==='object'&&(
  LEGACY_TEMPORAL_EVENT_TYPES.has(String(event.type||''))||
  String(event.type||'').startsWith('client.cycle.')||
  String(event.type||'').startsWith('diag.cycle.')||
  containsLegacyTemporalField(event.payload)
 );
}
function quarantineIdentity(event){
 return typeof event?.eventId==='string'&&event.eventId?event.eventId:JSON.stringify(event);
}
async function persistTemporalQuarantine(events){
 const next=[...legacyTemporalQuarantine];
 const known=new Set(next.map(quarantineIdentity));
 for(const event of events||[]){
  if(!isLegacyTemporalEvent(event))continue;
  const key=quarantineIdentity(event);
  if(known.has(key))continue;
  next.push(event);known.add(key);
 }
 if(next.length===legacyTemporalQuarantine.length)return true;
 try{
  await chrome.storage.local.set({[STORE.legacyTemporalQuarantine]:next});
  legacyTemporalQuarantine=next;
  return true;
 }catch(error){
  temporalQuarantineBlocked=true;
  lastError='La cuarentena local de telemetría temporal no se pudo persistir; los eventos permanecen bloqueados sin envío: '+String(error.message||error);
  return false;
 }
}
async function quarantineLegacyTemporalOutbox(){
 const legacy=outbox.filter(isLegacyTemporalEvent);
 if(!legacy.length){temporalQuarantineBlocked=false;return 0;}
 const active=outbox.filter(event=>!isLegacyTemporalEvent(event));
 const next=[...legacyTemporalQuarantine];
 const known=new Set(next.map(quarantineIdentity));
 for(const event of legacy){const key=quarantineIdentity(event);if(!known.has(key)){next.push(event);known.add(key);}}
 try{
  await chrome.storage.local.set({
   [STORE.legacyTemporalQuarantine]:next,
   [STORE.outbox]:active
  });
  legacyTemporalQuarantine=next;
  outbox=active;
  temporalQuarantineBlocked=false;
  lastError='Se preservaron '+legacy.length+' eventos temporales heredados en cuarentena local; no serán enviados al colector.';
  return legacy.length;
 }catch(error){
  temporalQuarantineBlocked=true;
  lastError='No se pudo persistir la cuarentena de eventos temporales heredados; el envío queda bloqueado y la cola original permanece intacta: '+String(error.message||error);
  return 0;
 }
}
const ready=(async()=>{
  const saved=await chrome.storage.local.get([STORE.sessions,STORE.enabled,STORE.events,STORE.fingerprints,STORE.outbox,STORE.legacyTemporalQuarantine,STORE.frontAssignments]);
  sessions=saved[STORE.sessions]||{};
  autoEnabled=saved[STORE.enabled]!==false;
  eventCount=Number(saved[STORE.events]||0);
  knownFingerprints=new Set(Array.isArray(saved[STORE.fingerprints])?saved[STORE.fingerprints]:[]);
  outbox=Array.isArray(saved[STORE.outbox])?saved[STORE.outbox].filter(event=>event&&typeof event==='object'):[];
  legacyTemporalQuarantine=Array.isArray(saved[STORE.legacyTemporalQuarantine])?saved[STORE.legacyTemporalQuarantine].filter(event=>event&&typeof event==='object'):[];
  await quarantineLegacyTemporalOutbox();
  frontAssignments=saved[STORE.frontAssignments]&&typeof saved[STORE.frontAssignments]==='object'?saved[STORE.frontAssignments]:{};
  frontRegistry=await loadFrontRegistry();
  await chrome.storage.local.set({[STORE.enabled]:autoEnabled});
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
  const live=new Set(tabs.filter(tab=>tab.id&&valid(tab.url)).map(tab=>String(tab.id)));
  for(const key of Object.keys(sessions))if(!live.has(key))delete sessions[key];
  await saveSessions();
  // Catalog and collector checks run after local readiness, never before injection.
  chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});
  chrome.alarms.create(OUTBOX_FLUSH_ALARM,{delayInMinutes:1,periodInMinutes:1});
})();
void ready.then(()=>{
  // La captura local y la inyección no dependen de la red ni del colector.
  void refreshKnownFingerprints().catch(error=>{lastError='No se pudo restaurar el índice de superficies: '+String(error.message||error);});
  void syncRepository().catch(error=>{lastError='No se pudo sincronizar el catálogo: '+String(error.message||error);});
  void checkHealth().catch(error=>{lastError='No se pudo comprobar el colector: '+String(error.message||error);});
}).catch(error=>{lastError='No se pudo completar la inicialización local de Harmonia: '+String(error.message||error);});
let storageQueue=Promise.resolve();
function saveSessions(){
 const snapshot=Object.fromEntries(Object.entries(sessions).map(([key,session])=>[key,{...session}]));
 const state={[STORE.sessions]:snapshot,[STORE.enabled]:autoEnabled,[STORE.events]:eventCount};
 storageQueue=storageQueue.then(()=>chrome.storage.local.set(state));
 return storageQueue;
}
function headers(extra={}){return {...extra,'x-harmonia-token':TOKEN};}
async function loadFrontRegistry(){
 try{
  const response=await fetch(chrome.runtime.getURL('front-registry.json'),{cache:'no-store'});
  if(!response.ok)throw new Error('front-registry-http-'+response.status);
  const value=await response.json();
  if(value?.schema!=='harmonia.front-registry.v1'||!Array.isArray(value.fronts))throw new Error('front-registry-schema-invalid');
  return value.fronts.filter(front=>front&&HarmoniaFrontActivity.FRONT_ID.test(String(front.id||''))&&typeof front.name==='string'&&front.name.length<=100);
 }catch(error){lastError='No se pudo cargar el catálogo de frentes: '+String(error.message||error);return [];}
}
function conversationFromTab(tab){
 return HarmoniaFrontActivity.parseConversationUrl(tab?.url||'');
}
function outboxByteLength(events=outbox){
 return new TextEncoder().encode(JSON.stringify(events)).length;
}
function enqueueEvent(event){
 const job=outboxQueue.then(async()=>{
  if(isLegacyTemporalEvent(event))return persistTemporalQuarantine([event]);
  if(outbox.some(item=>item.eventId===event.eventId))return true;
  const candidate=[...outbox,event];
  if(candidate.length>MAX_OUTBOX_EVENTS||outboxByteLength(candidate)>MAX_OUTBOX_BYTES){
   lastError='La cola local de Harmonia alcanzó su límite; se preservaron los eventos anteriores y el nuevo evento no pudo guardarse.';
   return false;
  }
  await chrome.storage.local.set({[STORE.outbox]:candidate});
  outbox=candidate;
  return true;
 });
 outboxQueue=job.then(()=>undefined,()=>undefined);
 return job;
}
async function flushOutbox(){
 if(!TOKEN||!collector||!outbox.length)return 0;
 if(flushPromise)return flushPromise;
 flushPromise=(async()=>{
  let sent=0;
  await outboxQueue;
  await quarantineLegacyTemporalOutbox();
  if(temporalQuarantineBlocked)return 0;
  while(outbox.length){
   const event=outbox[0];
   if(isLegacyTemporalEvent(event)){
    await quarantineLegacyTemporalOutbox();
    if(temporalQuarantineBlocked)break;
    continue;
   }
   let response;
   try{
    response=await fetch(COLLECTOR+'/events',{method:'POST',headers:headers({'content-type':'application/json'}),body:JSON.stringify(event)});
   }catch(error){collector=false;lastError='Cola local pendiente: '+String(error.message||error);break;}
   if(!response.ok){
    let rejectionCode=null;
    try{
     const rejection=await response.json();
     if(typeof rejection?.error==='string'&&/^[a-z0-9-]{1,80}$/i.test(rejection.error))rejectionCode=rejection.error;
    }catch{}
    lastError='Cola local pendiente: el colector respondió HTTP '+response.status+(rejectionCode?' ('+rejectionCode+')':'');
    break;
   }
   const next=outbox.slice(1);
   try{await chrome.storage.local.set({[STORE.outbox]:next});}
   catch(error){lastError='El colector aceptó un evento, pero no se pudo confirmar su retirada de la cola local: '+String(error.message||error);break;}
   outbox=next;
   eventCount++;
   sent++;
  }
  if(sent>0){await saveSessions();lastError=outbox.length?'Hay eventos locales pendientes de sincronización.':null;}
  return sent;
 })().catch(error=>{lastError=String(error.message||error);return 0;}).finally(()=>{flushPromise=null;});
 return flushPromise;
}
function summarizePendingActivity(){
 const events=outbox.filter(event=>event&&event.type==='ui.activity.state');
 const byState={ACTIVE:0,INACTIVE:0};
 const byTransition={INITIALIZED:0,ACTIVATED:0,DEACTIVATED:0};
 for(const event of events){
  const payload=event.payload||{};
  if(Object.prototype.hasOwnProperty.call(byState,payload.state))byState[payload.state]++;
  if(Object.prototype.hasOwnProperty.call(byTransition,payload.transition))byTransition[payload.transition]++;
 }
 const latest=[...events].sort((a,b)=>String(b.capturedAt||'').localeCompare(String(a.capturedAt||'')))[0];
 return {schema:'harmonia.activity-summary.v1',source:'local-outbox',totalCount:events.length,
  activeStates:byState.ACTIVE,inactiveStates:byState.INACTIVE,transitions:byTransition,
  lastState:['ACTIVE','INACTIVE'].includes(latest?.payload?.state)?latest.payload.state:null,
  lastTransition:['INITIALIZED','ACTIVATED','DEACTIVATED'].includes(latest?.payload?.transition)?latest.payload.transition:null,
  lastCapturedAt:latest?.capturedAt||null};
}
function summarizePendingActivityDiagnostics(){
 const traces=outbox.filter(event=>event&&event.type==='diag.activity.trace');
 const byStage={};
 for(const event of traces){const stage=event.payload?.stage;if(typeof stage==='string')byStage[stage]=(byStage[stage]||0)+1;}
 const latest=[...traces].sort((a,b)=>String(b.capturedAt||'').localeCompare(String(a.capturedAt||'')))[0];
 return {schema:'harmonia.activity-diagnostics-summary.v1',source:'local-outbox',totalCount:traces.length,
  byStage,lastCapturedAt:latest?.capturedAt||null,lastStage:latest?.payload?.stage||null};
}function summarizePendingCoverage(){
 const scans=outbox.filter(event=>event&&['ui.surface.scan','ui.surface.reused'].includes(event.type));
 const features=new Set();
 for(const event of scans)for(const feature of event.payload?.features||[])if(typeof feature==='string')features.add(feature);
 const fingerprints=new Set(scans.map(event=>event.payload?.fingerprint).filter(value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value)));
 const latest=[...scans].sort((a,b)=>Date.parse(b.capturedAt||b.payload?.timestamp_utc||'')-Date.parse(a.capturedAt||a.payload?.timestamp_utc||''))[0];
 return {schema:'harmonia.coverage.local.v1',source:'local-outbox',scanCount:scans.length,uniqueSurfaceCount:fingerprints.size,
  observedFeatureIds:[...features].sort(),unknownControlCount:null,lastScanAt:latest?.capturedAt||latest?.payload?.timestamp_utc||null};
}
function valid(url=''){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='chatgpt.com';}catch{return false;}}
function safePageUrl(raw){try{const u=new URL(raw);return u.origin+u.pathname.replace(/\/c\/[^/]+/,'/c/[conversation]').replace(/\/g\/[^/]+/,'/g/[gpt]');}catch{return 'https://chatgpt.com/';}}
async function checkHealth(){
  if(!TOKEN){collector=false;lastError=outbox.length?'Cola local activa; el colector aún no está inicializado.':null;return false;}
  try{const response=await fetch(`${COLLECTOR}/health`,{headers:headers(),cache:'no-store'});collector=response.ok;lastError=response.ok?null:`Colector respondió HTTP ${response.status}`;}
  catch(error){collector=false;lastError=String(error.message||error);}
  if(collector)await flushOutbox();
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
  if(!localResponse.ok||!remoteCatalogResponse.ok)throw new Error('No se pudieron leer los metadatos locales o el catálogo remoto.');
  const localBuild=await localResponse.json();
  const remoteCatalog=await remoteCatalogResponse.json();
  let remoteBuild=null;
  if(remoteBuildResponse.ok)remoteBuild=await remoteBuildResponse.json();
  else if(remoteBuildResponse.status!==404)throw new Error('No se pudieron leer los metadatos de versión desde main.');
  if(localBuild.schema!=='harmonia.repository-build.v1')throw new Error('Los metadatos locales de versión no superaron la validación.');
  if(remoteBuild&&(remoteBuild.schema!=='harmonia.repository-build.v1'||typeof remoteBuild.sourceRevision!=='string'||!/^([0-9a-f]{7,40})$/i.test(remoteBuild.sourceRevision)))throw new Error('Los metadatos remotos de versión no superaron la validación.');
  if(remoteCatalog.schema!=='harmonia.coverage-catalog.v1'||!Array.isArray(remoteCatalog.features)||!Array.isArray(remoteCatalog.sources))throw new Error('El catálogo del repositorio tiene un esquema inesperado.');
  const manifest=chrome.runtime.getManifest();
  const localVersion=String(manifest.version||localBuild.version||'0.0.0');
  const remoteVersion=remoteBuild?String(remoteBuild.version||'0.0.0'):null;
  const codeUpdateAvailable=remoteBuild?(compareVersions(remoteVersion,localVersion)>0||String(remoteBuild.sourceRevision)!==String(localBuild.sourceRevision)):null;
  const catalogUpdateAvailable=String(remoteCatalog.version)!==String(localBuild.catalogVersion||'')||JSON.stringify(remoteCatalog)!==JSON.stringify(previous.catalog||null);
  const status=!remoteBuild?'catalog-only':codeUpdateAvailable?'update-available':catalogUpdateAvailable?'catalog-updated':'current';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(remoteCatalog)));
  const catalogSha256=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const state={schema:'harmonia.repository-sync.v1',repository:'SeryMente/khora',branch:'main',sourcePath:'Harmonia',
   status,checkedAt,lastSuccessfulSyncAt:checkedAt,localVersion,remoteVersion,localRevision:String(localBuild.sourceRevision),remoteRevision:remoteBuild?String(remoteBuild.sourceRevision):null,
   updateAvailable:codeUpdateAvailable,catalogUpdateAvailable,metadataUnavailable:!remoteBuild,catalogVersion:String(remoteCatalog.version||''),catalogSha256,catalog:remoteCatalog,error:null,
   policy:'Solo sincroniza metadatos y catálogo JSON validados; nunca descarga ni ejecuta JavaScript remoto. Si main no publica build-info.json, la sincronización queda limitada al catálogo.'};
  await chrome.storage.local.set({[STORE.repositorySync]:state});
  return state;
 }catch(error){
  const state={...previous,schema:'harmonia.repository-sync.v1',repository:'SeryMente/khora',branch:'main',status:'error',checkedAt,
   lastSuccessfulSyncAt:previous.lastSuccessfulSyncAt||null,error:String(error.message||error),
   policy:'Solo sincroniza metadatos y catálogo JSON validados; nunca descarga ni ejecuta JavaScript remoto.'};
  await chrome.storage.local.set({[STORE.repositorySync]:state});
  return state;
 }
}async function refreshKnownFingerprints(){
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
 const activityType=type==='ui.activity.state';
 const diagnosticType=type==='diag.activity.trace';
 const frontType=type==='front.assignment'||type==='front.activity';
 const event={schema:'harmonia.event.v1',eventId:crypto.randomUUID(),sessionId:session.id,...(frontType?{conversation:payload.conversation_id}:activityType||diagnosticType?{}:{conversation:'tab-'+tabId}),type,source,capturedAt:type==='front.activity'?payload.updated_at:type==='front.assignment'?payload.assigned_at:new Date().toISOString(),payload};
 if(!TOKEN){
  collector=false;
  const stored=await enqueueEvent(event);
  return stored?{ok:true,storedType:'local.outbox',pending:true,eventId:event.eventId,delivery:'queued_outbox',http_status_class:'none'}:{ok:false,error:lastError,delivery:'network_error',http_status_class:'none'};
 }
 let response;
 try{
  response=await fetch(COLLECTOR+'/events',{method:'POST',headers:headers({'content-type':'application/json'}),body:JSON.stringify(event)});
 }catch(error){
  collector=false;
  const stored=await enqueueEvent(event);
  lastError=stored?'Cola local pendiente: '+String(error.message||error):String(error.message||error);
  return stored?{ok:true,storedType:'local.outbox',pending:true,eventId:event.eventId,delivery:'network_error',http_status_class:'none'}:{ok:false,error:lastError,delivery:'network_error',http_status_class:'none'};
 }
 if(!response.ok){
  collector=false;
  const delivery=response.status>=500?'http_5xx':'http_4xx';
  const statusClass=response.status>=500?'5xx':'4xx';
  if(diagnosticType&&response.status<500){
   lastError='El colector rechazó una traza diagnóstica HTTP '+response.status;
   return {ok:false,error:lastError,delivery,http_status_class:statusClass};
  }
  const stored=await enqueueEvent(event);
  lastError='Cola local pendiente: el colector respondió HTTP '+response.status;
  return stored?{ok:true,storedType:'local.outbox',pending:true,eventId:event.eventId,delivery,http_status_class:statusClass}:{ok:false,error:lastError,delivery,http_status_class:statusClass};
 }
 const ack=await response.json().catch(()=>({}));
 collector=true;lastError=null;eventCount++;session.events=(session.events||0)+1;session.lastAt=event.capturedAt;
 await saveSessions();
 return {ok:true,storedType:ack.storedType||type,deduplicated:!!ack.deduplicated,eventId:event.eventId,delivery:'posted',http_status_class:'2xx'};
}
const sessionInitializers={};
async function ensureSession(tab){
 const key=String(tab.id);
 if(sessionInitializers[key])return sessionInitializers[key];
 if(sessions[key]){if(!Number.isInteger(sessions[key].diagnosticCount))sessions[key].diagnosticCount=0;return sessions[key];}
 if(!autoEnabled||!tab?.id||!valid(tab.url))return null;
 sessionInitializers[key]=(async()=>{
  const session={id:crypto.randomUUID(),startedAt:new Date().toISOString(),lastAt:null,events:0,diagnosticCount:0,url:safePageUrl(tab.url)};
  sessions[key]=session;await saveSessions();
  await postEvent(tab.id,session,'capture.started',{url:session.url,version:'0.6.0',mode:'automatic-interface-architecture',privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menuContentCaptured:false,dialogContentCaptured:false}});
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
const AUXILIARY_REGION_KINDS=new Set(['navigation','sidebar','global-header','menu','listbox','dialog','popover','tool-picker','selector','model-selector']);
const AUXILIARY_FEATURES=new Set(['navigation.primary-region','navigation.sidebar-region','surface.global-header','surface.menu','surface.listbox','surface.dialog','surface.popover','composer.tool-picker-surface','surface.selector','composer.model-selector']);
const AUXILIARY_ROLES=new Set(['navigation','banner','menu','menuitem','menubar','listbox','option','dialog','combobox','button','tab','tablist','tree','treeitem','list','listitem','group','region','toolbar','search','presentation']);
const AUXILIARY_POPUPS=new Set(['true','false','menu','listbox','tree','grid','dialog']);
function structuralToken(value,max=80){
 if(typeof value!=='string'||value.length>max||!/^[A-Za-z0-9_.:-]{1,80}$/.test(value))return null;
 return value;
}
function sanitizeAuxiliarySurfaces(raw){
 const features=Array.isArray(raw?.features)?[...new Set(raw.features.filter(value=>AUXILIARY_FEATURES.has(value)))].sort():[];
 const regions=Array.isArray(raw?.regions)?raw.regions.slice(0,10).filter(region=>AUXILIARY_REGION_KINDS.has(region?.kind)).map(region=>{
  const count=Math.max(0,Math.min(1000,Number.isFinite(Number(region.count))?Math.trunc(Number(region.count)):0));
  const samples=Array.isArray(region.samples)?region.samples.slice(0,8).map(sample=>({
   tag:typeof sample?.tag==='string'&&/^[a-z][a-z0-9-]{0,23}$/.test(sample.tag)?sample.tag:'unknown',
   role:typeof sample?.role==='string'&&AUXILIARY_ROLES.has(sample.role)?sample.role:null,
   testId:structuralToken(sample?.testId),
   classes:Array.isArray(sample?.classes)?sample.classes.slice(0,4).map(value=>structuralToken(value,40)).filter(Boolean):[],
   childCount:Math.max(0,Math.min(10000,Number.isFinite(Number(sample?.childCount))?Math.trunc(Number(sample.childCount)):0)),
   visible:sample?.visible===true,
   expanded:sample?.expanded===true?true:sample?.expanded===false?false:null,
   hasPopup:typeof sample?.hasPopup==='string'&&AUXILIARY_POPUPS.has(sample.hasPopup)?sample.hasPopup:null,
   modal:sample?.modal===true,
   disabled:sample?.disabled===true
  })): [];
  return {kind:region.kind,count,visibleCount:Math.max(0,Math.min(count,Number.isFinite(Number(region.visibleCount))?Math.trunc(Number(region.visibleCount)):0)),samples,truncated:region.truncated===true||count>samples.length};
 }):[];
 return {schema:'harmonia.auxiliary-ui-surfaces.v1',features,regions,privacy:{textCaptured:false,labelsCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,contentCaptured:false}};
}
function summarizeAuxiliarySurfaces(value){
 return {schema:'harmonia.auxiliary-ui-surfaces.v1',features:value.features,regions:value.regions.map(region=>({kind:region.kind,count:region.count,visibleCount:region.visibleCount,truncated:region.truncated})),privacy:{textCaptured:false,labelsCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,contentCaptured:false}};
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
  features:Array.isArray(p.features)?p.features.filter(x=>typeof x==='string'&&x.length<120).slice(0,100):[],auxiliarySurfaces:sanitizeAuxiliarySurfaces(p.auxiliarySurfaces),controls,
  structure:sanitizeStructure(p.structure),stylesheets,
  viewport:p.viewport&&typeof p.viewport==='object'?{width:Number(p.viewport.width||0),height:Number(p.viewport.height||0),devicePixelRatio:Number(p.viewport.devicePixelRatio||1)}:null,
  layout:sanitizedLayout,
  counts:{controls:controls.length,userMessages:Number(p.counts?.userMessages||0),assistantMessages:Number(p.counts?.assistantMessages||0),styleSheets:Number(p.counts?.styleSheets||stylesheets.length)},
  privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,labelsCaptured:false,navigationTextCaptured:false,menuContentCaptured:false,dialogContentCaptured:false}};
}
function compactSurface(sanitized){
 return {catalogVersion:sanitized.catalogVersion,fingerprint:sanitized.fingerprint,features:sanitized.features,
  controlCount:sanitized.controls.length,nodeCount:sanitized.structure.total,stylesheetCount:sanitized.stylesheets.length,viewport:sanitized.viewport,
  auxiliarySurfaces:summarizeAuxiliarySurfaces(sanitized.auxiliarySurfaces),
  privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,labelsCaptured:false,navigationTextCaptured:false,menuContentCaptured:false,dialogContentCaptured:false}};
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
function boundedActivityCount(value){return Number.isInteger(value)&&value>=0&&value<=500?value:null;}
function sanitizeActivityPayload(payload){
 const keys=['state','transition','signal_ids','main_present','main_candidate_count','user_message_count','assistant_message_count'];
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('activity-payload-invalid');
 const actual=Object.keys(payload).sort(),expected=[...keys].sort();
 if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new Error('activity-payload-unapproved-fields');
 if(!['ACTIVE','INACTIVE'].includes(payload.state))throw new Error('activity-state-invalid');
 if(!['INITIALIZED','ACTIVATED','DEACTIVATED'].includes(payload.transition))throw new Error('activity-transition-invalid');
 if(payload.transition==='ACTIVATED'&&payload.state!=='ACTIVE')throw new Error('activity-transition-state-mismatch');
 if(payload.transition==='DEACTIVATED'&&payload.state!=='INACTIVE')throw new Error('activity-transition-state-mismatch');
 if(typeof payload.main_present!=='boolean')throw new Error('activity-main-present-invalid');
 const mainCount=boundedActivityCount(payload.main_candidate_count);
 const userCount=boundedActivityCount(payload.user_message_count);
 const assistantCount=boundedActivityCount(payload.assistant_message_count);
 if(mainCount===null||userCount===null||assistantCount===null)throw new Error('activity-count-invalid');
 const allowed=['aria-busy','data-is-streaming','stop-control','agent-progress'];
 if(!Array.isArray(payload.signal_ids)||payload.signal_ids.length>4||payload.signal_ids.some((id,index)=>!allowed.includes(id)||payload.signal_ids.indexOf(id)!==index))throw new Error('activity-signals-invalid');
 return {state:payload.state,transition:payload.transition,signal_ids:[...payload.signal_ids].sort(),main_present:payload.main_present,main_candidate_count:mainCount,user_message_count:userCount,assistant_message_count:assistantCount};
}
function sanitizeActivityDiagnosticPayload(payload,sequence){
 const allowed=['stage','main_present','main_candidate_count','state','signal_ids','transition','user_message_count','assistant_message_count','sink_result'];
 const stages=['observer_started','main_state','signal_state','activity_transition','worker_ack'];
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('activity-diagnostic-invalid');
 const actual=Object.keys(payload);
 if(actual.some(key=>!allowed.includes(key))||!stages.includes(payload.stage))throw new Error('activity-diagnostic-unapproved-fields');
 const result={sequence,stage:payload.stage};
 if('main_present' in payload){if(typeof payload.main_present!=='boolean')throw new Error('activity-diagnostic-boolean-invalid');result.main_present=payload.main_present;}
 for(const key of ['main_candidate_count','user_message_count','assistant_message_count']){
  if(key in payload){const value=boundedActivityCount(payload[key]);if(value===null)throw new Error('activity-diagnostic-count-invalid');result[key]=value;}
 }
 if('state' in payload){if(!['ACTIVE','INACTIVE'].includes(payload.state))throw new Error('activity-diagnostic-state-invalid');result.state=payload.state;}
 if('transition' in payload){if(!['INITIALIZED','ACTIVATED','DEACTIVATED'].includes(payload.transition))throw new Error('activity-diagnostic-transition-invalid');result.transition=payload.transition;}
 if('sink_result' in payload){if(!['accepted','rejected','error'].includes(payload.sink_result))throw new Error('activity-diagnostic-sink-invalid');result.sink_result=payload.sink_result;}
 if('signal_ids' in payload){
  const allowedSignals=['aria-busy','data-is-streaming','stop-control','agent-progress'];
  if(!Array.isArray(payload.signal_ids)||payload.signal_ids.length>4||payload.signal_ids.some((id,index)=>!allowedSignals.includes(id)||payload.signal_ids.indexOf(id)!==index))throw new Error('activity-diagnostic-signals-invalid');
  result.signal_ids=[...payload.signal_ids].sort();
 }
 return result;
}
async function onActivityDiagnostic(message,sender){
 const tab=sender.tab;if(!autoEnabled||!tab?.id||!valid(tab.url))return false;
 const session=await ensureSession(tab);if(!session)return false;
 const count=Number.isInteger(session.diagnosticCount)?session.diagnosticCount:0;
 if(count>=MAX_ACTIVITY_DIAGNOSTICS_PER_SESSION)return {ok:false,error:'activity-diagnostic-session-limit'};
 let payload;
 try{payload=sanitizeActivityDiagnosticPayload(message?.payload,count+1);}catch(error){lastError=String(error.message||error);return false;}
 session.diagnosticCount=count+1;
 await saveSessions();
 const run=()=>postEvent(tab.id,session,'diag.activity.trace',payload,'activity-observer-diagnostic');
 const next=activityQueue.then(run,run);activityQueue=next.then(()=>undefined,error=>{lastError=String(error.message||error);});
 return next;
}async function assignFrontToTab(tabId,frontId){
 const tab=await chrome.tabs.get(tabId);
 if(!tab?.id||!valid(tab.url))return {ok:false,error:'active-tab-not-chatgpt'};
 const conversation=conversationFromTab(tab);
 if(!conversation)return {ok:false,error:'conversation-route-not-supported'};
 const front=frontRegistry.find(item=>item.id===frontId);
 if(!front)return {ok:false,error:'front-id-not-registered'};
 const assignedAt=new Date().toISOString();
 const assignment={frontId:front.id,frontName:front.name,conversationId:conversation.conversationId,conversationUrl:conversation.url,assignedAt,association:'operator_selection'};
 for(const [previousConversationId,previousAssignment] of Object.entries(frontAssignments))if(previousAssignment.frontId===front.id&&previousConversationId!==conversation.conversationId)delete frontAssignments[previousConversationId];
 frontAssignments={...frontAssignments,[conversation.conversationId]:assignment};
 await chrome.storage.local.set({[STORE.frontAssignments]:frontAssignments});
 if(autoEnabled){
  const session=await ensureSession(tab);
  if(session)await postEvent(tab.id,session,'front.assignment',{front_id:front.id,front_name:front.name,conversation_id:conversation.conversationId,conversation_url:conversation.url,association:'operator_selection',assigned_at:assignedAt},'front-assignment');
 }
 return {ok:true,assignment,fronts:frontRegistry.map(({id,name})=>({id,name}))};
}
async function getFrontContext(tabId){
 const tab=await chrome.tabs.get(tabId);
 const conversation=conversationFromTab(tab);
 if(!conversation)return {ok:false,error:'conversation-route-not-supported',fronts:frontRegistry.map(({id,name})=>({id,name}))};
 const assignment=frontAssignments[conversation.conversationId]||null;
 return {ok:true,conversation,assignment,fronts:frontRegistry.map(({id,name})=>({id,name}))};
}
async function recordFrontActivity(tab,session,payload){
 const conversation=conversationFromTab(tab);
 if(!conversation||payload.transition==='INITIALIZED')return null;
 const assignment=frontAssignments[conversation.conversationId];
 if(!assignment)return null;
 const updatedAt=new Date().toISOString();
 return postEvent(tab.id,session,'front.activity',{
  front_id:assignment.frontId,front_name:assignment.frontName,conversation_id:conversation.conversationId,
  conversation_url:conversation.url,activity_kind:payload.state==='ACTIVE'?'processing_active':'processing_inactive',
  updated_at:updatedAt
 },'activity-observer-front-activity');
}function localFrontReport(windowId){
 const now=new Date();
 const assignedFrontIds=new Set(Object.values(frontAssignments).map(assignment=>assignment.frontId));
 const seeds=frontRegistry.filter(front=>front.latest_known&&!assignedFrontIds.has(front.id)).map(front=>({frontId:front.id,frontName:front.name,conversationId:front.latest_known.conversation_id,conversationUrl:front.latest_known.conversation_url,updatedAt:front.latest_known.updated_at,source:'export_header',timestampProvenance:front.latest_known.source_time_zone||'source-zone-unverified'}));
 const pending=outbox.filter(event=>event?.type==='front.activity').map(event=>({frontId:event.payload.front_id,frontName:event.payload.front_name,conversationId:event.payload.conversation_id,conversationUrl:event.payload.conversation_url,updatedAt:event.payload.updated_at,source:'local_outbox'})).filter(record=>frontAssignments[record.conversationId]?.frontId===record.frontId);
 const rows=HarmoniaFrontActivity.latestPerFront([...seeds,...pending],windowId,now).map(record=>({frontId:record.frontId,frontName:record.frontName,updatedAt:record.updatedAt,relativeLabel:HarmoniaFrontActivity.relativeAgeLabel(record.updatedAt,now,HarmoniaFrontActivity.TIME_ZONE),absoluteLabel:HarmoniaFrontActivity.absoluteDateTime(record.updatedAt,HarmoniaFrontActivity.TIME_ZONE),conversationUrl:record.conversationUrl,source:record.source,timestampProvenance:record.timestampProvenance||'local outbox'}));
 return {ok:true,schema:'harmonia.front-report.v1',window:windowId,asOf:now.toISOString(),timezone:HarmoniaFrontActivity.TIME_ZONE,source:'local_outbox',rows};
}
async function getFrontReport(windowId){
 if(!['24h','48h','72h','7d'].includes(windowId))return {ok:false,error:'invalid-window'};
 await checkHealth();
 if(!TOKEN||!collector)return localFrontReport(windowId);
 try{
  const response=await fetch(COLLECTOR+'/fronts?window='+encodeURIComponent(windowId),{headers:headers(),cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return {ok:false,error:'front-report-http-'+response.status};
  return {ok:true,...data};
 }catch(error){return {ok:false,error:String(error.message||error)};}
}
async function onObservedEvent(message,sender){
 const tab=sender.tab;if(!autoEnabled||!tab?.id||!valid(tab.url))return false;
 const type=String(message?.event?.type||'');
 if(type!=='ui.surface.scan'&&type!=='ui.activity.state')return false;
 const session=await ensureSession(tab);if(!session)return false;
 if(type==='ui.activity.state'){
  let payload;try{payload=sanitizeActivityPayload(message.event.payload);}catch(error){lastError=String(error.message||error);return false;}
  const run=async()=>{
   const activityResult=await postEvent(tab.id,session,type,payload,'activity-observer');
   const frontResult=await recordFrontActivity(tab,session,payload).catch(error=>({ok:false,error:String(error.message||error)}));
   return {ok:activityResult?.ok!==false,activity:activityResult,frontActivity:frontResult};
  };
  const next=activityQueue.then(run,run);activityQueue=next.then(()=>undefined,error=>{lastError=String(error.message||error);});return next;
 }
 const payload=message.event.payload||{},run=()=>processSurfaceScan(tab,session,payload);
 const next=surfaceQueue.then(run,run);surfaceQueue=next.catch(error=>{lastError=String(error.message||error);});return next;
}async function stopSession(tabId,reason){
 const key=String(tabId),session=sessions[key];if(!session)return;
 await postEvent(tabId,session,'capture.stopped',{reason});
 delete sessions[key];await saveSessions();
}
async function injectTab(tab){
 if(!autoEnabled||!tab?.id||!valid(tab.url))return;
 try{
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['activity-observer.js','surface-catalog.js','content.js']});
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
async function collectActivityDiagnostics(){
 const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
 const replies=await Promise.all(tabs.filter(tab=>tab&&tab.id).map(async tab=>{
  try{
   const value=await chrome.tabs.sendMessage(tab.id,{kind:'harmonia:activity-diagnostics'});
   return value&&value.schema==='harmonia.activity-observer-diagnostics.v1'?value:null;
  }catch{return null;}
 }));
 const reports=replies.filter(Boolean);
 const observerKeys=['reconcileCount','activitySnapshots','activityTransitions','activeTransitions','inactiveTransitions','eventSinkAttempts','eventSinkAccepted','eventSinkRejected','eventSinkErrors'];
 const snapshotKeys=['snapshotCount','mainFoundCount'];
 const signalIds=['aria-busy','data-is-streaming','stop-control','agent-progress'];
 const sum=(key,section)=>reports.reduce((total,report)=>total+(Number(report[section]?.[key])||0),0);
 const observerTotals=Object.fromEntries(observerKeys.map(key=>[key,sum(key,'observer')]));
 const snapshotTotals=Object.fromEntries(snapshotKeys.map(key=>[key,sum(key,'snapshot')]));
 snapshotTotals.signalPresence=Object.fromEntries(signalIds.map(signalId=>{
  let matchingCount=0,excludedCount=0,visibleCount=0;
  for(const report of reports){
   const entry=report.snapshot?.lastSignalPresence?.[signalId]||{};
   matchingCount+=Number(entry.matchingCount)||0;
   excludedCount+=Number(entry.excludedCount)||0;
   visibleCount+=Number(entry.visibleCount)||0;
  }
  return [signalId,{matchingCount,excludedCount,visibleCount}];
 }));
 const knownDecisions=new Set(['observer_initialized','active','inactive','activated','deactivated']);
 const instances=reports.map(report=>{
  const observer=report.observer||{},snapshot=report.snapshot||{},presence={};
  for(const signalId of signalIds){
   const entry=snapshot.lastSignalPresence?.[signalId]||{};
   presence[signalId]={matchingCount:Number(entry.matchingCount)||0,excludedCount:Number(entry.excludedCount)||0,visibleCount:Number(entry.visibleCount)||0};
  }
  return {
   active:observer.active===true,
   stopped:observer.stopped===true,
   lastDecision:knownDecisions.has(observer.lastDecision)?observer.lastDecision:'unknown',
   observer:Object.fromEntries(observerKeys.map(key=>[key,Number(observer[key])||0])),
   snapshot:{
    snapshotCount:Number(snapshot.snapshotCount)||0,
    mainFoundCount:Number(snapshot.mainFoundCount)||0,
    lastMainPresent:snapshot.lastMainPresent===true,
    lastMainCandidateCount:Number(snapshot.lastMainCandidateCount)||0,
    lastUserMessageCount:Number(snapshot.lastUserMessageCount)||0,
    lastAssistantMessageCount:Number(snapshot.lastAssistantMessageCount)||0,
    lastActivity:snapshot.lastActivity===true,
    lastSignalIds:Array.isArray(snapshot.lastSignalIds)?snapshot.lastSignalIds.filter(value=>signalIds.includes(value)):[],
    lastSignalPresence:presence
   }
  };
 });
 return {schema:'harmonia.activity-observer-diagnostics.v1',queriedTabCount:tabs.length,reportingTabCount:reports.length,totals:{observer:observerTotals,snapshot:snapshotTotals},instances};
}chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 (async()=>{
  await ready;
  if(message.kind==='harmonia:auto-settings')return {enabled:autoEnabled};
  if(message.kind==='harmonia:sync-repository')return syncRepository();
  if(message.kind==='harmonia:front-context')return getFrontContext(Number(message.tabId));
  if(message.kind==='harmonia:assign-front')return assignFrontToTab(Number(message.tabId),String(message.frontId||''));
  if(message.kind==='harmonia:front-report')return getFrontReport(String(message.windowId||''));
  if(message.kind==='harmonia:get'){
   await checkHealth();
   const syncData=await chrome.storage.local.get([STORE.repositorySync]);
   const activityDiagnostics=await collectActivityDiagnostics().catch(()=>({schema:'harmonia.activity-observer-diagnostics.v1',queriedTabCount:0,reportingTabCount:0,totals:{observer:{},snapshot:{}},instances:[]}));
   let coverage=null,activity=null,activityTraceDiagnostics=null;
   if(collector){
    const [coverageResult,activityResult]=await Promise.all([
     fetch(COLLECTOR+'/coverage',{headers:headers(),cache:'no-store'}).then(async response=>response.ok?{ok:true,value:await response.json()}:{ok:false,error:'Cobertura HTTP '+response.status}).catch(error=>({ok:false,error:String(error.message||error)})),
     fetch(COLLECTOR+'/activity',{headers:headers(),cache:'no-store'}).then(async response=>response.ok?{ok:true,value:await response.json()}:{ok:false,error:'Actividad HTTP '+response.status}).catch(error=>({ok:false,error:String(error.message||error)}))
    ]);
    coverage=coverageResult.value||null;
    activity=activityResult.value||null;
    const traceResult=await fetch(COLLECTOR+'/activity-diagnostics',{headers:headers(),cache:'no-store'}).then(async response=>response.ok?{ok:true,value:await response.json()}:{ok:false,error:'Diagnóstico HTTP '+response.status}).catch(error=>({ok:false,error:String(error.message||error)}));
    activityTraceDiagnostics=traceResult.value||null;
    if(!coverageResult.ok||!activityResult.ok||!traceResult.ok)lastError=[coverageResult.error,activityResult.error,traceResult.error].filter(Boolean).join('; ');
   }else{
    activity=summarizePendingActivity();
    coverage=summarizePendingCoverage();
    activityTraceDiagnostics=summarizePendingActivityDiagnostics();
   }
   return {
    version:'0.6.0',frameworkRevision:FRAMEWORK_REVISION,autoEnabled,
    active:autoEnabled&&Object.keys(sessions).length>0,activeTabs:Object.keys(sessions).length,
    sessions:Object.entries(sessions).map(([tabId,session])=>({tabId,startedAt:session.startedAt,lastAt:session.lastAt,events:session.events})),
    collector,lastError,events:eventCount,pendingEvents:outbox.length,pendingBytes:outboxByteLength(),
    coverage,activity,activityDiagnostics,activityTraceDiagnostics,repositorySync:syncData[STORE.repositorySync]||null
   };
  }
  if(message.kind==='harmonia:set-auto')return setAutoEnabled(message.enabled);
  if(message.kind==='harmonia:activity-diagnostic'&&sender.tab?.id)return onActivityDiagnostic(message,sender);
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
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===REPO_SYNC_ALARM)void syncRepository();if(alarm.name===OUTBOX_FLUSH_ALARM)void checkHealth();});
chrome.runtime.onInstalled.addListener(()=>{void ready.then(async()=>{chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});await syncRepository();if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});});
chrome.runtime.onStartup.addListener(()=>{void ready.then(async()=>{chrome.alarms.create(REPO_SYNC_ALARM,{delayInMinutes:1,periodInMinutes:360});await syncRepository();if(autoEnabled)await injectExistingTabs(await chrome.tabs.query({url:'https://chatgpt.com/*'}));});});