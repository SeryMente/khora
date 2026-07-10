import Dexie, { type Table } from "dexie";
import { Captura } from "./db";

export type PrismaEvidenceStatus = "pending" | "processing" | "processed" | "error";

/**
 * Representa una pieza de evidencia (una captura) encolada para ser procesada
 * por el "cerebro Prisma" en el futuro.
 */
export interface PrismaEvidence {
	/** UUID único para este registro en la cola de Prisma */
	id: string;

	/** Referencia opcional al ID de la captura original si proviene de la DB principal */
	capturaId?: string;

	/** La captura íntegra o el payload de evidencia */
	payload: Captura | any;

	/** Momento en que se encoló la evidencia (ISO-8601) */
	timestamp: string;

	/** Origen de la evidencia */
	origen: string;

	/** Estado de procesamiento en la cola */
	status: PrismaEvidenceStatus;

	/** Contador de intentos fallidos de procesamiento */
	intentos: number;

	/** Momento a partir del cual se puede volver a intentar procesar (ISO-8601), implementa backoff */
	nextRetry?: string;
}

class KhoraPrismaDB extends Dexie {
	evidence!: Table<PrismaEvidence, string>;

	constructor() {
		super("khora-prisma-pool");
		this.version(1).stores({
			// Índices principales para buscar pendientes y manejar la cola
			evidence: "id, timestamp, status, nextRetry",
		});
	}
}

export const prismaDb = new KhoraPrismaDB();

// Robustez multi-pestaña
prismaDb.on("versionchange", () => {
	prismaDb.close();
	console.warn("[prismaDb] esquema actualizado en otra pestaña; recarga para continuar.");
});
prismaDb.on("blocked", () => {
	console.warn("[prismaDb] apertura bloqueada por otra pestaña con una versión anterior.");
});

/** Genera un id único */
function newId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Encola una nueva captura en el pool de evidencia de Prisma.
 * @param payload La captura íntegra o datos a procesar
 * @param origen El origen de los datos
 * @param capturaId Referencia opcional a la captura original
 */
export async function queuePrismaEvidence(payload: any, origen: string, capturaId?: string): Promise<string> {
	const id = newId();
	const evidence: PrismaEvidence = {
		id,
		capturaId,
		payload,
		timestamp: new Date().toISOString(),
		origen,
		status: "pending",
		intentos: 0,
	};

	await prismaDb.evidence.add(evidence);
	return id;
}

/**
 * Marca una evidencia con error y programa su próximo reintento
 * usando un backoff exponencial (1m, 2m, 4m, 8m, etc.)
 */
export async function markEvidenceFailure(id: string): Promise<void> {
	await prismaDb.transaction("rw", prismaDb.evidence, async () => {
		const evidence = await prismaDb.evidence.get(id);
		if (!evidence) return;

		const nuevosIntentos = evidence.intentos + 1;

		// Backoff exponencial en minutos: 1, 2, 4, 8, 16...
		const backoffMinutes = Math.pow(2, nuevosIntentos - 1);

		// Tope de backoff: 24 horas
		const finalBackoffMs = Math.min(backoffMinutes * 60 * 1000, 24 * 60 * 60 * 1000);

		const nextRetry = new Date(Date.now() + finalBackoffMs).toISOString();

		await prismaDb.evidence.update(id, {
			status: "error",
			intentos: nuevosIntentos,
			nextRetry
		});
	});
}

/**
 * Obtiene las evidencias pendientes de procesar, respetando el tiempo de reintento.
 */
export async function getPendingEvidence(limit = 10): Promise<PrismaEvidence[]> {
	const now = new Date().toISOString();

	// Queremos aquellas en pending o error cuyo nextRetry haya pasado
	const allPending = await prismaDb.evidence
		.where("status")
		.anyOf("pending", "error")
		.toArray();

	// Filtrar por nextRetry manualmente y ordenar por timestamp
	return allPending
		.filter(e => e.status === "pending" || !e.nextRetry || e.nextRetry <= now)
		.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
		.slice(0, limit);
}
