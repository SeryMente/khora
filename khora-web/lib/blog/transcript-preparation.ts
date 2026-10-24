/** Pure, browser-shareable preparation, NOT publication/ratification or source verification.
 * No model, network, storage, time acquisition, credentials, Node imports or inferred facts.
 * Original UTF-16 offsets always refer to the caller's unchanged transcript version.
 */
export type LiteralSpan = Readonly<{start:number;end:number;text:string}>;
export type TranscriptDraft = Readonly<{
 body:string;titleProposal:LiteralSpan|null;paragraphs:readonly LiteralSpan[];
 method:'literal-paragraphs-v1';requiresExactPreview:true;publicAudio:false;
}>;
const error=(code:string):never=>{throw new Error(code);};
const whitespace=(s:string)=>/^\s*$/.test(s);
/** Preserves order and ALL non-whitespace characters, including attribution, negations,
 * repetitions, uncertainty, obfuscated aliases, quotation marks and emphasis markers.
 * Does NOT correct transcription, punctuation, spelling, chronology or speaker identities.
 * Paragraphs split only at existing whitespace after terminal punctuation, once target is
 * reached, or existing blank lines. A long unpunctuated utterance remains uncut.
 */
export function prepareLiteralTranscript(original:string,options:Readonly<{paragraphTarget?:number}>={}):TranscriptDraft {
 if(typeof original!=='string'||!original.trim())error('TRANSCRIPT_REQUIRED');
 if(original.length>200000)error('TRANSCRIPT_TOO_LARGE'); // no truncation
 const target=options.paragraphTarget??280;
 if(!Number.isSafeInteger(target)||target<80||target>2000)error('PARAGRAPH_TARGET_INVALID');
 const parts:LiteralSpan[]=[];
 let start=original.search(/\S/);
 const push=(end:number)=>{while(end>start&&whitespace(original[end-1]))end--;if(end>start)parts.push(Object.freeze({start,end,text:original.slice(start,end)}));};
 const gaps=/\s+/g;gaps.lastIndex=start;
 let m:RegExpExecArray|null;
 while((m=gaps.exec(original))){
  if(m.index<start)continue;
  const prior=original.slice(start,m.index);
  const existingBlank=/\n[^\S\n]*\n/.test(m[0]);
  let tail=prior.length-1;while(tail>=0&&/[”’"»)\]]/.test(prior[tail]))tail--;
  const sentenceBoundary=prior.length>=target&&tail>=0&&/[.!?…]/.test(prior[tail]);
  if(existingBlank||sentenceBoundary){push(m.index);start=m.index+m[0].length;}
 }
 push(original.length);
 if(!parts.length)error('TRANSCRIPT_REQUIRED');
 const body=parts.map(p=>p.text).join('\n\n');
 // Defence against future semantic formatting changes: only whitespace may change.
 if(body.replace(/\s/g,'')!==original.replace(/\s/g,''))error('TRANSCRIPT_LITERAL_INVARIANT');
 // A title is ONLY a literal proposal. It has no privileged truth or approval status.
 const first=parts[0],lineEnd=first.text.search(/[\r\n]/);
 let candidate=first.text.slice(0,lineEnd<0?first.text.length:lineEnd);
 const terminal=/[.!?…](?:[”’"»\)\]]*)(?=\s|$)/.exec(candidate);
 if(terminal)candidate=candidate.slice(0,terminal.index+terminal[0].length);
 if(candidate.length>160){const prefix=candidate.slice(0,161);const cut=prefix.search(/\s+\S*$/);candidate=cut>0?candidate.slice(0,cut):'';}
 candidate=candidate.trimEnd();
 const titleProposal=candidate?Object.freeze({start:first.start,end:first.start+candidate.length,text:candidate}):null;
 return Object.freeze({body,titleProposal,paragraphs:Object.freeze(parts),method:'literal-paragraphs-v1',requiresExactPreview:true,publicAudio:false});
}
/** Browser-safe additional transport guard. Does not replace authenticated server validation,
 * source hash verification, normative gate, exact revision digest or joint consent.
 * Public generator max slug is 100 (server legacy max was 120): reject, never silently rename.
 */
export function assertPagesTextCompatible(entry:unknown):void {
 if(!entry||typeof entry!=='object'||Array.isArray(entry))error('PAGES_ENTRY_INVALID');
 const e=entry as Record<string,unknown>;
 if(Object.keys(e).sort().join(',')!=='body,date,schema,slug,source,title'||e.schema!==1)error('PAGES_SCHEMA');
 if(typeof e.slug!=='string'||e.slug.length>100||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(e.slug))error('PAGES_SLUG');
 if(typeof e.title!=='string'||!e.title.trim()||e.title.length>160||typeof e.body!=='string'||!e.body.trim()||e.body.length>200000)error('PAGES_TEXT');
 if(typeof e.date!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(e.date)||!Number.isFinite(Date.parse(e.date)))error('PAGES_DATE');
 // JS Date.parse normalizes Feb30 /24:00 while Python datetime rejects them.
 const fields=(e.date as string).match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/)!;
 const [year,month,day,hour,minute,second]=fields.slice(1).map(v=>Number(v??0));
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 if(year<1||month<1||month>12||day<1||day>days[month-1]||hour>23||minute>59||second>59)error('PAGES_DATE');
 const s=e.source as Record<string,unknown>|null;
 if(!s||typeof s!=='object'||Object.keys(s).sort().join(',')!=='kind,sha256'||s.kind!=='khora'||typeof s.sha256!=='string'||!(/^[a-f0-9]{64}$/).test(s.sha256))error('PAGES_SOURCE');
}
