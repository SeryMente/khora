import { recordSchema, type ExperienceRecord } from "../contracts/dictado-experience";

/** Memory-only, metadata-only outbox. No transcript, audio or free comment is persisted. */
export class ExperienceDelivery {
  private queue: ExperienceRecord[] = [];
  private generation = 0;
  private active: Promise<boolean> | null = null;
  constructor(private send: (record: ExperienceRecord, owner: string) => Promise<void>,
    private canSend: () => boolean, private owner: () => string, private capacity = 128) {}
  enqueue(record: ExperienceRecord): boolean {
    const parsed = recordSchema.safeParse(record);
    if (!parsed.success || parsed.data.data.kind === "feedback" || this.queue.length >= this.capacity) return false;
    if (this.queue.some(r => r.id === record.id)) return true;
    this.queue.push(structuredClone(parsed.data)); return true;
  }
  get size() { return this.queue.length; }
  reset(): void { this.generation++; this.queue = []; }
  /** Keep the captured owner for every attempt; old responses cannot consume a new queue. */
  flush(): Promise<boolean> {
    if (this.active) return this.active;
    const generation = this.generation, owner = this.owner();
    const work = async () => {
      while (generation === this.generation && owner && owner === this.owner() && this.canSend() && this.queue.length) {
        const item = this.queue[0];
        try { await this.send(item, owner); } catch { return false; }
        if (generation !== this.generation || owner !== this.owner()) return true;
        this.queue = this.queue.filter(r => r.id !== item.id);
      }
      return this.queue.length === 0;
    };
    this.active = work().finally(() => { this.active = null; });
    return this.active;
  }
}
