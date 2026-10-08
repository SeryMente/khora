export const REQUIRED_PLATFORM = "ChatGPT" as const;
export const REASONING_MODES = ["THINKING", "INSTANT", "UNKNOWN", "UNAVAILABLE"] as const;
export type ReasoningMode = (typeof REASONING_MODES)[number];
export const REQUIRED_OUTPUT_FORMAT_VERSION = "v1.7.6" as const;

export type NormativeRuntimeContext = {
  platform: typeof REQUIRED_PLATFORM;
  reasoning_mode: ReasoningMode;
  output_format_version: typeof REQUIRED_OUTPUT_FORMAT_VERSION;
};

export function isNormativeRuntimeContext(value: unknown): value is NormativeRuntimeContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.platform === REQUIRED_PLATFORM &&
    typeof candidate.reasoning_mode === "string" &&
    (REASONING_MODES as readonly string[]).includes(candidate.reasoning_mode) &&
    candidate.output_format_version === REQUIRED_OUTPUT_FORMAT_VERSION
  );
}

export function assertNormativeRuntimeContext(value: unknown): asserts value is NormativeRuntimeContext {
  if (!isNormativeRuntimeContext(value)) {
    throw new Error("NORMATIVE_RUNTIME_INVALID");
  }
}
