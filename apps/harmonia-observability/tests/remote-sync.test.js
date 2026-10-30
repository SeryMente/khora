'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {buildObservationBatch,buildMetrics}=require('../extension/remote-sync.js');

const session='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const eventId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function observation(overrides={}){
 return {
  event_uuid:eventId,event_name:'harmonia.ui.surface.scan',
  session_id:session,correlation_id:session,
  scope:'ui',category:'capability',severity:'INFO',outcome:'SUCCESS',
  component:'harmonia-observability',client_time:'2026-10-30T12:00:00.000Z',
  reason_code:'surface_scan',
  metrics:{
   source_ordinal:7,surface_fingerprint:'a'.repeat(64),catalog_version:'1.2.0',
   feature_ids:['chat.thread','composer.input'],control_count:12,node_count:40,
   stylesheet_count:5,viewport_width:1280,viewport_height:800,
   device_pixel_ratio:1,deduplicated:false,
   private_label:'DO_NOT_TRANSMIT',message_text:'DO_NOT_TRANSMIT',
   arbitrary_path:'C:/private'
  },
  privacy_class:'ANONYMIZED_TELEMETRY',
  ...overrides
 };
}

test('creates an OBSERVATION-BATCH v2.0 with sequential events and computed summary',()=>{
 const first=observation();
 const second=observation({event_uuid:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',event_name:'harmonia.ui.surface.reused',reason_code:'surface_reused'});
 const batch=buildObservationBatch([first,second],{extensionVersion:'0.3.1',generatedAt:'2026-10-30T12:01:00.000Z'});
 assert.equal(batch.schema_version,'2.0');
 assert.equal(batch.source,'harmonia-extension');
 assert.equal(batch.privacy_class,undefined);
 assert.equal(batch.events.length,2);
 assert.deepEqual(batch.events.map(e=>e.sequence),[1,2]);
 assert.equal(batch.summary.event_count,2);
 assert.deepEqual(batch.summary.scope_counts,{ui:2});
 assert.equal(batch.events[0].metrics.source_ordinal,7);
 assert.equal(batch.events[0].metrics.private_label,undefined);
 assert.equal(batch.events[0].metrics.message_text,undefined);
 assert.equal(batch.events[0].metrics.arbitrary_path,undefined);
 assert.equal(batch.environment.browser.user_agent,'redacted');
 assert.equal(batch.environment.language,'und');
 assert.equal(batch.partial,true);
});

test('rejects event batches that mix sessions',()=>{
 const second=observation({event_uuid:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',session_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',correlation_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'});
 assert.throws(()=>buildObservationBatch([observation(),second]),/sesiones o correlaciones mezcladas/);
});

test('rejects unsupported event names and malformed UUIDs',()=>{
 assert.throws(()=>buildObservationBatch([observation({event_name:'harmonia.chat.message'})]),/fuera de la lista autorizada/);
 assert.throws(()=>buildObservationBatch([observation({event_uuid:'not-a-uuid'})]),/UUID de evento remoto inválido/);
});

test('never forwards arbitrary metric keys',()=>{
 const metrics=buildMetrics({surface_fingerprint:'a'.repeat(64),control_count:9,label:'private',url:'https://example.com',cookie:'secret',feature_ids:['ok','bad id']});
 assert.deepEqual(metrics,{surface_fingerprint:'a'.repeat(64),control_count:9,feature_ids:['ok']});
});

test('rejects batches over the backend limit',()=>{
 const rows=Array.from({length:51},(_,i)=>observation({event_uuid:`eeeeeeee-eeee-4eee-8eee-${String(i+1).padStart(12,'0')}`}));
 assert.throws(()=>buildObservationBatch(rows),/entre 1 y 50/);
});
