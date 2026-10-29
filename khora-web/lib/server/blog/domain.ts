import {assertPagesTextCompatible} from '../../blog/transcript-preparation';
import { createHash } from 'node:crypto';
export type EntryKind = 'blog_personal' | 'conversacion_maya' | 'interpretacion_simultanea' | 'general';
export type Source = { id: string; version: number; sha256: string; text: string; owner: string; receivedAt: string; capturedAt: string | null; kind: string; obfuscated: boolean };
export type Anchor = { sourceId: string; version: number; sha256: string; start: number; end: number; quote: string };
export type Proposal = { field: string; value: string; anchor: Anchor; status: 'proposed'; method: string };
export const metadataFields = ['event_time', 'time_precision', 'person', 'place', 'context', 'claim_kind', 'attribution', 'knowledge_origin', 'emotion', 'meaning', 'correction', 'episode_relation', 'uncertainty'] as const;
export type PublicEntry = { schema: 1; slug: string; title: string; date: string; body: string; source: {kind: 'khora'; sha256: string} };
export type FacebookChoice = { format: 'link'; message: string } | { format: 'full_text'; message: string };
export type Revision = { publicationId: string; revision: number; sourceId: string; sourceVersion: number; sourceHash: string; kind: EntryKind; obfuscated: boolean; entry: PublicEntry; facebook: FacebookChoice };
export type Approval = { digest: string; actor: string; approvedAt: string; obfuscatedExposure: boolean };
export function fail(code: string): never { throw new Error(code); }
export function hash(text: string): string { return createHash('sha256').update(text, 'utf8').digest('hex'); }
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',') + '}';
  if (value === undefined || typeof value === 'function' || typeof value === 'number' && !Number.isFinite(value)) fail('NON_JSON');
  return JSON.stringify(value);
}
export function sourceCheck(s: Source, actor: string): void {
  if (!actor || !s.owner || actor !== s.owner) fail('SOURCE_FORBIDDEN');
  if(s.kind!=='blog_personal'||typeof s.obfuscated!=='boolean')fail('SOURCE_NOT_BLOG');
  if (!Number.isSafeInteger(s.version) || s.version < 1 || hash(s.text) !== s.sha256) fail('SOURCE_INTEGRITY');
}
export function anchored(s: Source, p: Proposal): boolean {
  const a=p.anchor;
  return metadataFields.includes(p.field as typeof metadataFields[number]) && p.status==='proposed' && typeof p.method==='string' && p.method.length>0 && typeof p.value==='string' && p.value.length>0 &&
    a.sourceId===s.id && a.version===s.version && a.sha256===s.sha256 && Number.isSafeInteger(a.start) && Number.isSafeInteger(a.end) &&
    a.start>=0 && a.end>a.start && a.end<=s.text.length && s.text.slice(a.start,a.end)===a.quote && a.quote.includes(p.value);
}
// Literal extractive proposals only. Semantic labels/normalized dates need a separate human review.
export function checkProposals(s: Source, ps: Proposal[]): Proposal[] {
  if (!Array.isArray(ps) || ps.length>100 || ps.some(p=>!p || !p.anchor || !anchored(s,p))) fail('UNANCHORED_METADATA');
  return ps;
}
export function publicEntry(input: PublicEntry): PublicEntry {
  if (!input || Object.keys(input).sort().join(',') !== 'body,date,schema,slug,source,title') fail('PUBLIC_FIELDS');
  if (input.schema!==1 || typeof input.slug!=='string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || input.slug.length>120) fail('PUBLIC_SLUG');
  if (typeof input.title!=='string' || !input.title.trim() || input.title.length>160 || typeof input.body!=='string' || !input.body.trim() || input.body.length>200000) fail('PUBLIC_TEXT');
  if (typeof input.date!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(input.date) || !Number.isFinite(Date.parse(input.date))) fail('PUBLIC_TIME');
  if (!input.source || Object.keys(input.source).sort().join(',')!=='kind,sha256' || input.source.kind!=='khora' || !/^[a-f0-9]{64}$/.test(input.source.sha256)) fail('PUBLIC_SOURCE');
  assertPagesTextCompatible(input);
  return JSON.parse(canonical(input));
}
export function revisionCheck(r: Revision): void {
  if (!/^[a-f0-9-]{36}$/.test(r.publicationId) || !Number.isSafeInteger(r.revision) || r.revision<1 || !Number.isSafeInteger(r.sourceVersion) || r.sourceVersion<1 || !/^[a-f0-9]{64}$/.test(r.sourceHash)) fail('REVISION_INVALID');
  if (r.kind!=='blog_personal') fail('ENTRY_NOT_ELIGIBLE');
  publicEntry(r.entry);
  // Public provenance hashes the approved text, never a private original.
  if (r.entry.source.sha256!==hash(r.entry.body)) fail('PUBLIC_PROVENANCE');
  const f=r.facebook;
  if (!f || !['link','full_text'].includes(f.format)) fail('FACEBOOK_FORMAT_REQUIRED');
  if (typeof f.message!=='string' || !f.message.trim() || f.message.length>60000) fail('FACEBOOK_TEXT_REQUIRED');
  if (Object.keys(f).sort().join(',') !== 'format,message') fail('FACEBOOK_FIELDS');
}
export function revisionHash(r: Revision): string { revisionCheck(r); return hash(canonical(r)); }
export function approve(r: Revision, actor: string, source: Source, now: string, obfuscatedExposure=false): Approval {
  sourceCheck(source,actor); revisionCheck(r);
  if(r.sourceId!==source.id || r.sourceVersion!==source.version || r.sourceHash!==source.sha256) fail('SOURCE_VERSION_CHANGED');
  if(r.obfuscated!==source.obfuscated)fail('SOURCE_FLAGS_CHANGED');
  if(r.obfuscated && !obfuscatedExposure) fail('OBFUSCATED_EXPLICIT_DECISION_REQUIRED');
  if(!Number.isFinite(Date.parse(now))) fail('APPROVAL_TIME');
  return {digest:revisionHash(r),actor,approvedAt:now,obfuscatedExposure};
}
export function publishable(r: Revision,a: Approval|null,actor: string,s: Source): PublicEntry {
  sourceCheck(s,actor);
  if(r.obfuscated!==s.obfuscated)fail('SOURCE_FLAGS_CHANGED');
  if(!a || a.actor!==actor || a.digest!==revisionHash(r) || r.obfuscated&&!a.obfuscatedExposure) fail('APPROVAL_REQUIRED');
  if(r.sourceId!==s.id || r.sourceVersion!==s.version || r.sourceHash!==s.sha256) fail('SOURCE_VERSION_CHANGED');
  return publicEntry(r.entry);
}
export type TargetState='pending'|'submitting'|'unknown'|'confirmed'|'blocked'|'cancelled';
export function maySendFacebook(blog: TargetState, facebook: TargetState): boolean { return blog==='confirmed' && facebook==='pending'; }
export function retention(kind: EntryKind) { return {preserve:true, graphEligible:kind==='blog_personal'||kind==='conversacion_maya', publishEligible:kind==='blog_personal', publicConsent:false}; }
