// @l0 L0-002 · @req CORA-02/REQ-1 · @acr ACR-1.2
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Estado = "inactivo" | "dictando";

export default function DictadoPage() {
  const [bloques, setBloques] = useState<string[]>([]);
  const [pendiente, setPendiente] = useState("");
  const [parcial, setParcial] = useState("");
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [titulo, setTitulo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [pulidosOk, setPulidosOk] = useState(0);
  const [pulidosNo, setPulidosNo] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [soportado, setSoportado] = useState(true);
  const [conAudio, setConAudio] = useState(false);
  const recRef = useRef<any>(null);
  const grabRef = useRef<any>(null);
  const trozosRef = useRef<Blob[]>([]);
  const pendienteRef = useRef("");
  const bloquesRef = useRef<string[]>([]);
  const relojRef = useRef<any>(null);
  const activoRef = useRef(false);
  const inicioRef = useRef(0);
  const duracionRef = useRef(0);

  useEffect(() => {
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) setSoportado(false);
  }, []);

  const pulirBloque = useCallback(async (bloque: string) => {
    const indice = bloquesRef.current.length;
    bloquesRef.current = [...bloquesRef.current, bloque];
    setBloques(bloquesRef.current);
    try {
      const r = await fetch("/api/pulir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: bloque }) });
      const data = await r.json();
      if (r.ok && data?.aceptado === true && typeof data?.texto === "string") {
        const copia = [...bloquesRef.current];
        copia[indice] = data.texto;
        bloquesRef.current = copia;
        setBloques(copia);
        setPulidosOk((n) => n + 1);
      } else {
        setPulidosNo((n) => n + 1);
        setAviso(typeof data?.motivo === "string" ? "bloque sin pulir: " + data.motivo : "bloque sin pulir");
      }
    } catch (e) {
      setPulidosNo((n) => n + 1);
      setAviso("bloque sin pulir: " + String(e));
    }
  }, []);

  const cerrarBloque = useCallback(() => {
    const bloque = pendienteRef.current.trim();
    pendienteRef.current = "";
    setPendiente("");
    if (bloque.length > 0) void pulirBloque(bloque);
  }, [pulirBloque]);

  const iniciar = useCallback(async () => {
    setError("");
    setAviso("");
    setResultado("");
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setError("Este navegador no soporta dictado en vivo. Usa Chrome o Edge."); return; }
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const grabadora = new MediaRecorder(flujo);
      trozosRef.current = [];
      grabadora.ondataavailable = (ev: any) => { if (ev.data && ev.data.size > 0) { trozosRef.current.push(ev.data); setConAudio(true); } };
      grabadora.start(1000);
      grabRef.current = grabadora;
      inicioRef.current = Date.now();
    } catch (e) {
      setAviso("dictado sin grabacion de voz: " + String(e));
    }
    const rec = new SR();
    rec.lang = "es-MX";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      let interino = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const txt = res[0].transcript;
        if (res.isFinal) {
          pendienteRef.current = (pendienteRef.current + " " + txt).trim();
          setPendiente(pendienteRef.current);
          if (relojRef.current) clearTimeout(relojRef.current);
          relojRef.current = setTimeout(cerrarBloque, 1600);
        } else {
          interino = interino + " " + txt;
        }
      }
      setParcial(interino.trim());
    };
    rec.onerror = (ev: any) => { if (ev?.error && ev.error !== "no-speech") setError("reconocimiento: " + ev.error); };
    rec.onend = () => { if (activoRef.current) { try { rec.start(); } catch (e) {} } };
    recRef.current = rec;
    activoRef.current = true;
    rec.start();
    setEstado("dictando");
  }, [cerrarBloque]);

  const detener = useCallback(() => {
    activoRef.current = false;
    try { recRef.current?.stop(); } catch (e) {}
    recRef.current = null;
    try { grabRef.current?.stop(); } catch (e) {}
    if (inicioRef.current > 0) duracionRef.current = Math.round((Date.now() - inicioRef.current) / 1000);
    if (relojRef.current) clearTimeout(relojRef.current);
    setParcial("");
    cerrarBloque();
    setEstado("inactivo");
  }, [cerrarBloque]);

  const guardar = useCallback(async () => {
    setError("");
    setResultado("");
    const texto = [...bloquesRef.current, pendienteRef.current].filter((s) => s.trim().length > 0).join("\n\n");
    if (texto.trim().length === 0) { setError("no hay nada que archivar"); return; }
    setGuardando(true);
    try {
      let audioUrl: string | null = null;
      let audioBytes: number | null = null;
      if (trozosRef.current.length > 0) {
        const blob = new Blob(trozosRef.current, { type: "audio/webm" });
        const forma = new FormData();
        forma.append("audio", blob, "dictado.webm");
        const ra = await fetch("/api/audio", { method: "POST", body: forma });
        const da = await ra.json();
        if (ra.ok && typeof da?.url === "string") { audioUrl = da.url; audioBytes = typeof da?.bytes === "number" ? da.bytes : blob.size; }
        else { setAviso("audio no guardado: " + String(da?.detail) + " " + String(da?.causa)); }
      }
      const rv = await fetch("/api/dictado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, titulo: titulo.trim().length > 0 ? titulo.trim() : null, audioUrl, audioBytes, duracionSeg: duracionRef.current, pulidoAplicado: pulidosOk > 0 }) });
      const dv = await rv.json();
      if (!rv.ok) { setError(String(dv?.detail) + " " + String(dv?.causa ?? "")); }
      else { setResultado("archivado " + String(dv?.chars) + " caracteres, sha " + String(dv?.sha256).slice(0, 8) + (audioUrl ? ", con audio" : ", sin audio")); }
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }, [titulo, pulidosOk]);

  const limpiar = useCallback(() => { bloquesRef.current = []; setBloques([]); pendienteRef.current = ""; setPendiente(""); setParcial(""); trozosRef.current = []; duracionRef.current = 0; setConAudio(false); setPulidosOk(0); setPulidosNo(0); setResultado(""); setError(""); setAviso(""); }, []);

  const totalChars = [...bloques, pendiente].filter((s) => s.trim().length > 0).join("\n\n").length;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>Dictado</h1>
      {!soportado && <p style={{ color: "#b00" }}>Este navegador no soporta dictado en vivo. Usa Chrome o Edge.</p>}
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="titulo opcional" style={{ width: "100%", padding: 8, marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {estado === "inactivo" ? (
          <button onClick={iniciar} disabled={!soportado}>Iniciar dictado</button>
        ) : (
          <button onClick={detener}>Detener</button>
        )}
        <button onClick={guardar} disabled={guardando || estado === "dictando"}>{guardando ? "archivando..." : "Archivar volcado"}</button>
        <button onClick={limpiar} disabled={estado === "dictando"}>Limpiar</button>
      </div>
      <div style={{ border: "1px solid #ccc", borderRadius: 6, padding: 12, minHeight: 240, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
        {bloques.map((b, i) => (<p key={i} style={{ margin: "0 0 12px" }}>{b}</p>))}
        {pendiente.length > 0 && <p style={{ margin: "0 0 12px", opacity: 0.85 }}>{pendiente}</p>}
        {parcial.length > 0 && <span style={{ opacity: 0.5 }}>{parcial}</span>}
      </div>
      <p style={{ fontSize: 12, opacity: 0.75 }}>estado: {estado} / caracteres: {totalChars} / bloques pulidos: {pulidosOk} / bloques sin pulir: {pulidosNo} / audio: {conAudio ? "si" : "no"}</p>
      {aviso.length > 0 && <p style={{ color: "#a60" }}>{aviso}</p>}
      {error.length > 0 && <p style={{ color: "#b00" }}>{error}</p>}
      {resultado.length > 0 && <p style={{ color: "#070" }}>{resultado}</p>}
    </main>
  );
}
