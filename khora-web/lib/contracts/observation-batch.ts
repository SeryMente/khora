import { z } from "zod";

export const OBSERVATION_BATCH_SCHEMA_VERSION = "2.0";
export const OBSERVATION_BATCH_BRANCH = "observations/inbox";
export const OBSERVATION_BATCH_LATEST_PATH = "observations/latest-batch.json";
export const OBSERVATION_BATCH_LATEST_NDJSON_PATH = "observations/latest-batch.ndjson";
export const OBSERVATION_BATCH_HISTORY_DIR = "observations/history";

export const ObservationScopeSchema = z.enum([
  "capture","transcription","integration","ui","bridge","storage","network","auth","runtime","deployment","database","unknown"
]);
export const ObservationCategorySchema = z.enum([
  "lifecycle","state_transition","dependency","transport","accessibility","audio_capture","persistence","performance","permissions","connectivity","data_integrity","configuration","user_action","diagnostic","error","warning","capability","unknown"
]);

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string().max(200),z.number().finite(),z.boolean(),z.null(),z.array(JsonValueSchema),z.record(z.string(), JsonValueSchema)
]));

export const ObservationDiagnosticSchema = z.object({
  expected: JsonValueSchema.optional(),
  actual: JsonValueSchema.optional(),
  satisfied: z.boolean().optional(),
  failure_stage: z.string().max(200).optional(),
  error_code: z.string().max(200).optional(),
  error_fingerprint: z.string().max(128).optional(),
}).strict();

export const ObservationEventSchema = z.object({
  schema_version:z.string().min(1).max(32),
  event_uuid:z.string().uuid(),
  event_name:z.string().min(1).max(200),
  scope:ObservationScopeSchema,
  category:ObservationCategorySchema,
  severity:z.enum(["INFO","WARN","ERROR","CRITICAL"]),
  outcome:z.enum(["SUCCESS","FAILURE","PARTIAL","SKIPPED","PENDING"]),
  component:z.string().min(1).max(200),
  correlation_id:z.string().uuid(),
  causation_id:z.string().uuid().nullable().optional(),
  attempt_id:z.string().max(200).nullable().optional(),
  sequence:z.number().int().positive(),
  session_id:z.string().min(1).max(200),
  client_time:z.string().datetime().optional(),
  duration_ms:z.number().finite().nonnegative().nullable().optional(),
  reason_code:z.string().max(200).nullable().optional(),
  diagnostic:ObservationDiagnosticSchema.optional(),
  metrics:z.record(z.string(),JsonValueSchema).optional(),
  release_sha:z.string().regex(/^[0-9a-f]{7,64}$/i).nullable().optional(),
  privacy_class:z.literal("ANONYMIZED_TELEMETRY"),
}).strict();

const FORBIDDEN_METRIC_KEY = /(^|_)(raw_audio|audio_data|audio|transcript|transcription|dictation|verbatim|text_content|speech_text|base64|token|secret|password|cookie|authorization|credential|message|stack|description|content|caption|text|title|url|href|path|body)($|_)/i;

function inspectMetrics(value: unknown, path = "metrics"): string | null {
  if (Array.isArray(value)) {
    for (let i=0;i<value.length;i++) {
      const error = inspectMetrics(value[i], path + "[" + i + "]");
      if (error) return error;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_METRIC_KEY.test(key)) return path + "." + key;
      if (typeof val === "string" && val.length > 200) return path + "." + key + ":long-string";
      const error = inspectMetrics(val, path + "." + key);
      if (error) return error;
    }
  }
  return null;
}

export const ObservationEnvironmentSchema = z.object({
  browser:z.object({name:z.string().max(64),version:z.string().max(64),user_agent:z.string().max(512)}).strict(),
  platform:z.string().max(128),
  language:z.string().max(64),
  timezone:z.string().max(128),
  online:z.boolean(),
}).strict();

