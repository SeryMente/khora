import { useCallback, useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db, nuevoId, type Captura, type CapturaTipo, type CapturaOrigen } from "./db";
import { reintentarErrores, sync } from "./sync";
import { getForensicMetadata, generateHash } from "./forensics";

export function useCapturas() {
	const [capturas, setCapturas] = useState<Captura[]>([]);
	const [cargando, setCargando] = useState(true);
	const [sincronizando, setSincronizando] = useState(false);

	useEffect(() => {
		const sub = liveQuery(() =>
			db.capturas.orderBy("timestamp").reverse().toArray(),
		).subscribe({
			next: (rows) => {
				setCapturas(rows);
				setCargando(false);
			},
			error: (err) => {
				console.error("[useCapturas] liveQuery:", err);
				setCargando(false);
			},
		});
		return () => sub.unsubscribe();
	}, []);

	const sincronizar = useCallback(
		async (opts?: { ignorarBackoff?: boolean }) => {
			setSincronizando(true);
			try {
				await sync(opts);
			} finally {
				setSincronizando(false);
			}
		},
		[],
	);

	useEffect(() => {
		void sincronizar({ ignorarBackoff: true });
		const onOnline = () => void sincronizar({ ignorarBackoff: true });
		const onVisible = () => {
			if (document.visibilityState === "visible")
				void sincronizar({ ignorarBackoff: true });
		};

		window.addEventListener("online", onOnline);
		document.addEventListener("visibilitychange", onVisible);
		const intervalo = setInterval(() => {
			if (navigator.onLine) void sincronizar();
		}, 15_000);

		return () => {
			window.removeEventListener("online", onOnline);
			document.removeEventListener("visibilitychange", onVisible);
			clearInterval(intervalo);
		};
	}, [sincronizar]);

	const addCaptura = useCallback(
		async (
			texto: string,
			tipo: CapturaTipo = "nota",
			origen: CapturaOrigen = "keyboard",
			metadata?: Captura["metadata"]
		): Promise<void> => {
			const limpio = texto.trim();
			if (!limpio) return;

			// Recuperar última entrada para cadena de hashes y secuencia
			const lastEntryArray = await db.capturas.orderBy('secuencia').reverse().limit(1).toArray();
			const lastEntry = lastEntryArray.length > 0 ? lastEntryArray[0] : null;

			const newSecuencia = lastEntry?.secuencia !== undefined ? lastEntry.secuencia + 1 : 1;
			const hashPrevio = lastEntry?.hash || "genesis";

			// Recopilar metadatos forenses
			const duracionDictado = metadata?.duracionDictado;
			const forensics = await getForensicMetadata(duracionDictado);

			const timestamp = new Date().toISOString();
			
			// Generar hash de esta entrada (texto + timestamp + secuencia + hash previo)
			const contentToHash = `${limpio}|${timestamp}|${newSecuencia}|${hashPrevio}`;
			const hash = await generateHash(contentToHash);

			const captura: Captura = {
				id: nuevoId(),
				texto: limpio,
				timestamp,
				status: "pending",
				tipo,
				origen,
				visibilidad: "public",
				metadata,
				secuencia: newSecuencia,
				hash,
				hashPrevio,
				forensics,
				intentos: 0,
			};

			await db.capturas.add(captura);
			if (navigator.onLine) void sincronizar({ ignorarBackoff: true });
		},
		[sincronizar],
	);

	const reintentar = useCallback(async () => {
		setSincronizando(true);
		try {
			await reintentarErrores();
		} finally {
			setSincronizando(false);
		}
	}, []);

	return { capturas, cargando, sincronizando, addCaptura, reintentar };
}
