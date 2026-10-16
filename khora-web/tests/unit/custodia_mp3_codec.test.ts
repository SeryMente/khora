import test from "node:test";
import assert from "node:assert/strict";
import { convertirAudioMp3, hashAudio } from "../../lib/server/audio-mp3";
function wav(){const n=16000,b=Buffer.alloc(44+n*2);b.write("RIFF");b.writeUInt32LE(36+n*2,4);b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/16000)*10000),44+i*2);return b;}
test("codec real: WAV a MP3 reproducible sin mutar el original",{timeout:30000},async()=>{const original=wav(),before=hashAudio(original);const mp3=await convertirAudioMp3(original);assert.ok(mp3.bytes.length>100);assert.ok(Math.abs(mp3.duracionSeg-1)<0.25);assert.equal(hashAudio(original),before);assert.notEqual(hashAudio(mp3.bytes),before);});
test("codec rechaza fuente vacía",async()=>{await assert.rejects(convertirAudioMp3(Buffer.alloc(0)));});
test("codec rechaza bytes que no son audio",{timeout:30000},async()=>{await assert.rejects(convertirAudioMp3(Buffer.from("not recorded audio")));});

test("codec real concatena dos grabaciones completas",{timeout:30000},async()=>{const r=await convertirAudioMp3([wav(),wav()]);assert.ok(Math.abs(r.duracionSeg-2)<0.25);});
