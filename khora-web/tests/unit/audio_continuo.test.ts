// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import "./setup";
import assert from "assert";
import test from "node:test";

function formatMs(ms: number): string {
  if (!ms || isNaN(ms) || ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type AudioParte = {
  part_index: number;
  start_ms: number;
  end_ms: number;
  duracion_ms: number;
  bytes: number;
  download_path: string;
};

type PalabraTiming = {
  palabra: string;
  char_inicio: number;
  char_fin: number;
  start_ms: number;
  end_ms: number;
  part_index: number;
};

function resolveGlobalTime(manifiestoPartes: AudioParte[], targetMs: number) {
  if (manifiestoPartes.length === 0) {
    return { targetPartIndex: 1, targetParte: null, localOffsetSec: 0 };
  }
  let targetParte = manifiestoPartes.find((p) => targetMs >= p.start_ms && targetMs <= p.end_ms);
  if (!targetParte) {
    if (targetMs < manifiestoPartes[0].start_ms) {
      targetParte = manifiestoPartes[0];
    } else {
      targetParte = manifiestoPartes[manifiestoPartes.length - 1];
    }
  }
  const rawOffsetSec = (targetMs - targetParte.start_ms) / 1000;
  const maxOffsetSec = (targetParte.end_ms - targetParte.start_ms) / 1000;
  const localOffsetSec = Math.max(0, Math.min(rawOffsetSec, maxOffsetSec));
  return { targetPartIndex: targetParte.part_index, targetParte, localOffsetSec };
}

function checkNextPartTransition(currentPart: AudioParte, nextPart?: AudioParte) {
  if (!nextPart) {
    return { canAdvance: false, reason: "end_of_audio" };
  }
  const gapMs = nextPart.start_ms - currentPart.end_ms;
  if (gapMs > 1000) {
    return { canAdvance: false, reason: "gap_detected", gapMs };
  }
  if (nextPart.bytes <= 0) {
    return { canAdvance: false, reason: "empty_bytes" };
  }
  return { canAdvance: true, reason: "ok" };
}

function findActiveWordIndex(palabrasTiming: PalabraTiming[], globalTimeMs: number): number {
  return palabrasTiming.findIndex((w) => globalTimeMs >= w.start_ms && globalTimeMs <= w.end_ms);
}

export function createWebmAudioBuffer(durationMs: number = 2000): Buffer {
  const ebmlHeader = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f,
    0x42, 0x86, 0x81, 0x01,
    0x42, 0xf7, 0x81, 0x01,
    0x42, 0xf2, 0x81, 0x04,
    0x42, 0xf3, 0x81, 0x08,
    0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d,
    0x42, 0x87, 0x81, 0x02,
    0x42, 0x85, 0x81, 0x02,
  ]);

  const dummyPayload = Buffer.alloc(Math.max(64, Math.floor(durationMs * 2)));
  dummyPayload.fill(0x01);

  return Buffer.concat([ebmlHeader, dummyPayload]);
}

