import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { generarMasterWavDialogo } from "../../lib/server/dialogo-master";

test("master generator decodes the original WebM tracks to one time-aligned stereo PCM16 WAV", async () => {
  assert.ok(ffmpegPath);
  const directory = mkdtempSync(join(tmpdir(), "khora-dialogue-master-test-"));
  try {
    const makeTrack = (name: string, frequency: number) => {
      const path = join(directory, name + ".webm");
      execFileSync(ffmpegPath as string, [
        "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-i", "sine=frequency=" + frequency + ":duration=0.8",
        "-ac", "2", "-c:a", "libopus", "-f", "webm", "-y", path,
      ], { windowsHide: true, stdio: "ignore", timeout: 20000 });
      return readFileSync(path);
    };
    const user = makeTrack("user", 440);
    const chrome = makeTrack("chrome", 880);
    const master = await generarMasterWavDialogo([
      { fuente: "microphone", bytes: user, offsetMs: 0 },
      { fuente: "chrome_tab", bytes: chrome, offsetMs: 250 },
    ]);
    assert.equal(master.toString("ascii", 0, 4), "RIFF");
    assert.equal(master.toString("ascii", 8, 12), "WAVE");
    assert.equal(master.readUInt16LE(22), 2);
    assert.equal(master.readUInt32LE(24), 16000);
    assert.equal(master.readUInt16LE(34), 16);
    const frames = master.readUInt32LE(40) / 4;
    assert.ok(frames >= 16000 && frames <= 18000);
    let leftPower = 0;
    let rightBeforeOffset = 0;
    let rightAfterOffset = 0;
    for (let frame = 1000; frame < 3000; frame++) {
      const left = master.readInt16LE(44 + frame * 4);
      leftPower += left * left;
      const right = master.readInt16LE(44 + frame * 4 + 2);
      rightBeforeOffset += right * right;
    }
    for (let frame = 8000; frame < 12000; frame++) {
      const right = master.readInt16LE(44 + frame * 4 + 2);
      rightAfterOffset += right * right;
    }
    assert.ok(leftPower > 1_000_000, "user channel should contain decoded audio");
    assert.equal(rightBeforeOffset, 0, "Chrome channel remains silent until the source offset");
    assert.ok(rightAfterOffset > 1_000_000, "Chrome channel should contain decoded audio after alignment");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
