import test from "node:test";
import assert from "node:assert/strict";
import { ordenarTurnos,formatearDialogo,formatearCaptura } from "../../../../khora-web/lib/dialogo/contrato";
import { transcribirPistasDialogo } from "../../../../khora-web/lib/dialogo/transcribir";
import { capturarDialogo } from "../../../../khora-web/lib/dialogo/capturar";
class Track extends EventTarget {readyState="live";stops=0;stop(){this.readyState="ended";this.stops++;}getSettings(){return {displaySurface:"browser"};}}
class Stream {constructor(public tracks:Track[]){ }getTracks(){return this.tracks;}getAudioTracks(){return this.tracks;}getVideoTracks(){return [];}}
(globalThis as any).MediaStream=Stream;
class Recorder extends EventTarget{
 state="inactive";constructor(public stream:Stream){super();}
 start(){this.state="recording";}
 stop(){this.state="inactive";this.dispatchEvent(Object.assign(new Event("dataavailable"),{data:new Blob(["final"])}));this.dispatchEvent(new Event("stop"));}
}
const pistas=[{fuente:"microphone" as const,bytes:new Uint8Array([1]),offsetMs:100},{fuente:"chrome_tab" as const,bytes:new Uint8Array([2]),offsetMs:200}];
test("ordena por tiempo, preserva repeticiones y marca solapamiento entre fuentes",()=>{
 const x=ordenarTurnos([{fuente:"chrome_tab",start_ms:1200,end_ms:2500,texto:"sí"},{fuente:"microphone",start_ms:500,end_ms:1500,texto:"sí"}]);
 assert.equal(x.length,2);assert.equal(x[0].fuente,"microphone");assert.ok(x.every(t=>t.solapado));assert.match(formatearDialogo(x,{microphone:"Operador",chrome_tab:"Maya"}),/Maya \[solapamiento\]: sí/);
});
test("rechaza tiempos no verificables",()=>assert.throws(()=>ordenarTurnos([{fuente:"microphone",start_ms:NaN,end_ms:0,texto:"a"}])));
test("no deduce fuente por idioma y conserva originales bilingües",async()=>{
 const r=await transcribirPistasDialogo(pistas,async p=>({exito:true,texto:p.fuente==="microphone"?"Hello":"Hola",segmentos:[{start:0,end:1,text:p.fuente==="microphone"?"Hello":"Hola"}]}));
 assert.equal(r.estadoTranscripcion,"completo");assert.equal(r.turnos[0].texto,"Hello");assert.equal(r.turnos[0].fuente,"microphone");assert.equal(r.turnos[0].start_ms,100);
});
test("no inventa turnos cuando falta timing",async()=>{
 const r=await transcribirPistasDialogo(pistas,async()=>({exito:true,texto:"texto sin tiempos"}));assert.equal(r.estadoTranscripcion,"fallido");assert.equal(r.turnos.length,0);
});
test("falla una fuente sin ocultar la parcialidad",async()=>{
 const r=await transcribirPistasDialogo(pistas,async p=>{if(p.fuente==="chrome_tab")throw Error("provider");return {exito:true,texto:"hi",segmentos:[{start:0,end:1,text:"hi"}]};});assert.equal(r.estadoTranscripcion,"parcial");assert.deepEqual(r.fuentesFallidas,["chrome_tab"]);
});
test("silencio no genera texto",async()=>{const r=await transcribirPistasDialogo(pistas,async()=>({exito:true,texto:"",segmentos:[]}));assert.equal(r.turnos.length,0);assert.equal(r.estadoTranscripcion,"completo");});
test("timing inválido del proveedor falla esa fuente",async()=>{const r=await transcribirPistasDialogo(pistas,async()=>({exito:true,texto:"x",segmentos:[{start:3,end:1,text:"x"}]}));assert.equal(r.estadoTranscripcion,"fallido");});
test("sin audio compartido no solicita ni graba micrófono",async()=>{
 let calls=0;await assert.rejects(capturarDialogo({onParte:async()=>{},onInterrupcion:()=>{},mediaDevices:{getDisplayMedia:async()=>new Stream([]) as any,getUserMedia:async()=>{calls++;return new Stream([]) as any;}}}),/no compartió audio/);assert.equal(calls,0);
});
test("si se deniega micrófono libera captura de Chrome",async()=>{
 const tab=new Track();await assert.rejects(capturarDialogo({onParte:async()=>{},onInterrupcion:()=>{},mediaDevices:{getDisplayMedia:async()=>new Stream([tab]) as any,getUserMedia:async()=>{throw Error("denied");}}}),/denied/);assert.equal(tab.readyState,"ended");
});
test("dos grabadoras separadas; detener espera último chunk local de ambas",async()=>{
 const tracks=[new Track(),new Track()],received:any[]=[],recorders:Recorder[]=[];
 const c=await capturarDialogo({onParte:async p=>{await new Promise(r=>setTimeout(r,5));received.push(p);},onInterrupcion:()=>{},mediaDevices:{getDisplayMedia:async()=>new Stream([tracks[0]]) as any,getUserMedia:async()=>new Stream([tracks[1]]) as any},recorder:s=>{const r=new Recorder(s as any);recorders.push(r);return r as any;}});
 assert.equal(recorders.length,2);assert.notEqual(recorders[0].stream,recorders[1].stream);await c.detener();await c.detener();assert.equal(received.length,2);assert.deepEqual(received.map(x=>x.parte).sort(),[1,2]);assert.deepEqual(new Set(received.map(x=>x.fuente)),new Set(["chrome_tab","microphone"]));assert.ok(tracks.every(t=>t.readyState==="ended"));
});
test("fallo de arranque de segunda grabadora no deja colgada finalización",async()=>{
 let n=0;const tracks=[new Track(),new Track()];await assert.rejects(capturarDialogo({onParte:async()=>{},onInterrupcion:()=>{},mediaDevices:{getDisplayMedia:async()=>new Stream([tracks[0]]) as any,getUserMedia:async()=>new Stream([tracks[1]]) as any},recorder:s=>{const r=new Recorder(s as any);if(++n===2)r.start=()=>{throw Error("recorder_start_failed");};return r as any;}}),/recorder_start_failed/);assert.ok(tracks.every(t=>t.readyState==="ended"));
});
test("terminar una fuente detiene ambas y declara interrupción",async()=>{
 const a=new Track(),b=new Track();let reason="";
 const c=await capturarDialogo({onParte:async()=>{},onInterrupcion:r=>{reason=r;},mediaDevices:{getDisplayMedia:async()=>new Stream([a]) as any,getUserMedia:async()=>new Stream([b]) as any},recorder:s=>new Recorder(s as any) as any});
 a.dispatchEvent(new Event("ended"));await c.detener();assert.match(reason,/fuente/);assert.equal(b.readyState,"ended");
});
test("preflight de custodia fallido no inicia grabadoras",async()=>{
 let starts=0;await assert.rejects(capturarDialogo({antesDeGrabar:async()=>{throw Error("custody_failed");},onParte:async()=>{},onInterrupcion:()=>{},mediaDevices:{getDisplayMedia:async()=>new Stream([new Track()]) as any,getUserMedia:async()=>new Stream([new Track()]) as any},recorder:s=>{starts++;return new Recorder(s as any) as any;}}),/custody_failed/);assert.equal(starts,0);
});

