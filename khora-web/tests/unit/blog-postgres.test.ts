import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BlogRepository} from '../../lib/server/blog/repository';
import {PostgresDelivery} from '../../lib/server/blog/outbox';
import {hash,revisionHash,type Revision} from '../../lib/server/blog/domain';
import {deliver} from '../../lib/server/blog/delivery';
// Optional isolated test dependency, not needed by production. Set BLOG_TEST_PGLITE_MODULE to its file URL.
const modulePath=process.env.BLOG_TEST_PGLITE_MODULE;
test('transactional editorial migration / ownership / decisions / deliveries',{skip:!modulePath},async()=>{
 const {PGlite}=await import(modulePath!);
 const db=new PGlite();const query=async(sql:string,p?:unknown[])=>db.query(sql,p);
 const pool={query,connect:async()=>({query,release(){}})};
 const cipher={encrypt:(s:string)=>'enc:'+Buffer.from(s).toString('base64'),decrypt:(s:string)=>Buffer.from(s.slice(4),'base64').toString('utf8')};
 await db.exec('CREATE TABLE volcado(id uuid PRIMARY KEY, usuario text, recibido_en timestamptz,tipo_entrada text,ofuscada boolean);CREATE TABLE volcado_version(volcado_id uuid,version integer,texto text,sha256 text);');
 await db.exec(await readFile(new URL('../../db/migrations/20261019_blog_editorial.sql',import.meta.url),'utf8'));
 const sid='22222222-2222-4222-8222-222222222222';const text='Original sintético privado, no se publica.';
 await query("INSERT INTO volcado VALUES($1,$2,now(),'blog_personal',false)",[sid,'owner']);await query('INSERT INTO volcado_version VALUES($1,1,$2,$3)',[sid,cipher.encrypt(text),hash(text)]);
 const r:Revision={publicationId:'11111111-1111-4111-8111-111111111111',revision:1,sourceId:sid,sourceVersion:1,sourceHash:hash(text),kind:'blog_personal',obfuscated:false,entry:{schema:1,slug:'prueba-local',title:'Prueba privada',date:'2026-10-18T20:00:00-06:00',body:'Versión pública sintética.',source:{kind:'khora',sha256:hash('Versión pública sintética.')}},facebook:{format:'link',message:'Prueba aprobada'}};
 const repo=new BlogRepository(pool,cipher);
 await assert.rejects(()=>repo.save('other',r,null),/FORBIDDEN/);
 const ref={publicationId:r.publicationId,sourceId:r.sourceId,sourceVersion:r.sourceVersion,sourceHash:r.sourceHash};
 await assert.rejects(()=>repo.declineArchived('other',ref),/FORBIDDEN/);
 assert.equal((await repo.declineArchived('owner',ref))!.filter,'archived_without_permission');
 await repo.declineArchived('owner',ref);assert.equal((await query('SELECT * FROM blog_publication_refusal')).rows.length,1);
 assert.equal((await query('SELECT * FROM blog_editorial')).rows.length,0);assert.equal((await query('SELECT * FROM blog_delivery')).rows.length,0);
 await assert.rejects(()=>repo.declineArchived('owner',{...ref,sourceHash:hash('wrong')}),/FORBIDDEN/);
 await repo.save('owner',r,null);await repo.save('owner',r,null); // lost response, same stable identity
 assert.equal((await query('SELECT * FROM blog_editorial')).rows.length,1);
 await repo.decline('owner',r.publicationId,revisionHash(r));
 assert.equal((await repo.status('owner',r.publicationId)).filter,'archived_without_permission');
 assert.equal((await query('SELECT * FROM blog_delivery')).rows.length,0);
 await assert.rejects(()=>repo.status('other',r.publicationId),/FORBIDDEN/);
 await assert.rejects(()=>repo.approveExact('owner',r.publicationId,'wrong',false),/CONFLICT/);
 await repo.approveExact('owner',r.publicationId,revisionHash(r),false);await repo.approveExact('owner',r.publicationId,revisionHash(r),false);
 assert.equal((await query('SELECT * FROM blog_delivery')).rows.length,2);assert.equal(await repo.refusal('owner',r.publicationId),null);
 const exported=(await query('SELECT * FROM blog_public_export WHERE owner=$1',['owner'])).rows;
 assert.equal(exported.length,1);assert(!JSON.stringify(exported).includes(sid));assert(!JSON.stringify(exported).includes(text));
 let bs=0,fs=0;const b={publish:async()=>{bs++;return {id:'commit'};},verify:async()=>({id:'slug',url:'https://serymente.github.io/otrogranprograma/blog/entradas/prueba-local/',proofHash:hash('blog')})};
 const f={publish:async()=>{fs++;return '61595788700651_123';},verify:async()=>({id:'61595788700651_123',url:'https://www.facebook.com/61595788700651_123',proofHash:hash('fb')})};
 const out=new PostgresDelivery(repo,'owner');
 assert.equal(await deliver(out,b,f,r.publicationId,1,'facebook'),'not_claimed');
 assert.equal(await deliver(out,b,f,r.publicationId,1,'blog'),'confirmed');
 assert.equal((await repo.status('owner',r.publicationId)).filter,'publication_pending');
 assert.equal(await deliver(out,b,f,r.publicationId,1,'facebook'),'confirmed');
 assert.equal((await repo.status('owner',r.publicationId)).filter,'published_both');
 assert.equal(fs,1);assert.equal(bs,0);await assert.rejects(()=>repo.declineArchived('owner',ref),/WITHDRAWAL/);
 assert.equal(await deliver(out,b,f,r.publicationId,1,'facebook'),'not_claimed');assert.equal(fs,1);
 const r2={...r,revision:2,entry:{...r.entry,title:'Revisión 2'}};
 await repo.save('owner',r2,1);
 assert.equal((await query('SELECT approval_cipher FROM blog_editorial')).rows[0].approval_cipher,null);
 const tomb=(await query('SELECT * FROM blog_public_export')).rows[0];assert.equal(tomb.withdrawn,true);assert.equal(tomb.snapshot,null);
 assert.equal((await repo.status('owner',r.publicationId)).filter,'awaiting_decision');
 await repo.declineArchived('owner',ref);assert.equal((await repo.refusal('owner',r.publicationId))!.consent,'declined');
 assert.equal((await query("SELECT * FROM blog_delivery WHERE revision=1 AND state='confirmed'")).rows.length,2); // No to new draft does not pretend to erase old publications
 assert.equal((await query('SELECT * FROM blog_refusal_events')).rows.length,1); // idempotent same source receipt

 await db.close();
});
