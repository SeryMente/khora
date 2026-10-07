export const REQUIRED_PLATFORM = "ChatGPT" as const;
export const REQUIRED_REASONING_MODE = "THINKING" as const;
export const REQUIRED_OUTPUT_FORMAT_VERSION = "v1.7.0" as const;

export type NormativeRuntimeContext = {
  platform: typeof REQUIRED_PLATFORM;
  reasoning_mode: typeof REQUIRED_REASONING_MODE;
  output_format_version: typeof REQUIRED_OUTPUT_FORMAT_VERSION;
};

export function isNormativeRuntimeContext(value: unknown): value is NormativeRuntimeContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.platform === REQUIRED_PLATFORM &&
    candidate.reasoning_mode === REQUIRED_REASONING_MODE &&
    candidate.output_format_version === REQUIRED_OUTPUT_FORMAT_VERSION
  );
}

export function assertNormativeRuntimeContext(value: unknown): asserts value is NormativeRuntimeContext {
  if (!isNormativeRuntimeContext(value)) {
    throw new Error("THINKING_MODE_REQUIRED");
  }
}
