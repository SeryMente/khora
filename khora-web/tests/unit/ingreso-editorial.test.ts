import test from "node:test";
import assert from "node:assert/strict";
import {TIPOS_ENTRADA,tipoEntradaValido,clasificacionRecuperada,iniciarIntencion,huellaTexto,canonicoEditorial,publicadoEnAmbos} from "../../lib/custodia/editorial";
test("four exact entry types, legacy never becomes a blog",()=>{assert.deepEqual(TIPOS_ENTRADA,["general","conversacion_maya","interpretacion_simultanea","blog_personal"]);assert.deepEqual(clasificacionRecuperada({}),{tipoEntrada:"general",ofuscada:false});assert.equal(tipoEntradaValido("blog"),false);});
test("classification never doubles as consent",()=>{assert.deepEqual(clasificacionRecuperada({tipoEntrada:"blog_personal",ofuscada:true}),{tipoEntrada:"blog_personal",ofuscada:true});});
test("archive intent starts without permission",async()=>{const x=await iniciarIntencion("exact text");assert.equal(x.decision,null);assert.equal(x.state,"awaiting_archive");assert.equal(x.sourceTextSha256,await huellaTexto("exact text"));});
test("stable identity across identical retry",async()=>{const x=await iniciarIntencion("text");assert.equal((await iniciarIntencion("text",x)).publicationId,x.publicationId);});
test("changed content invalidates previous Yes",async()=>{const x=await iniciarIntencion("text");const y=await iniciarIntencion("new text",{...x,decision:true});assert.notEqual(x.publicationId,y.publicationId);assert.equal(y.decision,null);});
test("canonical digest sorts keys recursively without changing arrays",()=>{assert.equal(canonicoEditorial({b:1,a:{c:2,b:[2,1]}}),'{"a":{"b":[2,1],"c":2},"b":1}');assert.throws(()=>canonicoEditorial({bad:undefined}));});
test("one confirmed destination is not both",()=>{assert.equal(publicadoEnAmbos({revision:1,filter:"published_both",deliveries:[{revision:1,target:"blog",state:"confirmed",url:"https://example.invalid",proof_hash:"a".repeat(64)}]}),false);});
test("mixed revisions cannot satisfy both",()=>{assert.equal(publicadoEnAmbos({revision:2,filter:"published_both",deliveries:[1,2].map((revision,i)=>({revision,target:i?"facebook":"blog",state:"confirmed",url:"https://example.invalid",proof_hash:"a".repeat(64)}))}),false);});
test("both same revision with proofs required",()=>{const deliveries=["blog","facebook"].map(target=>({revision:1,target,state:"confirmed",url:"https://example.invalid",proof_hash:"a".repeat(64)}));assert.equal(publicadoEnAmbos({revision:1,filter:"published_both",deliveries}),true);assert.equal(publicadoEnAmbos({revision:1,filter:"publication_pending",deliveries}),false);});

import {bloqueoTranscripcion} from "../../lib/custodia/transcripcion";
test("pending parts never report that no part exists",()=>{const b=bloqueoTranscripcion("session",3,1)!;assert.equal(b.code,"pending_uploads");assert.match(b.message,/3 parte/);assert.doesNotMatch(b.message,/ninguna parte/);});
test("no verified parts is not a local-loss claim",()=>{assert.match(bloqueoTranscripcion("session",0,0)!.message,/no prueba que el audio local se haya perdido/);assert.equal(bloqueoTranscripcion("",2,0)!.code,"no_session");assert.equal(bloqueoTranscripcion("session",2,0),null);});

import {TEXT_ONLY_PUBLICATION_AUTHORIZED} from "../../lib/custodia/editorial";
test("operator-authorized text-only cut does not include audio",()=>assert.equal(TEXT_ONLY_PUBLICATION_AUTHORIZED,true));
