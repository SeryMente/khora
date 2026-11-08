import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { b2Endpoint,b2ObjectUrl,parseB2ObjectUrl,legacyBlobUrl,safeObjectKey,stagingKeyForSession } from '../../lib/storage/object-reference';
import { fetchStoredObject,putEncryptedObject,deleteStagedObject,createStagingUploadId,STAGING_CHUNK_BYTES,putStagingChunk,finalizeStagingUpload,inspectB2ReadOnly,listB2Objects,putMigratedEncryptedObject } from '../../lib/server/object-storage';
const c={bucket:'khora-test-private',region:'us-east-005'};
const session='12345678-1234-1234-1234-123456789012';
test('B2 region cannot become an SSRF host',()=>assert.throws(()=>b2Endpoint('us-east-005.evil.invalid')));
test('stable private B2 locator contains no token or query capability',()=>{const u=b2ObjectUrl(`khora/staging/audio/${session}/1234.khstaging`,c);assert.equal(parseB2ObjectUrl(u,c),`khora/staging/audio/${session}/1234.khstaging`);assert.equal(new URL(u).search,'');});
for(const [name,url] of Object.entries({otherBucket:'https://s3.us-east-005.backblazeb2.com/other-private/khora/a',otherRegion:'https://s3.us-west-004.backblazeb2.com/khora-test-private/khora/a',otherHost:'https://evil.invalid/khora-test-private/khora/a',credentials:'https://user@s3.us-east-005.backblazeb2.com/khora-test-private/khora/a',query:b2ObjectUrl('khora/a',c)+'?token=x',fragment:b2ObjectUrl('khora/a',c)+'#x',encoded:b2ObjectUrl('khora/a',c).replace('khora/','khora%2F'),traversal:b2ObjectUrl('khora/a',c).replace('/a','/../a')}))test('rejects '+name,()=>assert.equal(parseB2ObjectUrl(url,c),null));
for(const path of ['outside/file','khora/../file','khora//file','khora/user@email/file','khora/a%2fb','khora/./file'])test('invalid key '+path,()=>assert.throws(()=>safeObjectKey(path)));
test('legacy Blob URLs stay restricted to explicit HTTPS Blob hosts',()=>{assert.equal(legacyBlobUrl('https://store.public.blob.vercel-storage.com/dictado/a.khc'),true);assert.equal(legacyBlobUrl('https://blob.vercel-storage.com.evil.invalid/a'),false);assert.equal(legacyBlobUrl('http://store.blob.vercel-storage.com/a'),false);assert.equal(legacyBlobUrl('https://u:p@store.blob.vercel-storage.com/a'),false);});
test('staging refs cannot cross sessions',()=>{const key=`khora/staging/audio/${session}/1234.khstaging`;assert.equal(stagingKeyForSession(key,session),true);assert.equal(stagingKeyForSession(key,'99999999-9999-9999-9999-999999999999'),false);});
test('new staging ID is opaque and valid UUIDv4',()=>assert.match(createStagingUploadId(),/^[0-9a-f-]{36}$/i));
test('chunk size remains below Vercel 4.5 MB request limit',()=>assert.equal(STAGING_CHUNK_BYTES,4*1024*1024));
test('transport rejects cleartext before network access',async()=>{await assert.rejects(()=>putEncryptedObject('dictado/test.khc',Buffer.from('not-an-envelope'),{access:'public'}),/encrypted_envelope/);});
test('new B2 writes fail closed when provider flag is not enabled; no Blob fallback',async()=>{const previous=process.env.KHORA_OBJECT_STORAGE;delete process.env.KHORA_OBJECT_STORAGE;const encrypted=Buffer.concat([Buffer.from('KHC1'),Buffer.alloc(32)]);try{await assert.rejects(()=>putEncryptedObject('dictado/test.khc',encrypted,{access:'public'}),/storage_b2_not_enabled/);await assert.rejects(()=>putStagingChunk(session,createStagingUploadId(),0,Buffer.alloc(100)),/storage_b2_not_enabled/);}finally{if(previous===undefined)delete process.env.KHORA_OBJECT_STORAGE;else process.env.KHORA_OBJECT_STORAGE=previous;}});
test('chunk size and total hash bounds are enforced before network access',async()=>{const previous=process.env.KHORA_OBJECT_STORAGE;process.env.KHORA_OBJECT_STORAGE='b2';try{await assert.rejects(()=>putStagingChunk(session,createStagingUploadId(),0,Buffer.alloc(STAGING_CHUNK_BYTES+1)),/storage_staging_chunk_invalid/);await assert.rejects(()=>finalizeStagingUpload(session,createStagingUploadId(),1024,1,'bad'),/storage_staging_invalid/);}finally{if(previous===undefined)delete process.env.KHORA_OBJECT_STORAGE;else process.env.KHORA_OBJECT_STORAGE=previous;}});
test('untrusted stored URLs are rejected before network access',async()=>{await assert.rejects(()=>fetchStoredObject('http://127.0.0.1/private'),/reference_not_allowed/);});
test('staging deletion rejects original audio URLs',async()=>{await assert.rejects(()=>deleteStagedObject('https://store.public.blob.vercel-storage.com/dictado/x/1.khc',session),/not_staging/);});
test('read-only preflight proves Master Key identity and exact private bucket',async()=>{
 const names=['KHORA_B2_MASTER_APPLICATION_KEY_ID','KHORA_B2_MASTER_APPLICATION_KEY','KHORA_B2_BUCKET_NAME','KHORA_B2_BUCKET_ID','KHORA_B2_REGION'];
 const before=Object.fromEntries(names.map(k=>[k,process.env[k]]));const originalFetch=globalThis.fetch;const calls:string[]=[];
 try{
  process.env.KHORA_B2_MASTER_APPLICATION_KEY_ID='master-id';process.env.KHORA_B2_MASTER_APPLICATION_KEY='synthetic-master-secret';process.env.KHORA_B2_BUCKET_NAME=c.bucket;process.env.KHORA_B2_BUCKET_ID='bucket-123';process.env.KHORA_B2_REGION=c.region;
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input);calls.push(`${init?.method||'GET'} ${url}`);
   if(url.endsWith('/b2api/v4/b2_authorize_account'))return new Response(JSON.stringify({accountId:'master-id',authorizationToken:'synthetic-account-token',apiInfo:{storageApi:{apiUrl:'https://api.test.b2',downloadUrl:'https://f001.test.b2',allowed:{capabilities:['listBuckets','listFiles','readFiles','writeFiles','deleteFiles','readBucketEncryption','writeBucketEncryption'],buckets:null,namePrefix:null}}}}),{status:200});
   if(url.endsWith('/b2api/v4/b2_list_buckets'))return new Response(JSON.stringify({buckets:[{accountId:'master-id',bucketId:'bucket-123',bucketName:c.bucket,bucketType:'allPrivate',corsRules:[],defaultServerSideEncryption:{isClientAuthorizedToRead:true,value:{mode:'SSE-B2',algorithm:'AES256'}}}]}),{status:200});
   throw new Error('unexpected fetch '+url);
  }) as typeof fetch;
  const result=await inspectB2ReadOnly();assert.equal(result.masterKeyVerified,true);assert.equal(result.bucketPrivate,true);assert.equal(result.sseB2,true);
  assert.equal(calls.length,2);assert.equal(calls.some(x=>x.includes('s3.us-east-005')),false);
 }finally{globalThis.fetch=originalFetch;for(const k of names){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
});
test('native B2 encrypted writes use only the server-side bucket upload token',async()=>{
 const names=['KHORA_B2_MASTER_APPLICATION_KEY_ID','KHORA_B2_MASTER_APPLICATION_KEY','KHORA_B2_BUCKET_NAME','KHORA_B2_BUCKET_ID','KHORA_B2_REGION','KHORA_OBJECT_STORAGE'];
 const before=Object.fromEntries(names.map(k=>[k,process.env[k]]));const originalFetch=globalThis.fetch;const calls:Array<{url:string;method:string;headers:Headers;body:BodyInit|null|undefined}>=[];
 try{
  process.env.KHORA_B2_MASTER_APPLICATION_KEY_ID='master-id';process.env.KHORA_B2_MASTER_APPLICATION_KEY='synthetic-master-secret';
  process.env.KHORA_B2_BUCKET_NAME=c.bucket;process.env.KHORA_B2_BUCKET_ID='bucket-123';process.env.KHORA_B2_REGION=c.region;process.env.KHORA_OBJECT_STORAGE='b2';
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input),headers=new Headers(init?.headers);calls.push({url,method:init?.method||'GET',headers,body:init?.body});
   if(url.endsWith('/b2api/v4/b2_authorize_account'))return new Response(JSON.stringify({accountId:'master-id',authorizationToken:'synthetic-account-token',apiInfo:{storageApi:{apiUrl:'https://api.test.b2',downloadUrl:'https://f001.test.b2',allowed:{capabilities:['listBuckets','listFiles','readFiles','writeFiles','deleteFiles'],buckets:null,namePrefix:null}}}}),{status:200});
   if(url.endsWith('/b2api/v4/b2_get_upload_url'))return new Response(JSON.stringify({bucketId:'bucket-123',uploadUrl:'https://pod.test.b2/b2api/v4/b2_upload_file',authorizationToken:'bucket-upload-token'}),{status:200});
   if(url==='https://pod.test.b2/b2api/v4/b2_upload_file')return new Response(JSON.stringify({fileId:'synthetic-file-id',fileName:decodeURIComponent(headers.get('X-Bz-File-Name')||''),contentLength:Number(headers.get('Content-Length'))}),{status:200});
   throw new Error('unexpected fetch '+url);
  }) as typeof fetch;
  const payload=Buffer.concat([Buffer.from('KHC1'),Buffer.alloc(32,7)]);
  const stored=await putEncryptedObject('dictado/unit-test.khc',payload,{access:'public'});
  assert.match(stored.url,/^https:\/\/s3\.us-east-005\.backblazeb2\.com\/khora-test-private\/khora\/dictado\/unit-test-/);
  const upload=calls.find(x=>x.url==='https://pod.test.b2/b2api/v4/b2_upload_file');assert.ok(upload);
  assert.equal(upload.method,'POST');assert.equal(upload.headers.get('Authorization'),'bucket-upload-token');
  assert.equal(upload.headers.get('Authorization')==='synthetic-account-token',false);
  assert.equal(upload.headers.get('Content-Length'),String(payload.length));assert.equal(upload.headers.get('X-Bz-Content-Sha1'),createHash('sha1').update(payload).digest('hex'));
  assert.equal(upload.headers.get('X-Bz-Server-Side-Encryption'),'AES256');
  assert.equal(calls.some(x=>x.url.includes('amazonaws.com')||x.url.includes('s3.us-east-005')),false);
 }finally{globalThis.fetch=originalFetch;for(const k of names){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
});

