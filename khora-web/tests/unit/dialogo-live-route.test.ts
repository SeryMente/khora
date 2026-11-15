import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";

function loadRoute() {
  let user: {email:string}|null={email:"dialogue-owner@example.invalid"};
  let rows:any[]=[{snapshot:JSON.stringify({fuenteEntrada:"dialogo",dialogo:{version:1,estado:"grabando"}})}];
  let transcription:any={texto:"",exito:true,modelo:"whisper-large-v3",segmentos:[{start:0.25,end:0.9,text:"Hola desde el micrófono."}]};
  const groqCalls:any[]=[];
  const actual=createRequire(import.meta.url);
  const source=readFileSync("app/api/transcribir/dialogo/segmento/route.ts","utf8");
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{} as any};
  const requireMock=(name:string)=>{
    if(name==="next/server")return {NextResponse};
    if(name==="next/server.js")return {NextResponse};
    if(name==="@/auth")return {auth:async()=>user?{user}:null};
    if(name==="@/lib/server/neon")return {getDb:()=>({query:async(_sql:string,_params:any[])=>({rows})})};
    if(name==="@/lib/server/cripto")return {descifrarTexto:(value:string)=>value};
    if(name==="@/lib/server/transcribir")return {transcribirAudioConGroq:async(...args:any[])=>{groqCalls.push(args);return transcription;}};
    return actual(name);
  };
  new Function("require","module","exports",js)(requireMock,module,module.exports);
  return {
    POST:module.exports.POST as (request:NextRequest)=>Promise<Response>,
    setUser:(value:{email:string}|null)=>{user=value;},
    setRows:(value:any[])=>{rows=value;},
    setTranscription:(value:any)=>{transcription=value;},
    groqCalls,
  };
}
function wavFile():File {
  const data=Buffer.alloc(208000),wav=Buffer.alloc(208044);
  wav.write("RIFF",0,"ascii");wav.writeUInt32LE(208036,4);wav.write("WAVE",8,"ascii");
  wav.write("fmt ",12,"ascii");wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);
  wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write("data",36,"ascii");
  wav.writeUInt32LE(data.length,40);data.copy(wav,44);
  return new File([wav],"window.wav",{type:"audio/wav"});
}
function request(overrides:Record<string,string>={}) {
  const form=new FormData();
  form.set("sessionId",overrides.sessionId||"d3f2357e-2364-44cf-973f-f7f2b24643ab");
  form.set("fuente",overrides.fuente||"microphone");
  form.set("sequence",overrides.sequence||"2");
  form.set("startMs",overrides.startMs||"6000");
  form.set("endMs",overrides.endMs||"12500");
  form.set("audio",wavFile());
  return new NextRequest(new Request("https://khora.example.test/api/transcribir/dialogo/segmento",{method:"POST",body:form}));
}

test("segment endpoint authenticates, validates owner and window contract, pins Groq server model",async()=>{
  const route=loadRoute();
  route.setUser(null);
  assert.equal((await route.POST(request())).status,401);
  route.setUser({email:"dialogue-owner@example.invalid"});
  assert.equal((await route.POST(request({fuente:"alien"}))).status,400);
  assert.equal((await route.POST(request({sequence:"4"}))).status,400);
  route.setRows([]);
  assert.equal((await route.POST(request())).status,404);
  route.setRows([{snapshot:JSON.stringify({fuenteEntrada:"dialogo",dialogo:{version:1,estado:"grabando"}})}]);
  const response=await route.POST(request());
  assert.equal(response.status,200);
  const data=await response.json() as any;
  assert.equal(data.fuente,"microphone");
  assert.equal(data.sequence,2);
  assert.deepEqual(data.segmentos[0],{start_ms:6250,end_ms:6900,texto:"Hola desde el micrófono."});
  assert.equal(route.groqCalls[0][1],"dialogo-microphone-2.wav");
  assert.equal(route.groqCalls[0][2].mimeType,"audio/wav");
  assert.equal(route.groqCalls[0][2].model,"whisper-large-v3");
});

test("segment endpoint propagates bounded provider 429 Retry-After",async()=>{
  const route=loadRoute();
  route.setTranscription({texto:"",exito:false,modelo:"whisper-large-v3",statusCode:429,retryAfter:"3"});
  const response=await route.POST(request());
  assert.equal(response.status,429);
  assert.equal(response.headers.get("Retry-After"),"3");
});
