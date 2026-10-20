/** Google Drive per-file grant. Server-only. This does NOT replace Khora login.
 * Persist transactions/tokens only encrypted. The callback must already have a
 * Khora session and the HttpOnly same-browser state cookie. Picker grants the
 * selected file separately; a pasted file ID alone is not authorization.
 */
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {TransferError} from './transfer.mjs';
export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.file';
const digest=s=>createHash('sha256').update(s).digest('hex');
const opaque=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{43,128}$/.test(s);
const ownerOK=s=>typeof s==='string'&&s.length>0&&s.length<=320&&!/[\x00-\x20\x7f]/.test(s);
const fail=c=>{throw new TransferError(c)};
function configuration(c){
 if(!c||typeof c.clientId!=='string'||!/^[A-Za-z0-9._-]{8,250}\.apps\.googleusercontent\.com$/.test(c.clientId))fail('GOOGLE_CLIENT_NOT_CONFIGURED');
 let u;try{u=new URL(c.redirectUri)}catch{fail('GOOGLE_REDIRECT_INVALID')}
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||u.pathname!=='/api/takeout/google/callback')fail('GOOGLE_REDIRECT_INVALID');
 if(!c.allowedOrigin||u.origin!==c.allowedOrigin)fail('GOOGLE_REDIRECT_INVALID');
 return c;
}
export function beginDriveAuthorization({owner,config,now=Date.now()}){
 configuration(config);if(!ownerOK(owner)||!Number.isSafeInteger(now)||now<0)fail('GOOGLE_OWNER_REQUIRED');
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(64).toString('base64url');
 const transaction={owner,state_hash:digest(state),verifier,client_id:config.clientId,redirect_uri:config.redirectUri,expires_at:now+600000};
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 for(const [k,v]of Object.entries({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:DRIVE_SCOPE,state,code_challenge:digestChallenge(verifier),code_challenge_method:'S256',access_type:'offline',prompt:'consent',include_granted_scopes:'false'}))url.searchParams.set(k,v);
 return {authorization_url:url.toString(),cookie_state:state,transaction};
}
function digestChallenge(s){return createHash('sha256').update(s).digest('base64url')}
function matchState(a,b){if(!opaque(a)||!opaque(b))return false;const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)}
async function exchange(fields,fetcher,now){
 let r;try{r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:new URLSearchParams(fields),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)})}catch{fail('GOOGLE_TOKEN_TRANSPORT_FAILED')}
 if(!r.ok){await r.body?.cancel().catch(()=>{});fail('GOOGLE_GRANT_REJECTED')}
 if(!r.body)fail('GOOGLE_TOKEN_INVALID');const reader=r.body.getReader();let n=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>65536)fail('GOOGLE_TOKEN_INVALID');chunks.push(Buffer.from(value))}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 let t;try{t=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail('GOOGLE_TOKEN_INVALID')}
 if(typeof t.access_token!=='string'||t.access_token.length<8||t.access_token.length>16384||/[\x00-\x20\x7f]/.test(t.access_token)||t.token_type?.toLowerCase()!=='bearer'||!Number.isInteger(t.expires_in)||t.expires_in<1||t.expires_in>7200)fail('GOOGLE_TOKEN_INVALID');
 if(t.scope!==DRIVE_SCOPE)fail('GOOGLE_SCOPE_MISMATCH');
 if(t.refresh_token!==undefined&&(typeof t.refresh_token!=='string'||t.refresh_token.length<8||t.refresh_token.length>16384||/[\x00-\x20\x7f]/.test(t.refresh_token)))fail('GOOGLE_TOKEN_INVALID');
 return {access_token:t.access_token,expires_at:now+t.expires_in*1000,...(t.refresh_token?{refresh_token:t.refresh_token}:{}),scope:DRIVE_SCOPE};
}
export async function finishDriveAuthorization({owner,state,cookieState,code,config,consume,fetcher=fetch,now=Date.now()}){
 configuration(config);
 if(!Number.isSafeInteger(now)||now<0||!ownerOK(owner)||!matchState(state,cookieState)||typeof code!=='string'||code.length<8||code.length>4096||/[\x00-\x20\x7f]/.test(code)||typeof consume!=='function')fail('GOOGLE_STATE_INVALID');
 // consume must atomically delete/mark a live encrypted transaction for BOTH
 // state_hash AND the authenticated owner. Never a read followed by a delete.
 const t=await consume(digest(state),owner);
 if(!t||Object.keys(t).some(k=>!['owner','state_hash','verifier','client_id','redirect_uri','expires_at'].includes(k))||t.owner!==owner||t.state_hash!==digest(state)||!opaque(t.verifier)||t.client_id!==config.clientId||t.redirect_uri!==config.redirectUri||!Number.isSafeInteger(t.expires_at)||t.expires_at<=now||t.expires_at>now+600000)fail('GOOGLE_STATE_EXPIRED_OR_USED');
 if(typeof config.clientSecret!=='string'||config.clientSecret.length<8||config.clientSecret.length>4096)fail('GOOGLE_CLIENT_NOT_CONFIGURED');
 return exchange({client_id:config.clientId,client_secret:config.clientSecret,code,code_verifier:t.verifier,redirect_uri:config.redirectUri,grant_type:'authorization_code'},fetcher,now);
}
