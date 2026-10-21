import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import AdmZip from 'adm-zip';
import {verifyArchiveStep,parseZipStep,checkedZipEntry,crc32} from '../../lib/server/takeout/bounded-pipeline.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const owner='operator@example.com',job='job-pipeline-1',file='AbCdEfGhIjKlMn';
function fixture(count=10){const z=new AdmZip();for(let i=0;i<count;i++)z.addFile(`Takeout/source-${i}.txt`,Buffer.from(`línea privada ${i}`));return z.toBuffer()}
function receipt(raw,status='downloaded'){return {transfer_version:'0.2.0',owner,job_id:job,file_id:file,size:raw.length,version:'1',mimeType:'application/zip',status,next_offset:raw.length,archive_sha256:status==='stored_verified'?sha(raw):null,parts:[{start:0,bytes:raw.length,sha256:sha(raw),reference:'memory://0'}]}}
const storeFor=raw=>({write:async()=>'',read:async(_reference,{maxBytes})=>{assert.equal(maxBytes,raw.length);return raw}});

test('verification checkpoints a downloaded encrypted archive',async()=>{const raw=fixture(2);const out=await verifyArchiveStep({receipt:receipt(raw),owner,store:storeFor(raw)});assert.equal(out.done,true);assert.equal(out.receipt.status,'stored_verified');assert.equal(out.receipt.archive_sha256,sha(raw));assert.equal(out.checkpoint,null)});
test('ZIP parsing is bounded and resumes without duplicating entries',async()=>{const raw=fixture(10),r=receipt(raw,'stored_verified'),store=storeFor(raw);const first=await parseZipStep({receipt:r,owner,store});assert.equal(first.done,false);assert.equal(first.sources.length,8);const second=await parseZipStep({receipt:r,owner,store,cursor:first.cursor});assert.equal(second.done,true);assert.equal(second.sources.length,2);assert.equal(new Set([...first.sources,...second.sources].map(x=>x.name)).size,10)});
test('unsafe and encrypted-like ZIP metadata fails closed',()=>{assert.throws(()=>checkedZipEntry({fileName:'../escape.txt',externalFileAttributes:0,uncompressedSize:1,compressedSize:1,generalPurposeBitFlag:0,compressionMethod:0,isEncrypted:()=>false}),/ZIP_UNSAFE_PATH/);assert.throws(()=>checkedZipEntry({fileName:'safe.txt',externalFileAttributes:0,uncompressedSize:1,compressedSize:1,generalPurposeBitFlag:1,compressionMethod:0,isEncrypted:()=>true}),/ZIP_ENTRY_UNSUPPORTED/) });
test('CRC32 uses the standard independent checksum',()=>assert.equal(crc32(Buffer.from('123456789')),0xcbf43926));
