import {test} from 'node:test';import assert from 'node:assert/strict';
import {firmaCustodia,luzCustodia,audioCustodiadoCompleto} from '../../lib/custodia/estado';
import {subirAudioCustodiado} from '../../lib/client/subir-audio-custodia';
const initial={archivedReceipt:false,exactSnapshot:false,audioComplete:false,inFlight:false,confirmedFailure:false};
test('custody light has four independently evidenced meanings',()=>{
 assert.equal(luzCustodia(initial),'amarillo');assert.equal(luzCustodia({...initial,confirmedFailure:true}),'rojo');
 assert.equal(luzCustodia({...initial,exactSnapshot:true,audioComplete:true}),'verde');
 assert.equal(luzCustodia({...initial,archivedReceipt:true}),'azul');
});
test('old checkpoints, buffered audio and in-flight termination never produce green',()=>{
 for(const p of [{exactSnapshot:false,audioComplete:true},{exactSnapshot:true,audioComplete:false},{exactSnapshot:true,audioComplete:true,inFlight:true}])assert.equal(luzCustodia({...initial,...p}),'amarillo');
});
test('snapshot identity covers source/session/title/partial/classification/audio, not a status string',()=>{
 const s={sessionId:'s',texto:'Original',parcial:'',titulo:'Título',audioPartes:[],tipoEntrada:'general' as const,ofuscada:false};const key=firmaCustodia(s);
 for(const altered of [{sessionId:'other'},{texto:'Otro'},{parcial:'más'},{titulo:'Otro'},{audioPartes:[{parte:1}]},{tipoEntrada:'blog_personal' as const},{ofuscada:true}])assert.notEqual(firmaCustodia({...s,...altered}),key);
});
test('audio receipt must bind actual bytes, sha256, source, session and part',async()=>{
 const original=globalThis.fetch,blob=new Blob(['synthetic-only'],{type:'audio/webm'});const hash=Buffer.from(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())).toString('hex');const receipt={sessionId:'synthetic-session',partIndex:1,sha256:hash,bytes:blob.size,url:'https://example.invalid/audio',fuenteAudio:'microphone',verificado:true};
 try{
  globalThis.fetch=async()=>Response.json(receipt);assert.equal((await subirAudioCustodiado('synthetic-session',1,blob,{fuenteAudio:'microphone'})).sha256,hash);
  for(const changed of [{sessionId:'other'},{partIndex:2},{sha256:'a'.repeat(64)},{bytes:1},{fuenteAudio:'chrome_tab'},{url:'javascript:no'}]){let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({...receipt,...changed});};await assert.rejects(()=>subirAudioCustodiado('synthetic-session',1,blob,{fuenteAudio:'microphone'}));assert.equal(calls,1);}
 }finally{globalThis.fetch=original;}
});

const parte=(parte:number,fuenteAudio='microphone')=>({parte,bytes:40,sha256:'a'.repeat(64),verificado:true,fuenteAudio});
test('expected audio is not zero pending uploads or two equal zero counts',()=>{
 for(const fuenteEntrada of ['microfono','chrome_live_caption','audio_archivo'] as const){
  assert.equal(audioCustodiadoCompleto({fuenteEntrada,audioPartes:[],audioPartesEsperadas:0}),false);
  assert.equal(audioCustodiadoCompleto({fuenteEntrada,audioPartes:[parte(1)]}),false);
 }
 assert.equal(audioCustodiadoCompleto({fuenteEntrada:'texto',audioPartes:[],audioPartesEsperadas:0}),true);
 assert.equal(audioCustodiadoCompleto({fuenteEntrada:'microfono',audioPartes:[parte(1)],audioPartesEsperadas:1}),true);
});
test('persisted expected count detects missing prefix tail duplicates and invalid receipts',()=>{
 const s={fuenteEntrada:'microfono' as const,audioPartesEsperadas:2,audioPartes:[parte(1),parte(2)]};
 assert.equal(audioCustodiadoCompleto(s),true);
 for(const audioPartes of [[parte(1)],[parte(2)],[parte(1),parte(1)],[parte(1),parte(3)],[parte(1),{...parte(2),verificado:false}],[parte(1),{...parte(2),sha256:'bad'}],[parte(1),{...parte(2),bytes:0}],[null]])assert.equal(audioCustodiadoCompleto({...s,audioPartes}),false);
 assert.equal(audioCustodiadoCompleto(s,1),false);
 assert.equal(audioCustodiadoCompleto({...s,fuenteEntrada:'audio_archivo'}),false);
});
test('dialogue requires expected manifest and both sources, including after reload without raw blobs',()=>{
 const dialogo={version:1 as const,estado:'detenido' as const,etiquetas:{microphone:'Operador',chrome_tab:'Chrome'},partesEsperadas:2,turnos:[]};
 const s={fuenteEntrada:'dialogo' as const,dialogo,audioPartes:[parte(1),parte(2,'chrome_tab')]};
 assert.equal(audioCustodiadoCompleto(s),true);
 assert.equal(audioCustodiadoCompleto({...s,audioPartes:[]}),false);
 assert.equal(audioCustodiadoCompleto({...s,audioPartes:[parte(1),parte(2)]}),false);
 assert.equal(audioCustodiadoCompleto({...s,dialogo:{...dialogo,partesEsperadas:3}}),false);
 assert.equal(audioCustodiadoCompleto({...s,dialogo:{...dialogo,estado:'grabando'}}),false);
});
test('source cut expected count and dialogue mutation invalidate an older proof',()=>{
 const s={sessionId:'s',texto:'Original',parcial:'',titulo:'Título',audioPartes:[parte(1)],fuenteEntrada:'microfono' as const,audioPartesEsperadas:1};
 for(const delta of [{fuenteEntrada:'chrome_live_caption' as const},{audioPartesEsperadas:2},{corteAudio:{hastaParte:1,finMs:400}},{dialogo:{version:1 as const,estado:'detenido' as const,etiquetas:{microphone:'M',chrome_tab:'C'},partesEsperadas:1,turnos:[]}}])assert.notEqual(firmaCustodia({...s,...delta}),firmaCustodia(s));
 assert.equal(firmaCustodia(s),firmaCustodia({...s}));
});
test('archive failure alone leaves confirmed recoverable snapshot green',()=>assert.equal(luzCustodia({...initial,exactSnapshot:true,audioComplete:true}),'verde'));
test('confirmed custody failure is red even with saved text; archive-only failure does not erase recovery',()=>{
 assert.equal(luzCustodia({...initial,exactSnapshot:true,audioComplete:false,confirmedFailure:true}),'rojo');
 assert.equal(luzCustodia({...initial,exactSnapshot:true,audioComplete:true,confirmedFailure:true}),'rojo');
 assert.equal(luzCustodia({...initial,exactSnapshot:true,audioComplete:true,inFlight:true,confirmedFailure:true}),'rojo');
});
