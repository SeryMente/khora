import test from "node:test";
import assert from "node:assert/strict";
import { Pcm16kWindowProcessor, DIALOGO_WINDOW_FRAMES, downmixFloatChannelsSafely, downmixStereoPcm16Safely, encodeStereoMasterWav } from "../../lib/dialogo/audio";

test("AudioWorklet window contract: autonomous 6.5 s WAV, 500 ms overlap and 16 kHz PCM16 mono",async()=>{
  const processor=new Pcm16kWindowProcessor(48000),windowList:any[]=[];
  const total=48000*7.1,chunkSize=128;
  for(let start=0;start<total;start+=chunkSize){
    const size=Math.min(chunkSize,total-start),chunk=new Float32Array(size);
    for(let i=0;i<size;i++)chunk[i]=0.25*Math.sin(2*Math.PI*220*(start+i)/48000);
    windowList.push(...processor.push([chunk]));
  }
  windowList.push(...processor.flush());
  assert.equal(windowList.length,2);
  assert.equal(windowList[0].startMs,0);
  assert.equal(windowList[0].endMs,6500);
  assert.equal(windowList[1].startMs,6000);
  assert.ok(windowList[1].endMs>=7090&&windowList[1].endMs<=7100);
  for(const item of windowList){
    assert.equal(item.wav.type,"audio/wav");
    assert.equal(item.wav.size,44+DIALOGO_WINDOW_FRAMES*2);
  }
  await Promise.all(windowList.map(async item=>{
    const bytes=Buffer.from(await item.wav.arrayBuffer());
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.readUInt32LE(24),16000);
    assert.equal(bytes.readUInt16LE(22),1);
    assert.equal(bytes.readUInt16LE(34),16);
  }));
});

test("stereo downmix protects opposite-phase speech instead of cancelling to silence",()=>{
  const left=new Float32Array(256).fill(0.75),right=new Float32Array(256).fill(-0.75);
  const mono=downmixFloatChannelsSafely([left,right]);
  assert.ok(mono.every(value=>Math.abs(value-0.75)<0.0001));
  const pcm=Buffer.alloc(256*4);
  for(let i=0;i<256;i++){pcm.writeInt16LE(24576,i*4);pcm.writeInt16LE(-24576,i*4+2);}
  const safe=downmixStereoPcm16Safely(pcm);
  assert.ok(Math.abs(safe.readInt16LE(0)-24576)<=1);
});

test("master WAV has one stereo stream, user left and Chrome right with source offset alignment",()=>{
  const user=Buffer.alloc(4),chrome=Buffer.alloc(4);
  user.writeInt16LE(100,0);user.writeInt16LE(200,2);
  chrome.writeInt16LE(300,0);chrome.writeInt16LE(400,2);
  const master=encodeStereoMasterWav(user,chrome,0,1,1000);
  assert.equal(master.toString("ascii",0,4),"RIFF");
  assert.equal(master.readUInt16LE(22),2);
  assert.equal(master.readUInt32LE(24),1000);
  assert.equal(master.readUInt16LE(34),16);
  assert.equal(master.readUInt32LE(40),12);
  assert.equal(master.readInt16LE(44),100);
  assert.equal(master.readInt16LE(46),0);
  assert.equal(master.readInt16LE(48),200);
  assert.equal(master.readInt16LE(50),300);
  assert.equal(master.readInt16LE(52),0);
  assert.equal(master.readInt16LE(54),400);
});
