const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const HOST='127.0.0.1',PORT=47321,MAX=1024**3,MAX_REQUEST=1_000_000;
const TOKEN=String(process.env.HARMONIA_TOKEN||'');
if(!TOKEN)throw new Error('HARMONIA_TOKEN is required; load the local auth config first.');
const root=process.env.HARMONIA_DATA||'C:\\Users\\fila4\\AppData\\Local\\Harmonia\\surface-index-v0.3.0\\data';
fs.mkdirSync(root,{recursive:true});
const idxPath=path.join(root,'index.json');
let index={schema:'harmonia.index.v1',updatedAt:null,sessions:{},surfaceFingerprints:{},coverage:null,totalBytes:0,stopped:false};
try{const saved=JSON.parse(fs.readFileSync(idxPath,'utf8'));if(saved.schema==='harmonia.index.v1')index={...index,...saved};}catch{}
if(!index.surfaceFingerprints||typeof index.surfaceFingerprints!=='object')index.surfaceFingerprints={};
const catalogPath=path.join(__dirname,'..','coverage-catalog.json');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
function featureWeight(feature){return feature.priority==='core'?2:1;}
function updateCoverage(event){
 if(event.type!=='ui.surface.scan'&&event.type!=='ui.surface.reused')return;
 const features=catalog.features.filter(f=>f.scope!=='out'),p=event.payload||{};
 const previous=index.coverage||{observedFeatureIds:[],unknownControls:[],scanCount:0,uniqueSurfaceCount:0,deduplicatedScans:0};
 const featureIds=Array.isArray(p.features)?p.features.filter(id=>typeof id==='string'&&features.some(f=>f.id===id)):[];
 previous.observedFeatureIds=[...new Set([...(previous.observedFeatureIds||[]),...featureIds])].sort();
 const unknown=(Array.isArray(p.controls)?p.controls:[]).filter(control=>!control.testId&&!control.label).map(control=>[control.tag,control.role,control.type,control.placeholder].join('|')).filter(Boolean);
 previous.unknownControls=[...new Set([...(previous.unknownControls||[]),...unknown])].slice(0,100);
 previous.scanCount=(previous.scanCount||0)+1;
 if(event.type==='ui.surface.reused')previous.deduplicatedScans=(previous.deduplicatedScans||0)+1;
 previous.lastScanAt=event.capturedAt;previous.lastSessionId=event.sessionId;
 previous.lastFingerprint=typeof p.fingerprint==='string'?p.fingerprint:null;
 previous.lastVisibleFeatureIds=featureIds;
 previous.lastControlCount=Number(p.controlCount??(Array.isArray(p.controls)?p.controls.length:0));
 previous.lastNodeCount=Number(p.nodeCount??p.structure?.total??0);
 previous.stylesheetCount=Number(p.stylesheetCount??(Array.isArray(p.stylesheets)?p.stylesheets.length:0));
 const totalWeight=features.reduce((n,f)=>n+featureWeight(f),0);
 const verifiedSourceIds=new Set(catalog.sources.filter(source=>source.verificationStatus==='content-read').map(source=>source.id));
 const isDocumented=feature=>Array.isArray(feature.docs)&&feature.docs.some(id=>verifiedSourceIds.has(id));
 const docs=features.filter(isDocumented);
 const observed=features.filter(feature=>previous.observedFeatureIds.includes(feature.id));
 const docWeight=docs.reduce((n,f)=>n+featureWeight(f),0);
 const observedWeight=observed.reduce((n,f)=>n+featureWeight(f),0);
 previous.catalogVersion=catalog.version;previous.catalogReviewedAt=catalog.reviewedAt;previous.featureCount=features.length;
 previous.documentation={covered:docs.length,total:features.length,weightedPoints:docWeight,totalWeightedPoints:totalWeight,percent:Math.round(100*docWeight/totalWeight)};
 previous.naturalObservation={covered:observed.length,total:features.length,weightedPoints:observedWeight,totalWeightedPoints:totalWeight,percent:Math.round(100*observedWeight/totalWeight)};
 previous.combinedPercent=Math.round(100*(docWeight+observedWeight)/(2*totalWeight));
 previous.verifiedSourceCount=verifiedSourceIds.size;
 previous.pendingDocumentationIds=features.filter(feature=>!isDocumented(feature)).map(feature=>feature.id);
 previous.pendingObservationIds=features.filter(feature=>!previous.observedFeatureIds.includes(feature.id)).map(feature=>feature.id);
 previous.unknownControlCount=previous.unknownControls.length;
 previous.uniqueSurfaceCount=Object.keys(index.surfaceFingerprints).length;
 index.coverage=previous;
}
function persist(){index.updatedAt=new Date().toISOString();const tmp=idxPath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(index,null,2),'utf8');fs.renameSync(tmp,idxPath);}
function originOK(origin){return !origin||/^chrome-extension:\/\/[a-p]{32}$/.test(origin);}
function authOK(req){const given=Buffer.from(String(req.headers['x-harmonia-token']||''));const expected=Buffer.from(TOKEN);return given.length===expected.length&&crypto.timingSafeEqual(given,expected);}
function reply(req,res,code,obj){
 const origin=req.headers.origin;
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,x-harmonia-token','vary':'Origin'};
 if(origin&&originOK(origin))headers['access-control-allow-origin']=origin;
 if(code===204){res.writeHead(code,headers);return res.end();}
 res.writeHead(code,headers);res.end(JSON.stringify(obj));
}
const server=http.createServer((req,res)=>{
 const origin=req.headers.origin;
 if(!originOK(origin))return reply(req,res,403,{error:'origin-not-allowed'});
 if(req.method==='OPTIONS'){
  if(!origin||req.headers['access-control-request-method']!=='POST')return reply(req,res,403,{error:'preflight-not-allowed'});
  return reply(req,res,204,{});
 }
 if((req.method==='GET')&&(req.url==='/health'||req.url==='/index'||req.url==='/coverage'||req.url==='/fingerprints')){
  if(!authOK(req))return reply(req,res,401,{error:'unauthorized'});
  if(req.url==='/health')return reply(req,res,200,{ok:true,root,maxBytes:MAX,totalBytes:index.totalBytes,stopped:index.stopped,updatedAt:index.updatedAt,sessions:Object.keys(index.sessions||{}).length,uniqueSurfaces:Object.keys(index.surfaceFingerprints||{}).length});
  if(req.url==='/coverage')return reply(req,res,200,index.coverage||{schema:'harmonia.coverage-index.v1',observedFeatureIds:[],unknownControls:[],scanCount:0,uniqueSurfaceCount:Object.keys(index.surfaceFingerprints||{}).length});
  if(req.url==='/fingerprints')return reply(req,res,200,{fingerprints:Object.keys(index.surfaceFingerprints||{}).slice(-5000),count:Object.keys(index.surfaceFingerprints||{}).length});
  return reply(req,res,200,index);
 }
 if(req.method==='POST'&&req.url==='/shutdown'){
  if(!authOK(req))return reply(req,res,401,{error:'unauthorized'});
  persist();reply(req,res,200,{ok:true,stopping:true});setTimeout(()=>server.close(()=>console.log('HARMONIA_COLLECTOR_STOPPED')),80);return;
 }
 if(req.method!=='POST'||req.url!=='/events')return reply(req,res,404,{error:'not-found'});
 if(!authOK(req))return reply(req,res,401,{error:'unauthorized'});
 if(index.stopped)return reply(req,res,507,{error:'storage-limit-stop-no-deletion'});
 let body='',size=0,tooLarge=false;
 req.on('data',chunk=>{size+=chunk.length;if(size>MAX_REQUEST){tooLarge=true;return;}body+=chunk.toString('utf8');});
 req.on('end',()=>{
  if(tooLarge)return reply(req,res,413,{error:'request-too-large'});
  try{
   const event=JSON.parse(body);
   if(!event.eventId||!event.sessionId||!event.type||!event.capturedAt)throw Error('invalid-event');
   if(!/^ui\.surface\.(scan|reused)$|^capture\./.test(event.type))throw Error('event-type-out-of-scope');
   const day=String(event.capturedAt).slice(0,10);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('invalid-event-date');
   const dir=path.join(root,'originals',day);fs.mkdirSync(dir,{recursive:true});
   const incoming=event,fp=typeof event.payload?.fingerprint==='string'&&/^[0-9a-f]{64}$/.test(event.payload.fingerprint)?event.payload.fingerprint:null;
   if((event.type==='ui.surface.scan'||event.type==='ui.surface.reused')&&!fp)throw Error('invalid-surface-fingerprint');
   let stored=event,deduplicated=false;
   const prior=fp?index.surfaceFingerprints[fp]:null;
   if(fp&&prior&&event.type==='ui.surface.scan'){
    stored={...event,type:'ui.surface.reused',payload:{fingerprint:fp,catalogVersion:event.payload.catalogVersion,features:Array.isArray(event.payload.features)?event.payload.features:prior.features||[],controlCount:Array.isArray(event.payload.controls)?event.payload.controls.length:prior.controlCount||0,nodeCount:Number(event.payload.structure?.total||prior.nodeCount||0),stylesheetCount:Array.isArray(event.payload.stylesheets)?event.payload.stylesheets.length:prior.stylesheetCount||0,viewport:event.payload.viewport||prior.viewport||null}};
    deduplicated=true;
   }
   const file=path.join(dir,stored.sessionId+'.jsonl'),line=JSON.stringify(stored)+'\n',bytes=Buffer.byteLength(line);
   if(index.totalBytes+bytes>MAX){index.stopped=true;persist();return reply(req,res,507,{error:'storage-limit-stop-no-deletion'});}
   fs.appendFileSync(file,line,'utf8');index.totalBytes+=bytes;
   if(fp){
    const record=index.surfaceFingerprints[fp]||{fingerprint:fp,firstEventId:stored.eventId,firstSessionId:stored.sessionId,firstAt:stored.capturedAt,features:Array.isArray(stored.payload?.features)?stored.payload.features:[],controlCount:Number(stored.payload?.controls?.length??stored.payload?.controlCount??0),nodeCount:Number(stored.payload?.structure?.total??stored.payload?.nodeCount??0),stylesheetCount:Number(stored.payload?.stylesheets?.length??stored.payload?.stylesheetCount??0),viewport:stored.payload?.viewport||null,seenCount:0,sessionIds:[]};
    record.lastSeenAt=stored.capturedAt;record.seenCount=(record.seenCount||0)+1;
    if(!record.sessionIds.includes(stored.sessionId))record.sessionIds=[...record.sessionIds,stored.sessionId].slice(-100);
    index.surfaceFingerprints[fp]=record;
    const fingerprints=Object.keys(index.surfaceFingerprints);
    if(fingerprints.length>5000){for(const oldFp of fingerprints.slice(0,fingerprints.length-5000))delete index.surfaceFingerprints[oldFp];}
   }
   updateCoverage(stored);
   const session=index.sessions[stored.sessionId]||{firstAt:stored.capturedAt,lastAt:stored.capturedAt,events:0,types:{},file:path.relative(root,file),lastEventSha256:null};
   session.lastAt=stored.capturedAt;session.events++;session.types[stored.type]=(session.types[stored.type]||0)+1;
   session.lastEventSha256=crypto.createHash('sha256').update(line).digest('hex');
   index.sessions[stored.sessionId]=session;persist();
   reply(req,res,201,{ok:true,eventId:stored.eventId,ordinal:session.events,storedType:stored.type,deduplicated});
  }catch(error){reply(req,res,400,{error:String(error.message||error)});}
 });
});
server.listen(PORT,HOST,()=>console.log(`HARMONIA_COLLECTOR_ONLINE http://${HOST}:${PORT} data=${root}`));
