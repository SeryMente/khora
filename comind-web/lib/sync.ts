import { db, type Captura } from "./db";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TIMEOUT_MS = 10_000;
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 5 * 60_000;

interface ServerCaptura {
	id: string;
	texto: string;
	timestamp: string;
}

let sincronizando: Promise<void> | null = null;
let pendienteOtra = false;
let pendienteIgnorarBackoff = false;

async function fetchConTimeout(url: string, init?: RequestInit): Promise<Response> {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
	try {
		return await fetch(url, { ...init, signal: ctrl.signal });
	} finally {
		clearTimeout(t);
	}
}

function calcularNextRetry(intentos: number): string {
	const espera = Math.min(BACKOFF_BASE_MS * 2 ** (intentos - 1), BACKOFF_MAX_MS);
	return new Date(Date.now() + espera).toISOString();
}

async function registrarFallo(captura: Captura): Promise<void> {
	const intentos = (captura.intentos ?? 0) + 1;
	await db.capturas.update(captura.id, {
		intentos,
		status: "pending",
		nextRetry: calcularNextRetry(intentos),
	});
}

export async function pushPending(ignorarBackoff = false): Promise<number> {
	if (!API_URL) {
		console.error("[sync] NEXT_PUBLIC_API_URL no está configurada");
		return 0;
	}

	const ahora = Date.now();
	const pendientes = (await db.capturas.where("status").equals("pending").toArray())
		.filter((c) => ignorarBackoff || !c.nextRetry || Date.parse(c.nextRetry) <= ahora)
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
				await db.capturas.update(captura.id, { status: "error", nextRetry: undefined });
				console.error(`[sync] nota ${captura.id} rechazada (${res.status})`);
			} else {
				await registrarFallo(captura);
			}
		} catch {
			await registrarFallo(captura);
		}
	}
	return sincronizadas;
}

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
	}
}

export function sync(opts: { ignorarBackoff?: boolean } = {}): Promise<void> {
	const ignorar = opts.ignorarBackoff ?? false;
	if (sincronizando) {
		pendienteOtra = true;
		if (ignorar) pendienteIgnorarBackoff = true;
		return sincronizando;
	}
	sincronizando = (async () => {
		try {
			let ignorarAhora = ignorar;
			do {
				pendienteOtra = false;
				pendienteIgnorarBackoff = false;
				await pushPending(ignorarAhora);
				await pullServer();
				ignorarAhora = pendienteIgnorarBackoff;
			} while (pendienteOtra);
		} finally {
			sincronizando = null;
		}
	})();
	return sincronizando;
}

export async function reintentarErrores(): Promise<void> {
	await db.capturas
		.where("status")
		.equals("error")
		.modify({ status: "pending", intentos: 0, nextRetry: undefined });
	await sync({ ignorarBackoff: true });
}
