/** Encrypted object transport. DB ownership/auth and cleartext hash checks stay at callers. */
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command,
  ListObjectVersionsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { del as delBlob } from '@vercel/blob';
import { b2Endpoint, b2ObjectUrl, parseB2ObjectUrl, legacyBlobUrl, safeObjectKey, stagingKeyForSession } from '../storage/object-reference';
export function storageLocation() { return { bucket: process.env.KHORA_B2_BUCKET_NAME || '', region: process.env.KHORA_B2_REGION || 'us-east-005' }; }
export function b2Enabled() { return process.env.KHORA_OBJECT_STORAGE === 'b2'; }
function client() {
  const {region}=storageLocation(), accessKeyId=process.env.KHORA_B2_KEY_ID, secretAccessKey=process.env.KHORA_B2_APPLICATION_KEY;
  if(!accessKeyId||!secretAccessKey||!process.env.KHORA_B2_BUCKET_NAME) throw new Error('storage_b2_not_configured');
  return new S3Client({region,endpoint:b2Endpoint(region),forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},
    maxAttempts:2,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
}
export function isStoredObjectUrl(value: string) { return legacyBlobUrl(value) || parseB2ObjectUrl(value,storageLocation())!==null; }
export async function fetchStoredObject(value: string, _init?: RequestInit): Promise<Response> {
  const c=storageLocation(), key=parseB2ObjectUrl(value,c);
  if(key!==null) {
    const signer=client();let signed:string;try{signed=await getSignedUrl(signer,new GetObjectCommand({Bucket:c.bucket,Key:key}),{expiresIn:60});}finally{signer.destroy();}
    // Signed capability is used only server-side; no cross-host redirects or user-supplied headers.
    return fetch(signed,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
  }
  if(!legacyBlobUrl(value)) throw new Error('storage_reference_not_allowed');
  return fetch(value,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
}
export async function putEncryptedObject(pathname: string, data: Buffer, options: {access:'public';contentType?:string;addRandomSuffix?:boolean}) {
  if(data.length<32||data.subarray(0,4).toString('ascii')!=='KHC1') throw new Error('storage_requires_encrypted_envelope');
  if(!b2Enabled()) throw new Error('storage_b2_not_enabled');
  const c=storageLocation(), key=safeObjectKey(pathname.startsWith('khora/')?pathname:'khora/'+pathname);
  // Never overwrite an earlier capture. The DB receipt is committed only after independent reread/hash.
  const unique=key.replace(/(\.[^/.]+)?$/,`-${randomUUID()}$1`);
  const s=client();try {await s.send(new PutObjectCommand({Bucket:c.bucket,Key:unique,Body:data,ContentType:'application/octet-stream',ServerSideEncryption:'AES256'}));}
  catch { throw new Error('storage_b2_write_failed'); }finally{s.destroy();}
  return {url:b2ObjectUrl(unique,c),pathname:unique.slice('khora/'.length),contentType:'application/octet-stream'};
}
export async function prepareStagedUpload(sessionId: string, bytes: number) {
  if(!b2Enabled()) throw new Error('storage_b2_not_enabled');
  if(!/^[0-9a-f-]{36}$/i.test(sessionId)||!Number.isSafeInteger(bytes)||bytes<=16||bytes>24*1024*1024+32) throw new Error('storage_staging_invalid');
  const c=storageLocation(),key=safeObjectKey(`khora/staging/audio/${sessionId}/${randomUUID()}.khstaging`);
  const s=client();try {const uploadUrl=await getSignedUrl(s,new PutObjectCommand({Bucket:c.bucket,Key:key,ContentType:'application/octet-stream',ContentLength:bytes,ServerSideEncryption:'AES256'}),{expiresIn:300});
    return {provider:'b2',uploadUrl,url:b2ObjectUrl(key,c),expiresIn:300};}finally{s.destroy();}
}
export function isStagingObject(value: string, sessionId: string) {
  const c=storageLocation(),key=parseB2ObjectUrl(value,c);
  if(key!==null)return stagingKeyForSession(key,sessionId);
  return legacyBlobUrl(value)&&new URL(value).pathname.startsWith(`/staging/audio/${sessionId}/`);
}
export async function deleteStagedObject(value: string, sessionId: string) {
  if(!isStagingObject(value,sessionId))throw new Error('storage_delete_not_staging');
  const c=storageLocation(),key=parseB2ObjectUrl(value,c);
  if(key===null){await delBlob(value);return;}
  const s=client();try {
    const versions=await s.send(new ListObjectVersionsCommand({Bucket:c.bucket,Prefix:key,MaxKeys:10}));
    if(versions.IsTruncated)throw new Error('storage_staging_versions_exceeded');
    for(const v of [...(versions.Versions||[]),...(versions.DeleteMarkers||[])])
      if(v.Key===key&&v.VersionId)await s.send(new DeleteObjectCommand({Bucket:c.bucket,Key:key,VersionId:v.VersionId}));
  }finally{s.destroy();}
}
export async function listB2Objects() {
  if(!b2Enabled())return [];
  const c=storageLocation(),s=client(),objects:{url:string;pathname:string;size:number;uploadedAt:Date}[]=[];let token:string|undefined;
  try {do{const page=await s.send(new ListObjectsV2Command({Bucket:c.bucket,Prefix:'khora/dictado/',MaxKeys:1000,ContinuationToken:token}));
    for(const o of page.Contents||[])if(o.Key)objects.push({url:b2ObjectUrl(o.Key,c),pathname:o.Key.slice('khora/'.length),size:o.Size||0,uploadedAt:o.LastModified||new Date(0)});
    token=page.IsTruncated?page.NextContinuationToken:undefined;if(page.IsTruncated&&!token)throw new Error('storage_listing_incomplete');
    if(objects.length>10000)throw new Error('storage_listing_limit');}while(token);return objects;
  }finally{s.destroy();}
}
