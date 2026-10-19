import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertEditorialReview,editorialReviewPayload,type EditorialReview} from '../../lib/blog/editorial-review';
import {hash,canonical,revisionCheck,revisionHash,approve,publishable,type Source,type Revision} from '../../lib/server/blog/domain';
import {BlogRepository} from '../../lib/server/blog/repository';
const original='Ayer, este, caminé en casa. Sentí calma.';
const source:Source={id:'22222222-2222-4222-8222-222222222222',version:1,sha256:hash(original),text:original,owner:'owner',receivedAt:'2026-10-19T00:00:00Z',capturedAt:null,kind:'blog_personal',obfuscated:false};
function fixture():Revision{
 const body='Ayer caminé en casa. Sentí calma.';
 const r:Revision={publicationId:'11111111-1111-4111-8111-111111111111',revision:1,sourceId:source.id,sourceVersion:1,sourceHash:source.sha256,kind:'blog_personal',obfuscated:false,
 entry:{schema:1,slug:'cronica-sintetica',title:'Mi crónica sintética',date:'2026-10-19T00:00:00Z',body,source:{kind:'khora',sha256:hash(body)}},facebook:{format:'full_text',message:body}};
 r.editorialReview={schema:1,policy:'cronica-suficiente-v1',reviewedPayloadHash:hash(canonical(editorialReviewPayload(r))),worked:true,soberFirstPerson:true,faithful:true,items:[{id:'when',sourceQuote:'Ayer',publicQuote:'Ayer'},{id:'where',sourceQuote:'en casa',publicQuote:'en casa'},{id:'what',sourceQuote:'caminé',publicQuote:'caminé'}]};return r;
}
const seal=(r:Revision)=>{r.editorialReview!.reviewedPayloadHash=hash(canonical(editorialReviewPayload(r)));return r;};
const check=(r:Revision)=>assertEditorialReview(r,hash(canonical(editorialReviewPayload(r))),original);
test('reviewed worked draft passes; source remains unchanged',()=>{const r=fixture();check(r);revisionCheck(r);assert.equal(original,source.text);});
test('public approval is distinct from editorial review',()=>{assert.throws(()=>publishable(fixture(),null,'owner',source),/APPROVAL_REQUIRED/);});
test('approved exact version exports public fields only',()=>{const r=fixture();const out=publishable(r,approve(r,'owner',source,'2026-10-19T00:00:00Z'),'owner',source);assert(!JSON.stringify(out).includes('editorialReview'));assert(!JSON.stringify(out).includes(source.id));});
for(const flag of ['worked','soberFirstPerson','faithful'] as const)test('requires human '+flag,()=>{const r=fixture();(r.editorialReview as any)[flag]=false;assert.throws(()=>check(r),/REVIEW_REQUIRED/);});
test('legacy raw revision blocked, not implicitly approved',()=>{const r=fixture();delete r.editorialReview;assert.throws(()=>revisionHash(r),/REVIEW_REQUIRED/);});
test('literal formatting is not worked prose',()=>{const r=fixture();r.entry.body=original.replace(/ /g,'\n');r.entry.source.sha256=hash(r.entry.body);r.editorialReview!.items.forEach(i=>i.publicQuote=i.publicQuote.replace(/ /g,'\n'));seal(r);assert.throws(()=>check(r),/TEXT_UNWORKED/);});
for(const id of ['when','where','what'])test('mandatory '+id+' reviewed, never inferred',()=>{const r=fixture();r.editorialReview!.items=r.editorialReview!.items.filter(i=>i.id!==id);assert.throws(()=>check(r),/SUFFICIENCY_REQUIRED/);});
test('duplicates cannot satisfy missing review',()=>{const r=fixture();r.editorialReview!.items[2]={...r.editorialReview!.items[1]};assert.throws(()=>check(r),/SUFFICIENCY_REQUIRED/);});
test('invented source quotation blocked even with attestation',()=>{const r=fixture();r.editorialReview!.items[1].sourceQuote='en París';assert.throws(()=>check(r),/SOURCE_EVIDENCE/);});
test('public evidence must exist literally',()=>{const r=fixture();r.editorialReview!.items[1].publicQuote='en París';assert.throws(()=>check(r),/EVIDENCE_REQUIRED/);});
test('empty evidence blocked',()=>{const r=fixture();r.editorialReview!.items[0].sourceQuote=' ';assert.throws(()=>check(r),/EVIDENCE_REQUIRED/);});
for(const field of ['title','body','date'] as const)test('editing '+field+' invalidates review',()=>{const r=fixture();r.entry[field]+=' cambio';assert.throws(()=>check(r),/REVIEW_STALE/);});
for(const field of ['format','message'] as const)test('editing Facebook '+field+' invalidates review',()=>{const r=fixture();if(field==='format')r.facebook.format='link';else r.facebook.message='Cambio';assert.throws(()=>check(r),/REVIEW_STALE/);});
for(const field of ['sourceId','sourceVersion','sourceHash','revision','obfuscated'] as const)test('binding '+field+' exact',()=>{const r=fixture();(r as any)[field]=typeof r[field]==='number'?2:typeof r[field]==='boolean'?true:'changed';assert.throws(()=>check(r),/REVIEW_STALE/);});
test('old consent invalid after reviewed revision changes',()=>{const r=fixture(),a=approve(r,'owner',source,'2026-10-19T00:00:00Z');r.revision++;seal(r);assert.throws(()=>publishable(r,a,'owner',source),/APPROVAL_REQUIRED/);});
test('source hash/owner independently checked',()=>{assert.throws(()=>approve(fixture(),'other',source,'2026-10-19T00:00:00Z'),/FORBIDDEN/);assert.throws(()=>approve(fixture(),'owner',{...source,text:'alterado'},'2026-10-19T00:00:00Z'),/INTEGRITY/);});
test('obfuscation still requires its own explicit exposure',()=>{const r=seal({...fixture(),obfuscated:true});assert.throws(()=>approve(r,'owner',{...source,obfuscated:true},'2026-10-19T00:00:00Z'),/OBFUSCATED/);});
test('long prose never silently truncated',()=>{const r=fixture();r.entry.body+=' Conservo dudas y rectificaciones.'.repeat(1800);r.entry.source.sha256=hash(r.entry.body);seal(r);check(r);assert(r.entry.body.length>50000);});
test('review source quotations checked inside repository before draft save',async()=>{
 const statements:string[]=[];const r=fixture();r.editorialReview!.items[0].sourceQuote='Inventado';
 const c={release(){},query:async(sql:string)=>{statements.push(sql);return {rows:[]};}};
 const repo=new BlogRepository({connect:async()=>c,query:c.query},{encrypt:s=>s,decrypt:s=>s});
 repo.source=async()=>source;
 await assert.rejects(()=>repo.save('owner',r,null),/SOURCE_EVIDENCE/);assert(!statements.some(s=>s.startsWith('INSERT')||s.startsWith('UPDATE')));assert(statements.includes('ROLLBACK'));
});
test('No preserves source without editorial sufficiency',async()=>{
 let decrypts=0;const c={release(){},query:async(sql:string)=>({rows:sql.includes('FOR SHARE OF v')?[{id:source.id,obfuscated:false}]:[]})};
 const repo=new BlogRepository({connect:async()=>c,query:c.query},{encrypt:s=>s,decrypt:s=>{decrypts++;return s;}});
 await repo.declineArchived('owner',{publicationId:fixture().publicationId,sourceId:source.id,sourceVersion:1,sourceHash:source.sha256});assert.equal(decrypts,0);
});
