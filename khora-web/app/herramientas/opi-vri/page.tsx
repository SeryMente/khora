"use client";

import Link from "next/link";
import { ChevronLeft, PhoneCall } from "lucide-react";

export default function OpiVriPage() {
  return (
    <main className="bg-[#0B1F3B] min-h-screen flex flex-col p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#112A4F]/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full flex items-center justify-between z-10 mb-12 mt-4 max-w-4xl mx-auto">
        <Link href="/herramientas" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm uppercase tracking-widest font-mono">
          <ChevronLeft className="w-4 h-4" />
          Herramientas
        </Link>
        <h1 className="font-semibold text-white tracking-[0.2em] uppercase text-sm">OPI/VRI</h1>
        <div className="w-20" /> {/* Spacer for centering */}
      </header>

      {/* Dynamic Content */}
      <div className="z-10 w-full max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center">
        <div className="bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-12 flex flex-col items-center gap-6 shadow-2xl text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-[#3FA7FF]/10 border border-[#3FA7FF]/30 flex items-center justify-center animate-pulse">
            <PhoneCall className="w-10 h-10 text-[#3FA7FF]" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Módulo OPI/VRI</h2>
            <p className="text-sm text-gray-400 font-mono leading-relaxed">
              La especificación y utilidad para el intérprete telefónico y de lenguaje se implementará aquí pronto.
            </p>
          </div>

          <div className="mt-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs rounded-lg uppercase tracking-wider font-mono">
            En Construcción
          </div>
        </div>
      </div>
    </main>
  );
}
