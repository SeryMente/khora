// @l0 L0-002-R · @req UI-04/INGRESO-INTEGRADO
"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import * as Icons from "lucide-react";
import Link from "next/link";

type Estado = "inactivo" | "dictando";

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

export default function IngresoPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", color: "var(--khora-accent)" }}>Cargando…</p>}>
      <IngresoContenido />
    </Suspense>
  );
}

function IngresoContenido() {
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
  const [generandoTitulo, setGenerandoTitulo] = useState(false);
  const [resultado, setResultado] = useState("");
  const [soportado, setSoportado] = useState(true);
  const [conAudio, setConAudio] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [reconexiones, setReconexiones] = useState(0);

  // Editable textarea states
  const [texto, setTexto] = useState("");
  const [editando, setEditando] = useState(false);
  const [estabaDictando, setEstabaDictando] = useState(false);

  // New states for parts
  const [partesContador, setPartesContador] = useState(0);
  const [bytesAcumulados, setBytesAcumulados] = useState(0);

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

  // New refs for session & parts
  const sesionIdRef = useRef<string>("");
  const parteConsecutivaRef = useRef<number>(0);
  const partesSubidasRef = useRef<{ parte: number; url: string; bytes: number }[]>([]);
  const parteTrozosRef = useRef<Blob[]>([]);
  const parteInicioRef = useRef<number>(0);
  const subidaEnCursoRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) setSoportado(false);
  }, []);

  // Update unified textarea content when NOT editing
  useEffect(() => {
    if (!editando) {
      const parts = [...bloques, pendiente].filter((s) => s.trim().length > 0);
      let unified = parts.join("\n\n");
      if (parcial) {
        unified += (unified ? " " : "") + parcial;
      }
      setTexto(unified);
    }
  }, [bloques, pendiente, parcial, editando]);

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
    const bloque = pendienteRef.current.trim();
    pendienteRef.current = "";
    setPendiente("");
    if (bloque.length > 0) void pulirBloque(bloque);
  }, [pulirBloque]);

  const subirParteActual = useCallback(async () => {
    if (parteTrozosRef.current.length === 0) return;

    const trozosParaSubir = [...parteTrozosRef.current];
    parteTrozosRef.current = [];

    const parteActual = parteConsecutivaRef.current;
    parteConsecutivaRef.current += 1;
    parteInicioRef.current = Date.now();

    const blob = new Blob(trozosParaSubir, { type: "audio/webm" });
    const sesionId = sesionIdRef.current;

    const forma = new FormData();
    forma.append("audio", blob, `dictado-parte-${parteActual}.webm`);
    forma.append("sesionId", sesionId);
    forma.append("parte", String(parteActual));

    const ejecutarSubida = async () => {
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
          const bytesSubidos = typeof da?.bytes === "number" ? da.bytes : blob.size;
          partesSubidasRef.current.push({
            parte: parteActual,
            url: da.url,
            bytes: bytesSubidos,
          });
          setPartesContador(partesSubidasRef.current.length);
          setBytesAcumulados((total) => total + bytesSubidos);
          setConAudio(true);
        } else {
          setAviso(`audio parte ${parteActual} no guardada: ${String(da?.detail || "")} ${String(da?.causa || "")}`);
        }
      } catch (e) {
        setAviso(`audio parte ${parteActual} no guardada por error: ${String(e)}`);
      }
    };

    const anteriorSubida = subidaEnCursoRef.current || Promise.resolve();
    const nuevaSubida = anteriorSubida.then(ejecutarSubida);
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
          parteTrozosRef.current.push(ev.data);
          setConAudio(true);

          const totalSize = parteTrozosRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          const elapsed = Date.now() - parteInicioRef.current;

          if (totalSize >= 2 * 1024 * 1024 || elapsed >= 120 * 1000) {
            void subirParteActual();
          }
        }
      };

      grabadora.onstop = async () => {
        await subirParteActual();
      };

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
    setEditando(false);
    setEstabaDictando(false);
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

  // Special stop/pause when manual editing triggers
  const pausarDictadoPorEdicion = useCallback(() => {
    activoRef.current = false;
    if (rearmeRef.current) clearTimeout(rearmeRef.current);
    try { recRef.current?.stop(); } catch (e) {}
    try { grabRef.current?.stop(); } catch (e) {}
    if (relojRef.current) clearTimeout(relojRef.current);
    setParcial("");
    setEscuchando(false);
    setEstado("inactivo");
  }, []);

  const reanudarDictadoSinDemora = useCallback(async () => {
    setError("");
    setAviso("");
    setResultado("");
    activoRef.current = true;
    const arrancado = arrancarReconocedor();
    if (!arrancado) { activoRef.current = false; return; }
    setEstado("dictando");
    await arrancarGrabacion();
  }, [arrancarReconocedor, arrancarGrabacion]);

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
  }, [texto, titulo, pulidosOk]);

  const limpiar = useCallback(() => {
    bloquesRef.current = [];
    setBloques([]);
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
    setTexto("");
    setEditando(false);
    setEstabaDictando(false);

    // Reset new states and refs
    sesionIdRef.current = "";
    parteConsecutivaRef.current = 0;
    partesSubidasRef.current = [];
    parteTrozosRef.current = [];
    subidaEnCursoRef.current = null;
    setPartesContador(0);
    setBytesAcumulados(0);
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (!editando) {
      setEditando(true);
      if (estado === "dictando") {
        setEstabaDictando(true);
        pausarDictadoPorEdicion();
      } else {
        setEstabaDictando(false);
      }
    }
    setTexto(val);
  };

  const confirmarEdicion = () => {
    setEditando(false);
    bloquesRef.current = [texto];
    setBloques([texto]);
    pendienteRef.current = "";
    setPendiente("");
    setParcial("");

    if (estabaDictando) {
      setEstabaDictando(false);
      void reanudarDictadoSinDemora();
    }
  };

  const generarTituloConIA = async () => {
    if (!texto.trim()) return;
    setGenerandoTitulo(true);
    setError("");
    try {
      const r = await fetch("/api/dictado-archivo/titulo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await r.json();
      if (r.ok && data?.titulo) {
        setTitulo(data.titulo);
      } else {
        setError(data.detail || "Error al generar título.");
      }
    } catch (e: any) {
      setError("Fallo la llamada a Groq: " + String(e));
    } finally {
      setGenerandoTitulo(false);
    }
  };

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
          <Icons.Keyboard size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
          Ingreso Integrado
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--khora-accent)" }}>
          Método universal combinado: Dicta en vivo, escribe o pega directamente. La transcripción es editable de forma ipso facto e in-situ.
        </p>
      </div>

      {!soportado && (
        <div className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          <Icons.TriangleAlert size={32} strokeWidth={1.75} className="shrink-0" />
          <span>Este navegador no soporta dictado en vivo. Puedes utilizar escritura o copiar y pegar contenido.</span>
        </div>
      )}

      {/* Inputs y Controles */}
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título opcional (escribe o genera con IA)"
            className="flex-1 p-2.5 border rounded-none text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          />
          <button
            onClick={generarTituloConIA}
            disabled={generandoTitulo || !texto.trim()}
            className="px-3 py-2.5 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] text-xs"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.Sparkles size={16} strokeWidth={1.75} />
            {generandoTitulo ? "Generando..." : "Título con IA"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {estado === "inactivo" ? (
            <button
              onClick={iniciar}
              disabled={!soportado || editando}
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
            disabled={guardando || estado === "dictando" || editando}
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
            disabled={estado === "dictando" || editando}
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

      {/* Banner de Edición Activa */}
      {editando && (
        <div className="p-3 border rounded-none text-sm flex items-center justify-between gap-4 animate-pulse" style={{ borderColor: "var(--khora-accent)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
          <div className="flex items-center gap-2">
            <Icons.PenTool size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
            <span>
              <strong>Edición in-situ activa:</strong> El dictado está pausado. Confirma los cambios para reanudar.
            </span>
          </div>
          <button
            onClick={confirmarEdicion}
            className="px-3 py-1 bg-[var(--khora-accent)] text-[var(--khora-bg)] font-bold text-xs rounded-none cursor-pointer hover:opacity-90"
          >
            Confirmar edición
          </button>
        </div>
      )}

      {/* Área de Texto Editable */}
      <div className="relative">
        <textarea
          value={texto}
          onChange={handleTextareaChange}
          placeholder="Escribe, pega o inicia el dictado para transcribir..."
          className="w-full p-4 min-h-[260px] whitespace-pre-wrap leading-relaxed border rounded-none text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
          style={{
            backgroundColor: "var(--khora-surface)",
            borderColor: "var(--khora-border)",
            color: "var(--khora-ink)",
            resize: "vertical"
          }}
        />
      </div>

      {/* Estadísticas */}
      <p className="text-xs font-medium" style={{ color: "var(--khora-accent)" }}>
        estado: {estado} / editando: {editando ? "sí" : "no"} / caracteres: {texto.length} / bloques pulidos: {pulidosOk} / bloques sin pulir: {pulidosNo} / audio: {conAudio ? "sí" : "no"} / partes subidas: {partesContador} ({ (bytesAcumulados / (1024 * 1024)).toFixed(2) } MB) / reconexiones: {reconexiones}
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
