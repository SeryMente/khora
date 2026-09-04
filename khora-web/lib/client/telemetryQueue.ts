// @l0 L0-002-R · Client-side durable telemetry queue backed by IndexedDB
import { ObservationEnvelope, validateObservationPrivacy } from "../contracts/observation";

const DB_NAME = "khora_telemetry_db";
const DB_VERSION = 1;
const STORE_NAME = "telemetry_queue";

export interface QueuedTelemetryItem {
  id?: number;
  event_uuid: string;
  envelope: ObservationEnvelope;
  created_at: string;
  retry_count: number;
}

class ClientTelemetryQueue {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isFlushing = false;

  constructor() {
    if (typeof window !== "undefined" && "indexedDB" in window) {
      this.initDB();
      this.attachNetworkListeners();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        return reject(new Error("IndexedDB no está disponible"));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("event_uuid", "event_uuid", { unique: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private attachNetworkListeners() {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      this.flushQueue();
    });

    window.addEventListener("pagehide", () => {
      this.flushBeacon();
    });

    window.addEventListener("beforeunload", () => {
      this.flushBeacon();
    });
  }

  /**
   * Enqueues an ObservationEnvelope in IndexedDB for durable background delivery.
   */
  public async enqueue(envelope: ObservationEnvelope): Promise<boolean> {
    const privacyCheck = validateObservationPrivacy(envelope);
    if (!privacyCheck.valid) {
      console.warn("[TelemetryQueue] Evento rechazado por violar privacidad:", privacyCheck.reason);
      return false;
    }

    try {
      const db = await this.initDB();
      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const item: QueuedTelemetryItem = {
          event_uuid: envelope.event_uuid,
          envelope,
          created_at: new Date().toISOString(),
          retry_count: 0,
        };

        const req = store.add(item);
        req.onsuccess = () => {
          resolve(true);
          if (navigator.onLine) {
            this.flushQueue();
          }
        };
        req.onerror = () => resolve(false);
      });
    } catch (err) {
      console.error("[TelemetryQueue] Error al encolar evento en IndexedDB:", err);
      return false;
    }
  }

  /**
   * Reads all queued telemetry events from IndexedDB.
   */
  public async getQueuedEvents(): Promise<QueuedTelemetryItem[]> {
    try {
      const db = await this.initDB();
      return new Promise<QueuedTelemetryItem[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Flushes queued items to server via POST /api/eventos when online.
   */
  public async flushQueue(): Promise<{ sent: number; failed: number }> {
    if (this.isFlushing || typeof window === "undefined" || !navigator.onLine) {
      return { sent: 0, failed: 0 };
    }

    this.isFlushing = true;
    let sent = 0;
    let failed = 0;

    try {
      const items = await this.getQueuedEvents();
      if (items.length === 0) {
        this.isFlushing = false;
        return { sent: 0, failed: 0 };
      }

      const envelopes = items.map((i) => i.envelope);

      const response = await fetch("/api/eventos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": `batch-client-${Date.now()}`,
        },
        body: JSON.stringify(envelopes),
      });

      if (response.ok) {
        const data = await response.json();
        const results: Array<{ event_uuid: string; status: string }> = data.results || [];

        const db = await this.initDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        for (const item of items) {
          const resItem = results.find((r) => r.event_uuid === item.event_uuid);
          if (resItem && (resItem.status === "inserted" || resItem.status === "duplicate")) {
            if (item.id !== undefined) store.delete(item.id);
            sent++;
          } else {
            item.retry_count++;
            if (item.retry_count > 5) {
              if (item.id !== undefined) store.delete(item.id);
            } else {
              store.put(item);
            }
            failed++;
          }
        }
      } else {
        failed = items.length;
      }
    } catch (err) {
      console.error("[TelemetryQueue] Error durante flushQueue:", err);
    } finally {
      this.isFlushing = false;
    }

    return { sent, failed };
  }

  /**
   * Performs non-blocking beacon dispatch for page unload / hidden events.
   */
  public async flushBeacon(): Promise<boolean> {
    if (typeof window === "undefined" || !("navigator" in window) || !navigator.sendBeacon) {
      return false;
    }

    try {
      const items = await this.getQueuedEvents();
      if (items.length === 0) return true;

      const envelopes = items.map((i) => i.envelope);
      const blob = new Blob([JSON.stringify(envelopes)], { type: "application/json" });
      const success = navigator.sendBeacon("/api/eventos", blob);

      if (success) {
        const db = await this.initDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (const item of items) {
          if (item.id !== undefined) store.delete(item.id);
        }
      }

      return success;
    } catch {
      return false;
    }
  }
}

export const telemetryQueue = new ClientTelemetryQueue();
