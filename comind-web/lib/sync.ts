import { db, type Captura } from "./db";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TIMEOUT_MS = 10_000;
const MAX_INTENTOS = 5;

interface ServerCaptura {
	id: string;
	texto: string;
	timestamp: string;
}

let sincronizando: Promise<void> | null = null;
let pendienteOtra = false;

/** fetch con timeout: una petición colgada no debe bloquear la sincronización. */
async function fetchConTimeout(url: string, init?: RequestInit): Promise<Response> {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
	try {
		return await fetch(url, { ...init, signal: ctrl.signal });
	} finally {
		clearTimeout(t);
	}
}

/** Cuenta un fallo transitorio; tras demasiados intentos marca la nota para revisión manual. */
async function registrarFallo(captura: Captura): Promise<void> {
	const intentos = (captura.intentos ?? 0) + 1;
	await db.capturas.update(captura.id, {
		intentos,
		status: intentos >= MAX_INTENTOS ? "error" : "pending",
	});
}

/** Sube al backend toda captura pendiente (outbox), de la más antigua a la más nueva. */
export async function pushPending(): Promise<number> {
	if (!API_URL) {
		console.error("[sync] NEXT_PUBLIC_API_URL no está configurada");
		return 0;
	}

	const pendientes = (
		await db.capturas.where("status").equals("pending").toArray()
	).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

	let sincronizadas = 0;
	for (const captura of pendientes) {
		try {
			const res = await fetchConTimeout(`${API_URL}/capturar`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ texto: captura.texto }),
			});

			if (res.ok) {
				const body = (await res.json()) as { ok: boolean; id: string | null };
				const serverId = body.id;
				// El backend asigna su propio id: lo adoptamos (en transacción) para que
				// al bajar las capturas no se dupliquen.
				if (serverId && serverId !== captura.id) {
					await db.transaction("rw", db.capturas, async () => {
						await db.capturas.delete(captura.id);
						await db.capturas.put({
							...captura,
							id: serverId,
							status: "synced",
							intentos: 0,
						});
					});
				} else {
					await db.capturas.update(captura.id, { status: "synced", intentos: 0 });
				}
				sincronizadas++;
			} else if (res.status >= 400 && res.status < 500) {
				// Error permanente (p. ej. cuerpo inválido): no reintentar en bucle.
				await db.capturas.update(captura.id, { status: "error" });
				console.error(`[sync] nota ${captura.id} rechazada (${res.status})`);
			} else {
				// 5xx: transitorio.
				await registrarFallo(captura);
			}
		} catch {
			// Sin red, timeout o backend caído: transitorio.
			await registrarFallo(captura);
		}
	}
	return sincronizadas;
}

/** Baja las capturas del backend y las refleja en la base local. */
export async function pullServer(): Promise<void> {
	if (!API_URL) return;
	try {
		const res = await fetchConTimeout(`${API_URL}/capturas`, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
		});
		if (!res.ok) return;

		const data = (await res.json()) as { capturas?: ServerCaptura[] };
		const servidor = data.capturas ?? [];

		await db.transaction("rw", db.capturas, async () => {
			for (const s of servidor) {
				const local = await db.capturas.get(s.id);
				if (!local) {
					await db.capturas.put({
						id: s.id,
						texto: s.texto,
						timestamp: s.timestamp,
						status: "synced",
						intentos: 0,
					});
				} else if (local.status !== "synced") {
					await db.capturas.update(s.id, { status: "synced", intentos: 0 });
				}
			}
		});
	} catch {
		// Sin red: nos quedamos con lo local.
	}
}

/**
 * Sincronización completa con single-flight + coalescing:
 * varias llamadas concurrentes se fusionan en una; si llega otra a mitad,
 * se ejecuta una pasada más al terminar (no se pierde ninguna captura recién añadida).
 */
export function sync(): Promise<void> {
	if (sincronizando) {
		pendienteOtra = true;
		return sincronizando;
	}
	sincronizando = (async () => {
		try {
			do {
				pendienteOtra = false;
				await pushPending();
				await pullServer();
			} while (pendienteOtra);
		} finally {
			sincronizando = null;
		}
	})();
	return sincronizando;
}

/** Reencola las notas en "error" para volver a intentarlas (acción manual del usuario). */
export async function reintentarErrores(): Promise<void> {
	await db.capturas.where("status").equals("error").modify({ status: "pending", intentos: 0 });
	await sync();
}
