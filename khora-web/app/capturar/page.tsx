"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function CapturarPage() {
  const [text, setText] = useState("");
  const [source, setSource] = useState("web_ui");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ingesta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, source }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Hubo un error al ingestar la información.");
      }

      setResult(data);
      setText(""); // clear on success
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#0B1F3B] min-h-screen flex flex-col items-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden text-cora-surface">
      {/* Decorative ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#112A4F]/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full max-w-2xl flex items-center justify-between z-10 mb-8 pt-4">
        <Link href="/" className="text-cora-silver hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al menú</span>
        </Link>
        <h1 className="font-semibold tracking-[0.2em] uppercase text-sm">Capturar</h1>
      </header>

      {/* Main Content */}
      <div className="z-10 w-full max-w-2xl bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Ingesta de Información</h2>
          <p className="text-sm text-cora-silver opacity-80">
            Introduce el texto que deseas procesar. Este pasará por el motor de ingesta del kernel (real).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="source" className="text-sm font-mono tracking-wide text-cora-silver uppercase">
              Origen (Source)
            </label>
            <input
              id="source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="bg-[#0B1F3B] border border-[#1F3C6A] rounded-lg p-3 text-white focus:outline-none focus:border-[#3FA7FF] transition-colors"
              placeholder="e.g. web_ui, bitacora"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="text" className="text-sm font-mono tracking-wide text-cora-silver uppercase">
              Contenido a capturar
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              rows={6}
              className="bg-[#0B1F3B] border border-[#1F3C6A] rounded-lg p-4 text-white focus:outline-none focus:border-[#3FA7FF] transition-colors resize-none"
              placeholder="Escribe o pega aquí la información..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="self-end bg-[#3FA7FF] hover:bg-[#3FA7FF]/80 text-[#0B1F3B] font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Procesando...</span>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Ingestar al Kernel</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="text-xl">✓</span> Ingesta exitosa
            </h3>
            <ul className="text-sm space-y-1 opacity-90 font-mono">
              <li><strong>ID:</strong> {result.id}</li>
              <li><strong>Origen:</strong> {result.acta?.origen}</li>
              <li><strong>Novedades detectadas:</strong> {result.acta?.ideas_novedosas}</li>
              <li><strong>Triples escritos:</strong> {result.acta?.triples_escritos}</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
