// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
"use client";

import { useCallback, useEffect, useState } from "react";

type Fila = { id: string; titulo?: string | null; texto?: string | null; texto_original?: string | null; chars?: number | null; recibido_en?: string | null; audio_url?: string | null; audio_bytes?: number | null; duracion_seg?: number | null; ediciones?: number | null; fuente?: string | null };
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
  const [versiones, setVersiones] = useState<any[]>([]);
  const [ingiriendo, setIngiriendo] = useState(false);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/volcado");
      const d = await r.json();
      if (!r.ok) { setError(String(d?.detail) + " " + String(d?.causa ?? "")); return; }
      setFilas(Array.isArray(d?.items) ? d.items : []);
    } catch (e) { setError(String(e)); }
    try {
      const rl = await fetch("/api/edicion");
      const dl = await rl.json();
      if (Array.isArray(dl?.lexico)) setLexico(dl.lexico);
    } catch (e) { setAviso("lexico no disponible: " + String(e)); }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const elegir = useCallback(async (f: Fila) => {
    setSel(f);
    setTexto(typeof f.texto === "string" ? f.texto : "");
    setPares([]);
    setAviso("");
    setError("");
    try {
      try { const rv = await fetch("/api/versiones?id=" + f.id); const dv = await rv.json(); setVersiones(Array.isArray(dv?.versiones) ? dv.versiones : []); } catch (e) { setVersiones([]); }
      const r = await fetch("/api/volcado/" + f.id);
      const d = await r.json();
      if (r.ok && d?.volcado) {
        const v = d.volcado as Fila;
        setSel(v);
        setTexto(typeof v.texto === "string" ? v.texto : "");
      } else {
        setAviso("no se pudo cargar el detalle: " + String(d?.detail ?? ""));
      }
    } catch (e) { setAviso("no se pudo cargar el detalle: " + String(e)); }
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
        setAviso(d?.sinCambios === true ? "no habia cambios, no se creo version nueva" : "guardado como version " + String(d?.version) + ". correcciones registradas: " + String(d?.guardadas));
        try { const rv2 = await fetch("/api/versiones?id=" + sel.id); const dv2 = await rv2.json(); setVersiones(Array.isArray(dv2?.versiones) ? dv2.versiones : []); } catch (e) {}
        void cargar();
      }
    } catch (e) { setError(String(e)); } finally { setCargando(false); }
  }, [sel, texto, cargar]);

  const ingerir = useCallback(async () => {
    if (!sel) return;
    const ultima = versiones.reduce((max: number, v: any) => Math.max(max, Number(v.version)), 0);
    if (ultima < 1) { setError("este volcado no tiene versiones registradas"); return; }
    setIngiriendo(true);
    setError("");
    setAviso("");
    try {
      const cuerpo = new FormData();
      cuerpo.append("volcado_id", sel.id);
      cuerpo.append("version", String(ultima));
      const r = await fetch("/api/ingesta", { method: "POST", body: cuerpo });
      const d = await r.json();
      if (!r.ok) { setError("ingesta rechazada: " + String(d?.error ?? d?.detail ?? "") + " " + String(d?.causa ?? "")); }
      else { setAviso("version " + String(ultima) + " ingerida. io_id: " + String(d?.io_id ?? "?")); }
    } catch (e) { setError(String(e)); } finally { setIngiriendo(false); }
  }, [sel, versiones]);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1>Editar transcripciones</h1>
      <p style={{ fontSize: 13, opacity: 0.75 }}>La transcripcion original nunca se borra. Cada cambio se registra como correccion para construir tu lexico.</p>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 300px", maxHeight: 520, overflowY: "auto", border: "1px solid #444", borderRadius: 6, padding: 8 }}>
          {filas.length === 0 && <p style={{ fontSize: 13, opacity: 0.6 }}>sin volcados</p>}
          {filas.map((f) => (
            <button key={f.id} onClick={() => { void elegir(f); }} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: 6, background: sel?.id === f.id ? "#26304a" : "transparent", border: "1px solid #444", borderRadius: 4, color: "inherit", cursor: "pointer" }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{String(f.recibido_en ?? "").slice(0, 16)} / {String(f.chars ?? "")} car</span>
              <br />
              <span style={{ fontSize: 13 }}>{f.titulo && f.titulo.length > 0 ? f.titulo : String(f.texto ?? "").slice(0, 50)}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {!sel && <p style={{ opacity: 0.6 }}>elige un volcado de la izquierda</p>}
          {sel && (
            <div>
              <div style={{ border: "1px solid #444", borderRadius: 6, padding: 10, marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Grabacion</p>
                {sel.audio_url ? (
                  <div>
                    <audio controls preload="metadata" src={"/api/audio/" + sel.id} style={{ width: "100%", marginTop: 6 }} />
                    <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.7 }}>
                      duracion: {String(sel.duracion_seg ?? "?")} s / tamano: {sel.audio_bytes ? Math.round(Number(sel.audio_bytes) / 1024) + " KB" : "?"} / <a href={"/api/audio/" + sel.id} target="_blank" rel="noreferrer">abrir en pestana nueva</a>
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.7 }}>este volcado no tiene grabacion asociada</p>
                )}
              </div>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={16} style={{ width: "100%", padding: 8, fontFamily: "inherit", lineHeight: 1.6 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <button onClick={guardar} disabled={cargando}>{cargando ? "guardando..." : "Guardar correcciones"}</button>
                <button onClick={ingerir} disabled={ingiriendo || versiones.length === 0}>{ingiriendo ? "ingiriendo..." : "Ingerir esta version"}</button>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{texto.length} caracteres / ediciones previas: {String(sel.ediciones ?? 0)}</span>
              </div>
              {sel.texto_original && sel.texto_original !== texto && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13 }}>ver transcripcion original intocada</summary>
                  <p style={{ whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.8 }}>{sel.texto_original}</p>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
      {versiones.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16 }}>Historial de versiones</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr><th style={{ textAlign: "left" }}>v</th><th style={{ textAlign: "left" }}>cuando</th><th style={{ textAlign: "left" }}>car</th><th style={{ textAlign: "left" }}>sha</th><th style={{ textAlign: "left" }}>motivo</th><th style={{ textAlign: "left" }}>texto</th></tr></thead>
            <tbody>
              {versiones.map((v, i) => (<tr key={i}><td style={{ borderTop: "1px solid #444" }}>{String(v.version)}</td><td style={{ borderTop: "1px solid #444" }}>{String(v.creado_en ?? "").slice(0, 16)}</td><td style={{ borderTop: "1px solid #444" }}>{String(v.chars)}</td><td style={{ borderTop: "1px solid #444", fontFamily: "monospace" }}>{String(v.sha256).slice(0, 8)}</td><td style={{ borderTop: "1px solid #444" }}>{String(v.motivo ?? "")}</td><td style={{ borderTop: "1px solid #444" }}><button onClick={() => setTexto(String(v.texto))}>cargar</button></td></tr>))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Las versiones no se sobrescriben nunca. La version 1 es la transcripcion del dictado.</p>
        </div>
      )}
      {aviso.length > 0 && <p style={{ color: "#7c7" }}>{aviso}</p>}
      {error.length > 0 && <p style={{ color: "#f77" }}>{error}</p>}
      {pares.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16 }}>Delta de esta edicion</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr><th style={{ textAlign: "left" }}>transcrito</th><th style={{ textAlign: "left" }}>corregido</th></tr></thead>
            <tbody>
              {pares.map((p, i) => (<tr key={i}><td style={{ borderTop: "1px solid #444", color: "#f77" }}>{p.antes.length > 0 ? p.antes : "(nada)"}</td><td style={{ borderTop: "1px solid #444", color: "#7c7" }}>{p.despues.length > 0 ? p.despues : "(eliminado)"}</td></tr>))}
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
              {lexico.map((l, i) => (<tr key={i}><td style={{ borderTop: "1px solid #444" }}>{String(l.antes)}</td><td style={{ borderTop: "1px solid #444" }}>{String(l.despues)}</td><td style={{ borderTop: "1px solid #444" }}>{String(l.veces)}</td></tr>))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
