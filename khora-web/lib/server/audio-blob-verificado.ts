import { createHash } from "node:crypto";
import { descifrarBytes } from "./cripto";

export const MAX_AUDIO_BYTES = 128 * 1024 * 1024;
export const hashAudio = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

/**
 * Reads an encrypted Vercel Blob object, decrypts it, and verifies its persisted
 * byte count and SHA-256. Do not trust a database row as proof that the object
 * still exists or still contains the original bytes.
 */
export async function leerBlobVerificado(
  url: string,
  bytes: number,
  sha: string,
): Promise<Buffer> {
  let blobUrl: URL;
  try {
    blobUrl = new URL(url);
  } catch {
    throw new Error("blob_host_no_permitido");
  }

  if (
    blobUrl.protocol !== "https:" ||
    !blobUrl.hostname.endsWith(".blob.vercel-storage.com")
  ) {
    throw new Error("blob_host_no_permitido");
  }
  if (
    !Number.isSafeInteger(bytes) ||
    bytes <= 0 ||
    bytes > MAX_AUDIO_BYTES ||
    !/^[a-f0-9]{64}$/i.test(sha)
  ) {
    throw new Error("audio_manifest_invalido");
  }

  const response = await fetch(blobUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (!response.ok || !response.body) {
    throw new Error("blob_inaccesible");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_AUDIO_BYTES + 1024) {
        await reader.cancel();
        throw new Error("audio_demasiado_grande");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  const clear = descifrarBytes(Buffer.concat(chunks));
  if (clear.length !== bytes || hashAudio(clear) !== sha.toLowerCase()) {
    throw new Error("audio_integridad_rota");
  }
  return clear;
}
