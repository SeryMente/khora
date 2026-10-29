const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const HOST='127.0.0.1',PORT=Number(process.env.HARMONIA_PORT||47321),MAX=1024**3,MAX_REQUEST=1_000_000,MAX_SEEN_EVENTS=20000,MAX_INDEXED_SURFACES=5000;
const TOKEN=String(process.env.HARMONIA_TOKEN||'');
if(!TOKEN)throw new Error('HARMONIA_TOKEN is required; load the local auth config first.');
if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw new Error('HARMONIA_PORT must be a valid TCP port.');
const root=process.env.HARMONIA_DATA||'C:\\Users\\fila4\\AppData\\Local\\Harmonia\\surface-index-v0.3.0\\data';
fs.mkdirSync(root,{recursive:true});
const idxPath=path.join(root,'index.json'),surfacesDir=path.join(root,'surfaces'),originalsDir=path.join(root,'originals');
fs.mkdirSync(surfacesDir,{recursive:true});fs.mkdirSync(originalsDir,{recursive:true});
const catalogPath=path.join(__dirname,'..','coverage-catalog.json');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
let index={schema:'harmonia.index.v1',updatedAt:null,sessions:{},surfaceFingerprints:{},seenEventIds:{},coverage:null,uniqueSurfaceCount:0,totalBytes:0,stopped:false};
try{const saved=JSON.parse(fs.readFileSync(idxPath,'utf8'));if(saved.schema==='harmonia.index.v1')index={...index,...saved};}catch{}
if(!index.sessions||typeof index.sessions!=='object')index.sessions={};
if(!index.surfaceFingerprints||typeof index.surfaceFingerprints!=='object')index.surfaceFingerprints={};
if(!index.seenEventIds||typeof index.seenEventIds!=='object')index.seenEventIds={};
if(!Number.isFinite(index.uniqueSurfaceCount))index.uniqueSurfaceCount=fs.readdirSync(surfacesDir).filter(name=>/^[0-9a-f]{64}\.json$/.test(name)).length;
function featureWeight(feature){return feature.priority==='core'?2:1;}
function text(value,max){return typeof value==='string'?value.replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').slice(0,max):'';}
function number(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function listStrings(value,maxItems=100,maxLength=120){return Array.isArray(value)?value.filter(v=>typeof v==='string').slice(0,maxItems).map(v=>v.slice(0,maxLength)):[];}
function sanitizeControl(c){return {tag:text(c&&c.tag,24),role:text(c&&c.role,40),label:text(c&&c.label,90),testId:text(c&&c.testId,70),placeholder:text(c&&c.placeholder,80),type:text(c&&c.type,24),disabled:!!(c&&c.disabled),expanded:text(c&&c.expanded,10)};}
function sanitizeStructure(s){
 const nodes=Array.isArray(s&&s.nodes)?s.nodes.slice(0,280).map(n=>({depth:number(n&&n.depth),tag:text(n&&n.tag,24),role:text(n&&n.role,40),testId:text(n&&n.testId,70),classes:listStrings(n&&n.classes,5,50),messageRole:text(n&&n.messageRole,20),ariaLive:text(n&&n.ariaLive,30),ariaBusy:text(n&&n.ariaBusy,10),childElements:number(n&&n.childElements)})):[];
 const total=Math.max(0,number(s&&s.total));
 return {nodes,total,truncated:!!(s&&s.truncated)||total>nodes.length};
}
function sanitizeStyleSheets(list){return Array.isArray(list)?list.slice(0,80).map(s=>({index:number(s&&s.index),path:text(s&&s.path,180),crossOriginOrInaccessible:!!(s&&s.crossOriginOrInaccessible),ruleCount:s&&Number.isFinite(Number(s.ruleCount))?Number(s.ruleCount):null})):[];}
function sanitizeLayout(layout){
 const result={};
 for(const key of ['main','composer','assistant']){
  const v=layout&&layout[key];if(!v||typeof v!=='object')continue;
  result[key]={tag:text(v.tag,24),role:text(v.role,30),testId:text(v.testId,70),classes:listStrings(v.classes,5,50),display:text(v.display,24),position:text(v.position,24),flexDirection:text(v.flexDirection,24),overflow:text(v.overflow,24),fontSize:text(v.fontSize,16),width:number(v.width),height:number(v.height)};
 }
 return result;
}
function sanitizeSurface(event){
 const p=event.payload||{};
 if(typeof p.fingerprint!=='string'||!/^[0-9a-f]{64}$/.test(p.fingerprint))throw Error('invalid-surface-fingerprint');
 const controls=Array.isArray(p.controls)?p.controls.slice(0,100).map(sanitizeControl):[];
 const sheets=sanitizeStyleSheets(p.stylesheets);
 const counts=p.counts||{};
 return {schema:'harmonia.surface.v1',fingerprint:p.fingerprint,catalogVersion:text(p.catalogVersion,24),features:listStrings(p.features,100,120),
  controls,structure:sanitizeStructure(p.structure),stylesheets:sheets,
  viewport:p.viewport&&typeof p.viewport==='object'?{width:number(p.viewport.width),height:number(p.viewport.height),devicePixelRatio:number(p.viewport.devicePixelRatio,1)}:null,
  layout:sanitizeLayout(p.layout),
  counts:{controls:controls.length,userMessages:number(counts.userMessages),assistantMessages:number(counts.assistantMessages),styleSheets:number(counts.styleSheets,sheets.length)},
  privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true},
  firstObservedAt:event.capturedAt,firstSessionId:event.sessionId,firstEventId:event.eventId};
}
function compactReference(surface,record){
 return {fingerprint:surface.fingerprint,surfaceRef:record.surfaceFile,catalogVersion:surface.catalogVersion,features:surface.features,
  controlCount:surface.controls.length,nodeCount:surface.structure.total,stylesheetCount:surface.stylesheets.length,viewport:surface.viewport,
  privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true}};
}
function updateCoverage(event,details={}){
 if(event.type!=='ui.surface.scan'&&event.type!=='ui.surface.reused')return;
 const features=catalog.features.filter(f=>f.scope!=='out'),p=event.payload||{};
 const previous=index.coverage||{observedFeatureIds:[],unknownControls:[],scanCount:0,deduplicatedScans:0};
 const featureIds=listStrings(details.features||p.features,100,120).filter(id=>features.some(f=>f.id===id));
 previous.observedFeatureIds=[...new Set([...(previous.observedFeatureIds||[]),...featureIds])].sort();
 const unknown=Array.isArray(details.unknownControlSignatures)?details.unknownControlSignatures:(Array.isArray(p.controls)?p.controls:[]).filter(control=>!control.testId&&!control.label).map(control=>[text(control.tag,24),text(control.role,40),text(control.type,24)].join('|')).filter(Boolean);
 previous.unknownControls=[...new Set([...(previous.unknownControls||[]),...unknown])].slice(-100);
 previous.scanCount=(previous.scanCount||0)+1;
 if(event.type==='ui.surface.reused')previous.deduplicatedScans=(previous.deduplicatedScans||0)+1;
 previous.lastScanAt=event.capturedAt;previous.lastSessionId=event.sessionId;
 previous.lastFingerprint=text(p.fingerprint,64);previous.lastVisibleFeatureIds=featureIds;
 previous.lastControlCount=number(details.controlCount,p.controlCount??(p.controls&&p.controls.length||0));
 previous.lastNodeCount=number(details.nodeCount,p.nodeCount??(p.structure&&p.structure.total||0));
 previous.stylesheetCount=number(details.stylesheetCount,p.stylesheetCount??(p.stylesheets&&p.stylesheets.length||0));
 const totalWeight=features.reduce((n,f)=>n+featureWeight(f),0);
 const sourceIds=new Set(catalog.sources.filter(s=>s.verificationStatus==='content-read').map(s=>s.id));
 const documented=f=>Array.isArray(f.docs)&&f.docs.some(id=>sourceIds.has(id));
 const docs=features.filter(documented),observed=features.filter(f=>previous.observedFeatureIds.includes(f.id));
 const docWeight=docs.reduce((n,f)=>n+featureWeight(f),0),observedWeight=observed.reduce((n,f)=>n+featureWeight(f),0);
 previous.catalogVersion=catalog.version;previous.catalogReviewedAt=catalog.reviewedAt;previous.featureCount=features.length;
 previous.documentation={covered:docs.length,total:features.length,weightedPoints:docWeight,totalWeightedPoints:totalWeight,percent:Math.round(100*docWeight/totalWeight)};
 previous.naturalObservation={covered:observed.length,total:features.length,weightedPoints:observedWeight,totalWeightedPoints:totalWeight,percent:Math.round(100*observedWeight/totalWeight)};
 previous.combinedPercent=Math.round(100*(docWeight+observedWeight)/(2*totalWeight));
 previous.verifiedSourceCount=sourceIds.size;previous.pendingDocumentationIds=features.filter(f=>!documented(f)).map(f=>f.id);
 previous.pendingObservationIds=features.filter(f=>!previous.observedFeatureIds.includes(f.id)).map(f=>f.id);
 previous.unknownControlCount=previous.unknownControls.length;previous.uniqueSurfaceCount=index.uniqueSurfaceCount;
 index.coverage=previous;
}
function atomicWrite(file,value){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temp=file+'.'+process.pid+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
 fs.writeFileSync(temp,JSON.stringify(value,null,2),'utf8');
 fs.renameSync(temp,file);
}
function persist(){index.updatedAt=new Date().toISOString();atomicWrite(idxPath,index);}
function originOK(origin){return !origin||/^chrome-extension:\/\/[a-p]{32}$/.test(origin);}
function authOK(req){const given=Buffer.from(String(req.headers['x-harmonia-token']||'')),expected=Buffer.from(TOKEN);return given.length===expected.length&&crypto.timingSafeEqual(given,expected);}
function reply(req,res,code,obj){
 const origin=req.headers.origin,headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,x-harmonia-token','vary':'Origin'};
 if(origin&&originOK(origin))headers['access-control-allow-origin']=origin;
 if(code===204){res.writeHead(code,headers);return res.end();}
 res.writeHead(code,headers);res.end(JSON.stringify(obj));
}
function validUUID(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function recordEvent(event,res){
 if(!validUUID(event.eventId)||!validUUID(event.sessionId)||typeof event.type!=='string'||!event.type||!event.capturedAt)throw Error('invalid-event-identity');
 const replay=index.seenEventIds[event.eventId];
 if(replay)return {duplicate:true,storedType:replay.storedType||event.type,ordinal:replay.ordinal||0};
 if(!/^ui\.surface\.(scan|reused)$|^capture\./.test(event.type))throw Error('event-type-out-of-scope');
 const when=Date.parse(event.capturedAt);if(!Number.isFinite(when))throw Error('invalid-event-date');
 if(event.type==='ui.surface.scan'||event.type==='ui.surface.reused'){
  const surface=sanitizeSurface(event),fingerprint=surface.fingerprint,day=new Date(when).toISOString().slice(0,10);
  const surfaceFile=path.join(surfacesDir,fingerprint+'.json'),alreadyOnDisk=fs.existsSync(surfaceFile);
  const isNewSurface=!alreadyOnDisk;
  let record=index.surfaceFingerprints[fingerprint]||null;
  if(!record){record={fingerprint,surfaceFile:path.relative(root,surfaceFile).split(path.sep).join('/'),firstAt:event.capturedAt,firstSessionId:event.sessionId,firstEventId:event.eventId,features:surface.features,controlCount:surface.controls.length,nodeCount:surface.structure.total,stylesheetCount:surface.stylesheets.length,viewport:surface.viewport,unknownControlSignatures:surface.controls.filter(control=>!control.testId&&!control.label).map(control=>[control.tag,control.role,control.type].join('|')),seenCount:0,sessionIds:[]};}
  if(!Array.isArray(record.unknownControlSignatures))record.unknownControlSignatures=surface.controls.filter(control=>!control.testId&&!control.label).map(control=>[control.tag,control.role,control.type].join('|'));
  record.lastSeenAt=event.capturedAt;record.seenCount=(record.seenCount||0)+1;
  if(!record.sessionIds.includes(event.sessionId))record.sessionIds=[...record.sessionIds,event.sessionId].slice(-100);
  index.surfaceFingerprints[fingerprint]=record;
  const keys=Object.keys(index.surfaceFingerprints);
  if(keys.length>MAX_INDEXED_SURFACES){for(const oldKey of keys.slice(0,keys.length-MAX_INDEXED_SURFACES))delete index.surfaceFingerprints[oldKey];}
  const storedType=isNewSurface?'ui.surface.scan':'ui.surface.reused';
  const stored={...event,type:storedType,payload:compactReference(surface,record)};
  const file=path.join(originalsDir,day,event.sessionId+'.jsonl'),line=JSON.stringify(stored)+'\n',bytes=Buffer.byteLength(line);
  const surfaceBytes=isNewSurface?Buffer.byteLength(JSON.stringify(surface,null,2),'utf8'):0;
  if(index.totalBytes+surfaceBytes+bytes>MAX){index.stopped=true;persist();return {tooLarge:true};}
  if(isNewSurface){atomicWrite(surfaceFile,surface);index.uniqueSurfaceCount=(index.uniqueSurfaceCount||0)+1;index.totalBytes+=surfaceBytes;}
  fs.appendFileSync(file,line,'utf8');index.totalBytes+=bytes;
  const session=index.sessions[event.sessionId]||{firstAt:event.capturedAt,lastAt:event.capturedAt,events:0,types:{},file:path.relative(root,file).split(path.sep).join('/'),lastEventSha256:null};
  session.lastAt=event.capturedAt;session.events++;session.types[storedType]=(session.types[storedType]||0)+1;
  session.lastEventSha256=crypto.createHash('sha256').update(line).digest('hex');index.sessions[event.sessionId]=session;
  updateCoverage(stored,{features:record.features,unknownControlSignatures:record.unknownControlSignatures,controlCount:record.controlCount,nodeCount:record.nodeCount,stylesheetCount:record.stylesheetCount});
  index.seenEventIds[event.eventId]={capturedAt:event.capturedAt,sessionId:event.sessionId,storedType,ordinal:session.events};
  pruneSeenEventIds();persist();
  return {duplicate:false,storedType,ordinal:session.events,deduplicated:!isNewSurface,surfaceRef:record.surfaceFile};
 }
 const day=new Date(when).toISOString().slice(0,10),file=path.join(originalsDir,day,event.sessionId+'.jsonl');
 const stored={schema:'harmonia.event.v1',eventId:event.eventId,sessionId:event.sessionId,conversation:typeof event.conversation==='string'?event.conversation.slice(0,80):null,type:event.type,source:text(event.source,40),capturedAt:new Date(when).toISOString(),payload:event.type==='capture.started'?{url:safeSessionUrl(event.payload&&event.payload.url),version:text(event.payload&&event.payload.version,24),mode:text(event.payload&&event.payload.mode,60),privacy:{conversationTextCaptured:false,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,menusExcluded:true}}:event.type==='capture.stopped'?{reason:text(event.payload&&event.payload.reason,80),durationMs:Math.max(0,number(event.payload&&event.payload.durationMs))}:{reason:'event-suppressed'}};
 const line=JSON.stringify(stored)+'\n',bytes=Buffer.byteLength(line);
 if(index.totalBytes+bytes>MAX){index.stopped=true;persist();return {tooLarge:true};}
 fs.appendFileSync(file,line,'utf8');index.totalBytes+=bytes;
 const session=index.sessions[event.sessionId]||{firstAt:stored.capturedAt,lastAt:stored.capturedAt,events:0,types:{},file:path.relative(root,file).split(path.sep).join('/'),lastEventSha256:null};
 session.lastAt=stored.capturedAt;session.events++;session.types[stored.type]=(session.types[stored.type]||0)+1;
 session.lastEventSha256=crypto.createHash('sha256').update(line).digest('hex');index.sessions[event.sessionId]=session;
 index.seenEventIds[event.eventId]={capturedAt:stored.capturedAt,sessionId:stored.sessionId,storedType:stored.type,ordinal:session.events};
 pruneSeenEventIds();persist();return {duplicate:false,storedType:stored.type,ordinal:session.events,deduplicated:false};
}
function safeSessionUrl(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.hostname!=='chatgpt.com')return null;return u.origin+u.pathname.replace(/\/c\/[^/]+/,'/c/[conversation]').replace(/\/g\/[^/]+/,'/g/[gpt]');}catch{return null;}}
function pruneSeenEventIds(){const ids=Object.keys(index.seenEventIds);if(ids.length>MAX_SEEN_EVENTS){for(const id of ids.slice(0,ids.length-MAX_SEEN_EVENTS))delete index.seenEventIds[id];}}
const server=http.createServer((req,res)=>{
 const origin=req.headers.origin;if(!originOK(origin))return reply(req,res,403,{error:'origin-not-allowed'});
 if(req.method==='OPTIONS'){if(!origin||req.headers['access-control-request-method']!=='POST')return reply(req,res,403,{error:'preflight-not-allowed'});return reply(req,res,204,{});}
 if(req.method==='GET'&&['/health','/index','/coverage','/fingerprints'].includes(req.url)){
  if(!authOK(req))return reply(req,res,401,{error:'unauthorized'});
  if(req.url==='/health')return reply(req,res,200,{ok:true,root,maxBytes:MAX,totalBytes:index.totalBytes,stopped:index.stopped,updatedAt:index.updatedAt,sessions:Object.keys(index.sessions).length,uniqueSurfaces:index.uniqueSurfaceCount});
  if(req.url==='/coverage')return reply(req,res,200,index.coverage||{schema:'harmonia.coverage-index.v1',observedFeatureIds:[],unknownControls:[],scanCount:0,uniqueSurfaceCount:index.uniqueSurfaceCount});
  if(req.url==='/fingerprints')return reply(req,res,200,{fingerprints:Object.keys(index.surfaceFingerprints),count:index.uniqueSurfaceCount});
  return reply(req,res,200,index);
 }
 if(req.method==='POST'&&req.url==='/shutdown'){if(!authOK(req))return reply(req,res,401,{error:'unauthorized'});persist();reply(req,res,200,{ok:true,stopping:true});setTimeout(()=>server.close(()=>console.log('HARMONIA_COLLECTOR_STOPPED')),80);return;}
 if(req.method!=='POST'||req.url!=='/events')return reply(req,res,404,{error:'not-found'});
 if(!authOK(req))return reply(req,res,401,{error:'unauthorized'});
 if(index.stopped)return reply(req,res,507,{error:'storage-limit-stop-no-deletion'});
 let body='',size=0,tooLarge=false;
 req.on('data',chunk=>{size+=chunk.length;if(size>MAX_REQUEST){tooLarge=true;return;}body+=chunk.toString('utf8');});
 req.on('end',()=>{
  if(tooLarge)return reply(req,res,413,{error:'request-too-large'});
  try{
   const event=JSON.parse(body),result=recordEvent(event,res);
   if(result.tooLarge)return reply(req,res,507,{error:'storage-limit-stop-no-deletion'});
   if(result.duplicate)return reply(req,res,200,{ok:true,eventId:event.eventId,duplicate:true,storedType:result.storedType,ordinal:result.ordinal});
   return reply(req,res,201,{ok:true,eventId:event.eventId,ordinal:result.ordinal,storedType:result.storedType,deduplicated:result.deduplicated,surfaceRef:result.surfaceRef||null});
  }catch(error){return reply(req,res,400,{error:String(error.message||error)});}
 });
});
server.listen(PORT,HOST,()=>console.log('HARMONIA_COLLECTOR_ONLINE http://'+HOST+':'+PORT+' data='+root));
