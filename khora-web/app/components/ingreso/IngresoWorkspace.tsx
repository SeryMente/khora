// @l0 L0-002-R · @req UI-04/INGRESO-INTEGRADO
"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ensamblarParrafos, Fragmento } from "../../../lib/transcripcion/ensamblar";
import { reconciliarSegmentos, type SegmentoReconciliado } from "../../../lib/transcripcion/reconciliar";
import { IngresoView } from "../shared/IngresoView";
import { transcribeStoredSession } from "../../../lib/client/authoritative-transcription";
import { importAndTranscribeAudio } from "../../../lib/client/import-audio-file";
import { cerrarEdicionInSitu } from "../../../lib/client/edicion-in-situ";
import { registerKhoraLockCheckpoint, reportKhoraActivity } from "../AutoLockProvider";
import { IngresoModeNav, type IngresoWorkspaceMode } from "./IngresoModeNav";
import { IngresoRevisionPanel } from "./IngresoRevisionPanel";
import { IngresoIngestaPanel } from "./IngresoIngestaPanel";

type Estado = "inactivo" | "dictando";

function generarSesionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    throw new Error("Generador de enteros aleatorios criptográficamente seguro no disponible.");
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // UUID v4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function IngresoWorkspace() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", color: "var(--khora-accent)" }}>Cargando…</p>}>
      <IngresoContenido />
    </Suspense>
  );
}

