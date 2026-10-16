import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import * as next from 'next/server';
import * as vault from '../../lib/server/boveda';
import * as credentials from '../../lib/server/github-credentials';
import { setDbForTesting, resetDbForTesting } from '../../lib/server/neon';
import { fetchNormativeGithub } from '../../lib/server/normative-github';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const owner='test@example.com', origin='https://khora-web.vercel.app';
const token='github_pat_'+'syntheticNotReal1234567890'.repeat(3);
function database() {
  const rows=new Map<string,any>(); let count=0; const audit:any[]=[];
  const query=async(sql:string,args:any[]=[])=>{
    if(sql.startsWith('SELECT count'))return{rows:[{n:count}]};
    if(sql.startsWith('SELECT purpose'))return{rows:[...rows.values()].filter(r=>r.usuario===args[0])};
    if(sql.startsWith('SELECT ciphertext'))return{rows:rows.has(args.join(':'))?[rows.get(args.join(':'))]:[]};
    if(sql.startsWith('INSERT INTO github_credentials')){rows.set(args[0]+':'+args[1],{usuario:args[0],purpose:args[1],ciphertext:args[2],actualizado_en:'2026-10-16T00:00:00Z'});return{rows:[]};}
    if(sql.startsWith('DELETE FROM github_credentials')){rows.delete(args.join(':'));return{rows:[]};}
    if(sql.startsWith('INSERT INTO github_credential_events')){count++;audit.push(args);return{rows:[]};}
    return{rows:[]};
  };
  return {rows,audit,query,connect:async()=>({query,release(){}})};
}
async function fixture(work:(db:ReturnType<typeof database>)=>Promise<void>) {
  const db=database(), env={...process.env}, original=globalThis.fetch;
  process.env.EP_ALLOWED_EMAIL=owner; delete process.env.VAULT_AGENT_ALLOWED_EMAIL;
  process.env.VAULT_AGENT_CANONICAL_URL=origin; delete process.env.KHORA_NORM_GITHUB_TOKEN;
  setDbForTesting(db); globalThis.fetch=async()=>Response.json({fixture:true});
  try{await work(db);}finally{resetDbForTesting();globalThis.fetch=original;process.env=env;}
}
function moduleAt(file:string,modules:Record<string,unknown>) {
  const exports:any={}; const source=fs.readFileSync(path.join(root,file),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Buffer,URL,process,require:(id:string)=>{assert.ok(Object.hasOwn(modules,id),id);return modules[id];}});
  return exports;
}
function route(email:string|null=owner) {return moduleAt('app/api/security/github-credentials/route.ts',{'next/server':next,'@/auth':{auth:async()=>({user:{email}})},'@/lib/server/boveda':vault,'@/lib/server/github-credentials':credentials});}
function request(method='GET',body?:unknown,options:{cookie?:boolean;origin?:string;raw?:string}={}) {
  const headers:Record<string,string>={'Content-Type':'application/json',Origin:options.origin||origin};
  if(options.cookie!==false)headers.cookie=vault.COOKIE_BOVEDA+'='+vault.sellarDesbloqueo();
  return new next.NextRequest(origin+'/api/security/github-credentials',{method,headers,...(method==='GET'?{}:{body:options.raw??JSON.stringify(body)})});
}
test('token format rejects classic tokens, whitespace and unbounded input',()=>{
  assert.equal(credentials.validGithubToken(token),true);
  for(const value of ['ghp_'+ 'x'.repeat(40),token+'\n','github_pat_'+'x'.repeat(241),null,{},'Bearer '+token])assert.equal(credentials.validGithubToken(value),false);
});
test('stored secret is authenticated ciphertext; GET metadata and audit never contain it',async()=>fixture(async db=>{
  await credentials.changeGithubCredential(owner,'norm',token);
  assert.equal(await credentials.readGithubCredential('norm'),token);
  const row=db.rows.get(owner+':norm');assert.ok(row.ciphertext.startsWith('khc1.'));assert.ok(!row.ciphertext.includes(token));
  assert.ok(!JSON.stringify(await credentials.githubCredentialStatus(owner)).includes(token));assert.ok(!JSON.stringify(db.audit).includes(token));
}));
test('norm and EP are isolated and ciphertext cannot be moved between purposes or users',async()=>fixture(async db=>{
  await credentials.changeGithubCredential(owner,'ep',token);
  assert.equal(await credentials.readGithubCredential('norm'),null);
  const row=db.rows.get(owner+':ep');db.rows.set(owner+':norm',row);
  await assert.rejects(credentials.readGithubCredential('norm'),/clave de cifrado/);
  db.rows.set('other@example.com:ep',row);await assert.rejects(credentials.readGithubCredential('ep','other@example.com'),/clave de cifrado/);
}));
test('plaintext and tampered ciphertext fail closed',async()=>fixture(async db=>{
  db.rows.set(owner+':norm',{ciphertext:token});await assert.rejects(credentials.readGithubCredential('norm'));
  await credentials.changeGithubCredential(owner,'norm',token);const row=db.rows.get(owner+':norm');row.ciphertext=row.ciphertext.slice(0,-8)+'AAAAAAAA';await assert.rejects(credentials.readGithubCredential('norm'));
}));
test('deletion is repeatable and removes only the selected purpose',async()=>fixture(async()=>{
  await credentials.changeGithubCredential(owner,'norm',token);await credentials.changeGithubCredential(owner,'ep',token);
  await credentials.changeGithubCredential(owner,'ep',null);await credentials.changeGithubCredential(owner,'ep',null);
  assert.equal(await credentials.readGithubCredential('ep'),null);assert.equal(await credentials.readGithubCredential('norm'),token);
}));
test('GitHub validation is bounded and destination is fixed per purpose',async()=>fixture(async()=>{
  let calls=0;globalThis.fetch=async(url,init)=>{calls++;assert.equal(String(url),'https://api.github.com/repos/SeryMente/metodologia/contents/');assert.equal(init?.redirect,'error');assert.ok(init?.signal);assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+token);return Response.json({});};
  await credentials.validateGithubCredential('norm',token);assert.equal(calls,1);
}));
for(const status of [401,403,404,429,500])test('GitHub '+status+' does not save or leak upstream body',async()=>fixture(async db=>{
  globalThis.fetch=async()=>new Response(token,{status});const result=await route().POST(request('POST',{purpose:'norm',token}));const body=await result.text();
  assert.notEqual(result.status,200);assert.ok(!body.includes(token));assert.equal(db.rows.size,0);
}));
test('GitHub network exception is sanitized and leaves previous credential intact',async()=>fixture(async()=>{
  await credentials.changeGithubCredential(owner,'norm',token);globalThis.fetch=async()=>{throw Error(token);};
  const result=await route().POST(request('POST',{purpose:'norm',token}));assert.equal(result.status,503);assert.ok(!(await result.text()).includes(token));assert.equal(await credentials.readGithubCredential('norm'),token);
}));
test('route requires owner, unlocked vault, correct origin and bounded JSON',async()=>fixture(async db=>{
  assert.equal((await route(null).GET(request())).status,401);
  assert.equal((await route('other@example.com').GET(request())).status,401);
  assert.equal((await route().POST(request('POST',{purpose:'norm',token},{cookie:false}))).status,403);
  assert.equal((await route().POST(request('POST',{purpose:'norm',token},{origin:'https://evil.invalid'}))).status,403);
  assert.equal((await route().POST(request('POST',null,{raw:'x'.repeat(2049)}))).status,413);
  assert.equal((await route().POST(request('POST',null,{raw:'{'}))).status,400);
  assert.equal((await route().POST(request('POST',{purpose:'other',token}))).status,400);
  assert.equal((await route().POST(request('POST',{purpose:'norm',token,unexpected:true}))).status,400);
  assert.equal(db.rows.size,0);
}));
test('route saves and returns only metadata; responses prohibit caching',async()=>fixture(async()=>{
  const api=route(), result=await api.POST(request('POST',{purpose:'norm',token}));assert.equal(result.status,200);assert.match(result.headers.get('cache-control')||'',/no-store/);assert.ok(!(await result.text()).includes(token));
  const metadata=await api.GET(request());assert.equal(metadata.status,200);const body=await metadata.json();assert.equal(body.credentials.find((r:any)=>r.purpose==='norm').configured,true);assert.ok(!JSON.stringify(body).includes('ciphertext'));
}));
test('database-backed change limit cannot be bypassed by new server instance',async()=>fixture(async()=>{
  for(let i=0;i<10;i++)await credentials.changeGithubCredential(owner,'norm',token);
  await assert.rejects(credentials.changeGithubCredential(owner,'norm',token),/quince minutos/);
}));
test('MCP reads saved normative credential without using EP credential',async()=>fixture(async()=>{
  await credentials.changeGithubCredential(owner,'norm',token);await credentials.changeGithubCredential(owner,'ep',token+'X');
  globalThis.fetch=async(_url,init)=>{assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+token);return Response.json({sha:'fixture'});};
  assert.equal((await fetchNormativeGithub('https://api.github.com/repos/SeryMente/metodologia/commits/main','test')).status,200);
}));
test('database failure is not reported as absent secret or upstream GitHub failure',async()=>fixture(async()=>{
  setDbForTesting({query:async()=>{throw Error(token);}});await assert.rejects(fetchNormativeGithub('https://api.github.com/repos/SeryMente/metodologia/commits/main','test'),{message:'NORM_SECRET_UNAVAILABLE'});
}));
test('EP secret export requires new explicit scopes and owner; never returns norm secret',async()=>fixture(async()=>{
  await credentials.changeGithubCredential(owner,'norm',token);let sub=owner,fail=false;
  const api=moduleAt('app/api/ep/github-credential/route.ts',{'next/server':next,'@/lib/server/github-credentials':credentials,'@/lib/server/ep':{authenticateEpBearer:async(_r:unknown,scopes:string[])=>{assert.deepEqual(Array.from(scopes),['ep:bootstrap','ep:github:read']);if(fail)throw Error();return{sub};},getEpAuthFailure:()=>({code:'insufficient_scope',status:401})}});
  let result=await api.POST(new Request(origin));assert.equal(result.status,409);assert.ok(!(await result.text()).includes(token));
  await credentials.changeGithubCredential(owner,'ep',token+'X');result=await api.POST(new Request(origin));assert.equal((await result.json()).token,token+'X');assert.match(result.headers.get('cache-control')||'',/no-store/);
  sub='other@example.com';assert.equal((await api.POST(new Request(origin))).status,403);sub=owner;fail=true;assert.equal((await api.POST(new Request(origin))).status,401);
}));
test('bootstrap bytes match committed generator and secret retrieval never uses MCP or clipboard',()=>{
  const source=fs.readFileSync(path.join(root,'../scripts/khora/khora.ps1'));
  const generated=fs.readFileSync(path.join(root,'lib/server/ep-bootstrap-content.ts'),'utf8');const encoded=generated.match(/=\s*"([A-Za-z0-9+/=]+)"/)![1];assert.deepEqual(Buffer.from(encoded,'base64'),source);
  const text=source.toString('utf8'), branch=text.slice(text.indexOf('function Get-KhoraGitHubToken'),text.indexOf('function Get-KhoraGitHubToken')+2500);
  assert.match(branch,/github-credential/);assert.match(branch,/MaximumRedirection 0/);assert.match(branch,/No se uso otra credencial/);
});
test('UI is write-only, purpose-specific and locked by vault state, with no browser persistence',()=>{
  const text=fs.readFileSync(path.join(root,'app/components/os/GithubSecretsPanel.tsx'),'utf8');
  assert.match(text,/type="password"/);assert.match(text,/autoComplete="off"/);assert.match(text,/!unlocked/);assert.match(text,/pagehide/);assert.doesNotMatch(text,/localStorage|sessionStorage|navigator.clipboard/);assert.match(text,/setToken\(''\)/);
});
