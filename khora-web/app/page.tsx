import Link from "next/link";
import { Zap, MessageSquareShare, Network, Map } from "lucide-react";

const ACCIONES = [
  { href: "/sistema/ingesta", titulo: "Ingesta", detalle: "Capturar hacia la memoria continua", Icono: Zap },
  { href: "/sistema/consulta", titulo: "Consulta", detalle: "Preguntar a la red · GraphRAG", Icono: MessageSquareShare },
  { href: "/grafo", titulo: "Grafo", detalle: "Visualización del sustrato PKG", Icono: Network },
  { href: "/mapa", titulo: "Mapa", detalle: "Mapa de decisiones", Icono: Map },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-cora-bg text-cora-text flex flex-col items-center justify-center p-6">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-semibold tracking-[0.3em] uppercase text-cora-text">Khora</h1>
        <p className="text-cora-silver font-mono text-xs tracking-widest mt-3 uppercase">Memoria continua · v0.9</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {ACCIONES.map(({ href, titulo, detalle, Icono }) => (
          <Link key={href} href={href} className="block outline-none focus:outline-none">
            <div className="bg-cora-surface border border-cora-silver/15 hover:border-cora-silver/40 transition-colors rounded-2xl p-6 flex items-start gap-4 h-full">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <Icono className="w-5 h-5 text-cora-silver" />
              </div>
              <div>
                <h2 className="font-semibold text-cora-text">{titulo}</h2>
                <p className="text-xs text-cora-silver mt-1">{detalle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
