import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hash,approve,publishable,revisionHash,checkProposals,publicEntry,retention,maySendFacebook,type Source,type Revision} from '../../lib/server/blog/domain';
import {proposeMetadata} from '../../lib/server/blog/metadata';
import {deliver,type DeliveryStore} from '../../lib/server/blog/delivery';
import {GitHubBlog,MetaPage,discoverPage} from '../../lib/server/blog/providers';
const source:Source={id:'private-source',version:1,sha256:hash('Ayer caminé. Sentí calma.'),text:'Ayer caminé. Sentí calma.',owner:'owner',receivedAt:'2026-10-19T02:00:00Z',capturedAt:null,kind:'blog_personal',obfuscated:false};
function fixture():Revision{return {publicationId:'11111111-1111-4111-8111-111111111111',revision:1,sourceId:source.id,sourceVersion:1,sourceHash:source.sha256,kind:'blog_personal',obfuscated:false,entry:{schema:1,slug:'prueba-local',title:'Prueba sintética privada',date:'2026-10-18T20:00:00-06:00',body:'No se publica.',source:{kind:'khora',sha256:hash('No se publica.')}},facebook:{format:'link',message:'Texto aprobado sintético'}};}
const now='2026-10-19T02:00:00Z';
test('exact version approves, private identifiers never projected',()=>{const r=fixture();const entry=publishable(r,approve(r,'owner',source,now),'owner',source);assert(!JSON.stringify(entry).includes(source.id));assert.equal(entry.source.sha256,hash(entry.body));});
test('unauthorized actor rejected',()=>assert.throws(()=>approve(fixture(),'other',source,now),/FORBIDDEN/));
test('missing approval rejected',()=>assert.throws(()=>publishable(fixture(),null,'owner',source),/APPROVAL/));
test('editing body invalidates exact approval',()=>{const r=fixture(),a=approve(r,'owner',source,now);r.entry.body='Otro texto';r.entry.source.sha256=hash(r.entry.body);assert.throws(()=>publishable(r,a,'owner',source),/APPROVAL/);});
test('editing Facebook format invalidates approval',()=>{const r=fixture(),a=approve(r,'owner',source,now);r.facebook={format:'full_text',message:'Distinto'};assert.throws(()=>publishable(r,a,'owner',source),/APPROVAL/);});
test('source version change rejected',()=>{const r=fixture(),a=approve(r,'owner',source,now);assert.throws(()=>publishable(r,a,'owner',{...source,version:2}),/VERSION/);});
for(const kind of ['conversacion_maya','interpretacion_simultanea'] as const)test('exclude '+kind,()=>assert.throws(()=>approve({...fixture(),kind},'owner',source,now),/ELIGIBLE/));
test('three independent decisions',()=>{assert.equal(retention('conversacion_maya').graphEligible,true);assert.equal(retention('conversacion_maya').publicConsent,false);assert.equal(retention('interpretacion_simultanea').graphEligible,false);});
test('obfuscation needs explicit decision, flag not exported',()=>{const r={...fixture(),obfuscated:true};assert.throws(()=>approve(r,'owner',{...source,obfuscated:true},now),/OBFUSCATED/);const e=publishable(r,approve(r,'owner',{...source,obfuscated:true},now,true),'owner',{...source,obfuscated:true});assert(!('obfuscated'in e));});
test('reject extra private fields',()=>assert.throws(()=>publicEntry({...fixture().entry,obfuscated:true} as any),/FIELDS/));
test('reject ambiguous public date',()=>assert.throws(()=>publicEntry({...fixture().entry,date:'ayer'}),/TIME/));
test('source hash integrity',()=>assert.throws(()=>approve(fixture(),'owner',{...source,text:'alterado'},now),/INTEGRITY/));
test('anchored proposals preserve exact source and unknown date',async()=>{
 const f=(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({items:[{field:'event_time',value:'Ayer',quote:'Ayer caminé.'}]})}}]}),{status:200})) as typeof fetch;
 const p=await proposeMetadata(source,'not-a-real-key',f);assert.equal(p.eventTime,null);assert.equal(p.capturedAt,null);assert.equal(p.proposals[0].anchor.start,0);assert.equal(p.proposals[0].status,'proposed');
});
test('invented metadata rejected',()=>assert.throws(()=>checkProposals(source,[{field:'person',value:'Persona inventada',method:'test',status:'proposed',anchor:{sourceId:source.id,version:1,sha256:source.sha256,start:0,end:4,quote:'Ayer'}}]),/UNANCHORED/));
test('provider unavailable not simulated',async()=>assert.rejects(()=>proposeMetadata(source,'',fetch),/UNCONFIGURED/));
test('canonical digest key order invariant',()=>{const r=fixture();assert.equal(revisionHash(r),revisionHash(JSON.parse(JSON.stringify(r))));});
test('facebook requires independently confirmed blog',()=>{assert.equal(maySendFacebook('unknown','pending'),false);assert.equal(maySendFacebook('confirmed','pending'),true);assert.equal(maySendFacebook('confirmed','unknown'),false);});
function harness(state:any='pending',externalId:string|null=null){const transitions:any[]=[];const store:DeliveryStore={claim:async()=>({revision:fixture(),state,blog:'confirmed',externalId}),transition:async(...v)=>{transitions.push(v);}};return {store,transitions};}
const blog={publish:async()=>({id:'commit'}),verify:async()=>({id:'slug',url:'https://example.invalid',proofHash:hash('synthetic')})};
test('lost Facebook response is unknown, no blind resend',async()=>{let sends=0;const fb={publish:async()=>{sends++;throw new Error('lost');},verify:async()=>null};const a=harness();assert.equal(await deliver(a.store,blog,fb,'id',1,'facebook'),'reconciliation_required');assert.equal(a.transitions.at(-1)[3],'unknown');const b=harness('unknown');await deliver(b.store,blog,fb,'id',1,'facebook');assert.equal(sends,1);});
test('known Facebook ID reconciles without POST',async()=>{let sends=0;const a=harness('unknown','page_post');const fb={publish:async()=>{sends++;return 'unexpected';},verify:async()=>({id:'page_post',url:'https://www.facebook.com/page_post',proofHash:hash('proof')})};assert.equal(await deliver(a.store,blog,fb,'id',1,'facebook'),'confirmed');assert.equal(sends,0);});
test('GitHub existing identical entry does not write again',async()=>{let puts=0;const e=fixture().entry;const f=(async(_u:any,i:any)=>{if(i.method==='PUT')puts++;return new Response(JSON.stringify({sha:'blob',content:Buffer.from(JSON.stringify(e)).toString('base64')}),{status:200});})as typeof fetch;await new GitHubBlog('fake',f).publish(e);assert.equal(puts,0);});
test('GitHub refuses overwrite different content',async()=>{const f=(async()=>new Response(JSON.stringify({content:Buffer.from('{}').toString('base64')}),{status:200}))as typeof fetch;await assert.rejects(()=>new GitHubBlog('fake',f).publish(fixture().entry),/CONFLICT/);});
test('Meta Page identity not inferred from configured numeric URL',async()=>{const f=(async()=>new Response(JSON.stringify({id:'wrong',name:'Other'}),{status:200}))as typeof fetch;await assert.rejects(()=>new MetaPage('fake','61595788700651',f).verifyIdentity(),/MISMATCH/);});
test('Meta discovery requires explicit content task',async()=>{const f=(async()=>new Response(JSON.stringify({data:[{id:'61595788700651',tasks:['ANALYZE'],access_token:'never-public'}]}),{status:200}))as typeof fetch;await assert.rejects(()=>discoverPage('fake','61595788700651',f),/TASKS/);});
test('Meta discovery bounded cursor loop',async()=>{let n=0;const f=(async()=>{n++;return new Response(JSON.stringify({data:[],paging:{next:'do-not-follow-secret-url',cursors:{after:'same'}}}),{status:200});})as typeof fetch;await assert.rejects(()=>discoverPage('fake','61595788700651',f),/CURSOR/);assert.equal(n,2);});

