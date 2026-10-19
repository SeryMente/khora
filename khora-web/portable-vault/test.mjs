/** All identities, sessions, codes, files and keys in this suite are SYNTHETIC. */
import {PGlite} from '@electric-sql/pglite';
import {generate} from 'otplib';
import {randomBytes} from 'node:crypto';
import {mkdtemp,readFile,writeFile,cp,readdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {createServer} from 'node:http';
import {VaultService,PGliteStore,VaultError,hash} from './core.mjs';
import {createHandler} from './http.mjs';
import {candidateRuntime,postgresConfig} from './postgres.mjs';
import {principalFromVerifiedSession} from './session.mjs';
import {spawnSync} from 'node:child_process';
import {PortableSession,publicAddress,sourceURL,assertPrivateCipher} from './client.mjs';
const evidence={scope:'SYNTHETIC_CANDIDATE_ONLY',started:new Date().toISOString(),productionChanged:false,userCorpusRead:false,realEnteRegistered:false,tests:[],limitations:[
 'Native Khora route prepared but not activated/deployed; live session binding, hosted Postgres/TLS, Ente enrollment and desktop delivery NOT VERIFIED',
 'PGlite executes real embedded PostgreSQL, but does not validate hosted multi-process pg Pool concurrency',
 'HTTP transport loopback is synthetic fixture only; not proof of Google/Takeout authenticated download',
 'Text analysis accepts UTF-8 only, bounded at 64 MiB; no archive/PDF/universal importer claim',
 'Custody server administrator can recover identities; not zero-knowledge',
 'A hostile host can retain keys/plaintext after legitimate release; online checks cannot revoke captured keys',
 'Database restore needs separately protected custody key and original authenticator; no lost-factor recovery policy or offline bypass is implemented',
 'JavaScript cannot guarantee erasure of immutable strings, memory, paging, browser caches, or system crash dumps',
 'Windows filesystem permissions, code signing, large Takeout archives and production backup custody NOT VERIFIED'
]};
function check(name,condition){evidence.tests.push({name,passed:!!condition});if(!condition)throw Error('CHECK_FAILED:'+name);}
async function rejects(name,fn,code){try{await fn();check(name,false);}catch(e){if(e.message.startsWith('CHECK_FAILED:'))throw e;check(name,!code||e.message===code);}}
const dir=await mkdtemp(join(tmpdir(),'khora-vault-synthetic-'));let db,server,sourceServer;
let clock=Date.now();const key=randomBytes(32),p={subject:'synthetic-owner',binding:'synthetic-session-0000000001'},other={subject:'synthetic-other',binding:'synthetic-session-0000000002'};
let service,store,secret,id;const next=()=>{clock+=61000;};
async function code(delta=0){return generate({secret,epoch:Math.floor(clock/1000)+delta,period:30,digits:6,algorithm:'sha1'});}
function request(body,{origin='https://khora.invalid',method='POST',contentType='application/json',raw}={}){return new Request('https://khora.invalid/api/portable-vault',{method,headers:{origin,'Content-Type':contentType},...(method==='GET'?{}:{body:raw??JSON.stringify(body)})});}
let handler;
const call=async body=>{const r=await handler(request(body));return {status:r.status,data:await r.json(),headers:r.headers};};
try{
 const goodSession={user:{email:'Synthetic@Example.invalid'},expires:new Date(clock+60000).toISOString()};
 check('session_adapter_requires_verified_session_and_cookie',principalFromVerifiedSession(null,'authjs.session-token=synthetic',clock)===null&&principalFromVerifiedSession(goodSession,'',clock)===null);
 check('expired_session_not_a_primary_factor',principalFromVerifiedSession({...goodSession,expires:new Date(clock-1).toISOString()},'authjs.session-token=synthetic',clock)===null);
 const sp=principalFromVerifiedSession(goodSession,'authjs.session-token=synthetic; other=ignored',clock);
 check('verified_session_normalized_and_bound',sp.subject==='synthetic@example.invalid'&&sp.binding.length===64);
 check('different_verified_session_has_different_binding',sp.binding!==principalFromVerifiedSession(goodSession,'authjs.session-token=different',clock).binding);
 const migration=spawnSync(process.execPath,[fileURLToPath(new URL('./migrate.mjs',import.meta.url))],{encoding:'utf8',env:{PATH:process.env.PATH}});
 check('migration_not_implicit_or_enabled_by_default',migration.status===1&&migration.stderr.trim()==='SAFE_STOP: migration_not_authorized');
 await rejects('runtime_requires_trusted_session_adapter',()=>candidateRuntime({env:{}}),'trusted_session_adapter_required');
 check('postgres_adapter_requires_verified_tls',postgresConfig('postgresql://synthetic:synthetic@db.invalid/synthetic?sslmode=no-verify').ssl.rejectUnauthorized===true);
 await rejects('placeholder_database_rejected',()=>postgresConfig('postgresql://synthetic:synthetic@base/db'),'database_not_configured');
 db=new PGlite(join(dir,'db'));store=new PGliteStore(db);await store.initialize();service=new VaultService(store,key,{clock:()=>clock});
 await rejects('missing_custody_key_fails_closed',()=>new VaultService(store,Buffer.alloc(0)),'custody_key_missing');
 const disabled=createHandler({service,authenticate:async()=>p,origin:'https://khora.invalid'});
 check('handler_disabled_by_default',(await disabled(request({action:'enroll'}))).status===503);
 await rejects('plaintext_production_origin_rejected',()=>createHandler({service,authenticate:async()=>p,origin:'http://khora.invalid'}),'https_origin_required');
 handler=createHandler({service,authenticate:async()=>p,origin:'https://khora.invalid',enabled:true});
 check('cross_origin_rejected',(await handler(request({action:'enroll'},{origin:'https://evil.invalid'}))).status===403);
 check('get_rejected',(await handler(request({}, {method:'GET'}))).status===405);
 check('wrong_content_type_rejected',(await handler(request({},{contentType:'text/plain'}))).status===415);
 check('oversize_body_rejected_without_trusting_content_length',(await handler(request({},{raw:'x'.repeat(5000)}))).status===413);
 check('invalid_json_rejected',(await handler(request({},{raw:'{'}))).status===400);
 const unauth=createHandler({service,authenticate:async()=>null,origin:'https://khora.invalid',enabled:true});
 check('no_primary_session_cannot_enroll',(await unauth(request({action:'enroll'}))).status===401);
 const enrolled=await call({action:'enroll'});id=enrolled.data.id;
 secret=new URL(enrolled.data.uri).searchParams.get('secret');
 check('enrollment_uses_standard_authenticator_uri',enrolled.status===201&&enrolled.data.uri.startsWith('otpauth://totp/')&&secret.length>=32);
 check('responses_are_non_cacheable',enrolled.headers.get('cache-control').includes('no-store'));
 check('no_cross_origin_credentials_header',!enrolled.headers.has('access-control-allow-origin'));
 check('duplicate_enrollment_does_not_replace_secret',(await call({action:'enroll'})).status===409);
 await rejects('pending_vault_cannot_authorize',()=>service.authorize(p,id,'000000'),'denied');
 await rejects('wrong_owner_cannot_confirm',()=>service.confirm(other,id,'000000'),'denied');
 await rejects('invalid_code_does_not_confirm',()=>service.confirm(p,id,'not-a-code'),'denied');
 check('valid_enrollment_confirmed',(await call({action:'confirm',id,code:await code()})).status===200);
 await rejects('reconfirm_not_reset',()=>service.confirm(p,id,'000000'),'denied').catch(e=>{throw e;});

// Setup and full workflow share one guarded lifecycle.
 await rejects('enrollment_code_not_reused_for_opening',async()=>service.authorize(p,id,await code()),'denied');next();
 await rejects('expired_code_denied',async()=>service.authorize(p,id,await code(-90)),'denied');
 const grant=await service.authorize(p,id,await code());
 await rejects('wrong_session_cannot_release',()=>service.release({...p,binding:'other-session-binding'},id,grant.grant),'denied');
 await rejects('wrong_account_cannot_release',()=>service.release(other,id,grant.grant),'denied');
 const raced=await Promise.allSettled([service.release(p,id,grant.grant),service.release(p,id,grant.grant)]);
 check('single_use_release_survives_race',raced.filter(x=>x.status==='fulfilled').length===1);
 const released=raced.find(x=>x.status==='fulfilled').value;
 check('released_identity_has_age_format',released.identity.startsWith('AGE-SECRET-KEY-'));
 await rejects('consumed_grant_rejected',()=>service.release(p,id,grant.grant),'denied');
 next();const httpGrant=await call({action:'authorize',id,code:await code()});
 check('http_authorization_does_not_expose_identity',httpGrant.status===200&&!!httpGrant.data.grant&&!httpGrant.data.identity);
 const httpRelease=await call({action:'release',id,grant:httpGrant.data.grant,subject:other.subject});
 check('http_release_uses_trusted_session_not_body_identity',httpRelease.status===200&&httpRelease.data.id===id);
 check('http_release_cannot_be_replayed',(await call({action:'release',id,grant:httpGrant.data.grant})).status===403);
 next();const authRaces=await Promise.allSettled([service.authorize(p,id,await code()),service.authorize(p,id,await code())]);
 check('same_code_cannot_authorize_twice_in_race',authRaces.filter(x=>x.status==='fulfilled').length===1);
 const secondGrant=authRaces.find(x=>x.status==='fulfilled').value;
 clock+=46000;await rejects('expired_grant_rejected',()=>service.release(p,id,secondGrant.grant),'denied');
 next();for(let i=0;i<5;i++)await rejects('invalid_attempt_persisted_'+i,()=>service.authorize(p,id,'invalid'),'denied');
 await rejects('correct_code_denied_after_attempt_budget',async()=>service.authorize(p,id,await code()),'denied');
 const stored=(await db.query('SELECT * FROM pv_vaults WHERE id=$1',[id])).rows[0];
 check('attempt_budget_is_in_database',Number(stored.attempts)===5);
 check('database_never_stores_clear_identity_or_seed',!stored.identity_box.includes(released.identity)&&!stored.otp_box.includes(secret));
 const grantedRows=(await db.query('SELECT * FROM pv_grants')).rows;
 check('database_stores_only_grant_digests',grantedRows.every(x=>/^[0-9a-f]{64}$/.test(x.digest)&&x.digest!==grant.grant));
 const badService=new VaultService(store,randomBytes(32),{clock:()=>clock});
 await rejects('wrong_custody_key_cannot_unwrap',()=>badService.unbox(stored.identity_box,p.subject+':'+id+':identity'),'custody_unavailable');
 await rejects('envelope_bound_to_owner_and_purpose',()=>service.unbox(stored.identity_box,other.subject+':'+id+':identity'),'custody_unavailable');
 const tamper=JSON.parse(stored.identity_box);tamper.c=Buffer.from('tampered').toString('base64');
 await rejects('tampered_custody_envelope_rejected',()=>service.unbox(JSON.stringify(tamper),p.subject+':'+id+':identity'),'custody_unavailable');
 const session=new PortableSession(released);const source='SYNTHETIC ONLY\n2026-10-18 Synthetic event for provenance.\nAnother line.\n';
 const cipher=join(dir,'original.age'), report=join(dir,'analysis.age');
 // Real local network download fixture, NEVER a production transport fallback.
 sourceServer=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end(source);});
 await new Promise(r=>sourceServer.listen(0,'127.0.0.1',r));
 const fixture=await fetch('http://127.0.0.1:'+sourceServer.address().port);
 const provenance=await session.ingestStream(fixture.body,cipher,{origin:'synthetic-loopback-fixture'});
 check('download_stream_hash_matches_source',provenance.sha256===hash(source)&&provenance.bytes===Buffer.byteLength(source));
 const cipherBytes=await readFile(cipher);
 check('disk_holds_age_ciphertext_not_source',cipherBytes.subarray(0,22).toString().startsWith('age-encryption.org/v1')&&!cipherBytes.includes(Buffer.from(source)));
 check('cipher_file_is_private_for_current_platform',await assertPrivateCipher(cipher));
 const permissionProbe=join(dir,'synthetic-permissions-probe.age');await writeFile(permissionProbe,'SYNTHETIC ACL PROBE',{mode:0o644});
 if(process.platform==='win32'){
  const ps=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; $a=Get-Acl -LiteralPath $env:KHORA_PERMISSION_PROBE; $sid=New-Object Security.Principal.SecurityIdentifier('S-1-5-32-545'); $r=New-Object Security.AccessControl.FileSystemAccessRule($sid,[Security.AccessControl.FileSystemRights]::Read,[Security.AccessControl.AccessControlType]::Allow); $a.AddAccessRule($r); Set-Acl -LiteralPath $env:KHORA_PERMISSION_PROBE -AclObject $a"],{env:{...process.env,KHORA_PERMISSION_PROBE:permissionProbe},encoding:'utf8'});
  if(ps.status!==0)throw Error('synthetic_acl_fixture_failed');
 }
 await rejects('untrusted_cipher_permissions_rejected',()=>assertPrivateCipher(permissionProbe),'cipher_permissions_unverified');
 const summary=await session.analyzeText(cipher,report,{provenance});
 check('analysis_runs_locally_and_is_bounded',summary.candidates===1&&summary.lines===3);
 const analysis=await session.readReport(report);
 check('analysis_preserves_provenance_without_ratifying',analysis.source.sha256===provenance.sha256&&!analysis.ratified&&!analysis.externalAIUsed&&analysis.candidates[0].status==='proposed');
 const c=analysis.candidates[0];check('candidate_has_literal_character_anchors',source.slice(c.characterStart,c.characterEnd)===c.text);
 check('analysis_is_also_encrypted_on_disk',!(await readFile(report)).includes(Buffer.from('Synthetic event')));
 await rejects('existing_ciphertext_not_overwritten',()=>session.ingestStream(new Blob(['replacement']).stream(),cipher));
 check('ciphertext_unchanged_after_rejected_overwrite',(await readFile(cipher)).equals(cipherBytes));
 const corrupt=Buffer.from(cipherBytes);corrupt[corrupt.length-1]^=1;await writeFile(join(dir,'corrupt.age'),corrupt,{mode:0o600});
 await rejects('tampered_input_never_promotes_report',()=>session.analyzeText(join(dir,'corrupt.age'),join(dir,'must-not-exist.age'),{provenance}));
 check('no_report_after_failed_authentication',!(await readdir(dir)).includes('must-not-exist.age'));
 await rejects('incorrect_provenance_never_promotes_report',()=>session.analyzeText(cipher,join(dir,'wrong-hash.age'),{provenance:{...provenance,sha256:'0'.repeat(64)}}),'source_integrity_mismatch');
 await rejects('oversize_stream_aborts_without_promoting',()=>session.ingestStream(new Blob(['1234567890']).stream(),join(dir,'too-big.age'),{maxBytes:5}),'source_too_large');
 check('no_oversize_cipher_promoted',!(await readdir(dir)).includes('too-big.age'));
 check('failed_operations_clean_partial_ciphertexts',!(await readdir(dir)).some(x=>x.includes('.partial-')));
 for(const input of ['http://example.com/file','https://user:password@example.com/file','https://example.com:444/file','https://example.com/file#secret'])await rejects('unsafe_source_url_rejected_'+hash(input).slice(0,6),()=>sourceURL(input),'source_not_supported');
 check('private_network_addresses_rejected',['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','::1','::ffff:127.0.0.1'].every(x=>!publicAddress(x)));
 const bigPath=join(dir,'bounded-large.age');
 const bigSize=4*1024*1024;const bigStream=new ReadableStream({start(controller){const b=new TextEncoder().encode('synthetic data only\n'.repeat(1024));let n=0;while(n<bigSize){const chunk=b.subarray(0,Math.min(b.length,bigSize-n));controller.enqueue(chunk);n+=chunk.length;}controller.close();}});
 const big=await session.ingestStream(bigStream,bigPath);check('four_mebibyte_stream_encrypted_with_bound',big.bytes===bigSize);
 check('bounded_analysis_accepts_stream_not_plaintext_file',(await session.analyzeText(bigPath,join(dir,'big-analysis.age'),{provenance:big})).bytes===bigSize);
 session.close();await rejects('closed_client_has_no_opening_fallback',()=>session.readReport(report),'vault_closed');
 next();const beforeRestart=await service.authorize(p,id,await code());
 await db.close();db=undefined;await cp(join(dir,'db'),join(dir,'backup'),{recursive:true});
 db=new PGlite(join(dir,'backup'));store=new PGliteStore(db);service=new VaultService(store,key,{clock:()=>clock});await store.initialize();
 const restored=await service.release(p,id,beforeRestart.grant);const restoredSession=new PortableSession(restored);
 check('encrypted_database_restoration_and_file_reopening',((await restoredSession.readReport(report)).source.sha256===provenance.sha256));
 await rejects('consumed_grants_remain_consumed_after_restore',()=>service.release(p,id,beforeRestart.grant),'denied');
 await rejects('used_code_stays_used_after_restore',async()=>service.authorize(p,id,await code()),'denied');
 restoredSession.close();next();const pending=await service.authorize(p,id,await code());next();
 check('revocation_persisted',(await service.revoke(p,id,await code())).revoked===true);
 await rejects('revoked_vault_cannot_release_pending_grant',()=>service.release(p,id,pending.grant),'denied');
 next();await rejects('revoked_vault_cannot_reopen',async()=>service.authorize(p,id,await code()),'denied');
 // Pending registration expires, without creating a reset/offline shortcut.
 const late=await service.enroll(other);clock+=601000;const lateSecret=new URL(late.uri).searchParams.get('secret');
 await rejects('expired_enrollment_rejected',async()=>service.confirm(other,late.id,await generate({secret:lateSecret,epoch:Math.floor(clock/1000)})),'denied');
 evidence.result='PASSED_SYNTHETIC_CANDIDATE';
}catch(e){evidence.failure=e.message;}
finally{
 if(sourceServer)await new Promise(r=>sourceServer.close(r));if(server)await new Promise(r=>server.close(r));if(db)await db.close();
 key.fill(0);await rm(dir,{recursive:true,force:true});
 evidence.finished=new Date().toISOString();evidence.passed=evidence.tests.filter(x=>x.passed).length;evidence.total=evidence.tests.length;
 evidence.result??='SAFE_STOP';await writeFile(new URL('./evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({result:evidence.result,passed:evidence.passed,total:evidence.total,failure:evidence.failure}));
}
process.exitCode=evidence.result==='PASSED_SYNTHETIC_CANDIDATE'?0:1;
