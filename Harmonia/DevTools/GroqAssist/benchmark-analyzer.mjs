const percent=value=>Math.round(value*1000)/10;
const confidenceBand=value=>{
 if(value===null||value===undefined)return 'unknown';
 if(value<0.5)return 'low';
 if(value<0.9)return 'medium';
 return 'high';
};
const countBy=(items,predicate)=>items.filter(predicate).length;
const TEMPORAL_KEYS=new Set([
 'total_ms','analysis_ms','codex_ms','groq_latency_ms','duration_ms','durationMs',
 'elapsed_ms','elapsedMs','monotonic_ms','monotonicMs','median_ms','medianMs',
 'p90_ms','p90Ms','mean_ms','meanMs','latency_ms','latencyMs','time_to_acceptance_ms'
]);
function rejectTemporalData(value){
 if(Array.isArray(value)){for(const item of value)rejectTemporalData(item);return;}
 if(!value||typeof value!=='object')return;
 for(const [key,child] of Object.entries(value)){
  if(TEMPORAL_KEYS.has(key))throw new TypeError('benchmark_temporal_fields_disabled_by_metacanon_52');
  rejectTemporalData(child);
 }
}
function validCount(value){return Number.isSafeInteger(value)&&value>=0&&value<=1_000_000;}
function validateDataset(dataset){
 rejectTemporalData(dataset);
 if(!dataset||dataset.schema!=='harmonia.binomial-benchmark-dataset.v1'||
  dataset.benchmark_id!=='BENCH-GROQ-001'||
  !Array.isArray(dataset.cases)||dataset.cases.length!==5||
  !Array.isArray(dataset.pairs))throw new TypeError('binomial_benchmark_dataset_invalid');
 const cases=new Map(dataset.cases.map(item=>[item.case_id,item]));
 if(cases.size!==5||[...cases.keys()].some(id=>typeof id!=='string'))throw new TypeError('binomial_benchmark_cases_not_unique');
 const pairIds=new Set();
 const repetitionsByCase=new Map([...cases.keys()].map(id=>[id,new Set()]));
 for(const pair of dataset.pairs){
  if(!pair||typeof pair.pair_id!=='string'||pairIds.has(pair.pair_id)||
   !cases.has(pair.case_id)||![1,2].includes(pair.repetition)||
   !pair.baseline||!pair.binomial||!pair.verification||
   pair.pair_id!=='PAIR-'+pair.case_id.slice(-2)+'-R'+pair.repetition)throw new TypeError('binomial_benchmark_pair_invalid');
  if(repetitionsByCase.get(pair.case_id).has(pair.repetition))throw new TypeError('binomial_benchmark_repetition_duplicate');
  repetitionsByCase.get(pair.case_id).add(pair.repetition);pairIds.add(pair.pair_id);
  for(const arm of [pair.baseline,pair.binomial]){
   if(typeof arm.accepted!=='boolean'||typeof arm.groq_invoked!=='boolean'||
    !validCount(arm.critical_regressions)||!validCount(arm.accepted_unique_findings)||
    !validCount(arm.false_positives)||!validCount(arm.unsupported_claims)||
    !validCount(arm.input_tokens)||!validCount(arm.output_tokens)||
    (typeof arm.cost_usd!=='number'||!Number.isFinite(arm.cost_usd)||arm.cost_usd<0)||
    (arm.local_confidence!==null&&
     (typeof arm.local_confidence!=='number'||!Number.isFinite(arm.local_confidence)||arm.local_confidence<0||arm.local_confidence>1))||
    (arm.diagnosis_correct!==undefined&&typeof arm.diagnosis_correct!=='boolean')){
    throw new TypeError('binomial_benchmark_run_invalid');
   }
  }
  for(const key of ['root_cause_verified','paired_inputs_equal','record_reviewed']){
   if(typeof pair.verification[key]!=='boolean')throw new TypeError('binomial_benchmark_verification_invalid');
  }
 }
 return cases;
}
function armMetrics(pairs,armName){
 const runs=pairs.map(pair=>pair[armName]);
 const verified=runs.filter(run=>typeof run.diagnosis_correct==='boolean');
 const correct=countBy(verified,run=>run.diagnosis_correct);
 const falsePositives=runs.reduce((sum,run)=>sum+run.false_positives,0);
 return {
  runs:runs.length,
  diagnosisDenominator:verified.length,
  diagnosesCorrect:correct,
  diagnosisAccuracyPct:verified.length?percent(correct/verified.length):null,
  precisionPct:correct+falsePositives?percent(correct/(correct+falsePositives)):null,
  acceptedRuns:countBy(runs,run=>run.accepted),
  acceptedUniqueFindings:runs.reduce((sum,run)=>sum+run.accepted_unique_findings,0),
  falsePositives,
  unsupportedClaims:runs.reduce((sum,run)=>sum+run.unsupported_claims,0),
  criticalRegressions:runs.reduce((sum,run)=>sum+run.critical_regressions,0),
  inputTokens:runs.reduce((sum,run)=>sum+run.input_tokens,0),
  outputTokens:runs.reduce((sum,run)=>sum+run.output_tokens,0),
  costUsd:runs.reduce((sum,run)=>sum+run.cost_usd,0)
 };
}
export function analyzeBinomialBenchmark(dataset){
 const cases=validateDataset(dataset);
 const verifiedPairs=dataset.pairs.filter(pair=>
  pair.verification.root_cause_verified===true&&
  pair.verification.paired_inputs_equal===true&&
  pair.verification.record_reviewed===true
 );
 const verifiedCases=new Set(verifiedPairs.map(pair=>pair.case_id));
 const baselineAcceptedPairs=countBy(verifiedPairs,pair=>pair.baseline.accepted===true);
 const binomialAcceptedPairs=countBy(verifiedPairs,pair=>pair.binomial.accepted===true);
 const acceptedUniqueCases=new Set(verifiedPairs.filter(pair=>
  pair.binomial.accepted===true&&pair.binomial.accepted_unique_findings>0
 ).map(pair=>pair.case_id));
 const baseline=armMetrics(verifiedPairs,'baseline');
 const binomial=armMetrics(verifiedPairs,'binomial');
 const accuracyDeltaPp=baseline.diagnosisAccuracyPct===null||binomial.diagnosisAccuracyPct===null
  ?null:Math.round((binomial.diagnosisAccuracyPct-baseline.diagnosisAccuracyPct)*10)/10;
 const precisionDropPp=baseline.precisionPct===null||binomial.precisionPct===null
  ?null:Math.round((baseline.precisionPct-binomial.precisionPct)*10)/10;
 const criticalRegressions=baseline.criticalRegressions+binomial.criticalRegressions;
 const byBand={},byTask=new Map();
 for(const pair of verifiedPairs){
  const band=confidenceBand(pair.binomial.local_confidence);
  (byBand[band]||={pairs:0,acceptedUniqueCases:new Set(),groqInvoked:0}).pairs++;
  if(pair.binomial.accepted&&pair.binomial.accepted_unique_findings>0)byBand[band].acceptedUniqueCases.add(pair.case_id);
  if(pair.binomial.groq_invoked)byBand[band].groqInvoked++;
  const taskClass=cases.get(pair.case_id).task_class||'unknown';
  const group=byTask.get(taskClass)||{pairs:[],cases:new Set(),acceptedUniqueCases:new Set()};
  group.pairs.push(pair);group.cases.add(pair.case_id);
  if(pair.binomial.accepted&&pair.binomial.accepted_unique_findings>0)group.acceptedUniqueCases.add(pair.case_id);
  byTask.set(taskClass,group);
 }
 const confidenceBands=Object.fromEntries(Object.entries(byBand).map(([band,value])=>[
  band,{pairs:value.pairs,acceptedUniqueCases:value.acceptedUniqueCases.size,groqInvoked:value.groqInvoked}
 ]));
 const byTaskClass=Object.fromEntries([...byTask.entries()].map(([taskClass,group])=>{
  const a=armMetrics(group.pairs,'baseline'),b=armMetrics(group.pairs,'binomial');
  const accuracyDelta=a.diagnosisAccuracyPct===null||b.diagnosisAccuracyPct===null
   ?null:Math.round((b.diagnosisAccuracyPct-a.diagnosisAccuracyPct)*10)/10;
  const precisionDrop=a.precisionPct===null||b.precisionPct===null
   ?null:Math.round((a.precisionPct-b.precisionPct)*10)/10;
  const classComplete=group.cases.size>=3&&group.pairs.length>=6;
  const classCritical=a.criticalRegressions+b.criticalRegressions;
  const classKeep=group.acceptedUniqueCases.size>=3||(accuracyDelta!==null&&accuracyDelta>=10);
  let decision='MORE_CASES_REQUIRED';
  if(classComplete){
   if(classCritical>0||(precisionDrop!==null&&precisionDrop>5))decision='DO_NOT_INTEGRATE_FOR_CLASS';
   else decision=classKeep?'KEEP_GROQ_FOR_CLASS':'DISABLE_GROQ_FOR_CLASS';
  }
  return [taskClass,{cases:group.cases.size,verifiedPairs:group.pairs.length,acceptedUniqueCases:group.acceptedUniqueCases.size,diagnosisAccuracyDeltaPp:accuracyDelta,precisionDropPp:precisionDrop,criticalRegressions:classCritical,decision}];
 }));
 const repetitionsPresent=[...cases.keys()].every(caseId=>
  dataset.pairs.filter(pair=>pair.case_id===caseId).map(pair=>pair.repetition).sort().join(',')==='1,2'
 );
 const complete=cases.size===5&&verifiedCases.size===5&&verifiedPairs.length===10&&repetitionsPresent;
 const noCriticalRegression=criticalRegressions===0;
 const precisionPreserved=precisionDropPp===null||precisionDropPp<=5;
 const uniqueValue=acceptedUniqueCases.size>=3;
 const accuracyGain=accuracyDeltaPp!==null&&accuracyDeltaPp>=10;
 const keep=uniqueValue||accuracyGain;
 let decision='INSUFFICIENT_EVIDENCE';
 if(complete){
  if(!noCriticalRegression||!precisionPreserved)decision='DO_NOT_INTEGRATE_GROQ';
  else decision=keep?'KEEP_GROQ_SELECTIVELY':'DISABLE_GROQ_FOR_TESTED_CLASSES';
 }
 const recommendations=[];
 if(!complete)recommendations.push('COLLECT_MORE_REAL_PAIRED_CASES');
 if(complete&&decision==='KEEP_GROQ_SELECTIVELY')recommendations.push('RETAIN_GROQ_ONLY_IN_CLASSES_WITH_VERIFIED_INCREMENTAL_VALUE');
 if(complete&&decision==='DO_NOT_INTEGRATE_GROQ')recommendations.push('REMOVE_OR_RESTRICT_GROQ_AND_INVESTIGATE_REGRESSIONS_OR_PRECISION_DROP');
 if(complete&&decision==='DISABLE_GROQ_FOR_TESTED_CLASSES')recommendations.push('KEEP_LOCAL_FALLBACK_AND_DISABLE_GROQ_IN_TESTED_CLASSES');
 if(binomial.unsupportedClaims>0||binomial.falsePositives>baseline.falsePositives)recommendations.push('TUNE_GROQ_PROMPT_SCHEMA_AND_EVIDENCE_VALIDATOR');
 if(Object.values(confidenceBands).some(value=>value.acceptedUniqueCases>0))recommendations.push('RECALIBRATE_COGNITIVE_ROUTER_BY_CONFIDENCE_BAND_AND_TASK_CLASS');
 return {
  schema:'harmonia.binomial-benchmark-analysis.v2',benchmark_id:dataset.benchmark_id,
  state:complete?'decision_ready':'insufficient_evidence',decision,
  sample:{selectedCases:cases.size,verifiedCases:verifiedCases.size,recordedPairs:dataset.pairs.length,verifiedPairs:verifiedPairs.length,baselineAcceptedPairs,binomialAcceptedPairs,casesWithAcceptedUniqueGroqFindings:acceptedUniqueCases.size},
  comparison:{baseline,binomial,diagnosisAccuracyDeltaPp:accuracyDeltaPp,precisionDropPp,criticalRegressions},
  confidenceBands,byTaskClass,recommendations
 };
}
