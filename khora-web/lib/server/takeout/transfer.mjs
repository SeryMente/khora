/** Takeout transfer kernel 0.1.0. Server-only. No cookies, arbitrary URLs, disks or LLMs.
 * This is not an HTTP route or durable queue. Trusted adapters must enforce owner,
 * OAuth grants, quota, durable locking/CAS, retention and encryption of receipts.
 */
import { createHash, randomUUID } from 'node:crypto';
export const TRANSFER_VERSION = '0.1.0';
export const CHUNK_BYTES = 8 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 50 * 1024 ** 3;
const DRIVE = 'https://www.googleapis.com/drive/v3/files/';
const idPattern = /^[A-Za-z0-9_-]{10,200}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const mimeTypes = new Set(['application/zip','application/x-zip-compressed','application/gzip','application/x-gzip','application/x-tgz']);
export class TransferError extends Error {
  constructor(code) { super(code); this.name='TransferError'; this.code=code; }
}
function fail(code) { throw new TransferError(code); }
function assert(ok, code) { if (!ok) fail(code); }
function integer(v) { return Number.isSafeInteger(v) && v >= 0; }
function ownerValid(v) { return typeof v === 'string' && v.length > 0 && v.length <= 320 && !/[\x00-\x1f\x7f]/.test(v); }
function fileValid(v) { return typeof v === 'string' && idPattern.test(v); }
function opaque(v) { return typeof v === 'string' && /^[a-zA-Z0-9:_-]{1,160}$/.test(v); }
function digest(data) { return createHash('sha256').update(data).digest('hex'); }
function mimeValid(v) { return mimeTypes.has(v); }
export function driveFileId(input) {
  assert(typeof input === 'string' && input.length <= 2048, 'SOURCE_INVALID');
  if (fileValid(input)) return input;
  // Not a universal Takeout email downloader. Never fetch an entered URL.
  let u; try { u = new URL(input); } catch { fail('SOURCE_INVALID'); }
  assert(u.protocol==='https:' && u.hostname==='drive.google.com' && !u.port && !u.username && !u.password && !u.hash, 'SOURCE_NOT_DRIVE');
  const m = /^\/file\/d\/([A-Za-z0-9_-]{10,200})(?:\/view)?\/?$/.exec(u.pathname);
  const allowed = [...u.searchParams.keys()].every(k=>k==='usp');
  assert(m && allowed && !/%|\\/.test(input), 'SOURCE_INVALID');
  return m[1];
}
async function bounded(response, max) {
  assert(response.body && typeof response.body.getReader==='function', 'GOOGLE_BODY_MISSING');
  const reader = response.body.getReader(); const chunks=[]; let size=0;
  try { while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength;
    assert(size<=max,'GOOGLE_BODY_TOO_LARGE'); chunks.push(Buffer.from(value)); }
    return Buffer.concat(chunks,size);
  } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
