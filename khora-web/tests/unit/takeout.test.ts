/** Existing test runner discovers .test.ts. Child receives NO production secrets. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('Takeout isolated transfer and Google authorization regression suite',()=>{
 const files=['takeout-transfer.test.mjs','takeout-google-auth.test.mjs','takeout-auth-store.test.mjs'].map(name=>fileURLToPath(new URL(name,import.meta.url)));
 const result=spawnSync(process.execPath,['--test',...files],{
  // Deliberately allowlist instead of spreading process.env. Cipher tests create
  // a random synthetic key and reject any inherited X_KHORA_KEY.
  env:{PATH:process.env.PATH??'',NODE_NO_WARNINGS:'1'},
  encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,
 });
 assert.equal(result.error,undefined,'Takeout child runtime failed or timed out');
 assert.equal(result.status,0,`Synthetic Takeout suite failed: ${result.stdout}\n${result.stderr}`);
 assert.match(result.stdout,/tests 88/);assert.match(result.stdout,/pass 88/);
 assert.match(result.stdout,/fail 0/);assert.match(result.stdout,/skipped 0/);
});
