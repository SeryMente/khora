/** Server-only encrypted OAuth transaction persistence. No schema migration or
 * provider configuration is performed. Bind query to a TLS-verified pool and
 * authorize to the existing Khora session, never to request-body identity.
 */
import {createHash} from 'node:crypto';
import {TransferError} from './transfer.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const ownerOK=o=>typeof o==='string'&&o.length>0&&o.length<=320&&!/[\x00-\x20\x7f]/.test(o);
const nonceOK=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const fields=['owner','state_hash','verifier','client_id','redirect_uri','expires_at'];
const stop=c=>{throw new TransferError(c)};
const closed=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&Object.keys(o).every(k=>keys.includes(k));
function transactionOK(t,owner,key,now){return closed(t,fields)&&t.owner===owner&&t.state_hash===key&&typeof t.verifier==='string'&&/^[A-Za-z0-9_-]{43,128}$/.test(t.verifier)&&typeof t.client_id==='string'&&t.client_id.endsWith('.apps.googleusercontent.com')&&typeof t.redirect_uri==='string'&&t.redirect_uri.startsWith('https://')&&Number.isSafeInteger(t.expires_at)&&t.expires_at>now&&t.expires_at<=now+600000}
export const INSERT_AUTH_TRANSACTION='INSERT INTO khora_takeout_oauth_transactions (owner_hash,state_hash,sealed,expires_at_ms) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING state_hash';
export const CONSUME_AUTH_TRANSACTION='DELETE FROM khora_takeout_oauth_transactions WHERE owner_hash=$1 AND state_hash=$2 AND expires_at_ms>$3 RETURNING sealed,expires_at_ms';
export function createAuthTransactionStore({query,encrypt,decrypt,authorize}){
 if([query,encrypt,decrypt,authorize].some(f=>typeof f!=='function'))stop('AUTH_STORE_BINDINGS_REQUIRED');
 async function gate(owner,key,now,op){if(!ownerOK(owner)||!nonceOK(key)||!Number.isSafeInteger(now)||now<0)stop('AUTH_STORE_INPUT_INVALID');let yes;try{yes=await authorize(owner,op)}catch{stop('AUTH_STORE_OWNER_DENIED')}if(yes!==true)stop('AUTH_STORE_OWNER_DENIED')}
 async function sql(text,values){try{return await query(text,values)}catch{stop('AUTH_STORE_UNAVAILABLE')}}
 return {
  async put(transaction,{owner,now=Date.now()}){
   const key=transaction?.state_hash;await gate(owner,key,now,'create');
   if(!transactionOK(transaction,owner,key,now))stop('AUTH_STORE_INPUT_INVALID');
   const plain=Buffer.from(JSON.stringify({version:1,kind:'google_oauth_transaction',owner,key,transaction}));
   if(plain.length>16384)stop('AUTH_STORE_INPUT_INVALID');let sealed;
   try{sealed=await encrypt(plain)}catch{stop('AUTH_STORE_ENCRYPTION_FAILED')}
   if(!Buffer.isBuffer(sealed)||sealed.length!==plain.length+32||sealed.subarray(0,4).toString('ascii')!=='KHC1')stop('AUTH_STORE_ENCRYPTION_FAILED');
   const result=await sql(INSERT_AUTH_TRANSACTION,[hash(owner),key,sealed,transaction.expires_at]);
   if(result?.rowCount!==1||result.rows?.[0]?.state_hash!==key)stop('AUTH_STORE_CONFLICT');
   return {stored:true};
  },
  async consume(key,owner,{now=Date.now()}={}){
   await gate(owner,key,now,'consume');
   // One DELETE RETURNING statement, never read then delete. Both owner and
   // nonce constrain the atomic operation. Failure consumes no other owner.
   const result=await sql(CONSUME_AUTH_TRANSACTION,[hash(owner),key,now]);
   if(result?.rowCount===0)return null;
   if(result?.rowCount!==1||!Array.isArray(result.rows)||result.rows.length!==1)stop('AUTH_STORE_ROW_INVALID');
   const row=result.rows[0],sealed=row.sealed;
   if(!Buffer.isBuffer(sealed)||sealed.length<33||sealed.length>16416||sealed.subarray(0,4).toString('ascii')!=='KHC1')stop('AUTH_STORE_ENVELOPE_INVALID');
   let raw,t;try{raw=await decrypt(sealed);if(!Buffer.isBuffer(raw)||raw.length!==sealed.length-32)stop('AUTH_STORE_ENVELOPE_INVALID');t=JSON.parse(raw.toString('utf8'))}catch{stop('AUTH_STORE_DECRYPTION_FAILED')}
   if(!closed(t,['version','kind','owner','key','transaction'])||t.version!==1||t.kind!=='google_oauth_transaction'||t.owner!==owner||t.key!==key||!transactionOK(t.transaction,owner,key,now)||String(row.expires_at_ms)!==String(t.transaction.expires_at))stop('AUTH_STORE_BINDING_INVALID');
   return t.transaction;
  }
 };
}