async function request(fetcher, fileId, token, {range,metadata=false}={}) {
  assert(fileValid(fileId),'SOURCE_INVALID');
  assert(typeof token==='string' && token.length>=8 && token.length<=16384 && !/[\x00-\x20\x7f]/.test(token),'GOOGLE_AUTH_REQUIRED');
  const suffix=metadata?'?fields=id,size,mimeType,version,capabilities(canDownload),trashed':'?alt=media';
  const headers={Authorization:`Bearer ${token}`,Accept:metadata?'application/json':'application/octet-stream'};
  if(range) headers.Range=range;
  try { return await fetcher(DRIVE+fileId+suffix,{method:'GET',headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000)}); }
  catch { fail('GOOGLE_TRANSPORT_FAILED'); }
}
function validateMetadata(m, fileId, expected) {
  assert(m && m.id===fileId && m.capabilities?.canDownload===true && m.trashed!==true,'GOOGLE_FILE_NOT_DOWNLOADABLE');
  assert(typeof m.size==='string' && /^[1-9][0-9]{0,15}$/.test(m.size),'GOOGLE_SIZE_INVALID');
  const size=Number(m.size); assert(Number.isSafeInteger(size)&&size<=MAX_ARCHIVE_BYTES,'GOOGLE_SIZE_LIMIT');
  assert(mimeValid(m.mimeType),'GOOGLE_ARCHIVE_TYPE_UNSUPPORTED');
  assert(typeof m.version==='string' && /^[1-9][0-9]{0,30}$/.test(m.version),'GOOGLE_REVISION_REQUIRED');
  if(expected) assert(size===expected.size&&m.version===expected.version&&m.mimeType===expected.mimeType,'GOOGLE_SOURCE_CHANGED');
  return {size,version:m.version,mimeType:m.mimeType};
}
async function metadata(fetcher,fileId,token,expected) {
  const r=await request(fetcher,fileId,token,{metadata:true});
  if(!r.ok) { await r.body?.cancel().catch(()=>{}); fail(r.status===401||r.status===403?'GOOGLE_AUTH_OR_ACCESS_DENIED':'GOOGLE_METADATA_FAILED'); }
  let m; try { m=JSON.parse((await bounded(r,65536)).toString('utf8')); } catch(e) { if(e instanceof TransferError) throw e; fail('GOOGLE_METADATA_INVALID'); }
  return validateMetadata(m,fileId,expected);
}
export function validateReceipt(r,owner) {
  assert(ownerValid(owner),'OWNER_REQUIRED');
  assert(r && typeof r==='object' && Object.keys(r).every(k=>['transfer_version','owner','job_id','file_id','size','version','mimeType','status','next_offset','archive_sha256','parts'].includes(k)), 'RECEIPT_FIELDS_INVALID');
  assert(r && r.transfer_version===TRANSFER_VERSION && r.owner===owner && fileValid(r.file_id) && opaque(r.job_id),'RECEIPT_INVALID_OR_FOREIGN');
  assert(integer(r.size)&&r.size>0&&r.size<=MAX_ARCHIVE_BYTES && /^[1-9][0-9]{0,30}$/.test(r.version) && mimeValid(r.mimeType),'RECEIPT_SOURCE_INVALID');
  assert(Array.isArray(r.parts)&&r.parts.length<=Math.ceil(MAX_ARCHIVE_BYTES/CHUNK_BYTES),'RECEIPT_PARTS_INVALID');
  let offset=0;
  for(const p of r.parts) {
    assert(p && typeof p==='object' && Object.keys(p).every(k=>['start','bytes','sha256','reference'].includes(k)), 'RECEIPT_PART_FIELDS_INVALID');
    assert(p && p.start===offset && integer(p.bytes) && p.bytes===Math.min(CHUNK_BYTES,r.size-offset) && p.bytes>0 && hashPattern.test(p.sha256) && typeof p.reference==='string' && p.reference.length>0 && p.reference.length<=2000,'RECEIPT_PART_INVALID');
    offset+=p.bytes;
  }
  assert(offset<=r.size&&r.next_offset===offset&&['transferring','stored_verified'].includes(r.status),'RECEIPT_STATE_INVALID');
  assert(r.status==='transferring'?offset<r.size:offset===r.size,'RECEIPT_STATE_INVALID');
  assert(r.status==='stored_verified'?hashPattern.test(r.archive_sha256):r.archive_sha256===null,'RECEIPT_DIGEST_INVALID');
  return r;
}
export async function beginTransfer({owner,source,accessToken,jobId=randomUUID(),fetcher=fetch}) {
  assert(ownerValid(owner)&&opaque(jobId),'OWNER_OR_JOB_REQUIRED');
  const fileId=driveFileId(source); const m=await metadata(fetcher,fileId,accessToken);
  return {transfer_version:TRANSFER_VERSION,owner,job_id:jobId,file_id:fileId,...m,status:'transferring',next_offset:0,archive_sha256:null,parts:[]};
}
function adaptersValid(s) { assert(s&&typeof s.write==='function'&&typeof s.read==='function','ENCRYPTED_STORE_REQUIRED'); }
function prefix(r) { return `khora/takeout/${digest(Buffer.from(r.owner))}/${r.job_id}`; }
async function readVerified(store,r,part) {
  let bytes;
  try { bytes=await store.read(part.reference,{owner:r.owner,prefix:prefix(r),maxBytes:part.bytes}); }
  catch { fail('STORED_PART_UNREADABLE'); }
  assert(Buffer.isBuffer(bytes)&&bytes.length===part.bytes&&digest(bytes)===part.sha256,'STORED_PART_INTEGRITY_FAILED');
  return bytes;
}
/** Transfers one bounded chunk per invocation; the FINAL invocation also rereads
 * the entire archive to verify its digest. Run final verification on a qualified
 * long-running worker, NOT inside an unqualified serverless HTTP request.
 * Caller must serialize jobs with durable CAS.
 * No automatic network retries. Failure does not advance the committed receipt.
 * The encrypted write may remain orphaned after a failed read/CAS; preserve it for
 * bounded reconciliation, never delete originals or pretend rollback occurred.
 */
