import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileEvidence} from './assist.mjs';
import {validateEvidenceEnvelope,isEvidenceSufficient} from './evidence-validator.mjs';

const report=JSON.parse(readFileSync(new URL('./example-diagnostic-report.json',import.meta.url),'utf8'));
const valid=()=>compileEvidence(structuredClone(report));

test('accepts the activity evidence v2 contract and returns an isolated copy',()=>{
 const input=valid(),output=validateEvidenceEnvelope(input);
 assert.deepEqual(output,input);
 assert.notEqual(output,input);
 assert.notEqual(output.observer,input.observer);
 assert.equal(isEvidenceSufficient(output),true);
});

test('rejects unknown top-level and nested fields',()=>{
 const extra=valid();extra.privateText='never send';
 assert.throws(()=>validateEvidenceEnvelope(extra),/evidence_fields_invalid/);
 const nested=valid();nested.observer.rawMessage='never send';
 assert.throws(()=>validateEvidenceEnvelope(nested),/evidence_fields_invalid/);
});

test('rejects missing required properties and wrong schema versions',()=>{
 const missing=valid();delete missing.activity;
 assert.throws(()=>validateEvidenceEnvelope(missing),/evidence_fields_invalid/);
 const wrong=valid();wrong.schema='harmonia.dev-triage-input.v1';
 assert.throws(()=>validateEvidenceEnvelope(wrong),/evidence_schema_invalid/);
});

test('rejects temporal fields instead of normalizing or forwarding them',()=>{
 const input=valid();
 input.cycles={medianMs:10};
 assert.throws(()=>validateEvidenceEnvelope(input),/evidence_fields_invalid/);
 const another=valid();another.activity.durationMs=10;
 assert.throws(()=>validateEvidenceEnvelope(another),/evidence_fields_invalid/);
});

test('rejects fractional, negative, non-finite and excessive counters',()=>{
 for(const value of [-1,1.5,Number.NaN,Infinity,1_000_001]){
  const input=valid();input.observer.snapshotCount=value;
  assert.throws(()=>validateEvidenceEnvelope(input),/evidence_count_invalid/);
 }
});

test('rejects impossible signal counts and aggregate totals',()=>{
 const visible=valid();
 visible.observer.signalPresenceTotals['aria-busy'].visibleCount=visible.observer.signalPresenceTotals['aria-busy'].matchingCount+1;
 assert.throws(()=>validateEvidenceEnvelope(visible),/evidence_signal_counts_invalid/);
 const aggregate=valid();aggregate.observer.visibleSignalCount+=1;
 assert.throws(()=>validateEvidenceEnvelope(aggregate),/evidence_signal_aggregate_invalid/);
});

test('rejects impossible tab, state, transition, and coverage relationships',()=>{
 const tabs=valid();tabs.observer.reportingTabCount=tabs.observer.queriedTabCount+1;
 assert.throws(()=>validateEvidenceEnvelope(tabs),/evidence_relationship_invalid/);
 const activity=valid();activity.activity.activeStates++;
 assert.throws(()=>validateEvidenceEnvelope(activity),/evidence_activity_state_totals_invalid/);
 const transition=valid();transition.observer.activityTransitions++;
 assert.throws(()=>validateEvidenceEnvelope(transition),/evidence_relationship_invalid/);
 const coverage=valid();coverage.coverage.observedFeatureCount=coverage.coverage.featureCount+1;
 assert.throws(()=>validateEvidenceEnvelope(coverage),/evidence_relationship_invalid/);
});

test('evidence is insufficient until at least one reporting tab and one snapshot exist',()=>{
 const input=valid();input.observer.reportingTabCount=0;input.observer.snapshotCount=0;input.observer.mainFoundCount=0;
 input.observer.rootPresentInstances=0;input.observer.activityInstances=0;
 assert.equal(isEvidenceSufficient(validateEvidenceEnvelope(input)),false);
});
