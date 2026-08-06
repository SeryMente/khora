"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Mic, MicOff } from "lucide-react";

export default function CapturarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1F3B] flex items-center justify-center text-white">Cargando...</div>}>
      <CapturarContent />
    </Suspense>
  );
}

function CapturarContent() {
  const [text, setText] = useState("");
  const [source, setSource] = useState("web_ui");
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

  const [isListening, setIsListening] = useState(false);
  const [hasSpeechAPI, setHasSpeechAPI] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "es-ES";

        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onerror = (e: any) => {
          console.error("Speech API Error:", e);
          setIsListening(false);
        };
      } else {
        setHasSpeechAPI(false);
      }
    }
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
        recognitionRef.current.onresult = (e: any) => {
          let finalTranscript = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              finalTranscript += e.results[i][0].transcript + " ";
            }
          }
          if (finalTranscript) {
             setText(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + finalTranscript);
          }
        };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const saveRes = await fetch("/api/volcado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: text, titulo: "Captura", origen: source }),
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
      setText("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          <span>Volver al menú</span>
        </Link>
        <h1 className="font-semibold tracking-[0.2em] uppercase text-sm">Capturar</h1>
      </header>

      <div className="z-10 w-full max-w-2xl bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl flex-grow flex flex-col justify-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Ingesta de Información</h2>
          <p className="text-sm text-cora-silver opacity-80">
            Guarda el texto en tu memoria personal verificable.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-grow">
          <div className="flex flex-col gap-2">
            <label htmlFor="source" className="text-sm font-mono tracking-wide text-cora-silver uppercase">
              Origen (Source)
            </label>
            <input
              id="source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="bg-[#0B1F3B] border border-[#1F3C6A] rounded-lg p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3FA7FF] transition-colors"
              placeholder="e.g. web_ui, bitacora"
            />
          </div>

          <div className="flex flex-col gap-2 flex-grow">
            <label htmlFor="text" className="text-sm font-mono tracking-wide text-cora-silver uppercase">
              Contenido a capturar
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="flex-grow bg-[#0B1F3B] border border-[#1F3C6A] rounded-lg p-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3FA7FF] transition-colors resize-none min-h-[150px]"
              placeholder="Escribe o pega aquí la información..."
            />
          </div>

          <div className="flex justify-between items-center gap-4 mt-auto">
             {hasSpeechAPI && (
              <button
                type="button"
                onClick={toggleListening}
                className={`w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1F3C6A] hover:bg-[#1F3C6A]/80'}`}
                aria-label={isListening ? "Detener dictado" : "Iniciar dictado"}
              >
                  {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
              </button>
             )}

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="ml-auto bg-[#3FA7FF] hover:bg-[#3FA7FF]/80 text-[#0B1F3B] font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {loading ? (
                <span className="opacity-80">Procesando...</span>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Ingestar al Kernel</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="text-xl">✓</span> Captura recibida y A salvo
            </h3>
            <ul className="text-sm space-y-1 opacity-90 font-mono">
              <li><strong>ID:</strong> {result.volcado?.id}</li>
              {result.ingesta?.acta && (
                <>
                  <li><strong>Novedades detectadas:</strong> {result.ingesta.acta.ideas_novedosas}</li>
                  <li><strong>Triples escritos:</strong> {result.ingesta.acta.triples_escritos}</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
