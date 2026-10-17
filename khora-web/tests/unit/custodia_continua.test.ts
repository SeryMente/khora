import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluarCustodiaAudio } from "../../lib/audio/custodia";
import { calcularDelta } from "../../lib/server/correcciones";
import { esAudioEsperado } from "../../lib/server/domainAudio";
import { textoRecuperable, CHECKPOINT_IDLE_MS, CHECKPOINT_MAX_MS, AUDIO_CHECKPOINT_MS } from "../../lib/custodia/contrato";
const valid={part_index:1,bytes:20,sha256:"a".repeat(64),estado_verificacion:"verificado"};
for(const [name,parts,total] of [
 ["vacío",[],0],["duplicado",[valid,valid],1],["sobrante",[valid,{...valid,part_index:2}],1],["hueco",[{...valid,part_index:2}],2],["negativo",[{...valid,part_index:-1}],1],["no verificado",[{...valid,estado_verificacion:"pendiente"}],1],["sin huella",[{...valid,sha256:"x"}],1],
] as const)test(`custodia rechaza ${name}`,()=>assert.equal(evaluarCustodiaAudio([...parts],total).ok,false));
test("custodia acepta manifiesto exacto",()=>assert.equal(evaluarCustodiaAudio([valid],1).ok,true));
for(const [a,b] of [["termino","término"],["hola","hola."],["a b","a  b"],["","nuevo"],["original",""],["A","a"]])test(`delta exacto ${JSON.stringify(a)} -> ${JSON.stringify(b)}`,()=>{const delta=calcularDelta(a,b);assert.ok(delta.length);assert.notDeepEqual(delta,[]);});
test("sin cambio no crea delta",()=>assert.deepEqual(calcularDelta("igual","igual"),[]));
test("texto manual no requiere audio por tener sesión",()=>assert.equal(esAudioEsperado({fuente:"texto",driver:"texto",session_id:"manual"}),false));
test("dictado sí requiere audio",()=>assert.equal(esAudioEsperado({fuente:"dictado",driver:"dictado",session_id:"audio"}),true));
test("parcial se recupera sin fingir que es final",()=>assert.equal(textoRecuperable({texto:"final",parcial:"provisional"}),"final\n\nprovisional"));
test("frecuencia remota tiene límite y el audio no espera archivo",()=>{assert.ok(CHECKPOINT_IDLE_MS<CHECKPOINT_MAX_MS);assert.ok(AUDIO_CHECKPOINT_MS<=CHECKPOINT_MAX_MS);});
const root=process.cwd().endsWith("khora-web")?process.cwd():path.join(process.cwd(),"khora-web");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
test("GET versiones no crea versiones",()=>assert.ok(!read("app/api/versiones/route.ts").includes("await asegurarVersionInicial(id)")));
test("MCP audio preserva scope y dueño",()=>{assert.match(read("lib/server/mcp-tool-contract.ts"),/khora_leer_audio: \["volcados:read"\]/);assert.match(read("lib/server/mcp-audios.ts"),/COALESCE\(s.custodia_owner,s.checkpoint_usuario,v.usuario\)=\$2/);});
test("no hay texto a voz en el conversor",()=>{const s=read("lib/server/audio-mp3.ts");assert.match(s,/libmp3lame/);assert.doesNotMatch(s,/speechSynthesis|text.to.speech|tts-/i);});
test("la documentación existe y es descubrible",()=>{assert.match(read("../AGENTS.md"),/CUSTODIA-DICTADOS/);assert.match(read("docs/CUSTODIA-DICTADOS.md"),/NO CERTIFICADO/);});

test("errores de reconocimiento no desactivan la grabadora de custodia",()=>{
  const source=read("app/components/ingreso/IngresoWorkspace.tsx");
  const handler=source.slice(source.indexOf("rec.onerror ="),source.indexOf("rec.onend ="));
  assert.doesNotMatch(handler,/detenerGrabacion\(|audioPermitidoRef.current = false|setConAudio\(false\)/);
  assert.match(handler,/reconocimientoSuspendidoRef.current = true/);
});
