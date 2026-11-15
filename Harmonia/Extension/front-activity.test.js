'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const activity=require('./front-activity');

test('canonicalizes a ChatGPT conversation URL and removes query and fragment',()=>{
 const result=activity.parseConversationUrl('https://chatgpt.com/c/6af63886-1a9c-83e8-a5ae-448392d6d61d?model=gpt#message');
 assert.deepEqual(result,{
  conversationId:'6af63886-1a9c-83e8-a5ae-448392d6d61d',
  url:'https://chatgpt.com/c/6af63886-1a9c-83e8-a5ae-448392d6d61d'
 });
});

test('accepts GPT-scoped conversation paths but stores no query or fragment',()=>{
 const result=activity.parseConversationUrl('https://chatgpt.com/g/11111111-2222-4333-8444-555555555555/c/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee?x=1');
 assert.equal(result.conversationId,'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
 assert.equal(result.url,'https://chatgpt.com/g/11111111-2222-4333-8444-555555555555/c/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
});

test('rejects URLs outside the exact ChatGPT conversation route',()=>{
 for(const value of [
  'http://chatgpt.com/c/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'https://chatgpt.com.evil/c/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'https://chatgpt.com/share/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'https://chatgpt.com/c/not-a-uuid'
 ]) assert.equal(activity.parseConversationUrl(value),null);
});

test('uses a compact Todoist-style relative label for recent updates',()=>{
 assert.equal(activity.relativeAgeLabel('2026-11-13T16:50:00.000Z',new Date('2026-11-13T18:50:00.000Z')),'hace 2 h');
});

test('labels a previous weekend distinctly in the configured local timezone',()=>{
 assert.equal(activity.relativeAgeLabel('2026-11-07T19:42:52.000Z',new Date('2026-11-13T18:50:00.000Z')),'fin de semana pasado · sábado');
});

test('labels the same weekday in the previous week distinctly',()=>{
 assert.equal(activity.relativeAgeLabel('2026-11-06T21:38:23.000Z',new Date('2026-11-13T19:17:12.000Z')),'viernes pasado · tarde');
});

test('filters on rolling time windows and keeps only the latest conversation per front',()=>{
 const now=new Date('2026-11-13T18:50:00.000Z');
 const rows=[
  {frontId:'harmonia',updatedAt:'2026-11-13T16:50:00.000Z',conversationUrl:'https://chatgpt.com/c/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'},
  {frontId:'harmonia',updatedAt:'2026-11-12T16:50:00.000Z',conversationUrl:'https://chatgpt.com/c/bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee'},
  {frontId:'dictado',updatedAt:'2026-11-06T21:38:23.000Z',conversationUrl:'https://chatgpt.com/c/cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee'}
 ];
 assert.deepEqual(activity.latestPerFront(rows,'24h',now).map(row=>row.frontId),['harmonia']);
 assert.deepEqual(activity.latestPerFront(rows,'48h',now).map(row=>row.frontId),['harmonia']);
 assert.deepEqual(activity.latestPerFront(rows,'7d',now).map(row=>row.frontId),['harmonia','dictado']);
});
