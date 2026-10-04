export type Mp3ExportOptions = {
  sourceUrl: string;
  filename?: string;
  bitrateKbps?: number;
};

function floatToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

export async function exportAudioAsMp3({
  sourceUrl,
  filename = "khora-audio.mp3",
  bitrateKbps = 128,
}: Mp3ExportOptions): Promise<void> {
  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.clone().json();
      detail = typeof body?.detail === "string" ? body.detail : "";
    } catch {
      detail = "";
    }
    throw new Error(detail || `No se pudo recuperar el audio (HTTP ${response.status}).`);
  }

  const bytes = await response.arrayBuffer();
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error("Este navegador no expone AudioContext para convertir el audio a MP3.");
  }

  const audioContext = new AudioContextCtor();
  try {
    const decoded = await audioContext.decodeAudioData(bytes.slice(0));
    const lamejs = await import("@breezystack/lamejs");
    const channels = Math.min(decoded.numberOfChannels, 2);
    const encoder = new lamejs.Mp3Encoder(
      channels,
      decoded.sampleRate,
      bitrateKbps,
    );
    const mp3Chunks: Int8Array[] = [];
    const blockSize = 1152;
    const left = decoded.getChannelData(0);
    const right = channels === 2 ? decoded.getChannelData(1) : null;

    for (let offset = 0; offset < left.length; offset += blockSize) {
      const end = Math.min(offset + blockSize, left.length);
      const leftChunk = floatToInt16(left.subarray(offset, end));
      const mp3Buffer = right
        ? encoder.encodeBuffer(leftChunk, floatToInt16(right.subarray(offset, end)))
        : encoder.encodeBuffer(leftChunk);
      if (mp3Buffer.length > 0) mp3Chunks.push(new Int8Array(mp3Buffer));
    }

    const tail = encoder.flush();
    if (tail.length > 0) mp3Chunks.push(new Int8Array(tail));

    const blob = new Blob(mp3Chunks, { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename.toLowerCase().endsWith(".mp3")
      ? filename
      : `${filename}.mp3`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}
