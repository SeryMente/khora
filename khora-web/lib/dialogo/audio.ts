export const DIALOGO_SAMPLE_RATE = 16_000;
export const DIALOGO_WINDOW_MS = 6_500;
export const DIALOGO_OVERLAP_MS = 500;
export const DIALOGO_HOP_MS = DIALOGO_WINDOW_MS - DIALOGO_OVERLAP_MS;
export const DIALOGO_WINDOW_FRAMES = DIALOGO_SAMPLE_RATE * DIALOGO_WINDOW_MS / 1000;
export const DIALOGO_HOP_FRAMES = DIALOGO_SAMPLE_RATE * DIALOGO_HOP_MS / 1000;
export const DIALOGO_OVERLAP_FRAMES = DIALOGO_WINDOW_FRAMES - DIALOGO_HOP_FRAMES;

export type VentanaPcm = {
  sequence: number;
  startMs: number;
  endMs: number;
  wav: Blob;
};

/** Anti-phase stereo is decoded as a difference signal, not averaged into silence. */
export function downmixFloatChannelsSafely(channels: Float32Array[]): Float32Array {
  if (!channels.length) return new Float32Array();
  const length = Math.min(...channels.map((channel) => channel.length));
  const output = new Float32Array(length);
  if (channels.length === 1) {
    output.set(channels[0].subarray(0, length));
    return output;
  }
  if (channels.length === 2) {
    let cross = 0;
    let leftPower = 0;
    let rightPower = 0;
    for (let i = 0; i < length; i++) {
      const left = channels[0][i];
      const right = channels[1][i];
      cross += left * right;
      leftPower += left * left;
      rightPower += right * right;
    }
    const antiPhase = cross < -0.15 * Math.sqrt(leftPower * rightPower);
    for (let i = 0; i < length; i++) {
      const left = channels[0][i];
      const right = channels[1][i];
      output[i] = Math.max(-1, Math.min(1, antiPhase ? (left - right) * 0.5 : (left + right) * 0.5));
    }
    return output;
  }
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const channel of channels) sum += channel[i];
    output[i] = Math.max(-1, Math.min(1, sum / channels.length));
  }
  return output;
}

export function encodeMonoPcm16Wav(samples: Float32Array, sampleRate = DIALOGO_SAMPLE_RATE): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value < 0 ? Math.round(value * 32768) : Math.round(value * 32767), true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export class Pcm16kWindowProcessor {
  private input = new Float32Array();
  private output = new Float32Array();
  private nextSourcePosition = 0;
  private sequence = 0;
  private readonly ratio: number;

  constructor(private readonly inputSampleRate: number) {
    if (!Number.isFinite(inputSampleRate) || inputSampleRate <= 0) {
      throw new Error("dialogo_sample_rate_invalido");
    }
    this.ratio = inputSampleRate / DIALOGO_SAMPLE_RATE;
  }

  push(channels: Float32Array[]): VentanaPcm[] {
    const mono = downmixFloatChannelsSafely(channels);
    if (!mono.length) return [];
    const combined = new Float32Array(this.input.length + mono.length);
    combined.set(this.input);
    combined.set(mono, this.input.length);
    this.input = combined;
    const samples: number[] = [];
    while (this.nextSourcePosition + 1 < this.input.length) {
      const left = Math.floor(this.nextSourcePosition);
      const fraction = this.nextSourcePosition - left;
      samples.push(this.input[left] * (1 - fraction) + this.input[left + 1] * fraction);
      this.nextSourcePosition += this.ratio;
    }
    const discard = Math.max(0, Math.floor(this.nextSourcePosition) - 1);
    if (discard) {
      this.input = this.input.slice(discard);
      this.nextSourcePosition -= discard;
    }
    if (samples.length) {
      const next = new Float32Array(this.output.length + samples.length);
      next.set(this.output);
      next.set(samples, this.output.length);
      this.output = next;
    }
    return this.takeCompleteWindows();
  }

  flush(): VentanaPcm[] {
    if (this.output.length <= DIALOGO_OVERLAP_FRAMES) {
      this.output = new Float32Array();
      return [];
    }
    const valid = this.output.length;
    const padded = new Float32Array(DIALOGO_WINDOW_FRAMES);
    padded.set(this.output.subarray(0, DIALOGO_WINDOW_FRAMES));
    const sequence = ++this.sequence;
    const startMs = (sequence - 1) * DIALOGO_HOP_MS;
    const endMs = startMs + Math.min(DIALOGO_WINDOW_MS, valid * 1000 / DIALOGO_SAMPLE_RATE);
    this.output = new Float32Array();
    return [{ sequence, startMs, endMs, wav: encodeMonoPcm16Wav(padded) }];
  }

  private takeCompleteWindows(): VentanaPcm[] {
    const windows: VentanaPcm[] = [];
    while (this.output.length >= DIALOGO_WINDOW_FRAMES) {
      const frame = this.output.slice(0, DIALOGO_WINDOW_FRAMES);
      const sequence = ++this.sequence;
      const startMs = (sequence - 1) * DIALOGO_HOP_MS;
      windows.push({
        sequence,
        startMs,
        endMs: startMs + DIALOGO_WINDOW_MS,
        wav: encodeMonoPcm16Wav(frame),
      });
      this.output = this.output.slice(DIALOGO_HOP_FRAMES);
    }
    return windows;
  }
}

