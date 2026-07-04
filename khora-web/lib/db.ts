import Dexie, { type Table } from "dexie";
import { ForensicMetadata } from "./forensics";

export type CapturaStatus = "pending" | "synced" | "error";
export type CapturaTipo = "pernocta" | "ubicacion" | "nota" | "evento" | "insight";
export type CapturaOrigen = "keyboard" | "voice";

export interface Captura {
	id: string; // UUID del cliente (luego adopta el id del servidor)
	texto: string;
	timestamp: string; // ISO-8601 (momento de captura)
	status: CapturaStatus;
	tipo: CapturaTipo;
	origen: CapturaOrigen;
	visibilidad: "public";
	
	// Metadatos forenses y de auditoría
	secuencia?: number; // Contador monótono local
	hash?: string; // SHA-256 de esta entrada
	hashPrevio?: string; // SHA-256 de la entrada anterior
	forensics?: ForensicMetadata; // Blob con toda la información forense
	
	metadata?: {
		duracionDictado?: number; // en ms
		dispositivo?: string;
		latenciaGuardado?: number; // en ms
		erroresSync?: number;
		notionStatus?: string;
	};
	intentos?: number; // fallos transitorios de sincronización acumulados
	nextRetry?: string; // ISO-8601: no reintentar antes de este instante (backoff)
}

class KhoraDB extends Dexie {
	capturas!: Table<Captura, string>;

	constructor() {
		super("khora");
		// version(4): Se añaden campos de secuencia y hash en la interfaz, el schema de db indexada queda igual, 
		// pero incrementamos la versión por si acaso, aunque los índices son los mismos.
		this.version(4).stores({
			capturas: "id, timestamp, status, tipo, secuencia",
		});
	}
}

export const db = new KhoraDB();

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
