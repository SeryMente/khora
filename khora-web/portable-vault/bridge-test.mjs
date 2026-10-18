/** Synthetic integration only. Browser identity is an EXPLICIT fixture, not real OIDC/Ente. */
import {PGlite} from '@electric-sql/pglite';
import {VaultService,PGliteStore} from './core.mjs';
import {createHandler} from './http.mjs';
import {createOpeningHandler,authorizeOpening,redeemOpening,challengeFor} from './bridge.mjs';
import {openOnline} from './native-open.mjs';
import {generate} from 'otplib';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const evidence={scope:'SYNTHETIC_BROWSER_NATIVE_BRIDGE',realOIDC:false,realEnte:false,productionChanged:false,tests:[]};
const ok=(name,value)=>{assert.ok(value,name);evidence.tests.push(name);};
async function no(name,f){await assert.rejects(f);evidence.tests.push(name);}
const db=new PGlite();const store=new PGliteStore(db);let clock=Date.now();await store.initialize();const service=new VaultService(store,randomBytes(32),{clock:()=>clock});const p={subject:'synthetic-bridge-owner',binding:'synthetic-browser-session-0001'},origin='https://khora.invalid';
const enrollment=await service.enroll(p);const id=enrollment.id,secret=new URL(enrollment.uri).searchParams.get('secret');const step=()=>{clock+=61000;};const code=()=>generate({secret,epoch:Math.floor(clock/1000),algorithm:'sha1',period:30,digits:6});await service.confirm(p,id,await code());step();
const browser=createHandler({service,authenticate:async()=>p,origin,enabled:true});const unauth=createHandler({service,authenticate:async()=>null,origin,enabled:true});const native=createOpeningHandler({service,origin,enabled:true});
function request(body,headers={}){return new Request(origin+'/api/seguridad/boveda-portable',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(body)});}
const verifier=randomBytes(32).toString('base64url'),challenge=challengeFor(verifier);
const authBody={action:'authorize_opening',id,code:await code(),challenge};
try{
 ok('browser_primary_session_required',(await unauth(request(authBody))).status===401);
 ok('browser_cross_origin_denied',(await browser(request(authBody,{Origin:'https://evil.invalid'}))).status===403);
 ok('invalid_challenge_not_authorized',(await browser(request({...authBody,challenge:'bad'}))).status===403);
 const r=await browser(request(authBody)),grant=(await r.json()).grant;ok('browser_session_plus_otp_issues_opening',r.status===200&&typeof grant==='string');
 await no('wrong_verifier_denied',()=>redeemOpening(service,id,grant,randomBytes(32).toString('base64url')));
 await no('browser_cookie_binding_cannot_redeem_native_grant',()=>service.release(p,id,grant));
 ok('browser_origin_denied_on_native_exchange',(await native(new Request(origin+'/api/oauth/portable-vault/open',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id,grant,verifier})}))).status===403);
 const body={id,grant,verifier,subject:'forged-ignored',cookie:'not-a-session'};
 const nr=await native(new Request(origin+'/api/oauth/portable-vault/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));const release=await nr.json();ok('native_proof_releases_persisted_owner_only',nr.status===200&&release.id===id&&release.recipient===enrollment.recipient);
 ok('sensitive_response_not_cached',nr.headers.get('cache-control').includes('no-store'));
 await no('grant_replay_denied',()=>redeemOpening(service,id,grant,verifier));
 ok('same_otp_cannot_authorize_another_opening',(await browser(request(authBody))).status===403);step();
 const exp=await authorizeOpening(service,p,id,await code(),challenge);clock+=46000;await no('expired_opening_denied',()=>redeemOpening(service,id,exp.grant,verifier));step();
 const nv=randomBytes(32).toString('base64url');const ng=await authorizeOpening(service,p,id,await code(),challengeFor(nv));const parallel=await Promise.allSettled([redeemOpening(service,id,ng.grant,nv),redeemOpening(service,id,ng.grant,nv)]);ok('concurrent_consume_exactly_once',parallel.filter(x=>x.status==='fulfilled').length===1);step();
 let browserVisits=0;
 async function syntheticBrowser(raw){
  browserVisits++;const u=new URL(raw);ok('native_launch_https_khora_only',u.origin===origin&&u.pathname.endsWith('/abrir'));
  const callback=new URL(`http://127.0.0.1:${u.searchParams.get('port')}/callback`);for(const k of ['id','state'])callback.searchParams.set(k,u.searchParams.get(k));
  const wrong=new URL(callback);wrong.searchParams.set('state','wrong');wrong.searchParams.set('grant','a'.repeat(43));ok('loopback_rejects_wrong_state',(await fetch(wrong)).status===400);
  const ar=await browser(request({action:'authorize_opening',id,challenge:u.searchParams.get('challenge'),code:await code()}));const ag=await ar.json();callback.searchParams.set('grant',ag.grant);
  const cr=await fetch(callback);ok('loopback_callback_returns_no_key',cr.status===200&&!(await cr.text()).includes('AGE-SECRET'));
 }
 const realAdapterExchange=async(_origin,b)=>{const r=await native(new Request(origin+'/api/oauth/portable-vault/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}));if(!r.ok)throw Error('denied');return r.json();};
 const one=await openOnline({origin,id,launch:syntheticBrowser,exchange:realAdapterExchange,timeoutMs:5000});ok('complete_synthetic_browser_loopback_exchange',one.id===id&&typeof one.identity==='string');step();
 const two=await openOnline({origin,id,launch:syntheticBrowser,exchange:realAdapterExchange,timeoutMs:5000});ok('second_opening_requires_new_browser_and_otp',browserVisits===2&&two.id===one.id);step();
 await no('no_callback_times_out',()=>openOnline({origin,id,launch:async()=>{},timeoutMs:30}));
 await no('http_khora_origin_rejected',()=>openOnline({origin:'http://khora.invalid',id}));
 await no('khora_origin_with_path_rejected',()=>openOnline({origin:origin+'/extra',id}));
 const nativeReq=(body,headers={})=>new Request(origin+'/api/oauth/portable-vault/open',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
 ok('native_malformed_json_denied',(await native(nativeReq('{'))).status===400);
 ok('native_oversize_body_denied',(await native(nativeReq('x'.repeat(5000)))).status===413);
 ok('native_non_json_denied',(await native(nativeReq({}, {'Content-Type':'text/plain'}))).status===415);
 ok('native_fetch_metadata_denied',(await native(nativeReq({}, {'sec-fetch-site':'same-origin'}))).status===403);
 ok('native_get_denied',(await native(new Request(origin))).status===405);
 ok('native_wrong_origin_denied',(await native(new Request('https://evil.invalid',{method:'POST'}))).status===403);
 await no('unknown_grant_cannot_derive_owner',()=>redeemOpening(service,id,'a'.repeat(43),verifier));
 const cookieGrant=await service.authorize(p,id,await code());step();await no('native_proof_cannot_redeem_browser_grant',()=>redeemOpening(service,id,cookieGrant.grant,verifier));
 const disabled=createOpeningHandler({service,origin});ok('native_route_disabled_by_default',(await disabled(new Request(origin,{method:'POST'}))).status===503);
 const revoked=await authorizeOpening(service,p,id,await code(),challenge);step();await service.revoke(p,id,await code());await no('revocation_blocks_issued_opening',()=>redeemOpening(service,id,revoked.grant,verifier));
 evidence.passed=evidence.tests.length;evidence.result='PASSED_SYNTHETIC_BRIDGE_ONLY';await writeFile(new URL('./bridge-evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({result:evidence.result,passed:evidence.passed}));
}finally{await db.close();}
