import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeStateSnapshotSchema } from "../../lib/contracts/runtime-state.js";

test("runtime snapshot acepta estado semántico y rechaza contenido sensible", () => {
  const base = {
    schema_version: "1.0",
    runtime_id: "00000000-0000-4000-8000-000000000001",
    session_id: "00000000-0000-4000-8000-000000000002",
    observed_at: new Date().toISOString(),
    route: "/sistema/ingreso",
    screen: "ingreso",
    active: true,
    visible: true,
    focused: true,
    source: "khora-ui",
    privacy_class: "ANONYMIZED_RUNTIME_STATE",
  };

  const valid = RuntimeStateSnapshotSchema.safeParse({
    ...base,
    state: {
      status: "dictando",
      input_mode: "chrome_live_caption",
      chrome_bridge: "connected",
      caption_active: true,
      capture_status: "recording",
      segment_count: 4,
      audio_parts: 2,
    },
  });
  assert.equal(valid.success, true);

  const forbidden = RuntimeStateSnapshotSchema.safeParse({
    ...base,
    state: {
      status: "dictando",
      transcript: "texto privado",
    },
  });
  assert.equal(forbidden.success, false);
});
