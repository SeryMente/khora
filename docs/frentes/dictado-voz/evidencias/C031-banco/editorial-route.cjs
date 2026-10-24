const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'../../integrated/khora-web');
const esbuild=require('/data/khora-ingreso-c031/test-tools/node_modules/esbuild');
(async()=>{
 const {PGlite}=await import('file:///data/khora-dialogo-fix/tools/node_modules/@electric-sql/pglite/dist/index.js');const db=new PGlite();
 const query=(s,p)=>db.query(s,p);global.__blogPool={query,connect:async()=>({query,release(){}})};global.__actor='owner';global.__norm=false;
 const plugins=[{name:'boundaries',setup(b){b.onResolve({filter:/^(next\/server|@\/auth)$/},a=>({path:a.path,namespace:'fixture'}));b.onResolve({filter:/(?:neon|cripto|mcp-config|mcp-normative)$/},a=>({path:a.path.split('/').pop(),namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:({
 'next/server':'export const NextResponse={json:(body,options)=>Response.json(body,options)};',
 '@/auth':'export async function auth(){return globalThis.__actor?{user:{email:globalThis.__actor}}:null}',
 neon:'export const getDb=()=>globalThis.__blogPool;',
 cripto:"export const cifrarTexto=s=>'enc:'+Buffer.from(s).toString('base64');export const descifrarTexto=s=>Buffer.from(s.slice(4),'base64').toString('utf8');",
 'mcp-config':"export const getMcpConfig=()=>({allowedEmail:'owner',issuer:'https://test.invalid'});",
 'mcp-normative':"export async function openNormativeTurn(){if(!globalThis.__norm)throw Error('upstream unavailable');return {turn:{turn_token:'isolated-test-token'}};}export async function assertNormativeTurnOpen(actor,token){if(!globalThis.__norm||token!=='isolated-test-token')throw Error('gate');}"
 })[a.path],loader:'js'}));b.onResolve({filter:/^@\//},a=>({path:path.join(root,a.path.slice(2)+'.ts')}));}}];
 const out=path.join(__dirname,'../evidence/editorial-route-bundle.cjs');await esbuild.build({entryPoints:[root+'/app/api/blog/editorial/route.ts'],bundle:true,platform:'node',format:'cjs',outfile:out,plugins});const {POST}=require(out);
 await db.exec('CREATE TABLE volcado(id uuid PRIMARY KEY,usuario text,recibido_en timestamptz);CREATE TABLE volcado_version(volcado_id uuid,version integer,texto text,sha256 text);');
 for(let i=0;i<2;i++)for(const file of ['034_ingreso_clasificacion.sql','20261019_blog_editorial.sql'])await db.exec(fs.readFileSync(root+'/db/migrations/'+file,'utf8'));
 const hash=s=>require('crypto').createHash('sha256').update(s).digest('hex');const sid='22222222-2222-4222-8222-222222222222',id='11111111-1111-4111-8111-111111111111',text='Fuente privada sintética. No contiene datos del operador.';
 await query("INSERT INTO volcado VALUES($1,'owner',now(),'blog_personal',true)",[sid]);await query('INSERT INTO volcado_version VALUES($1,1,$2,$3)',[sid,'enc:'+Buffer.from(text).toString('base64'),hash(text)]);
 const r={publicationId:id,revision:1,sourceId:sid,sourceVersion:1,sourceHash:hash(text),kind:'blog_personal',obfuscated:true,entry:{schema:1,slug:'prueba-aislada',title:'Prueba aislada',date:'2026-10-19T12:00:00-06:00',body:'Contenido sintético público.',source:{kind:'khora',sha256:hash('Contenido sintético público.')}},facebook:{format:'full_text',message:'Contenido sintético público.'}};
 const ref={publicationId:id,sourceId:sid,sourceVersion:1,sourceHash:hash(text)};
 const call=async(body,origin='https://test.invalid')=>{const res=await POST(new Request('https://test.invalid/api/blog/editorial',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({_thinking_mode:'UNAVAILABLE',_output_format_version:'v1.7.7',_norm_turn_token:'isolated-test-token',...body})}));return {status:res.status,data:await res.json()}};
 let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
 global.__actor=null;eq((await call({action:'status',publicationId:id})).status,401);global.__actor='owner';eq((await call({action:'status',publicationId:id},'https://foreign.invalid')).status,403);
 eq((await call({action:'open_turn'})).status,503);
 eq((await call({action:'decline_archived',reference:{...ref,sourceHash:hash('wrong')}})).status,409);
 eq((await call({action:'decline_archived',reference:ref})).data.consent,'declined');eq((await call({action:'status',publicationId:id})).data.consent,'declined');
 eq((await query('SELECT * FROM blog_delivery')).rows.length,0);eq((await call({action:'prepare',revision:r})).status,409);
 global.__norm=true;eq((await call({action:'open_turn'})).data.turn.turn_token,'isolated-test-token');
 eq((await call({action:'prepare',revision:{...r,obfuscated:false}})).status,409);
 const prepared=await call({action:'prepare',revision:r});eq(prepared.status,200);eq(prepared.data.preview,r.entry);eq(prepared.data.audioPublic,false);eq(prepared.data.destinations,['blog','facebook']);
 eq((await call({action:'prepare',revision:r})).data.digest,prepared.data.digest);
 eq((await call({action:'decide',publicationId:id,digest:'bad',decision:true,obfuscatedExposure:true})).status,409);
 eq((await call({action:'decide',publicationId:id,digest:prepared.data.digest,decision:true,obfuscatedExposure:false})).status,409);
 const approve={action:'decide',publicationId:id,digest:prepared.data.digest,decision:true,obfuscatedExposure:true};eq((await call(approve)).status,200);eq((await call(approve)).status,200);
 eq((await query('SELECT * FROM blog_delivery')).rows.length,2);eq((await call({action:'status',publicationId:id})).data.filter,'publication_pending');
 eq((await query('SELECT * FROM blog_public_export')).rows.length,1);assert(!JSON.stringify((await query('SELECT * FROM blog_public_export')).rows).includes(text));checks++;
 await db.close();fs.writeFileSync(path.join(__dirname,'../evidence/editorial-route.json'),JSON.stringify({scope:'Actual editorial HTTP handler, repository, domain, real isolated PostgreSQL; auth/normative upstream/crypto adapters synthetic. No production access or publication.',checks,passed:true,migrationsAppliedTwice:true},null,2));console.log(JSON.stringify({checks,passed:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
