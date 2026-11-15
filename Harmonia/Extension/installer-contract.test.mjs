import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const manifest=JSON.parse(read('Extension/manifest.json'));
const build=JSON.parse(read('Extension/build-info.json'));

test('manifest and build metadata are aligned at 0.6.0 with a source revision',()=>{
 assert.equal(manifest.version,'0.6.0');
 assert.equal(build.version,manifest.version);
 assert.match(build.sourceRevision,/^[a-f0-9]{40}$/);
 assert.deepEqual(manifest.content_scripts[0].js,['activity-observer.js','surface-catalog.js','content.js']);
 assert.equal(manifest.content_scripts.some(script=>script.js.includes('cycle-observer.js')),false);
});

test('initializer requires activity contracts and starts only collector 0.6.0',()=>{
 const script=read('INICIAR-HARMONIA.ps1');
 assert.match(script,/activity-observer\.js/);
 assert.match(script,/activity-telemetry\.js/);
 assert.match(script,/manifest\.version -ne '0\.6\.0'/);
 assert.match(script,/collectorVersion -eq '0\.6\.0'/);
 assert.doesNotMatch(script,/cycle-observer\.js/);
 assert.doesNotMatch(script,/cycle-telemetry\.js/);
 assert.match(script,/\/shutdown/);
 assert.match(script,/SERVICE=UPGRADED/);
});

test('starter creates local credentials and the repository ignores that credential file',()=>{
 const script=read('INICIAR-HARMONIA.ps1');
 const gitignore=read('.gitignore');
 assert.match(script,/local-auth\.js/);
 assert.match(script,/RandomNumberGenerator/);
 assert.match(gitignore,/\/Extension\/local-auth\.js/);
});

test('start and stop scripts resolve the same fila4 data profile under both approved identities',()=>{
 const start=read('INICIAR-HARMONIA.ps1');
 const stop=read('DETENER-HARMONIA.ps1');
 for(const identity of ['CENTRAL\\fila4','CENTRAL\\MantenimientoRCI']){
  assert.ok(start.includes(identity),identity);
  assert.ok(stop.includes(identity),identity);
 }
 assert.ok(start.includes(String.raw`C:\Users\fila4\AppData\Local`));
 assert.ok(stop.includes(String.raw`C:\Users\fila4\AppData\Local`));
 assert.doesNotMatch(stop,/\$env:LOCALAPPDATA/);
});
