import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBinomialBenchmark } from './benchmark-analyzer.mjs';

const run=(overrides={})=>({
 provider_path:'chatgpt_local_codex',diagnosis_correct:true,local_confidence:0.45,
 local_decision:'groq_analysis',groq_invoked:false,accepted:true,
 critical_regressions:0,accepted_unique_findings:0,false_positives:0,
 unsupported_claims:0,input_tokens:100,output_tokens:40,cost_usd:0,...overrides
});
const dataset=pairFactory=>({
 schema:'harmonia.binomial-benchmark-dataset.v1',protocol_version:'2.0',
 benchmark_id:'BENCH-GROQ-001',state:'complete',
 cases:Array.from({length:5},(_,i)=>({case_id:'CASE-0'+(i+1),task_class:'diagnostic',status:'verified'})),
 pairs:Array.from({length:10},(_,i)=>{
  const caseId='CASE-0'+(Math.floor(i/2)+1);
  return {
   pair_id:'PAIR-'+String(Math.floor(i/2)+1).padStart(2,'0')+'-R'+((i%2)+1),
   case_id:caseId,repetition:(i%2)+1,baseline:run(),
   binomial:run({provider_path:'chatgpt_groq_codex',groq_invoked:true}),
   verification:{root_cause_verified:true,paired_inputs_equal:true,record_reviewed:true,verified_by:'independent-reviewer'},
   ...pairFactory(i,caseId)
  };
 })
});

test('keeps Groq when at least three cases yield accepted unique findings',()=>{
 const data=dataset(i=>({binomial:run({provider_path:'chatgpt_groq_codex',groq_invoked:true,accepted_unique_findings:i<6?1:0})}));
 const result=analyzeBinomialBenchmark(data);
 assert.equal(result.decision,'KEEP_GROQ_SELECTIVELY');
 assert.equal(result.sample.casesWithAcceptedUniqueGroqFindings,3);
 assert.ok(result.recommendations.includes('RECALIBRATE_COGNITIVE_ROUTER_BY_CONFIDENCE_BAND_AND_TASK_CLASS'));
});
test('keeps Groq when diagnosis accuracy improves by at least ten points',()=>{
 const data=dataset(i=>({baseline:run({diagnosis_correct:i<5}),binomial:run({provider_path:'chatgpt_groq_codex',groq_invoked:true,diagnosis_correct:true})}));
 assert.equal(analyzeBinomialBenchmark(data).decision,'KEEP_GROQ_SELECTIVELY');
});
test('does not integrate Groq when the verified experiment has no measurable non-temporal benefit',()=>{
 const data=dataset(()=>({binomial:run({provider_path:'chatgpt_groq_codex',groq_invoked:true})}));
 assert.equal(analyzeBinomialBenchmark(data).decision,'DISABLE_GROQ_FOR_TESTED_CLASSES');
});
test('critical regressions veto integration even when Groq had unique findings',()=>{
 const data=dataset(i=>({binomial:run({provider_path:'chatgpt_groq_codex',groq_invoked:true,accepted_unique_findings:i<6?1:0,critical_regressions:i===0?1:0})}));
 assert.equal(analyzeBinomialBenchmark(data).decision,'DO_NOT_INTEGRATE_GROQ');
});
test('requires five real verified cases and ten verified pairs before deciding',()=>{
 const data=dataset(()=>({}));data.pairs=data.pairs.slice(0,8);
 assert.equal(analyzeBinomialBenchmark(data).decision,'INSUFFICIENT_EVIDENCE');
});
test('rejects duplicate pair identifiers and malformed records',()=>{
 const data=dataset(()=>({}));data.pairs[1].pair_id=data.pairs[0].pair_id;
 assert.throws(()=>analyzeBinomialBenchmark(data),/binomial_benchmark_pair_invalid/);
});
test('reports the confidence band where accepted Groq findings occur',()=>{
 const data=dataset(i=>({binomial:run({provider_path:'chatgpt_groq_codex',groq_invoked:true,local_confidence:0.3,accepted_unique_findings:i<6?1:0})}));
 const result=analyzeBinomialBenchmark(data);
 assert.equal(result.confidenceBands.low.acceptedUniqueCases,3);
 assert.equal(result.confidenceBands.low.groqInvoked,10);
});
test('stratifies the recommendation by task class rather than hiding it in the aggregate',()=>{
 const data=dataset(i=>({binomial:run({provider_path:'chatgpt_groq_codex',groq_invoked:true,accepted_unique_findings:i<6?1:0})}));
 const result=analyzeBinomialBenchmark(data);
 assert.equal(result.byTaskClass.diagnostic.cases,5);
 assert.equal(result.byTaskClass.diagnostic.decision,'KEEP_GROQ_FOR_CLASS');
});
test('rejects all legacy processing-time fields under Metacanon section 52',()=>{
 for(const key of ['total_ms','analysis_ms','codex_ms','groq_latency_ms','duration_ms','elapsed_ms','median_ms','time_to_acceptance_ms']){
  const data=dataset(()=>({}));
  data.pairs[0].baseline[key]=100;
  assert.throws(()=>analyzeBinomialBenchmark(data),/benchmark_temporal_fields_disabled_by_metacanon_52/);
 }
});
test('does not expose temporal metrics in its analysis result',()=>{
 const result=analyzeBinomialBenchmark(dataset(()=>({})));
 assert.equal(result.schema,'harmonia.binomial-benchmark-analysis.v2');
 const forbidden=/duration|elapsed|latency|total_ms|median.*time|time.*reduction|time_to_acceptance/i;
 assert.equal(forbidden.test(JSON.stringify(result)),false);
});
