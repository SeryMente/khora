"use client";

import { Radio, Headset, MicVocal } from "lucide-react";

export default function CabinaPage() {
  return (
    <main className="min-h-screen bg-cora-bg p-4 md:p-8 font-sans pb-32">
      <div className="max-w-4xl mx-auto space-y-8 mt-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-cora-text tracking-tight flex items-center gap-3">
            <Radio className="w-8 h-8 text-[#3FA7FF]" />
            Cabina
          </h1>
          <p className="text-cora-silver mt-2">Centro de control, comunicaciones y operación táctica.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-cora-surface border border-cora-silver/10 rounded-xl p-5 hover:border-cora-silver/20 transition-all flex items-start gap-4">
            <div className="p-3 bg-black/5 dark:bg-white/[0.03] rounded-lg">
              <Headset className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-cora-text">Operaciones (Próximamente)</h3>
              <p className="text-xs text-cora-silver mt-1">Monitoreo y respuesta de eventos en tiempo real.</p>
            </div>
          </div>
          <div className="bg-cora-surface border border-cora-silver/10 rounded-xl p-5 hover:border-cora-silver/20 transition-all flex items-start gap-4">
            <div className="p-3 bg-black/5 dark:bg-white/[0.03] rounded-lg">
              <MicVocal className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-cora-text">Enlace de Voz (Próximamente)</h3>
              <p className="text-xs text-cora-silver mt-1">Comunicaciones de alta prioridad.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
