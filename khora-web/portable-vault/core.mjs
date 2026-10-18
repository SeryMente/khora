/** Candidate security core. Synthetic evaluation, NOT an activated Khora service. */
import {randomBytes, randomUUID, createCipheriv, createDecipheriv, createHash} from 'node:crypto';
import {generateSecret, generateURI, verify} from 'otplib';
import {generateIdentity, identityToRecipient} from 'age-encryption';
export const hash = x => createHash('sha256').update(x).digest('hex');
export class VaultError extends Error { constructor(code, status=403) { super(code); this.code=code; this.status=status; } }
const denied = (code='denied',status=403) => ({error:code,status});
function result(x) { if(x?.error) throw new VaultError(x.error,x.status); return x; }
export const schema = `
CREATE TABLE IF NOT EXISTS pv_vaults (
 id TEXT PRIMARY KEY, owner TEXT UNIQUE NOT NULL, recipient TEXT NOT NULL,
 identity_box TEXT NOT NULL, otp_box TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','active','revoked')),
 last_step BIGINT NOT NULL DEFAULT -1, attempts INTEGER NOT NULL DEFAULT 0,
 window_start BIGINT NOT NULL, pending_expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS pv_grants (
 digest TEXT PRIMARY KEY, vault_id TEXT NOT NULL REFERENCES pv_vaults(id),
 owner TEXT NOT NULL, binding TEXT NOT NULL, expires BIGINT NOT NULL,
 consumed BOOLEAN NOT NULL DEFAULT false
);`;
/** Adapter uses real Postgres transactions. SSL certificate verification is caller responsibility. */
export class PgStore {
 constructor(pool) {this.pool=pool;}
 async initialize() { await this.pool.query(schema); }
 async transaction(fn) {
  const c=await this.pool.connect();
  try {await c.query('BEGIN'); const v=await fn(c); await c.query('COMMIT'); return v;}
  catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
/** PGlite is actual embedded PostgreSQL, ONLY the local evidence adapter. */
export class PGliteStore {
 constructor(db) {this.db=db;this.queue=Promise.resolve();}
 async initialize(){await this.db.exec(schema);}
 transaction(fn){const p=this.queue.then(()=>this.db.transaction(fn));this.queue=p.catch(()=>{});return p;}
}
export class VaultService {
 constructor(store,key,{clock=()=>Date.now()}={}) {
  if(!Buffer.isBuffer(key)||key.length!==32)throw new VaultError('custody_key_missing',503);
  this.store=store;this.key=key;this.clock=clock;
 }
 now(){return Math.floor(this.clock()/1000);}
 box(value,aad) {
  const nonce=randomBytes(12), c=createCipheriv('aes-256-gcm',this.key,nonce);
  c.setAAD(Buffer.from('khora-portable-v1:'+aad));
  const ct=Buffer.concat([c.update(value,'utf8'),c.final()]);
  return JSON.stringify({v:1,n:nonce.toString('base64'),c:ct.toString('base64'),t:c.getAuthTag().toString('base64')});
 }
 unbox(raw,aad){
  try {const e=JSON.parse(raw);if(e.v!==1)throw Error();const d=createDecipheriv('aes-256-gcm',this.key,Buffer.from(e.n,'base64'));
   d.setAAD(Buffer.from('khora-portable-v1:'+aad));d.setAuthTag(Buffer.from(e.t,'base64'));
   return Buffer.concat([d.update(Buffer.from(e.c,'base64')),d.final()]).toString('utf8');
  }catch{throw new VaultError('custody_unavailable',503);}
 }
 principal(p){if(!p||typeof p.subject!=='string'||!p.subject||typeof p.binding!=='string'||p.binding.length<16)throw new VaultError('session_required',401);}
 async enroll(p){
  this.principal(p);const id=randomUUID(), identity=await generateIdentity(), secret=generateSecret();
  const recipient=await identityToRecipient(identity), now=this.now();
  const v=await this.store.transaction(async c=>{
   // Unique owner also rejects racing enrollments; no overwrite/reset endpoint.
   const r=await c.query(`INSERT INTO pv_vaults(id,owner,recipient,identity_box,otp_box,state,window_start,pending_expires)
    VALUES($1,$2,$3,$4,$5,'pending',$6,$7) ON CONFLICT(owner) DO NOTHING RETURNING id`,
    [id,p.subject,recipient,this.box(identity,p.subject+':'+id+':identity'),this.box(secret,p.subject+':'+id+':otp'),now,now+600]);
   return r.rows.length ? {id,recipient,uri:generateURI({issuer:'Khora',label:p.subject,secret,algorithm:'sha1',digits:6,period:30})}:denied('already_enrolled',409);
  });return result(v);
 }
 async row(c,p,id){return (await c.query('SELECT * FROM pv_vaults WHERE id=$1 AND owner=$2 FOR UPDATE',[id,p.subject])).rows[0];}
 async checkCode(c,row,code){
  const now=this.now(), start=Number(row.window_start), attempts=now-start>=60?0:Number(row.attempts);
  if(attempts>=5)return false;
  // Persist each attempt INCLUDING malformed input, successes, and replays.
  await c.query('UPDATE pv_vaults SET attempts=$2,window_start=$3 WHERE id=$1',[row.id,attempts+1,now-start>=60?now:start]);
  if(typeof code!=='string'||!/^\d{6}$/.test(code))return false;
  const step=Math.floor(now/30);if(step<=Number(row.last_step))return false;
  const secret=this.unbox(row.otp_box,row.owner+':'+row.id+':otp');
  const v=await verify({secret,token:code,epoch:now,epochTolerance:0,period:30,digits:6,algorithm:'sha1'});
  if(!v.valid)return false;
  await c.query('UPDATE pv_vaults SET last_step=$2 WHERE id=$1',[row.id,step]);return true;
 }
 async confirm(p,id,code){
  this.principal(p);return result(await this.store.transaction(async c=>{
   const row=await this.row(c,p,id);
   if(!row||row.state!=='pending'||Number(row.pending_expires)<=this.now())return denied();
   if(!await this.checkCode(c,row,code))return denied();
   await c.query("UPDATE pv_vaults SET state='active' WHERE id=$1",[id]);return {id,recipient:row.recipient};
  }));
 }
 async status(p,id){
  this.principal(p);return result(await this.store.transaction(async c=>{
   const row=await this.row(c,p,id);return row?.state==='active'?{id,state:row.state,recipient:row.recipient}:denied();
  }));
 }
 async authorize(p,id,code){
  this.principal(p);return result(await this.store.transaction(async c=>{
   const row=await this.row(c,p,id);if(!row||row.state!=='active')return denied();
   if(!await this.checkCode(c,row,code))return denied();
   const token=randomBytes(32).toString('base64url'), expires=this.now()+45;
   await c.query('INSERT INTO pv_grants(digest,vault_id,owner,binding,expires) VALUES($1,$2,$3,$4,$5)',[hash(token),id,p.subject,hash(p.binding),expires]);
   return {grant:token,expires};
  }));
 }
 async release(p,id,grant){
  this.principal(p);if(typeof grant!=='string'||!/^[\w-]{43}$/.test(grant))throw new VaultError('denied');
  return result(await this.store.transaction(async c=>{
   // Consistent lock order (vault then grant) across revoke/release.
   const row=await this.row(c,p,id);if(!row||row.state!=='active')return denied();
   const r=await c.query(`UPDATE pv_grants SET consumed=true WHERE digest=$1 AND vault_id=$2 AND owner=$3 AND binding=$4 AND expires>$5 AND consumed=false RETURNING digest`,[hash(grant),id,p.subject,hash(p.binding),this.now()]);
   if(!r.rows.length)return denied();
   return {id,identity:this.unbox(row.identity_box,p.subject+':'+id+':identity'),recipient:row.recipient};
  }));
 }
 async revoke(p,id,code){
  this.principal(p);return result(await this.store.transaction(async c=>{
   const row=await this.row(c,p,id);if(!row||row.state!=='active'||!await this.checkCode(c,row,code))return denied();
   await c.query("UPDATE pv_vaults SET state='revoked' WHERE id=$1",[id]);
   await c.query('UPDATE pv_grants SET consumed=true WHERE vault_id=$1',[id]);return {revoked:true};
  }));
 }
}