function IngresoContenido() {
  const searchParams = useSearchParams();
  const modoParam = searchParams?.get("modo");
  const modoWorkspace: IngresoWorkspaceMode = modoParam === "dictado" || modoParam === "captura" || modoParam === "archivo" || modoParam === "revision" || modoParam === "ingesta" ? modoParam : "nuevo";
  const volcadoId = searchParams?.get("volcado_id") ?? null;
  const versionParam = Number(searchParams?.get("version"));
  const version = Number.isInteger(versionParam) && versionParam >= 1 ? versionParam : null;

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
  const [exportandoAudio, setExportandoAudio] = useState(false);
  const [resultado, setResultado] = useState("");
  const [soportado, setSoportado] = useState(true);
  const [conAudio, setConAudio] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [reconexiones, setReconexiones] = useState(0);
  const [modoEntrada, setModoEntrada] = useState<"ninguno" | "microfono" | "chrome_live_caption">("ninguno");
  const [chromeBridgeEstado, setChromeBridgeEstado] = useState("desconectado");
  const [chromeCaptionActivo, setChromeCaptionActivo] = useState(false);
  const [chromeCapturaEstado, setChromeCapturaEstado] = useState("inactiva");

  const [reconciliacionMensaje, setReconciliacionMensaje] = useState("");

  const [texto, setTexto] = useState("");
  const [editando, setEditando] = useState(false);
  const [estabaDictando, setEstabaDictando] = useState(false);

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
  const textoAntesEdicionRef = useRef("");
  const estabaDictandoRef = useRef(false);
  const cerrandoEdicionRef = useRef(false);

  const sesionIdRef = useRef<string>("");
  const modoEntradaRef = useRef<"ninguno" | "microfono" | "chrome_live_caption">("ninguno");
  const fuenteEntradaSesionRef = useRef<"texto" | "microfono" | "chrome_live_caption" | "audio_archivo" | null>(null);
  const parteConsecutivaRef = useRef<number>(1);
  const partesSubidasRef = useRef<{ parte: number; url: string; bytes: number; fuenteAudio?: "microphone" | "chrome_tab"; start_ms?: number; end_ms?: number; duracion_ms?: number; sha256?: string; verificado?: boolean }[]>([]);
  const parteTrozosRef = useRef<Blob[]>([]);
  const parteInicioRef = useRef<number>(0);
  const subidaEnCursoRef = useRef<Promise<void> | null>(null);
  const finalizacionAudioRef = useRef<Promise<void> | null>(null);
  const resolverFinalizacionAudioRef = useRef<(() => void) | null>(null);
  const chromeStopResolverRef = useRef<(() => void) | null>(null);
  const runtimeIdRef = useRef<string>("");
  const runtimeSnapshotRef = useRef<Record<string, unknown>>({});
  const checkpointEnCursoRef = useRef<Promise<void> | null>(null);
  const ultimoCheckpointTextoRef = useRef("");
  const partesRawRef = useRef<{ parte: number; blob: Blob }[]>([]);
  const estadoTranscripcionRef = useRef<string | null>(null);

  useEffect(() => {
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) setSoportado(false);
  }, []);

  useEffect(() => {
    let activo = true;
    void fetch("/api/dictado/checkpoint", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const recovery = data?.recovery;
        if (!activo || !recovery?.sessionId || typeof recovery?.texto !== "string" || !recovery.texto.trim()) return;
        sesionIdRef.current = String(recovery.sessionId);
        ultimoCheckpointTextoRef.current = recovery.texto;
        const segmento: SegmentoReconciliado = { id: "recovery-" + recovery.sessionId, texto: recovery.texto, estado: "pendiente_error" };
        segmentosRef.current = [segmento];
        setSegmentos([segmento]);
        pendienteRef.current = recovery.texto;
        setPendiente("");
        setTexto(recovery.texto);
        setAviso("Se recuperó automáticamente un dictado pendiente protegido antes del cierre anterior.");
        setReconciliacionMensaje("Checkpoint recuperado e incorporado al mismo espacio de Ingreso.");
      })
      .catch(() => undefined);
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem("khora-runtime-id");
      if (stored) {
        runtimeIdRef.current = stored;
        return;
      }
    } catch {}
    runtimeIdRef.current = generarSesionId();
    try {
      window.sessionStorage.setItem("khora-runtime-id", runtimeIdRef.current);
    } catch {}
  }, []);

  useEffect(() => {
    runtimeSnapshotRef.current = {
      operation_state: estado,
      input_mode: modoEntrada,
      listening: escuchando,
      speech_recognition_supported: soportado,
      chrome_bridge: chromeBridgeEstado,
      caption_active: chromeCaptionActivo,
      capture_status: chromeCapturaEstado,
      editing: editando,
      audio_present: conAudio,
      audio_parts: partesContador,
      audio_bytes: bytesAcumulados,
      reconnects: reconexiones,
      segment_count: segmentos.length,
      interim_present: parcial.trim().length > 0,
      error_present: error.trim().length > 0,
      notice_present: aviso.trim().length > 0,
      saving: guardando,
      title_generation: generandoTitulo,
      authoritative_transcription: retranscribiendo,
      audio_attachment: adjuntandoAudio,
    };
  }, [
    estado,
    modoEntrada,
    escuchando,
    soportado,
    chromeBridgeEstado,
    chromeCaptionActivo,
    chromeCapturaEstado,
    editando,
    conAudio,
    partesContador,
    bytesAcumulados,
    reconexiones,
    segmentos.length,
    parcial,
    error,
    aviso,
    guardando,
    generandoTitulo,
    retranscribiendo,
    adjuntandoAudio,
  ]);

  useEffect(() => {
    const publicar = (activeOverride?: boolean) => {
      if (!runtimeIdRef.current) runtimeIdRef.current = generarSesionId();
      const visible = document.visibilityState === "visible";
      const focused = document.hasFocus();
      const payload = {
        schema_version: "1.0",
        runtime_id: runtimeIdRef.current,
        session_id: sesionIdRef.current || null,
        observed_at: new Date().toISOString(),
        route: "/sistema/ingreso",
        screen: "ingreso",
        active: activeOverride ?? true,
        visible,
        focused,
        source: "khora-ui",
        privacy_class: "ANONYMIZED_RUNTIME_STATE",
        state: {
          ...runtimeSnapshotRef.current,
          lifecycle: activeOverride === false ? "pagehide" : "present",
        },
      };

      fetch("/api/observaciones/runtime-state", {
        method: "POST",
        credentials: "include",
        keepalive: activeOverride === false,
        headers: {
          "Content-Type": "application/json",
          "X-Khora-Runtime-Source": "khora-ui",
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    };

    const timer = window.setInterval(() => publicar(), 3000);
    const onVisibilityChange = () => publicar();
    const onFocus = () => publicar();
    const onBlur = () => publicar();
    const onPageHide = () => publicar(false);

    publicar();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    if (!editando) {
      const parts = segmentos.map((s) => s.texto).filter((s) => s.trim().length > 0);
      let unified = parts.join("\n\n");
      if (!unified && pendiente) {
        unified = pendiente;
      }
      if (parcial) {
        unified += (unified ? " " : "") + parcial;
      }
      setTexto(unified);
    }
  }, [segmentos, pendiente, parcial, editando]);

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

  const guardarCheckpoint = useCallback(async (forzar = false) => {
    const sessionId = sesionIdRef.current;
    const textoCheckpoint = segmentosRef.current.map((s) => s.texto).join("\n\n") || pendienteRef.current;
    if (!sessionId || !textoCheckpoint.trim()) return;
    if (!forzar && textoCheckpoint === ultimoCheckpointTextoRef.current) return;
    const anterior = checkpointEnCursoRef.current || Promise.resolve();
    const tarea = anterior.then(async () => {
      try {
        const response = await fetch("/api/dictado/checkpoint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, texto: textoCheckpoint }),
          keepalive: true,
        });
        if (response.ok) ultimoCheckpointTextoRef.current = textoCheckpoint;
      } catch (cause) {
        setAviso("checkpoint de seguridad pendiente: " + String(cause));
      }
    });
    checkpointEnCursoRef.current = tarea;
    await tarea;
  }, []);

  const ejecutarTranscripcionAutoritativa = useCallback(async () => {
    if (!sesionIdRef.current || partesSubidasRef.current.length === 0) {
      estadoTranscripcionRef.current = partesRawRef.current.length > 0 ? "fallido" : null;
      if (trozosRef.current.length > 0) {
        setReconciliacionMensaje(
          "No se enviará el audio completo al servidor: ninguna parte quedó almacenada y vinculada a la sesión.",
        );
      }
      return;
    }
    const textoPreview = texto || segmentosRef.current.map((s) => s.texto).join("\n\n");

    try {
      const { ok, data } = await transcribeStoredSession(
        sesionIdRef.current,
        textoPreview,
      );

      if (ok && data?.exito && typeof data?.textoFinal === "string") {
        if (data?.estadoTranscripcion) estadoTranscripcionRef.current = String(data.estadoTranscripcion);
        const resultadoReconciliacion = reconciliarSegmentos(segmentosRef.current, data.textoFinal);
        segmentosRef.current = resultadoReconciliacion.segmentos;
        setSegmentos(resultadoReconciliacion.segmentos);
        setPendiente("");
        pendienteRef.current = "";

        setReconciliacionMensaje(
          data.motivoReconciliacion || resultadoReconciliacion.motivo || "Transcripción autoritativa Groq Whisper procesada con éxito."
        );
      } else {
        estadoTranscripcionRef.current = "fallido";
        setReconciliacionMensaje(`Groq Whisper no disponible: ${data?.detail || "Conservando previsualización ASR en vivo."}`);
      }
    } catch (e) {
      estadoTranscripcionRef.current = "fallido";
      setReconciliacionMensaje(`Fallo al solicitar transcripción autoritativa: ${String(e)}.`);
    }
  }, [texto]);

  const subirParteActual = useCallback(async () => {
    if (parteTrozosRef.current.length === 0) return;

    const trozosParaSubir = [...parteTrozosRef.current];
    parteTrozosRef.current = [];

    const parteActual = parteConsecutivaRef.current;
    parteConsecutivaRef.current += 1;

    const blob = new Blob(trozosParaSubir, { type: "audio/webm" });
    partesRawRef.current.push({ parte: parteActual, blob });

    const ahoraMs = Date.now();
    const referenciaInicio = inicioRef.current || ahoraMs;
    const startMs = Math.max(0, parteInicioRef.current - referenciaInicio);
    const endMs = Math.max(startMs, ahoraMs - referenciaInicio);
    parteInicioRef.current = ahoraMs;

    const fuenteAudio = modoEntradaRef.current === "chrome_live_caption" ? "chrome_tab" : "microphone";
    const sesionId = sesionIdRef.current;

    const forma = new FormData();
    forma.append("audio", blob, fuenteAudio + "-parte-" + parteActual + ".webm");
    forma.append("sesionId", sesionId);
    forma.append("parte", String(parteActual));
    forma.append("fuenteAudio", fuenteAudio);
    forma.append("startMs", String(startMs));
    forma.append("endMs", String(endMs));
    forma.append("duracionMs", String(Math.max(0, endMs - startMs)));

    const ejecutarSubida = async () => {
      try {
        const ra = await fetch("/api/audio", { method: "POST", body: forma });        const textoRespuesta = await ra.text();
        let da: any = {};
        try {
          da = JSON.parse(textoRespuesta);
        } catch {
          da = { detail: "Respuesta no-JSON de la API de audio: " + textoRespuesta.slice(0, 100) };
        }

        if (ra.ok && typeof da?.url === "string" && da?.verificado === true && typeof da?.sha256 === "string") {
          const bytesSubidos = typeof da?.bytes === "number" ? da.bytes : blob.size;
          partesSubidasRef.current.push({
            parte: parteActual,
            url: da.url,
            bytes: bytesSubidos,
            sha256: da.sha256,
            verificado: true,
            fuenteAudio: fuenteAudio as "microphone" | "chrome_tab",
            start_ms: startMs,
            end_ms: endMs,
            duracion_ms: Math.max(0, endMs - startMs),
          });
          setPartesContador(partesSubidasRef.current.length);
          setBytesAcumulados((total) => total + bytesSubidos);
          setConAudio(true);
        } else {
          setAviso("audio parte " + parteActual + " no guardada: " + String(da?.detail || ""));
        }
      } catch (e) {
        setAviso("audio parte " + parteActual + " no guardada por error: " + String(e));
      }
    };

    const anteriorSubida = subidaEnCursoRef.current || Promise.resolve();
    const nuevaSubida = anteriorSubida.then(ejecutarSubida);
    subidaEnCursoRef.current = nuevaSubida;
    await nuevaSubida;
  }, []);

  const enviarChromeCommand = useCallback((command: "arm" | "stop" | "status", partStartIndex?: number) => {
    if (typeof window === "undefined") return;
    window.postMessage({
      channel: "khora-live-caption-v1",
      direction: "page-to-extension",
      command,
      sessionId: sesionIdRef.current || null,
      partStartIndex: Math.max(1, Number(partStartIndex || 1)),
    }, "*");
  }, []);

  useEffect(() => {
    const recibirEventoChrome = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.channel !== "khora-live-caption-v1" || data.direction !== "extension-to-page") return;

      if (data.event === "bridge.status") {
        setChromeBridgeEstado(data.status === "connected" ? "conectado" : String(data.status || "desconectado"));
        return;
      }

      if (data.event === "state") {
        setChromeBridgeEstado(String(data.status || "desconectado"));
        setChromeCaptionActivo(Boolean(data.captionActive));
        setChromeCapturaEstado(String(data.captureStatus || "inactiva"));
        return;
      }

      if (data.event === "capture.status") {
        setChromeCapturaEstado(String(data.status || "inactiva"));
        if (data.status === "recording") {
          inicioRef.current = Date.now();
          parteInicioRef.current = inicioRef.current;
          setConAudio(false);
          setAviso("Captura de audio de Chrome activa. Puedes volver a Khora; Live Caption seguirá entrando.");
        }
        if (data.status === "stopped" || data.status === "error") {
          void (async () => {
            if (parteTrozosRef.current.length > 0) await subirParteActual();
            chromeStopResolverRef.current?.();
            chromeStopResolverRef.current = null;
          })();
        }
        return;
      }

      if (data.event === "caption.status") {
        setChromeCaptionActivo(data.status === "found");
        return;
      }

      if (data.event === "caption.segment" && typeof data.text === "string") {
        const text = data.text.trim();
        if (!text || modoEntradaRef.current !== "chrome_live_caption") return;

        const current = segmentosRef.current;
        const previous = current[current.length - 1];
        let next: SegmentoReconciliado[];
        if (
          previous &&
          previous.estado === "provisional_asr" &&
          previous.origen === "chrome_live_caption" &&
          !previous.modificadoManualmente
        ) {
          next = [
            ...current.slice(0, -1),
            { ...previous, texto: (previous.texto + " " + text).trim() },
          ];
        } else {
          next = [
            ...current,
            {
              id: "chrome-" + String(data.sequence || Date.now()) + "-" + Date.now(),
              texto: text,
              estado: "provisional_asr",
              origen: "chrome_live_caption",
            },
          ];
        }
        segmentosRef.current = next;
        setSegmentos(next);
        setReconciliacionMensaje("Entrada Chrome Live Caption recibida mediante el bridge local.");
        return;
      }

      if (data.event === "audio.part" && data.sessionId === sesionIdRef.current) {
        const part = Number(data.part);
        const bytes = Number(data.bytes || 0);
        if (!Number.isInteger(part) || part < 1 || !data.url) return;

        if (!partesSubidasRef.current.some((item) =>
          item.parte === part && item.fuenteAudio === "chrome_tab"
        )) {
          partesSubidasRef.current.push({
            parte: part,
            url: String(data.url),
            bytes,
            sha256: typeof data.sha256 === "string" ? data.sha256 : undefined,
            verificado: data.verificado === true,
            fuenteAudio: "chrome_tab",
            start_ms: Number(data.startMs || 0),
            end_ms: Number(data.endMs || 0),
            duracion_ms: Number(data.duracionMs || 0),
          });
          partesSubidasRef.current.sort((a, b) => a.parte - b.parte);
          setPartesContador(partesSubidasRef.current.length);
          setBytesAcumulados((total) => total + bytes);
          setConAudio(true);
        }
        return;
      }
    };

    window.addEventListener("message", recibirEventoChrome);
    enviarChromeCommand("status");
    return () => window.removeEventListener("message", recibirEventoChrome);
  }, [enviarChromeCommand, subirParteActual]);

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

          if (totalSize >= 2 * 1024 * 1024 || elapsed >= 120 * 1000) {
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

      finalizacionAudioRef.current = new Promise<void>((resolve) => {
        resolverFinalizacionAudioRef.current = resolve;
      });
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
          reportKhoraActivity();
          void guardarCheckpoint();

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

  const prepararChrome = useCallback(() => {
    setError("");
    setAviso("");
    setResultado("");
    setReconexiones(0);
    if (!sesionIdRef.current) sesionIdRef.current = generarSesionId();

    modoEntradaRef.current = "chrome_live_caption";
    fuenteEntradaSesionRef.current = "chrome_live_caption";
    setModoEntrada("chrome_live_caption");
    activoRef.current = true;
    setEstado("dictando");
    setEditando(false);
    setEstabaDictando(false);

    const siguienteParte = partesSubidasRef.current.reduce(
      (max, item) => Math.max(max, Number(item.parte) || 0),
      0,
    ) + 1;
    parteConsecutivaRef.current = siguienteParte;
    parteTrozosRef.current = [];
    subidaEnCursoRef.current = null;
    inicioRef.current = 0;
    parteInicioRef.current = 0;

    enviarChromeCommand("arm", siguienteParte);
    setAviso("Sesión preparada. Cambia a la pestaña de Chrome que reproduce el audio y pulsa el icono de Aisthesis para iniciar su captura.");
  }, [enviarChromeCommand]);

  const iniciar = useCallback(async () => {
    setError("");
    setAviso("");
    setResultado("");
    setReconexiones(0);
    abortosRef.current = 0;
    audioPermitidoRef.current = true;
    trozosRef.current = [];

    sesionIdRef.current = generarSesionId();
    modoEntradaRef.current = "microfono";
    fuenteEntradaSesionRef.current = "microfono";
    setModoEntrada("microfono");
    parteConsecutivaRef.current = 1;
    partesSubidasRef.current = [];
    partesRawRef.current = [];
    parteTrozosRef.current = [];
    parteInicioRef.current = Date.now();
    ultimoCheckpointTextoRef.current = "";
    checkpointEnCursoRef.current = null;
    estadoTranscripcionRef.current = null;
    subidaEnCursoRef.current = null;
    finalizacionAudioRef.current = null;
    resolverFinalizacionAudioRef.current = null;
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

  const detener = useCallback(async () => {
    if (modoEntradaRef.current === "chrome_live_caption") {
      activoRef.current = false;
      setEstado("inactivo");
      const esperaParo = new Promise<void>((resolve) => {
        chromeStopResolverRef.current = resolve;
        window.setTimeout(() => {
          chromeStopResolverRef.current = null;
          resolve();
        }, 5000);
      });
      enviarChromeCommand("stop");
      await esperaParo;
      if (inicioRef.current > 0) {
        duracionRef.current = Math.round((Date.now() - inicioRef.current) / 1000);
      }
      if (parteTrozosRef.current.length > 0) await subirParteActual();
      modoEntradaRef.current = "ninguno";
      setModoEntrada("ninguno");
      setChromeCapturaEstado("inactiva");
      return;
    }

    modoEntradaRef.current = "microfono";
    setModoEntrada("microfono");
    activoRef.current = false;
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
      subidaEnCursoRef.current = null;      setEstado("inactivo");
    }
  }, [estabilizarEmision, detenerGrabacion, ejecutarTranscripcionAutoritativa, enviarChromeCommand, subirParteActual]);

  const pausarParaEdicionInSitu = useCallback(() => {
    activoRef.current = false;
    if (rearmeRef.current) clearTimeout(rearmeRef.current);
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    detenerGrabacion();
    if (relojRef.current) clearTimeout(relojRef.current);
    setParcial("");
    setEscuchando(false);
    estabilizarEmision();
    setEstado("inactivo");
  }, [detenerGrabacion, estabilizarEmision]);

  const reanudarTrasEdicionInSitu = useCallback(async () => {
    if (finalizacionAudioRef.current) await finalizacionAudioRef.current;
    if (subidaEnCursoRef.current) await subidaEnCursoRef.current;
    finalizacionAudioRef.current = null;
    subidaEnCursoRef.current = null;

    activoRef.current = true;
    const arrancado = arrancarReconocedor();
    if (!arrancado) {
      activoRef.current = false;
      setEstado("inactivo");
      return;
    }

    setEstado("dictando");
    setTimeout(() => { void arrancarGrabacion(); }, 900);
  }, [arrancarGrabacion, arrancarReconocedor]);

  useEffect(() => {
    const unregister = registerKhoraLockCheckpoint(async () => {
      if (!sesionIdRef.current) return;
      const estabaActivo = activoRef.current || estado === "dictando";
      if (estabaActivo) {
        activoRef.current = false;
        if (rearmeRef.current) clearTimeout(rearmeRef.current);
        try { recRef.current?.stop(); } catch {}
        recRef.current = null;
        detenerGrabacion();
        if (relojRef.current) clearTimeout(relojRef.current);
        setParcial("");
        setEscuchando(false);
        estabilizarEmision();
        if (finalizacionAudioRef.current) await finalizacionAudioRef.current;
        if (subidaEnCursoRef.current) await subidaEnCursoRef.current;
      }
      await guardarCheckpoint(true);
      setAviso("Dictado protegido por autobloqueo.");
      if (estabaActivo) setEstado("inactivo");
    });
    return () => { unregister(); };
  }, [estado, detenerGrabacion, estabilizarEmision, guardarCheckpoint]);

  const guardar = useCallback(async () => {
    setError("");
    setResultado("");
    const archivoOriginalVerificado =
      fuenteEntradaSesionRef.current === "audio_archivo" &&
      partesSubidasRef.current.length === 1 &&
      partesSubidasRef.current[0].verificado === true &&
      Number(partesSubidasRef.current[0].bytes) > 0 &&
      /^[0-9a-f]{64}$/i.test(String(partesSubidasRef.current[0].sha256 ?? ""));
    if (texto.trim().length === 0 && !archivoOriginalVerificado) {
      setError("No hay transcripción para archivar. Puedes custodiar el audio original si su almacenamiento y SHA-256 ya están verificados.");
      return;
    }
    setGuardando(true);
    try {
      if (subidaEnCursoRef.current) {
        await subidaEnCursoRef.current;
      }

      let audioUrl: string | null = null;
      let audioBytes: number | null = null;
      const partes = partesSubidasRef.current;
      const fuenteEntrada = fuenteEntradaSesionRef.current;
      const audioEsperado = fuenteEntrada === "microfono" || fuenteEntrada === "chrome_live_caption" || fuenteEntrada === "audio_archivo";
      const audioImportado = fuenteEntrada === "audio_archivo";
      const partesGeneradas = partesRawRef.current.length;
      const indicesSubidos = new Set(partes.map((p) => p.parte));
      const todasLasPartesVerificadas = partes.length > 0 &&
        partes.every((p) => p.verificado === true &&
          Number(p.bytes) > 0 &&
          /^[0-9a-f]{64}$/i.test(String(p.sha256 ?? "")));
      const indicesContiguos = [...partes]
        .sort((a, b) => a.parte - b.parte)
        .every((p, i) => p.parte === i + 1);
      const audioIntegro = audioImportado
        ? partes.length === 1 && partes[0].parte === 1 && todasLasPartesVerificadas
        : fuenteEntrada === "microfono" && partesGeneradas > 0
          ? partes.length === partesGeneradas &&
            [...Array(partesGeneradas)].every((_, i) => indicesSubidos.has(i + 1)) &&
            todasLasPartesVerificadas
          : fuenteEntrada === "chrome_live_caption"
            ? todasLasPartesVerificadas && indicesContiguos
            : !audioEsperado;

      if (audioEsperado && !audioIntegro) {
        setError("No se puede archivar el volcado: Khora no ha verificado la custodia íntegra de todas las partes de audio.");
        return;
      }

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
        fuenteEntrada: fuenteEntradaSesionRef.current || "texto",
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
        } catch {
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


  const exportarAudioOriginal = useCallback(async () => {
    const sessionId = sesionIdRef.current;
    const partes = partesSubidasRef.current;
    if (!sessionId || fuenteEntradaSesionRef.current !== "audio_archivo" ||
        partes.length !== 1 || partes[0].verificado !== true ||
        !/^[0-9a-f]{64}$/i.test(String(partes[0].sha256 ?? ""))) {
      setError("El audio original aún no dispone de una custodia verificada para exportarlo.");
      return;
    }
    setExportandoAudio(true);
    setError("");
    try {
      const response = await fetch(`/api/audio/sesion/${encodeURIComponent(sessionId)}/exportar`, { cache: "no-store" });
      if (!response.ok) {
        let detail = `No se pudo exportar el audio original (HTTP ${response.status}).`;
        try {
          const data = await response.json();
          if (typeof data?.detail === "string") detail = data.detail;
        } catch {}
        throw new Error(detail);
      }
      const original = await response.blob();
      const url = URL.createObjectURL(original);
      const link = document.createElement("a");
      link.href = url;
      const disposition = response.headers.get("content-disposition") || "";
      const nameMatch = disposition.match(/filename="?([^";]+)"?/i);
      link.download = nameMatch?.[1] || "audio-original";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    } finally {
      setExportandoAudio(false);
    }
  }, []);

  const handleAdjuntarAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdjuntandoAudio(true);
    setError("");
    setAviso("");
    if (!sesionIdRef.current) sesionIdRef.current = generarSesionId();

    try {
      const result = await importAndTranscribeAudio({
        file,
        sessionId: sesionIdRef.current,
        previewText: texto,
      });
      const data = result.data;
      const localizadorRecuperacion =
        typeof data.audioUrl === "string" ? data.audioUrl :
        typeof data.stagingUrl === "string" && data.recuperable === true ? data.stagingUrl : null;
      if (localizadorRecuperacion) {
        fuenteEntradaSesionRef.current = "audio_archivo";
        partesSubidasRef.current = [{
          parte: 1,
          url: localizadorRecuperacion,
          bytes: data.audioBytes || file.size,
          sha256: data.sha256 || "",
          verificado: data.verificado === true,
        }];
        setPartesContador(1);
        setBytesAcumulados(data.audioBytes || file.size);
        setConAudio(true);
      }
      estadoTranscripcionRef.current =
        typeof data.estadoTranscripcion === "string"
          ? data.estadoTranscripcion
          : result.ok ? "completo" : "fallido";
      if (result.ok && typeof data.textoFinal === "string") {
        const reconciled = reconciliarSegmentos(segmentosRef.current, data.textoFinal);
        segmentosRef.current = reconciled.segmentos;
        setSegmentos(reconciled.segmentos);
        setTexto(data.textoFinal);
        setReconciliacionMensaje(data.motivoReconciliacion || "Audio adjuntado y transcrito exitosamente.");
      } else {
        const localizador = localizadorRecuperacion ? " Localizador recuperable: " + localizadorRecuperacion + "." : "";
        setAviso((data.detail || "Audio original almacenado; la transcripción puede reintentarse.") + localizador + (data.verificado === true ? " El audio original está verificado y puede archivarse aunque falle la transcripción." : " La custodia aún no está verificada; no archives esta captura."));
      }
    } catch (cause) {
      setError(`Error al adjuntar archivo de audio: ${String(cause)}`);
    } finally {
      setAdjuntandoAudio(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const limpiar = useCallback(() => {
    enviarChromeCommand("stop");
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
    fuenteEntradaSesionRef.current = null;
    modoEntradaRef.current = "ninguno";
    setModoEntrada("ninguno");
    setChromeCaptionActivo(false);
    setChromeCapturaEstado("inactiva");
    setTexto("");
    setEditando(false);
    setEstabaDictando(false);
    textoAntesEdicionRef.current = "";
    estabaDictandoRef.current = false;
    cerrandoEdicionRef.current = false;
    setReconciliacionMensaje("");

    sesionIdRef.current = "";
    parteConsecutivaRef.current = 1;
    partesSubidasRef.current = [];
    partesRawRef.current = [];
    parteTrozosRef.current = [];
    subidaEnCursoRef.current = null;
    checkpointEnCursoRef.current = null;
    ultimoCheckpointTextoRef.current = "";
    estadoTranscripcionRef.current = null;
    setPartesContador(0);
    setBytesAcumulados(0);
  }, []);

  const iniciarEdicionInSitu = useCallback(() => {
    if (editando || cerrandoEdicionRef.current) return;
    if (modoEntradaRef.current === "chrome_live_caption" && estado === "dictando") {
      setAviso("Detén la captura Chrome antes de editar el texto.");
      return;
    }
    textoAntesEdicionRef.current = texto;
    const dictadoActivo = estado === "dictando" || activoRef.current;
    estabaDictandoRef.current = dictadoActivo;
    setEstabaDictando(dictadoActivo);
    setEditando(true);
    if (dictadoActivo) pausarParaEdicionInSitu();
  }, [editando, estado, pausarParaEdicionInSitu, texto]);

  const handleTextoChange = useCallback((val: string) => {
    if (!editando) iniciarEdicionInSitu();
    setTexto(val);
  }, [editando, iniciarEdicionInSitu]);

  const aplicarEdicionInSitu = useCallback(() => {
    const parrafos = texto.split("\n\n").filter((p) => p.trim().length > 0);
    const existentes = [...segmentosRef.current];

    const nuevosSegmentos: SegmentoReconciliado[] = parrafos.map((p, idx) => {
      const segExistente = existentes[idx];
      return {
        id: segExistente?.id ?? `seg-${idx + 1}-${Date.now()}`,
        texto: p,
        estado: "editado_manual",
        modificadoManualmente: true,
      };
    });

    segmentosRef.current = nuevosSegmentos;
    setSegmentos(nuevosSegmentos);
  }, [texto]);

  const finalizarEdicionInSitu = useCallback(async (forzarConfirmacion: boolean) => {
    if (cerrandoEdicionRef.current) return;
    cerrandoEdicionRef.current = true;
    const debeReanudar = estabaDictandoRef.current;
    try {
      await cerrarEdicionInSitu({
        textoAntes: textoAntesEdicionRef.current,
        textoActual: texto,
        forzarConfirmacion,
        estabaDictando: debeReanudar,
        confirmar: aplicarEdicionInSitu,
        desactivar: () => undefined,
        reanudar: reanudarTrasEdicionInSitu,
      });
    } finally {
      setEditando(false);
      estabaDictandoRef.current = false;
      setEstabaDictando(false);
      cerrandoEdicionRef.current = false;
    }
  }, [aplicarEdicionInSitu, reanudarTrasEdicionInSitu, texto]);

  const confirmarEdicion = useCallback(() => {
    void finalizarEdicionInSitu(true);
  }, [finalizarEdicionInSitu]);

  useEffect(() => {
    if (!editando) return;
    const manejarTecla = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      event.preventDefault();
      void finalizarEdicionInSitu(false);
    };
    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [editando, finalizarEdicionInSitu]);

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

  if (modoWorkspace === "revision") {
    return (
      <main style={{ width: "100%", maxWidth: 1240, minWidth: 0, margin: "0 auto", padding: 24, boxSizing: "border-box" }}>
        <IngresoModeNav activeMode="revision" />
        <IngresoRevisionPanel />
      </main>
    );
  }

  if (modoWorkspace === "ingesta") {
    return (
      <main style={{ width: "100%", maxWidth: 1240, minWidth: 0, margin: "0 auto", padding: 24, boxSizing: "border-box" }}>
        <IngresoModeNav activeMode="ingesta" />
        <IngresoIngestaPanel volcadoId={volcadoId} version={version} />
      </main>
    );
  }

  return (
    <>
      <div style={{ width: "100%", maxWidth: 1240, minWidth: 0, margin: "0 auto", padding: "16px 24px 0", boxSizing: "border-box" }}>
        <IngresoModeNav activeMode={modoWorkspace} />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.m4a,.mp4,.wav,.webm,.ogg,.flac,audio/*"
        aria-label="Seleccionar archivo de audio"
        onChange={handleAdjuntarAudio}
        className="hidden"
      />
      <IngresoView
      state={{
        titulo,
        texto,
        estado,
        modoEntrada,
        chromeBridgeEstado,
        chromeCaptionActivo,
        chromeCapturaEstado,
        editando,
        soportado,
        escuchando,
        guardando,
        generandoTitulo,
        retranscribiendo,
        adjuntandoAudio,
        exportandoAudio,
        audioExportable: fuenteEntradaSesionRef.current === "audio_archivo" && partesSubidasRef.current.length === 1 && partesSubidasRef.current[0].verificado === true && /^[0-9a-f]{64}$/i.test(String(partesSubidasRef.current[0].sha256 ?? "")),
        conAudio,
        partesContador,
        bytesAcumulados,
        reconexiones,
        pulidosOk,
        pulidosNo,
        reconciliacionMensaje,
        aviso,
        error,
        resultado,
      }}
      actions={{
        onTituloChange: setTitulo,
        onIniciarEdicion: iniciarEdicionInSitu,
        onTextoChange: handleTextoChange,
        onGenerarTitulo: generarTituloConIA,
        onIniciar: iniciar,
        onPrepararChrome: prepararChrome,
        onDetener: detener,
        onGuardar: guardar,
        onAdjuntarClick: () => fileInputRef.current?.click(),
        onExportarAudio: exportarAudioOriginal,
        onLimpiar: limpiar,
        onConfirmarEdicion: confirmarEdicion,
      }}
      />
    </>
  );
}