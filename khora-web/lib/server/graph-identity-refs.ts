import {IDENTITY_PROMPT,validateIdentities,type IdentityPair,type Proposal} from "../graph-twins";
export const IDENTITY_REFERENCE_PROMPT=IDENTITY_PROMPT.split("Devuelve JSON")[0]+`Devuelve JSON {"matches":[{"pair_id":"ID recibido","reason":"sustento adicional en ambos contextos, no solo el nombre","left_context_ref":"left","right_context_ref":"right"}]}. Cada pair_id remite exclusivamente a los dos contextos de ese par. Cita ambos mediante sus referencias left y right; el servidor enlazará sus textos literales íntegros, sin pedirte recopiarlos. Citar un contexto no demuestra identidad: exige el mismo sustento adicional más allá del nombre y omite el par si es incierto. No produzcas evidencia nueva. Una lista vacía es válida. No hay número deseado de fusiones ni de comunidades.`;
export function identityReferenceInput(pairs:IdentityPair[]){return pairs.map(p=>({pair_id:p.id,left:{context_ref:"left",label:p.left.label,context:p.left.relation.quote,source:p.left.relation.source},right:{context_ref:"right",label:p.right.label,context:p.right.relation.quote,source:p.right.relation.source}}));}
export function validateIdentityReferences(raw:unknown,pairs:IdentityPair[],proposals:Proposal[]){
 if(!raw||typeof raw!=="object"||!Array.isArray((raw as {matches?:unknown}).matches))throw Error("invalid_extraction_identity_reference_shape");
 const matches=(raw as {matches:unknown[]}).matches.map(value=>{
  const m=value as Record<string,unknown>;
  if(!m||typeof m.pair_id!=="string"||typeof m.reason!=="string"||!m.reason.trim()||m.left_context_ref!=="left"||m.right_context_ref!=="right")throw Error("invalid_extraction_identity_reference");
  const pair=pairs.find(p=>p.id===m.pair_id);if(!pair)throw Error("invalid_extraction_identity_pair");
  return {pair_id:pair.id,reason:m.reason,left_evidence:pair.left.relation.quote,right_evidence:pair.right.relation.quote};
 });
 return validateIdentities({matches},pairs,proposals);
}
