/** Portable Node 22+ candidate. No secret values in command arguments or plaintext files.
 * Streams age ciphertext to exclusive temp files, promotes by hard link only after success.
 * Plaintext and released identities exist in memory: this does NOT secure a malicious host. */
import {Encrypter,Decrypter} from 'age-encryption';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,link,unlink,chmod,stat} from 'node:fs/promises';
import {once} from 'node:events';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dirname,resolve} from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {randomUUID,createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import https from 'node:https';
import {isIP} from 'node:net';

export function publicAddress(address){
 const n=isIP(address);
 if(n===4){const [a,b]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19)||a===192&&b===0);}
 // Deliberately fail closed to IPv4 until IPv6 range parsing/pinning is reviewed.
 return false;
}
export function sourceURL(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port&&u.port!=='443')throw Error();return u;}catch{throw Error('source_not_supported');}}
export async function remoteStream(raw,{maxBytes=64*1024*1024,timeoutMs=30000}={}){
 const u=sourceURL(raw), addresses=await lookup(u.hostname,{all:true});
 if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw Error('private_or_unreviewed_address');
 const selected=addresses[0];
 return new Promise((accept,reject)=>{
  const r=https.get(u,{timeout:timeoutMs,headers:{'Accept-Encoding':'identity'},lookup:(_h,o,cb)=>o.all?cb(null,[selected]):cb(null,selected.address,selected.family)},res=>{
   if(res.statusCode!==200){res.destroy();reject(Error('source_requires_authorization_or_redirect'));return;}
   if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();reject(Error('unsupported_content_encoding'));return;}
   if(Number(res.headers['content-length'])>maxBytes){res.destroy();reject(Error('source_too_large'));return;}
   accept({stream:Readable.toWeb(res),origin:u.origin});
  });r.on('timeout',()=>r.destroy(Error('source_timeout')));r.on('error',()=>reject(Error('source_unavailable')));
 });
}
const execPrivate=promisify(execFile);
// Read-only OS ACL verification. Never broadens permissions or changes global policy.
// SYSTEM/Administrators on Windows have the same host-control caveat as POSIX root.
const windowsPrivateCheck=`$ErrorActionPreference='Stop'; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=Get-Acl -LiteralPath $env:KHORA_PRIVATE_CIPHER_PATH; if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value){throw 'owner'}; $trusted=@($sid.Value,'S-1-5-18','S-1-5-32-544'); $rights=0; foreach($r in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){if($r.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow){if($trusted -notcontains $r.IdentityReference.Value){throw 'untrusted_allow'}; if($r.IdentityReference.Value -eq $sid.Value){$rights=$rights -bor [int]$r.FileSystemRights}}}; if(($rights -band 3) -ne 3){throw 'owner_read_write'}; Write-Output 'PRIVATE_CIPHER_ACL_VERIFIED'`;
export async function assertPrivateCipher(file){
 try{
  if(process.platform==='win32'){
   const {stdout}=await execPrivate('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',windowsPrivateCheck],{env:{...process.env,KHORA_PRIVATE_CIPHER_PATH:resolve(file)},timeout:15000,maxBuffer:4096,windowsHide:true});
   if(stdout.trim()!=='PRIVATE_CIPHER_ACL_VERIFIED')throw Error();
  }else if(((await stat(file)).mode&0o777)!==0o600)throw Error();
  return true;
 }catch{throw Error('cipher_permissions_unverified');}
}
async function atomicCipher(stream,path){
 const target=resolve(path),temp=target+'.partial-'+randomUUID();await mkdir(dirname(target),{recursive:true,mode:0o700});
 let created=false,sink;
 try{
  sink=createWriteStream(temp,{flags:'wx',mode:0o600});await once(sink,'open');created=true;
  // Check before writing and promoting, including real Windows ACLs (mode is not an ACL).
  await assertPrivateCipher(temp);
  await pipeline(Readable.fromWeb(stream),sink);
  // link is create-if-absent; unlike rename, it NEVER overwrites an existing target.
  await link(temp,target);await chmod(target,0o600);
 }finally{if(sink&&!sink.closed)sink.destroy();if(created)await unlink(temp).catch(()=>{});}
}
export class PortableSession {
 #identity;#recipient;
 constructor(release){if(!release?.identity||!release?.recipient)throw Error('online_release_required');this.#identity=release.identity;this.#recipient=release.recipient;}
 close(){this.#identity=undefined;this.#recipient=undefined;}
 ready(){if(!this.#identity)throw Error('vault_closed');}
 async ingestStream(stream,path,{origin='synthetic',maxBytes=64*1024*1024}={}){
  this.ready();const h=createHash('sha256');let bytes=0;
  const bounded=stream.pipeThrough(new TransformStream({transform(chunk,controller){bytes+=chunk.byteLength;if(bytes>maxBytes)throw Error('source_too_large');h.update(chunk);controller.enqueue(chunk);}}));
  const e=new Encrypter();e.addRecipient(this.#recipient);await atomicCipher(await e.encrypt(bounded),path);
  // Source URL never persisted; only non-secret origin. Caller stores this INSIDE encrypted report.
  return {format:'age',bytes,sha256:h.digest('hex'),origin};
 }
 async download(raw,path,options={}){this.ready();const src=await remoteStream(raw,options);return this.ingestStream(src.stream,path,{...options,origin:src.origin});}
 async analyzeText(path,reportPath,{provenance,maxBytes=64*1024*1024,maxLine=65536}={}){
  this.ready();const d=new Decrypter();d.addIdentity(this.#identity);
  const plain=await d.decrypt(Readable.toWeb(createReadStream(path)));
  const decoder=new TextDecoder('utf-8',{fatal:true}),h=createHash('sha256');let bytes=0,characters=0,lines=0,buffer='',offset=0;
  const candidates=[];let truncated=false,candidateCharacters=0;
  function line(text){lines++;if(text.length>maxLine)throw Error('line_too_large');
   // Deterministic proposals, NOT ratified autobiographical facts; bounded extraction.
   if(/\b(?:19|20)\d{2}-\d{2}-\d{2}\b/.test(text)){
    if(candidates.length<100&&candidateCharacters+text.length<=262144){candidates.push({kind:'dated_fragment_proposal',characterStart:offset,characterEnd:offset+text.length,text,status:'proposed'});candidateCharacters+=text.length;}else truncated=true;
   }offset+=text.length+1;
  }
  for await(const chunk of plain){bytes+=chunk.byteLength;if(bytes>maxBytes)throw Error('analysis_too_large');h.update(chunk);const text=decoder.decode(chunk,{stream:true});characters+=text.length;buffer+=text;
   let at;while((at=buffer.indexOf('\n'))!==-1){line(buffer.slice(0,at));buffer=buffer.slice(at+1);}if(buffer.length>maxLine)throw Error('line_too_large');
  }
  const last=decoder.decode();characters+=last.length;buffer+=last;if(buffer)line(buffer);
  const digest=h.digest('hex');if(provenance&&(digest!==provenance.sha256||bytes!==provenance.bytes))throw Error('source_integrity_mismatch');
  const report={kind:'synthetic_text_analysis_candidate',source:{...provenance,sha256:digest,bytes},characters,lines,candidates,truncated,ratified:false,externalAIUsed:false};
  const e=new Encrypter();e.addRecipient(this.#recipient);
  // No report promoted until full source authentication and integrity have completed.
  await atomicCipher(await e.encrypt(new Blob([JSON.stringify(report)]).stream()),reportPath);return {bytes,characters,lines,candidates:candidates.length,truncated};
 }
 async readReport(path){this.ready();const d=new Decrypter();d.addIdentity(this.#identity);const stream=await d.decrypt(Readable.toWeb(createReadStream(path)));const chunks=[];let n=0;for await(const b of stream){n+=b.length;if(n>2*1024*1024)throw Error('report_too_large');chunks.push(b);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
}
