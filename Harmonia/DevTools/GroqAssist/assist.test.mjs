import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileEvidence, fallbackTriage, runAssist, validateModelResult, RESULT_SCHEMA } from './assist.mjs';

const baseReport=JSON.parse(readFileSync(new URL('./example-diagnostic-report.json',import.meta.url),'utf8'));
const reportFixture=()=>structuredClone(baseReport);
const forbidden=/duration|elapsed|latency|monotonic|meanMs|medianMs|p90Ms|cycles|cycleObserver/i;

test('compileEvidence emits only allowlisted structural activity aggregates',()=>{
 const report=reportFixture();
 report.privateMessage='NEVER SEND THIS';
 report.rawPayload={conversationText:'PRIVATE MESSAGE',token:'SECRET'};
 report.diagnostics.activityObserver.instances[0].tabId=77;
 report.diagnostics.activityObserver.instances[0].sessionId='PRIVATE-SESSION';
 const input=compileEvidence(report);
 assert.equal(input.schema,'harmonia.dev-triage-input.v2');
 assert.equal(input.activity.totalCount,4);
 assert.equal(input.observer.reportingTabCount,2);
 assert.equal(input.observer.visibleSignalCount,2);
 const serialized=JSON.stringify(input);
 for(const secret of ['NEVER SEND THIS','PRIVATE MESSAGE','SECRET','PRIVATE-SESSION','tabId','sessionId'])assert.equal(serialized.includes(secret),false,secret);
 assert.equal(Object.hasOwn(input,'cycles'),false);
 assert.equal(Object.keys(input).some(key=>forbidden.test(key)),false);
});

test('compiled evidence rejects no source text and includes the structural counts used by triage',()=>{
 const input=compileEvidence(reportFixture());
 assert.equal(input.observer.userMessageNodesLastSnapshot,1);
 assert.equal(input.observer.assistantMessageNodesLastSnapshot,1);
 assert.equal(input.observer.rootPresentInstances,2);
 assert.equal(input.activity.activeStates,1);
 assert.equal(input.activity.transitions.ACTIVATED,1);
});

test('fallback selector returns a deterministic result when structural activity is healthy',()=>{
 const input=compileEvidence(reportFixture());
 const result=fallbackTriage(input);
 assert.equal(result.diagnosis_code,'insufficient_evidence');
 assert.equal(result.scenario_id,'INSUFFICIENT_EVIDENCE');
});

test('fallback selects missing main region when structural root is absent',()=>{
 const report=reportFixture();
 report.diagnostics.activityObserver.totals.snapshot.mainFoundCount=0;
 const input=compileEvidence(report);
 const result=fallbackTriage(input);
 assert.equal(result.diagnosis_code,'root_missing');
 assert.equal(result.scenario_id,'ROOT_NOT_FOUND');
 assert.ok(result.evidence_refs.includes('observer.mainFoundCount'));
});

test('fallback selects missing role nodes without inferring conversation content',()=>{
 const report=reportFixture();
 report.diagnostics.activityObserver.instances=report.diagnostics.activityObserver.instances.map(item=>({
  ...item,snapshot:{...item.snapshot,lastUserMessageCount:0,lastAssistantMessageCount:0}
 }));
 const input=compileEvidence(report);
 const result=fallbackTriage(input);
 assert.equal(result.diagnosis_code,'user_node_missing');
 assert.equal(result.scenario_id,'USER_NODE_MISSING');
});

test('fallback identifies matched but non-visible allowlisted activity selectors',()=>{
 const report=reportFixture();
 report.diagnostics.activityObserver.totals.snapshot.signalPresence['stop-control']={matchingCount:2,excludedCount:2,visibleCount:0};
 const input=compileEvidence(report);
 const result=fallbackTriage(input);
 assert.equal(result.diagnosis_code,'signal_not_visible');
 assert.equal(result.scenario_id,'SIGNAL_NOT_VISIBLE');
});

test('fallback identifies an unobserved activity signal without elapsed-time inference',()=>{
 const report=reportFixture();
 report.activity={totalCount:0,activeStates:0,inactiveStates:0,transitions:{INITIALIZED:0,ACTIVATED:0,DEACTIVATED:0},lastState:null,lastTransition:null,lastCapturedAt:null};
 report.diagnostics.activityObserver.totals.observer.activityTransitions=0;
 report.diagnostics.activityObserver.totals.observer.activeTransitions=0;
 report.diagnostics.activityObserver.totals.observer.inactiveTransitions=0;
 report.diagnostics.activityObserver.totals.observer.eventSinkAttempts=2;
 report.diagnostics.activityObserver.totals.observer.eventSinkAccepted=2;
 report.diagnostics.activityObserver.totals.snapshot.signalPresence=Object.fromEntries(
  Object.keys(report.diagnostics.activityObserver.totals.snapshot.signalPresence).map(key=>[key,{matchingCount:0,excludedCount:0,visibleCount:0}])
 );
 const result=fallbackTriage(compileEvidence(report));
 assert.equal(result.diagnosis_code,'activity_not_observed');
 assert.equal(result.scenario_id,'ACTIVITY_NOT_OBSERVED');
});

