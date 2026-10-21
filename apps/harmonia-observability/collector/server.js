const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const HOST='127.0.0.1',PORT=47321,MAX=1024**3,MAX_REQUEST=1_000_000;
const TOKEN=String(process.env.HARMONIA_TOKEN||'');
if(!TOKEN)throw new Error('HARMONIA_TOKEN is required; load the local auth config first.');
const root=process.env.HARMONIA_DATA||path.join(process.env.LOCALAPPDATA||process.cwd(),'Harmonia','data');
fs.mkdirSync(root,{recursive:true});
const idxPath=path.join(root,'index.json');
let index={schema:'harmonia.index.v1',updatedAt:null,sessions:{},totalBytes:0,stopped:false};
try{const saved=JSON.parse(fs.readFileSync(idxPath,'utf8'));if(saved.schema==='harmonia.index.v1')index=saved;}catch{}
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
 if((req.method==='GET')&&(req.url==='/health'||req.url==='/index')){
  if(!authOK(req))return reply(req,res,401,{error:'unauthorized'});
  if(req.url==='/health')return reply(req,res,200,{ok:true,root,maxBytes:MAX,totalBytes:index.totalBytes,stopped:index.stopped,updatedAt:index.updatedAt});
  return reply(req,res,200,index);
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
   if(!/^ui\.surface\.scan$|^capture\.|^console\./.test(event.type))throw Error('event-type-out-of-scope');
   const day=String(event.capturedAt).slice(0,10);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('invalid-event-date');
   const dir=path.join(root,'originals',day);fs.mkdirSync(dir,{recursive:true});
   const file=path.join(dir,event.sessionId+'.jsonl'),line=JSON.stringify(event)+'\n',bytes=Buffer.byteLength(line);
   if(index.totalBytes+bytes>MAX){index.stopped=true;persist();return reply(req,res,507,{error:'storage-limit-stop-no-deletion'});}
   fs.appendFileSync(file,line,'utf8');index.totalBytes+=bytes;
   const session=index.sessions[event.sessionId]||{firstAt:event.capturedAt,lastAt:event.capturedAt,events:0,types:{},file:path.relative(root,file),lastEventSha256:null};
   session.lastAt=event.capturedAt;session.events++;session.types[event.type]=(session.types[event.type]||0)+1;
   session.lastEventSha256=crypto.createHash('sha256').update(line).digest('hex');
   index.sessions[event.sessionId]=session;persist();
   reply(req,res,201,{ok:true,eventId:event.eventId,ordinal:session.events});
  }catch(error){reply(req,res,400,{error:String(error.message||error)});}
 });
});
server.listen(PORT,HOST,()=>console.log(`HARMONIA_COLLECTOR_ONLINE http://${HOST}:${PORT} data=${root}`));
