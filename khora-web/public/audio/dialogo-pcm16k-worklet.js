/* Derivative, non-authoritative 16 kHz lane. MediaRecorder originals remain untouched. */
class KhoraDialogoPcm16kProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.source = String(options.processorOptions && options.processorOptions.source || "unknown");
    this.ratio = sampleRate / 16000;
    this.input = new Float32Array(0);
    this.position = 0;
    this.output = new Float32Array(0);
    this.sequence = 0;
    this.windowFrames = 104000;
    this.hopFrames = 96000;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "flush") {
        this.flush();
        this.port.postMessage({ type: "flushed", source: this.source });
      }
    };
  }

  mix(channels) {
    if (!channels || !channels.length) return new Float32Array(0);
    const length = Math.min(...channels.map((channel) => channel.length));
    const out = new Float32Array(length);
    if (channels.length === 1) {
      out.set(channels[0]);
      return out;
    }
    if (channels.length === 2) {
      let cross = 0, lp = 0, rp = 0;
      for (let i = 0; i < length; i++) {
        cross += channels[0][i] * channels[1][i];
        lp += channels[0][i] * channels[0][i];
        rp += channels[1][i] * channels[1][i];
      }
      const anti = cross < -0.15 * Math.sqrt(lp * rp);
      for (let i = 0; i < length; i++) {
        const mixed = anti ? (channels[0][i] - channels[1][i]) * 0.5 : (channels[0][i] + channels[1][i]) * 0.5;
        out[i] = Math.max(-1, Math.min(1, mixed));
      }
      return out;
    }
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const channel of channels) sum += channel[i];
      out[i] = Math.max(-1, Math.min(1, sum / channels.length));
    }
    return out;
  }

  appendInput(mono) {
    const joined = new Float32Array(this.input.length + mono.length);
    joined.set(this.input);
    joined.set(mono, this.input.length);
    this.input = joined;
    const resampled = [];
    while (this.position + 1 < this.input.length) {
      const left = Math.floor(this.position);
      const frac = this.position - left;
      resampled.push(this.input[left] * (1 - frac) + this.input[left + 1] * frac);
      this.position += this.ratio;
    }
    const discard = Math.max(0, Math.floor(this.position) - 1);
    if (discard) {
      this.input = this.input.slice(discard);
      this.position -= discard;
    }
    if (resampled.length) {
      const next = new Float32Array(this.output.length + resampled.length);
      next.set(this.output);
      next.set(resampled, this.output.length);
      this.output = next;
    }
    this.emitComplete();
  }

  wav(samples) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (offset, value) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    write(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true);
    write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    write(36, "data"); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const value = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, value < 0 ? Math.round(value * 32768) : Math.round(value * 32767), true);
    }
    return buffer;
  }

  emit(samples) {
    const sequence = ++this.sequence;
    const startMs = (sequence - 1) * 6000;
    const wav = this.wav(samples);
    this.port.postMessage({
      type: "window", source: this.source, sequence, startMs,
      endMs: startMs + Math.min(6500, samples.validFrames * 1000 / 16000),
      wav
    }, [wav]);
  }

  emitComplete() {
    while (this.output.length >= this.windowFrames) {
      const frame = this.output.slice(0, this.windowFrames);
      frame.validFrames = this.windowFrames;
      this.emit(frame);
      this.output = this.output.slice(this.hopFrames);
    }
  }

  flush() {
    if (this.output.length <= 8000) {
      this.output = new Float32Array(0);
      return;
    }
    const valid = this.output.length;
    const padded = new Float32Array(this.windowFrames);
    padded.set(this.output.subarray(0, this.windowFrames));
    padded.validFrames = valid;
    this.emit(padded);
    this.output = new Float32Array(0);
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input && input.length) this.appendInput(this.mix(input));
    const output = outputs[0];
    if (output) for (const channel of output) channel.fill(0);
    return true;
  }
}
registerProcessor("khora-dialogo-pcm16k", KhoraDialogoPcm16kProcessor);
