import type { FuenteDialogo } from "./contrato";
import type { VentanaPcm } from "./audio";

export type VentanaDialogo = VentanaPcm & { fuente: FuenteDialogo };
type Canal = { source: FuenteDialogo; stream: MediaStream; sourceNode: MediaStreamAudioSourceNode; worklet: AudioWorkletNode };

export class CapturaAudioDerivada {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private channels: Canal[] = [];
  private flushed = new Set<FuenteDialogo>();
  private flushResolvers = new Map<FuenteDialogo, () => void>();
  private closed = false;

  private constructor(private readonly onWindow: (window: VentanaDialogo) => void, private readonly onUnavailable: (source: FuenteDialogo) => void) {}

  static async create(
    streams: Array<{ source: FuenteDialogo; stream: MediaStream }>,
    onWindow: (window: VentanaDialogo) => void,
    onUnavailable: (source: FuenteDialogo) => void,
  ): Promise<CapturaAudioDerivada> {
    const capture = new CapturaAudioDerivada(onWindow, onUnavailable);
    try {
      const AudioContextCtor = window.AudioContext;
      if (!AudioContextCtor) throw new Error("audio_worklet_no_disponible");
      capture.context = new AudioContextCtor();
      if (!capture.context.audioWorklet) throw new Error("audio_worklet_no_disponible");
      await capture.context.audioWorklet.addModule("/audio/dialogo-pcm16k-worklet.js");
      capture.gain = capture.context.createGain();
      capture.gain.gain.value = 0;
      capture.gain.connect(capture.context.destination);
      await capture.context.resume();
      for (const item of streams) {
        try {
          const sourceNode = capture.context.createMediaStreamSource(item.stream);
          const worklet = new AudioWorkletNode(capture.context, "khora-dialogo-pcm16k", {
            numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
            processorOptions: { source: item.source },
          });
          worklet.port.onmessage = (event: MessageEvent) => {
            const data = event.data;
            if (data?.type === "window" && data.source === item.source && data.wav instanceof ArrayBuffer) {
              try {
                capture.onWindow({
                  fuente: item.source,
                  sequence: Number(data.sequence),
                  startMs: Number(data.startMs),
                  endMs: Number(data.endMs),
                  wav: new Blob([data.wav], { type: "audio/wav" }),
                });
              } catch {
                capture.onUnavailable(item.source);
              }
            }
            if (data?.type === "flushed" && data.source === item.source) {
              capture.flushed.add(item.source);
              capture.flushResolvers.get(item.source)?.();
            }
          };
          worklet.onprocessorerror = () => capture.onUnavailable(item.source);
          sourceNode.connect(worklet);
          worklet.connect(capture.gain);
          capture.channels.push({ source: item.source, stream: item.stream, sourceNode, worklet });
        } catch {
          onUnavailable(item.source);
        }
      }
      return capture;
    } catch {
      for (const item of streams) onUnavailable(item.source);
      await capture.close();
      return capture;
    }
  }

  async flush(): Promise<void> {
    const active = this.channels.filter((channel) => !this.flushed.has(channel.source));
    await Promise.all(active.map((channel) => new Promise<void>((resolve) => {
      this.flushResolvers.set(channel.source, resolve);
      channel.worklet.port.postMessage({ type: "flush" });
      window.setTimeout(resolve, 1500);
    })));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.channels.forEach(({ sourceNode, worklet }) => {
      try { sourceNode.disconnect(); } catch {}
      try { worklet.disconnect(); } catch {}
      worklet.port.close();
    });
    this.channels = [];
    try { this.gain?.disconnect(); } catch {}
    try { await this.context?.close(); } catch {}
    this.context = null;
  }
}
