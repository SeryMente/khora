"use client";

import { MessageSquareShare } from "lucide-react";

export default function PreguntarPage() {
  return (
    <main className="bg-[#0B1F3B] min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
      </div>

      <div className="z-10 bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#3FA7FF]/10 border border-[#3FA7FF]/30 flex items-center justify-center">
          <MessageSquareShare className="w-8 h-8 text-[#3FA7FF]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">Preguntar a la red</h2>
          <p className="text-sm text-gray-400">Motor GraphRAG en construcción — ola 2</p>
        </div>
      </div>
    </main>
  );
}
