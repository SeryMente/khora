/** One opening only. Reuses VaultService's persistent OTP budget, 45s grant and atomic consume.
 * It is NOT a general OAuth server and never accepts MCP tokens or corpus scopes. */
import {createHash} from 'node:crypto';
import {VaultError,hash} from './core.mjs';
export const challengeFor = verifier => createHash('sha256').update(verifier).digest('base64url');
const deny=()=>{throw new VaultError('denied');};
export async function authorizeOpening(service,principal,id,code,challenge){
 service.principal(principal);
 if(typeof challenge!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(challenge))return deny();
 // Binding has a separate domain from the browser's cookie. No new table or migration.
 return service.authorize({...principal,binding:'portable-pkce-v1:'+challenge},id,code);
}
export async function redeemOpening(service,id,grant,verifier){
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id)||typeof grant!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(grant)||typeof verifier!=='string'||!/^[A-Za-z0-9_-]{43,128}$/.test(verifier))return deny();
 const owner=await service.store.transaction(async c=>(await c.query('SELECT owner FROM pv_grants WHERE digest=$1 AND vault_id=$2',[hash(grant),id])).rows[0]?.owner);
 if(!owner)return deny();
 // The principal is derived from the persisted, OTP-approved grant, NEVER request identity.
 return service.release({subject:owner,binding:'portable-pkce-v1:'+challengeFor(verifier)},id,grant);
}
const secureHeaders={'Content-Type':'application/json','Cache-Control':'no-store, private, max-age=0','Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export async function readBoundedJSON(request){
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new VaultError('json_required',415);
 const reader=request.body?.getReader();if(!reader)throw new VaultError('body_required',400);let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new VaultError('body_too_large',413);}chunks.push(value);}}finally{reader.releaseLock();}
 try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{throw new VaultError('invalid_json',400);}
}
export function createOpeningHandler({service,origin,enabled=false}){
 const expected=new URL(origin);if(expected.protocol!=='https:'||expected.origin!==origin)throw Error('https_origin_required');
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:secureHeaders});
 return async request=>{
  if(!enabled)return response({error:'not_activated'},503);
  try{
   if(request.method!=='POST')throw new VaultError('method_not_allowed',405);
   if(new URL(request.url).origin!==origin||request.headers.has('origin')||request.headers.has('sec-fetch-site'))throw new VaultError('browser_exchange_denied',403);
   const b=await readBoundedJSON(request);
   const value=await redeemOpening(service,b.id,b.grant,b.verifier);return response(value);
  }catch(e){return e instanceof VaultError?response({error:e.code},e.status):response({error:'service_unavailable'},503);}
 };
}
