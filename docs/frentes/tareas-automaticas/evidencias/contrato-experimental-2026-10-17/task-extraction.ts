import {createHash} from 'node:crypto';
/** Experimental boundary validator, NOT wired to Khora runtime.
 * Offsets are UTF-16 code units, end-exclusive. Caller must supply authorized
 * immutable snapshots; this function does not authenticate, run a model,
 * prove semantic coverage/entailment, persist tasks or select a provider.
 */
export type Source = Readonly<{
  id: string; version: string; sha256: string; text: string;
  capturedAt: string; timezone: string;
}>;
export type Span = {sourceId: string; version: string; sha256: string; start: number; end: number; text: string};
export type Task = {title: string; evidence: Span[]; due: null | {
  isoDate: string; evidence: Span; anchorCapturedAt: string; timezone: string;
}};
export type Result =
  | {status: 'complete'; sources: {id: string; version: string; sha256: string}[]; tasks: Task[]}
  | {status: 'failed'; code: 'MODEL_FAILED' | 'INCOMPLETE' | 'INVALID_OUTPUT'};
const fail = (): never => { throw new Error('INVALID_TASK_EXTRACTION'); };
const obj = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fail();
  return v as Record<string, unknown>;
};
function exact(v: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(v).length !== keys.length || keys.some(k => !Object.hasOwn(v, k))) fail();
}
function text(v: unknown, max: number): string {
  if (typeof v !== 'string' || !v.trim() || v.length > max) return fail();
  return v;
}
function timezone(v: string): void {
  try { new Intl.DateTimeFormat('en', {timeZone: v}); } catch { fail(); }
}
function snapshot(s: Source): void {
  text(s.id, 256); text(s.version, 256);
  if (!/^[a-f0-9]{64}$/.test(s.sha256) || typeof s.text !== 'string') fail();
  if (createHash('sha256').update(s.text,'utf8').digest('hex') !== s.sha256) fail();
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s.capturedAt) || !Number.isFinite(Date.parse(s.capturedAt))) fail();
  timezone(s.timezone);
}
function span(v: unknown, sources: Map<string, Source>): Span {
  const e = obj(v); exact(e, ['sourceId','version','sha256','start','end','text']);
  const s = sources.get(text(e.sourceId,256));
  if (!s || e.version !== s.version || e.sha256 !== s.sha256) return fail();
  const a = e.start, b = e.end;
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 0 || b <= a || b > s.text.length) return fail();
  const quote = text(e.text, 1000000);
  if (s.text.slice(a,b) !== quote) return fail();
  // Do not allow offsets to split a surrogate pair.
  const split = (n: number) => n > 0 && n < s.text.length && /[\uD800-\uDBFF]/.test(s.text[n-1]) && /[\uDC00-\uDFFF]/.test(s.text[n]);
  if (split(a) || split(b)) return fail();
  return {sourceId:s.id, version:s.version, sha256:s.sha256, start:a, end:b, text:quote};
}
export function validateTaskExtraction(input: unknown, authorized: readonly Source[]): Result {
  if (!authorized.length || authorized.length > 10000) return fail();
  const sources = new Map<string,Source>();
  for (const s of authorized) { snapshot(s); if (sources.has(s.id)) fail(); sources.set(s.id,s); }
  const out = obj(input);
  if (out.status === 'failed') {
    exact(out,['status','code']);
    if (!['MODEL_FAILED','INCOMPLETE','INVALID_OUTPUT'].includes(String(out.code))) return fail();
    return {status:'failed',code:out.code as 'MODEL_FAILED'|'INCOMPLETE'|'INVALID_OUTPUT'};
  }
  exact(out,['status','sources','tasks']);
  if (out.status !== 'complete' || !Array.isArray(out.sources) || out.sources.length !== sources.size || !Array.isArray(out.tasks) || out.tasks.length > 500) return fail();
  const seen = new Set<string>();
  const covered = out.sources.map(v => {
    const r = obj(v); exact(r,['id','version','sha256']);
    const id = text(r.id,256), s = sources.get(id);
    if (!s || seen.has(id) || r.version !== s.version || r.sha256 !== s.sha256) return fail();
    seen.add(id); return {id,version:s.version,sha256:s.sha256};
  });
  const tasks = out.tasks.map(v => {
    const t = obj(v); exact(t,['title','evidence','due']);
    const title = text(t.title,1000);
    if (!Array.isArray(t.evidence) || !t.evidence.length || t.evidence.length > 100) return fail();
    const evidence = t.evidence.map(e => span(e,sources));
    let due: Task['due'] = null;
    if (t.due !== null) {
      const d = obj(t.due); exact(d,['isoDate','evidence','anchorCapturedAt','timezone']);
      const isoDate = text(d.isoDate,10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !Number.isFinite(Date.parse(isoDate+'T00:00:00Z')) || new Date(isoDate+'T00:00:00Z').toISOString().slice(0,10) !== isoDate) return fail();
      const e = span(d.evidence,sources), s = sources.get(e.sourceId)!;
      if (!evidence.some(q => q.sourceId === e.sourceId) || d.anchorCapturedAt !== s.capturedAt || d.timezone !== s.timezone) return fail();
      due = {isoDate,evidence:e,anchorCapturedAt:s.capturedAt,timezone:s.timezone};
    }
    return {title,evidence,due};
  });
  return {status:'complete',sources:covered,tasks};
}
