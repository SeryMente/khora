// @l0 L0-002-R · @req CORA-02/REQ-1 · @acr ACR-1.2
"use client";

import { useEffect, useState } from "react";
import * as Icons from "lucide-react";

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
    <div className="p-8 max-w-5xl mx-auto space-y-8" style={{ color: "var(--khora-ink)" }}>

      {/* Cabecera de Sección */}
      <div className="border-b pb-4" style={{ borderColor: "var(--khora-accent)" }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icons.Files size={24} style={{ color: "var(--khora-accent)" }} />
          Volcados
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--khora-accent)" }}>
          El texto se archiva integro con su hash antes de tocar el pipeline. Guardar nunca depende de que la ingesta funcione.
        </p>
      </div>

      {/* Formulario de Archivo */}
      <div className="border p-6 space-y-4 rounded-none shadow-none" style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-accent)" }}>
        <input
          className="w-full p-2.5 border rounded-none text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
          style={{
            backgroundColor: "var(--khora-bg)",
            color: "var(--khora-ink)",
            borderColor: "var(--khora-accent)"
          }}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="titulo opcional"
          disabled={guardando}
        />
        <textarea
          className="w-full p-3 border rounded-none font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
          style={{
            backgroundColor: "var(--khora-bg)",
            color: "var(--khora-ink)",
            borderColor: "var(--khora-accent)"
          }}
          rows={12}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="pega aqui el volcado, tan largo como quieras"
          disabled={guardando}
        />
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={guardar}
            disabled={guardando || texto.trim().length === 0}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold"
            style={{
              backgroundColor: "var(--khora-accent)",
              color: "var(--khora-bg)",
              borderColor: "var(--khora-accent)"
            }}
          >
            <Icons.Save size={16} />
            {guardando ? "archivando..." : "Archivar volcado"}
          </button>
          <span className="text-xs flex items-center gap-1" style={{ color: "var(--khora-accent)" }}>
            <Icons.Type size={14} />
            {texto.length} caracteres
          </span>
        </div>

        {error && (
          <div className="p-3 border rounded-none text-sm flex items-start gap-2" style={{ borderColor: "var(--khora-accent)", backgroundColor: "var(--khora-bg)" }}>
            <Icons.AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--khora-accent)" }} />
            <span>{error}</span>
          </div>
        )}
        {aviso && (
          <div className="p-3 border rounded-none text-sm flex items-start gap-2" style={{ borderColor: "var(--khora-accent)", backgroundColor: "var(--khora-bg)" }}>
            <Icons.CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--khora-accent)" }} />
            <span>{aviso}</span>
          </div>
        )}
      </div>

      {/* Sección del Inventario */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: "var(--khora-accent)" }}>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icons.Database size={18} style={{ color: "var(--khora-accent)" }} />
            Inventario
          </h2>
          <span className="text-xs" style={{ color: "var(--khora-accent)" }}>
            {total} volcados · {caracteres} caracteres
          </span>
        </div>

        <div className="overflow-x-auto border rounded-none shadow-none" style={{ borderColor: "var(--khora-accent)" }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "var(--khora-surface)" }}>
              <tr className="border-b text-left" style={{ borderColor: "var(--khora-accent)" }}>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--khora-accent)" }}>recibido</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--khora-accent)" }}>titulo</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--khora-accent)" }}>chars</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--khora-accent)" }}>estado</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--khora-accent)" }}>sha</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--khora-accent)" }}>extracto</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td className="p-6 text-center" colSpan={6} style={{ color: "var(--khora-accent)" }}>
                    sin volcados todavia
                  </td>
                </tr>
              )}
              {items.map((v) => {
                const isSelected = sel?.id === v.id;
                return (
                  <tr
                    key={v.id}
                    className="border-b last:border-b-0 align-top cursor-pointer transition-colors"
                    style={{
                      borderColor: "var(--khora-accent)",
                      backgroundColor: isSelected ? "var(--khora-surface)" : "transparent"
                    }}
                    onClick={() => elegir(v)}
                  >
                    <td className="p-3 whitespace-nowrap">{new Date(v.recibido_en).toLocaleString()}</td>
                    <td className="p-3">{v.titulo ?? "—"}</td>
                    <td className="p-3">{v.chars}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-xs border rounded-none font-mono" style={{ borderColor: "var(--khora-accent)", backgroundColor: "var(--khora-bg)" }}>
                        {v.estado}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{String(v.sha256).slice(0, 8)}</td>
                    <td className="p-3 truncate max-w-xs" style={{ color: "var(--khora-accent)" }}>
                      {v.texto.replace(/\s+/g, " ").slice(0, 70)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección de Detalle y Versiones */}
      {sel && (
        <div className="border p-6 space-y-6 rounded-none shadow-none" style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-accent)" }}>
          <div className="border-b pb-2" style={{ borderColor: "var(--khora-accent)" }}>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Icons.FileText size={18} style={{ color: "var(--khora-accent)" }} />
              Detalle del Volcado: {sel.id}
            </h2>
          </div>

          <div className="space-y-2">
            <strong className="text-xs uppercase tracking-wider block" style={{ color: "var(--khora-accent)" }}>Texto original:</strong>
            <pre className="p-3 border rounded-none text-xs whitespace-pre-wrap font-mono" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}>
              {sel.texto}
            </pre>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-semibold flex items-center gap-2 border-b pb-1" style={{ borderColor: "var(--khora-accent)" }}>
              <Icons.GitBranch size={16} style={{ color: "var(--khora-accent)" }} />
              Versiones
            </h3>

            {versiones.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--khora-accent)" }}>No hay versiones disponibles.</p>
            ) : (
              <div className="space-y-4">
                {versiones.map((v) => {
                  const res = ingestaRes[v.version];
                  return (
                    <div key={v.version} className="border p-4 space-y-3 rounded-none shadow-none" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}>
                      <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: "var(--khora-accent)" }}>
                        <span className="font-semibold text-sm">Versión {v.version}</span>
                        <span className="text-xs font-mono" style={{ color: "var(--khora-accent)" }}>sha256: {v.sha256}</span>
                      </div>
                      <pre className="text-xs p-3 border rounded-none whitespace-pre-wrap font-mono" style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-accent)" }}>
                        {v.texto}
                      </pre>

                      <button
                        onClick={() => ingerir(v)}
                        disabled={ingiriendo[v.version]}
                        className="px-3 py-1.5 text-xs font-semibold border rounded-none cursor-pointer disabled:opacity-50 hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: "var(--khora-accent)",
                          color: "var(--khora-bg)",
                          borderColor: "var(--khora-accent)"
                        }}
                      >
                        {ingiriendo[v.version] ? "Ingiriendo..." : "Ingerir esta versión"}
                      </button>

                      {res && (
                        <div className="p-3 border rounded-none text-sm space-y-2" style={{ borderColor: "var(--khora-accent)", backgroundColor: "var(--khora-surface)" }}>
                          <div>
                            <strong className="text-xs uppercase tracking-wider" style={{ color: "var(--khora-accent)" }}>Resultado:</strong> <span className="font-semibold">{res.estado}</span>
                          </div>
                          {res.data.error && <div className="text-xs font-mono" style={{ color: "var(--khora-accent)" }}>{res.data.error}</div>}
                          {res.data.detail && <div className="text-xs font-mono" style={{ color: "var(--khora-accent)" }}>{res.data.detail}</div>}
                          {res.data.io_id && <div className="text-xs font-mono">io_id: {res.data.io_id}</div>}

                          <div className="pt-2 border-t text-xs opacity-75 space-y-0.5" style={{ borderColor: "var(--khora-accent)" }}>
                            <div>CTR-PROP-01: REQUIERE BACKEND</div>
                            <div>CTR-DELTA-01: REQUIERE BACKEND</div>
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
        </div>
      )}

    </div>
  );
}
