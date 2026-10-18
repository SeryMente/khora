/** Loopback callback for a single opening; no cookies, refresh token, key file or logged code. */
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {challengeFor} from './bridge.mjs';
export function khoraOrigin(raw){const u=new URL(raw);if(u.protocol!=='https:'||u.origin!==raw||u.username||u.password)throw Error('https_khora_origin_required');return u.origin;}
export async function systemBrowser(url){
 const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
 const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
 await new Promise((ok,fail)=>{const c=spawn(command,args,{shell:false,stdio:'ignore'});c.once('error',()=>fail(Error('browser_not_available')));c.once('spawn',()=>{c.unref();ok();});});
}
async function secureExchange(origin,body){
 const r=await fetch(origin+'/api/oauth/portable-vault/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw Error('opening_not_authorized');
 if(Number(r.headers.get('content-length'))>8192)throw Error('invalid_opening_response');
 const reader=r.body.getReader();const parts=[];let n=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>8192){await reader.cancel();throw Error('invalid_opening_response');}parts.push(value);}}finally{reader.releaseLock();}
 const d=JSON.parse(Buffer.concat(parts).toString('utf8'));if(d.id!==body.id||typeof d.identity!=='string'||typeof d.recipient!=='string')throw Error('invalid_opening_response');return d;
}
export async function openOnline({origin,id,launch=systemBrowser,exchange=secureExchange,timeoutMs=180000}){
 khoraOrigin(origin);if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id))throw Error('invalid_vault');
 const verifier=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url'),challenge=challengeFor(verifier);
 let timer,settled=false,accept,reject,port;
 const result=new Promise((yes,no)=>{accept=yes;reject=no;});
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
  const u=new URL(req.url||'/',`http://127.0.0.1:${port}`);
  if(req.method!=='GET'||req.headers.host!==`127.0.0.1:${port}`||u.pathname!=='/callback'||u.searchParams.get('state')!==state||u.searchParams.get('id')!==id||settled){res.writeHead(400);res.end('Solicitud no aceptada.');return;}
  const grant=u.searchParams.get('grant');if(!grant||!/^[A-Za-z0-9_-]{43}$/.test(grant)){res.writeHead(400);res.end('Solicitud no aceptada.');return;}
  settled=true;
  try{const release=await exchange(origin,{id,grant,verifier});res.end('Apertura autorizada. Puedes cerrar esta pestaña.');accept(release);}catch{res.writeHead(403);res.end('No se autorizó la apertura.');reject(Error('opening_not_authorized'));}
 });
 // No application request logs. Bind IPv4 loopback only, never 0.0.0.0.
 server.headersTimeout=10000;server.requestTimeout=15000;
 try{
  await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes);});port=server.address().port;
  timer=setTimeout(()=>{settled=true;reject(Error('opening_expired'));},timeoutMs);timer.unref();
  const url=new URL(origin+'/sistema/seguridad/boveda-portable/abrir');for(const [k,v]of Object.entries({id,challenge,state,port:String(port)}))url.searchParams.set(k,v);
  // Install rejection handling before an injected/browser launcher can complete callback.
  const wait=result;wait.catch(()=>{});await launch(url.toString());return await wait;
 }finally{clearTimeout(timer);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
