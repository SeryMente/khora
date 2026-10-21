import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { addKhoraExperience, configureKhoraNativeUI, nativeDocumentPath, nativeUnavailablePage, presentNativeConfig, presentNativeModels, RECOVERY_DELAYS_MS } from '../../lib/server/chat-experience';
const fixture='<!doctype html><html><head><title>Open WebUI</title></head><body><div style="display: contents"><script>/* original official bootstrap */</script></div><!-- official branding retained --></body></html>';
test('official config keeps identity, permissions and features, adds only presentation defaults',()=>{
 const features={auth:true,enable_api_keys:false,enable_signup:false};const input={status:true,name:'Open WebUI',version:'0.12.3',features,oauth:{providers:{}},i18n:{fr:{x:'y'}}};
 const out=configureKhoraNativeUI(input) as any;assert.equal(out.default_locale,'es-ES');assert.equal(out.features,features);assert.equal(out.oauth,input.oauth);assert.equal(out.name,'Open WebUI');assert.equal(out.version,'0.12.3');assert.deepEqual(out.i18n.fr,{x:'y'});assert.equal(input.i18n.fr.x,'y');assert.equal('default_locale' in input,false);assert.equal(out.default_prompt_suggestions.length,2);assert.doesNotMatch(JSON.stringify(out.default_prompt_suggestions),/trading|Roman Empire|kids/i);
});
test('config contract fails closed, never returns arbitrary upstream or error content',async()=>{
 for(const value of [null,[],{}, {status:true}]) assert.throws(()=>configureKhoraNativeUI(value),/CONTRACT/);
 const res=await presentNativeConfig(Response.json({private_sentinel:'never expose'}));assert.equal(res.status,503);assert.doesNotMatch(await res.text(),/private_sentinel|never expose/);assert.match(res.headers.get('cache-control')!,/private, no-store/);
 const original=new Response('event',{headers:{'content-type':'text/event-stream'}});assert.equal(await presentNativeConfig(original),original);assert.equal(original.bodyUsed,false);
 const denied=Response.json({error:'Auth required'},{status:401});assert.equal(await presentNativeConfig(denied),denied);
});
test('config adaptation removes stale length/encoding but preserves native security headers',async()=>{
 const res=await presentNativeConfig(new Response(JSON.stringify({status:true,features:{auth:true}}),{headers:{'content-type':'application/json','content-length':'1','content-encoding':'gzip','X-Content-Type-Options':'nosniff'}}));assert.equal(res.status,200);assert.equal(res.headers.get('content-length'),null);assert.equal(res.headers.get('content-encoding'),null);assert.equal(res.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(res.headers.get('X-Khora-Native-Experience'),'enraizamiento-v1');
});
test('experience is idempotent, pinned-bootstrap-only and preserves upstream/license',()=>{
 const result=addKhoraExperience(fixture);assert.equal(addKhoraExperience(result),result);assert.match(result,/Open WebUI/);assert.match(result,/official branding retained/);assert.match(result,/original official bootstrap/);assert.match(result,/incorporación no verificada/);assert.match(result,/href="\/sistema\/ingreso"/);assert.match(result,/data-khora-native-root/);assert.match(result,/searchParams.set\('lang','es-ES'\)/);assert.doesNotMatch(result,/localStorage|sessionStorage|indexedDB|document.cookie|token/);assert.throws(()=>addKhoraExperience('<html></html>'),/CONTRACT/);
});
test('native document scope excludes APIs/streams/mutations/other product surfaces',()=>{
 for(const p of ['/','/auth','/c/ab2cd529-3930-49f1-aee9-ad1c49e40301']) assert.equal(nativeDocumentPath(p),true);
 for(const p of ['/api/config','/api/chat/completions','/sistema/ingreso','/api/v1/chats','/c/<script>'])assert.equal(nativeDocumentPath(p),false);
});
test('unavailable document preserves 5xx, redaction, private cache and honest state',async()=>{
 for(const status of [502,503,504]) {const res=nativeUnavailablePage(status);assert.equal(res.status,status);assert.match(res.headers.get('content-type')!,/text\/html/);assert.equal(res.headers.get('retry-after'),'5');const text=await res.text();assert.match(text,/No se ha podido abrir/);assert.match(text,/no indica si el servicio está arrancando/);assert.match(text,/no se envía ni se vuelve a enviar ningún mensaje/);assert.match(text,/aria-live="polite"/);assert.doesNotMatch(text,/apiKey|JWT|localStorage|cookie|setInterval|method:'POST'/);}
 const fallback=await nativeUnavailablePage(503,true).text();assert.match(fallback,/No se pudo cargar la presentación/);assert.doesNotMatch(fallback,/fetch\(/);
});
async function simulate(status:number,success=false){
 const html=await nativeUnavailablePage(status).text();const script=html.match(/<script>([\s\S]*?)<\/script>/)![1];const timers:Array<()=>Promise<void>>=[];const listeners:Record<string,()=>void>={};const info={textContent:''};const retry={disabled:false,addEventListener:(_:string,f:()=>void)=>{listeners.click=f}};const calls:any[]=[];let replaced=false;
 const sandbox={document:{getElementById:(id:string)=>id==='connection-state'?info:retry},addEventListener:(k:string,f:()=>void)=>{listeners[k]=f},setTimeout:(f:()=>Promise<void>)=>{timers.push(f);return timers.length},clearTimeout:()=>{timers.splice(0)},fetch:async(_:unknown,init:any)=>{calls.push(init);return {ok:success,status,headers:new Headers(success?{'X-Khora-Native-Presentation':'pinned-css-inline-v1'}:{})}},AbortSignal:{timeout:()=>undefined},location:{href:'https://khora.test/c/id',replace:()=>{replaced=true}}};vm.runInNewContext(script,sandbox);let guard=0;while(timers.length){assert.ok(++guard<=20);await timers.shift()!();}return{calls,info,replaced,listeners};
}
test('recovery is bounded GET-only and never replays messages',async()=>{const out=await simulate(503);assert.equal(out.calls.length,RECOVERY_DELAYS_MS.length);for(const c of out.calls){assert.equal(c.method,'GET');assert.equal(c.cache,'no-store');assert.equal(c.body,undefined);}assert.match(out.info.textContent,/continúa sin responder/);assert.equal(out.replaced,false);});
test('recovery stops at auth denial instead of spinning or relaxing authentication',async()=>{for(const status of [401,403]){const out=await simulate(status);assert.equal(out.calls.length,1);assert.match(out.info.textContent,/sesión necesita revisión/);assert.equal(out.replaced,false);}});
test('successful recovery navigates once to native HTML, no synthetic app substituted',async()=>{const out=await simulate(200,true);assert.equal(out.calls.length,1);assert.equal(out.replaced,true);});

test('native model descriptions adapt only the existing pipe, without grants/data changes',async()=>{
const grant={permission:'read'};const body={data:[{id:'khora_epistwin',name:'Khora',info:{meta:{description:'Consulta pública mediante el núcleo Khora.',other:'preserved'},access_grants:[grant]}},{id:'other',info:{meta:{description:'unchanged'}}}]};
const r=await presentNativeModels(Response.json(body));const out=await r.json();assert.match(out.data[0].info.meta.description,/evidencia recuperada/);assert.equal(out.data[0].info.meta.other,'preserved');assert.deepEqual(out.data[0].info.access_grants,[grant]);assert.deepEqual(out.data[1],body.data[1]);
const unknown=Response.json({unknown:[]});assert.equal(await presentNativeModels(unknown),unknown);assert.equal(unknown.bodyUsed,false);
});