test("presentación independiente conserva fuentes y texto literal",()=>{
 const turns=[{fuente:"microphone" as const,start_ms:0,end_ms:100,texto:"Sí. Sí."},{fuente:"chrome_tab" as const,start_ms:120,end_ms:180,texto:"Hola."}];
 const before=JSON.stringify(turns), labels={microphone:"Operador",chrome_tab:"Salida Chrome"};
 assert.equal(formatearCaptura(turns,labels,false),"Sí. Sí.\n\nHola.");
 assert.equal(formatearCaptura(turns,labels),formatearDialogo(turns,labels));
 assert.equal(JSON.stringify(turns),before);
});
test("tiempos fraccionales de navegador se conservan como milisegundos enteros",async()=>{
 const collected:any[]=[];let t=10.22;
 const c=await capturarDialogo({mediaDevices:{getDisplayMedia:async()=>new Stream([new Track()]) as any,getUserMedia:async()=>new Stream([new Track()]) as any},recorder:s=>new Recorder(s as any) as any,now:()=>{t+=0.73;return t;},onParte:async p=>{collected.push(p);},onInterrupcion:()=>{}});
 await c.detener();assert.equal(collected.length,2);assert.ok(collected.every(p=>[p.startMs,p.endMs,p.duracionMs].every(Number.isInteger)));
});