export const ObservationBatchSummarySchema = z.object({
  event_count:z.number().int().nonnegative(),
  severity_counts:z.record(z.string(),z.number().int().nonnegative()),
  outcome_counts:z.record(z.string(),z.number().int().nonnegative()),
  scope_counts:z.record(z.string(),z.number().int().nonnegative()),
  category_counts:z.record(z.string(),z.number().int().nonnegative()),
  component_counts:z.record(z.string(),z.number().int().nonnegative()),
  failure_count:z.number().int().nonnegative(),
  warning_count:z.number().int().nonnegative(),
  expectation_gap_count:z.number().int().nonnegative(),
}).strict();

export const ObservationBatchSchema = z.object({
  schema_version:z.literal(OBSERVATION_BATCH_SCHEMA_VERSION),
  batch_id:z.string().uuid(),
  source:z.literal("harmonia-extension"),
  extension_version:z.string().min(1).max(64),
  session_id:z.string().min(1).max(200),
  generated_at:z.string().datetime(),
  first_event_at:z.string().datetime().nullable(),
  last_event_at:z.string().datetime().nullable(),
  partial:z.boolean(),
  release_sha:z.string().regex(/^[0-9a-f]{7,64}$/i).nullable().optional(),
  environment:ObservationEnvironmentSchema,
  summary:ObservationBatchSummarySchema,
  events:z.array(ObservationEventSchema).min(1).max(50),
}).strict().superRefine((batch, ctx) => {
  if (batch.summary.event_count !== batch.events.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["summary", "event_count"], message: "summary.event_count no coincide con events.length" });
  }
  const countBy = (key: "severity" | "outcome" | "scope" | "category" | "component") =>
    batch.events.reduce<Record<string, number>>((acc, event) => {
      const value = String(event[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  const sameCounts = (actual: Record<string, number>, expected: Record<string, number>) => {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    return actualKeys.length === expectedKeys.length &&
      actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
  };
  for (const [field, expected] of [
    ["severity_counts", countBy("severity")],
    ["outcome_counts", countBy("outcome")],
    ["scope_counts", countBy("scope")],
    ["category_counts", countBy("category")],
    ["component_counts", countBy("component")],
  ] as const) {
    if (!sameCounts(batch.summary[field], expected)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["summary", field], message: field + " no coincide con events" });
    }
  }
  const expectedFailureCount = batch.events.filter((event) => event.outcome === "FAILURE" || event.severity === "CRITICAL").length;
  const expectedWarningCount = batch.events.filter((event) => event.severity === "WARN").length;
  const expectedGapCount = batch.events.filter((event) => event.diagnostic?.satisfied === false).length;
  if (batch.summary.failure_count !== expectedFailureCount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["summary", "failure_count"], message: "failure_count no coincide con events" });
  }
  if (batch.summary.warning_count !== expectedWarningCount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["summary", "warning_count"], message: "warning_count no coincide con events" });
  }
  if (batch.summary.expectation_gap_count !== expectedGapCount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["summary", "expectation_gap_count"], message: "expectation_gap_count no coincide con events" });
  }
  const expectedSequences = batch.events.map((_, index) => index + 1);
  const actualSequences = batch.events.map((event) => event.sequence);
  if (actualSequences.some((sequence, index) => sequence !== expectedSequences[index])) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["events"], message: "event.sequence debe ser continuo y empezar en 1" });
  }
  const firstEventTime = batch.events[0]?.client_time ?? null;
  const lastEventTime = batch.events[batch.events.length - 1]?.client_time ?? null;
  if (batch.first_event_at !== firstEventTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["first_event_at"], message: "first_event_at no coincide con el primer evento" });
  }
  if (batch.last_event_at !== lastEventTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["last_event_at"], message: "last_event_at no coincide con el último evento" });
  }
  for (const event of batch.events) {
    const error = inspectMetrics(event.metrics);
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["events", event.sequence - 1, "metrics"],
        message: "Métrica diagnóstica prohibida o excesivamente larga: " + error,
      });
    }
  }
});

export type ObservationEvent = z.infer<typeof ObservationEventSchema>;
export type ObservationBatch = z.infer<typeof ObservationBatchSchema>;

export function buildNdjson(events: ObservationEvent[]): string {
  return events.map((event) => JSON.stringify(event)).join("\n") + "\n";
}
