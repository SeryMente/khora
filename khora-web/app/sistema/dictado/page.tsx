// @l0 L0-002-R · @req CORA-02/REQ-1 · @req FIX-DICTADO/D2-D8 · @acr ACR-1.2
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { ensamblarParrafos, Fragmento } from "../../../lib/transcripcion/ensamblar";

type Estado = "inactivo" | "dictando" | "finalizando";
type EstadoReconciliacion = "preview_live" | "procesando_whisper" | "reconciliado_whisper" | "fallback_preview";

function generarSesionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  const [audioFinalizando, setAudioFinalizando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [soportado, setSoportado] = useState(true);
  const [conAudio, setConAudio] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [reconexiones, setReconexiones] = useState(0);

  // Reconciliation & Authoritative STT state
  const [estadoReconciliacion, setEstadoReconciliacion] = useState<EstadoReconciliacion>("preview_live");
  const [reconciliacionMensaje, setReconciliacionMensaje] = useState("");

  // New states for parts
  const [partesContador, setPartesContador] = useState(0);
  const [bytesAcumulados, setBytesAcumulados] = useState(0);

  const recRef = useRef<any>(null);
  const grabRef = useRef<any>(null);
  const flujoRef = useRef<any>(null);
  const trozosRef = useRef<Blob[]>([]);
  const fragmentosRef = useRef<Fragmento[]>([]);
  const ultimaMarcaTiempoRef = useRef<number>(0);
  const pendienteRef = useRef("");
  const bloquesRef = useRef<string[]>([]);
  const relojRef = useRef<any>(null);
  const rearmeRef = useRef<any>(null);
  const activoRef = useRef(false);
  const inicioRef = useRef(0);
  const duracionRef = useRef(0);
  const abortosRef = useRef(0);
  const audioPermitidoRef = useRef(true);

  // New refs for session & parts
  const sesionIdRef = useRef<string>("");
  const parteConsecutivaRef = useRef<number>(0);
  const partesSubidasRef = useRef<{ parte: number; url: string; bytes: number }[]>([]);
  const parteTrozosRef = useRef<Blob[]>([]);
  const parteInicioRef = useRef<number>(0);
  const subidaEnCursoRef = useRef<Promise<void> | null>(null);
  const finalizacionAudioRef = useRef<Promise<void> | null>(null);
  const resolverFinalizacionAudioRef = useRef<(() => void) | null>(null);

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
      const textoRespuesta = await r.text();
      let data: any = {};
      try {
        data = JSON.parse(textoRespuesta);
      } catch (parseErr) {
        data = { motivo: "Respuesta no-JSON de pulido: " + textoRespuesta.slice(0, 100) };
      }

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
    if (fragmentosRef.current.length > 0) {
      const ensamblado = ensamblarParrafos(fragmentosRef.current, { umbralMs: 3500 });
      if (ensamblado.trim().length > 0) {
        fragmentosRef.current = [];
        pendienteRef.current = "";
        setPendiente("");
        void pulirBloque(ensamblado);
        return;
      }
    }
    const bloque = pendienteRef.current.trim();
    pendienteRef.current = "";
    setPendiente("");
    if (bloque.length > 0) void pulirBloque(bloque);
  }, [pulirBloque]);

  const ejecutarTranscripcionAutoritativa = useCallback(async () => {
    if (trozosRef.current.length === 0) return;
    setEstadoReconciliacion("procesando_whisper");
    const blob = new Blob(trozosRef.current, { type: "audio/webm" });
    const textoPreview = [...bloquesRef.current, pendienteRef.current].filter((s) => s.trim().length > 0).join("\n\n");

    const forma = new FormData();
    forma.append("audio", blob, "dictado-completo.webm");
    forma.append("previewText", textoPreview);

    try {
      const r = await fetch("/api/transcribir", { method: "POST", body: forma });
      const data = await r.json();
      if (r.ok && data?.exito && typeof data?.textoFinal === "string") {
        const textoReconciliado = data.textoFinal;
        const parrafos = textoReconciliado.split("\n\n").filter((p: string) => p.trim().length > 0);
        bloquesRef.current = parrafos;
        setBloques(parrafos);
        setPendiente("");
        pendienteRef.current = "";
        setEstadoReconciliacion("reconciliado_whisper");
        setReconciliacionMensaje(data.motivoReconciliacion || "Transcripción autoritativa Groq Whisper (whisper-large-v3) reconciliada con éxito.");
      } else {
        setEstadoReconciliacion("fallback_preview");
        setReconciliacionMensaje(`Groq Whisper no disponible: ${data?.detail || "Conservando previsualización ASR en vivo."}`);
      }
    } catch (e) {
      setEstadoReconciliacion("fallback_preview");
      setReconciliacionMensaje(`Fallo al solicitar transcripción autoritativa: ${String(e)}.`);
    }
  }, []);

  const subirParteActual = useCallback(async () => {
    if (parteTrozosRef.current.length === 0) return;

    const trozosParaSubir = [...parteTrozosRef.current];
    parteTrozosRef.current = [];

    const parteActual = parteConsecutivaRef.current;
    parteConsecutivaRef.current += 1;
    parteInicioRef.current = Date.now();

    const blob = new Blob(trozosParaSubir, { type: "audio/webm" });
    const sesionId = sesionIdRef.current;

    const maxParteBytes = 3 * 1024 * 1024; // 3 MB safety limit
    const totalBytes = blob.size;

    const ejecutarSubidaDeBlob = async (blobASubir: Blob, numParte: number) => {
      const forma = new FormData();
      forma.append("audio", blobASubir, `dictado-parte-${numParte}.webm`);
      forma.append("sesionId", sesionId);
      forma.append("parte", String(numParte));

      try {
        const ra = await fetch("/api/audio", { method: "POST", body: forma });
        const textoRespuesta = await ra.text();
        let da: any = {};
        try {
          da = JSON.parse(textoRespuesta);
        } catch (parseErr) {
          da = { detail: "Respuesta no-JSON de la API de audio: " + textoRespuesta.slice(0, 100) };
        }

        if (ra.ok && typeof da?.url === "string") {
          const bytesSubidos = typeof da?.bytes === "number" ? da.bytes : blobASubir.size;
          partesSubidasRef.current.push({
            parte: numParte,
            url: da.url,
            bytes: bytesSubidos,
          });
          setPartesContador(partesSubidasRef.current.length);
          setBytesAcumulados((total) => total + bytesSubidos);
          setConAudio(true);
        } else {
          setAviso(`audio parte ${numParte} no guardada: ${String(da?.detail || "")} ${String(da?.causa || "")}`);
        }
      } catch (e) {
        setAviso(`audio parte ${numParte} no guardada por error: ${String(e)}`);
      }
    };

    const ejecutarSubidas = async () => {
      if (totalBytes <= maxParteBytes) {
        await ejecutarSubidaDeBlob(blob, parteActual);
      } else {
        let offset = 0;
        let subParteIndex = 0;
        while (offset < totalBytes) {
          const fin = Math.min(offset + maxParteBytes, totalBytes);
          const subBlob = blob.slice(offset, fin, "audio/webm");

          const actualSubParteNum = (subParteIndex === 0) ? parteActual : parteConsecutivaRef.current;
          if (subParteIndex > 0) {
            parteConsecutivaRef.current += 1;
          }

          await ejecutarSubidaDeBlob(subBlob, actualSubParteNum);
          offset = fin;
          subParteIndex++;
        }
      }
    };

    const anteriorSubida = subidaEnCursoRef.current || Promise.resolve();
    const nuevaSubida = anteriorSubida.then(ejecutarSubidas);
    subidaEnCursoRef.current = nuevaSubida;
    await nuevaSubida;
  }, []);

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

      grabadora.ondataavailable = (ev: any) => {
        if (ev.data && ev.data.size > 0) {
          trozosRef.current.push(ev.data);
          parteTrozosRef.current.push(ev.data);
          setConAudio(true);

          const totalSize = parteTrozosRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          const elapsed = Date.now() - parteInicioRef.current;

          if (totalSize >= 1.5 * 1024 * 1024 || elapsed >= 45 * 1000) {
            void subirParteActual();
          }
        }
      };

      grabadora.onstop = async () => {
        try {
          const finalizacion = subirParteActual();
          subidaEnCursoRef.current = finalizacion;
          await finalizacion;
        } finally {
          resolverFinalizacionAudioRef.current?.();
          resolverFinalizacionAudioRef.current = null;
        }
      };

      finalizacionAudioRef.current = new Promise<void>((resolve) => { resolverFinalizacionAudioRef.current = resolve; });
      grabadora.start(1000);
      grabRef.current = grabadora;
    } catch (e) {
      setAviso("dictado sin grabacion de voz: " + String(e));
    }
  }, [subirParteActual]);

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
      const ahora = Date.now();
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const txt = res[0].transcript.trim();
        if (res.isFinal && txt.length > 0) {
          const pausaMsAntes = ultimaMarcaTiempoRef.current > 0 ? ahora - ultimaMarcaTiempoRef.current : 0;
          ultimaMarcaTiempoRef.current = ahora;

          fragmentosRef.current.push({ texto: txt, pausaMsAntes });
          const ensamblado = ensamblarParrafos(fragmentosRef.current, { umbralMs: 3500 });
          pendienteRef.current = ensamblado;
          setPendiente(ensamblado);

          if (relojRef.current) clearTimeout(relojRef.current);
          // Permitir que el bloque permanezca abierto en pausas breves; se consolida a los 4000ms de inactividad o al detener
          relojRef.current = setTimeout(cerrarBloque, 4000);
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

    // Reset session & parts refs/states
    sesionIdRef.current = generarSesionId();
    parteConsecutivaRef.current = 0;
    partesSubidasRef.current = [];
    parteTrozosRef.current = [];
    parteInicioRef.current = Date.now();
    subidaEnCursoRef.current = null;
    setPartesContador(0);
    setBytesAcumulados(0);

    activoRef.current = true;
    const arrancado = arrancarReconocedor();
    if (!arrancado) { activoRef.current = false; return; }
    inicioRef.current = Date.now();
    setEstado("dictando");
    setTimeout(() => { void arrancarGrabacion(); }, 900);
  }, [arrancarReconocedor, arrancarGrabacion]);

  const detener = useCallback(async () => {
    activoRef.current = false;
    setAudioFinalizando(true);
    setEstado("finalizando");
    if (rearmeRef.current) clearTimeout(rearmeRef.current);
    try { recRef.current?.stop(); } catch (e) {}
    recRef.current = null;
    detenerGrabacion();
    if (inicioRef.current > 0) duracionRef.current = Math.round((Date.now() - inicioRef.current) / 1000);
    if (relojRef.current) clearTimeout(relojRef.current);
    setParcial("");
    setEscuchando(false);
    cerrarBloque();
    try {
      if (finalizacionAudioRef.current) await finalizacionAudioRef.current;
      if (subidaEnCursoRef.current) await subidaEnCursoRef.current;
      await ejecutarTranscripcionAutoritativa();
    } finally {
      finalizacionAudioRef.current = null;
      subidaEnCursoRef.current = null;
      setAudioFinalizando(false);
      setEstado("inactivo");
    }
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
      if (subidaEnCursoRef.current) {
        await subidaEnCursoRef.current;
      }

      let audioUrl: string | null = null;
      let audioBytes: number | null = null;
      const partes = partesSubidasRef.current;

      if (partes.length > 0) {
        const ordenadas = [...partes].sort((a, b) => a.parte - b.parte);
        const parte0 = ordenadas.find((p) => p.parte === 0) || ordenadas[0];
        audioUrl = parte0 ? parte0.url : null;
        audioBytes = ordenadas.reduce((sum, p) => sum + p.bytes, 0);
      }

      const payload = {
        texto,
        sessionId: sesionIdRef.current || null,
        titulo: titulo.trim().length > 0 ? titulo.trim() : null,
        audioUrl,
        audioBytes,
        duracionSeg: duracionRef.current,
        pulidoAplicado: pulidosOk > 0,
        audioPartes: partes.length > 0 ? partes : null,
      };

      let rv: Response;
      let dv: any = {};
      try {
        rv = await fetch("/api/dictado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const textoRespuesta = await rv.text();
        try {
          dv = JSON.parse(textoRespuesta);
        } catch (parseErr) {
          dv = { detail: "Respuesta no-JSON de dictado: " + textoRespuesta.slice(0, 200) };
        }

        if (!rv.ok) {
          setError(String(dv?.detail || "Error desconocido") + " " + String(dv?.causa ?? ""));
        } else {
          setResultado("archivado " + String(dv?.chars) + " caracteres, sha " + String(dv?.sha256).slice(0, 8) + (audioUrl ? `, con audio (${partes.length} partes)` : ", sin audio"));
        }
      } catch (err) {
        setError("Error de red al guardar: " + String(err));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }, [titulo, pulidosOk]);

  const limpiar = useCallback(() => {
    bloquesRef.current = [];
    setBloques([]);
    fragmentosRef.current = [];
    ultimaMarcaTiempoRef.current = 0;
    pendienteRef.current = "";
    setPendiente("");
    setParcial("");
    trozosRef.current = [];
    duracionRef.current = 0;
    setConAudio(false);
    setPulidosOk(0);
    setPulidosNo(0);
    setResultado("");
    setError("");
    setAviso("");
    setReconexiones(0);
    setEstadoReconciliacion("preview_live");
    setReconciliacionMensaje("");

    // Reset new states and refs
    sesionIdRef.current = "";
    parteConsecutivaRef.current = 0;
    partesSubidasRef.current = [];
    parteTrozosRef.current = [];
    subidaEnCursoRef.current = null;
    setPartesContador(0);
    setBytesAcumulados(0);
  }, []);

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
      {/* Cabecera de Sección */}
      <div className="border-b pb-4" style={{ borderColor: "var(--khora-border)" }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icons.Mic size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
          Dictado Clean Verbatim Semántico
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--khora-accent)" }}>
          Arquitectura desacoplada: Previsualización ASR en vivo + Transcripción autoritativa Groq Whisper + Corrección con Invariancia Lexical Estricta.
        </p>
      </div>

      {/* Nota Explicativa ASR vs Autoritativo */}
      <div className="p-3 border rounded-none text-xs space-y-1" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
        <div className="font-semibold flex items-center gap-1.5">
          <Icons.Info size={16} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
          <span>Diferencia entre Previsualización Browser ASR y Transcripción Autoritativa:</span>
        </div>
        <p className="opacity-90">
          <strong>Previsualización ASR:</strong> Reconocimiento de voz local del navegador con respuesta inmediata word-by-word. Las pausas cortas no fuerzan saltos de párrafo.
        </p>
        <p className="opacity-90">
          <strong>Transcripción Autoritativa:</strong> Procesamiento con <code>whisper-large-v3</code> mediante Groq sobre el audio grabado para garantizar máxima fidelidad ortotipográfica y lexical.
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
            disabled={guardando || audioFinalizando || estado !== "inactivo"}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.Check size={32} strokeWidth={1.75} />
            {guardando ? "archivando..." : audioFinalizando ? "finalizando audio..." : "Archivar volcado"}
          </button>

          <button
            onClick={limpiar}
            disabled={estado !== "inactivo"}
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

      {/* Badges de Estado Visual */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2 py-0.5 border font-semibold" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
          {estadoReconciliacion === "reconciliado_whisper"
            ? "🟢 Autoritativo: Groq Whisper"
            : estadoReconciliacion === "procesando_whisper"
            ? "🟡 Procesando Groq Whisper..."
            : estadoReconciliacion === "fallback_preview"
            ? "🟠 Previsualización ASR (Groq indisponible)"
            : "🔵 Previsualización ASR en vivo"}
        </span>
        <span className="px-2 py-0.5 border font-semibold" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          Bloques pulidos: {pulidosOk} / Sin pulir: {pulidosNo}
        </span>
      </div>

      {/* Area de Transcripción */}
      <div
        className="p-4 min-h-[240px] whitespace-pre-wrap leading-relaxed border rounded-none text-sm relative"
        style={{
          backgroundColor: "var(--khora-surface)",
          borderColor: "var(--khora-border)",
          color: "var(--khora-ink)",
        }}
      >
        {bloques.length === 0 && pendiente.length === 0 && parcial.length === 0 && (
          <span className="opacity-40 italic">Pulsa "Iniciar dictado" y comienza a hablar...</span>
        )}
        {bloques.map((b, i) => (<p key={i} className="mb-3">{b}</p>))}
        {pendiente.length > 0 && <p className="mb-3 opacity-90">{pendiente}</p>}
        {parcial.length > 0 && (
          <span className="opacity-60 italic bg-amber-500/10 px-1 border-b border-dashed border-amber-500">
            [provisional]: {parcial}
          </span>
        )}
      </div>

      {/* EstadÃ­sticas */}
      <p className="text-xs font-medium" style={{ color: "var(--khora-accent)" }}>
        estado: {estado} / escuchando: {escuchando ? "si" : "no"} / caracteres: {totalChars} / bloques pulidos: {pulidosOk} / bloques sin pulir: {pulidosNo} / audio: {conAudio ? "si" : "no"} / partes subidas: {partesContador} ({ (bytesAcumulados / (1024 * 1024)).toFixed(2) } MB) / reconexiones: {reconexiones}
      </p>

      {/* Alertas y Mensajes de Retorno */}
      {reconciliacionMensaje.length > 0 && (
        <div className="p-3 border rounded-none text-xs flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
          <Icons.Sparkles size={20} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--khora-accent)" }} />
          <span>{reconciliacionMensaje}</span>
        </div>
      )}
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
