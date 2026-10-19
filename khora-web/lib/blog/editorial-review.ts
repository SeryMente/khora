/** Human editorial review, not semantic verification. Never mutates/archives a source,
 * invokes a model or grants publication. Literal quotes evidence the human's review;
 * their presence alone cannot certify truth, precision, first person or sufficiency. */
export const CRONICA_MINIMUM = [
 {id:'when',label:'Momento (puede ser aproximado)'},
 {id:'where',label:'Lugar general (sin dirección exacta)'},
 {id:'what',label:'Actividad o hecho propio'}
] as const;
export type ReviewItemId = typeof CRONICA_MINIMUM[number]['id'];
export type EditorialReview = {
 schema:1;policy:'cronica-suficiente-v1';reviewedPayloadHash:string;
 worked:true;soberFirstPerson:true;faithful:true;
 items:Array<{id:ReviewItemId;sourceQuote:string;publicQuote:string}>;
};
export type Reviewable = {
 publicationId:string;revision:number;sourceId:string;sourceVersion:number;sourceHash:string;
 kind:string;obfuscated:boolean;entry:{body:string};facebook:unknown;editorialReview?:EditorialReview;
};
export function editorialReviewPayload(r:Reviewable):unknown {
 return {publicationId:r.publicationId,revision:r.revision,sourceId:r.sourceId,sourceVersion:r.sourceVersion,
 sourceHash:r.sourceHash,kind:r.kind,obfuscated:r.obfuscated,entry:r.entry,facebook:r.facebook};
}
export function assertEditorialReview(r:Reviewable,payloadHash:string,original?:string):void {
 const e=r.editorialReview;
 if(!e||e.schema!==1||e.policy!=='cronica-suficiente-v1'||e.worked!==true||e.soberFirstPerson!==true||e.faithful!==true)throw Error('EDITORIAL_REVIEW_REQUIRED');
 if(!/^[a-f0-9]{64}$/.test(e.reviewedPayloadHash)||e.reviewedPayloadHash!==payloadHash)throw Error('EDITORIAL_REVIEW_STALE');
 if(!Array.isArray(e.items)||e.items.length!==3||new Set(e.items.map(i=>i?.id)).size!==3)throw Error('EDITORIAL_SUFFICIENCY_REQUIRED');
 for(const {id} of CRONICA_MINIMUM){
  const i=e.items.find(x=>x?.id===id);
  if(!i||typeof i.sourceQuote!=='string'||!i.sourceQuote.trim()||i.sourceQuote.length>2000||typeof i.publicQuote!=='string'||!i.publicQuote.trim()||i.publicQuote.length>2000||!r.entry.body.includes(i.publicQuote))throw Error('EDITORIAL_EVIDENCE_REQUIRED');
  if(original!==undefined&&!original.includes(i.sourceQuote))throw Error('EDITORIAL_SOURCE_EVIDENCE');
 }
 // Whitespace formatting alone was the previous literal draft, not worked public text.
 // This is a necessary transport guard, never a proof of substantive editorial quality.
 if(original!==undefined&&r.entry.body.replace(/\s/g,'')===original.replace(/\s/g,''))throw Error('EDITORIAL_TEXT_UNWORKED');
}