function saveEnv(names:string[]) {
 const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 return () => { for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];} };
}
function mockMasterAuthorization(accountId:string,downloadUrl='https://download.test.b2',apiUrl='https://api.test.b2') {
 return {
  accountId,
  authorizationToken:'account-token-'+accountId,
  apiInfo:{storageApi:{apiUrl,downloadUrl,allowed:{capabilities:['listBuckets','listFiles','readFiles','writeFiles','deleteFiles','readBucketEncryption','writeBucketEncryption'],buckets:null,namePrefix:null}}}
 };
}
function setTestB2Env(keyId='migration-test-master') {
 process.env.KHORA_B2_MASTER_APPLICATION_KEY_ID=keyId;
 process.env.KHORA_B2_MASTER_APPLICATION_KEY='secret-'+keyId;
 process.env.KHORA_B2_BUCKET_NAME=c.bucket;
 process.env.KHORA_B2_BUCKET_ID='bucket-123';
 process.env.KHORA_B2_REGION=c.region;
 process.env.KHORA_OBJECT_STORAGE='b2';
}

test('complete B2 inventory follows every nextFileName page and retains contentLength',async()=>{
 const names=['KHORA_B2_MASTER_APPLICATION_KEY_ID','KHORA_B2_MASTER_APPLICATION_KEY','KHORA_B2_BUCKET_NAME','KHORA_B2_BUCKET_ID','KHORA_B2_REGION','KHORA_OBJECT_STORAGE'];
 const restore=saveEnv(names),originalFetch=globalThis.fetch,calls:Array<{url:string;body:any}>=[];
 try {
  setTestB2Env('inventory-master');
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input),body=init?.body?JSON.parse(String(init.body)):null;calls.push({url,body});
   if(url.endsWith('/b2_authorize_account'))return new Response(JSON.stringify(mockMasterAuthorization('inventory-master')),{status:200});
   if(url.endsWith('/b2_list_file_names')){
    if(!body.startFileName)return new Response(JSON.stringify({files:[{action:'upload',fileName:'khora/dictado/a.khc',contentLength:101,uploadTimestamp:1}],nextFileName:'khora/dictado/b.khc'}),{status:200});
    return new Response(JSON.stringify({files:[{action:'upload',fileName:'khora/dictado/b.khc',contentLength:202,uploadTimestamp:2}],nextFileName:null}),{status:200});
   }
   throw new Error('unexpected fetch '+url);
  }) as typeof fetch;
  const objects=await listB2Objects('khora/dictado/');
  assert.equal(objects.length,2);assert.equal(objects[0].size,101);assert.equal(objects[1].size,202);
  assert.equal(calls.filter(x=>x.url.endsWith('/b2_list_file_names')).length,2);
  assert.equal(calls[1].body.prefix,'khora/dictado/');assert.equal(calls[2].body.startFileName,'khora/dictado/b.khc');
 } finally {globalThis.fetch=originalFetch;restore();}
});

