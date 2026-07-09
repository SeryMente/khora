"use client";

import { Network, Workflow, Cable, Download, Puzzle } from "lucide-react";
import manifest from "../../extension/harmonia/manifest.json";
import { CopyBlock } from "../components/CopyBlock";

export default function IntegracionPage() {
  const version = manifest.version;
  const zipPath = `/downloads/harmonia-v${version}.zip`;

  const psCommand = `$z=gci "$([Environment]::GetFolderPath('UserProfile'))\\Downloads\\harmonia-v*.zip"|sort LastWriteTime -desc|select -f 1; if(-not $z){throw 'No encontre harmonia-v*.zip en Descargas'}; $d=Join-Path ([Environment]::GetFolderPath('Desktop')) 'harmonia'; Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue; Expand-Archive $z.FullName ([Environment]::GetFolderPath('Desktop')) -Force; if(-not (Test-Path (Join-Path $d 'manifest.json'))){throw 'ZIP invalido: falta manifest.json'}; Copy-Item $z.FullName $d; Remove-Item $z.FullName; Write-Host "Listo: $d - Chrome: chrome://extensions > Cargar descomprimida / Recargar"`;

  return (
    <main className="min-h-screen bg-[#08080a] p-4 md:p-8 font-sans pb-32">
      <div className="max-w-4xl mx-auto space-y-8 mt-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Network className="w-8 h-8 text-[#3FA7FF]" />
            Integración
          </h1>
          <p className="text-gray-400 mt-2">Conectores, automatizaciones y flujos de datos externos.</p>
        </header>

        <div className="space-y-6">
          <div className="bg-[#18181b] border border-white/[0.05] rounded-xl p-6 hover:border-white/[0.15] transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/[0.03] rounded-lg">
                <Puzzle className="w-6 h-6 text-[#3FA7FF]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-200">Extensión Harmonia</h3>
                  <span className="px-2 py-1 bg-white/[0.05] text-xs font-mono rounded text-gray-400">
                    v{version}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-2 mb-4">
                  Extensión para capturar interacciones y sincronizar datos directamente desde el navegador.
                </p>

                <div className="space-y-4">
                  <div>
                    <a
                      href={zipPath}
                      download={`harmonia-v${version}.zip`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#3FA7FF] hover:bg-[#2b8be0] text-black font-semibold rounded-lg transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Descargar extensión (.zip)
                    </a>
                  </div>

                  <div className="pt-2">
                    <CopyBlock text={psCommand} />
                  </div>

                  <div className="text-sm text-gray-500 bg-white/[0.02] p-4 rounded-lg">
                    <p className="font-semibold text-gray-400 mb-1">Pasos de instalación:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Descarga el ZIP</li>
                      <li>Pega el comando en PowerShell</li>
                      <li>chrome://extensions → Modo desarrollador → Cargar descomprimida (primera vez) o Recargar</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <div className="bg-[#18181b] border border-white/[0.05] rounded-xl p-5 hover:border-white/[0.15] transition-all flex items-start gap-4 opacity-50">
            <div className="p-3 bg-white/[0.03] rounded-lg">
              <Workflow className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200">Pipelines (Próximamente)</h3>
              <p className="text-xs text-gray-500 mt-1">Gestión de orquestación de datos.</p>
            </div>
          </div>
          <div className="bg-[#18181b] border border-white/[0.05] rounded-xl p-5 hover:border-white/[0.15] transition-all flex items-start gap-4 opacity-50">
            <div className="p-3 bg-white/[0.03] rounded-lg">
              <Cable className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200">Webhooks (Próximamente)</h3>
              <p className="text-xs text-gray-500 mt-1">Puntos de entrada para servicios de terceros.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
