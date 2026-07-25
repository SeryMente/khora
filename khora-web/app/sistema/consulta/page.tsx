// @l0 L0-002 · @req CORA-01/REQ-1,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-3.1 · @ua —
"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Evidencia {
  tripleta: string;
  provenance: string;
  derived_from: string;
}

interface ConsultaResponse {
  respuesta: string;
  suficiencia: boolean;
  resumenes_incluidos: boolean;
  degradacion_declarada: string | null;
  no_anclada: boolean;
  evidencia: Evidencia[];
}

export default function ConsultaPage() {
  const [pregunta, setPregunta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ConsultaResponse | null>(null);
  const [evidenciaAbierta, setEvidenciaAbierta] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pregunta.trim()) return;

    setLoading(true);
    setError(null);
    setResultado(null);
    setEvidenciaAbierta(false);

    try {
      const response = await fetch("/api/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: No se pudo procesar la consulta`);
      }

      const data = await response.json();
      setResultado(data);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al procesar tu consulta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Consola de Consulta</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Escribe tu pregunta aquí..."
            className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !pregunta.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Consultar
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 flex flex-col">
          <span className="font-semibold mb-1">Error al consultar</span>
          <span>{error}</span>
        </div>
      )}

      {resultado && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header con badges */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center bg-gray-50 dark:bg-gray-900/50">
            {resultado.suficiencia ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Suficiencia Confirmada
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full border border-amber-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Suficiencia Parcial / Dudosa
              </span>
            )}

            {resultado.no_anclada && (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-bold rounded-full border border-red-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                NO-ANCLADA
              </span>
            )}
          </div>

          {/* Respuesta principal */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Respuesta</h3>
            <div className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
              <p className="whitespace-pre-wrap">{resultado.respuesta}</p>
            </div>
          </div>

          {/* Degradación declarada */}
          {resultado.degradacion_declarada && (
            <div className="mx-6 mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg">
              <h4 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-1">Aviso de Degradación</h4>
              <p className="text-orange-700 dark:text-orange-400 text-sm">{resultado.degradacion_declarada}</p>
            </div>
          )}

          {/* Panel de Evidencia */}
          {resultado.evidencia && resultado.evidencia.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setEvidenciaAbierta(!evidenciaAbierta)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Evidencia del Razonamiento</span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs py-0.5 px-2 rounded-full">
                    {resultado.evidencia.length}
                  </span>
                </div>
                {evidenciaAbierta ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {evidenciaAbierta && (
                <div className="px-6 pb-6 pt-2 bg-gray-50 dark:bg-gray-800/50">
                  <div className="space-y-4">
                    {resultado.evidencia.map((ev, index) => (
                      <div key={index} className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="font-mono text-sm mb-2 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded break-all">
                          {ev.tripleta}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs text-gray-500 dark:text-gray-400 mt-3">
                          <div className="flex items-start gap-1.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Origen:</span>
                            <span className="break-all">{ev.provenance}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Derivado de:</span>
                            <span className="break-all">{ev.derived_from}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