test('B2 authorization cache is invalidated when the Master Key identity changes',async()=>{
 const names=['KHORA_B2_MASTER_APPLICATION_KEY_ID','KHORA_B2_MASTER_APPLICATION_KEY','KHORA_B2_BUCKET_NAME','KHORA_B2_BUCKET_ID','KHORA_B2_REGION','KHORA_OBJECT_STORAGE'];
 const restore=saveEnv(names),originalFetch=globalThis.fetch,authIds:string[]=[];
 try {
  setTestB2Env('master-before-rotation');
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input);
   if(url.endsWith('/b2_authorize_account')){
    const basic=new Headers(init?.headers).get('Authorization')||'';
    const decoded=Buffer.from(basic.replace(/^Basic /,''),'base64').toString('utf8');
    const id=decoded.split(':')[0];authIds.push(id);
    return new Response(JSON.stringify(mockMasterAuthorization(id)),{status:200});
   }
   if(url.endsWith('/b2_list_buckets'))return new Response(JSON.stringify({buckets:[{accountId:'master-before-rotation',bucketId:'bucket-123',bucketName:c.bucket,bucketType:'allPrivate',defaultServerSideEncryption:{isClientAuthorizedToRead:true,value:{mode:'SSE-B2',algorithm:'AES256'}}}]}),{status:200});
   if(url.endsWith('/b2_list_file_names'))return new Response(JSON.stringify({files:[],nextFileName:null}),{status:200});
   throw new Error('unexpected fetch '+url);
  }) as typeof fetch;
  await inspectB2ReadOnly();
  setTestB2Env('master-after-rotation');
  await listB2Objects();
  assert.deepEqual(authIds,['master-before-rotation','master-after-rotation']);
 } finally {globalThis.fetch=originalFetch;restore();}
});

