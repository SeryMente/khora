"use client";

import { useState } from "react";
import Link from "next/link";
import { Splash } from "./components/Splash";
import { NotebookText } from "lucide-react";

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
        <h1 className="font-semibold text-white tracking-[0.2em] uppercase text-sm">ATHANOR</h1>
      </header>

      {/* Center Link Card */}
      <div className="z-10 w-full max-w-sm">
        <Link href="/bitacora" className="block outline-none focus:outline-none">
          <div className="bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 ease-in-out rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl cursor-pointer group">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all duration-200 ease-in-out">
              <NotebookText className="w-8 h-8 text-white group-hover:text-[#3FA7FF] transition-colors duration-200 ease-in-out" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Bitácora 24/365</h2>
              <p className="text-[11px] text-gray-400 font-mono tracking-widest uppercase opacity-60">Acceso cifrado</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Footer text */}
      <footer className="absolute bottom-8 left-0 w-full flex justify-center z-10 opacity-40">
        <span className="text-[9px] text-white font-mono uppercase tracking-[0.3em]">Sistema Operativo Khora</span>
      </footer>
    </main>
  );
}
