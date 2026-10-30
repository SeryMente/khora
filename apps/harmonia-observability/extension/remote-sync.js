(function(root){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const EVENT_NAMES=new Set([
  'harmonia.ui.surface.scan','harmonia.ui.surface.reused',
  'harmonia.capture.started','harmonia.capture.stopped'
 ]);
 const REASONS=new Set(['surface_scan','surface_reused','capture_started','capture_stopped']);
 const METRIC_KEYS=new Set([
  'source_ordinal','surface_fingerprint','catalog_version','feature_ids',
  'control_count','node_count','stylesheet_count','viewport_width',
  'viewport_height','device_pixel_ratio','deduplicated','capture_duration_ms'
 ]);
 function validIso(value){
  if(typeof value!=='string')return null;
  const date=new Date(value);
  return Number.isFinite(date.getTime())?date.toISOString():null;
 }
 function integer(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
 }
 function buildMetrics(source){
  const input=source&&typeof source==='object'?source:{},metrics={};
  for(const key of METRIC_KEYS){
   if(!(key in input))continue;
   const value=input[key];
   if(key==='surface_fingerprint'){
    if(typeof value==='string'&&/^[0-9a-f]{64}$/i.test(value))metrics[key]=value.toLowerCase();
   }else if(key==='catalog_version'){
    if(typeof value==='string'&&/^[a-zA-Z0-9._-]{1,24}$/.test(value))metrics[key]=value;
   }else if(key==='feature_ids'){
    if(Array.isArray(value))metrics[key]=value.filter(x=>typeof x==='string'&&/^[a-zA-Z0-9._:-]{1,80}$/.test(x)).slice(0,50);
   }else if(key==='deduplicated'){
    if(typeof value==='boolean')metrics[key]=value;
   }else{
    const n=Number(value);
    if(Number.isFinite(n)&&n>=0)metrics[key]=Math.min(n,1000000000);
   }
  }
  return metrics;
 }
 function buildEvent(record,index,sessionId){
  if(!record||!UUID.test(String(record.event_uuid||'')))throw new Error('UUID de evento remoto inválido.');
  if(record.session_id!==sessionId||record.correlation_id!==sessionId)throw new Error('El lote contiene sesiones o correlaciones mezcladas.');
  if(!EVENT_NAMES.has(record.event_name))throw new Error('Tipo de observación fuera de la lista autorizada.');
  const clientTime=validIso(record.client_time);
  if(!clientTime)throw new Error('Fecha de observación inválida.');
  const reasonCode=REASONS.has(record.reason_code)?record.reason_code:undefined;
  const duration=record.duration_ms===null||record.duration_ms===undefined?undefined:Number(record.duration_ms);
  if(duration!==undefined&&(!Number.isFinite(duration)||duration<0))throw new Error('Duración de observación inválida.');
  const event={
   schema_version:'2.0',
   event_uuid:record.event_uuid,
   event_name:record.event_name,
   scope:record.scope==='ui'?'ui':'runtime',
   category:['capability','lifecycle','state_transition'].includes(record.category)?record.category:'diagnostic',
   severity:'INFO',
   outcome:'SUCCESS',
   component:'harmonia-observability',
   correlation_id:sessionId,
   sequence:index+1,
   session_id:sessionId,
   client_time:clientTime,
   reason_code:reasonCode,
   metrics:buildMetrics(record.metrics),
   privacy_class:'ANONYMIZED_TELEMETRY'
  };
  if(duration!==undefined)event.duration_ms=duration;
  return event;
 }
 function summarize(events){
  const countBy=key=>events.reduce((out,event)=>{out[event[key]]=(out[event[key]]||0)+1;return out;},{});
  return {
   event_count:events.length,
   severity_counts:countBy('severity'),
   outcome_counts:countBy('outcome'),
   scope_counts:countBy('scope'),
   category_counts:countBy('category'),
   component_counts:countBy('component'),
   failure_count:events.filter(event=>event.outcome==='FAILURE'||event.severity==='CRITICAL').length,
   warning_count:events.filter(event=>event.severity==='WARN').length,
   expectation_gap_count:events.filter(event=>event.diagnostic?.satisfied===false).length
  };
 }
 function buildObservationBatch(records,options={}){
  if(!Array.isArray(records)||records.length<1||records.length>50)throw new Error('El lote debe contener entre 1 y 50 observaciones.');
  const sessionId=String(records[0]?.session_id||'');
  if(!UUID.test(sessionId))throw new Error('UUID de sesión inválido.');
  const events=records.map((record,index)=>buildEvent(record,index,sessionId));
  const extensionVersion=String(options.extensionVersion||'0.3.1').slice(0,64);
  const browserVersion=String(options.browserVersion||'unknown').slice(0,64);
  const generatedAt=validIso(options.generatedAt||new Date().toISOString());
  if(!generatedAt)throw new Error('Fecha de generación inválida.');
  return {
   schema_version:'2.0',
   batch_id:options.batchId||root.crypto.randomUUID(),
   source:'harmonia-extension',
   extension_version:extensionVersion,
   session_id:sessionId,
   generated_at:generatedAt,
   first_event_at:events[0].client_time,
   last_event_at:events[events.length-1].client_time,
   partial:true,
   environment:{
    browser:{name:'Chrome',version:browserVersion,user_agent:'redacted'},
    platform:'unspecified',
    language:'und',
    timezone:'UTC',
    online:options.online!==false
   },
   summary:summarize(events),
   events
  };
 }
 root.HarmoniaRemoteSync={buildObservationBatch,buildMetrics};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.HarmoniaRemoteSync;
})(typeof globalThis!=='undefined'?globalThis:this);
