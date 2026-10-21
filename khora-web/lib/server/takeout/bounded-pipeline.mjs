/** Server-only. Checkpoints contain hash state / paths / biography and MUST be
 * encrypted with owner/kind/id binding. Never return them to Workflow history.
 * No extraction to disk, HTML execution, external AI or automatic ratification.
 */
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {createSHA256} from 'hash-wasm';
import yauzl from 'yauzl';
import {TransferError,validateReceipt,readTransferPart,CHUNK_BYTES} from './transfer.mjs';
const stop=c=>{throw new TransferError(c)};
const sum=b=>createHash('sha256').update(b).digest('hex');
export const PIPELINE_VERSION='takeout-0.2.0';
export const ZIP_LIMITS=Object.freeze({entries:5000,entryBytes:1024*1024,totalExpandedBytes:128*1024*1024,ratio:100,stepEntries:8,unitChars:131072,units:1000});
export async function verifyArchiveStep({receipt,owner,store,checkpoint=null}){
 const r=validateReceipt(receipt,owner);
 if(r.status!=='downloaded')stop('VERIFICATION_REQUIRES_DOWNLOAD');
 const h=await createSHA256();h.init();let index=0;
 if(checkpoint!==null){
  if(!checkpoint||Object.keys(checkpoint).sort().join(',')!=='algorithm,index,state'||checkpoint.algorithm!=='hash-wasm-4.12.0-sha256'||!Number.isInteger(checkpoint.index)||checkpoint.index<0||checkpoint.index>=r.parts.length||typeof checkpoint.state!=='string'||!/^[a-f0-9]{1,4096}$/.test(checkpoint.state)||checkpoint.state.length%2)stop('VERIFY_CHECKPOINT_INVALID');
  try{h.load(Buffer.from(checkpoint.state,'hex'))}catch{stop('VERIFY_CHECKPOINT_INVALID')};index=checkpoint.index;
 }
 const bytes=await readTransferPart({receipt:r,owner,store,index});h.update(bytes);index++;
 if(index===r.parts.length){r.archive_sha256=h.digest('hex');r.status='stored_verified';validateReceipt(r,owner);return {done:true,receipt:r,checkpoint:null}}
 return {done:false,receipt:r,checkpoint:{algorithm:'hash-wasm-4.12.0-sha256',index,state:Buffer.from(h.save()).toString('hex')}};
}
export function checkedZipEntry(e){
 const n=e?.fileName;
 if(typeof n!=='string'||!n||n.length>2048||/[\x00-\x1f\x7f\\]/.test(n)||n.startsWith('/')||/^[a-z]:/i.test(n)||n.split('/').some(p=>p==='..'||p==='.'))stop('ZIP_UNSAFE_PATH');
 const mode=(e.externalFileAttributes>>>16)&0xf000;
 if(mode===0xa000||![0,0x8000,0x4000].includes(mode))stop('ZIP_SPECIAL_ENTRY');
 if(!Number.isSafeInteger(e.uncompressedSize)||!Number.isSafeInteger(e.compressedSize)||e.uncompressedSize<0||e.compressedSize<0||e.isEncrypted?.()||(e.generalPurposeBitFlag&1)||![0,8].includes(e.compressionMethod))stop('ZIP_ENTRY_UNSUPPORTED');
 if(e.uncompressedSize>Math.max(1,e.compressedSize)*ZIP_LIMITS.ratio)stop('ZIP_EXPANSION_RATIO');
 return n;
}
class ArchiveReader extends yauzl.RandomAccessReader{
 constructor(r,owner,store,budget){super();this.r=r;this.owner=owner;this.store=store;this.cache=new Map();this.bytesRead=0;this.budget=budget}
 _readStreamForRange(a,b){
  const self=this;
  return Readable.from((async function*(){
   if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<a||b>self.r.size)stop('ZIP_RANGE_INVALID');
   let p=a;while(p<b){
    const i=Math.floor(p/CHUNK_BYTES);let data=self.cache.get(i);
    if(!data){const length=self.r.parts[i]?.bytes;if(!length||self.bytesRead+length>self.budget)stop('ZIP_READ_BUDGET');self.bytesRead+=length;data=await readTransferPart({receipt:self.r,owner:self.owner,store:self.store,index:i});if(self.cache.size>=2)self.cache.delete(self.cache.keys().next().value);self.cache.set(i,data)}
    const off=p-i*CHUNK_BYTES,n=Math.min(b-p,data.length-off);if(n<=0)stop('ZIP_RANGE_INVALID');yield data.subarray(off,off+n);p+=n;
   }
  })());
 }
 _destroy(cb){this.cache.clear();cb()}
}
const openZip=(reader,size)=>new Promise((resolve,reject)=>yauzl.fromRandomAccessReader(reader,size,{autoClose:true,lazyEntries:true,decodeStrings:true,validateEntrySizes:true,strictFileNames:true},(e,z)=>e?reject(new TransferError('ZIP_INVALID')):resolve(z)));
async function entryBytes(zip,entry){
 const stream=await new Promise((resolve,reject)=>zip.openReadStream(entry,(e,s)=>e?reject(new TransferError('ZIP_ENTRY_INVALID')):resolve(s)));
 const chunks=[];let size=0;
 try{for await(const chunk of stream){size+=chunk.length;if(size>ZIP_LIMITS.entryBytes||size>entry.uncompressedSize)stop('ZIP_ENTRY_EXPANSION_LIMIT');chunks.push(chunk)}}catch{stream.destroy();stop('ZIP_ENTRY_INVALID')}
 if(size!==entry.uncompressedSize)stop('ZIP_ENTRY_SIZE_MISMATCH');
 // yauzl validates sizes but not CRC32. CRC is checked independently below.
 const data=Buffer.concat(chunks,size);if(crc32(data)!==(entry.crc32>>>0))stop('ZIP_CRC_MISMATCH');return data;
}
let crcTable;
export function crc32(data){if(!crcTable){crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}}let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
/** Cursor is encrypted durable state. Output is bounded private source material,
 * NOT automatically personal facts. Unknown formats/large entries are retained
 * in the original and explicitly indexed as not extracted. */
