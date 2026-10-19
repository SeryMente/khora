import {proposeMetadata} from './metadata';
import { hash, canonical, publishable, approve, revisionCheck, type Source, type Revision, type Approval } from './domain';
type Result={rows:any[];rowCount?:number|null};
type Connection={query:(sql:string,params?:unknown[])=>Promise<Result>;release:()=>void};
export type PoolLike={connect:()=>Promise<Connection>;query:(sql:string,params?:unknown[])=>Promise<Result>};
export type Cipher={encrypt:(s:string)=>string;decrypt:(s:string)=>string};
// Injection permits isolated tests; production supplies getDb(), cifrarTexto/descifrarTexto.
// This service must only be exposed through authenticated + normative-gated handlers.
export class BlogRepository {
  db:PoolLike; cipher:Cipher;
  constructor(db:PoolLike,cipher:Cipher){this.db=db;this.cipher=cipher;}
  async transaction<T>(fn:(c:Connection)=>Promise<T>):Promise<T>{
    const c=await this.db.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(71427419)');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  async source(c:Connection,actor:string,id:string,version:number):Promise<Source>{
    // Lock source owner row against deletion/ownership changes during approval/delivery.
    const owner=await c.query(`SELECT v.id,v.usuario,v.recibido_en,to_jsonb(v)->>'tipo_entrada' AS entry_kind,to_jsonb(v)->>'ofuscada' AS obfuscated FROM volcado v WHERE id=$1 AND usuario=$2 FOR SHARE`,[id,actor]);
    if(!actor||!owner.rows.length)throw new Error('SOURCE_FORBIDDEN');
    if(owner.rows[0].entry_kind!=='blog_personal'||!['true','false'].includes(owner.rows[0].obfuscated))throw new Error('SOURCE_EDITORIAL_CLASSIFICATION_REQUIRED');
    const q=await c.query('SELECT texto, sha256 FROM volcado_version WHERE volcado_id=$1 AND version=$2',[id,version]);
    if(!q.rows.length)throw new Error('SOURCE_VERSION_UNAVAILABLE');
    const text=this.cipher.decrypt(q.rows[0].texto);
    if(hash(text)!==q.rows[0].sha256)throw new Error('SOURCE_INTEGRITY');
    return {id,version,sha256:q.rows[0].sha256,text,owner:actor,receivedAt:new Date(owner.rows[0].recibido_en).toISOString(),capturedAt:null,kind:owner.rows[0].entry_kind,obfuscated:owner.rows[0].obfuscated==='true'};
  }
  async save(actor:string,r:Revision,expectedRevision:number|null):Promise<void>{
    revisionCheck(r);
    await this.transaction(async c=>{
      const source=await this.source(c,actor,r.sourceId,r.sourceVersion);
      if(source.sha256!==r.sourceHash)throw new Error('SOURCE_INTEGRITY');
      if(source.obfuscated!==r.obfuscated)throw new Error('SOURCE_FLAGS_CHANGED');
      const current=await c.query('SELECT * FROM blog_editorial WHERE id=$1 FOR UPDATE',[r.publicationId]);
      if(current.rows.length){
        const row=current.rows[0];if(row.owner!==actor)throw new Error('EDITORIAL_FORBIDDEN');
        if(row.revision===r.revision&&this.cipher.decrypt(row.payload_cipher)===canonical(r))return;
        if(row.revision!==expectedRevision||r.revision!==row.revision+1||row.volcado_id!==r.sourceId)throw new Error('EDITORIAL_CONFLICT');
        // A POST in uncertain state cannot be silently replaced: reconcile it first.
        const busy=await c.query("SELECT 1 FROM blog_delivery WHERE editorial_id=$1 AND state IN ('submitting','unknown')",[r.publicationId]);
        if(busy.rows.length)throw new Error('DELIVERY_RECONCILIATION_REQUIRED');
        await c.query("UPDATE blog_delivery SET state='cancelled', updated_at=now() WHERE editorial_id=$1 AND state IN ('pending','blocked')",[r.publicationId]);
        await c.query("UPDATE blog_editorial SET revision=$2,payload_cipher=$3,approval_cipher=NULL,export_snapshot=NULL,approved_digest=NULL,consent='pending',kind=$4,obfuscated=$5,changed_seq=DEFAULT,updated_at=now() WHERE id=$1",[r.publicationId,r.revision,this.cipher.encrypt(canonical(r)),r.kind,r.obfuscated]);
      }else{
        if(expectedRevision!==null||r.revision!==1)throw new Error('EDITORIAL_CONFLICT');
        await c.query('INSERT INTO blog_editorial(id,owner,volcado_id,kind,obfuscated,revision,payload_cipher) VALUES($1,$2,$3,$4,$5,$6,$7)',[r.publicationId,actor,r.sourceId,r.kind,r.obfuscated,r.revision,this.cipher.encrypt(canonical(r))]);
      }
      await this.history(c,actor,r,'draft_saved',r);
    });
  }
  async history(c:Connection,actor:string,r:Revision,action:string,payload:unknown){
    await c.query('INSERT INTO blog_editorial_history(editorial_id,owner,revision,action,payload_cipher) VALUES($1,$2,$3,$4,$5)',[r.publicationId,actor,r.revision,action,this.cipher.encrypt(canonical(payload))]);
  }
  async approveExact(actor:string,id:string,expectedDigest:string,obfuscatedExposure:boolean):Promise<Approval>{
    return this.transaction(async c=>{
      const q=await c.query('SELECT * FROM blog_editorial WHERE id=$1 AND owner=$2 FOR UPDATE',[id,actor]);
      if(!q.rows.length)throw new Error('EDITORIAL_FORBIDDEN');
      const row=q.rows[0], r:Revision=JSON.parse(this.cipher.decrypt(row.payload_cipher));
      const s=await this.source(c,actor,r.sourceId,r.sourceVersion);
      const a=approve(r,actor,s,new Date().toISOString(),obfuscatedExposure);
      if(a.digest!==expectedDigest)throw new Error('APPROVAL_CONFLICT');
      await c.query("UPDATE blog_editorial SET approval_cipher=$2,export_snapshot=$3::jsonb,approved_digest=$4,ever_approved=true,consent='approved', changed_seq=DEFAULT,updated_at=now() WHERE id=$1",[id,this.cipher.encrypt(canonical(a)),canonical(r.entry),a.digest]);
      for(const target of ['blog','facebook']){
        await c.query('INSERT INTO blog_delivery(editorial_id,revision,target,digest) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,r.revision,target,a.digest]);
      }
      await this.history(c,actor,r,'exact_version_approved',a);return a;
    });
  }
  async extractMetadata(actor:string,id:string,providerKey:string){
    const loaded=await this.transaction(async c=>{
      const q=await c.query('SELECT payload_cipher FROM blog_editorial WHERE id=$1 AND owner=$2',[id,actor]);
      if(!q.rows.length)throw new Error('EDITORIAL_FORBIDDEN');
      const revision:Revision=JSON.parse(this.cipher.decrypt(q.rows[0].payload_cipher));
      return {revision,source:await this.source(c,actor,revision.sourceId,revision.sourceVersion)};
    });
    const result=await proposeMetadata(loaded.source,providerKey);
    await this.transaction(async c=>{
      const q=await c.query('SELECT revision FROM blog_editorial WHERE id=$1 AND owner=$2 FOR UPDATE',[id,actor]);
      if(!q.rows.length||q.rows[0].revision!==loaded.revision.revision)throw new Error('EDITORIAL_CONFLICT');
      await this.history(c,actor,loaded.revision,'metadata_proposed',result);
    });return result;
  }
  async decline(actor:string,id:string,expectedDigest:string):Promise<void>{
    await this.transaction(async c=>{
      const q=await c.query('SELECT * FROM blog_editorial WHERE id=$1 AND owner=$2 FOR UPDATE',[id,actor]);
      if(!q.rows.length)throw new Error('EDITORIAL_FORBIDDEN');
      const r:Revision=JSON.parse(this.cipher.decrypt(q.rows[0].payload_cipher));
      if(hash(canonical(r))!==expectedDigest)throw new Error('EDITORIAL_CONFLICT');
      const sent=await c.query("SELECT 1 FROM blog_delivery WHERE editorial_id=$1 AND state IN ('submitting','unknown','confirmed')",[id]);
      if(sent.rows.length)throw new Error('WITHDRAWAL_REVIEW_REQUIRED');
      await c.query("UPDATE blog_editorial SET consent='declined',approval_cipher=NULL,export_snapshot=NULL,approved_digest=NULL,changed_seq=DEFAULT,updated_at=now() WHERE id=$1",[id]);
      await c.query("UPDATE blog_delivery SET state='cancelled' WHERE editorial_id=$1 AND state IN ('pending','blocked')",[id]);
      await this.history(c,actor,r,'publication_declined', {digest:expectedDigest,decision:false});
    });
  }
  async status(actor:string,id:string){
    const q=await this.db.query('SELECT id,revision,consent,obfuscated FROM blog_editorial WHERE id=$1 AND owner=$2',[id,actor]);
    if(!q.rows.length)throw new Error('EDITORIAL_FORBIDDEN');
    const d=await this.db.query('SELECT revision,target,state,url,proof_hash,last_code FROM blog_delivery WHERE editorial_id=$1 ORDER BY revision,target',[id]);
    const row=q.rows[0],current=d.rows.filter(x=>x.revision===row.revision);
    return {...row,deliveries:d.rows,filter:row.consent==='declined'?'archived_without_permission':current.length===2&&current.every(x=>x.state==='confirmed')?'published_both':row.consent==='approved'?'publication_pending':'awaiting_decision'};
  }
  async eligible(actor:string,after:string='0',limit=20){
    if(!actor||!/^\d{1,18}$/.test(after)||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('CURSOR_INVALID');
    const q=await this.db.query("SELECT id,revision,changed_seq,payload_cipher,approval_cipher FROM blog_editorial WHERE owner=$1 AND changed_seq>$2::bigint AND kind='blog_personal' AND approval_cipher IS NOT NULL ORDER BY changed_seq LIMIT $3",[actor,after,limit]);
    // This method only returns approved public snapshots, never cipher/plain draft or source identifiers.
    const items=[];for(const row of q.rows){
      const r:Revision=JSON.parse(this.cipher.decrypt(row.payload_cipher));const a:Approval=JSON.parse(this.cipher.decrypt(row.approval_cipher));
      const entry=await this.transaction(async c=>publishable(r,a,actor,await this.source(c,actor,r.sourceId,r.sourceVersion)));
      items.push({publicationId:row.id,revision:row.revision,digest:a.digest,cursor:String(row.changed_seq),entry});
    }
    return {items,next:items.length?items[items.length-1].cursor:after};
  }
}
