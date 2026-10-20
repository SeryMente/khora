import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {beginTransfer,advanceTransfer,verifyRestoration,driveFileId,validateReceipt,CHUNK_BYTES} from '../../lib/server/takeout/transfer.mjs';
import {createEncryptedStore} from '../../lib/server/takeout/encrypted-store.mjs';
// Exercise the actual canonical cipher, not a substitute implementation.
if(Object.hasOwn(process.env,'X_KHORA_KEY'))throw Error('Run only in isolated environment without production cipher configuration');
process.env.X_KHORA_KEY=randomBytes(32).toString('hex');
const cipherSource=stripTypeScriptTypes(readFileSync(new URL('../../lib/server/cripto.ts',import.meta.url),'utf8'));
const crypto=await import('data:text/javascript;base64,'+Buffer.from(cipherSource).toString('base64'));
const FILE='synthetic_file_00001',OWNER='synthetic-owner',TOKEN='synthetic-token-not-real';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture({body=Buffer.from('synthetic Takeout transport bytes; not actual autobiography'),changeMetadata=false,rangeStatus=206,rangeHeader,extra=0,truncated=false,encoding,deny=false,transportError=false,metadataPatch={}}={}){
 const calls=[],objects=new Map();let metadataCalls=0;
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  assert.match(url,/^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/synthetic_file_00001\?/);
  assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,'Bearer '+TOKEN);
  if(transportError)throw Error('PRIVATE_PAYLOAD_IN_TRANSPORT_ERROR');
  if(url.includes('fields=')){
   metadataCalls++;return new Response(JSON.stringify({id:FILE,size:String(body.length),mimeType:'application/zip',version:changeMetadata&&metadataCalls>1?'2':'1',capabilities:{canDownload:!deny},...metadataPatch}),{status:200});
  }
  const m=/^bytes=(\d+)-(\d+)$/.exec(options.headers.Range);assert.ok(m);
  const start=Number(m[1]),end=Number(m[2]);let data=body.subarray(start,end+1);if(extra)data=Buffer.concat([data,Buffer.alloc(extra)]);if(truncated)data=data.subarray(0,-1);
  return new Response(data,{status:rangeStatus,headers:{'Content-Range':rangeHeader??`bytes ${start}-${end}/${body.length}`,...(encoding?{'Content-Encoding':encoding}:{})}});
 };
 let permitted=true,writeCount=0;
 const store=createEncryptedStore({encrypt:crypto.cifrarBytes,decrypt:crypto.descifrarBytes,
  hashOwner:s=>sha(Buffer.from(s)),authorize:async(o)=>permitted&&o===OWNER,
  referenceWithin:(ref,prefix)=>typeof ref==='string'&&ref.startsWith(prefix+'/'),
  put:async(path,sealed)=>{writeCount++;objects.set(path,Buffer.from(sealed));return path;},
  read:async(ref)=>Buffer.from(objects.get(ref)||[])});
 return {body,calls,objects,fetcher,store,setPermit:v=>{permitted=v},writes:()=>writeCount};
}
const begin=f=>beginTransfer({owner:OWNER,source:FILE,accessToken:TOKEN,fetcher:f.fetcher,jobId:'synthetic-job'});
const advance=(f,r,extra={})=>advanceTransfer({receipt:r,owner:OWNER,accessToken:TOKEN,store:f.store,fetcher:f.fetcher,...extra});
const code=c=>e=>e.code===c;
test('single chunk uses real canonical KHC1 encryption, exact restoration and no plaintext at rest',async()=>{
 const f=fixture(),r=await begin(f),done=await advance(f,r);assert.equal(r.next_offset,0);assert.equal(done.status,'stored_verified');
 assert.equal(done.archive_sha256,sha(f.body));assert.deepEqual(await verifyRestoration({receipt:done,owner:OWNER,store:f.store}),{verified:true,bytes:f.body.length,sha256:sha(f.body)});
 for(const encrypted of f.objects.values()){assert.equal(encrypted.subarray(0,4).toString(),'KHC1');assert.ok(!encrypted.includes(f.body));}
 assert.ok(!JSON.stringify(done).includes(TOKEN));
});
test('multiple chunks resume from serialized checkpoint and recheck entire archive',async()=>{
 const f=fixture({body:Buffer.alloc(CHUNK_BYTES+31,0x61)});let r=await begin(f);r=await advance(f,r);assert.equal(r.next_offset,CHUNK_BYTES);assert.equal(r.status,'transferring');
 r=await advance(f,JSON.parse(JSON.stringify(r)));assert.equal(r.parts.length,2);assert.equal(r.archive_sha256,sha(f.body));assert.equal(f.writes(),2);
 assert.equal((await verifyRestoration({receipt:r,owner:OWNER,store:f.store})).verified,true);
});
test('completed transfer is idempotent without new writes or network',async()=>{const f=fixture(),r=await advance(f,await begin(f)),n=f.calls.length;assert.deepEqual(await advance(f,r),r);assert.equal(f.calls.length,n);assert.equal(f.writes(),1);});
test('foreign owner stops before network or storage',async()=>{const f=fixture(),r=await begin(f),n=f.calls.length;await assert.rejects(advance(f,r,{owner:'foreign-owner'}),code('RECEIPT_INVALID_OR_FOREIGN'));assert.equal(f.calls.length,n);assert.equal(f.writes(),0);});
test('source revision changes stop without write',async()=>{const f=fixture({changeMetadata:true}),r=await begin(f);await assert.rejects(advance(f,r),code('GOOGLE_SOURCE_CHANGED'));assert.equal(f.writes(),0);});
test('download permission is mandatory',async()=>{await assert.rejects(begin(fixture({deny:true})),code('GOOGLE_FILE_NOT_DOWNLOADABLE'));});
test('transport exceptions never reveal upstream values',async()=>{await assert.rejects(begin(fixture({transportError:true})),e=>e.message==='GOOGLE_TRANSPORT_FAILED'&&!JSON.stringify(e).includes('PRIVATE_PAYLOAD'));});
for(const input of ['http://drive.google.com/file/d/'+FILE,'https://evil.example/'+FILE,'https://drive.google.com.evil.example/file/d/'+FILE,'https://drive.google.com@evil.example/file/d/'+FILE,'https://drive.google.com:444/file/d/'+FILE,'https://drive.google.com/file/d/'+FILE+'?token=secret','https://drive.google.com/file/d/'+FILE+'#secret','https://takeout.google.com/takeout/download?x=private','file:///etc/passwd','http://127.0.0.1/','https://169.254.169.254/latest/meta-data']){
 test('reject non-Drive or unsafe source '+input.split('?')[0],()=>assert.throws(()=>driveFileId(input)));
}
test('Drive selection link is parsed but never fetched as entered URL',()=>assert.equal(driveFileId('https://drive.google.com/file/d/'+FILE+'/view?usp=sharing'),FILE));
for(const setup of [
 [{rangeStatus:200},'GOOGLE_RANGE_NOT_HONORED'],[{rangeHeader:'bytes 0-1/2'},'GOOGLE_RANGE_MISMATCH'],[{extra:1},'GOOGLE_BODY_TOO_LARGE'],[{truncated:true},'GOOGLE_BODY_TRUNCATED'],[{encoding:'gzip'},'GOOGLE_ENCODING_UNEXPECTED']
])test('reject altered download '+setup[1],async()=>{const f=fixture(setup[0]),r=await begin(f);await assert.rejects(advance(f,r),code(setup[1]));assert.equal(f.writes(),0);assert.equal(r.next_offset,0);});
test('lost store authorization prevents checkpoint advancement',async()=>{const f=fixture(),r=await begin(f);f.setPermit(false);await assert.rejects(advance(f,r),code('ENCRYPTED_WRITE_FAILED'));assert.equal(r.next_offset,0);assert.equal(f.writes(),0);});
test('ciphertext tampering prevents restoration',async()=>{const f=fixture(),r=await advance(f,await begin(f));const ref=r.parts[0].reference;f.objects.get(ref)[35]^=1;await assert.rejects(verifyRestoration({receipt:r,owner:OWNER,store:f.store}),code('STORED_PART_UNREADABLE'));});
test('unmarked plaintext cannot use legacy decryptor fallback',async()=>{const f=fixture(),r=await advance(f,await begin(f));f.objects.set(r.parts[0].reference,Buffer.alloc(r.size+32));await assert.rejects(verifyRestoration({receipt:r,owner:OWNER,store:f.store}),code('STORED_PART_UNREADABLE'));});
test('plaintext from unsafe store is not promoted without hash equality',async()=>{const f=fixture(),r=await begin(f);const unsafe={write:async()=> 'opaque',read:async()=>Buffer.alloc(f.body.length)};await assert.rejects(advance(f,r,{store:unsafe}),code('STORED_PART_INTEGRITY_FAILED'));assert.equal(r.next_offset,0);});
test('foreign reference is rejected before read',async()=>{const f=fixture(),r=await advance(f,await begin(f));r.parts[0].reference='khora/takeout/foreign/object';await assert.rejects(verifyRestoration({receipt:r,owner:OWNER,store:f.store}),code('STORED_PART_UNREADABLE'));});
test('manifest digest tamper prevents successful verification',async()=>{const f=fixture(),r=await advance(f,await begin(f));r.archive_sha256='0'.repeat(64);await assert.rejects(verifyRestoration({receipt:r,owner:OWNER,store:f.store}),code('RESTORATION_INTEGRITY_FAILED'));});
test('incomplete transfer cannot be called restored',async()=>{const f=fixture(),r=await begin(f);await assert.rejects(verifyRestoration({receipt:r,owner:OWNER,store:f.store}),code('TRANSFER_INCOMPLETE'));});
for(const [field,value] of [['next_offset',1],['size',0],['transfer_version','future'],['status','corpus_ingested'],['archive_sha256','0'.repeat(64)]])test('reject divergent receipt '+field,async()=>{const f=fixture(),r=await begin(f);r[field]=value;assert.throws(()=>validateReceipt(r,OWNER));});
test('invalid OAuth input rejected without network',async()=>{let called=false;await assert.rejects(beginTransfer({owner:OWNER,source:FILE,accessToken:'bad\r\nheader',fetcher:async()=>{called=true}}),code('GOOGLE_AUTH_REQUIRED'));assert.equal(called,false);});
test('missing encrypted adapter bindings fails closed',()=>assert.throws(()=>createEncryptedStore({}),code('STORE_BINDINGS_REQUIRED')));

for(const [patch,expected] of [[{mimeType:'text/html'},'GOOGLE_ARCHIVE_TYPE_UNSUPPORTED'],[{size:'0'},'GOOGLE_SIZE_INVALID'],[{size:'53687091201'},'GOOGLE_SIZE_LIMIT'],[{version:''},'GOOGLE_REVISION_REQUIRED'],[{trashed:true},'GOOGLE_FILE_NOT_DOWNLOADABLE'],[{id:'other_file_00001'},'GOOGLE_FILE_NOT_DOWNLOADABLE']])test('reject unsuitable metadata '+Object.keys(patch)[0],async()=>await assert.rejects(begin(fixture({metadataPatch:patch})),code(expected)));
test('receipt rejects undeclared fields rather than carrying possible credentials',async()=>{const f=fixture(),r=await begin(f);r.accessToken='synthetic-not-real';assert.throws(()=>validateReceipt(r,OWNER),code('RECEIPT_FIELDS_INVALID'));});
test('part receipt rejects undeclared fields',async()=>{const f=fixture(),r=await advance(f,await begin(f));r.parts[0].unexpected='synthetic';assert.throws(()=>validateReceipt(r,OWNER),code('RECEIPT_PART_FIELDS_INVALID'));});
