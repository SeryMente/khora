// @l0 L0-002-R · @req CORA-02/REQ-1 · @acr ACR-1.2
"use client";

import { useEffect, useState } from "react";

type Volcado = {
  id: string;
  texto: string;
  sha256: string;
  chars: number;
  titulo: string | null;
  origen: string;
  recibido_en: string;
  estado: string;
  io_id: string | null;
  intentos: number;
  ultimo_error: string | null;
};

export default function VolcadosPage() {
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [items, setItems] = useState<Volcado[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = async () => {
    try {
      const res = await fetch("/api/volcado");
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? data.error ?? "no se pudo leer el inventario");
        return;
      }
      setItems(data.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async () => {
    if (texto.trim().length === 0) {
      setError("no hay texto que archivar");
      return;
    }
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const res = await fetch("/api/volcado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, titulo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data.detail ?? "archivo fallido") + (data.causa ? " :: " + data.causa : ""));
        return;
      }
      setAviso("archivado " + String(data.sha256).slice(0, 8) + " · " + data.chars + " caracteres · el texto ya esta a salvo");
      setTexto("");
      setTitulo("");
      await cargar();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setGuardando(false);
    }
  };

  const total = items.length;
  const caracteres = items.reduce((acc, v) => acc + (v.chars || 0), 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Volcados</h1>
      <p className="text-sm text-gray-500 mb-6">El texto se archiva integro con su hash antes de tocar el pipeline. Guardar nunca depende de que la ingesta funcione.</p>

      <div className="space-y-3 mb-8">
        <input
          className="w-full p-2 border rounded-md"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="titulo opcional"
          disabled={guardando}
        />
        <textarea
          className="w-full p-3 border rounded-md font-mono text-sm"
          rows={12}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="pega aqui el volcado, tan largo como quieras"
          disabled={guardando}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={guardar}
            disabled={guardando || texto.trim().length === 0}
            className="bg-black text-white px-4 py-2 rounded-md disabled:opacity-40"
          >
            {guardando ? "archivando..." : "Archivar volcado"}
          </button>
          <span className="text-xs text-gray-500">{texto.length} caracteres</span>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {aviso && <div className="text-green-700 text-sm">{aviso}</div>}
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold">Inventario</h2>
        <span className="text-xs text-gray-500">{total} volcados · {caracteres} caracteres</span>
      </div>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">recibido</th>
              <th className="p-2">titulo</th>
              <th className="p-2">chars</th>
              <th className="p-2">estado</th>
              <th className="p-2">sha</th>
              <th className="p-2">extracto</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={6}>sin volcados todavia</td></tr>
            )}
            {items.map((v) => (
              <tr key={v.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">{new Date(v.recibido_en).toLocaleString()}</td>
                <td className="p-2">{v.titulo ?? "—"}</td>
                <td className="p-2">{v.chars}</td>
                <td className="p-2">{v.estado}</td>
                <td className="p-2 font-mono text-xs">{String(v.sha256).slice(0, 8)}</td>
                <td className="p-2 text-gray-600">{v.texto.replace(/\s+/g, " ").slice(0, 70)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
