/** Text-only Blog adapter. No provider secrets, audio, implicit consent or public writes.
 * The reference journal contains IDs/hashes only; private text and normative token stay in memory.
 * Archive/prepare retries reuse the exact request; uncertain delivery is never resent here.
 */
import {canonicoEditorial,huellaTexto,publicadoEnAmbos,type RevisionEditorial} from '../custodia/editorial';
import {prepareLiteralTranscript,assertPagesTextCompatible} from './transcript-preparation';
export type Reference={schema:1;sessionId:string;publicationId:string;slug:string;sourceHash:string;obfuscated:boolean;sourceId?:string;sourceVersion?:number};
export type Receipt={revision:number;consent:string;filter:string;deliveries:Array<{revision:number;target:string;state:string;url?:string|null;proof_hash?:string|null;last_code?:string|null}>};
export type Draft={title:string;body:string;date:string;format:'link'|'full_text';message:string};
export type Preview={digest:string;revision:RevisionEditorial};
export type Journal={read:()=>unknown;write:(reference:Reference)=>void};
type Transport=(url:string,init:RequestInit)=>Promise<Response>;
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(s);
const hex=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function fail(s:string):never{throw Error(s);}
const copy=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
export function readReference(x:unknown):Reference|null{
 if(x==null)return null;
 if(!x||typeof x!=='object')return fail('REFERENCE_INVALID');
 const r=x as Reference;
 if(r.schema!==1||!uuid(r.sessionId)||!uuid(r.publicationId)||!hex(r.sourceHash)||typeof r.obfuscated!=='boolean'||!/^entrada-[a-f0-9-]{36}$/.test(r.slug)||r.sourceId!==undefined&&(!uuid(r.sourceId)||r.sourceVersion!==1))return fail('REFERENCE_INVALID');
 // Whitelist, never copy arbitrary journal keys (text, tokens, credentials).
 return {schema:1,sessionId:r.sessionId,publicationId:r.publicationId,slug:r.slug,sourceHash:r.sourceHash,obfuscated:r.obfuscated,...(r.sourceId?{sourceId:r.sourceId,sourceVersion:1}:{})};
}
export class BlogTextWorkflow{
 private ref:Reference|null;private token='';private original='';private pending:RevisionEditorial|null=null;private prepared:Preview|null=null;private receipt:Receipt|null=null;private busy=false;
 constructor(private transport:Transport,private journal:Journal){this.ref=readReference(journal.read());}
 get reference(){return this.ref?copy(this.ref):null;}
 get preview(){return this.prepared?copy(this.prepared):null;}
 get statusReceipt(){return this.receipt?copy(this.receipt):null;}
 get locked(){return this.receipt?.consent==='approved';}
 private async exclusive<T>(fn:()=>Promise<T>){if(this.busy)fail('OPERATION_IN_PROGRESS');this.busy=true;try{return await fn();}finally{this.busy=false;}}
 private async post(action:string,payload:Record<string,unknown>={},norm=true):Promise<any>{
  if(norm&&!this.token){
   const opened=await this.post('open_turn',{_thinking_mode:'UNAVAILABLE',_output_format_version:'v1.7.7'},false);
   if(opened?.turn?.status!=='OPEN'||typeof opened?.turn?.turn_token!=='string'||!opened.turn.turn_token)fail('NORMATIVE_TURN_UNAVAILABLE');
   this.token=opened.turn.turn_token;
  }
  const data={action,...payload,...(norm?{_thinking_mode:'UNAVAILABLE',_output_format_version:'v1.7.7',_norm_turn_token:this.token}:{})};
  const raw=JSON.stringify(data);if(raw.length>240000)fail('EDITORIAL_TRANSPORT_TOO_LARGE');
  let response:Response;try{response=await this.transport('/api/blog/editorial',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:raw});}catch{return fail('RESPONSE_UNCERTAIN');}
  let value:any;try{value=await response.json();}catch{return fail('RESPONSE_INVALID');}
  if(!response.ok){if(value?.code==='NORMATIVE_TURN_REQUIRED')this.token='';return fail(typeof value?.code==='string'&&/^[A-Z_]+$/.test(value.code)?value.code:'EDITORIAL_REQUEST_FAILED');}
  return value;
 }
 async archive(text:string,obfuscated:boolean):Promise<Reference>{return this.exclusive(async()=>{
  prepareLiteralTranscript(text);if(typeof obfuscated!=='boolean')fail('CLASSIFICATION_REQUIRED');
  const sourceHash=await huellaTexto(text);
  if(this.ref&&(this.ref.sourceHash!==sourceHash||this.ref.obfuscated!==obfuscated))fail('ARCHIVE_SESSION_CONFLICT');
  if(!this.ref){
   const r:Reference={schema:1,sessionId:crypto.randomUUID(),publicationId:crypto.randomUUID(),slug:'entrada-'+crypto.randomUUID(),sourceHash,obfuscated};
   this.journal.write(copy(r));this.ref=r; // If journaling fails, no POST can occur.
  }
  this.original=text;
  if(this.ref.sourceId)return copy(this.ref);
  let res:Response;try{res=await this.transport('/api/dictado',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({texto:text,sessionId:this.ref.sessionId,fuenteEntrada:'texto',tipoEntrada:'blog_personal',ofuscada:obfuscated})});}catch{return fail('ARCHIVE_RESPONSE_UNCERTAIN');}
  let r:any;try{r=await res.json();}catch{return fail('ARCHIVE_RESPONSE_INVALID');}
  if(!res.ok)fail('ARCHIVE_NOT_CONFIRMED');
  if(!uuid(r.id)||r.version!==1||r.sessionId!==this.ref.sessionId||r.sha256!==sourceHash||r.chars!==text.length||r.tipoEntrada!=='blog_personal'||r.ofuscada!==obfuscated||r.mp3Estado!=='no_aplica')fail('ARCHIVE_RECEIPT_MISMATCH');
  const next={...this.ref,sourceId:r.id,sourceVersion:1};this.journal.write(copy(next));this.ref=next;return copy(next);
 });}
 literalDraft(date:string):Pick<Draft,'title'|'body'|'date'>{
  if(!this.original)fail('ORIGINAL_NOT_IN_MEMORY');const d=prepareLiteralTranscript(this.original);return {title:d.titleProposal?.text??'',body:d.body,date};
 }
 private async validateRevision(r:RevisionEditorial){
  const ref=this.ref;if(!ref?.sourceId||r.publicationId!==ref.publicationId||r.sourceId!==ref.sourceId||r.sourceVersion!==ref.sourceVersion||r.sourceHash!==ref.sourceHash||r.kind!=='blog_personal'||r.obfuscated!==ref.obfuscated||!Number.isSafeInteger(r.revision)||r.revision<1)fail('EDITORIAL_REFERENCE_MISMATCH');
  assertPagesTextCompatible(r.entry);
  if(r.entry.slug!==ref.slug||r.entry.source.sha256!==await huellaTexto(r.entry.body)||!['link','full_text'].includes(r.facebook?.format)||typeof r.facebook.message!=='string'||!r.facebook.message.trim()||r.facebook.message.length>60000)fail('EDITORIAL_PREVIEW_INVALID');
 }
 async prepare(draft:Draft):Promise<Preview>{return this.exclusive(async()=>{
  if(this.locked)fail('APPROVED_REVISION_LOCKED');
  const ref=this.ref;if(!ref?.sourceId)fail('ARCHIVE_REQUIRED');
  const r:RevisionEditorial={publicationId:ref.publicationId,revision:(this.prepared?.revision.revision??0)+1,sourceId:ref.sourceId,sourceVersion:1,sourceHash:ref.sourceHash,kind:'blog_personal',obfuscated:ref.obfuscated,entry:{schema:1,slug:ref.slug,title:draft.title,body:draft.body,date:draft.date,source:{kind:'khora',sha256:await huellaTexto(draft.body)}},facebook:{format:draft.format,message:draft.message}};
  // Same unchanged prepare is idempotent, not a new version or consent.
  if(this.prepared&&this.receipt?.consent!=='declined'){const current=this.prepared.revision;if(canonicoEditorial({...r,revision:current.revision})===canonicoEditorial(current))r.revision=current.revision;}
  await this.validateRevision(r);
  if(this.pending&&canonicoEditorial(this.pending)!==canonicoEditorial(r))fail('PREPARE_RECONCILIATION_REQUIRED');
  this.pending=copy(r);
  const digest=await huellaTexto(canonicoEditorial(r));
  const v=await this.post('prepare',{revision:r,expectedRevision:this.prepared?.revision.revision??null});
  if(v.publicationId!==r.publicationId||v.revision!==r.revision||v.digest!==digest||canonicoEditorial(v.preview)!==canonicoEditorial(r.entry)||canonicoEditorial(v.facebook)!==canonicoEditorial(r.facebook)||v.audioPublic!==false||v.representation!=='text_only'||canonicoEditorial(v.destinations)!=='["blog","facebook"]')fail('PREVIEW_RECEIPT_MISMATCH');
  this.prepared={digest,revision:copy(r)};this.pending=null;this.receipt=null;return copy(this.prepared);
 });}
 private acceptStatus(v:any):Receipt{
  if(!this.ref||(v.id??v.publicationId)!==this.ref.publicationId||!Array.isArray(v.deliveries)||!['pending','approved','declined'].includes(v.consent)||v.revision!==undefined&&(!Number.isSafeInteger(v.revision)||v.revision<1))fail('STATUS_RECEIPT_MISMATCH');
  if(this.prepared&&v.revision!==undefined&&v.revision!==this.prepared.revision.revision)fail('EDITORIAL_REVISION_CHANGED');
  this.receipt=copy(v);return copy(v);
 }
 async decide(decision:boolean,obfuscatedExposure=false):Promise<Receipt>{return this.exclusive(async()=>{
  if(typeof decision!=='boolean'||!this.ref?.sourceId)fail('DECISION_INVALID');
  if(!decision&&!this.prepared){
   return this.acceptStatus(await this.post('decline_archived',{reference:{publicationId:this.ref.publicationId,sourceId:this.ref.sourceId,sourceVersion:1,sourceHash:this.ref.sourceHash}},false));
  }
  if(!this.prepared||this.pending)fail('EXACT_PREVIEW_REQUIRED');
  if(decision&&this.ref.obfuscated&&!obfuscatedExposure)fail('OBFUSCATED_EXPLICIT_DECISION_REQUIRED');
  // A lost response can mean approval committed. Freeze further editing until status reconciliation.
  if(decision)this.receipt={revision:this.prepared.revision.revision,consent:'approved',filter:'approval_receipt_unconfirmed',deliveries:[]};
  return this.acceptStatus(await this.post('decide',{publicationId:this.ref.publicationId,digest:this.prepared.digest,decision,obfuscatedExposure},decision));
 });}
 async status():Promise<Receipt>{return this.exclusive(async()=>{
  if(!this.ref)fail('REFERENCE_REQUIRED');return this.acceptStatus(await this.post('status',{publicationId:this.ref.publicationId}));
 });}
 async resume():Promise<Preview>{return this.exclusive(async()=>{
  if(!this.ref?.sourceId)fail('ARCHIVE_REQUIRED');
  const v=await this.post('resume',{publicationId:this.ref.publicationId});
  await this.validateRevision(v.revision);
  if(v.digest!==await huellaTexto(canonicoEditorial(v.revision)))fail('PREVIEW_RECEIPT_MISMATCH');
  this.prepared={digest:v.digest,revision:copy(v.revision)};this.pending=null;this.acceptStatus(v.status);return copy(this.prepared);
 });}
 publishedBoth(){return this.receipt?publicadoEnAmbos(this.receipt):false;}
}
