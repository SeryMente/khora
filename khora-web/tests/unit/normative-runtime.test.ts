import test from "node:test";
import assert from "node:assert/strict";

import {
  REQUIRED_OUTPUT_FORMAT_VERSION,
  REQUIRED_PLATFORM,
  REQUIRED_REASONING_MODE,
  isNormativeRuntimeContext,
} from "../../lib/server/normative-runtime";

test("accepts the canonical Thinking runtime contract", () => {
  assert.equal(
    isNormativeRuntimeContext({
      platform: REQUIRED_PLATFORM,
      reasoning_mode: REQUIRED_REASONING_MODE,
      output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
    }),
    true,
  );
});

test("rejects Instant mode", () => {
  assert.equal(
    isNormativeRuntimeContext({
      platform: REQUIRED_PLATFORM,
      reasoning_mode: "INSTANT",
      output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
    }),
    false,
  );
});

test("rejects unknown output format", () => {
  assert.equal(
    isNormativeRuntimeContext({
      platform: REQUIRED_PLATFORM,
      reasoning_mode: REQUIRED_REASONING_MODE,
      output_format_version: "v1.6.0",
    }),
    false,
  );
});

test("rejects an incomplete runtime contract", () => {
  assert.equal(isNormativeRuntimeContext({}), false);
});
