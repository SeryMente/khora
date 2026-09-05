import assert from "assert";
import test from "node:test";
import {
  clampPlaybackPosition,
  explainAudioHttpFailure,
  globalTimeForPart,
  resolveGlobalSeek,
  type AudioManifestPart,
} from "../../lib/audio-playback";

const parts: AudioManifestPart[] = [
  {
    part_index: 0,
    start_ms: 0,
    end_ms: 10_000,
    duracion_ms: 10_000,
    download_path: "/api/audio/v/parte/0",
  },
  {
    part_index: 1,
    start_ms: 10_000,
    end_ms: 20_000,
    duracion_ms: 10_000,
    download_path: "/api/audio/v/parte/1",
  },
];

test("audio playback controller uses one-based UI positions with legacy zero-based storage", () => {
  assert.equal(clampPlaybackPosition(parts, 0), 1);
  assert.equal(clampPlaybackPosition(parts, 3), 2);
  assert.deepEqual(resolveGlobalSeek(parts, 5_000), {
    position: 1,
    localSeconds: 5,
  });
  assert.deepEqual(resolveGlobalSeek(parts, 15_000), {
    position: 2,
    localSeconds: 5,
  });
  assert.equal(globalTimeForPart(parts, 2, 2.5), 12_500);
  assert.equal(parts[0].download_path, "/api/audio/v/parte/0");
});

test("audio playback controller clamps seeks outside the manifest", () => {
  assert.deepEqual(resolveGlobalSeek(parts, -10), {
    position: 1,
    localSeconds: 0,
  });
  assert.deepEqual(resolveGlobalSeek(parts, 99_000), {
    position: 2,
    localSeconds: 10,
  });
});

test("audio playback reports a locked vault instead of a codec error", async () => {
  const response = new Response(
    JSON.stringify({ detail: "Bóveda cerrada: introduce el PIN" }),
    { status: 423, headers: { "content-type": "application/json" } },
  );
  assert.equal(
    await explainAudioHttpFailure(response),
    "Bóveda cerrada: introduce el PIN",
  );
});

test("audio playback preserves specific server failures", async () => {
  const response = new Response(
    JSON.stringify({ detail: "No se pudo descifrar el blob de audio." }),
    { status: 500, headers: { "content-type": "application/json" } },
  );
  assert.equal(
    await explainAudioHttpFailure(response),
    "No se pudo descifrar el blob de audio.",
  );
});
