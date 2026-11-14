'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'history-bridge.js'),'utf8');
const content=fs.readFileSync(path.join(__dirname,'content.js'),'utf8');

function harness(){
  const listeners=new Map(),events=[],calls=[];
  const history={
    pushState(...args){calls.push({method:'pushState',args,receiver:this});return 'push-result';},
    replaceState(...args){calls.push({method:'replaceState',args,receiver:this});return 'replace-result';}
  };
  const window={
    history,
    addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(listener);},
    dispatchEvent(event){events.push(event);for(const listener of listeners.get(event.type)||[])listener.call(this,event);return true;}
  };
  class FakeEvent{constructor(type){this.type=type;}}
  const context={window,Event:FakeEvent,queueMicrotask};
  vm.runInNewContext(source,context,{filename:'history-bridge.js'});
  return {window,history,events,calls,listeners,context};
}

test('synthetic: pushState and replaceState emit a generic navigation signal without URL/state payload',async()=>{
  const h=harness();
  const state={privateState:'not-exported'};
  assert.equal(h.history.pushState(state,'','/c/conversation-a'),'push-result');
  assert.equal(h.history.replaceState(state,'','/c/conversation-b'),'replace-result');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls.length,2);
  assert.equal(h.calls[0].receiver,h.history);
  assert.equal(h.calls[1].receiver,h.history);
  assert.deepEqual(h.events.map(event=>event.type),['harmonia:history-change','harmonia:history-change']);
  for(const event of h.events)assert.deepEqual(Object.keys(event),['type']);
});

test('synthetic: repeated installation does not wrap History methods twice',async()=>{
  const h=harness();
  vm.runInNewContext(source,h.context,{filename:'history-bridge.js'});
  h.history.pushState({},'','/c/one');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls.length,1);
  assert.equal(h.events.length,1);
  assert.equal(h.listeners.size,0);
});

test('synthetic: content script restarts cycle identity only after an in-memory pathname change',()=>{
  assert.ok(content.includes("window.addEventListener(HISTORY_NAVIGATION_EVENT,handleNavigationChange,true);"));
  assert.ok(content.includes("const nextRoutePath=window.location.pathname;"));
  assert.ok(content.includes("if(routeChanged){"));
  assert.ok(content.includes("stopActivityObservation();"));
  assert.ok(content.includes("startActivityObservation();"));
  assert.ok(content.includes("H.lastFingerprint=null;"));
  assert.ok(!content.includes('window.location.href'));
  assert.ok(content.includes("window.addEventListener('popstate',handleNavigationChange,true);"));
  assert.ok(content.includes("window.addEventListener('hashchange',handleNavigationChange,true);"));
});