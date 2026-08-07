// @l0 L0-002-R Â· @req CORA-02/REQ-1 Â· @acr ACR-1.2
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";

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
  const [escuchando, setEscuchando] = useState(false);
  const [reconexiones, setReconexiones] = useState(0);
  const recRef = useRef<any>(null);
  const grabRef = useRef<any>(null);
  const flujoRef = useRef<any>(null);
  const trozosRef = useRef<Blob[]>([]);
  const pendienteRef = useRef("");
  const bloquesRef = useRef<string[]>([]);
  const relojRef = useRef<any>(null);
  const rearmeRef = useRef<any>(null);
  const activoRef = useRef(false);
  const inicioRef = useRef(0);
  const duracionRef = useRef(0);
  const abortosRef = useRef(0);
  const audioPermitidoRef = useRef(true);

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

  const detenerGrabacion = useCallback(() => {
    try { grabRef.current?.stop(); } catch (e) {}
    grabRef.current = null;
    try { flujoRef.current?.getTracks?.().forEach((pista: any) => pista.stop()); } catch (e) {}
    flujoRef.current = null;
  }, []);

  const arrancarGrabacion = useCallback(async () => {
    if (!audioPermitidoRef.current || !activoRef.current || grabRef.current) return;
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activoRef.current || !audioPermitidoRef.current) { try { flujo.getTracks().forEach((pista: any) => pista.stop()); } catch (e) {} return; }
      flujoRef.current = flujo;
      const grabadora = new MediaRecorder(flujo);
      grabadora.ondataavailable = (ev: any) => { if (ev.data && ev.data.size > 0) { trozosRef.current.push(ev.data); setConAudio(true); } };
      grabadora.start(1000);
      grabRef.current = grabadora;
    } catch (e) {
      setAviso("dictado sin grabacion de voz: " + String(e));
    }
  }, []);

  const arrancarReconocedor = useCallback(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setError("Este navegador no soporta dictado en vivo. Usa Chrome o Edge."); return false; }
    const rec = new SR();
    rec.lang = "es-MX";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => { setEscuchando(true); abortosRef.current = 0; };
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
    rec.onerror = (ev: any) => {
      const clase = String(ev?.error ?? "");
      if (clase === "not-allowed" || clase === "service-not-allowed") {
        activoRef.current = false;
        setEscuchando(false);
        setEstado("inactivo");
        setError("permiso de microfono denegado para el reconocimiento de voz");
        return;
      }
      if (clase === "aborted" || clase === "audio-capture") {
        abortosRef.current = abortosRef.current + 1;
        if (grabRef.current || flujoRef.current) {
          audioPermitidoRef.current = false;
          detenerGrabacion();
          setConAudio(false);
          setAviso("grabacion de audio desactivada: el microfono queda solo para el reconocimiento");
          return;
        }
        if (abortosRef.current >= 6) {
          activoRef.current = false;
          setEscuchando(false);
          setEstado("inactivo");
          setError("reconocimiento: " + clase + " persistente tras " + abortosRef.current + " intentos");
        }
        return;
      }
      if (clase.length > 0 && clase !== "no-speech") setAviso("reconocimiento: " + clase);
    };
    rec.onend = () => {
      setEscuchando(false);
      setParcial("");
      if (!activoRef.current) return;
      if (rearmeRef.current) clearTimeout(rearmeRef.current);
      rearmeRef.current = setTimeout(() => {
        if (!activoRef.current) return;
        setReconexiones((n) => n + 1);
        try {
          rec.start();
        } catch (e) {
          try { rec.abort(); } catch (e2) {}
          rearmeRef.current = setTimeout(() => {
            if (!activoRef.current) return;
            try { rec.start(); } catch (e3) { activoRef.current = false; setEstado("inactivo"); setError("reconocimiento no reanudable: " + String(e3)); }
          }, 700);
        }
      }, 350);
    };
    recRef.current = rec;
    try { rec.start(); } catch (e) { setError("no se pudo iniciar el reconocimiento: " + String(e)); return false; }
    return true;
  }, [cerrarBloque, detenerGrabacion]);

  const iniciar = useCallback(async () => {
    setError("");
    setAviso("");
    setResultado("");
    setReconexiones(0);
    abortosRef.current = 0;
    audioPermitidoRef.current = true;
    trozosRef.current = [];
    activoRef.current = true;
    const arrancado = arrancarReconocedor();
    if (!arrancado) { activoRef.current = false; return; }
    inicioRef.current = Date.now();
    setEstado("dictando");
    setTimeout(() => { void arrancarGrabacion(); }, 900);
  }, [arrancarReconocedor, arrancarGrabacion]);

  const detener = useCallback(() => {
    activoRef.current = false;
    if (rearmeRef.current) clearTimeout(rearmeRef.current);
    try { recRef.current?.stop(); } catch (e) {}
    recRef.current = null;
    detenerGrabacion();
    if (inicioRef.current > 0) duracionRef.current = Math.round((Date.now() - inicioRef.current) / 1000);
    if (relojRef.current) clearTimeout(relojRef.current);
    setParcial("");
    setEscuchando(false);
    cerrarBloque();
    setEstado("inactivo");
  }, [cerrarBloque, detenerGrabacion]);

  useEffect(() => {
    return () => {
      activoRef.current = false;
      if (relojRef.current) clearTimeout(relojRef.current);
      if (rearmeRef.current) clearTimeout(rearmeRef.current);
      try { recRef.current?.abort?.(); } catch (e) {}
      try { grabRef.current?.stop(); } catch (e) {}
      try { flujoRef.current?.getTracks?.().forEach((pista: any) => pista.stop()); } catch (e) {}
    };
  }, []);

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
        try {
          const ra = await fetch("/api/audio", { method: "POST", body: forma });
          const crudo = await ra.text();
          let da: any = null;
          try { da = JSON.parse(crudo); } catch (eParse) { da = null; }
          if (ra.ok && typeof da?.url === "string") { audioUrl = da.url; audioBytes = typeof da?.bytes === "number" ? da.bytes : blob.size; }
          else { setAviso("audio no guardado (" + String(ra.status) + "): " + (da ? String(da?.detail) + " " + String(da?.causa) : crudo.slice(0, 120)) + " - " + (blob.size / 1048576).toFixed(1) + " MB"); }
        } catch (eRed) {
          setAviso("audio no guardado (fallo de red o tamano): " + String(eRed) + " - " + (blob.size / 1048576).toFixed(1) + " MB");
        }
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

  const limpiar = useCallback(() => { bloquesRef.current = []; setBloques([]); pendienteRef.current = ""; setPendiente(""); setParcial(""); trozosRef.current = []; duracionRef.current = 0; setConAudio(false); setPulidosOk(0); setPulidosNo(0); setResultado(""); setError(""); setAviso(""); setReconexiones(0); }, []);

  const totalChars = [...bloques, pendiente].filter((s) => s.trim().length > 0).join("\n\n").length;

  return (
    <main
      className="max-w-4xl mx-auto p-6 space-y-6"
      style={{
        backgroundColor: "var(--khora-bg)",
        color: "var(--khora-ink)",
        paddingBottom: "6rem",
      }}
    >
      {/* Cabecera de SecciÃ³n */}
      <div className="border-b pb-4" style={{ borderColor: "var(--khora-border)" }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icons.Mic size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
          Dictado
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--khora-accent)" }}>
          El texto se archiva integro con su hash antes de tocar el pipeline. Guardar nunca depende de que la ingesta funcione.
        </p>
      </div>

      {!soportado && (
        <div className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          <Icons.TriangleAlert size={32} strokeWidth={1.75} className="shrink-0" />
          <span>Este navegador no soporta dictado en vivo. Usa Chrome o Edge.</span>
        </div>
      )}

      {/* Inputs y Controles */}
      <div className="space-y-4">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="titulo opcional"
          className="w-full p-2.5 border rounded-none text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
          style={{
            backgroundColor: "var(--khora-surface)",
            color: "var(--khora-ink)",
            borderColor: "var(--khora-border)",
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          {estado === "inactivo" ? (
            <button
              onClick={iniciar}
              disabled={!soportado}
              className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
              style={{
                backgroundColor: "var(--khora-accent)",
                color: "var(--khora-bg)",
                borderColor: "var(--khora-accent)",
              }}
            >
              <Icons.Mic size={32} strokeWidth={1.75} />
              Iniciar dictado
            </button>
          ) : (
            <button
              onClick={detener}
              className="px-4 py-2 border rounded-none cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
              style={{
                backgroundColor: "var(--khora-surface)",
                color: "var(--khora-ink)",
                borderColor: "var(--khora-border)",
              }}
            >
              <Icons.Pause size={32} strokeWidth={1.75} />
              Detener
            </button>
          )}

          <button
            onClick={guardar}
            disabled={guardando || estado === "dictando"}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.Check size={32} strokeWidth={1.75} />
            {guardando ? "archivando..." : "Archivar volcado"}
          </button>

          <button
            onClick={limpiar}
            disabled={estado === "dictando"}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.RotateCcw size={32} strokeWidth={1.75} />
            Limpiar
          </button>

          {estado === "dictando" && (
            <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--khora-accent)" }}>
              <Icons.Activity size={32} strokeWidth={1.75} />
              {escuchando ? "escuchando" : "reconectando..."}
            </span>
          )}
        </div>
      </div>

      {/* Area de TranscripciÃ³n */}
      <div
        className="p-4 min-h-[240px] whitespace-pre-wrap leading-relaxed border rounded-none text-sm"
        style={{
          backgroundColor: "var(--khora-surface)",
          borderColor: "var(--khora-border)",
          color: "var(--khora-ink)",
        }}
      >
        {bloques.map((b, i) => (<p key={i} className="mb-3">{b}</p>))}
        {pendiente.length > 0 && <p className="mb-3 opacity-80">{pendiente}</p>}
        {parcial.length > 0 && <span className="opacity-50">{parcial}</span>}
      </div>

      {/* EstadÃ­sticas */}
      <p className="text-xs font-medium" style={{ color: "var(--khora-accent)" }}>
        estado: {estado} / escuchando: {escuchando ? "si" : "no"} / caracteres: {totalChars} / bloques pulidos: {pulidosOk} / bloques sin pulir: {pulidosNo} / audio: {conAudio ? "si" : "no"} / reconexiones: {reconexiones}
      </p>

      {/* Alertas y Mensajes de Retorno */}
      {aviso.length > 0 && (
        <div className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          <Icons.TriangleAlert size={32} strokeWidth={1.75} className="shrink-0" />
          <span>{aviso}</span>
        </div>
      )}
      {error.length > 0 && (
        <div className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          <Icons.ShieldX size={32} strokeWidth={1.75} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {resultado.length > 0 && (
        <div className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
          <Icons.CircleDot size={32} strokeWidth={1.75} className="shrink-0" />
          <span>{resultado}</span>
        </div>
      )}
    </main>
  );
}
