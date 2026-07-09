"use client";

import { Cpu, Database, Fingerprint } from "lucide-react";

export default function NucleoPage() {
  return (
    <main className="min-h-screen bg-[#08080a] p-4 md:p-8 font-sans pb-32">
      <div className="max-w-4xl mx-auto space-y-8 mt-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Cpu className="w-8 h-8 text-[#3FA7FF]" />
            Núcleo
          </h1>
          <p className="text-gray-400 mt-2">Motor base de procesamiento, identidad criptográfica y reglas de negocio.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#18181b] border border-white/[0.05] rounded-xl p-5 hover:border-white/[0.15] transition-all flex items-start gap-4">
            <div className="p-3 bg-white/[0.03] rounded-lg">
              <Fingerprint className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200">Identidad (Próximamente)</h3>
              <p className="text-xs text-gray-500 mt-1">Gestión de llaves y autenticación profunda.</p>
            </div>
          </div>
          <div className="bg-[#18181b] border border-white/[0.05] rounded-xl p-5 hover:border-white/[0.15] transition-all flex items-start gap-4">
            <div className="p-3 bg-white/[0.03] rounded-lg">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200">Almacenamiento Local (Próximamente)</h3>
              <p className="text-xs text-gray-500 mt-1">Inspección de bases de datos offline.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
