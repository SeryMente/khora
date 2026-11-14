import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runScenario,runEngineeringCycle,SCENARIO_IDS} from './scenario-runner.mjs';

const resultFor=scenario_id=>({schema:'harmonia.dev-triage-result.v1',scenario_id});
const tap=({tests=1,pass=tests,fail=0,skipped=0,todo=0}={})=>[
 'TAP version 13',`1..${tests}`,`# tests ${tests}`,`# pass ${pass}`,
 `# fail ${fail}`,`# skipped ${skipped}`,`# todo ${todo}`
].join('\n');

test('unknown scenario identifiers fail closed before process launch',()=>{
 let launched=false;
 const output=runScenario({result:resultFor('ROOT_NOT_FOUND; do-anything'),spawnSyncImpl:()=>{launched=true;}});
 assert.equal(launched,false);
 assert.equal(output.status,'rejected');
 assert.equal(output.reason,'scenario_id_unknown');
});

test('insufficient evidence is a no-op and launches no process',()=>{
 let launched=false;
 const output=runScenario({result:resultFor('INSUFFICIENT_EVIDENCE'),spawnSyncImpl:()=>{launched=true;}});
 assert.equal(launched,false);
 assert.equal(output.status,'not_run');
 assert.equal(output.reason,'insufficient_evidence');
});

test('allowlisted scenarios use fixed argv rooted at the Harmonia workspace',()=>{
 let invocation;
 const output=runScenario({
  result:resultFor('USER_NODE_MISSING'),
  spawnSyncImpl:(...args)=>{invocation=args;return {status:0,stdout:tap(),stderr:'private output'};}
 });
 assert.equal(invocation[0],process.execPath);
 assert.deepEqual(invocation[1].slice(0,2),['--test','--test-name-pattern']);
 assert.match(invocation[1][2],/empty role counts/);
 assert.equal(invocation[2].shell,false);
 assert.equal(output.status,'passed');
 assert.equal(output.testCount,1);
 assert.equal(JSON.stringify(output).includes('private output'),false);
 assert.equal('durationMs' in output,false);
});

test('all fixed scenario selectors match real local structural tests',()=>{
 for(const scenarioId of SCENARIO_IDS){
  const output=runScenario({result:resultFor(scenarioId)});
  assert.equal(output.status,'passed',scenarioId+':'+output.reason);
  assert.ok(output.testCount>0,scenarioId);
 }
});

test('diagnostic child inherits only minimal OS environment, not credentials',()=>{
 const keys=['GROQ_API_KEY','EP_VAULT_CLI','HARMONIA_TEST_SECRET','NODE_TEST_CONTEXT'];
 const before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  for(const key of keys)process.env[key]='must-not-cross-process-boundary';
  let childEnv;
  runScenario({result:resultFor('ACTIVITY_NOT_OBSERVED'),spawnSyncImpl:(_exe,_args,options)=>{childEnv=options.env;return {status:0,stdout:tap(),stderr:''};}});
  for(const key of keys)assert.equal(key in childEnv,false,key);
  assert.ok(childEnv.PATH||childEnv.Path);
  assert.ok(childEnv.SystemRoot||childEnv.SYSTEMROOT);
 }finally{
  for(const key of keys){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}
 }
});

test('process timeout remains a failure status without returning timing measurements',()=>{
 const output=runScenario({result:resultFor('SINK_FAILURE'),spawnSyncImpl:()=>({status:null,signal:'SIGTERM',error:{code:'ETIMEDOUT'},stdout:tap(),stderr:'details'})});
 assert.equal(output.status,'failed');
 assert.equal(output.reason,'test_timeout');
 assert.equal('durationMs' in output,false);
 assert.equal(JSON.stringify(output).includes('details'),false);
});

test('engineering cycle uses sanitized structural evidence and does not report elapsed duration',async()=>{
 const report=JSON.parse(readFileSync(new URL('./example-diagnostic-report.json',import.meta.url),'utf8'));
 let fetchCalled=false,launchCalled=false;
 const output=await runEngineeringCycle({
  report,env:{},
  fetchImpl:async()=>{fetchCalled=true;throw new Error('network must not be called');},
  spawnSyncImpl:()=>{launchCalled=true;return {status:0,stdout:tap(),stderr:''};}
 });
 assert.equal(fetchCalled,false);
 assert.equal(output.schema,'harmonia.engineering-cycle.v2');
 assert.equal(output.triage.provider,'local-fallback');
 assert.equal(output.triage.scenario_id,'INSUFFICIENT_EVIDENCE');
 assert.equal(output.experiment.status,'not_run');
 assert.equal(launchCalled,false);
 const serialized=JSON.stringify(output);
 assert.equal(serialized.includes('durationMs'),false);
 assert.equal(serialized.includes('medianMs'),false);
});

test('runner refuses a workspace outside the fixed Harmonia root',()=>{
 let launched=false;
 const output=runScenario({result:resultFor('ACTIVITY_NOT_OBSERVED'),cwd:'C:\\Temp',spawnSyncImpl:()=>{launched=true;return {status:0,stdout:tap(),stderr:''};}});
 assert.equal(launched,false);
 assert.equal(output.status,'rejected');
 assert.equal(output.policy.reason_code,'runner_workspace_mismatch');
});
