import { createDecipheriv } from "crypto";

export const MAX_IMPORTED_AUDIO_BYTES = 24 * 1024 * 1024;
export const MAX_STAGED_AUDIO_BYTES = MAX_IMPORTED_AUDIO_BYTES + 32;

export type DetectedAudioFormat = {
  mimeType: string;
  extension: "mp3" | "m4a" | "wav" | "webm" | "ogg" | "flac";
};

export function detectAudioFormat(bytes: Buffer): DetectedAudioFormat | null {
  if (bytes.length >= 3 && bytes.subarray(0, 3).toString("ascii") === "ID3") {
    return { mimeType: "audio/mpeg", extension: "mp3" };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return { mimeType: "audio/mpeg", extension: "mp3" };
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return { mimeType: "audio/wav", extension: "wav" };
  }
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "OggS") {
    return { mimeType: "audio/ogg", extension: "ogg" };
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return { mimeType: "audio/webm", extension: "webm" };
  }
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "fLaC") {
    return { mimeType: "audio/flac", extension: "flac" };
  }
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp") {
    return { mimeType: "audio/mp4", extension: "m4a" };
  }
  return null;
}

export function decryptStagedAudio(
  encrypted: Buffer,
  keyBase64: string,
  ivBase64: string,
): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  const iv = Buffer.from(ivBase64, "base64");
  if (key.length !== 32) throw new Error("Llave temporal de audio inválida");
  if (iv.length !== 12) throw new Error("IV temporal de audio inválido");
  if (encrypted.length <= 16)
    throw new Error("Carga cifrada vacía o incompleta");

  const tag = encrypted.subarray(encrypted.length - 16);
  const body = encrypted.subarray(0, encrypted.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

export function isKhoraStagingBlobUrl(
  urlValue: string,
  sessionId: string,
): boolean {
  try {
    const url = new URL(urlValue);
    const hostAllowed =
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com");
    const pathAllowed = url.pathname.includes(`/staging/audio/${sessionId}/`);
    return hostAllowed && pathAllowed;
  } catch {
    return false;
  }
}
