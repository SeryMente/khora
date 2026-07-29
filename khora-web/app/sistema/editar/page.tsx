// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
"use client";

import { useCallback, useEffect, useState } from "react";

type Fila = { id: string; titulo?: string | null; texto?: string | null; chars?: number | null; recibido_en?: string | null; audio_url?: string | null; ediciones?: number | null };
type Par = { antes: string; despues: string };

export default function EditarPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [sel, setSel] = useState<Fila | null>(null);
  const [texto, setTexto] = useState("");
  const [pares, setPares] = useState<Par[]>([]);
  const [lexico, setLexico] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/volcado");
      const d = await r.json();
      if (!r.ok) { setError(String(d?.detail) + " " + String(d?.causa ?? "")); return; }
      const items = Array.isArray(d?.items) ? d.items : [];
      setFilas(items);
    } catch (e) { setError(String(e)); }
    try {
      const rl = await fetch("/api/edicion");
      const dl = await rl.json();
      if (Array.isArray(dl?.lexico)) setLexico(dl.lexico);
    } catch (e) { setAviso("lexico no disponible: " + String(e)); }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const elegir = useCallback((f: Fila) => {
    setSel(f);
    setTexto(typeof f.texto === "string" ? f.texto : "");
    setPares([]);
    setAviso("");
    setError("");
  }, []);

  const guardar = useCallback(async () => {
    if (!sel) return;
    setCargando(true);
    setError("");
    setPares([]);
    try {
      const r = await fetch("/api/edicion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sel.id, texto }) });
      const d = await r.json();
      if (!r.ok) { setError(String(d?.detail) + " " + String(d?.causa ?? "")); }
      else {
        setPares(Array.isArray(d?.pares) ? d.pares : []);
        setAviso("guardado. correcciones registradas: " + String(d?.guardadas));
        void cargar();
      }
    } catch (e) { setError(String(e)); } finally { setCargando(false); }
  }, [sel, texto, cargar]);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1>Editar transcripciones</h1>
      <p style={{ fontSize: 13, opacity: 0.75 }}>La transcripcion original nunca se borra. Cada cambio se registra como correccion para construir tu lexico.</p>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: "0 0 300px", maxHeight: 520, overflowY: "auto", border: "1px solid #ccc", borderRadius: 6, padding: 8 }}>
          {filas.length === 0 && <p style={{ fontSize: 13, opacity: 0.6 }}>sin volcados</p>}
          {filas.map((f) => (
            <button key={f.id} onClick={() => elegir(f)} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: 6, background: sel?.id === f.id ? "#eef" : "transparent", border: "1px solid #ddd", borderRadius: 4 }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{String(f.recibido_en ?? "").slice(0, 16)} / {String(f.chars ?? "")} car{f.audio_url ? " / audio" : ""}{(f.ediciones ?? 0) > 0 ? " / editado" : ""}</span>
              <br />
              <span style={{ fontSize: 13 }}>{f.titulo && f.titulo.length > 0 ? f.titulo : String(f.texto ?? "").slice(0, 50)}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {!sel && <p style={{ opacity: 0.6 }}>elige un volcado de la izquierda</p>}
          {sel && (
            <div>
              {sel.audio_url && <audio controls src={sel.audio_url} style={{ width: "100%", marginBottom: 8 }} />}
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={16} style={{ width: "100%", padding: 8, fontFamily: "inherit", lineHeight: 1.6 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={guardar} disabled={cargando}>{cargando ? "guardando..." : "Guardar correcciones"}</button>
                <span style={{ fontSize: 12, opacity: 0.7, alignSelf: "center" }}>{texto.length} caracteres</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {aviso.length > 0 && <p style={{ color: "#070" }}>{aviso}</p>}
      {error.length > 0 && <p style={{ color: "#b00" }}>{error}</p>}
      {pares.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16 }}>Delta de esta edicion</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr><th style={{ textAlign: "left" }}>transcrito</th><th style={{ textAlign: "left" }}>corregido</th></tr></thead>
            <tbody>
              {pares.map((p, i) => (<tr key={i}><td style={{ borderTop: "1px solid #eee", color: "#b00" }}>{p.antes.length > 0 ? p.antes : "(nada)"}</td><td style={{ borderTop: "1px solid #eee", color: "#070" }}>{p.despues.length > 0 ? p.despues : "(eliminado)"}</td></tr>))}
            </tbody>
          </table>
        </div>
      )}
      {lexico.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>Tu lexico de correcciones</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr><th style={{ textAlign: "left" }}>transcrito</th><th style={{ textAlign: "left" }}>correcto</th><th style={{ textAlign: "left" }}>veces</th></tr></thead>
            <tbody>
              {lexico.map((l, i) => (<tr key={i}><td style={{ borderTop: "1px solid #eee" }}>{String(l.antes)}</td><td style={{ borderTop: "1px solid #eee" }}>{String(l.despues)}</td><td style={{ borderTop: "1px solid #eee" }}>{String(l.veces)}</td></tr>))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
