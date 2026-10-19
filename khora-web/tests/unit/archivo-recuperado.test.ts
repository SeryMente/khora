import {test} from 'node:test';import assert from 'node:assert/strict';
import {sesionArchivoRecuperado,mismaCapturaRecuperada} from '../../lib/custodia/archivo-recuperado';
import type {CapturaSnapshot} from '../../lib/custodia/contrato';
const source:CapturaSnapshot={sessionId:'11111111-1111-4111-8111-111111111111',revisionId:'22222222-2222-4222-8222-222222222222',clientAt:4,texto:'Punto elegido',parcial:'continuación',titulo:'Su título',tipoEntrada:'general',ofuscada:true,fuenteEntrada:'microfono',duracionSeg:5,audioPartesEsperadas:1,corteAudio:{hastaParte:1,finMs:5000},audioPartes:[{parte:1,bytes:25,sha256:'a'.repeat(64),verificado:true,fuenteAudio:'microphone',url:'https://example.invalid/private'}]};
test('selected archive uses stable separate UUIDv5 for retries, never source session',async()=>{
 const target=await sesionArchivoRecuperado(source.sessionId,source.revisionId);assert.match(target,/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 assert.equal(target,await sesionArchivoRecuperado(source.sessionId,source.revisionId));assert.notEqual(target,source.sessionId);
 assert.notEqual(target,await sesionArchivoRecuperado(source.sessionId,source.revisionId,'preparar'));
 await assert.rejects(()=>sesionArchivoRecuperado('not-a-session',source.revisionId));
});
test('fork receipt binds exact selected content classification cut and audio, tolerates extra SQL metadata',async()=>{
 const target=await sesionArchivoRecuperado(source.sessionId,source.revisionId),recovery={...source,sessionId:target,revisionId:'33333333-3333-4333-8333-333333333333',recuperadaDe:{sessionId:source.sessionId,revisionId:source.revisionId}};
 assert.equal(mismaCapturaRecuperada(source,recovery,target),true);
 for(const delta of [{texto:'posterior'},{titulo:'posterior'},{ofuscada:false},{tipoEntrada:'blog_personal' as const},{audioPartesEsperadas:2},{audioPartes:[]},{corteAudio:{hastaParte:2,finMs:10000}},{sessionId:source.sessionId},{recuperadaDe:{sessionId:source.sessionId,revisionId:recovery.revisionId}}])assert.equal(mismaCapturaRecuperada(source,{...recovery,...delta},target),false);
 assert.equal(mismaCapturaRecuperada(source,{...recovery,audioPartes:[{...(source.audioPartes[0] as object),start_ms:0}]},target),true);
});
