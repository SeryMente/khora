import assert from 'node:assert/strict';
import test from 'node:test';
import {validateAutobiographicalUnit as validate, parseForConsumer, CONTRACT_ID, CURRENT_SCHEMA_VERSION} from './index.mjs';
import fixture from './fixtures/synthetic-unit.json' with {type:'json'};
const copy = () => structuredClone(fixture);
const pin = () => ({contract_id:CONTRACT_ID,schema_version:CURRENT_SCHEMA_VERSION});
test('synthetic valid unit, repeatable, with no mutation', () => {
  const before = JSON.stringify(fixture);
  assert.equal(validate(fixture).valid,true); assert.equal(validate(fixture).valid,true);
  const parsed = parseForConsumer(fixture,pin()); parsed.content='changed';
  assert.equal(JSON.stringify(fixture),before);
});
for (const [name,mutate] of [
 ['stale version',x=>x.schema_version='0.0.9'],['future version',x=>x.schema_version='0.2.0'],
 ['malformed version',x=>x.schema_version='0.1.x'],['wrong contract',x=>x.contract_id='other'],
 ['missing source',x=>delete x.source],['unknown field',x=>x.secret='SYNTHETIC-DO-NOT-ECHO'],
 ['unknown nested field',x=>x.governance.allow_everything=true],
 ['boolean revision',x=>x.revision=true],['unsafe integer',x=>x.revision=9007199254740992],
 ['blank content',x=>x.content='  '],['missing source hash',x=>delete x.source.sha256],
 ['source hash malformed',x=>x.source.sha256='x'],['hash trailing newline',x=>x.source.sha256+='\n'],['identifier trailing newline',x=>x.unit_id+='\n'],['empty anchor',x=>x.anchor.end=0],
 ['wrong coordinate',x=>x.anchor.coordinates='guessed'],['audio byte anchor',x=>x.source.medium='audio'],
 ['image text anchor',x=>x.source.medium='image'],['source missing subject',x=>delete x.subject.subject_ref],
 ['ambiguous accepted subject',x=>x.subject.attribution='ambiguous'],
 ['unverified accepted source',x=>x.source.integrity='pending'],
 ['excluded accepted unit',x=>x.eligibility='excluded'],
 ['system fakes human judgment',x=>x.review.actor_kind='system'],
 ['missing human receipt',x=>delete x.review.actor_ref],
 ['stale judgment',x=>x.source.revision=2],['missing decided time',x=>delete x.review.decided_at],
 ['impossible date',x=>x.captured_at='2026-02-30T00:00:00Z'],
 ['naive timezone',x=>x.captured_at='2026-01-01T00:00:00'],
 ['expiry omitted',x=>delete x.governance.expires_at],['expiry before capture',x=>x.governance.expires_at=x.captured_at],
 ['known event without description',x=>x.event_time.status='known'],
 ['whole resource nonzero range',x=>x.anchor.coordinates='whole_resource'],
 ['public corpus',x=>x.governance.sensitivity='public'],
 ['sensitive label as identifier',x=>x.governance.owner_ref='person@example.test'],
]) test('rejects '+name,()=>{const value=copy();mutate(value);const result=validate(value);assert.equal(result.valid,false);assert.throws(()=>parseForConsumer(value,pin()),/INVALID_AUTOBIOGRAPHICAL_UNIT/);assert.ok(!JSON.stringify(result).includes('SYNTHETIC-DO-NOT-ECHO'));});
for (const value of [null,[],true,'text',1]) test('rejects nonobject '+JSON.stringify(value),()=>assert.equal(validate(value).valid,false));
test('candidate may retain ambiguous attribution and no human decision',()=>{
 const x=copy();x.review={status:'proposed'};x.eligibility='candidate';x.subject={attribution:'ambiguous'};x.source.integrity='pending';assert.equal(validate(x).valid,true);
});
test('whole audio reference and unknown time remain representable',()=>{
 const x=copy();x.source.medium='audio';x.anchor={coordinates:'whole_resource',start:0,end:0};assert.equal(validate(x).valid,true);
});
test('source version is not automatically advanced with a unit revision',()=>{
 const x=copy();x.revision=3;assert.equal(validate(x).valid,true);
});
test('consumer pins exact current version, not matching prefix',()=>{
 for (const version of ['0.0.9','0.1.1','1.0.0','0.1.x']) assert.throws(()=>parseForConsumer(fixture,{contract_id:CONTRACT_ID,schema_version:version}),/CONSUMER_VERSION_MISMATCH/);
 assert.throws(()=>parseForConsumer(fixture,{contract_id:'other',schema_version:CURRENT_SCHEMA_VERSION}),/CONSUMER_VERSION_MISMATCH/);
});
test('valid reference is not access authorization or cryptographic evidence',()=>{
 const x=copy();x.governance.policy_ref='policy:not-resolved';x.source.sha256='b'.repeat(64);
 assert.equal(validate(x).valid,true); // shape cannot authenticate policies, actors or source bytes
 assert.ok(!Object.hasOwn(parseForConsumer(x,pin()),'authorized'));
});
