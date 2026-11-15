import test from "node:test";
import assert from "node:assert/strict";
import { ColasDialogoVivo, agregarSegmentosAlFinal, formatearSegmentosCrudos, protegerEdicionHumana, reconciliarSegmentosCrudos, retryAfterMs, type SegmentoCrudoDialogo } from "../../lib/dialogo/live-transcription";
import type { VentanaDialogo } from "../../lib/dialogo/live-audio-client";
const labels={microphone:"USUARIO",chrome_tab:"CHROME"};
const win=(fuente:"microphone"|"chrome_tab",sequence:number):VentanaDialogo=>({fuente,sequence,startMs:(sequence-1)*6000,endMs:(sequence-1)*6000+6500,wav:new Blob([new Uint8Array(208044)],{type:"audio/wav"})});
const seg=(fuente:"microphone"|"chrome_tab",sequence:number,start_ms:number,end_ms:number,texto:string):SegmentoCrudoDialogo=>({fuente,sequence,start_ms,end_ms,texto});

test("raw segments remain immutable while same-source overlap is removed only from display",()=>{
  const first=seg("microphone",1,5500,6500,"la puerta quedó abierta");
  const second=seg("microphone",2,6000,7000,"abierta hasta mañana");
  const raw=reconciliarSegmentosCrudos([first,second]);
  assert.equal(raw.length,2);
  assert.equal(raw[1].texto,"abierta hasta mañana");
  assert.equal(Object.isFrozen(raw[1]),true);
  const display=formatearSegmentosCrudos(raw,labels);
  assert.match(display,/la puerta quedó abierta/); assert.match(display,/hasta mañana/);
  assert.equal((display.match(/abierta/g)||[]).length,1);
  const cross=reconciliarSegmentosCrudos([...raw,seg("chrome_tab",1,5900,6400,"la puerta quedó abierta")]);
  assert.equal(cross.length,3);
});

test("late live segments cannot replace an operator-edited display and can be appended explicitly",()=>{
  const human="Texto corregido manualmente.";
  const incoming=[seg("chrome_tab",1,0,1200,"Una respuesta tardía.")];
  const update=protegerEdicionHumana(human,[],incoming,true,labels);
  assert.equal(update.displayText,human);
  assert.equal(update.rawSegments[0].texto,"Una respuesta tardía.");
  const appended=agregarSegmentosAlFinal(human,update.rawSegments,labels);
  assert.match(appended,/Texto corregido manualmente\./);
  assert.match(appended,/Una respuesta tardía\./);
  const automatic=protegerEdicionHumana("",[],incoming,false,labels);
  assert.match(automatic.displayText,/Una respuesta tardía/);
});

test("Retry-After seconds and dates are clamped to a bounded wait",()=>{
  assert.equal(retryAfterMs("2"),2000);
  assert.equal(retryAfterMs("0"),100);
  assert.equal(retryAfterMs("900"),5000);
  assert.equal(retryAfterMs(null),500);
});

test("microphone and Chrome use independent bounded FIFO queues",async()=>{
  let releaseMic!:()=>void,chromeDone!:()=>void;
  const micGate=new Promise<void>(resolve=>releaseMic=resolve);
  const chromeGate=new Promise<void>(resolve=>chromeDone=resolve);
  const started:string[]=[];
  const queue=new ColasDialogoVivo({
    maxQueuedPerSource:1,maxRetries:0,onSegments:()=>undefined,
    send:async window=>{
      started.push(window.fuente+":"+window.sequence);
      if(window.fuente==="microphone"&&window.sequence===1)await micGate;
      if(window.fuente==="chrome_tab")chromeDone();
      return {fuente:window.fuente,sequence:window.sequence,segmentos:[]};
    }
  });
  assert.equal(queue.enqueue(win("microphone",1)),true);
  assert.equal(queue.enqueue(win("microphone",2)),true);
  assert.equal(queue.enqueue(win("microphone",3)),false);
  assert.equal(queue.enqueue(win("chrome_tab",1)),true);
  await Promise.race([chromeGate,new Promise((_,reject)=>setTimeout(()=>reject(Error("chrome blocked by microphone queue")),1000))]);
  assert.ok(started.includes("chrome_tab:1"));
  releaseMic();
  const result=await queue.waitForIdle(1000);
  assert.deepEqual(result.failedSources,["microphone"]);
  assert.deepEqual(result.failed.microphone,[3]);
});

test("429 honors Retry-After once and bounded provider/network failures are reported",async()=>{
  let calls=0;const waits:number[]=[];
  const queue=new ColasDialogoVivo({
    maxRetries:1,sleep:async ms=>{waits.push(ms);},onSegments:()=>undefined,
    send:async window=>{
      calls++;
      if(calls===1)throw Object.assign(Error("rate limited"),{status:429,retryAfter:"2"});
      return {fuente:window.fuente,sequence:window.sequence,segmentos:[]};
    }
  });
  queue.enqueue(win("chrome_tab",1));
  const done=await queue.waitForIdle(1000);
  assert.equal(calls,2);
  assert.deepEqual(waits,[2000]);
  assert.deepEqual(done.failedSources,[]);
});

test("repeated provider failures are bounded and leave a source-specific fallback marker",async()=>{
  let calls=0;
  const queue=new ColasDialogoVivo({maxRetries:2,sleep:async()=>undefined,onSegments:()=>undefined,send:async()=>{calls++;throw Object.assign(Error("unavailable"),{status:503});}});
  queue.enqueue(win("microphone",1));
  const done=await queue.waitForIdle(1000);
  assert.equal(calls,3);
  assert.deepEqual(done.failedSources,["microphone"]);
  assert.deepEqual(done.failed.microphone,[1]);
});
