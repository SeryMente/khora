/** Isolated real PostgreSQL (PGlite/WASM), not Neon/TCP or multi-connection certification.
 * Supply PGLITE_MODULE as an installed package entry outside this repo.
 * node --import tsx --import ./tests/unit/setup.ts tests/integration/custodia-postgres.ts
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { setDbForTesting, resetDbForTesting } from '../../lib/server/neon';
import { encolarTrabajosCaptura, procesarTrabajoCustodia } from '../../lib/server/custodia-trabajos';
import { descifrarTexto } from '../../lib/server/cripto';
import { POST, GET } from '../../app/api/dictado/checkpoint/route';
async function main(){
const modulePath=process.env.PGLITE_MODULE;if(!modulePath)throw Error('PGLITE_MODULE required: isolated test only');
const {PGlite}=await import(pathToFileURL(modulePath).href);const pg=new PGlite();let checks=0;
const query=async(sql:string,params?:any[])=>{if(!params?.length&&sql.includes(';')){const results=await pg.exec(sql);const r=results.at(-1)||{rows:[]};return {...r,rowCount:r.affectedRows??r.rows.length};}const r=await pg.query(sql,params);return {...r,rowCount:r.affectedRows??r.rows.length};};
setDbForTesting({query,connect:async()=>({query,release(){}})});
try{
 await pg.exec(`CREATE TABLE volcado(id UUID PRIMARY KEY,usuario TEXT,titulo TEXT,audio_url TEXT,audio_bytes INTEGER,duracion_seg INTEGER,fuente TEXT,pulido_aplicado BOOLEAN,audio_partes JSONB,session_id TEXT,estado_transcripcion TEXT);`);
 const dictado=await readFile('lib/server/dictado.ts','utf8');const schema=dictado.match(/const SESSION_TABLES_SQL = `([\s\S]*?)`;/)?.[1];assert.ok(schema);await pg.exec(schema!);
 for(let n=0;n<2;n++)for(const file of ['030_custodia_continua.sql','031_custodia_reconciliacion.sql'])await pg.exec(await readFile('db/migrations/'+file,'utf8'));checks++;
 const sessionId=randomUUID();const original={sessionId,revisionId:randomUUID(),clientAt:200,texto:'Texto íntegro\n  manual 😀',parcial:'parcial',titulo:'',fuenteEntrada:'texto',duracionSeg:0,audioPartes:[]};
 const post=(s:any)=>POST(new NextRequest('http://localhost/api/dictado/checkpoint',{method:'POST',body:JSON.stringify(s),headers:{'content-type':'application/json'}}));
 assert.equal((await post(original)).status,200);assert.equal((await post(original)).status,200);
 assert.equal((await pg.query('SELECT * FROM dictado_checkpoint')).rows.length,1);checks++;
 assert.equal((await post({...original,texto:'conflicto'})).status,500);assert.equal((await pg.query('SELECT * FROM dictado_checkpoint')).rows.length,1);checks++;
 assert.equal((await post({...original,revisionId:randomUUID(),clientAt:100,texto:'anterior'})).status,200);
 let recovery=await (await GET(new NextRequest('http://localhost/api/dictado/checkpoint'))).json();assert.equal(recovery.recovery.texto,original.texto);assert.equal((await pg.query('SELECT * FROM dictado_checkpoint')).rows.length,2);checks++;
 const other=randomUUID();await pg.query("INSERT INTO dictado_session(session_id,custodia_owner) VALUES($1,'other@example.com')",[other]);assert.equal((await post({...original,sessionId:other,revisionId:randomUUID()})).status,403);checks++;
 const data={texto:original.texto,volcado_id:randomUUID(),sessionId,usuario:'test@example.com',tituloAutomatico:false,version:1,sha256:'a'.repeat(64),caracteres:original.texto.length};
 await query('BEGIN');await encolarTrabajosCaptura({query},data);await query('ROLLBACK');assert.equal((await pg.query('SELECT * FROM dictado_custodia_trabajo')).rows.length,0);checks++;
 await encolarTrabajosCaptura({query},data);await encolarTrabajosCaptura({query},data);assert.equal((await pg.query('SELECT * FROM dictado_custodia_trabajo')).rows.length,1);checks++;
 const oldToken=process.env.NOTION_TOKEN;delete process.env.NOTION_TOKEN;
 try{assert.equal(await procesarTrabajoCustodia(data.usuario),true);assert.equal(await procesarTrabajoCustodia(data.usuario),false);const job=(await pg.query('SELECT * FROM dictado_custodia_trabajo')).rows[0];assert.equal(job.estado,'fallido');assert.equal(job.intentos,1);assert.equal(job.ultimo_error,'espejo_no_configurado');assert.equal(JSON.parse(descifrarTexto(job.payload)).texto,original.texto);checks++;}finally{if(oldToken!==undefined)process.env.NOTION_TOKEN=oldToken;}
 await pg.query("UPDATE dictado_session SET estado='complete' WHERE session_id=$1",[sessionId]);assert.equal((await post({...original,revisionId:randomUUID()})).status,409);checks++;
 // Use the exact MP3 lease/update statements from the implementation, not a reworded SQL surrogate.
 const mp3Code=await readFile('lib/server/audio-mp3.ts','utf8');
 const leaseSql=mp3Code.match(/const lease=await db.query\(`([\s\S]*?)`,\[sessionId,manifest,leaseId\]\)/)?.[1];assert.ok(leaseSql);
 await pg.query('INSERT INTO dictado_mp3(session_id) VALUES($1)',[sessionId]);const leaseId=randomUUID();
 assert.equal((await pg.query(leaseSql,[sessionId,'manifest',leaseId])).rows.length,1);
 const doneSql=mp3Code.match(/await db.query\(`(UPDATE dictado_mp3 SET estado='disponible'[\s\S]*?)`,/ )?.[1];assert.ok(doneSql);
 const values=[sessionId,'source','https://synthetic.invalid','a'.repeat(64),100,1,randomUUID(),'manifest',1,true];
 assert.equal((await pg.query(doneSql,values)).affectedRows,0);values[6]=leaseId;assert.equal((await pg.query(doneSql,values)).affectedRows,1);checks++;
 const backup=await pg.dumpDataDir('gzip');const restored=new PGlite({loadDataDir:backup});try{const row=(await restored.query('SELECT texto FROM dictado_checkpoint WHERE revision_id=$1',[original.revisionId])).rows[0];assert.equal(descifrarTexto(row.texto),original.texto+'\n\n'+original.parcial);const key=process.env.X_KHORA_KEY;process.env.X_KHORA_KEY='wrong-key-for-isolated-test-only';try{assert.throws(()=>descifrarTexto(row.texto));}finally{process.env.X_KHORA_KEY=key;}checks++;}finally{await restored.close();}
 console.log(JSON.stringify({status:'PASS',checks,engine:'PostgreSQL/PGlite WASM',realSQL:true,isolatedBackupRestore:true,productionServices:false,multiConnectionLocks:false}));
}finally{resetDbForTesting();await pg.close();}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
