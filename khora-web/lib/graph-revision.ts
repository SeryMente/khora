import {canonicalJson,digest,METHOD,PIPELINE,PROMPT,PROJECTOR_VERSION, type Proposal,type HumanDecision} from "./graph-twins";
import {GRAPH_QUALITY_REFERENCE} from "./graph-quality-reference";
export function graphManifest(proposals:Proposal[],history:Proposal[],judgments:HumanDecision[],config:{model:string;identityPrompt:string;sourceStamp:string;inputPolicy:string}){
 const manifest={schema:"khora-graph-causal-manifest-v1",criterion:GRAPH_QUALITY_REFERENCE,
  generator:{pipeline:PIPELINE,projector:PROJECTOR_VERSION,method:METHOD,prompt_hash:digest(PROMPT),identity_prompt_hash:digest(config.identityPrompt),model:config.model,temperature:0},
  corpus:{source_stamp:config.sourceStamp,input_policy:config.inputPolicy},
  proposals_hash:digest(canonicalJson([...proposals].sort((a,b)=>a.id.localeCompare(b.id)))),
  replay_history_hash:digest(canonicalJson([...history].sort((a,b)=>a.id.localeCompare(b.id)))),
  ledger_hash:digest(canonicalJson(judgments))};
 return {knowledge_revision:digest(canonicalJson(manifest)),manifest};
}
