"use client";

import Link from "next/link";
import { ChevronLeft, NotebookText, PhoneCall } from "lucide-react";

export default function HerramientasPage() {
  return (
    <main className="bg-[#0B1F3B] min-h-screen flex flex-col p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#112A4F]/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full flex items-center justify-between z-10 mb-12 mt-4 max-w-4xl mx-auto">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm uppercase tracking-widest font-mono">
          <ChevronLeft className="w-4 h-4" />
          Core
        </Link>
        <h1 className="font-semibold text-white tracking-[0.2em] uppercase text-sm">Herramientas</h1>
        <div className="w-20" /> {/* Spacer for centering */}
      </header>

      {/* Dynamic Content */}
      <div className="z-10 w-full max-w-4xl mx-auto flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/herramientas/bitacora" className="block outline-none focus:outline-none h-full">
            <div className="bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 ease-in-out rounded-2xl p-8 flex flex-col items-start gap-4 group h-full">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all duration-200 ease-in-out">
                <NotebookText className="w-6 h-6 text-white group-hover:text-[#3FA7FF] transition-colors duration-200 ease-in-out" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white tracking-tight mb-1">Bitácora 24/365</h2>
                <p className="text-xs text-gray-400 font-mono">Acceso cifrado</p>
              </div>
            </div>
          </Link>

          <Link href="/herramientas/opi-vri" className="block outline-none focus:outline-none h-full">
            <div className="bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 ease-in-out rounded-2xl p-8 flex flex-col items-start gap-4 group h-full">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all duration-200 ease-in-out">
                <PhoneCall className="w-6 h-6 text-white group-hover:text-[#3FA7FF] transition-colors duration-200 ease-in-out" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white tracking-tight mb-1">OPI/VRI</h2>
                <p className="text-xs text-gray-400 font-mono">Intérprete</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
