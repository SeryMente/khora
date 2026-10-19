import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BlogTextWorkflow,readReference,type Draft,type Reference} from '../../lib/blog/text-workflow';
import {hash,revisionHash,type Revision} from '../../lib/server/blog/domain';
import {BlogRepository} from '../../lib/server/blog/repository';
const id='11111111-1111-4111-8111-111111111111',original='  Ayer caminé.\n\nSentí calma 😀.  ';
const draft:Draft={title:'Ayer caminé.',body:'Ayer caminé.\n\nSentí calma 😀.',date:'2026-10-19T18:00:00Z',format:'link',message:'Una entrada sintética, no publicar.'};
function harness(options:{loseArchive?:boolean;losePrepare?:boolean;badPreview?:boolean;badReceipt?:boolean;loseDecision?:boolean;normUnavailable?:boolean}={}){
 let journal:Reference|null=null,r:Revision|null=null,consent='pending',archives=0,saved=0,sends=0;const calls:any[]=[];
 const response=(v:any,status=200)=>new Response(JSON.stringify(v),{status});
 const status=()=>({id:r?.publicationId,revision:r?.revision,consent,filter:consent==='approved'?'publication_pending':consent==='declined'?'archived_without_permission':'awaiting_decision',deliveries:[]});
 const transport=async(url:string,init:RequestInit)=>{
  const b=JSON.parse(init.body as string);calls.push({url,b});
  if(url==='/api/dictado'){
   archives++;if(options.loseArchive&&archives===1)throw Error('lost');
   return response({id,version:1,sessionId:b.sessionId,sha256:options.badReceipt?hash('wrong'):hash(b.texto),chars:b.texto.length,tipoEntrada:'blog_personal',ofuscada:b.ofuscada,mp3Estado:'no_aplica'});
  }
  if(b.action==='open_turn')return options.normUnavailable?response({code:'NORMATIVE_TURN_UNAVAILABLE'},503):response({turn:{status:'OPEN',turn_token:'fixture-private-token'}});
  if(b.action==='prepare'){
   r=b.revision;saved++;if(options.losePrepare&&saved===1)throw Error('lost');
   return response({publicationId:r!.publicationId,revision:r!.revision,digest:options.badPreview?hash('wrong'):revisionHash(r!),preview:r!.entry,facebook:r!.facebook,representation:'text_only',audioPublic:false,destinations:['blog','facebook']});
  }
  if(b.action==='decide'){sends++;assert.equal(b.digest,revisionHash(r!));consent=b.decision?'approved':'declined';if(options.loseDecision&&sends===1)throw Error('lost');return response(status());}
  if(b.action==='status')return response(status());
  if(b.action==='resume')return response({revision:r,digest:revisionHash(r!),status:status()});
  if(b.action==='decline_archived')return response({publicationId:b.reference.publicationId,sourceVersion:1,consent:'declined',filter:'archived_without_permission',deliveries:[]});
  throw Error('UNEXPECTED_ACTION');
 };
 const storage={read:()=>journal,write:(v:Reference)=>{journal=v;}};
 const w=new BlogTextWorkflow(transport,storage);
 return {w,transport,storage,calls,counts:()=>({archives,saved,sends}),journal:()=>journal};
}
async function prepared(options:Parameters<typeof harness>[0]={}){const h=harness(options);await h.w.archive(original,false);await h.w.prepare(draft);return h;}
test('text-only archive preserves exact UTF16 original and never asks for audio',async()=>{const h=harness();await h.w.archive(original,false);const b=h.calls[0].b;assert.equal(b.texto,original);assert.equal(b.fuenteEntrada,'texto');assert.equal(b.tipoEntrada,'blog_personal');assert(!('audioPartes' in b));assert.equal(h.w.reference?.sourceHash,hash(original));assert.equal(h.w.literalDraft(draft.date).body,draft.body);assert.notEqual(h.w.reference?.publicationId,h.w.reference?.slug.slice(8));});
test('lost archive retry uses same session and source, not a second capture',async()=>{const h=harness({loseArchive:true});await assert.rejects(()=>h.w.archive(original,false),/UNCERTAIN/);await h.w.archive(original,false);assert.equal(h.calls[0].b.sessionId,h.calls[1].b.sessionId);assert.equal(h.calls[0].b.texto,h.calls[1].b.texto);});
test('changed original or classification cannot reuse session',async()=>{const h=await prepared();await assert.rejects(()=>h.w.archive(original+'x',false),/CONFLICT/);await assert.rejects(()=>h.w.archive(original,true),/CONFLICT/);assert.equal(h.counts().archives,1);});
test('malformed archive receipt prevents editorial preparation',async()=>{const h=harness({badReceipt:true});await assert.rejects(()=>h.w.archive(original,false),/MISMATCH/);await assert.rejects(()=>h.w.prepare(draft),/ARCHIVE_REQUIRED/);});
test('journal failure aborts before any network mutation',async()=>{let n=0;const w=new BlogTextWorkflow(async()=>{n++;throw Error();},{read:()=>null,write:()=>{throw Error('disk');}});await assert.rejects(()=>w.archive(original,false),/disk/);assert.equal(n,0);});
test('references whitelist strips text and tokens; invalid IDs fail closed',async()=>{const h=await prepared();const r=readReference({...h.journal(),text:original,token:'secret'});assert(!JSON.stringify(r).includes(original));assert(!JSON.stringify(r).includes('secret'));assert.throws(()=>readReference({...r,sourceId:'wrong'}),/REFERENCE/);});
test('normative upstream is a real gate, not simulated OPEN',async()=>{const h=harness({normUnavailable:true});await h.w.archive(original,false);await assert.rejects(()=>h.w.prepare(draft),/NORMATIVE/);assert.equal(h.counts().saved,0);assert(!JSON.stringify(h.journal()).includes('token'));});
test('no consent is sent by archive or prepare; exact joint preview required',async()=>{const h=await prepared();assert.equal(h.counts().sends,0);const p=h.w.preview!;assert.equal(p.digest,revisionHash(p.revision));assert.equal(p.revision.entry.source.sha256,hash(draft.body));await h.w.decide(true);assert.equal(h.counts().sends,1);assert.equal(h.w.publishedBoth(),false);});
test('unexpected server preview cannot be approved',async()=>{const h=harness({badPreview:true});await h.w.archive(original,false);await assert.rejects(()=>h.w.prepare(draft),/PREVIEW_RECEIPT/);await assert.rejects(()=>h.w.decide(true),/EXACT_PREVIEW/);assert.equal(h.counts().sends,0);});
test('lost prepare permits only same retry or authenticated resume',async()=>{const h=harness({losePrepare:true});await h.w.archive(original,false);await assert.rejects(()=>h.w.prepare(draft),/UNCERTAIN/);await assert.rejects(()=>h.w.prepare({...draft,body:'Otro'}),/RECONCILIATION/);await h.w.prepare(draft);assert.equal(h.w.preview?.revision.revision,1);});
test('resume reconstructs private prepared revision from IDs without plaintext journal',async()=>{const h=await prepared();const next=new BlogTextWorkflow(h.transport,h.storage);assert.equal(next.preview,null);await next.resume();assert.equal(next.preview?.revision.entry.body,draft.body);assert(!JSON.stringify(h.journal()).includes(draft.message));});
test('approval response lost freezes edits; status reconciles without new POST',async()=>{const h=await prepared({loseDecision:true});await assert.rejects(()=>h.w.decide(true),/UNCERTAIN/);assert.equal(h.w.locked,true);await assert.rejects(()=>h.w.prepare({...draft,title:'Otro'}),/LOCKED/);await h.w.status();assert.equal(h.w.statusReceipt?.consent,'approved');assert.equal(h.counts().sends,1);});
test('decline is durable and independent of normative provider before preparation',async()=>{const h=harness({normUnavailable:true});await h.w.archive(original,false);await h.w.decide(false);assert.equal(h.w.statusReceipt?.consent,'declined');assert(!h.calls.some(c=>c.b.action==='open_turn'));});
test('declined cancelled revision needs fresh exact preview, including unchanged text',async()=>{const h=await prepared();await h.w.decide(false);await h.w.prepare(draft);assert.equal(h.w.preview?.revision.revision,2);assert.equal(h.counts().sends,1);});
test('editing public text or Facebook invalidates digest and does not alter original',async()=>{const h=await prepared();const before=h.w.preview!.digest;await h.w.prepare({...draft,message:'Otro texto exacto'});assert.notEqual(h.w.preview!.digest,before);assert.equal(h.w.reference?.sourceHash,hash(original));assert.equal(h.w.preview?.revision.revision,2);assert.equal(h.counts().sends,0);});
test('obfuscated text never gains approval without explicit exposure',async()=>{const h=harness();await h.w.archive(original,true);await h.w.prepare(draft);await assert.rejects(()=>h.w.decide(true),/OBFUSCATED/);assert.equal(h.counts().sends,0);await h.w.decide(true,true);assert.equal(h.counts().sends,1);});
test('oversized serialized payload fails without truncation or network prepare',async()=>{const h=harness();await h.w.archive(original,false);await assert.rejects(()=>h.w.prepare({...draft,body:'x'.repeat(200000),message:'y'.repeat(60000)}),/TRANSPORT_TOO_LARGE/);assert.equal(h.counts().saved,0);});
test('snapshots cannot mutate the pending exact revision',async()=>{const h=await prepared();const p=h.w.preview!;p.revision.entry.body='mutated';await h.w.decide(true);assert.equal(h.w.preview?.revision.entry.body,draft.body);});
test('concurrent operations are serialized, not duplicate client POSTs',async()=>{const h=harness();const a=h.w.archive(original,false);await assert.rejects(()=>h.w.archive(original,false),/OPERATION_IN_PROGRESS/);await a;assert.equal(h.counts().archives,1);});
function repositoryFixture(r:Revision,cancelled=false,actor='owner'){
 const calls:Array<{sql:string;params:any[]}> = [];
 const row={id:r.publicationId,owner:actor,revision:r.revision,volcado_id:r.sourceId,payload_cipher:JSON.stringify(r),consent:'pending',obfuscated:r.obfuscated};
 const query=async(sql:string,params:any[]=[])=>{
  calls.push({sql,params});
  if(sql.includes('FROM volcado v WHERE'))return {rows:params[1]===actor?[{id:r.sourceId,entry_kind:'blog_personal',obfuscated:String(r.obfuscated),recibido_en:'2026-10-19T00:00:00Z'}]:[]};
  if(sql.includes('SELECT texto, sha256 FROM volcado_version'))return {rows:[{texto:original,sha256:hash(original)}]};
  if(sql.includes("state='cancelled'"))return {rows:cancelled?[{one:1}]:[]};
  if(sql.includes('FROM blog_editorial WHERE'))return {rows:params[1]===actor?[row]:[]};
  if(sql.includes('FROM blog_delivery'))return {rows:[]};
  return {rows:[]};
 };
 const repo=new BlogRepository({query,connect:async()=>({query,release(){}})},{encrypt:s=>s,decrypt:s=>s});return {repo,calls};
}
test('owner-only resume rechecks private source and returns no original/approval secrets',async()=>{const h=await prepared(),r=h.w.preview!.revision;const {repo}=repositoryFixture(r);const v=await repo.resume('owner',r.publicationId);assert.equal(v.digest,revisionHash(r));assert(!('text' in v));assert(!JSON.stringify(v).includes('approval_cipher'));await assert.rejects(()=>repo.resume('stranger',r.publicationId),/FORBIDDEN/);});
test('causal server regression: cancelled deliveries cannot silently approve inert outbox',async()=>{const h=await prepared(),r=h.w.preview!.revision;const {repo,calls}=repositoryFixture(r,true);await assert.rejects(()=>repo.approveExact('owner',r.publicationId,revisionHash(r),false),/CANCELLED_REVISION/);assert(!calls.some(c=>c.sql.startsWith('UPDATE blog_editorial SET approval_cipher')));assert(calls.some(c=>c.sql==='ROLLBACK'));});
test('resume route stays behind auth/origin/normative gate and no-store',async()=>{const {readFile}=await import('node:fs/promises');const text=await readFile(new URL('../../app/api/blog/editorial/route.ts',import.meta.url),'utf8');assert(text.indexOf("body.action==='resume'")>text.indexOf('await assertNormativeTurnOpen'));assert.match(text,/resume\(actor,body.publicationId\),\{headers:\{'Cache-Control':'no-store'\}\}/);});
