import { CANONICAL_OUTPUT_FORMAT_VERSION } from "./normative-output";
import { BOUND_OUTPUT_FORMAT_VERSION, isMcpClientIdentity, clientIdentityEnabled, type McpClientIdentity, type ClientPlatform } from "./mcp-client-identity";

export const REQUIRED_PLATFORM = "ChatGPT" as const;
export const REASONING_MODES = ["THINKING", "INSTANT", "UNKNOWN", "UNAVAILABLE"] as const;
export type ReasoningMode = (typeof REASONING_MODES)[number];
export const REQUIRED_OUTPUT_FORMAT_VERSION = CANONICAL_OUTPUT_FORMAT_VERSION;

export type NormativeRuntimeContext = {
  platform: ClientPlatform;
  client_identity?: McpClientIdentity;
  reasoning_mode: ReasoningMode;
  output_format_version: typeof REQUIRED_OUTPUT_FORMAT_VERSION | typeof BOUND_OUTPUT_FORMAT_VERSION;
};

export function isNormativeRuntimeContext(value: unknown): value is NormativeRuntimeContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.client_identity == null
      ? candidate.platform === REQUIRED_PLATFORM && candidate.output_format_version === REQUIRED_OUTPUT_FORMAT_VERSION
      : clientIdentityEnabled() && isMcpClientIdentity(candidate.client_identity) && candidate.platform === candidate.client_identity.platform && candidate.output_format_version === BOUND_OUTPUT_FORMAT_VERSION) &&
    typeof candidate.reasoning_mode === "string" &&
    (REASONING_MODES as readonly string[]).includes(candidate.reasoning_mode)
  );
}

export function assertNormativeRuntimeContext(value: unknown): asserts value is NormativeRuntimeContext {
  if (!isNormativeRuntimeContext(value)) {
    throw new Error("NORMATIVE_RUNTIME_INVALID");
  }
}

export function runtimeForClientIdentity(identity: McpClientIdentity | null, reasoning_mode: unknown, output_format_version: unknown): NormativeRuntimeContext {
  const runtime = { platform: identity?.platform ?? REQUIRED_PLATFORM, reasoning_mode, output_format_version, ...(identity ? {client_identity: identity} : {}) };
  assertNormativeRuntimeContext(runtime);
  return runtime;
}