export async function advanceTransfer({receipt,owner,accessToken,store,fetcher=fetch}) {
  const r=structuredClone(validateReceipt(receipt,owner)); adaptersValid(store);
  if(r.status==='stored_verified') return r;
  await metadata(fetcher,r.file_id,accessToken,r);
  const start=r.next_offset,end=Math.min(r.size-1,start+CHUNK_BYTES-1),length=end-start+1;
  const response=await request(fetcher,r.file_id,accessToken,{range:`bytes=${start}-${end}`});
  if(response.status!==206) { await response.body?.cancel().catch(()=>{}); fail('GOOGLE_RANGE_NOT_HONORED'); }
  if(response.headers.get('content-range')!==`bytes ${start}-${end}/${r.size}`) { await response.body?.cancel().catch(()=>{}); fail('GOOGLE_RANGE_MISMATCH'); }
  const encoding=response.headers.get('content-encoding');
  if(encoding&&encoding!=='identity'){await response.body?.cancel().catch(()=>{});fail('GOOGLE_ENCODING_UNEXPECTED');}
  const raw=await bounded(response,length); assert(raw.length===length,'GOOGLE_BODY_TRUNCATED');
  // Metadata before AND after the range avoids treating a changed file as one snapshot.
  await metadata(fetcher,r.file_id,accessToken,r);
  let reference;
  try { reference=await store.write(`${prefix(r)}/${start}.khc`,raw,{owner:r.owner}); }
  catch { fail('ENCRYPTED_WRITE_FAILED'); }
  assert(typeof reference==='string'&&reference.length>0&&reference.length<=2000,'STORE_REFERENCE_INVALID');
  const part={start,bytes:length,sha256:digest(raw),reference};
  await readVerified(store,r,part); r.parts.push(part);r.next_offset=end+1;
  if(r.next_offset===r.size) {
    const hash=createHash('sha256');
    for(const p of r.parts) hash.update(await readVerified(store,r,p));
    r.archive_sha256=hash.digest('hex');r.status='stored_verified';
  }
  return validateReceipt(r,owner);
}
/** Restore into an authorized in-memory consumer only, never into a public response.
 * Consumer must stage output privately until this function returns verified.
 */
export async function verifyRestoration({receipt,owner,store}) {
  const r=structuredClone(validateReceipt(receipt,owner));adaptersValid(store);
  assert(r.status==='stored_verified','TRANSFER_INCOMPLETE');
  const hash=createHash('sha256');let bytes=0;
  for(const p of r.parts){const data=await readVerified(store,r,p);hash.update(data);bytes+=data.length;}
  assert(bytes===r.size&&hash.digest('hex')===r.archive_sha256,'RESTORATION_INTEGRITY_FAILED');
  return {verified:true,bytes,sha256:r.archive_sha256};
}
