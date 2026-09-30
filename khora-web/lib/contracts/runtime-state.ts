import { z } from "zod";

export const RUNTIME_STATE_SCHEMA_VERSION = "1.0";

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(JsonValueSchema),
  z.record(z.string(), JsonValueSchema),
]));

const FORBIDDEN_KEYS = new Set([
  "audio",
  "raw_audio",
  "audio_data",
  "transcript",
  "transcription",
  "dictation",
  "verbatim",
  "text_content",
  "speech_text",
  "base64",
  "token",
  "secret",
  "password",
  "cookie",
  "authorization",
  "credential",
  "message",
  "stack",
  "description",
  "content",
  "text",
  "title",
  "url",
  "href",
  "path",
  "body",
]);

function inspect(value: unknown, path = "state"): string | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const error = inspect(value[i], path + "[" + i + "]");
      if (error) return error;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) return path + "." + key;
      if (typeof nested === "string" && nested.length > 200) return path + "." + key + ":long-string";
      const error = inspect(nested, path + "." + key);
      if (error) return error;
    }
  }
  return null;
}

export const RuntimeStateSnapshotSchema = z.object({
  schema_version: z.literal(RUNTIME_STATE_SCHEMA_VERSION),
  runtime_id: z.string().uuid(),
  session_id: z.string().min(1).max(200).nullable(),
  observed_at: z.string().datetime(),
  route: z.string().min(1).max(200),
  screen: z.string().min(1).max(100),
  active: z.boolean(),
  visible: z.boolean(),
  focused: z.boolean(),
  release_sha: z.string().regex(/^[0-9a-f]{7,64}$/i).nullable().optional(),
  source: z.literal("khora-ui"),
  privacy_class: z.literal("ANONYMIZED_RUNTIME_STATE"),
  state: z.record(z.string().max(64), JsonValueSchema),
}).strict().superRefine((snapshot, ctx) => {
  const error = inspect(snapshot.state);
  if (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["state"],
      message: "Estado de runtime contiene una clave prohibida o demasiado larga: " + error,
    });
  }
});

export type RuntimeStateSnapshot = z.infer<typeof RuntimeStateSnapshotSchema>;
