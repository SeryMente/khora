"use client";

import { useEffect, useState } from "react";

interface Semana {
	week: number;
	start: string;
	end: string;
	used: number;
	pct: number;
}
interface Resumen {
	days_total: number;
	days_used: number;
	pct: number;
	per_week: Semana[];
	window: { start: string; end: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Adherencia() {
	const [data, setData] = useState<Resumen | null>(null);
	const [error, setError] = useState(false);
	const [cargando, setCargando] = useState(true);

	useEffect(() => {
		let vivo = true;
		(async () => {
			try {
				const res = await fetch(`${API_URL}/adherence?weeks=4`, { cache: "no-store" });
				if (!res.ok) throw new Error(String(res.status));
				const json = (await res.json()) as Resumen;
				if (vivo) setData(json);
			} catch {
				if (vivo) setError(true);
			} finally {
				if (vivo) setCargando(false);
			}
		})();
		return () => {
			vivo = false;
		};
	}, []);

	return (
		<main className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
				<h1 className="text-lg font-semibold">Tu adherencia · últimas 4 semanas</h1>
				{cargando && <p className="text-gray-500 text-sm">Cargando…</p>}
				{error && (
					<p className="text-red-400 text-sm">No se pudo cargar. ¿Está viva la API en /docs?</p>
				)}
				{data && (
					<>
						<section className="text-center py-6">
							<div className="text-5xl font-bold text-indigo-400">{data.pct}%</div>
							<p className="text-sm text-gray-400 mt-1">
								{data.days_used} de {data.days_total} días con captura
							</p>
							<p className="text-xs text-gray-600 mt-1">
								{data.window.start} → {data.window.end}
							</p>
						</section>
						<ul className="space-y-2" role="list">
							{data.per_week.map((s) => (
								<li
									key={s.week}
									className="flex items-center justify-between p-3 bg-gray-900 border border-gray-700 rounded-lg"
								>
									<span className="text-sm text-gray-300">Semana {s.week}</span>
									<span className="text-sm tabular-nums">{s.used}/7 · {s.pct}%</span>
								</li>
							))}
						</ul>
					</>
				)}
			</div>
		</main>
	);
}