export async function parseZipStep({receipt,owner,store,cursor=null,readBudget=24*CHUNK_BYTES}){
 const r=validateReceipt(receipt,owner);if(r.status!=='stored_verified')stop('ZIP_REQUIRES_VERIFIED_ARCHIVE');
 if(!['application/zip','application/x-zip-compressed'].includes(r.mimeType))stop('ZIP_ONLY_FIRST_RELEASE');
 const c=cursor??{next:0,names:[],expanded:0,units:0};
 if(!c||Object.keys(c).sort().join(',')!=='expanded,names,next,units'||!Number.isInteger(c.next)||c.next<0||c.next>ZIP_LIMITS.entries||!Array.isArray(c.names)||c.names.length!==c.next||new Set(c.names).size!==c.names.length||!Number.isSafeInteger(c.expanded)||c.expanded<0||c.expanded>ZIP_LIMITS.totalExpandedBytes||!Number.isInteger(c.units)||c.units<0||c.units>ZIP_LIMITS.units||!Number.isSafeInteger(readBudget)||readBudget<CHUNK_BYTES||readBudget>24*CHUNK_BYTES)stop('ZIP_CURSOR_INVALID');
 const reader=new ArchiveReader(r,owner,store,readBudget);const zip=await openZip(reader,r.size);if(zip.entryCount>ZIP_LIMITS.entries){zip.close();stop('ZIP_ENTRY_COUNT_LIMIT')}
 const next=structuredClone(c),sources=[],index=[];let i=0,processed=0;
 try{
  for await(const e of zip.eachEntry()){
   const name=checkedZipEntry(e);
   if(i<c.next){if(c.names[i]!==sum(Buffer.from(name)))stop('ZIP_CURSOR_SOURCE_MISMATCH');i++;continue}
   const nameHash=sum(Buffer.from(name));if(next.names.includes(nameHash))stop('ZIP_DUPLICATE_PATH');next.names.push(nameHash);next.next++;i++;processed++;
   next.expanded+=e.uncompressedSize;if(next.expanded>ZIP_LIMITS.totalExpandedBytes)stop('ZIP_TOTAL_EXPANSION_LIMIT');
   let reason=null;
   if(name.endsWith('/'))reason='directory';
   else if(e.uncompressedSize>ZIP_LIMITS.entryBytes)reason='entry_too_large_retained';
   else if(!/\.(json|txt|csv|html?)$/i.test(name))reason='format_not_extracted_retained';
   if(reason){index.push({entry:i-1,name,bytes:e.uncompressedSize,status:reason})}
   else{
    const raw=await entryBytes(zip,e);let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(raw)}catch{stop('ZIP_TEXT_ENCODING_UNSUPPORTED')}
    const units=Math.ceil(text.length/ZIP_LIMITS.unitChars);next.units+=units;if(next.units>ZIP_LIMITS.units)stop('ZIP_CANDIDATE_LIMIT');
    sources.push({entry:i-1,name,bytes:raw.length,sha256:sum(raw),text});index.push({entry:i-1,name,bytes:raw.length,status:'private_unreviewed_text',sha256:sum(raw)});
   }
   if(processed>=ZIP_LIMITS.stepEntries)break;
  }
  return {done:next.next===zip.entryCount,cursor:next,sources,index,readBytes:reader.bytesRead};
 }catch(e){if(e instanceof TransferError)throw e;stop('ZIP_INVALID')}
 finally{zip.close();reader.cache.clear()}
}
