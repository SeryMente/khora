import test from "node:test";
import assert from "node:assert/strict";
import { ObservationBatchSchema, OBSERVATION_BATCH_SCHEMA_VERSION, buildNdjson, type ObservationEvent } from "../../lib/contracts/observation-batch";

const uuid="11111111-1111-4111-8111-111111111111";
const baseEvent: ObservationEvent = {
  schema_version:"2.0",event_uuid:uuid,event_name:"CAPTURE_START",
  scope:"capture",category:"lifecycle",severity:"INFO",outcome:"SUCCESS",
  component:"tab-capture",correlation_id:uuid,sequence:1,session_id:"sess-1",
  client_time:"2026-09-30T16:00:00.000Z",duration_ms:10,reason_code:null,
  diagnostic:{expected:"recording",actual:"recording",satisfied:true},
  metrics:{bytes:123},release_sha:null,privacy_class:"ANONYMIZED_TELEMETRY"
};
function batchFor(event: ObservationEvent){
  return {
    schema_version:OBSERVATION_BATCH_SCHEMA_VERSION,batch_id:uuid,source:"harmonia-extension",
    extension_version:"0.3.4",session_id:"sess-1",generated_at:"2026-09-30T16:00:02.000Z",
    first_event_at:"2026-09-30T16:00:00.000Z",last_event_at:"2026-09-30T16:00:00.000Z",
    partial:false,release_sha:null,
    environment:{browser:{name:"Chrome",version:"154.0.0.0",user_agent:"Chrome/154"},platform:"Win32",language:"es-MX",timezone:"America/Mexico_City",online:true},
    summary:{event_count:1,severity_counts:{INFO:1},outcome_counts:{SUCCESS:1},scope_counts:{capture:1},category_counts:{lifecycle:1},component_counts:{"tab-capture":1},failure_count:0,warning_count:0,expectation_gap_count:0},
    events:[event]
  };
}

test("ObservationBatch v2 valida cobertura diagnóstica y NDJSON",()=>{
  const parsed=ObservationBatchSchema.safeParse(batchFor(baseEvent));
  assert.equal(parsed.success,true);
  assert.equal(buildNdjson([baseEvent]).split("\n").filter(Boolean).length,1);
});

test("ObservationBatch v2 rechaza métricas que intenten transportar texto o audio",()=>{
  const bad={...baseEvent,metrics:{raw_audio:"data:audio/wav;base64,AAAA"}};
  assert.equal(ObservationBatchSchema.safeParse(batchFor(bad)).success,false);
});

test("ObservationBatch v2 rechaza claves de contexto que podrían filtrar navegación o texto",()=>{
  for (const key of ["title","url","message","text","caption","content"]) {
    const bad={...baseEvent,metrics:{[key]:"x"}};
    assert.equal(ObservationBatchSchema.safeParse(batchFor(bad)).success,false,key);
  }
});

test("ObservationBatch v2 rechaza inconsistencias del resumen",()=>{
  const original=batchFor(baseEvent);
  const badCount={...original,summary:{...original.summary,event_count:2}};
  assert.equal(ObservationBatchSchema.safeParse(badCount).success,false);
  const badFirst={...original,first_event_at:"2026-09-30T16:00:01.000Z"};
  assert.equal(ObservationBatchSchema.safeParse(badFirst).success,false);
});

test("ObservationBatch v2 rechaza strings diagnósticas excesivamente largas",()=>{
  const bad={...baseEvent,metrics:{diagnostic:"x".repeat(201)}};
  assert.equal(ObservationBatchSchema.safeParse(batchFor(bad)).success,false);
});
