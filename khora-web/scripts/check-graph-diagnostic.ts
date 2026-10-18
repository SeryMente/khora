import assert from 'node:assert/strict';
import {graphProviderDiagnostic,graphSafeFailure} from '../lib/server/graph-diagnostic';
(async()=>{
 const originalFetch=globalThis.fetch;const keys=['GROQ_API_KEY','GROQ_GRAPH_MODEL','GROQ_PULIDO_MODEL'];const saved=keys.map(k=>process.env[k]);
 try{
 for(const k of keys)delete process.env[k];let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('unexpected_fetch');};
 assert.equal((await graphProviderDiagnostic()).status,'graph_provider_not_configured');assert.equal(calls,0);
 process.env.GROQ_API_KEY='isolated-test-key';process.env.GROQ_GRAPH_MODEL='isolated-test-model';
 globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://api.groq.com/openai/v1/models');assert.equal(init?.body,undefined);assert.equal(init?.method,undefined);return new Response(JSON.stringify({data:[{id:'isolated-test-model'}]}),{status:200});};
 assert.equal((await graphProviderDiagnostic()).status,'provider_model_available');
 globalThis.fetch=async()=>new Response(JSON.stringify({data:[]}),{status:200});assert.equal((await graphProviderDiagnostic()).status,'graph_provider_model_unavailable');
 globalThis.fetch=async()=>new Response('{}',{status:401});assert.equal((await graphProviderDiagnostic()).status,'graph_provider_http_401');
 globalThis.fetch=async()=>{throw new DOMException('timeout','TimeoutError');};assert.equal((await graphProviderDiagnostic()).status,'graph_provider_diagnostic_timeout');
 assert.equal(graphSafeFailure(new Error('graph_provider_http_429')),'graph_provider_http_429');assert.equal(graphSafeFailure(new Error('graph_secret text with whitespace')),'graph_operation_failed');assert.equal(graphSafeFailure(new Error('private source contents')),'graph_operation_failed');
 console.log('DIAGNOSTIC_CHECKS_PASSED: no texts, missing key, model present/absent, HTTP error, timeout, safe errors');
 }finally{globalThis.fetch=originalFetch;keys.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});}
})().catch(()=>{console.error('DIAGNOSTIC_CHECK_FAILED');process.exitCode=1;});
