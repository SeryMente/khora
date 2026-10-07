import test from "node:test";
import assert from "node:assert/strict";

import {
  REASONING_MODES,
  REQUIRED_OUTPUT_FORMAT_VERSION,
  REQUIRED_PLATFORM,
  isNormativeRuntimeContext,
} from "../../lib/server/normative-runtime";

test("accepts all supported runtime reasoning states", () => {
  for (const reasoning_mode of REASONING_MODES) {
    assert.equal(
      isNormativeRuntimeContext({
        platform: REQUIRED_PLATFORM,
        reasoning_mode,
        output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
      }),
      true,
    );
  }
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