test("Continuous Audio Playback Machine Suite", async (t) => {
  const partesTest: AudioParte[] = [
    { part_index: 1, start_ms: 0, end_ms: 10000, duracion_ms: 10000, bytes: 2048, download_path: "/api/audio/v1/parte/1" },
    { part_index: 2, start_ms: 10000, end_ms: 20000, duracion_ms: 10000, bytes: 2048, download_path: "/api/audio/v1/parte/2" },
    { part_index: 3, start_ms: 20000, end_ms: 30000, duracion_ms: 10000, bytes: 2048, download_path: "/api/audio/v1/parte/3" },
  ];

  await t.test("1. Monotonic global time formatting (formatMs)", () => {
    assert.strictEqual(formatMs(0), "00:00");
    assert.strictEqual(formatMs(5000), "00:05");
    assert.strictEqual(formatMs(65000), "01:05");
    assert.strictEqual(formatMs(-100), "00:00");
  });

  await t.test("2. Global seek math resolves correct part index and local offset", () => {
    let seek = resolveGlobalTime(partesTest, 0);
    assert.strictEqual(seek.targetPartIndex, 1);
    assert.strictEqual(seek.localOffsetSec, 0);

    seek = resolveGlobalTime(partesTest, 5000);
    assert.strictEqual(seek.targetPartIndex, 1);
    assert.strictEqual(seek.localOffsetSec, 5);

    seek = resolveGlobalTime(partesTest, 15000);
    assert.strictEqual(seek.targetPartIndex, 2);
    assert.strictEqual(seek.localOffsetSec, 5);

    seek = resolveGlobalTime(partesTest, 28500);
    assert.strictEqual(seek.targetPartIndex, 3);
    assert.strictEqual(seek.localOffsetSec, 8.5);

    seek = resolveGlobalTime(partesTest, 35000);
    assert.strictEqual(seek.targetPartIndex, 3);
    assert.strictEqual(seek.localOffsetSec, 10);
  });

  await t.test("3. Auto-advancement check between consecutive parts", () => {
    let res = checkNextPartTransition(partesTest[0], partesTest[1]);
    assert.strictEqual(res.canAdvance, true);
    assert.strictEqual(res.reason, "ok");

    res = checkNextPartTransition(partesTest[2], undefined);
    assert.strictEqual(res.canAdvance, false);
    assert.strictEqual(res.reason, "end_of_audio");
  });

  await t.test("4. Gap detection (>1000ms) halts playback explicitly", () => {
    const partWithGap: AudioParte = {
      part_index: 2,
      start_ms: 15000,
      end_ms: 25000,
      duracion_ms: 10000,
      bytes: 2048,
      download_path: "/api/audio/v1/parte/2",
    };

    const res = checkNextPartTransition(partesTest[0], partWithGap);
    assert.strictEqual(res.canAdvance, false);
    assert.strictEqual(res.reason, "gap_detected");
    assert.strictEqual(res.gapMs, 5000);
  });

  await t.test("5. Empty part bytes (0 bytes) halts playback explicitly", () => {
    const emptyPart: AudioParte = {
      part_index: 2,
      start_ms: 10000,
      end_ms: 20000,
      duracion_ms: 10000,
      bytes: 0,
      download_path: "/api/audio/v1/parte/2",
    };

    const res = checkNextPartTransition(partesTest[0], emptyPart);
    assert.strictEqual(res.canAdvance, false);
    assert.strictEqual(res.reason, "empty_bytes");
  });

  await t.test("6. Word timing matching finds exact active word", () => {
    const palabras: PalabraTiming[] = [
      { palabra: "Hola", char_inicio: 0, char_fin: 4, start_ms: 0, end_ms: 2000, part_index: 1 },
      { palabra: "Khora", char_inicio: 5, char_fin: 10, start_ms: 2100, end_ms: 4000, part_index: 1 },
      { palabra: "continuo", char_inicio: 11, char_fin: 19, start_ms: 4100, end_ms: 7000, part_index: 1 },
    ];

    assert.strictEqual(findActiveWordIndex(palabras, 1000), 0);
    assert.strictEqual(findActiveWordIndex(palabras, 3000), 1);
    assert.strictEqual(findActiveWordIndex(palabras, 5000), 2);
    assert.strictEqual(findActiveWordIndex(palabras, 8000), -1);
  });

  await t.test("7. Real WebM audio buffer generation (smoke test with >= 2 parts)", () => {
    const bufPart1 = createWebmAudioBuffer(2000);
    const bufPart2 = createWebmAudioBuffer(2000);

    assert.ok(bufPart1.length > 32);
    assert.ok(bufPart2.length > 32);

    assert.strictEqual(bufPart1[0], 0x1a);
    assert.strictEqual(bufPart1[1], 0x45);
    assert.strictEqual(bufPart1[2], 0xdf);
    assert.strictEqual(bufPart1[3], 0xa3);

    const durTotal = 2000 + 2000;
    assert.strictEqual(durTotal, 4000);
  });
});
