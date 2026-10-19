/** Controlled synthetic browser test. Does NOT certify microphone, tab permissions, provider or production. */
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),{spawnSync}=require("node:child_process");
const assert=require("node:assert/strict");
async function main(){
 const {chromium}=require("playwright"),esbuild=require("esbuild");
 const root=path.resolve(__dirname,"../../../.."),out=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"khora-dialogo-browser-"));fs.mkdirSync(out,{recursive:true});
 const code=esbuild.buildSync({entryPoints:[path.join(root,"khora-web/lib/dialogo/capturar.ts")],bundle:true,write:false,format:"iife",globalName:"KhoraDialogo"}).outputFiles[0].text;
 const exe=process.env.CHROMIUM_EXECUTABLE_PATH||spawnSync("which",["chromium"],{encoding:"utf8"}).stdout.trim();
 const browser=await chromium.launch({executablePath:exe||undefined,headless:true,args:["--no-sandbox","--autoplay-policy=no-user-gesture-required"]});
 try{
  const page=await browser.newPage();await page.goto("about:blank");await page.addScriptTag({content:code});
  const data=await page.evaluate(async()=>{
   const context=new AudioContext();await context.resume();
   const oscillator=f=>{const o=context.createOscillator(),d=context.createMediaStreamDestination();o.frequency.value=f;o.connect(d);o.start();return {stream:d.stream,o};};
   const mic=oscillator(440),tab=oscillator(880),parts=[],interruptions=[];
   const capture=await KhoraDialogo.capturarDialogo({mediaDevices:{getDisplayMedia:async()=>tab.stream,getUserMedia:async()=>mic.stream},onParte:async p=>parts.push(p),onInterrupcion:r=>interruptions.push(r)});
   await new Promise(r=>setTimeout(r,6200));await capture.detener();
   const result={interruptions,parts:parts.map(({blob,...p})=>({...p,size:blob.size})),tracksEnded:[...mic.stream.getTracks(),...tab.stream.getTracks()].every(t=>t.readyState==="ended"),sources:{}};
   for(const source of ["microphone","chrome_tab"]){const bytes=new Uint8Array(await new Blob(parts.filter(p=>p.fuente===source).sort((a,b)=>a.parte-b.parte).map(p=>p.blob)).arrayBuffer());let s="";for(const b of bytes)s+=String.fromCharCode(b);result.sources[source]=btoa(s);}
   mic.o.stop();tab.o.stop();await context.close();return result;
  });
  assert.equal(data.interruptions.length,0);assert.equal(data.tracksEnded,true);assert.ok(data.parts.length>=4);
  const metrics={kind:"controlled-synthetic",browser:await browser.version(),sources:{},finalChunksIncluded:true,tracksReleased:data.tracksEnded};
  for(const [source,b64] of Object.entries(data.sources)){
   const file=path.join(out,source+".webm");fs.writeFileSync(file,Buffer.from(b64,"base64"));
   const probe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_name","-of","json",file],{encoding:"utf8"});assert.equal(probe.status,0);assert.equal(JSON.parse(probe.stdout).streams[0].codec_name,"opus");
   const decoded=spawnSync("ffmpeg",["-v","error","-i",file,"-ac","1","-ar","16000","-f","f32le","pipe:1"],{maxBuffer:10000000});assert.equal(decoded.status,0);
   const pcm=decoded.stdout;let crossings=0;for(let i=4;i<pcm.length;i+=4)if(pcm.readFloatLE(i-4)<0&&pcm.readFloatLE(i)>=0)crossings++;
   const duration=pcm.length/4/16000,hz=crossings/duration;assert.ok(duration>6&&duration<7.5);assert.ok(Math.abs(hz-(source==="microphone"?440:880))<15);
   metrics.sources[source]={bytes:fs.statSync(file).size,durationSeconds:duration,estimatedFrequencyHz:hz,chunks:data.parts.filter(p=>p.fuente===source).length};
  }
  fs.writeFileSync(path.join(out,"browser-result.json"),JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exit(1);});
