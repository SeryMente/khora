import { useCallback, useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db, nuevoId, type Captura } from "./db";
import { reintentarErrores, sync } from "./sync";

export function useCapturas() {
	const [capturas, setCapturas] = useState<Captura[]>([]);
	const [cargando, setCargando] = useState(true);
	const [sincronizando, setSincronizando] = useState(false);

	// La base local es la ÚNICA fuente de verdad de la UI (local-first).
	// liveQuery re-emite automáticamente ante cualquier cambio en Dexie.
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

	const sincronizar = useCallback(async () => {
		setSincronizando(true);
		try {
			await sync();
		} finally {
			setSincronizando(false);
		}
	}, []);

	// Sincroniza al montar, al recuperar conexión y al volver a la pestaña.
	useEffect(() => {
		void sincronizar();
		const onOnline = () => void sincronizar();
		const onVisible = () => {
			if (document.visibilityState === "visible") void sincronizar();
		};
		window.addEventListener("online", onOnline);
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			window.removeEventListener("online", onOnline);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [sincronizar]);

	const addCaptura = useCallback(
		async (texto: string): Promise<void> => {
			const limpio = texto.trim();
			if (!limpio) return;
			const captura: Captura = {
				id: nuevoId(),
				texto: limpio,
				timestamp: new Date().toISOString(),
				status: "pending",
				intentos: 0,
			};
			// Escribe local primero → la UI se actualiza sola vía liveQuery (optimista).
			await db.capturas.add(captura);
			// Si hay red, intenta subir de inmediato (single-flight); si falla, queda pendiente.
			if (navigator.onLine) void sincronizar();
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
