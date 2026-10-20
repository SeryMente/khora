/** Repository consistency gate: no network, database, corpus or secrets. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import registry from '../contracts/corpus-autobiografico/current.json' with {type:'json'};
import {renderTypes} from '../contracts/corpus-autobiografico/generate-types.mjs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p,root),'utf8');
const dir='contracts/corpus-autobiografico/';
assert.equal(createHash('sha256').update(read(dir+registry.schema_file)).digest('hex'),registry.schema_sha256,'SCHEMA_INTEGRITY_DRIFT');
assert.equal(read(dir+'index.d.mts'),renderTypes(),'GENERATED_TYPES_DRIFT');
for (const path of ['docs/frentes/universo-datos/ESPECIFICACION-UNIVERSO-DATOS.md',
 'docs/frentes/universo-datos/ESPECIFICACION-CORPUS-AUTOBIOGRAFICO.md',
 'docs/frentes/universo-datos/ARQUITECTURA-Y-CONTRATO.md',dir+'README.md'])
 assert.ok(read(path).includes(`<!-- CORPUS_SPEC_VERSION=${registry.spec_version}; CORPUS_SCHEMA_VERSION=${registry.current_schema_version} -->`),'DOCUMENT_VERSION_DRIFT:'+path);
const spec=read('docs/frentes/universo-datos/ESPECIFICACION-CORPUS-AUTOBIOGRAFICO.md');
for(const name of registry.canonical_names) assert.ok(spec.toLowerCase().includes(name),'CANONICAL_NAME_DRIFT');
assert.ok(read('AGENTS.md').includes('contracts/corpus-autobiografico/current.json'),'DISCOVERY_RULE_MISSING');
const pkg=JSON.parse(read('khora-web/package.json'));
assert.ok(pkg.scripts['test:unit'].startsWith('npm run corpus:check && '),'BUILD_GATE_NOT_CONNECTED');
assert.ok(read('.github/workflows/ci.yml').includes('node ../scripts/check_autobiographical_corpus.mjs'),'CI_GATE_NOT_CONNECTED');
const result=spawnSync(process.execPath,['--test',fileURLToPath(new URL(dir+'contract.test.mjs',root))],{stdio:'inherit',timeout:30000});
if(result.error || result.status !== 0) process.exit(1);
console.log(JSON.stringify({status:'REFERENCE_CONTRACT_CHECKS_PASSED',spec_version:registry.spec_version,schema_version:registry.current_schema_version,scope:'synthetic structural contract; not production acceptance'}));
