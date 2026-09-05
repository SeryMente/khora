// @l0 L0-002-R · @req CORA-02/REQ-1 · @req FIX-DICTADO/D2-D8 · @acr ACR-1.2 · @req FIX-DICTADO/D12 · @req FIX-DICTADO/D13 · @req FIX-DICTADO/D14 · @req FIX-DICTADO/D15
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { ensamblarParrafos, Fragmento } from "../../../lib/transcripcion/ensamblar";
import { reconciliarSegmentos, type SegmentoReconciliado } from "../../../lib/transcripcion/reconciliar";
import { transcribeStoredSession } from "../../../lib/client/authoritative-transcription";

type Estado = "inactivo" | "dictando" | "finalizando";
type EstadoReconciliacion = "preview_live" | "procesando_whisper" | "reconciliado_whisper" | "fallback_preview" | "editado_manual";

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
  const [segmentos, setSegmentos] = useState<SegmentoReconciliado[]>([]);
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
  const [retranscribiendo, setRetranscribiendo] = useState(false);
  const [adjuntandoAudio, setAdjuntandoAudio] = useState(false);
  const [audioFinalizando, setAudioFinalizando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [soportado, setSoportado] = useState(true);
  const [conAudio, setConAudio] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [reconexiones, setReconexiones] = useState(0);

  // Reconciliation & Authoritative STT state
  const [estadoReconciliacion, setEstadoReconciliacion] = useState<EstadoReconciliacion>("preview_live");
  const [reconciliacionMensaje, setReconciliacionMensaje] = useState("");
  const [estadoTranscripcionUI, setEstadoTranscripcionUI] = useState<"completo" | "parcial" | "fallido" | null>(null);

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
  const segmentosRef = useRef<SegmentoReconciliado[]>([]);
  const relojRef = useRef<any>(null);
  const rearmeRef = useRef<any>(null);
  const activoRef = useRef(false);
  const inicioRef = useRef(0);
  const duracionRef = useRef(0);
  const abortosRef = useRef(0);
  const audioPermitidoRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New refs for session, parts & raw blobs
  const sesionIdRef = useRef<string>("");
  const parteConsecutivaRef = useRef<number>(1);
  const partesSubidasRef = useRef<{ parte: number; url: string; bytes: number }[]>([]);
  const partesRawRef = useRef<{ parte: number; blob: Blob }[]>([]);
  const parteTrozosRef = useRef<Blob[]>([]);
  const parteInicioRef = useRef<number>(0);
  const estadoTranscripcionRef = useRef<string | null>(null);
  const subidaEnCursoRef = useRef<Promise<void> | null>(null);
  const finalizacionAudioRef = useRef<Promise<void> | null>(null);
  const resolverFinalizacionAudioRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) setSoportado(false);
  }, []);

  /**
   * Estabiliza el avance de la emisión de voz sin forzar saltos de párrafo ni vaciar el contexto discursivo.
   */
  const estabilizarEmision = useCallback(() => {
    if (fragmentosRef.current.length > 0) {
      const ensamblado = ensamblarParrafos(fragmentosRef.current, { umbralMs: 3500 });
      if (ensamblado.trim().length > 0) {
        setPendiente(ensamblado);
        pendienteRef.current = ensamblado;

        const parrafos = ensamblado.split("\n\n").filter((p) => p.trim().length > 0);
        const existentes = [...segmentosRef.current];

        const nuevosSegmentos: SegmentoReconciliado[] = parrafos.map((p, idx) => {
          const segExistente = existentes[idx];
          if (segExistente && (segExistente.estado === "editado_manual" || segExistente.modificadoManualmente)) {
            return segExistente;
          }
          return {
            id: segExistente?.id ?? `seg-${idx + 1}-${Date.now()}`,
            texto: p,
            estado: "provisional_asr",
          };
        });

        segmentosRef.current = nuevosSegmentos;
        setSegmentos(nuevosSegmentos);
      }
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
    // Retener cada parte cruda en partesRawRef ANTES de vaciar los trozos
    partesRawRef.current.push({ parte: parteActual, blob });

    const sesionId = sesionIdRef.current;

    const ejecutarSubidas = async () => {
      const forma = new FormData();
      forma.append("audio", blob, `dictado-parte-${parteActual}.webm`);
      forma.append("sesionId", sesionId);
      forma.append("parte", String(parteActual));

      try {
        const ra = await fetch("/api/audio", { method: "POST", body: forma });
        const textoRespuesta = await ra.text();
        let da: any = {};
        try {
          da = JSON.parse(textoRespuesta);
        } catch {
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
          setAviso(`audio parte ${parteActual} no guardada: ${String(da?.detail || "")}`);
        }
      } catch (e) {
        setAviso(`audio parte ${parteActual} no guardada por error: ${String(e)}`);
      }
    };

    const anteriorSubida = subidaEnCursoRef.current || Promise.resolve();
    const nuevaSubida = anteriorSubida.then(ejecutarSubidas);
    subidaEnCursoRef.current = nuevaSubida;
    await nuevaSubida;
  }, []);

  const ejecutarTranscripcionAutoritativa = useCallback(async () => {
    if (!sesionIdRef.current || partesSubidasRef.current.length === 0) {
      if (partesRawRef.current.length > 0 || trozosRef.current.length > 0) {
        setEstadoReconciliacion("fallback_preview");
        setEstadoTranscripcionUI("fallido");
        estadoTranscripcionRef.current = "fallido";
        setAviso("Audio no vinculado; se conservó la transcripción del navegador");
        setReconciliacionMensaje(
          "No se enviará el audio completo al servidor: ninguna parte quedó almacenada y vinculada a la sesión.",
        );
      }
      return;
    }
    setEstadoReconciliacion("procesando_whisper");

    const textoPreview = segmentosRef.current.map((s) => s.texto).join("\n\n") || pendienteRef.current;

    try {
      const { ok, data } = await transcribeStoredSession(
        sesionIdRef.current,
        textoPreview,
      );

      if (ok && data?.exito && typeof data?.textoFinal === "string") {
        const resultadoReconciliacion = reconciliarSegmentos(segmentosRef.current, data.textoFinal);
        segmentosRef.current = resultadoReconciliacion.segmentos;
        setSegmentos(resultadoReconciliacion.segmentos);
        setPendiente("");
        pendienteRef.current = "";

        const hayManual = resultadoReconciliacion.segmentos.some((s) => s.estado === "editado_manual" || s.modificadoManualmente);
        const perdida = data.perdidaDetectada || resultadoReconciliacion.perdidaDetectada;

        if (data?.estadoTranscripcion) {
          estadoTranscripcionRef.current = data.estadoTranscripcion;
          setEstadoTranscripcionUI(data.estadoTranscripcion);
        }

        if (hayManual) {
          setEstadoReconciliacion("editado_manual");
        } else if (perdida) {
          setEstadoReconciliacion("fallback_preview");
          setAviso("Posible omisión detectada · se conservó lo capturado");
        } else {
          setEstadoReconciliacion("reconciliado_whisper");
        }

        if (data?.estadoTranscripcion === "parcial") {
          setAviso("Transcripción parcial · audio guardado para re-transcribir");
        }

        setReconciliacionMensaje(
          data.motivoReconciliacion || resultadoReconciliacion.motivo || "Transcripción autoritativa Groq Whisper procesada con éxito."
        );
      } else {
        const hayManual = segmentosRef.current.some((s) => s.estado === "editado_manual" || s.modificadoManualmente);
        setEstadoReconciliacion(hayManual ? "editado_manual" : "fallback_preview");
        setEstadoTranscripcionUI("fallido");
        estadoTranscripcionRef.current = "fallido";
        setAviso("Groq no disponible");
        setReconciliacionMensaje(`Groq Whisper no disponible: ${data?.detail || "Conservando previsualización ASR en vivo."}`);
      }
    } catch (e) {
      const hayManual = segmentosRef.current.some((s) => s.estado === "editado_manual" || s.modificadoManualmente);
      setEstadoReconciliacion(hayManual ? "editado_manual" : "fallback_preview");
      setEstadoTranscripcionUI("fallido");
      estadoTranscripcionRef.current = "fallido";
      setAviso("Groq no disponible");
      setReconciliacionMensaje(`Fallo al solicitar transcripción autoritativa: ${String(e)}.`);
    }
  }, []);

  const detenerGrabacion = useCallback(() => {
    try { grabRef.current?.stop(); } catch {}
    grabRef.current = null;
    try { flujoRef.current?.getTracks?.().forEach((pista: any) => pista.stop()); } catch {}
    flujoRef.current = null;
  }, []);

  const arrancarGrabacion = useCallback(async () => {
    if (!audioPermitidoRef.current || !activoRef.current || grabRef.current) return;
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activoRef.current || !audioPermitidoRef.current) { try { flujo.getTracks().forEach((pista: any) => pista.stop()); } catch {} return; }
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
          estabilizarEmision();

          if (relojRef.current) clearTimeout(relojRef.current);
          relojRef.current = setTimeout(estabilizarEmision, 4000);
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
        } catch {
          try { rec.abort(); } catch {}
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
  }, [estabilizarEmision, detenerGrabacion]);

  const iniciar = useCallback(async () => {
    setError("");
    setAviso("");
    setResultado("");
    setReconexiones(0);
    abortosRef.current = 0;
    audioPermitidoRef.current = true;
    trozosRef.current = [];

    sesionIdRef.current = generarSesionId();
    parteConsecutivaRef.current = 1;
    partesSubidasRef.current = [];
    partesRawRef.current = [];
    parteTrozosRef.current = [];
    parteInicioRef.current = Date.now();
    subidaEnCursoRef.current = null;
    estadoTranscripcionRef.current = null;
    setEstadoTranscripcionUI(null);
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
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    detenerGrabacion();
    if (inicioRef.current > 0) duracionRef.current = Math.round((Date.now() - inicioRef.current) / 1000);
    if (relojRef.current) clearTimeout(relojRef.current);
    setParcial("");
    setEscuchando(false);
    estabilizarEmision();
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
  }, [estabilizarEmision, detenerGrabacion, ejecutarTranscripcionAutoritativa]);

  useEffect(() => {
    return () => {
      activoRef.current = false;
      if (relojRef.current) clearTimeout(relojRef.current);
      if (rearmeRef.current) clearTimeout(rearmeRef.current);
      try { recRef.current?.abort?.(); } catch {}
      try { grabRef.current?.stop(); } catch {}
      try { flujoRef.current?.getTracks?.().forEach((pista: any) => pista.stop()); } catch {}
    };
  }, []);

  const guardar = useCallback(async () => {
    setError("");
    setResultado("");
    const texto = segmentosRef.current.map((s) => s.texto).join("\n\n") || pendienteRef.current;
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
        const parte1 = ordenadas.find((p) => p.parte === 1) || ordenadas[0];
        audioUrl = parte1 ? parte1.url : null;
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
        estadoTranscripcion: estadoTranscripcionRef.current || null,
      };

      let rv: Response;
      let dv: any = {};
      try {
        rv = await fetch("/api/dictado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(60000),
        });

        const textoRespuesta = await rv.text();
        try {
          dv = JSON.parse(textoRespuesta);
        } catch {
          dv = { detail: "Respuesta no-JSON de dictado: " + textoRespuesta.slice(0, 200) };
        }

        if (!rv.ok) {
          setError(String(dv?.detail || "Error desconocido") + " " + String(dv?.causa ?? ""));
        } else {
          if (dv?.titulo && !titulo) {
            setTitulo(dv.titulo);
          }
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

  // Botón "Generar título con IA"
  const handleGenerarTitulo = async () => {
    const texto = segmentosRef.current.map((s) => s.texto).join("\n\n") || pendienteRef.current;
    if (!texto.trim()) {
      setError("No hay texto suficiente para generar un título.");
      return;
    }
    setGenerandoTitulo(true);
    setError("");
    try {
      const res = await fetch("/api/dictado-archivo/titulo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      const tituloObtenido = data.title ?? data.titulo;
      if (res.ok && tituloObtenido) {
        setTitulo(tituloObtenido);
      } else {
        setError(data.detail || "No se pudo generar un título con IA.");
      }
    } catch (err) {
      setError("Error al solicitar generación de título: " + String(err));
    } finally {
      setGenerandoTitulo(false);
    }
  };

  // Botón "Re-transcribir audio" (D13)
  const handleRetranscribirAudio = async () => {
    if (!sesionIdRef.current) {
      setError("No hay una sesión de audio activa para re-transcribir.");
      return;
    }
    setRetranscribiendo(true);
    setError("");
    setAviso("");
    try {
      const textoPreview = segmentosRef.current.map((s) => s.texto).join("\n\n") || pendienteRef.current;
      const res = await fetch("/api/transcribir/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sesionIdRef.current,
          previewText: textoPreview,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.exito && typeof data?.textoFinal === "string") {
        const resultadoReconciliacion = reconciliarSegmentos(segmentosRef.current, data.textoFinal);
        segmentosRef.current = resultadoReconciliacion.segmentos;
        setSegmentos(resultadoReconciliacion.segmentos);

        if (data?.estadoTranscripcion) {
          estadoTranscripcionRef.current = data.estadoTranscripcion;
          setEstadoTranscripcionUI(data.estadoTranscripcion);
        }

        setReconciliacionMensaje(
          data.motivoReconciliacion || resultadoReconciliacion.motivo || "Re-transcripción completada con éxito."
        );
      } else {
        setError(data.detail || "Fallo la re-transcripción del audio.");
      }
    } catch (err) {
      setError("Error al solicitar re-transcripción: " + String(err));
    } finally {
      setRetranscribiendo(false);
    }
  };

  // Botón "Adjuntar audio" (D14)
  const handleAdjuntarAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAdjuntandoAudio(true);
    setError("");
    setAviso("");

    const forma = new FormData();
    forma.append("audio", file);
    const textoPreview = segmentosRef.current.map((s) => s.texto).join("\n\n") || pendienteRef.current;
    forma.append("previewText", textoPreview);
    if (!sesionIdRef.current) {
      sesionIdRef.current = generarSesionId();
    }
    forma.append("sessionId", sesionIdRef.current);

    try {
      const res = await fetch("/api/transcribir/archivo", { method: "POST", body: forma });
      const data = await res.json();

      if (data?.sessionId) {
        sesionIdRef.current = data.sessionId;
      }

      if (data?.audioUrl) {
        partesSubidasRef.current = [
          {
            parte: 1,
            url: data.audioUrl,
            bytes: data.audioBytes || file.size,
          },
        ];
        setPartesContador(1);
        setBytesAcumulados(data.audioBytes || file.size);
        setConAudio(true);
      }

      if (data?.estadoTranscripcion) {
        estadoTranscripcionRef.current = data.estadoTranscripcion;
        setEstadoTranscripcionUI(data.estadoTranscripcion);
      }

      if (res.ok && data?.exito && typeof data?.textoFinal === "string") {
        const resultadoReconciliacion = reconciliarSegmentos(segmentosRef.current, data.textoFinal);
        segmentosRef.current = resultadoReconciliacion.segmentos;
        setSegmentos(resultadoReconciliacion.segmentos);
        setReconciliacionMensaje(
          data.motivoReconciliacion || resultadoReconciliacion.motivo || "Audio adjuntado y transcrito exitosamente."
        );
      } else {
        setAviso(data.detail || "Audio adjuntado, pero se requiere re-transcribir.");
      }
    } catch (err) {
      setError("Error al adjuntar archivo de audio: " + String(err));
    } finally {
      setAdjuntandoAudio(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const limpiar = useCallback(() => {
    segmentosRef.current = [];
    setSegmentos([]);
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
    setEstadoTranscripcionUI(null);

    sesionIdRef.current = "";
    parteConsecutivaRef.current = 1;
    partesSubidasRef.current = [];
    partesRawRef.current = [];
    parteTrozosRef.current = [];
    subidaEnCursoRef.current = null;
    estadoTranscripcionRef.current = null;
    setPartesContador(0);
    setBytesAcumulados(0);
  }, []);

  const totalChars = (segmentos.map((s) => s.texto).join("\n\n") || pendiente).length;

  const handleEditarSegmento = (idx: number, nuevoTexto: string) => {
    const copia = [...segmentosRef.current];
    if (copia[idx]) {
      copia[idx] = {
        ...copia[idx],
        texto: nuevoTexto,
        estado: "editado_manual",
        modificadoManualmente: true,
      };
      segmentosRef.current = copia;
      setSegmentos(copia);
      setEstadoReconciliacion("editado_manual");
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
          <Icons.Mic size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
          Dictado Clean Verbatim Semántico
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--khora-accent)" }}>
          Arquitectura desacoplada: Previsualización ASR en vivo + Transcripción autoritativa Groq Whisper + Protección Segmentaria de Edición Manual.
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
        <div className="flex gap-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="titulo opcional"
            className="flex-1 p-2.5 border rounded-none text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          />
          <button
            onClick={handleGenerarTitulo}
            disabled={generandoTitulo || estado !== "inactivo"}
            className="px-3 py-2 border rounded-none text-xs font-semibold cursor-pointer disabled:opacity-40 flex items-center gap-1 hover:opacity-90 transition-opacity shrink-0"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.Sparkles size={16} strokeWidth={1.75} />
            {generandoTitulo ? "Generando..." : "Generar título con IA"}
          </button>
        </div>

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
            onClick={handleRetranscribirAudio}
            disabled={retranscribiendo || !sesionIdRef.current || estado !== "inactivo"}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.RefreshCw size={20} strokeWidth={1.75} />
            {retranscribiendo ? "Re-transcribiendo..." : "Re-transcribir audio"}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAdjuntarAudio}
            accept="audio/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={adjuntandoAudio || estado !== "inactivo"}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.Paperclip size={20} strokeWidth={1.75} />
            {adjuntandoAudio ? "Adjuntando..." : "Adjuntar audio"}
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
          {estadoReconciliacion === "editado_manual"
            ? "✏️ Segmento editado manualmente por operador (Protegido)"
            : estadoReconciliacion === "reconciliado_whisper"
            ? "🟢 Autoritativo: Groq Whisper"
            : estadoReconciliacion === "procesando_whisper"
            ? "🟡 Procesando Groq Whisper..."
            : estadoReconciliacion === "fallback_preview"
            ? "🟠 Previsualización ASR (Groq indisponible)"
            : "🔵 Previsualización ASR en vivo"}
        </span>

        {estadoTranscripcionUI && (
          <span className="px-2 py-0.5 border font-semibold" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
            {estadoTranscripcionUI === "completo"
              ? "🟢 Transcripción completa"
              : estadoTranscripcionUI === "parcial"
              ? "🟡 Transcripción parcial"
              : "🔴 Transcripción fallida"}
          </span>
        )}

        <span className="px-2 py-0.5 border font-semibold" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          Bloques pulidos: {pulidosOk} / Sin pulir: {pulidosNo}
        </span>
      </div>

      {/* Area de Transcripción por Segmentos Structurados */}
      <div
        className="p-4 min-h-[240px] whitespace-pre-wrap leading-relaxed border rounded-none text-sm relative space-y-3"
        style={{
          backgroundColor: "var(--khora-surface)",
          borderColor: "var(--khora-border)",
          color: "var(--khora-ink)",
        }}
      >
        {segmentos.length === 0 && pendiente.length === 0 && parcial.length === 0 && (
          <span className="opacity-40 italic">Pulsa "Iniciar dictado" o "Adjuntar audio" y comienza...</span>
        )}

        {segmentos.map((seg, i) => (
          <div key={seg.id || i} className="relative group">
            <textarea
              value={seg.texto}
              onChange={(e) => handleEditarSegmento(i, e.target.value)}
              rows={Math.max(1, Math.ceil(seg.texto.length / 80))}
              className="w-full p-2 bg-transparent border-b border-transparent group-hover:border-[var(--khora-border)] focus:border-[var(--khora-accent)] focus-visible:outline-none resize-none font-sans text-sm"
            />
            {seg.estado === "editado_manual" && (
              <span className="absolute right-1 top-1 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1 border border-amber-500/30">
                [editado manual - protegido]
              </span>
            )}
          </div>
        ))}

        {pendiente.length > 0 && segmentos.length === 0 && (
          <p className="opacity-90">{pendiente}</p>
        )}

        {parcial.length > 0 && (
          <span className="opacity-60 italic bg-amber-500/10 px-1 border-b border-dashed border-amber-500">
            [provisional]: {parcial}
          </span>
        )}
      </div>

      {/* Estadísticas */}
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
