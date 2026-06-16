"use client";

import { useEffect, useRef, useState } from "react";
import { useCapturas } from "@/lib/hooks";
import type { Captura } from "@/lib/db";

function estadoNota(captura: Captura): { texto: string; clase: string } {
	if (captura.status === "synced") {
		return { texto: "sincronizado", clase: "text-green-500" };
	}
	if (captura.status === "error") {
		return { texto: "no se pudo sincronizar", clase: "text-red-400" };
	}
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		return { texto: "sin conexión — se sincronizará", clase: "text-orange-400" };
	}
	return { texto: "pendiente", clase: "text-yellow-500" };
}

function formatearFecha(iso: string): string {
	return new Date(iso).toLocaleString("es-MX", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function Home() {
	const { capturas, cargando, sincronizando, addCaptura, reintentar } = useCapturas();
	const [texto, setTexto] = useState("");
	const [guardando, setGuardando] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const hayErrores = capturas.some((c) => c.status === "error");

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	async function guardar() {
		if (!texto.trim() || guardando) return;
		setGuardando(true);
		try {
			await addCaptura(texto);
			setTexto("");
			textareaRef.current?.focus();
		} finally {
			setGuardando(false);
		}
	}

	return (
		<main className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-8">
				<section className="flex flex-col gap-4">
					<textarea
						ref={textareaRef}
						value={texto}
						onChange={(e) => setTexto(e.target.value)}
						onKeyDown={(e) => {
							if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void guardar();
						}}
						placeholder="¿Qué quieres capturar?"
						rows={6}
						className="w-full p-4 bg-gray-900 text-white placeholder-gray-500 border border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					<button
						onClick={() => void guardar()}
						disabled={!texto.trim() || guardando}
						className="w-full py-3 rounded-xl bg-indigo-600 font-semibold transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{guardando ? "Guardando…" : "Guardar"}
					</button>
				</section>

				{(sincronizando || hayErrores) && (
					<div className="flex items-center justify-between text-xs" aria-live="polite">
						<span className="text-gray-500">{sincronizando ? "Sincronizando…" : ""}</span>
						{hayErrores && (
							<button
								onClick={() => void reintentar()}
								className="text-indigo-400 hover:text-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
							>
								Reintentar sincronización
							</button>
						)}
					</div>
				)}

				<section aria-live="polite">
					{cargando && capturas.length === 0 ? (
						<ul className="space-y-3" aria-hidden="true">
							{[0, 1, 2].map((i) => (
								<li key={i} className="h-20 bg-gray-800 rounded-lg animate-pulse" />
							))}
						</ul>
					) : capturas.length === 0 ? (
						<p className="text-center text-gray-500 py-8">
							Aún no hay capturas. Escribe tu primera idea.
						</p>
					) : (
						<ul className="space-y-3" role="list">
							{capturas.map((captura) => {
								const e = estadoNota(captura);
								return (
									<li
										key={captura.id}
									className="p-4 bg-gray-900 border border-gray-700 rounded-lg"
								>
									<p className="text-sm leading-relaxed whitespace-pre-wrap">
										{captura.texto}
									</p>
									<div className="mt-2 flex justify-between items-end gap-3">
										<time className="text-sm text-gray-500" dateTime={captura.timestamp}>
											{formatearFecha(captura.timestamp)}
										</time>
										<span className={`text-xs ${e.clase}`}>{e.texto}</span>
									</div>
								</li>
							);
						})}
						</ul>
					)}
				</section>
			</div>
		</main>
	);
}
