'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createCycleObserver,DISABLED_REASON}=require('./cycle-observer');

test('temporal cycle observer is explicitly disabled by Metacanon 52',()=>{
  assert.equal(DISABLED_REASON,'temporal-observation-disabled-by-metacanon-52');
  assert.throws(()=>createCycleObserver({}),new RegExp(DISABLED_REASON));
});
