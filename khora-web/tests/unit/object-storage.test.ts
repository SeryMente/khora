import test from 'node:test';
import assert from 'node:assert/strict';
import { b2Endpoint,b2ObjectUrl,parseB2ObjectUrl,legacyBlobUrl,safeObjectKey,stagingKeyForSession } from '../../lib/storage/object-reference';
import { b2Enabled,fetchStoredObject,putEncryptedObject,prepareStagedUpload,isStagingObject,deleteStagedObject } from '../../lib/server/object-storage';
const c={bucket:'khora-test-private',region:'us-east-005'};
const session='12345678-1234-1234-1234-123456789012';
const key=`khora/staging/audio/${session}/1234.khstaging`;
test('locator stable, private capability never persisted',()=>{const u=b2ObjectUrl(key,c);assert.equal(parseB2ObjectUrl(u,c),key);assert.equal(new URL(u).search,'');});
for(const [name,url] of Object.entries({otherBucket:'https://s3.us-east-005.backblazeb2.com/other-private/'+key,otherRegion:'https://s3.us-west-004.backblazeb2.com/'+c.bucket+'/'+key,otherHost:'https://evil.invalid/'+c.bucket+'/'+key,credentials:'https://user@'+new URL(b2ObjectUrl(key,c)).host+'/'+c.bucket+'/'+key,query:b2ObjectUrl(key,c)+'?token=x',fragment:b2ObjectUrl(key,c)+'#x',encoded:b2ObjectUrl(key,c).replace('khora/','khora%2F'),traversal:b2ObjectUrl(key,c).replace('/1234.khstaging','/../1234.khstaging')}))
 test('rejects '+name,()=>assert.equal(parseB2ObjectUrl(url,c),null));
for(const path of ['outside/file','khora/../file','khora//file','khora/user@email/file','khora/a%2fb','khora/./file'])test('invalid key '+path,()=>assert.throws(()=>safeObjectKey(path)));
test('region cannot become SSRF host',()=>assert.throws(()=>b2Endpoint('us-east-005.evil.invalid')));
test('legacy encrypted Blob locator remains readable only on explicit host',()=>{assert.equal(legacyBlobUrl('https://store.public.blob.vercel-storage.com/dictado/a.khc'),true);assert.equal(legacyBlobUrl('https://blob.vercel-storage.com.evil.invalid/a'),false);assert.equal(legacyBlobUrl('http://store.blob.vercel-storage.com/a'),false);assert.equal(legacyBlobUrl('https://u:p@store.blob.vercel-storage.com/a'),false);});
test('staging references cannot cross sessions',()=>{assert.equal(stagingKeyForSession(key,session),true);assert.equal(stagingKeyForSession(key,'99999999-9999-9999-9999-999999999999'),false);});
test('transport refuses cleartext before any network operation',async()=>{await assert.rejects(()=>putEncryptedObject('dictado/test.khc',Buffer.from('not an encrypted recording'),{access:'public'}),/encrypted_envelope/);});
test('untrusted stored URLs rejected before network',async()=>{await assert.rejects(()=>fetchStoredObject('http://127.0.0.1/private'),/reference_not_allowed/);});
test('deletion is restricted to staging, never original recordings',async()=>{await assert.rejects(()=>deleteStagedObject('https://test.public.blob.vercel-storage.com/dictado/x/1.khc',session),/not_staging/);});
test('signed staging capability is bounded to a single encrypted object and time',async()=>{
 const vars=['KHORA_B2_BUCKET_NAME','KHORA_B2_REGION','KHORA_B2_KEY_ID','KHORA_B2_APPLICATION_KEY','KHORA_OBJECT_STORAGE'];const before=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 try{process.env.KHORA_B2_BUCKET_NAME=c.bucket;process.env.KHORA_B2_REGION=c.region;process.env.KHORA_B2_KEY_ID='synthetic-id';process.env.KHORA_B2_APPLICATION_KEY='synthetic-secret';delete process.env.KHORA_OBJECT_STORAGE;assert.equal(b2Enabled(),false);process.env.KHORA_OBJECT_STORAGE='b2';assert.equal(b2Enabled(),true);
  const p=await prepareStagedUpload(session,1024);const u=new URL(p.uploadUrl);assert.equal(u.hostname,'s3.us-east-005.backblazeb2.com');assert.equal(u.searchParams.get('X-Amz-Expires'),'300');assert.ok(u.searchParams.has('X-Amz-Signature'));assert.equal(isStagingObject(p.url,session),true);assert.equal(new URL(p.url).search,'');assert.equal(isStagingObject(p.url,'99999999-9999-9999-9999-999999999999'),false);
  await assert.rejects(()=>prepareStagedUpload(session,25*1024*1024),/staging_invalid/);await assert.rejects(()=>prepareStagedUpload('bad-session',100),/staging_invalid/);
 }finally{for(const k of vars){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
});
