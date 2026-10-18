import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {digest,validateExtraction,project,PIPELINE,identityCandidates,relationFingerprint,itemFingerprint,type Proposal,type HumanDecision} from "../../lib/graph-twins";
import {graphManifest} from "../../lib/graph-revision";
import {GRAPH_QUALITY_REFERENCE} from "../../lib/graph-quality-reference";
import {sufficientEvidence,graphAnswer} from "../../lib/query-sufficiency";
const text="Ana vive en México. Ana trabaja en Khora.";
const source={volcado_id:"a",version:1,sha256:digest(text),captured_at:"2026-10-18T00:00:00Z"};
function fixture():Proposal{
 const relations=[{subject:"Ana",predicate:"vive en",object:"México",quote:"Ana vive en México.",attribution:"operador",modality:"afirmación",event_time:"no explícito"},{subject:"Ana",predicate:"trabaja en",object:"Khora",quote:"Ana trabaja en Khora.",attribution:"operador",modality:"afirmación",event_time:"no explícito"}];
 return {id:"old",source,pipeline:PIPELINE,chunks:[validateExtraction({relations},text,source)],next:text.length,length:text.length,model:"synthetic"};
}
function judgment(p:Proposal,decision:"accept"|"reject"="accept"):HumanDecision{return {proposal_id:p.id,item_id:p.chunks[0].relations[0].id,decision,actor:"u",origin:"graph-twins-review-v1",created_at:"same-time",item_fingerprint:itemFingerprint(p,p.chunks[0].relations[0].id)};}
test("homonyms within one source stay separate and become candidates only",()=>{
 const p=fixture(),g=project([p],[],"automatic","u");assert.equal(g.nodes.filter(n=>n.labels.includes("Ana")).length,2);
 assert.ok(identityCandidates([p]).some(i=>i.left.label==="Ana"&&i.right.label==="Ana"));
});
test("replay across regenerated proposal UUID requires historical exact content",()=>{
 const old=fixture(),fresh={...structuredClone(old),id:"new"},j=judgment(old);
 assert.equal(project([fresh],[j],"curated","u").edges.length,0);
 assert.equal(project([fresh],[j],"curated","u",[old]).edges.length,1);
 fresh.chunks[0].relations[0].id=digest("new transport ID");
 assert.equal(project([fresh],[j],"curated","u",[old]).edges.length,1);
 assert.equal(project([fresh],[{...j,item_fingerprint:null}],"curated","u",[old]).edges.length,0);
 assert.equal(project([fresh],[j,{...j,decision:"reject"}],"curated","u",[old]).edges.length,0);
 assert.equal(project([fresh],[{...j,actor:"someone-else"}],"curated","u",[old]).edges.length,0);
});
test("changed meaning, event time, source, position or attribution cannot inherit judgment",()=>{
 const old=fixture();for(const [key,value] of Object.entries({predicate:"no vive en",event_time:"ayer",attribution:"asistente",modality:"negación",start:99})){
  const fresh=structuredClone(old);fresh.id="new";(fresh.chunks[0].relations[0] as any)[key]=value;
  assert.equal(project([fresh],[judgment(old)],"curated","u",[old]).edges.length,0,key);
 }
 const fresh=structuredClone(old);fresh.id="new";fresh.source={...fresh.source,sha256:"different"};fresh.chunks[0].relations=fresh.chunks[0].relations.map(r=>({...r,source:fresh.source}));
 assert.equal(project([fresh],[judgment(old)],"curated","u",[old]).edges.length,0);
});
test("event time contributes to extraction ID and exact fingerprint",()=>{
 const p=fixture(),r=p.chunks[0].relations[0];const c=validateExtraction({relations:[{...r,event_time:"ayer"}]},text,source);
 assert.notEqual(r.id,c.relations[0].id);assert.notEqual(relationFingerprint(r),relationFingerprint(c.relations[0]));
});
test("conflicting payloads cannot silently share a relation ID",()=>{
 const p=fixture(),q=structuredClone(p);q.id="q";q.chunks[0].relations[0].event_time="ayer";
 assert.throws(()=>project([p,q],[],"automatic","u"),/provenance_relation_id_collision/);
});
const config={model:"model-v1",identityPrompt:"identity-v1",sourceStamp:"sources-v1",inputPolicy:"original-v1"};
test("causal revision is stable but changes with every tested input",()=>{
 const p=fixture(),j=judgment(p);const a=graphManifest([p],[p],[j],config);
 assert.deepEqual(a,graphManifest([structuredClone(p)],[p],[j],{...config}));
 for(const key of Object.keys(config)){assert.notEqual(a.knowledge_revision,graphManifest([p],[p],[j],{...config,[key]:"changed"}).knowledge_revision,key);}
 assert.notEqual(a.knowledge_revision,graphManifest([p],[p],[{...j,decision:"reject"}],config).knowledge_revision);
 const changed=structuredClone(p);changed.chunks[0].relations[0].event_time="ayer";
 assert.notEqual(a.knowledge_revision,graphManifest([changed],[p],[j],config).knowledge_revision);
 assert.notEqual(a.knowledge_revision,graphManifest([p],[],[j],config).knowledge_revision);
});
test("criterion reference names the exact committed criterion bytes",()=>{assert.equal(digest(readFileSync(new URL("../../docs/GRAPH-QUALITY-DRAFT.md",import.meta.url),"utf8")),GRAPH_QUALITY_REFERENCE.sha256);assert.match(GRAPH_QUALITY_REFERENCE.url,/\/blob\/[a-f0-9]{40}\//);});
test("insufficient, unknown, objects and missing flags never become positive",()=>{
 for(const value of ["insuficiente","Insufficient","unknown",false,undefined,null,{},[],1,"false"]){assert.equal(sufficientEvidence(value),false);}
 for(const value of [true,"suficiente"," Sufficient "]){assert.equal(sufficientEvidence(value),true);}
 assert.equal(graphAnswer({suficiencia:"insuficiente"}),"Sin evidencia suficiente para responder.");
 assert.match(graphAnswer({suficiencia:"suficiente"}),/no devolvió una respuesta generada/);
 assert.equal(graphAnswer({respuesta:"Respuesta real",suficiencia:false}),"Respuesta real");
});

import {computePayloadHash,validateProposalEnvelope,type ProposalItem} from "../../lib/contracts/proposal";
test("web proposal contract retains literal type",()=>{
 const item:ProposalItem={id:"00000000-0000-4000-8000-000000000001",kind:"literal",label:"2026",anchor:{exact_text:"2026"},candidates:[]};
 const envelope={schema_version:"1.0.0",source_triplet:{volcado_id:"00000000-0000-4000-8000-000000000002",version:1,sha256:"a".repeat(64)},pipeline_version:"synthetic",created_at:"2026-10-18T00:00:00Z",updated_at:"2026-10-18T00:00:00Z",items:[item],payload_hash:computePayloadHash([item]),judgments:[]};
 assert.deepEqual(validateProposalEnvelope(envelope),{valid:true,errors:[]});
});
