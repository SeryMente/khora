import Dexie, { type Table } from "dexie";

export type CapturaStatus = "pending" | "synced" | "error";

export interface Captura {
	id: string; // UUID del cliente (luego adopta el id del servidor)
	texto: string;
	timestamp: string; // ISO-8601 (momento de captura)
	status: CapturaStatus;
	intentos?: number; // fallos transitorios de sincronización acumulados
	nextRetry?: string; // ISO-8601: no reintentar antes de este instante (backoff)
}

class CoMindDB extends Dexie {
	capturas!: Table<Captura, string>;

	constructor() {
		super("comind");
		// version(2): primary key id + índices por timestamp (orden) y status (filtro).
		this.version(2).stores({
			capturas: "id, timestamp, status",
		});
	}
}

export const db = new CoMindDB();

// Robustez multi-pestaña: si otra pestaña cambia el esquema, cerramos para no corromper.
db.on("versionchange", () => {
	db.close();
	console.warn("[db] esquema actualizado en otra pestaña; recarga para continuar.");
});
db.on("blocked", () => {
	console.warn("[db] apertura bloqueada por otra pestaña con una versión anterior.");
});

/** Genera un id único, con fallback para contextos sin crypto.randomUUID. */
export function nuevoId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
