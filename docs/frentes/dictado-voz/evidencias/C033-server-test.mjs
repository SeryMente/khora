import {createRequire} from 'node:module';const require=createRequire(import.meta.url),{build}=require('esbuild');
import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const root=process.env.KHORA_C033_ROOT||process.cwd(),checks=[];
await build({entryPoints:[root+'/lib/server/custodia-recuperacion.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'/data/c033-server-bundle.mjs',plugins:[{name:'explicit-test-adapters',setup(b){b.onResolve({filter:/^(next\/server|\.\/neon|\.\/cripto)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:a.path==='next/server'?`export const NextResponse={json:(data,init)=>Response.json(data,init)};export class NextRequest{}`:a.path==='./neon'?`export const getDb=()=>globalThis.testDb;`:`export const cifrarTexto=x=>x,descifrarTexto=x=>x;` }));}}]});
const {recuperarCheckpoint}=await import(pathToFileURL('/data/c033-server-bundle.mjs'));
const owner='synthetic-owner@example.invalid',sid='11111111-1111-4111-8111-111111111111',rid='22222222-2222-4222-8222-222222222222',target='33333333-3333-4333-8333-333333333333';
const source={sessionId:sid,revisionId:rid,clientAt:1,texto:'original',parcial:'',titulo:'original',fuenteEntrada:'microfono',duracionSeg:5,audioPartesEsperadas:2,audioPartes:[]};
let state={},queries=[];const parts=[1,2].map(parte=>({parte,bytes:40,sha256:'a'.repeat(64),verificado:true,fuenteAudio:'microphone',url:'https://example.invalid/private'}));
const saved={...source,sessionId:target,audioPartes:parts,recuperadaDe:{sessionId:sid,revisionId:rid}};
globalThis.testDb={connect:async()=>({release(){},async query(sql,args=[]){queries.push(sql);
 if(sql.includes('SELECT session_id,estado,volcado_id'))return {rows:state.foreignSource?[]:[{session_id:sid,estado:'checkpoint'}]};
 if(sql.includes('SELECT snapshot FROM dictado_checkpoint WHERE revision_id='))return {rows:[{snapshot:JSON.stringify({...source,audioPartesEsperadas:state.missing?3:2})}]};
 if(sql.includes('part_index AS parte'))return {rows:parts};
 if(sql.includes('SELECT custodia_owner,estado'))return {rows:state.newChild?[]:[{custodia_owner:state.foreignChild?'other':owner,estado:'complete'}]};
 if(sql.includes('SELECT snapshot FROM dictado_checkpoint WHERE session_id='))return {rows:[{snapshot:JSON.stringify(saved)}]};
 return {rows:[]};}})};
function req(extra={},origin='http://localhost:37991'){return {headers:new Headers({origin}),nextUrl:new URL('http://localhost:37991/api/dictado/checkpoint?recover=1'),json:async()=>({sourceSessionId:sid,revisionId:rid,sessionId:target,...extra})};}
async function test(name,config,request,status){state=config;queries=[];const r=await recuperarCheckpoint(request,owner);assert.equal(r.status,status,name);checks.push(name);return r;}
await test('persisted expected tail prevents incomplete fork',{missing:true},req({archiveSelected:true}),409);
await test('normal recovery of sealed child still blocked',{},req(),409);
let r=await test('explicit archive retry may reuse exact owned sealed child',{},req({archiveSelected:true}),200);assert.deepEqual((await r.json()).recovery,saved);
await test('archive retry cannot access foreign child',{foreignChild:true},req({archiveSelected:true}),409);
await test('source owner isolation remains active',{foreignSource:true},req({archiveSelected:true}),404);
await test('origin guard blocks foreign browser',{},req({archiveSelected:true},'https://example.invalid'),403);assert.equal(queries.length,0);
await test('false flag cannot widen explicit retry operation',{},req({archiveSelected:false}),400);
await test('source session cannot be reused as child',{},req({sessionId:sid,archiveSelected:true}),400);
r=await test('new exact fork clones references and preserves parent', {newChild:true},req({archiveSelected:true}),200);const child=(await r.json()).recovery;assert.equal(child.sessionId,target);assert.equal(child.audioPartes.length,2);assert(!queries.some(q=>q.includes('DELETE ')||q.includes("estado='complete'")));
fs.writeFileSync('/data/c033-server-result.json',JSON.stringify({checks,limits:['actual recovery handler/validators and audio integrity predicate','DB/auth/encryption/Next response are isolated fixtures; not production or PostgreSQL integration']},null,2));console.log('Recovery handler checks:',checks.length);