test('fallback identifies event sink rejection and errors',()=>{
 const rejected=reportFixture();
 rejected.diagnostics.activityObserver.totals.observer.eventSinkRejected=1;
 rejected.diagnostics.activityObserver.totals.observer.eventSinkAccepted=1;
 const rejectedResult=fallbackTriage(compileEvidence(rejected));
 assert.equal(rejectedResult.diagnosis_code,'sink_rejected');
 assert.equal(rejectedResult.scenario_id,'SINK_FAILURE');
 const failed=reportFixture();
 failed.diagnostics.activityObserver.totals.observer.eventSinkErrors=1;
 failed.diagnostics.activityObserver.totals.observer.eventSinkAccepted=1;
 const failedResult=fallbackTriage(compileEvidence(failed));
 assert.equal(failedResult.diagnosis_code,'sink_error');
});

test('fallback identifies a mismatch between acknowledged activity transitions and the collector summary',()=>{
 const report=reportFixture();
 report.activity={totalCount:0,activeStates:0,inactiveStates:0,transitions:{INITIALIZED:0,ACTIVATED:0,DEACTIVATED:0},lastState:null,lastTransition:null,lastCapturedAt:null};
 const result=fallbackTriage(compileEvidence(report));
 assert.equal(result.diagnosis_code,'worker_or_persistence_mismatch');
 assert.equal(result.scenario_id,'WORKER_PERSISTENCE');
});

test('model result validator rejects invented scenarios and ungrounded evidence references',()=>{
 const input=compileEvidence(reportFixture());
 const base=fallbackTriage(input);
 assert.throws(()=>validateModelResult({...base,scenario_id:'RUN_ANY_COMMAND'},input),/triage_result_fields_invalid|triage_scenario_id_invalid/);
 assert.throws(()=>validateModelResult({...base,evidence_refs:['conversation.text']},input),/triage_evidence_refs_invalid/);
 assert.equal(RESULT_SCHEMA.additionalProperties,false);
});

test('runAssist uses local fallback when the API key is unavailable and emits no temporal field',async()=>{
 let called=false;
 const result=await runAssist({report:reportFixture(),env:{},fetchImpl:async()=>{called=true;throw new Error('must-not-call');}});
 assert.equal(called,false);
 assert.equal(result.provider,'local-fallback');
 assert.equal(result.fallbackReason,'api_key_unavailable');
 assert.equal(forbidden.test(JSON.stringify(result)),false);
 assert.equal('durationMs' in result,false);
});

test('runAssist sends only sanitized structural evidence and validates a strict Groq response',async()=>{
 const input=compileEvidence(reportFixture());
 const mockResult={...fallbackTriage(input),schema:'harmonia.dev-triage-result.v1'};
 let requestBody=null;
 const result=await runAssist({
  report:reportFixture(),env:{GROQ_API_KEY:'synthetic-secret'},
  fetchImpl:async(url,options)=>{
   assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
   assert.equal(options.headers.authorization,'Bearer synthetic-secret');
   requestBody=JSON.parse(options.body);
   return {ok:true,async json(){return {choices:[{message:{content:JSON.stringify(mockResult)}}],usage:{prompt_tokens:100,completion_tokens:60,total_tokens:160}};}};
  }
 });
 assert.equal(result.provider,'groq');
 assert.equal(result.model,'openai/gpt-oss-20b');
 assert.equal(requestBody.response_format.json_schema.strict,true);
 assert.equal(requestBody.stream,false);
 const serialized=JSON.stringify(requestBody);
 for(const secret of ['PRIVATE','NEVER SEND THIS','SECRET_SENTINEL','cycles','durationMs','meanMs'])assert.equal(serialized.includes(secret),false,secret);
 assert.equal(forbidden.test(JSON.stringify(result)),false);
 assert.equal('durationMs' in result,false);
});

test('runAssist refuses external analysis when evidence is insufficient',async()=>{
 const report=reportFixture();
 report.diagnostics.activityObserver.reportingTabCount=0;
 report.diagnostics.activityObserver.totals.snapshot.snapshotCount=0;
 report.diagnostics.activityObserver.totals.snapshot.mainFoundCount=0;
 report.diagnostics.activityObserver.instances=[];
 let called=false;
 const result=await runAssist({report,env:{GROQ_API_KEY:'synthetic-secret'},fetchImpl:async()=>{called=true;throw new Error('must-not-call');}});
 assert.equal(called,false);
 assert.equal(result.routing.route,'collect_more_evidence');
 assert.equal(result.routing.invokeGroq,false);
});

test('runAssist uses local deterministic routing when main is absent',async()=>{
 const report=reportFixture();
 report.diagnostics.activityObserver.totals.snapshot.mainFoundCount=0;
 let called=false;
 const result=await runAssist({report,env:{GROQ_API_KEY:'synthetic-secret'},fetchImpl:async()=>{called=true;throw new Error('must-not-call');}});
 assert.equal(called,false);
 assert.equal(result.provider,'local-fallback');
 assert.equal(result.result.scenario_id,'ROOT_NOT_FOUND');
 assert.equal(result.routing.route,'local_deterministic');
});
