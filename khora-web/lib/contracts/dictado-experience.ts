import { z } from "zod";

export const POLICY = { version: "dictado-experience/v1", probability: 0.25, minMs: 60_000, cooldownMs: 7_200_000, dailyCap: 2 } as const;
const count = z.number().int().min(0).max(10_000_000);
const ms = z.number().finite().min(0).max(604_800_000);
export const usageSchema = z.object({
  duration_ms: ms, first_result_ms: ms.nullable(), resume_ready_ms: ms.nullable(),
  result_to_paint_ms: z.array(ms).max(100), final_results: count, reconnects: count,
  protected_checks: count, protected_changes: count, visual_jumps: count.nullable(),
  fidelity_error_rate: z.number().min(0).max(1).nullable(), ended: z.boolean(),
}).strict().refine(m => m.protected_changes <= m.protected_checks, "Las alteraciones no pueden superar las comprobaciones.");
export type Usage = z.infer<typeof usageSchema>;
export const recordSchema = z.object({
  id: z.string().uuid(), sessionId: z.string().uuid(), functionId: z.literal("dictado"),
  clientRelease: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  policyVersion: z.literal(POLICY.version),
  data: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("session"), metrics: usageSchema }).strict(),
    z.object({ kind: z.literal("invitation"), outcome: z.enum(["selected", "not_selected", "ineligible", "capped", "shown", "dismissed"]), probability: z.number().min(0).max(1) }).strict(),
    z.object({ kind: z.literal("feedback"), source: z.enum(["sampled", "voluntary"]), rating: z.enum(["pleasant", "neutral", "aversive"]).nullable(), reason: z.enum(["rhythm", "jumps", "conservation", "recognition", "other"]).nullable(), comment: z.string().trim().max(1000) }).strict().refine(d => d.rating !== null || d.comment.length > 0, "Elige una valoración o escribe un comentario."),
  ]),
}).strict();
export type ExperienceRecord = z.infer<typeof recordSchema>;
export const settingsSchema = z.object({
  enabled: z.boolean(),
  sampling: z.object({
    day: z.string().regex(/^(?:|\d{4}-\d{2}-\d{2})$/),
    count: z.number().int().min(0).max(POLICY.dailyCap),
    last: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  }).strict(),
}).strict();
export type Settings = z.infer<typeof settingsSchema>;
export type SamplingState = Settings["sampling"];
export function readSettings(value: unknown): Settings {
  const parsed = settingsSchema.safeParse(value);
  return parsed.success ? parsed.data : { enabled: false, sampling: { day: "", count: 0, last: 0 } };
}
export function sampleSession(durationMs: number, state: SamplingState, now: number, day: string, random: number) {
  if (!Number.isFinite(durationMs) || durationMs < 0 || !Number.isSafeInteger(now) || now < 0 ||
      !Number.isFinite(random) || random < 0 || random >= 1 ||
      !settingsSchema.shape.sampling.safeParse(state).success || !/^\d{4}-\d{2}-\d{2}$/.test(day))
    return { outcome: "ineligible" as const, probability: 0 };
  if (durationMs < POLICY.minMs) return { outcome: "ineligible" as const, probability: 0 };
  if ((state.day === day && state.count >= POLICY.dailyCap) || (state.last > 0 && now - state.last < POLICY.cooldownMs)) return { outcome: "capped" as const, probability: 0 };
  return { outcome: random >= 0 && random < POLICY.probability ? "selected" as const : "not_selected" as const, probability: POLICY.probability };
}
export function normalizedPrefix(text: string) { return text.split("\n\n").filter(p => p.trim().length > 0).join("\n\n"); }
export function preservesPrefix(prefix: string, current: string) { return !prefix || current.startsWith(prefix); }
export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1))];
}
export function summarize(input: ExperienceRecord[]) {
  // Do not silently inflate a denominator on retry, or choose a winner for conflicting IDs.
  const byId = new Map<string, ExperienceRecord>(); const conflicts = new Set<string>();
  let invalidRecords = 0, duplicateRecords = 0;
  for (const value of input) {
    const { savedAt: _savedAt, ...payload } = value as ExperienceRecord & { savedAt?: string };
    const parsed = recordSchema.safeParse(payload);
    if (!parsed.success) { invalidRecords++; continue; }
    const r = parsed.data, old = byId.get(r.id);
    if (old) { duplicateRecords++; if (JSON.stringify(old) !== JSON.stringify(r)) conflicts.add(r.id); }
    else byId.set(r.id, r);
  }
  const records = [...byId.values()].filter(r => !conflicts.has(r.id));
  const sessionMap = new Map<string, ExperienceRecord>(); const sessionConflicts = new Set<string>();
  for (const r of records.filter(r => r.data.kind === "session")) {
    const old = sessionMap.get(r.sessionId);
    if (old && JSON.stringify(old.data) !== JSON.stringify(r.data)) sessionConflicts.add(r.sessionId);
    else sessionMap.set(r.sessionId, r);
  }
  const sessions = [...sessionMap.values()].filter(r => !sessionConflicts.has(r.sessionId));
  const ended = sessions.flatMap(r => r.data.kind === "session" && r.data.metrics.ended ? [r.data.metrics] : []);
  const feedback = records.flatMap(r => r.data.kind === "feedback" ? [r.data] : []);
  const bySource = (source: "sampled" | "voluntary") => feedback.filter(f => f.source === source);
  const responses = (source: "sampled" | "voluntary") => ({
    total: bySource(source).length,
    pleasant: bySource(source).filter(f => f.rating === "pleasant").length,
    neutral: bySource(source).filter(f => f.rating === "neutral").length,
    aversive: bySource(source).filter(f => f.rating === "aversive").length,
    commentOnly: bySource(source).filter(f => f.rating === null).length,
  });
  const paints = ended.flatMap(s => s.result_to_paint_ms);
  return { invalidRecords, duplicateRecords, conflictingRecords: conflicts.size, conflictingSessions: sessionConflicts.size, sessions: sessions.length, ended: ended.length,
    protectedChecks: ended.reduce((n, s) => n + s.protected_checks, 0), protectedChanges: ended.reduce((n, s) => n + s.protected_changes, 0),
    paintSamples: paints.length, paintP50: quantile(paints, .5), paintP95: quantile(paints, .95),
    shown: new Set(records.filter(r => r.data.kind === "invitation" && r.data.outcome === "shown").map(r => r.sessionId)).size,
    sampled: responses("sampled"), voluntary: responses("voluntary") };
}