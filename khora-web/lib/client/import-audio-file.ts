import { upload } from "@vercel/blob/client";
import { transcribeStoredSession } from "./authoritative-transcription";

export const MAX_IMPORT_AUDIO_BYTES = 24 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "mp4",
  "wav",
  "webm",
  "ogg",
  "flac",
]);

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function readJson(response: Response): Promise<Record<string, any>> {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {
      detail:
        raw.trim().slice(0, 200) ||
        `Respuesta HTTP ${response.status} sin JSON`,
    };
  }
}

export function validateImportedAudio(file: File): void {
  if (file.size <= 0) throw new Error("El archivo de audio está vacío");
  if (file.size > MAX_IMPORT_AUDIO_BYTES) {
    throw new Error("El archivo supera el límite de 24 MB para transcripción");
  }
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(
      "Formato no admitido. Usa MP3, M4A, MP4, WAV, WebM, OGG o FLAC",
    );
  }
}

export async function importAndTranscribeAudio(args: {
  file: File;
  sessionId: string;
  previewText: string;
}): Promise<{ ok: boolean; data: Record<string, any> }> {
  validateImportedAudio(args.file);

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    await args.file.arrayBuffer(),
  );
  const stagingFile = new File([encrypted], "audio-importado.khstaging", {
    type: "application/octet-stream",
  });
  const stagingPath = `staging/audio/${args.sessionId}/${crypto.randomUUID()}.khstaging`;

  const stagingBlob = await upload(stagingPath, stagingFile, {
    access: "public",
    handleUploadUrl: "/api/audio/importar/token",
    multipart: true,
    clientPayload: JSON.stringify({ sessionId: args.sessionId }),
  });

  const storedResponse = await fetch("/api/audio/importar/procesar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: args.sessionId,
      stagingUrl: stagingBlob.url,
      keyBase64: bytesToBase64(rawKey),
      ivBase64: bytesToBase64(iv),
      originalName: args.file.name,
    }),
  });
  const stored = await readJson(storedResponse);
  if (!storedResponse.ok) {
    throw new Error(stored.detail || "No se pudo custodiar el audio importado");
  }

  const transcription = await transcribeStoredSession(
    args.sessionId,
    args.previewText,
  );

  return {
    ok: transcription.ok && transcription.data?.exito === true,
    data: {
      ...transcription.data,
      sessionId: args.sessionId,
      audioUrl: stored.audioUrl,
      audioBytes: stored.audioBytes,
      mimeType: stored.mimeType,
      estadoTranscripcion: transcription.data?.estadoTranscripcion || "fallido",
    },
  };
}
