// @l0 L0-002-R · @req PWA-03,PWA-04,IF-SW-01
export const metadata = {
	title: "Sin conexión · Khora",
};

export default function Offline() {
	return (
		<main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
			<div className="max-w-md text-center flex flex-col gap-3">
				<h1 className="text-xl font-semibold">Sin conexión</h1>
				<p className="text-sm text-gray-400 leading-relaxed">
					No hay internet en este momento. Tus capturas se guardan en este
					dispositivo y se sincronizarán solas cuando vuelva la conexión.
				</p>
			</div>
		</main>
	);
}
