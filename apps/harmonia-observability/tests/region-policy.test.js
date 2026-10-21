'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const policy=require('../extension/region-policy.js');

test('classifies supported ChatGPT regions and rejects other origins',()=>{
 assert.equal(policy.classifyRegion('https://chatgpt.com/'),'home');
 assert.equal(policy.classifyRegion('https://chatgpt.com/c/abc123'),'conversation');
 assert.equal(policy.classifyRegion('https://chatgpt.com/c/abc123/'),'conversation');
 assert.equal(policy.classifyRegion('https://chatgpt.com/g/example'),'gpt');
 assert.equal(policy.classifyRegion('https://chatgpt.com/projects'),'project');
 assert.equal(policy.classifyRegion('https://chatgpt.com/search?q=help'),'search');
 assert.equal(policy.classifyRegion('https://chatgpt.com/share/abc'),'share');
 assert.equal(policy.classifyRegion('https://example.com/c/abc'),'other');
 assert.equal(policy.classifyRegion('http://chatgpt.com/c/abc'),'other');
 assert.equal(policy.classifyRegion('not a url'),'other');
});

test('conversation completion requires every catalog feature, five surfaces and two sessions',()=>{
 const required=['a','b','c'];
 const incomplete=policy.evaluateExploration({
  regionKey:'conversation',observedFeatureIds:['a','b'],surfaceFingerprints:['s1','s2','s3','s4','s5'],sessionIds:['session1','session2']
 },required,{regionKey:'conversation'});
 assert.equal(incomplete.complete,false);
 assert.equal(incomplete.status,'exploring');
 assert.deepEqual(incomplete.missingFeatureIds,['c']);
 const noSurfaceDiversity=policy.evaluateExploration({
  regionKey:'conversation',observedFeatureIds:required,surfaceFingerprints:['s1','s2'],sessionIds:['session1','session2']
 },required,{regionKey:'conversation'});
 assert.equal(noSurfaceDiversity.complete,false);
 const noSessionDiversity=policy.evaluateExploration({
  regionKey:'conversation',observedFeatureIds:required,surfaceFingerprints:['s1','s2','s3','s4','s5'],sessionIds:['session1']
 },required,{regionKey:'conversation'});
 assert.equal(noSessionDiversity.complete,false);
 const complete=policy.evaluateExploration({
  regionKey:'conversation',observedFeatureIds:required,surfaceFingerprints:['s1','s2','s3','s4','s5'],sessionIds:['session1','session2']
 },required,{regionKey:'conversation'});
 assert.equal(complete.status,'complete');
 assert.equal(complete.complete,true);
 assert.equal(complete.observedCount,3);
});

test('regions without a verified catalog stay unmapped, never falsely complete',()=>{
 const result=policy.evaluateExploration({regionKey:'project',observedFeatureIds:['a'],surfaceFingerprints:['1','2','3','4','5'],sessionIds:['a','b']},['a'],{regionKey:'project'});
 assert.equal(result.status,'unmapped');
 assert.equal(result.complete,false);
});

test('leader selection preserves an existing leader, then prefers active or chosen tab',()=>{
 const tabs=[{id:3,active:false},{id:2,active:true},{id:1,active:false}];
 assert.equal(policy.chooseLeader(tabs,3,1),3);
 assert.equal(policy.chooseLeader(tabs,99,1),2);
 assert.equal(policy.chooseLeader([{id:7,active:false},{id:4,active:false}],null,4),4);
 assert.equal(policy.chooseLeader([],null,null),null);
 assert.equal(policy.canObserve('exploring',false),true);
 assert.equal(policy.canObserve('complete',false),false);
 assert.equal(policy.canObserve('complete',true),true);
});
