/** Deployment-only synthetic probe. Never reads user objects or changes operational DBs. */
import { randomUUID,createHash } from 'node:crypto';
import { S3Client,GetBucketCorsCommand,PutBucketCorsCommand,ListObjectVersionsCommand,DeleteObjectCommand } from '@aws-sdk/client-s3';
import { cifrarBytes,descifrarBytes } from '../lib/server/cripto';
import { putEncryptedObject,fetchStoredObject,prepareStagedUpload,storageLocation } from '../lib/server/object-storage';
import { b2Endpoint,parseB2ObjectUrl } from '../lib/storage/object-reference';
const required=process.env.KHORA_B2_PREFLIGHT==='1';
async function main(){
 if(!required){console.log('[storage-preflight] not requested; provider not attested by this invocation');return;}
 const c=storageLocation();if(!c.bucket||!process.env.KHORA_B2_KEY_ID||!process.env.KHORA_B2_APPLICATION_KEY)throw Error('storage_preflight_credentials_missing');
 const previous=process.env.KHORA_OBJECT_STORAGE;process.env.KHORA_OBJECT_STORAGE='b2';
 const s=new S3Client({region:c.region,endpoint:b2Endpoint(c.region),forcePathStyle:true,credentials:{accessKeyId:process.env.KHORA_B2_KEY_ID,secretAccessKey:process.env.KHORA_B2_APPLICATION_KEY},maxAttempts:2,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
 const keys:string[]=[];let stage='encrypted_roundtrip';
 function check(value:unknown,code:string):asserts value{if(!value)throw Error(code);}
 const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
 try{
  const clear=Buffer.from('Khora synthetic storage deployment probe '+randomUUID());const encrypted=cifrarBytes(clear);
  const stored=await putEncryptedObject(`diagnostics/${randomUUID()}.khc`,encrypted,{access:'public',contentType:'application/octet-stream',addRandomSuffix:true});
  const key=parseB2ObjectUrl(stored.url,c);check(key,'storage_probe_locator');keys.push(key);
  const r=await fetchStoredObject(stored.url);check(r.ok,'storage_probe_private_read');const bytes=Buffer.from(await r.arrayBuffer());check(sha(bytes)===sha(encrypted)&&sha(descifrarBytes(bytes))===sha(clear),'storage_probe_integrity');
  const anon=await fetch(stored.url,{redirect:'error',signal:AbortSignal.timeout(30000)});await anon.arrayBuffer();check([401,403].includes(anon.status),'storage_probe_anonymous_access');
  stage='signed_upload';const staged=await prepareStagedUpload(randomUUID(),encrypted.length);const stagedKey=parseB2ObjectUrl(staged.url,c);check(stagedKey,'storage_probe_staging_locator');keys.push(stagedKey);
  const uploaded=await fetch(staged.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/octet-stream','x-amz-server-side-encryption':'AES256'},body:new Uint8Array(encrypted),redirect:'error',signal:AbortSignal.timeout(30000)});check(uploaded.ok,'storage_probe_signed_upload');
  const read=await fetchStoredObject(staged.url);check(read.ok&&sha(Buffer.from(await read.arrayBuffer()))===sha(encrypted),'storage_probe_staging_read');
  stage='cors';const old=await s.send(new GetBucketCorsCommand({Bucket:c.bucket}));
  check((old.CORSRules||[]).every(rule=>(rule.AllowedOrigins||[]).every(origin=>origin==='https://khora-web.vercel.app')),'storage_probe_unexpected_cors_rules');
  await s.send(new PutBucketCorsCommand({Bucket:c.bucket,CORSConfiguration:{CORSRules:[{ID:'khoraEncryptedUpload',AllowedOrigins:['https://khora-web.vercel.app'],AllowedMethods:['PUT'],AllowedHeaders:['content-type','x-amz-server-side-encryption'],MaxAgeSeconds:300}]}}));
  // A provider may take up to a minute to propagate its CORS policy. Bounded retries only.
  let corsOkay=false;for(let attempt=0;attempt<5;attempt++){
   if(attempt)await new Promise(resolve=>setTimeout(resolve,15000));
   const options=await fetch(staged.url,{method:'OPTIONS',headers:{Origin:'https://khora-web.vercel.app','Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'content-type,x-amz-server-side-encryption'},redirect:'error',signal:AbortSignal.timeout(30000)});
   corsOkay=options.ok&&options.headers.get('access-control-allow-origin')==='https://khora-web.vercel.app';await options.arrayBuffer();if(corsOkay)break;
  }check(corsOkay,'storage_probe_cors_not_ready');
  const denied=await fetch(staged.url,{method:'OPTIONS',headers:{Origin:'https://untrusted.invalid','Access-Control-Request-Method':'PUT'},redirect:'error',signal:AbortSignal.timeout(30000)});await denied.arrayBuffer();check(denied.headers.get('access-control-allow-origin')===null,'storage_probe_cors_overbroad');
  console.log('[storage-preflight] encrypted roundtrip, exact hashes, anonymous denial, signed upload, exact-origin CORS passed');
 }catch(e){const code=e instanceof Error&&/^storage_[a-z_]+$/.test(e.message)?e.message:'storage_provider_request_failed';console.error(`[storage-preflight] failed stage=${stage} code=${code}`);throw Error('storage_preflight_failed');}
 finally{
  try{for(const key of keys){check(key.startsWith('khora/diagnostics/')||key.startsWith('khora/staging/audio/'),'storage_probe_cleanup_scope');const versions=await s.send(new ListObjectVersionsCommand({Bucket:c.bucket,Prefix:key,MaxKeys:10}));check(!versions.IsTruncated,'storage_probe_cleanup_truncated');for(const v of [...(versions.Versions||[]),...(versions.DeleteMarkers||[])])if(v.Key===key&&v.VersionId)await s.send(new DeleteObjectCommand({Bucket:c.bucket,Key:key,VersionId:v.VersionId}));}console.log('[storage-preflight] exact synthetic versions removed');}
  finally{s.destroy();if(previous===undefined)delete process.env.KHORA_OBJECT_STORAGE;else process.env.KHORA_OBJECT_STORAGE=previous;}
 }
}
main().catch(()=>{console.error('[storage-preflight] deployment blocked; no originals deleted');process.exitCode=1;});
