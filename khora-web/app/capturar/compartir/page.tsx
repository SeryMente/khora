"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function CompartirPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1F3B] flex items-center justify-center text-white">Cargando...</div>}>
      <CompartirContent />
    </Suspense>
  );
}

function CompartirContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [vpHeight, setVpHeight] = useState("100vh");

  useEffect(() => {
    if (typeof window !== "undefined" && window.visualViewport) {
      const updateVp = () => {
        setVpHeight(`${window.visualViewport?.height}px`);
      };
      window.visualViewport.addEventListener("resize", updateVp);
      updateVp();
      return () => window.visualViewport?.removeEventListener("resize", updateVp);
    }
  }, []);

  useEffect(() => {
    if (!searchParams) return;
    const title = searchParams.get("title") || "";
    const receivedText = searchParams.get("text") || "";
    const url = searchParams.get("url") || "";

    const combined = [title, receivedText, url].filter(Boolean).join("\n");
    if (combined) {
      setText(combined);
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const saveRes = await fetch("/api/volcado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: text, titulo: "Share Target", origen: "cora-ui" }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.detail || "Error al guardar el volcado.");

      const savedId = saveData.id;

      const verRes = await fetch(`/api/versiones?id=${savedId}`);
      if (!verRes.ok) throw new Error("Error al inicializar versión.");

      const formData = new FormData();
      formData.append("text", text);
      formData.append("volcado_id", savedId);
      formData.append("version", "1");

      const ingRes = await fetch("/api/ingesta", {
        method: "POST",
        body: formData,
      });

      const ingData = await ingRes.json();
      if (!ingRes.ok) throw new Error(ingData.error || "Hubo un error al procesar la información.");

      setResult({ volcado: saveData, ingesta: ingData });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (text && !loading && !result && !error) {
      handleSubmit();
    }
  }, [text]);

  return (
    <main
      className="bg-[#0B1F3B] flex flex-col items-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden text-cora-surface transition-all duration-200"
      style={{ minHeight: vpHeight }}
    >
       <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#112A4F]/20 rounded-full blur-[120px]" />
      </div>
      <header className="w-full max-w-2xl flex items-center justify-between z-10 mb-8 pt-4">
        <Link href="/" className="text-cora-silver hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </Link>
        <h1 className="font-semibold tracking-[0.2em] uppercase text-sm">Recibiendo</h1>
      </header>

       <div className="z-10 w-full max-w-2xl bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl">
         {loading && (
             <div className="flex flex-col items-center gap-4">
                 <p className="text-xl font-bold">Guardando contenido compartido...</p>
                 <span className="opacity-80">Procesando...</span>
             </div>
         )}
         {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex flex-col items-center gap-2">
                 <XCircle className="w-12 h-12" />
                 <strong>Error:</strong> {error}
                 <button onClick={() => router.push("/")} className="mt-4 px-4 py-2 bg-[#1F3C6A] rounded hover:bg-[#1F3C6A]/80 text-white">Volver al inicio</button>
            </div>
         )}
          {result && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 flex flex-col items-center gap-2">
             <CheckCircle className="w-12 h-12" />
            <h3 className="font-bold text-xl">Captura recibida y A salvo</h3>
            <p className="text-sm opacity-80 mt-2">Contenido guardado correctamente.</p>
             <button onClick={() => router.push("/")} className="mt-4 px-4 py-2 bg-[#1F3C6A] rounded text-white hover:bg-[#1F3C6A]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Volver al inicio</button>
          </div>
        )}
       </div>
    </main>
  );
}
