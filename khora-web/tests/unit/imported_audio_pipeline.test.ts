import assert from "assert";
import test from "node:test";
import { createCipheriv, randomBytes } from "crypto";
import {
  MAX_IMPORTED_AUDIO_BYTES,
  decryptStagedAudio,
  detectAudioFormat,
  isKhoraStagingBlobUrl,
} from "../../lib/server/importedAudio";

test("detects the real MP3 signature instead of trusting the filename", () => {
  const mp3 = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);
  assert.deepEqual(detectAudioFormat(mp3), {
    mimeType: "audio/mpeg",
    extension: "mp3",
  });
});

test("decrypts an AES-GCM staging payload without changing bytes", () => {
  const clear = Buffer.from("audio bytes under custody");
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(clear),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  assert.deepEqual(
    decryptStagedAudio(
      encrypted,
      key.toString("base64"),
      iv.toString("base64"),
    ),
    clear,
  );
});

test("accepts only a staging URL bound to the same session", () => {
  const session = "12345678-1234-4234-8234-123456789abc";
  assert.equal(
    isKhoraStagingBlobUrl(
      `https://store.public.blob.vercel-storage.com/staging/audio/${session}/x.khstaging`,
      session,
    ),
    true,
  );
  assert.equal(
    isKhoraStagingBlobUrl("https://example.com/staging/audio/x", session),
    false,
  );
});

test("keeps the product limit above the supplied 13.97 MB sample", () => {
  assert.ok(MAX_IMPORTED_AUDIO_BYTES > 13_970_016);
});