test('historical Blob migration writes deterministic KHC1 bytes and verifies physical GET SHA-256',async()=>{
 const names=['KHORA_B2_MASTER_APPLICATION_KEY_ID','KHORA_B2_MASTER_APPLICATION_KEY','KHORA_B2_BUCKET_NAME','KHORA_B2_BUCKET_ID','KHORA_B2_REGION','KHORA_OBJECT_STORAGE'];
 const restore=saveEnv(names),originalFetch=globalThis.fetch,calls:Array<{url:string;method:string;headers:Headers;body:any}>=[];
 const payload=Buffer.concat([Buffer.from('KHC1'),Buffer.alloc(48,23)]);
 try {
  setTestB2Env('migration-write-master');
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input),headers=new Headers(init?.headers);calls.push({url,method:init?.method||'GET',headers,body:init?.body});
   if(url.endsWith('/b2_authorize_account'))return new Response(JSON.stringify(mockMasterAuthorization('migration-write-master')),{status:200});
   if(url.endsWith('/b2_list_file_versions'))return new Response(JSON.stringify({files:[],nextFileName:null,nextFileId:null}),{status:200});
   if(url.endsWith('/b2_get_upload_url'))return new Response(JSON.stringify({bucketId:'bucket-123',uploadUrl:'https://pod.test.b2/b2_upload_file',authorizationToken:'bucket-upload-token'}),{status:200});
   if(url==='https://pod.test.b2/b2_upload_file'){
    const key=decodeURIComponent(headers.get('X-Bz-File-Name')||'');
    return new Response(JSON.stringify({fileId:'synthetic-file-id',fileName:key,contentLength:Number(headers.get('Content-Length'))}),{status:200});
   }
   if(url==='https://download.test.b2/file/'+c.bucket+'/'+('khora/dictado/migrated/vercel-blob/'+('a'.repeat(64))+'.khc')){
    assert.equal(headers.get('Authorization'),'account-token-migration-write-master');
    return new Response(payload,{status:200});
   }
   throw new Error('unexpected fetch '+url);
  }) as typeof fetch;
  const result=await putMigratedEncryptedObject('a'.repeat(64),payload);
  assert.equal(result.reused,false);assert.equal(result.encryptedBytes,payload.length);
  assert.equal(result.encryptedSha256,createHash('sha256').update(payload).digest('hex'));
  assert.match(result.url,/khora\/dictado\/migrated\/vercel-blob\//);
  const upload=calls.find(x=>x.url==='https://pod.test.b2/b2_upload_file');assert.ok(upload);
  assert.equal(upload.headers.get('Authorization'),'bucket-upload-token');
  assert.equal(upload.headers.get('X-Bz-Server-Side-Encryption'),'AES256');
  assert.equal(calls.some(x=>x.url.startsWith('https://download.test.b2/file/')),true);
 } finally {globalThis.fetch=originalFetch;restore();}
});

