"use client";

import { useState, useRef, useEffect } from "react";

interface Captura {
  id: string;
  texto: string;
  timestamp: string;
}

export default function Capturar() {
  const [texto, setTexto] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [cargandoTimeline, setCargandoTimeline] = useState(true);
  const [errorTimeline, setErrorTimeline] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    cargarCapturas();
  }, [guardado]);

  const cargarCapturas = async () => {
    setCargandoTimeline(true);
    setErrorTimeline(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL no configurada");
        setCargandoTimeline(false);
        return;
      }

      const response = await fetch(`${apiUrl}/capturas`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "force-cache",
      });

      if (response.ok) {
        const data = await response.json();
        setCapturas(data.capturas || []);
      } else {
        setErrorTimeline("Error al cargar capturas");
      }
    } catch (error) {
      console.error("Error al cargar capturas:", error);
      setErrorTimeline("Sin conexión - mostrando última captura guardada");
    } finally {
      setCargandoTimeline(false);
    }
  };

  const handleGuardar = async () => {
    if (!texto.trim()) return;

    setCargando(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL no configurada");
        return;
      }

      const response = await fetch(`${apiUrl}/capturar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texto }),
      });

      if (response.ok) {
        setGuardado(true);
        setTexto("");
        setTimeout(() => setGuardado(false), 2000);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setCargando(false);
    }
  };

  const formatearFecha = (isoString: string) => {
    const fecha = new Date(isoString);
    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Formulario de captura */}
      <div className="flex flex-col justify-center items-center bg-gray-950 py-8">
        <div className="max-w-md w-full px-4 flex flex-col gap-4">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="¿Qué quieres capturar?"
            className="w-full p-4 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={8}
          />

          <button
            onClick={handleGuardar}
            disabled={cargando || !texto.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {cargando ? "Guardando..." : "Guardar"}
          </button>

          {guardado && (
            <div className="text-center text-green-500 font-medium">
              Guardado ✓
            </div>
          )}
        </div>
      </div>

      {/* Línea de tiempo */}
      <div className="py-8 px-4">
        <div className="max-w-md mx-auto">
          {/* Loading */}
          {cargandoTimeline && capturas.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-800 rounded-lg animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {errorTimeline && (
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-3">{errorTimeline}</p>
              <button
                onClick={cargarCapturas}
                className="px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Empty state */}
          {!cargandoTimeline && capturas.length === 0 && !errorTimeline && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Aún no hay capturas. ¡Comienza a guardar tus ideas!
              </p>
            </div>
          )}

          {/* Timeline */}
          {capturas.length > 0 && (
            <ul className="space-y-3" role="list">
              {capturas.map((captura) => (
                <li
                  key={captura.id}
                  className="p-4 bg-gray-900 border border-gray-700 rounded-lg hover:border-indigo-500 transition-colors focus-within:ring-2 focus-within:ring-indigo-500 focus-within:outline-none"
                >
                  <p className="text-white text-sm mb-2 leading-relaxed">
                    {captura.texto}
                  </p>
                  <time className="text-sm text-gray-500">
                    {formatearFecha(captura.timestamp)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
