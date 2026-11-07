/** Native Backblaze B2 transport. Master credentials and account token remain server-only. */
import { createHash, randomUUID } from 'node:crypto';
import { del as delBlob } from '@vercel/blob';
import { b2ObjectUrl, parseB2ObjectUrl, legacyBlobUrl, safeObjectKey, stagingKeyForSession } from '../storage/object-reference';

type B2Auth = {
  accountId: string;
  authorizationToken: string;
  apiInfo: { storageApi: { apiUrl: string; downloadUrl: string; allowed: { capabilities?: string[]; buckets?: Array<{id:string;name:string|null}> | null; namePrefix?: string | null } } };
};
type B2Bucket = { accountId:string; bucketId:string; bucketName:string; bucketType:string; corsRules?:Array<Record<string,unknown>>; defaultServerSideEncryption?:{isClientAuthorizedToRead:boolean;value?:{algorithm:string;mode:string}|null} };
let authCache: { auth:B2Auth; expiresAt:number } | null = null;
const API_VERSION = 'v4';
const REQUEST_TIMEOUT_MS = 30000;

export function storageLocation() {
  return { bucket: process.env.KHORA_B2_BUCKET_NAME || '', bucketId: process.env.KHORA_B2_BUCKET_ID || '', region: process.env.KHORA_B2_REGION || 'us-east-005' };
}
export function b2Enabled() { return process.env.KHORA_OBJECT_STORAGE === 'b2'; }
function credentials() {
  const keyId = process.env.KHORA_B2_MASTER_APPLICATION_KEY_ID || process.env.KHORA_B2_KEY_ID || '';
  const applicationKey = process.env.KHORA_B2_MASTER_APPLICATION_KEY || process.env.KHORA_B2_APPLICATION_KEY || '';
  if (!keyId || !applicationKey) throw new Error('storage_b2_credentials_missing');
  return { keyId, applicationKey };
}
function apiUrl(auth:B2Auth, operation:string) { return `${auth.apiInfo.storageApi.apiUrl}/b2api/${API_VERSION}/${operation}`; }
async function jsonResponse<T>(response:Response, code:string):Promise<T> {
  if (!response.ok) { const error = new Error(code) as Error & { status: number }; error.status = response.status; throw error; }
  try { return await response.json() as T; } catch { throw new Error(`${code}_invalid_response`); }
}
async function b2Json<T>(auth:B2Auth, operation:string, payload:Record<string,unknown>):Promise<T> {
  const response = await fetch(apiUrl(auth, operation), {
    method:'POST', headers:{ Authorization:auth.authorizationToken, 'Content-Type':'application/json' },
    body:JSON.stringify(payload), cache:'no-store', redirect:'error', signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return jsonResponse<T>(response, `storage_b2_${operation}_failed`);
}
function fileDownloadUrl(auth:B2Auth,bucket:string,key:string) {
  const encoded=key.split('/').map(encodeURIComponent).join('/');
  return `${auth.apiInfo.storageApi.downloadUrl.replace(/\/+$/, '')}/file/${encodeURIComponent(bucket)}/${encoded}`;
}
async function uploadUrl(auth:B2Auth) {
  const c=storageLocation();
  if (!c.bucketId) throw new Error('storage_b2_bucket_config_missing');
  return b2Json<{bucketId:string;uploadUrl:string;authorizationToken:string}>(auth,'b2_get_upload_url',{bucketId:c.bucketId});
}
async function uploadFile(url:string,token:string,key:string,data:Buffer) {
  const response=await fetch(url,{
    method:'POST',
    headers:{
      Authorization:token,
      'X-Bz-File-Name':encodeURIComponent(key),
      'Content-Type':'application/octet-stream',
      'Content-Length':String(data.length),
      'X-Bz-Content-Sha1':createHash('sha1').update(data).digest('hex'),
      'X-Bz-Server-Side-Encryption':'AES256',
    },
    body:new Uint8Array(data),
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return jsonResponse<{fileId:string;fileName:string;contentLength:number;serverSideEncryption?:{mode:string;algorithm:string}}>(response,'storage_b2_upload_failed');
}async function authorize():Promise<B2Auth> {
  if (authCache && authCache.expiresAt > Date.now() + 60000) return authCache.auth;
  const { keyId, applicationKey } = credentials();
  const response = await fetch(`https://api.backblazeb2.com/b2api/${API_VERSION}/b2_authorize_account`, {
    method:'GET', headers:{ Authorization:`Basic ${Buffer.from(`${keyId}:${applicationKey}`).toString('base64')}` },
    cache:'no-store', redirect:'error', signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const auth = await jsonResponse<B2Auth>(response, 'storage_b2_authorization_failed');
  const allowed = auth.apiInfo?.storageApi?.allowed;
  // Reject ordinary app keys, including bucket/prefix-restricted keys. KHORA's canon requires its own Master Key.
  const requiredCapabilities=['listBuckets','listFiles','readFiles','writeFiles','deleteFiles'];
  if (keyId !== auth.accountId || !requiredCapabilities.every(cap=>allowed?.capabilities?.includes(cap)) || allowed?.namePrefix) {
    throw new Error('storage_b2_master_key_required');
  }
  if (!auth.authorizationToken || !auth.apiInfo.storageApi.apiUrl || !auth.apiInfo.storageApi.downloadUrl) throw new Error('storage_b2_authorization_invalid');
  authCache = { auth, expiresAt:Date.now() + 50*60*1000 };
  return auth;
}
async function bucketMetadata(auth:B2Auth):Promise<B2Bucket> {
  const c=storageLocation();
  if (!c.bucket || !c.bucketId) throw new Error('storage_b2_bucket_config_missing');
  const result=await b2Json<{buckets:B2Bucket[]}>(auth,'b2_list_buckets',{accountId:auth.accountId,bucketId:c.bucketId});
  const bucket=result.buckets?.find(x=>x.bucketId===c.bucketId);
  if (!bucket || bucket.bucketName!==c.bucket || bucket.accountId!==auth.accountId) throw new Error('storage_b2_bucket_identity_mismatch');
  if (bucket.bucketType!=='allPrivate') throw new Error('storage_b2_bucket_must_be_private');
  return bucket;
}
export async function inspectB2ReadOnly() {
  const auth=await authorize();
  const bucket=await bucketMetadata(auth);
  return { accountVerified:true, masterKeyVerified:true, bucketVerified:true, bucketPrivate:bucket.bucketType==='allPrivate',
    sseB2:bucket.defaultServerSideEncryption?.isClientAuthorizedToRead===true && bucket.defaultServerSideEncryption?.value?.mode==='SSE-B2' && bucket.defaultServerSideEncryption?.value?.algorithm==='AES256',
    corsRules:bucket.corsRules||[] };
}
export function isStoredObjectUrl(value:string) { return legacyBlobUrl(value) || parseB2ObjectUrl(value,storageLocation())!==null; }
export async function fetchStoredObject(value:string,_init?:RequestInit):Promise<Response> {
  const c=storageLocation(),key=parseB2ObjectUrl(value,c);
  if(key!==null) {
    const auth=await authorize();
    return fetch(fileDownloadUrl(auth,c.bucket,key),{headers:{Authorization:auth.authorizationToken},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
  }
  if(!legacyBlobUrl(value)) throw new Error('storage_reference_not_allowed');
  return fetch(value,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
}
export async function putEncryptedObject(pathname:string,data:Buffer,options:{access:'public';contentType?:string;addRandomSuffix?:boolean}) {
  if(data.length<32||data.subarray(0,4).toString('ascii')!=='KHC1') throw new Error('storage_requires_encrypted_envelope');
  if(!b2Enabled()) throw new Error('storage_b2_not_enabled');
  const c=storageLocation(),key=safeObjectKey(pathname.startsWith('khora/')?pathname:'khora/'+pathname);
  const unique=key.replace(/(\.[^/.]+)?$/,`-${randomUUID()}$1`);
  const auth=await authorize();
  let target=await uploadUrl(auth);
  try { await uploadFile(target.uploadUrl,target.authorizationToken,unique,data); }
  catch(error) { if((error as Error & {status?:number}).status === undefined || (error as Error & {status?:number}).status! < 500) throw new Error('storage_b2_write_failed'); target=await uploadUrl(auth); await uploadFile(target.uploadUrl,target.authorizationToken,unique,data).catch(()=>{throw new Error('storage_b2_write_failed');}); }
  return {url:b2ObjectUrl(unique,c),pathname:unique.slice('khora/'.length),contentType:'application/octet-stream'};
}
/** The server mints the opaque upload ID. Browser never receives B2 account/upload tokens. */
export function createStagingUploadId() { return randomUUID(); }
export const STAGING_CHUNK_BYTES = 4 * 1024 * 1024;
function stagingChunkKey(sessionId:string,uploadId:string,index:number) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(sessionId)||!uuid.test(uploadId)||!Number.isInteger(index)||index<0||index>8) throw new Error('storage_staging_invalid');
  return safeObjectKey(`khora/staging/chunks/${sessionId}/${uploadId}/${index}.part`);
}
async function uploadB2Bytes(key:string,data:Buffer) {
  const auth=await authorize();
  let target=await uploadUrl(auth);
  try { await uploadFile(target.uploadUrl,target.authorizationToken,key,data); }
  catch(error) { if((error as Error & {status?:number}).status === undefined || (error as Error & {status?:number}).status! < 500) throw new Error('storage_b2_write_failed'); target=await uploadUrl(auth); await uploadFile(target.uploadUrl,target.authorizationToken,key,data).catch(()=>{throw new Error('storage_b2_write_failed');}); }
}
export async function putStagingChunk(sessionId:string,uploadId:string,index:number,data:Buffer) {
  if(!b2Enabled()) throw new Error('storage_b2_not_enabled');
  if(data.length<=0||data.length>STAGING_CHUNK_BYTES) throw new Error('storage_staging_chunk_invalid');
  const key=stagingChunkKey(sessionId,uploadId,index);
  await uploadB2Bytes(key,data);
  return {index,bytes:data.length};
}
async function deleteExactB2Versions(auth:B2Auth,key:string) {
  const c=storageLocation();
  const versions=await b2Json<{files:Array<{fileName:string;fileId:string;action:string}>;nextFileName?:string|null;nextFileId?:string|null}>(auth,'b2_list_file_versions',
    {bucketId:c.bucketId,prefix:key,maxFileCount:1000});
  if(versions.nextFileName||versions.nextFileId) throw new Error('storage_staging_versions_exceeded');
  for(const file of versions.files||[]) if(file.fileName===key&&file.fileId&&file.action==='upload') {
    await b2Json(auth,'b2_delete_file_version',{fileName:key,fileId:file.fileId});
  }
}
export async function finalizeStagingUpload(sessionId:string,uploadId:string,totalBytes:number,chunkCount:number,expectedSha256:string) {
  if(!b2Enabled()) throw new Error('storage_b2_not_enabled');
  if(!Number.isSafeInteger(totalBytes)||totalBytes<=16||totalBytes>24*1024*1024+32||!Number.isSafeInteger(chunkCount)||chunkCount!==Math.ceil(totalBytes/STAGING_CHUNK_BYTES)||!/^([a-f0-9]{64})$/i.test(expectedSha256)) throw new Error('storage_staging_invalid');
  const c=storageLocation(),parts:Buffer[]=[];
  for(let index=0;index<chunkCount;index++) {
    const key=stagingChunkKey(sessionId,uploadId,index);
    const response=await fetchStoredObject(b2ObjectUrl(key,c));
    if(!response.ok) throw new Error('storage_staging_chunk_missing');
    const bytes=Buffer.from(await response.arrayBuffer());
    const expected=index===chunkCount-1?totalBytes-index*STAGING_CHUNK_BYTES:STAGING_CHUNK_BYTES;
    if(bytes.length!==expected) throw new Error('storage_staging_chunk_size_mismatch');
    parts.push(bytes);
  }
  const combined=Buffer.concat(parts,totalBytes);
  const digest=createHash('sha256').update(combined).digest('hex');
  if(digest.toLowerCase()!==expectedSha256.toLowerCase()) throw new Error('storage_staging_integrity_failed');
  const finalKey=safeObjectKey(`khora/staging/audio/${sessionId}/${uploadId}.khstaging`);
  await uploadB2Bytes(finalKey,combined);
  // Only exact, server-created chunk names for this upload are removed, after final readback succeeds.
  const check=await fetchStoredObject(b2ObjectUrl(finalKey,c));
  if(!check.ok) throw new Error('storage_staging_finalize_readback_failed');
  const readback=Buffer.from(await check.arrayBuffer());
  if(readback.length!==combined.length||createHash('sha256').update(readback).digest('hex')!==digest) throw new Error('storage_staging_finalize_integrity_failed');
  try {
    const auth=await authorize();
    for(let index=0;index<chunkCount;index++) await deleteExactB2Versions(auth,stagingChunkKey(sessionId,uploadId,index));
  } catch { console.warn('[storage] temporary chunk cleanup pending'); }
  return {url:b2ObjectUrl(finalKey,c),bytes:readback.length,sha256:digest};
}
export function isStagingObject(value:string,sessionId:string) {
  const c=storageLocation(),key=parseB2ObjectUrl(value,c);
  if(key!==null)return stagingKeyForSession(key,sessionId);
  return legacyBlobUrl(value)&&new URL(value).pathname.startsWith(`/staging/audio/${sessionId}/`);
}
export async function deleteStagedObject(value:string,sessionId:string) {
  if(!isStagingObject(value,sessionId))throw new Error('storage_delete_not_staging');
  const c=storageLocation(),key=parseB2ObjectUrl(value,c);
  if(key===null){await delBlob(value);return;}
  const auth=await authorize();
  const versions=await b2Json<{files:Array<{fileName:string;fileId:string;action:string}>;nextFileName?:string|null;nextFileId?:string|null}>(auth,'b2_list_file_versions',
    {bucketId:c.bucketId,prefix:key,maxFileCount:10});
  if(versions.nextFileName||versions.nextFileId)throw new Error('storage_staging_versions_exceeded');
  for(const file of versions.files||[]) if(file.fileName===key&&file.fileId&&file.action==='upload') {
    await b2Json(auth,'b2_delete_file_version',{fileName:key,fileId:file.fileId});
  }
}
export async function listB2Objects() {
  if(!b2Enabled())return [];
  const c=storageLocation(),auth=await authorize(),objects:{url:string;pathname:string;size:number;uploadedAt:Date}[]=[];
  let startFileName:string|undefined;
  for(let pageNo=0;pageNo<100;pageNo++) {
    const page=await b2Json<{files:Array<{fileName:string;contentLength:number;uploadTimestamp:number;action:string}>;nextFileName?:string|null}>(auth,'b2_list_file_names',
      {bucketId:c.bucketId,prefix:'khora/dictado/',maxFileCount:1000,...(startFileName?{startFileName}:{})});
    for(const f of page.files||[]) if(f.action==='upload'&&f.fileName?.startsWith('khora/dictado/')) objects.push({url:b2ObjectUrl(f.fileName,c),pathname:f.fileName.slice('khora/'.length),size:f.contentLength||0,uploadedAt:new Date(f.uploadTimestamp||0)});
    if(!page.nextFileName) return objects;
    if(page.nextFileName===startFileName) throw new Error('storage_listing_incomplete');
    startFileName=page.nextFileName;
  }
  throw new Error('storage_listing_limit');
}
