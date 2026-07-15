"use client";

import { useState } from "react";
import Link from "next/link";
import { Splash } from "./components/Splash";
import { Wrench, Server, Kanban } from "lucide-react";

export default function RootMenu() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  return (
    <main className="bg-[#0B1F3B] min-h-screen flex flex-col items-center justify-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#112A4F]/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-8 flex justify-center z-10">
        <h1 className="font-semibold text-cora-surface tracking-[0.2em] uppercase text-sm">ATHANOR</h1>
      </header>

      {/* Center Link Cards */}
      <div className="z-10 w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/herramientas" className="block outline-none focus:outline-none">
          <div className="bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 ease-in-out rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl cursor-pointer group h-full">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all duration-200 ease-in-out">
              <Wrench className="w-8 h-8 text-cora-surface group-hover:text-[#3FA7FF] transition-colors duration-200 ease-in-out" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-bold text-cora-surface tracking-tight">Herramientas</h2>
              <p className="text-[11px] text-cora-silver font-mono tracking-widest uppercase opacity-60 text-center">Utilidades</p>
            </div>
          </div>
        </Link>

        <Link href="/sistemas" className="block outline-none focus:outline-none">
          <div className="bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 ease-in-out rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl cursor-pointer group h-full">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all duration-200 ease-in-out">
              <Server className="w-8 h-8 text-cora-surface group-hover:text-[#3FA7FF] transition-colors duration-200 ease-in-out" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-bold text-cora-surface tracking-tight">Sistemas</h2>
              <p className="text-[11px] text-cora-silver font-mono tracking-widest uppercase opacity-60 text-center">Núcleo y Seguridad</p>
            </div>
          </div>
        </Link>
      
        <Link href="/roadmap" className="block outline-none focus:outline-none md:col-span-2">
          <div className="bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 ease-in-out rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl cursor-pointer group h-full">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all duration-200 ease-in-out">
              <Kanban className="w-8 h-8 text-cora-surface group-hover:text-[#3FA7FF] transition-colors duration-200 ease-in-out" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-bold text-cora-surface tracking-tight">Roadmap</h2>
              <p className="text-[11px] text-cora-silver font-mono tracking-widest uppercase opacity-60 text-center">Kanban en vivo</p>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}

// TODO: Registrar la app Roadmap de nivel 1 en el manifest del launcher Cora-OS cuando UI-01 fusione.
