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

  const [sel, setSel] = useState<Volcado | null>(null);
  const [versiones, setVersiones] = useState<any[]>([]);
  const [ingiriendo, setIngiriendo] = useState<{ [key: string]: boolean }>({});
  const [ingestaRes, setIngestaRes] = useState<{ [key: string]: any }>({});


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


  const elegir = async (v: Volcado) => {
    setSel(v);
    setVersiones([]);
    setIngestaRes({});
    try {
      const res = await fetch("/api/versiones?id=" + v.id);
      const data = await res.json();
      if (res.ok) {
        setVersiones(Array.isArray(data.versiones) ? data.versiones : []);
      }
    } catch (e) {
      console.error(e);
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


  const ingerir = async (v: any) => {
    if (!sel) return;
    setIngiriendo((prev) => ({ ...prev, [v.version]: true }));
    try {
      const formData = new FormData();
      formData.append("volcado_id", sel.id);
      formData.append("version", String(v.version));
      formData.append("sha256", v.sha256);

      const res = await fetch("/api/ingesta", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      let estadoCanonical = "fallo";
      if (res.status === 201) estadoCanonical = "escritura nueva";
      else if (res.status === 200) estadoCanonical = "terna repetida";
      else if (res.status === 409) estadoCanonical = "conflicto";

      setIngestaRes((prev) => ({
        ...prev,
        [v.version]: {
          estado: estadoCanonical,
          status: res.status,
          data
        }
      }));
    } catch (e: any) {
      setIngestaRes((prev) => ({
        ...prev,
        [v.version]: {
          estado: "fallo",
          status: 500,
          data: { error: e.message }
        }
      }));
    } finally {
      setIngiriendo((prev) => ({ ...prev, [v.version]: false }));
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
              <tr key={v.id} className={`border-t align-top cursor-pointer hover:bg-gray-100 ${sel?.id === v.id ? 'bg-gray-100' : ''}`} onClick={() => elegir(v)}>
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

      {sel && (
        <div className="mt-8 border rounded-md p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Detalle del Volcado: {sel.id}</h2>
          <div className="mb-4 text-sm">
            <strong>Texto original:</strong>
            <pre className="mt-1 p-2 bg-white border rounded text-xs whitespace-pre-wrap">{sel.texto}</pre>
          </div>

          <h3 className="text-md font-semibold mb-2">Versiones</h3>
          {versiones.length === 0 ? (
            <p className="text-sm text-gray-500">No hay versiones disponibles.</p>
          ) : (
            <div className="space-y-4">
              {versiones.map((v) => {
                const res = ingestaRes[v.version];
                return (
                  <div key={v.version} className="border rounded p-3 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Versión {v.version}</span>
                      <span className="text-xs font-mono text-gray-500">sha256: {v.sha256}</span>
                    </div>
                    <pre className="text-xs bg-gray-50 p-2 rounded mb-2 whitespace-pre-wrap">{v.texto}</pre>

                    <button
                      onClick={() => ingerir(v)}
                      disabled={ingiriendo[v.version]}
                      className="bg-blue-600 text-white px-3 py-1 text-sm rounded disabled:opacity-50"
                    >
                      {ingiriendo[v.version] ? "Ingiriendo..." : "Ingerir esta versión"}
                    </button>

                    {res && (
                      <div className={`mt-2 p-2 text-sm rounded ${res.status === 201 || res.status === 200 ? 'bg-green-50 text-green-800' : res.status === 409 ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'}`}>
                        <strong>Resultado:</strong> {res.estado} <br/>
                        {res.data.error && <span>{res.data.error}</span>}
                        {res.data.detail && <span>{res.data.detail}</span>}
                        {res.data.io_id && <span>io_id: {res.data.io_id}</span>}

                        <div className="mt-1 text-xs opacity-75">
                          CTR-PROP-01: REQUIERE BACKEND <br/>
                          CTR-DELTA-01: REQUIERE BACKEND
                        </div>
                        {/* Hidden states: Revisión, Ratificación, Delta */}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
