/** Web Request/Response adapter. authenticate MUST be a trusted server-side session resolver.
 * No bearer fallback, user/header-based identity, CORS wildcard, or offline recovery. */
import {VaultError} from './core.mjs';
import {authorizeOpening} from './bridge.mjs';
const headers={'Content-Type':'application/json','Cache-Control':'no-store, private, max-age=0','Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export function createHandler({service,authenticate,origin,enabled=false}){
 const expected=new URL(origin);if(expected.protocol!=='https:')throw Error('https_origin_required');
 return async function handle(request){
  if(!enabled)return response({error:'not_activated'},503);
  try {
   if(request.method!=='POST')return response({error:'method_not_allowed'},405);
   if(new URL(request.url).origin!==expected.origin||request.headers.get('origin')!==expected.origin)return response({error:'origin_denied'},403);
   if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return response({error:'json_required'},415);
   const principal=await authenticate(request);service.principal(principal);
   // Limit before parsing; a forged/missing Content-Length does not bypass the bound.
   const reader=request.body?.getReader();if(!reader)return response({error:'body_required'},400);
   let size=0;const chunks=[];
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return response({error:'body_too_large'},413);}chunks.push(value);}}
   finally{reader.releaseLock();}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return response({error:'invalid_json'},400);}
   if(!body||typeof body!=='object'||Array.isArray(body))return response({error:'invalid_body'},400);
   const {action,id,code,grant}=body;
   if(action==='capabilities')return response({available:true,opening:'khora-session-and-totp-per-opening',client:'node22-candidate'});
   if(action==='enroll')return response(await service.enroll(principal),201);
   if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id))return response({error:'invalid_id'},400);
   switch(action){
    case 'confirm':return response(await service.confirm(principal,id,code));
    case 'status':return response(await service.status(principal,id));
    case 'authorize_opening':return response(await authorizeOpening(service,principal,id,code,body.challenge));
    case 'authorize':return response(await service.authorize(principal,id,code));
    case 'release':return response(await service.release(principal,id,grant));
    case 'revoke':return response(await service.revoke(principal,id,code));
    default:return response({error:'unknown_action'},400);
   }
  }catch(e){return e instanceof VaultError?response({error:e.code},e.status):response({error:'service_unavailable'},503);}
 };
}
