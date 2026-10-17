// @l0 L0-002 · @req VIZ-01/REQ-1 · Presentation regression checks.
import test from "node:test";
import assert from "node:assert/strict";
import {layoutPublishedCommunities,CARD_WIDTH,CARD_HEIGHT} from "../../lib/graph-presentation";
test("layout uses canonical published membership, never numeric hash", () => {
 const ns=[{id:"a",communityId:"x",community:9},{id:"b",communityId:"y",community:9},{id:"c",community:9}];
 const before=JSON.stringify(ns); const r=layoutPublishedCommunities(ns,[]);
 assert.equal(r.communityCount,2);assert.notEqual(r.presentation.get("a")!.label,r.presentation.get("b")!.label);
 assert.equal(r.presentation.get("c")!.label,"Sin comunidad publicada");assert.equal(JSON.stringify(ns),before);
});
test("layout is deterministic across input order and retains every entity",()=>{
 const ns=[{id:"a",communityId:"x"},{id:"b",communityId:"x"},{id:"c",communityId:"y"}];
 const es=[{id:"ab",source:"a",target:"b"},{id:"cross",source:"b",target:"c"}];
 const x=layoutPublishedCommunities(ns,es),y=layoutPublishedCommunities([...ns].reverse(),[...es].reverse());
 assert.deepEqual([...x.positions],[...y.positions]);assert.equal(x.positions.size,ns.length);
 const ps=[...x.positions.values()];for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
  assert(ps[i].x+CARD_WIDTH<=ps[j].x||ps[j].x+CARD_WIDTH<=ps[i].x||ps[i].y+CARD_HEIGHT<=ps[j].y||ps[j].y+CARD_HEIGHT<=ps[i].y);
 }
});
test("empty and isolated entities are valid, no invented community",()=>{
 assert.equal(layoutPublishedCommunities([],[]).positions.size,0);
 const r=layoutPublishedCommunities([{id:"a"},{id:"b"}],[{id:"bad",source:"a",target:"missing"}]);
 assert.equal(r.communityCount,0);assert.equal(r.positions.size,2);
});
