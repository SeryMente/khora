'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');

async function freePort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
}
async function waitForHealth(base,token,child){
 for(let i=0;i<50;i++){
  if(child.exitCode!==null)throw new Error('Collector exited before health check');
  try{
   const response=await fetch(base+'/health',{headers:{'x-harmonia-token':token}});
   if(response.ok)return response.json();
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 throw new Error('Collector startup timeout');
}

test('HTTP front report accepts only explicit assignment/activity and returns one row per front',async()=>{
 const repo=path.resolve(__dirname,'..','..');
 const port=await freePort();
 const token='harmonia-test-token-not-a-secret';
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'harmonia-front-api-'));
 const child=spawn(process.execPath,[path.join(__dirname,'server.js')],{
  cwd:__dirname,
  env:{...process.env,HARMONIA_TOKEN:token,HARMONIA_PORT:String(port),HARMONIA_DATA:temp},
  stdio:'ignore'
 });
 const base='http://127.0.0.1:'+port;
 try{
  const health=await waitForHealth(base,token,child);
  assert.equal(health.collectorVersion,'0.6.0');
  const conversationId='6af63886-1a9c-83e8-a5ae-448392d6d61d';
  const conversationUrl='https://chatgpt.com/c/'+conversationId;
  const assignedAt=new Date(Date.now()-3000).toISOString();
  const eventBase={schema:'harmonia.event.v1',eventId:crypto.randomUUID(),sessionId:crypto.randomUUID(),conversation:conversationId,source:'test',capturedAt:assignedAt};
  const assignment={
   ...eventBase,type:'front.assignment',payload:{
    front_id:'harmonia',front_name:'Harmonia',conversation_id:conversationId,
    conversation_url:conversationUrl,association:'operator_selection',assigned_at:assignedAt
   }
  };
  const assigned=await fetch(base+'/events',{method:'POST',headers:{'x-harmonia-token':token,'content-type':'application/json'},body:JSON.stringify(assignment)});
  assert.equal(assigned.status,201);
  const activityAt=new Date().toISOString();
  const activity={
   ...eventBase,eventId:crypto.randomUUID(),capturedAt:activityAt,type:'front.activity',payload:{
    front_id:'harmonia',front_name:'Harmonia',conversation_id:conversationId,conversation_url:conversationUrl,
    activity_kind:'assistant_response_completed',updated_at:activityAt,
    local_conversation_id:'01a1d1f1-febb-7736-88da-74e3537d2657',
    cycle_id:'01a1d1dc-f671-7823-93d8-7caca36e0b07'
   }
  };
  const recorded=await fetch(base+'/events',{method:'POST',headers:{'x-harmonia-token':token,'content-type':'application/json'},body:JSON.stringify(activity)});
  assert.equal(recorded.status,201);
  const reportResponse=await fetch(base+'/fronts?window=24h',{headers:{'x-harmonia-token':token}});
  assert.equal(reportResponse.status,200);
  const report=await reportResponse.json();
  assert.equal(report.rows.length,1);
  assert.equal(report.rows[0].frontName,'Harmonia');
  assert.equal(report.rows[0].conversationUrl,conversationUrl);
  assert.equal(report.rows[0].source,'extension_cycle');
  assert.ok(!JSON.stringify(report).includes('prompt'));
  const invalid=await fetch(base+'/fronts?window=30d',{headers:{'x-harmonia-token':token}});
  assert.equal(invalid.status,400);
 } finally {
  try { await fetch(base+'/shutdown',{method:'POST',headers:{'x-harmonia-token':token}}); } catch {}
  child.kill();
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
