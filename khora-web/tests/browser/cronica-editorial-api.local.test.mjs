/** Executes the real editorial route/domain, with mocked auth/DB/normative boundaries.
 * No Next server, external network, production credential, or provider operation. */
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
const temp=await mkdtemp(path.join(tmpdir(),'cronica-api-'));
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const hash=s=>createHash('sha256').update(s).digest('hex');
const original='Ayer, este, caminé en casa.';
const body='Ayer caminé en casa.';
const revision={publicationId:'11111111-1111-4111-8111-111111111111',revision:1,sourceId:'22222222-2222-4222-8222-222222222222',sourceVersion:1,sourceHash:hash(original),kind:'blog_personal',obfuscated:false,entry:{schema:1,slug:'sintetica',title:'Crónica sintética',date:'2026-10-19T00:00:00Z',body,source:{kind:'khora',sha256:hash(body)}},facebook:{format:'full_text',message:body}};
revision.editorialReview={schema:1,policy:'cronica-suficiente-v1',reviewedPayloadHash:hash(canonical(revision)),worked:true,soberFirstPerson:true,faithful:true,items:[{id:'when',sourceQuote:'Ayer',publicQuote:'Ayer'},{id:'where',sourceQuote:'casa',publicQuote:'casa'},{id:'what',sourceQuote:'caminé',publicQuote:'caminé'}]};
const g=globalThis;g.__editorialFixture={actor:'owner',normCalls:0,saves:0,declines:0};
const ctx=g.__editorialFixture;
const mocks={
 'next/server':`export const NextResponse={json:(v,o)=>new Response(JSON.stringify(v),{...o,headers:{'Content-Type':'application/json',...o?.headers}})};`,
 '@/auth':`export const auth=async()=>({user:{email:globalThis.__editorialFixture.actor}});`,
 '@/lib/server/mcp-config':`export const getMcpConfig=()=>({allowedEmail:'owner',issuer:'https://synthetic.invalid'});`,
 '@/lib/server/normative-runtime':`export const REQUIRED_PLATFORM='notion';export const REQUIRED_OUTPUT_FORMAT_VERSION='v1.7.7';export const assertNormativeRuntimeContext=()=>{};`,
 '@/lib/server/mcp-normative':`export const assertNormativeTurnOpen=async()=>{globalThis.__editorialFixture.normCalls++;throw Error('NORM_UNAVAILABLE');};export const openNormativeTurn=assertNormativeTurnOpen;`,
 '@/lib/server/blog/service':`export const blogRepository=()=>({save:async()=>{globalThis.__editorialFixture.saves++;},declineArchived:async()=>{globalThis.__editorialFixture.declines++;return {consent:'declined'};},refusal:async()=>null,decline:async()=>{},status:async()=>({consent:'declined'})});`
};
const checks=[];const check=(v,label)=>{assert(v,label);checks.push(label);};
try{
 await build({entryPoints:[path.join(root,'app/api/blog/editorial/route.ts')],outfile:path.join(temp,'route.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'isolated-boundaries',setup(b){b.onResolve({filter:/^(next\/server|@\/)/},a=>mocks[a.path]?{path:a.path,namespace:'fixture'}:a.path==='@/lib/server/blog/domain'?{path:path.join(root,'lib/server/blog/domain.ts')}:null);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'ts'}));}}]});
 const {POST}=await import(pathToFileURL(path.join(temp,'route.mjs')).href);
 const call=(v,origin='https://synthetic.invalid')=>POST(new Request('https://synthetic.invalid/api/blog/editorial',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(v)}));
 ctx.actor=null;check((await call({action:'prepare',revision})).status===401,'unauthenticated preparation denied');ctx.actor='owner';
 check((await call({action:'prepare',revision},'https://other.invalid')).status===403,'wrong origin denied');
 const legacy={...revision};delete legacy.editorialReview;check((await call({action:'prepare',revision:legacy})).status===409,'legacy unreviewed prepare rejected');
 const before=ctx.normCalls;const response=await call({action:'prepare',revision,expectedRevision:null});const preview=await response.json();
 check(response.status===200,'owner reviewed preparation works during normative outage');check(ctx.normCalls===before,'prepare makes no normative request');check(ctx.saves===1,'one authenticated draft save');
 check(preview.digest===hash(canonical(revision))&&canonical(preview.preview)===canonical(revision.entry),'preview binds exact reviewed payload');
 check(preview.audioPublic===false&&preview.metadata.code==='METADATA_NOT_REQUESTED','no public audio or remote model');check(response.headers.get('cache-control')==='no-store','private preview not cacheable');
 check((await call({action:'decide',decision:true,publicationId:revision.publicationId,digest:preview.digest})).status===409,'positive consent remains normative-blocked');
 check((await call({action:'open_turn'})).status===503,'unavailable normative open explicit');
 const negativeBefore=ctx.normCalls;check((await call({action:'decline_archived',reference:{}})).status===200&&ctx.normCalls===negativeBefore,'No independent of normative and editorial sufficiency');
 const stale=structuredClone(revision);stale.facebook.message+=' changed';check((await call({action:'prepare',revision:stale})).status===409,'changed Facebook invalidates human review');
 check(ctx.saves===1,'invalid payload never reaches persistence');
 console.log(JSON.stringify({checks:checks.length,passed:checks,scope:'real route/domain, mocked auth DB normative; not production'}));
}finally{delete g.__editorialFixture;await rm(temp,{recursive:true,force:true});}
