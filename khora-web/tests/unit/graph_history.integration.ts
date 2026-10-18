// Synthetic corpus, real PostgreSQL-compatible PGlite, real ciphertext and store.
// Single-connection adapter does NOT establish distributed locking correctness.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import Module from "node:module";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {digest,PIPELINE,validateExtraction,type Proposal} from "../../lib/graph-twins";
import {cifrarTexto,descifrarTexto} from "../../lib/server/cripto";
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.KHORA_PGLITE_MODULE||"@electric-sql/pglite");
const ts=require("typescript");
async function main(){
 process.env.X_KHORA_KEY="synthetic-only-graph-test-key-not-a-credential";
 const db=new PGlite();
 const query=async(sql:string,args?:unknown[])=>{
  if(sql.includes("pg_advisory_xact_lock"))return {rows:[]};
  return db.query(sql,args);
 };
 const adapter={connect:async()=>({query,release(){}})};
 const filename=path.resolve("lib/server/graph-twins-store.ts");
 const compiled=ts.transpileModule(readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod:any=new (Module as any)(filename,undefined);mod.filename=filename;mod.paths=(Module as any)._nodeModulePaths(path.dirname(filename));
 const originalRequire=mod.require.bind(mod);
 mod.require=(name:string)=>name==="./neon"?{getDb:()=>adapter}:name==="./graph-diagnostic"?{graphModel:()=>"synthetic-test"}:originalRequire(name);
 mod._compile(compiled,filename);const {nextChunk,readPair,judge}=mod.exports;
 await db.exec(`CREATE TABLE volcado(id uuid PRIMARY KEY,usuario text,version_aprobada int,sha256_aprobado text,recibido_en timestamptz,sha256 text,io_id text);CREATE TABLE volcado_version(volcado_id uuid,version int,texto text,sha256 text);`);
 await db.exec(readFileSync("db/migrations/032_graph_twins.sql","utf8"));
 const oldRevision=randomUUID(),oldCipher=cifrarTexto(JSON.stringify({legacy:true}));
 await query("INSERT INTO grafo_par_snapshot(owner,revision,payload_cifrado) VALUES($1,$2,$3)",["u",oldRevision,oldCipher]);
 await assert.rejects(nextChunk("u"),/graph_history_migration_required/);
 const migration=readFileSync("db/migrations/033_graph_snapshot_history.sql","utf8");await db.exec(migration);await db.exec(migration);
 assert.equal((await query("SELECT payload_cifrado FROM grafo_par_historia WHERE owner='u'")).rows[0].payload_cifrado,oldCipher);
 const text="Ana vive en México.",source={volcado_id:randomUUID(),version:1,sha256:digest(text),captured_at:"2026-10-18T00:00:00Z"};
 await query("INSERT INTO volcado VALUES($1,'u',1,$2,$3,$2,'io-test')",[source.volcado_id,source.sha256,source.captured_at]);
 await query("INSERT INTO volcado_version VALUES($1,1,$2,$3)",[source.volcado_id,cifrarTexto(text),source.sha256]);
 const p:Proposal={id:randomUUID(),source,pipeline:PIPELINE,chunks:[validateExtraction({relations:[{subject:"Ana",predicate:"vive en",object:"México",quote:text,attribution:"operador",modality:"afirmación",event_time:"no explícito"}]},text,source)],next:text.length,length:text.length,model:"synthetic-test"};
 // Mark only synthetic candidate pairs examined; no identities or human judgments are generated.
 const {identityCandidates}=require("../../lib/graph-twins.ts");p.identity_examined=identityCandidates([p]).map((i:any)=>i.id);
 await query("INSERT INTO grafo_par_propuesta(id,owner,volcado_id,version,sha256,pipeline,payload_cifrado) VALUES($1,'u',$2,1,$3,$4,$5)",[p.id,source.volcado_id,source.sha256,PIPELINE,cifrarTexto(JSON.stringify(p))]);
 const first=await nextChunk("u");assert.equal(first.automatic.edges.length,1);assert.equal(first.curated.edges.length,0);assert.ok(first.manifest.criterion.sha256);assert.ok(first.knowledge_revision);
 assert.equal((await readPair("u")).revision,first.revision);
 const id=randomUUID(),item=p.chunks[0].relations[0].id;
 const accepted=await judge("u",p.id,item,"accept",id);assert.equal(accepted.curated.edges.length,1);assert.notEqual(accepted.knowledge_revision,first.knowledge_revision);
 const repeated=await judge("u",p.id,item,"accept",id);assert.equal(repeated.knowledge_revision,accepted.knowledge_revision);
 await assert.rejects(judge("u",p.id,item,"reject",id),/judgment_request_conflict/);
 await assert.rejects(judge("other",p.id,item,"accept",randomUUID()),/active_proposal_item_not_found/);
 assert.equal((await readPair("other")).empty,true);
 const rows=(await query("SELECT revision,payload_cifrado FROM grafo_par_historia WHERE owner='u'")).rows;
 assert.equal(rows.length,4);assert.ok(rows.some((r:any)=>r.revision===first.revision&&JSON.parse(descifrarTexto(r.payload_cifrado)).knowledge_revision===first.knowledge_revision));
 await assert.rejects(query("UPDATE grafo_par_historia SET payload_cifrado='tampered' WHERE owner='u'"),/append-only/);
 await assert.rejects(query("DELETE FROM grafo_par_historia WHERE owner='u'"),/append-only/);
 await assert.rejects(query("UPDATE grafo_par_snapshot SET payload_cifrado='tampered' WHERE owner='u'"),/graph_history_revision_conflict/);
 // A ledger mutation outside the store invalidates the cached causal revision.
 await query("INSERT INTO grafo_par_juicio(id,owner,proposal_id,item_id,decision,actor,origin,item_fingerprint) SELECT $1,owner,proposal_id,item_id,'reject',actor,origin,item_fingerprint FROM grafo_par_juicio WHERE id=$2",[randomUUID(),id]);
 assert.equal((await readPair("u")).stale,true);
 const rejected=await nextChunk("u");assert.equal(rejected.curated.edges.length,0);assert.equal(rejected.automatic.edges.length,1);
 // Simulate regeneration while preserving the exact source/body and immutable signed human act.
 await query("UPDATE grafo_par_propuesta SET pipeline='historic-v0' WHERE id=$1",[p.id]);
 const fresh={...p,id:randomUUID()};await query("INSERT INTO grafo_par_propuesta(id,owner,volcado_id,version,sha256,pipeline,payload_cifrado) VALUES($1,'u',$2,1,$3,$4,$5)",[fresh.id,source.volcado_id,source.sha256,PIPELINE,cifrarTexto(JSON.stringify(fresh))]);
 const regenerated=await nextChunk("u");assert.equal(regenerated.curated.edges.length,0);
 const signed=(await query("SELECT item_fingerprint FROM grafo_par_juicio WHERE id=$1",[id])).rows[0].item_fingerprint;assert.match(signed,/^[a-f0-9]{64}$/);
 await db.close();console.log(JSON.stringify({result:"PASS",checks:["migration-guard","idempotent-migration","legacy-ciphertext-preserved","paired-projection","manifest-readback","human-signature","request-idempotence","request-conflict","owner-isolation","append-only-history","revision-conflict","ledger-staleness","reject-survives-regeneration"],limitations:["synthetic-corpus","single-connection-lock-adapter","no-production-credentials","no-semantic-accreditation"]},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
