import { db, type Captura } from "./db";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TIMEOUT_MS = 10_000;
// Backoff exponencial para fallos TRANSITORIOS (sin red, timeout, 5xx).
// Un fallo transitorio NUNCA marca la captura como "error": se queda "pending"
// y se reintenta sola, con espera creciente y acotada. Si el backend está caído
// horas, la captura no se pierde ni exige un toque manual: sube en cuanto el
// servidor responde.
const BACKOFF_BASE_MS = 5_000; // 5 s
const BACKOFF_MAX_MS = 5 * 60_000; // tope: 5 min

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

/** Próximo reintento con backoff exponencial acotado. */
function calcularNextRetry(intentos: number): string {
	const espera = Math.min(BACKOFF_BASE_MS * 2 ** (intentos - 1), BACKOFF_MAX_MS);
	return new Date(Date.now() + espera).toISOString();
}

/**
 * Fallo TRANSITORIO: la captura SIGUE "pending" (nunca "error") y se agenda su
 * próximo intento con backoff. La recuperación es automática.
 */
async function registrarFallo(captura: Captura): Promise<void> {
	const intentos = (captura.intentos ?? 0) + 1;
	await db.capturas.update(captura.id, {
		intentos,
		status: "pending",
		nextRetry: calcularNextRetry(intentos),
	});
}

/** Sube las capturas pendientes cuyo backoff ya venció, de la más antigua a la más nueva. */
export async function pushPending(): Promise<number> {
	if (!API_URL) {
		console.error("[sync] NEXT_PUBLIC_API_URL no está configurada");
		return 0;
	}

	const ahora = Date.now();
	const pendientes = (await db.capturas.where("status").equals("pending").toArray())
		.filter((c) => !c.nextRetry || Date.parse(c.nextRetry) <= ahora)
		.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

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
							nextRetry: undefined,
						});
					});
				} else {
					await db.capturas.update(captura.id, {
						status: "synced",
						intentos: 0,
						nextRetry: undefined,
					});
				}
				sincronizadas++;
			} else if (res.status >= 400 && res.status < 500) {
				// Error PERMANENTE (p. ej. cuerpo inválido): no reintentar en bucle.
				// Solo aquí marcamos "error" → el usuario lo reencola a mano.
				await db.capturas.update(captura.id, { status: "error", nextRetry: undefined });
				console.error(`[sync] nota ${captura.id} rechazada (${res.status})`);
			} else {
				// 5xx: transitorio → sigue pending con backoff.
				await registrarFallo(captura);
			}
		} catch {
			// Sin red, timeout o backend caído: transitorio → sigue pending con backoff.
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
					await db.capturas.update(s.id, {
						status: "synced",
						intentos: 0,
						nextRetry: undefined,
					});
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

/**
 * Reencola las notas en "error" (fallo PERMANENTE) para reintentarlas.
 * Acción manual: ahora los fallos transitorios ya no llegan aquí (se recuperan
 * solos), así que este botón solo aplica a rechazos reales del backend.
 */
export async function reintentarErrores(): Promise<void> {
	await db.capturas
		.where("status")
		.equals("error")
		.modify({ status: "pending", intentos: 0, nextRetry: undefined });
	await sync();
}