/** Convert decoded stereo PCM16 to mono without cancelling anti-phase dialogue. */
export function downmixStereoPcm16Safely(stereo: Buffer): Buffer {
  if (stereo.length % 4 !== 0) throw new Error("pcm_estereo_truncado");
  const frames = stereo.length / 4;
  const mono = Buffer.allocUnsafe(frames * 2);
  const blockFrames = Math.max(1, Math.floor(DIALOGO_SAMPLE_RATE / 50));
  for (let start = 0; start < frames; start += blockFrames) {
    const end = Math.min(frames, start + blockFrames);
    let cross = 0;
    let leftPower = 0;
    let rightPower = 0;
    for (let i = start; i < end; i++) {
      const left = stereo.readInt16LE(i * 4) / 32768;
      const right = stereo.readInt16LE(i * 4 + 2) / 32768;
      cross += left * right;
      leftPower += left * left;
      rightPower += right * right;
    }
    const antiPhase = cross < -0.15 * Math.sqrt(leftPower * rightPower);
    for (let i = start; i < end; i++) {
      const left = stereo.readInt16LE(i * 4) / 32768;
      const right = stereo.readInt16LE(i * 4 + 2) / 32768;
      const value = Math.max(-1, Math.min(1, antiPhase ? (left - right) * 0.5 : (left + right) * 0.5));
      const pcm = value < 0 ? Math.round(value * 32768) : Math.round(value * 32767);
      mono.writeInt16LE(pcm, (i - start) * 2 + start * 2);
    }
  }
  return mono;
}

/** One PCM16 stereo WAV: left channel microphone/user, right channel Chrome audio. */
export function encodeStereoMasterWav(
  userPcm16: Buffer,
  chromePcm16: Buffer,
  userOffsetMs = 0,
  chromeOffsetMs = 0,
  sampleRate = DIALOGO_SAMPLE_RATE,
): Buffer {
  if (userPcm16.length % 2 || chromePcm16.length % 2) throw new Error("pcm_mono_truncado");
  if (![userOffsetMs, chromeOffsetMs].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new Error("dialogo_offset_invalido");
  }
  const commonOffset = Math.min(userOffsetMs, chromeOffsetMs);
  const userOffset = Math.round((userOffsetMs - commonOffset) * sampleRate / 1000);
  const chromeOffset = Math.round((chromeOffsetMs - commonOffset) * sampleRate / 1000);
  const userFrames = userPcm16.length / 2;
  const chromeFrames = chromePcm16.length / 2;
  const totalFrames = Math.max(userOffset + userFrames, chromeOffset + chromeFrames);
  const dataBytes = totalFrames * 4;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataBytes, 40);
  for (let frame = 0; frame < totalFrames; frame++) {
    const userIndex = frame - userOffset;
    const chromeIndex = frame - chromeOffset;
    const left = userIndex >= 0 && userIndex < userFrames ? userPcm16.readInt16LE(userIndex * 2) : 0;
    const right = chromeIndex >= 0 && chromeIndex < chromeFrames ? chromePcm16.readInt16LE(chromeIndex * 2) : 0;
    wav.writeInt16LE(left, 44 + frame * 4);
    wav.writeInt16LE(right, 44 + frame * 4 + 2);
  }
  return wav;
}