test('historical Blob migration reuses an existing deterministic object only after exact readback',async()=>{
 const names=['KHORA_B2_MASTER_APPLICATION_KEY_ID','KHORA_B2_MASTER_APPLICATION_KEY','KHORA_B2_BUCKET_NAME','KHORA_B2_BUCKET_ID','KHORA_B2_REGION','KHORA_OBJECT_STORAGE'];
 const restore=saveEnv(names),originalFetch=globalThis.fetch;const payload=Buffer.concat([Buffer.from('KHC1'),Buffer.alloc(32,31)]);let uploads=0;
 try {
  setTestB2Env('migration-reuse-master');
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input),headers=new Headers(init?.headers);
   if(url.endsWith('/b2_authorize_account'))return new Response(JSON.stringify(mockMasterAuthorization('migration-reuse-master')),{status:200});
   if(url.endsWith('/b2_list_file_versions'))return new Response(JSON.stringify({files:[{fileName:'khora/dictado/migrated/vercel-blob/'+('b'.repeat(64))+'.khc',fileId:'old-file-id',action:'upload',contentLength:payload.length,uploadTimestamp:2}],nextFileName:null,nextFileId:null}),{status:200});
   if(url.includes('/b2_upload_file')){uploads++;throw new Error('must not overwrite a deterministic destination');}
   if(url==='https://download.test.b2/file/'+c.bucket+'/khora/dictado/migrated/vercel-blob/'+('b'.repeat(64))+'.khc'){
    assert.equal(headers.get('Authorization'),'account-token-migration-reuse-master');return new Response(payload,{status:200});
   }
   throw new Error('unexpected fetch '+url);
  }) as typeof fetch;
  const result=await putMigratedEncryptedObject('b'.repeat(64),payload);
  assert.equal(result.reused,true);assert.equal(result.encryptedSha256,createHash('sha256').update(payload).digest('hex'));assert.equal(uploads,0);
 } finally {globalThis.fetch=originalFetch;restore();}
});

test('historical Blob migration refuses deterministic destination length conflict without overwrite',async()=>{
 const names=['KHORA_B2_MASTER_APPLICATION_KEY_ID','KHORA_B2_MASTER_APPLICATION_KEY','KHORA_B2_BUCKET_NAME','KHORA_B2_BUCKET_ID','KHORA_B2_REGION','KHORA_OBJECT_STORAGE'];
 const restore=saveEnv(names),originalFetch=globalThis.fetch;let uploads=0;
 try {
  setTestB2Env('migration-conflict-master');
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input);
   if(url.endsWith('/b2_authorize_account'))return new Response(JSON.stringify(mockMasterAuthorization('migration-conflict-master')),{status:200});
   if(url.endsWith('/b2_list_file_versions'))return new Response(JSON.stringify({files:[{fileName:'khora/dictado/migrated/vercel-blob/'+('c'.repeat(64))+'.khc',fileId:'conflict-file-id',action:'upload',contentLength:999,uploadTimestamp:2}],nextFileName:null,nextFileId:null}),{status:200});
   if(url.includes('/b2_upload_file'))uploads++;
   throw new Error('unexpected fetch '+url);
  }) as typeof fetch;
  const payload=Buffer.concat([Buffer.from('KHC1'),Buffer.alloc(32,41)]);
  await assert.rejects(()=>putMigratedEncryptedObject('c'.repeat(64),payload),/migration_destination_conflict/);
  assert.equal(uploads,0);
 } finally {globalThis.fetch=originalFetch;restore();}
});
