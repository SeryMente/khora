import test from "node:test";
import assert from "node:assert/strict";
import { validarVentanaLive } from "../../lib/dialogo/segmento-live-contract";
const base={sessionId:"d3f2357e-2364-44cf-973f-f7f2b24643ab",source:"microphone",sequence:2,startMs:6000,endMs:12500,size:208044};
test("live window contract accepts source, sequence, time range and exact PCM16k WAV size",()=>{
  assert.equal(validarVentanaLive(base).ok,true);
});
test("live window contract rejects invalid source, sequence, timestamps, session and size",()=>{
  for(const patch of [{source:"maya"},{sequence:0},{sequence:3},{startMs:0},{endMs:12501},{sessionId:"invalid"},{size:500},{source:"unknown"}]){
    assert.equal(validarVentanaLive({...base,...patch}).ok,false);
  }
});