test("source classification not trusted from public client",()=>assert.throws(()=>approve(fixture(),"owner",{...source,kind:"conversacion_maya"},now),/SOURCE_NOT_BLOG/));

test('provider objects never serialize credentials',()=>{assert(!JSON.stringify(new GitHubBlog('synthetic-secret')).includes('synthetic-secret'));assert(!JSON.stringify(new MetaPage('synthetic-secret','61595788700651')).includes('synthetic-secret'));});

test('session adapter supplies neither external cycle identifier (official random turn)',async()=>{const {readFile}=await import('node:fs/promises');const route=await readFile(new URL('../../app/api/blog/editorial/route.ts',import.meta.url),'utf8');assert.match(route,/openNormativeTurn\(actor,\{runtime:/);assert(!route.includes("conversation_id:'blog-editorial-session'"));});


test('mandatory audio fails closed, independent of environment flags',async()=>{
 const {assertPublicAudioContractReady}=await import('../../lib/server/blog/public-audio-policy');
 const previous=process.env.BLOG_SYNC_ENABLED;try{process.env.BLOG_SYNC_ENABLED='1';assert.throws(()=>assertPublicAudioContractReady(),/^Error: PUBLIC_AUDIO_CONTRACT_REQUIRED$/);}finally{if(previous===undefined)delete process.env.BLOG_SYNC_ENABLED;else process.env.BLOG_SYNC_ENABLED=previous;}
 const {readFile}=await import('node:fs/promises');
 const editorial=await readFile(new URL('../../app/api/blog/editorial/route.ts',import.meta.url),'utf8');
 const dispatch=await readFile(new URL('../../app/api/blog/dispatch/route.ts',import.meta.url),'utf8');
 assert(editorial.indexOf('assertPublicAudioContractReady();')<editorial.indexOf('await repo.approveExact'));
 assert(editorial.indexOf("body.action==='decline_archived'")<editorial.indexOf('assertPublicAudioContractReady();'));
 assert(dispatch.indexOf('assertPublicAudioContractReady();')<dispatch.indexOf("process.env.BLOG_SYNC_ENABLED"));
 assert(dispatch.indexOf('assertPublicAudioContractReady();')<dispatch.indexOf('await deliver('));
 assert(editorial.includes('publicationReady:false,audioRequired:true'));
});
