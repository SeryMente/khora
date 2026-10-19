import {test} from 'node:test';import assert from 'node:assert/strict';
import {firmaCustodia,luzCustodia} from '../../lib/custodia/estado';
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
