"use client";

import { useState, useRef, useEffect } from "react";

export default function Capturar() {
  const [texto, setTexto] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-950">
      <div className="max-w-md w-full p-4 flex flex-col gap-4">
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Qué quieres capturar?"
          className="w-full flex-1 p-4 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
          rows={8}
        />

        <button
          onClick={handleGuardar}
          disabled={cargando || !texto.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
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
  );
}
