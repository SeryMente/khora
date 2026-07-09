import Dexie, { type Table } from "dexie";
import { ITelemetryEvent } from "./telemetry-schema";

class KhoraTelemetryDB extends Dexie {
  events!: Table<ITelemetryEvent, number>;

  constructor() {
    super("khora-telemetry");
    this.version(1).stores({
      events: "++id, timestamp, moduleId, action, severity",
    });
  }
}

export const telemetryDb = new KhoraTelemetryDB();

/**
 * Registra un evento de telemetría en IndexedDB.
 */
export async function logTelemetryEvent(event: Omit<ITelemetryEvent, 'timestamp' | 'sessionId'> & { sessionId?: string }) {
  try {
    const timestamp = new Date().toISOString();

    // Attempt to get a session ID from sessionStorage if not provided, or generate a temporary one
    let sessionId = event.sessionId;
    if (!sessionId && typeof window !== 'undefined') {
      sessionId = sessionStorage.getItem('khora_session_id') || undefined;
      if (!sessionId) {
        sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        sessionStorage.setItem('khora_session_id', sessionId);
      }
    } else if (!sessionId) {
      sessionId = "server-or-unknown";
    }

    const fullEvent: ITelemetryEvent = {
      ...event,
      timestamp,
      sessionId: sessionId as string,
    };

    await telemetryDb.events.add(fullEvent);
    console.debug(`[Telemetry] ${fullEvent.severity} ${fullEvent.action}:`, fullEvent);
  } catch (error) {
    console.error("Error logging telemetry event:", error);
  }
}

/**
 * Exporta todos los eventos a formato JSONL.
 */
export async function exportTelemetryJSONL(): Promise<string> {
  const allEvents = await telemetryDb.events.orderBy('timestamp').toArray();
  return allEvents.map(e => {
    // Remove the Dexie auto-incremented id before exporting to match schema exactly if needed,
    // though ITelemetryEvent doesn't specify an 'id' field, Dexie adds it to the returned objects.
    const { id, ...schemaEvent } = e as any;
    return JSON.stringify(schemaEvent);
  }).join('\n');
}

/**
 * Descarga el archivo JSONL en el navegador.
 */
export async function downloadTelemetryJSONL() {
  try {
    const jsonl = await exportTelemetryJSONL();
    const blob = new Blob([jsonl], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khora-telemetry-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading telemetry:", error);
  }
}
