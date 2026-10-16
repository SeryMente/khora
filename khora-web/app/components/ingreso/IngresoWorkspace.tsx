// @l0 L0-002-R · @req UI-04/INGRESO-INTEGRADO
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IngresoIngestaPanel } from "./IngresoIngestaPanel";
import { ensamblarParrafos, Fragmento } from "../../../lib/transcripcion/ensamblar";
import { reconciliarSegmentos, type SegmentoReconciliado } from "../../../lib/transcripcion/reconciliar";
import { IngresoView } from "../shared/IngresoView";
import { transcribeStoredSession } from "../../../lib/client/authoritative-transcription";
import { importAndTranscribeAudio } from "../../../lib/client/import-audio-file";
import { cerrarEdicionInSitu } from "../../../lib/client/edicion-in-situ";
import { enviarEventosObservabilidadDictado, registrarEventoObservabilidadDictado, type DictadoObservationOptions } from "../../../lib/client/dictado-observability";
import { registerKhoraLockCheckpoint, reportKhoraActivity } from "../AutoLockProvider";


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
  return <Suspense fallback={null}><IngresoSeleccionado /></Suspense>;
}

function IngresoSeleccionado() {
  const params = useSearchParams();
  if (!params || params.get("modo") !== "ingesta") return <IngresoContenido />;
  const volcadoId = params.get("volcado_id");
  const rawVersion = params.get("version");
  const version = rawVersion && /^[1-9][0-9]*$/.test(rawVersion) && Number.isSafeInteger(Number(rawVersion))
    ? Number(rawVersion) : null;
  return <IngresoIngestaPanel key={params.toString()} volcadoId={volcadoId} version={version} />;
}

function IngresoContenido() {

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
  const [archivado, setArchivado] = useState(false);
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
  const partesSubidasRef = useRef<{ parte: number; url: string; bytes: number; fuenteAudio?: "microphone" | "chrome_tab" | "audio_archivo"; nombreOriginal?: string | null; mimeType?: string | null; start_ms?: number; end_ms?: number; duracion_ms?: number; sha256?: string; verificado?: boolean }[]>([]);
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
  const intentoReconocimientoRef = useRef(0);
  const reconexionesRef = useRef(0);
  const ultimoEventoParcialRef = useRef(0);
  const observarDictado = useCallback((eventName: string, options: DictadoObservationOptions = {}) => {
    const sessionId = sesionIdRef.current;
    if (!sessionId) return null;
    return registrarEventoObservabilidadDictado({ sessionId, eventName, ...options });
  }, []);

  useEffect(() => {
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) setSoportado(false);
  }, []);

  useEffect(() => {
    let activo = true;
    void fetch("/api/dictado/checkpoint", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("checkpoint_recovery_http_" + r.status);
        return r.json();
      })
      .then((data) => {
        const recovery = data?.recovery;
        if (!activo) return;
        if (!recovery?.sessionId || typeof recovery?.texto !== "string" || !recovery.texto.trim()) {
          if (!sesionIdRef.current) sesionIdRef.current = generarSesionId();
          const w = window as any;
          observarDictado("WORKSPACE_READY", { outcome: "SUCCESS", metrics: { recognition_supported: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition), state: "idle", source_mode: "microfono" } });
          void enviarEventosObservabilidadDictado();
          return;
        }
        if (activoRef.current) {
          observarDictado("RECUPERACION_OMITIDA_POR_SESION_ACTIVA", { severity: "WARN", outcome: "PARTIAL", reasonCode: "active_session_won_race", metrics: { recovery_found: true, active: true } });
          void enviarEventosObservabilidadDictado();
          return;
        }
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
        observarDictado("CHECKPOINT_RECUPERADO", { outcome: "SUCCESS", metrics: { recovery_found: true, checkpoint_chars: recovery.texto.length, segment_count: 1 } });
        void enviarEventosObservabilidadDictado();
      })
      .catch(() => {
        if (!activo) return;
        if (!sesionIdRef.current) sesionIdRef.current = generarSesionId();
        observarDictado("ERROR_RECUPERACION_CHECKPOINT", { severity: "WARN", outcome: "PARTIAL", reasonCode: "checkpoint_recovery_unavailable" });
        void enviarEventosObservabilidadDictado();
      });
    return () => { activo = false; };
  }, [observarDictado]);

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
      const startedAt = Date.now();
      observarDictado("CHECKPOINT_INICIADO", { outcome: "PENDING", metrics: { forced: forzar, checkpoint_chars: textoCheckpoint.length, segment_count: segmentosRef.current.length } });
      await enviarEventosObservabilidadDictado();
      try {
        const response = await fetch("/api/dictado/checkpoint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, texto: textoCheckpoint }),
          keepalive: true,
        });
        if (response.ok) {
          ultimoCheckpointTextoRef.current = textoCheckpoint;
          observarDictado("CHECKPOINT_PERSISTIDO", { outcome: "SUCCESS", durationMs: Date.now() - startedAt, metrics: { forced: forzar, checkpoint_chars: textoCheckpoint.length, checkpoint_ok: true } });
        } else {
          observarDictado("CHECKPOINT_FALLIDO", { severity: "ERROR", outcome: "FAILURE", reasonCode: "http_" + response.status, durationMs: Date.now() - startedAt, metrics: { forced: forzar, checkpoint_chars: textoCheckpoint.length, http_status: response.status, checkpoint_ok: false } });
        }
      } catch (cause) {
        observarDictado("CHECKPOINT_FALLIDO", { severity: "ERROR", outcome: "FAILURE", reasonCode: "network_error", durationMs: Date.now() - startedAt, metrics: { forced: forzar, checkpoint_chars: textoCheckpoint.length, checkpoint_ok: false } });
        setAviso("checkpoint de seguridad pendiente: " + String(cause));
      } finally {
        await enviarEventosObservabilidadDictado();
      }
    });
    checkpointEnCursoRef.current = tarea;
    await tarea;
  }, [observarDictado]);

  const ejecutarTranscripcionAutoritativa = useCallback(async () => {
    const transcriptionStartedAt = Date.now();
    observarDictado("TRANSCRIPCION_AUTORITATIVA_INICIADA", { outcome: "PENDING", metrics: { part_count: partesSubidasRef.current.length, segment_count: segmentosRef.current.length } });
    void enviarEventosObservabilidadDictado();
    if (!sesionIdRef.current || partesSubidasRef.current.length === 0) {
      estadoTranscripcionRef.current = partesRawRef.current.length > 0 ? "fallido" : null;
      observarDictado("TRANSCRIPCION_AUTORITATIVA_OMITIDA", { outcome: "SKIPPED", reasonCode: !sesionIdRef.current ? "no_session" : "no_verified_parts", metrics: { part_count: partesSubidasRef.current.length, segment_count: segmentosRef.current.length } });
      void enviarEventosObservabilidadDictado();
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
        observarDictado("TRANSCRIPCION_AUTORITATIVA_COMPLETADA", { outcome: "SUCCESS", durationMs: Date.now() - transcriptionStartedAt, metrics: { part_count: partesSubidasRef.current.length, segment_count: resultadoReconciliacion.segmentos.length, response_ok: true } });
        void enviarEventosObservabilidadDictado();
      } else {
        estadoTranscripcionRef.current = "fallido";
        observarDictado("TRANSCRIPCION_AUTORITATIVA_FALLIDA", { severity: "WARN", outcome: "PARTIAL", reasonCode: "provider_declined", durationMs: Date.now() - transcriptionStartedAt, metrics: { part_count: partesSubidasRef.current.length, segment_count: segmentosRef.current.length, response_ok: false } });
        setReconciliacionMensaje(`Groq Whisper no disponible: ${data?.detail || "Conservando previsualización ASR en vivo."}`);
      }
    } catch (e) {
      estadoTranscripcionRef.current = "fallido";
      observarDictado("TRANSCRIPCION_AUTORITATIVA_FALLIDA", { severity: "ERROR", outcome: "FAILURE", reasonCode: "request_failed", durationMs: Date.now() - transcriptionStartedAt, metrics: { part_count: partesSubidasRef.current.length, segment_count: segmentosRef.current.length, response_ok: false } });
      setReconciliacionMensaje(`Fallo al solicitar transcripción autoritativa: ${String(e)}.`);
    } finally {
      await enviarEventosObservabilidadDictado();
    }
  }, [texto, observarDictado]);

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
    const uploadStartedAt = Date.now();
    observarDictado("PARTE_AUDIO_SUBIDA_INICIADA", { outcome: "PENDING", attemptId: "parte-" + parteActual, metrics: { part_index: parteActual, media_part_count: trozosParaSubir.length, media_part_bytes: blob.size, source_mode: modoEntradaRef.current } });

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
          observarDictado("PARTE_AUDIO_PERSISTIDA", { outcome: "SUCCESS", attemptId: "parte-" + parteActual, durationMs: Date.now() - uploadStartedAt, metrics: { part_index: parteActual, media_part_bytes: bytesSubidos, upload_verified: true, part_count: partesSubidasRef.current.length } });
        } else {
          observarDictado("PARTE_AUDIO_FALLIDA", { severity: "ERROR", outcome: "FAILURE", reasonCode: "upload_or_integrity_failed", attemptId: "parte-" + parteActual, durationMs: Date.now() - uploadStartedAt, metrics: { part_index: parteActual, media_part_bytes: blob.size, http_status: ra.status, upload_verified: false } });
          setAviso("audio parte " + parteActual + " no guardada: fallo de almacenamiento o verificación");
        }
      } catch (e) {
        observarDictado("PARTE_AUDIO_FALLIDA", { severity: "ERROR", outcome: "FAILURE", reasonCode: "network_error", attemptId: "parte-" + parteActual, durationMs: Date.now() - uploadStartedAt, metrics: { part_index: parteActual, media_part_bytes: blob.size, upload_verified: false } });
        setAviso("audio parte " + parteActual + " no guardada por error: " + String(e));
      } finally {
        await enviarEventosObservabilidadDictado();
      }
    };

    const anteriorSubida = subidaEnCursoRef.current || Promise.resolve();
    const nuevaSubida = anteriorSubida.then(ejecutarSubida);
    subidaEnCursoRef.current = nuevaSubida;
    await nuevaSubida;
  }, [observarDictado]);

  const enviarChromeCommand = useCallback((command: "arm" | "stop" | "status", partStartIndex?: number) => {
    if (typeof window === "undefined") return;
    observarDictado("COMANDO_CHROME_ENVIADO", { outcome: "PENDING", metrics: { source_mode: "chrome_live_caption", capture_state: command } });
    window.postMessage({
      channel: "khora-live-caption-v1",
      direction: "page-to-extension",
      command,
      sessionId: sesionIdRef.current || null,
      partStartIndex: Math.max(1, Number(partStartIndex || 1)),
    }, "*");
  }, [observarDictado]);

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
            observarDictado(data.status === "error" ? "CAPTURA_CHROME_PARO_FALLIDO" : "CAPTURA_CHROME_DETENIDA", { severity: data.status === "error" ? "ERROR" : "INFO", outcome: data.status === "error" ? "FAILURE" : "SUCCESS", reasonCode: data.status === "error" ? "capture_stop_error" : null, metrics: { source_mode: "chrome_live_caption", capture_state: String(data.status).slice(0, 40), shutdown_acknowledged: true } });
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
  }, [enviarChromeCommand, subirParteActual, observarDictado]);

  const detenerGrabacion = useCallback((reasonCode = "stop_requested") => {
    const recorder = grabRef.current;
    observarDictado("GRABACION_PARO_SOLICITADO", {
      outcome: recorder ? "PENDING" : "SKIPPED",
      reasonCode,
      metrics: { was_recording: Boolean(recorder), pending_chunks: parteTrozosRef.current.length },
    });
    try { recorder?.stop(); } catch {
      observarDictado("GRABACION_PARO_FALLIDO", { severity: "WARN", outcome: "PARTIAL", reasonCode: "recorder_stop_failed" });
    }
    grabRef.current = null;
    try { flujoRef.current?.getTracks?.().forEach((pista: any) => pista.stop()); } catch {}
    flujoRef.current = null;
  }, [observarDictado]);

  const arrancarGrabacion = useCallback(async () => {
    if (!audioPermitidoRef.current || !activoRef.current || grabRef.current) {
      observarDictado("INICIO_GRABACION_OMITIDO", { outcome: "SKIPPED", reasonCode: !audioPermitidoRef.current ? "recording_disabled" : !activoRef.current ? "dictation_inactive" : "recorder_already_exists", metrics: { active: activoRef.current, recorder_ready: Boolean(grabRef.current) } });
      return;
    }
    const recorderStartedAt = Date.now();
    observarDictado("SOLICITUD_MICROFONO", { outcome: "PENDING", metrics: { source_mode: modoEntradaRef.current } });
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      observarDictado("MICROFONO_PERMITIDO", { outcome: "SUCCESS", durationMs: Date.now() - recorderStartedAt, metrics: { permission_granted: true, source_mode: modoEntradaRef.current } });
      if (!activoRef.current || !audioPermitidoRef.current) { try { flujo.getTracks().forEach((pista: any) => pista.stop()); } catch {} return; }
      flujoRef.current = flujo;
      const grabadora = new MediaRecorder(flujo);
      grabadora.onstart = () => observarDictado("GRABACION_INICIADA", { outcome: "SUCCESS", durationMs: Date.now() - recorderStartedAt, metrics: { recorder_state: String(grabadora.state), source_mode: modoEntradaRef.current } });
      grabadora.onerror = () => {
        observarDictado("ERROR_GRABADORA", { severity: "ERROR", outcome: "FAILURE", reasonCode: "media_recorder_error", metrics: { recorder_state: String(grabadora.state), source_mode: modoEntradaRef.current } });
        void enviarEventosObservabilidadDictado();
      };

      grabadora.ondataavailable = (ev: any) => {
        if (ev.data && ev.data.size > 0) {
          trozosRef.current.push(ev.data);
          parteTrozosRef.current.push(ev.data);
          setConAudio(true);

          const totalSize = parteTrozosRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          const elapsed = Date.now() - parteInicioRef.current;
          if (parteTrozosRef.current.length % 10 === 0) observarDictado("FRAGMENTOS_RECIBIDOS", { outcome: "SUCCESS", metrics: { chunk_count: parteTrozosRef.current.length, media_chunk_bytes: ev.data.size, recorded_bytes: totalSize, elapsed_ms: elapsed } });

          if (totalSize >= 2 * 1024 * 1024 || elapsed >= 120 * 1000) {
            void subirParteActual();
          }
        }
      };

      grabadora.onstop = async () => {
        observarDictado("GRABACION_DETENIDA", { outcome: "SUCCESS", metrics: { pending_chunks: parteTrozosRef.current.length, recorder_state: String(grabadora.state) } });
        try {
          const finalizacion = subirParteActual();
          subidaEnCursoRef.current = finalizacion;
          await finalizacion;
        } catch (cause) {
          observarDictado("FINALIZACION_GRABACION_FALLIDA", { severity: "ERROR", outcome: "FAILURE", reasonCode: "part_upload_failed" });
          throw cause;
        } finally {
          resolverFinalizacionAudioRef.current?.();
          resolverFinalizacionAudioRef.current = null;
          await enviarEventosObservabilidadDictado();
        }
      };

      finalizacionAudioRef.current = new Promise<void>((resolve) => {
        resolverFinalizacionAudioRef.current = resolve;
      });
      grabadora.start(1000);
      grabRef.current = grabadora;
    } catch (e) {
      observarDictado("ERROR_INICIO_GRABACION", { severity: "ERROR", outcome: "FAILURE", reasonCode: "microphone_or_recorder_error", durationMs: Date.now() - recorderStartedAt, metrics: { source_mode: modoEntradaRef.current } });
      setAviso("dictado sin grabacion de voz: " + String(e));
      void enviarEventosObservabilidadDictado();
    }
  }, [subirParteActual, observarDictado]);

  const arrancarReconocedor = useCallback(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      observarDictado("CAPACIDAD_RECONOCIMIENTO_AUSENTE", { severity: "ERROR", outcome: "FAILURE", reasonCode: "speech_recognition_unsupported", metrics: { recognition_supported: false, source_mode: modoEntradaRef.current } });
      setError("Este navegador no soporta dictado en vivo. Usa Chrome o Edge.");
      void enviarEventosObservabilidadDictado();
      return false;
    }
    const intento = ++intentoReconocimientoRef.current;
    const recognizerStartedAt = Date.now();
    const rec = new SR();
    rec.lang = "es-MX";
    rec.continuous = true;
    rec.interimResults = true;
    observarDictado("RECONOCEDOR_CONSTRUIDO", { outcome: "SUCCESS", attemptId: "recognizer-" + intento, metrics: { recognizer_attempt: intento, continuous: true, interim_results: true, recognition_supported: true, source_mode: modoEntradaRef.current } });
    rec.onstart = () => {
      setEscuchando(true);
      abortosRef.current = 0;
      observarDictado("RECONOCEDOR_INICIADO", { outcome: "SUCCESS", attemptId: "recognizer-" + intento, durationMs: Date.now() - recognizerStartedAt, metrics: { recognizer_attempt: intento, recognizer_state: "started", recognizer_active: true, source_mode: modoEntradaRef.current } });
    };
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
          observarDictado("RESULTADO_FINAL_RECIBIDO", { outcome: "SUCCESS", attemptId: "recognizer-" + intento, metrics: { result_chars: txt.length, duration_since_result_ms: pausaMsAntes, result_index: i, segment_count: fragmentosRef.current.length } });
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
      if (interino.trim() && ahora - ultimoEventoParcialRef.current >= 5000) {
        ultimoEventoParcialRef.current = ahora;
        observarDictado("RESULTADO_PARCIAL_RECIBIDO", { outcome: "PARTIAL", attemptId: "recognizer-" + intento, metrics: { partial_chars: interino.trim().length, recognizer_attempt: intento } });
      }
    };
    rec.onerror = (ev: any) => {
      const clase = String(ev?.error ?? "unknown");
      observarDictado("ERROR_RECONOCEDOR", { severity: clase === "no-speech" ? "INFO" : clase === "aborted" ? "WARN" : "ERROR", outcome: clase === "no-speech" ? "PARTIAL" : "FAILURE", reasonCode: clase, attemptId: "recognizer-" + intento, metrics: { recognizer_attempt: intento, abort_count: abortosRef.current, was_recording: Boolean(grabRef.current), source_mode: modoEntradaRef.current } });
      void enviarEventosObservabilidadDictado();
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
          observarDictado("RECONOCIMIENTO_DETENIDO_POR_ERRORES", { severity: "ERROR", outcome: "FAILURE", reasonCode: clase, attemptId: "recognizer-" + intento, metrics: { abort_count: abortosRef.current, recognizer_attempt: intento } });
          void enviarEventosObservabilidadDictado();
        }
        return;
      }
      if (clase.length > 0 && clase !== "no-speech") setAviso("reconocimiento: " + clase);
    };
    rec.onend = () => {
      const recognizerIsCurrent = recRef.current === rec;
      observarDictado("EVENTO_FIN_RECONOCEDOR", { severity: recognizerIsCurrent ? "INFO" : "WARN", outcome: activoRef.current ? "PENDING" : "SUCCESS", reasonCode: recognizerIsCurrent ? null : "callback_from_previous_recognizer", attemptId: "recognizer-" + intento, metrics: { recognizer_attempt: intento, recognizer_is_current: recognizerIsCurrent, recognizer_active: activoRef.current, reconnect_count: reconexionesRef.current } });
      if (activoRef.current && !recognizerIsCurrent) observarDictado("REARME_INSTANCIA_ANTERIOR", { severity: "WARN", outcome: "PARTIAL", reasonCode: "previous_recognizer_onend_while_active", attemptId: "recognizer-" + intento, metrics: { recognizer_attempt: intento, recognizer_is_current: false, recognizer_active: true } });
      setEscuchando(false);
      setParcial("");
      if (!activoRef.current) { void enviarEventosObservabilidadDictado(); return; }
      if (rearmeRef.current) clearTimeout(rearmeRef.current);
      observarDictado("RECONEXION_PROGRAMADA", { outcome: "PENDING", attemptId: "recognizer-" + intento, metrics: { recognizer_attempt: intento, reconnect_count: reconexionesRef.current } });
      void enviarEventosObservabilidadDictado();
      rearmeRef.current = setTimeout(() => {
        if (!activoRef.current) return;
        reconexionesRef.current += 1;
        setReconexiones(reconexionesRef.current);
        observarDictado("RECONEXION_INICIADA", { outcome: "PENDING", attemptId: "recognizer-" + intento, metrics: { recognizer_attempt: intento, reconnect_count: reconexionesRef.current } });
        try {
          rec.start();
        } catch {
          observarDictado("RECONEXION_FALLIDA", { severity: "WARN", outcome: "PARTIAL", reasonCode: "restart_rejected", attemptId: "recognizer-" + intento, metrics: { reconnect_count: reconexionesRef.current } });
          try { rec.abort(); } catch {}
          rearmeRef.current = setTimeout(() => {
            if (!activoRef.current) return;
            try {
              rec.start();
              observarDictado("RECONEXION_REINTENTADA", { outcome: "PENDING", attemptId: "recognizer-" + intento, metrics: { reconnect_count: reconexionesRef.current, retry_count: 1 } });
            } catch (e3) {
              activoRef.current = false; setEstado("inactivo"); setError("reconocimiento no reanudable: " + String(e3));
              observarDictado("RECONOCIMIENTO_NO_REANUDABLE", { severity: "ERROR", outcome: "FAILURE", reasonCode: "restart_retry_rejected", attemptId: "recognizer-" + intento, metrics: { reconnect_count: reconexionesRef.current, retry_count: 1 } });
              void enviarEventosObservabilidadDictado();
            }
          }, 700);
        }
      }, 350);
    };
    recRef.current = rec;
    try { rec.start(); } catch (e) {
      observarDictado("RECONOCEDOR_START_FALLIDO", { severity: "ERROR", outcome: "FAILURE", reasonCode: "synchronous_start_rejected", attemptId: "recognizer-" + intento, metrics: { recognizer_attempt: intento, recognition_supported: true } });
      setError("no se pudo iniciar el reconocimiento: " + String(e));
      void enviarEventosObservabilidadDictado();
      return false;
    }
    return true;
  }, [estabilizarEmision, detenerGrabacion, observarDictado]);

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

    observarDictado("CAPTURA_CHROME_PREPARADA", { outcome: "PENDING", metrics: { source_mode: "chrome_live_caption", part_index: siguienteParte, bridge_state: chromeBridgeEstado, capture_state: chromeCapturaEstado } });
    enviarChromeCommand("arm", siguienteParte);
    setAviso("Sesión preparada. Cambia a la pestaña de Chrome que reproduce el audio y pulsa el icono de Aisthesis para iniciar su captura.");
  }, [enviarChromeCommand, observarDictado, chromeBridgeEstado, chromeCapturaEstado]);

  const iniciar = useCallback(async () => {
    setError("");
    setAviso("");
    setResultado("");
    setReconexiones(0);
    reconexionesRef.current = 0;
    intentoReconocimientoRef.current = 0;
    abortosRef.current = 0;
    audioPermitidoRef.current = true;
    trozosRef.current = [];

    sesionIdRef.current = generarSesionId();
    observarDictado("DICTADO_INICIO_SOLICITADO", { outcome: "PENDING", metrics: { source_mode: "microfono", recognition_supported: soportado } });
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
    if (!arrancado) {
      activoRef.current = false;
      observarDictado("DICTADO_INICIO_FALLIDO", { severity: "ERROR", outcome: "FAILURE", reasonCode: "recognizer_start_failed", metrics: { source_mode: "microfono" } });
      void enviarEventosObservabilidadDictado();
      return;
    }
    observarDictado("DICTADO_INICIO_ACEPTADO", { outcome: "SUCCESS", metrics: { source_mode: "microfono", recognition_supported: true } });
    void enviarEventosObservabilidadDictado();
    inicioRef.current = Date.now();
    setEstado("dictando");
    setEditando(false);
    setEstabaDictando(false);
    setTimeout(() => { void arrancarGrabacion(); }, 900);
  }, [arrancarReconocedor, arrancarGrabacion, observarDictado, soportado]);

  const detener = useCallback(async () => {
    observarDictado("DICTADO_DETENCION_SOLICITADA", { outcome: "PENDING", metrics: { source_mode: modoEntradaRef.current, active: activoRef.current, was_listening: escuchando } });
    void enviarEventosObservabilidadDictado();
    if (modoEntradaRef.current === "chrome_live_caption") {
      activoRef.current = false;
      setEstado("inactivo");
      let shutdownAcknowledged = false;
      const esperaParo = new Promise<void>((resolve) => {
        chromeStopResolverRef.current = () => { shutdownAcknowledged = true; resolve(); };
        window.setTimeout(() => {
          chromeStopResolverRef.current = null;
          resolve();
        }, 5000);
      });
      enviarChromeCommand("stop");
      await esperaParo;
      if (!shutdownAcknowledged) observarDictado("PARADA_CHROME_ACK_TIMEOUT", { severity: "WARN", outcome: "PARTIAL", reasonCode: "stop_ack_timeout", metrics: { source_mode: "chrome_live_caption", shutdown_acknowledged: false } });
      if (inicioRef.current > 0) {
        duracionRef.current = Math.round((Date.now() - inicioRef.current) / 1000);
      }
      if (parteTrozosRef.current.length > 0) await subirParteActual();
      modoEntradaRef.current = "ninguno";
      setModoEntrada("ninguno");
      setChromeCapturaEstado("inactiva");
      observarDictado("DICTADO_DETENIDO", { outcome: "SUCCESS", durationMs: duracionRef.current * 1000, metrics: { source_mode: "chrome_live_caption", part_count: partesSubidasRef.current.length } });
      await enviarEventosObservabilidadDictado();
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
      subidaEnCursoRef.current = null;
      setEstado("inactivo");
      observarDictado("DICTADO_DETENIDO", { outcome: "SUCCESS", durationMs: duracionRef.current * 1000, metrics: { source_mode: "microfono", part_count: partesSubidasRef.current.length, segment_count: segmentosRef.current.length } });
      await enviarEventosObservabilidadDictado();
    }
  }, [estabilizarEmision, detenerGrabacion, ejecutarTranscripcionAutoritativa, enviarChromeCommand, subirParteActual, observarDictado, escuchando]);

  const pausarParaEdicionInSitu = useCallback(() => {
    const pauseStartedAt = Date.now();
    observarDictado("DICTADO_PAUSA_POR_EDICION", { outcome: "PENDING", metrics: { was_dictating: activoRef.current || estado === "dictando", was_listening: escuchando, chars_before: textoAntesEdicionRef.current.length } });
    activoRef.current = false;
    if (rearmeRef.current) clearTimeout(rearmeRef.current);
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    detenerGrabacion("edit_in_situ");
    if (relojRef.current) clearTimeout(relojRef.current);
    setParcial("");
    setEscuchando(false);
    estabilizarEmision();
    setEstado("inactivo");
    observarDictado("DICTADO_PAUSADO_POR_EDICION", { outcome: "SUCCESS", durationMs: Date.now() - pauseStartedAt, metrics: { was_dictating: true, was_listening: escuchando, chars_before: textoAntesEdicionRef.current.length } });
    void enviarEventosObservabilidadDictado();
  }, [detenerGrabacion, estabilizarEmision, observarDictado, estado, escuchando]);

  const reanudarTrasEdicionInSitu = useCallback(async () => {
    const resumeStartedAt = Date.now();
    observarDictado("REANUDACION_POR_EDICION_SOLICITADA", { outcome: "PENDING", metrics: { source_mode: modoEntradaRef.current } });
    try {
    if (finalizacionAudioRef.current) await finalizacionAudioRef.current;
    if (subidaEnCursoRef.current) await subidaEnCursoRef.current;
    finalizacionAudioRef.current = null;
    subidaEnCursoRef.current = null;

    activoRef.current = true;
    const arrancado = arrancarReconocedor();
    if (!arrancado) {
      activoRef.current = false;
      setEstado("inactivo");
      observarDictado("REANUDACION_POR_EDICION_FALLIDA", { severity: "ERROR", outcome: "FAILURE", reasonCode: "recognizer_start_failed" });
      await enviarEventosObservabilidadDictado();
      return;
    }

    setEstado("dictando");
    observarDictado("REANUDACION_POR_EDICION_COMPLETADA", { outcome: "SUCCESS", durationMs: Date.now() - resumeStartedAt, metrics: { source_mode: modoEntradaRef.current } });
    void enviarEventosObservabilidadDictado();
    setTimeout(() => { void arrancarGrabacion(); }, 900);
    } catch {
      activoRef.current = false;
      setEstado("inactivo");
      observarDictado("REANUDACION_POR_EDICION_FALLIDA", { severity: "ERROR", outcome: "FAILURE", reasonCode: "pending_audio_finalization_failed", durationMs: Date.now() - resumeStartedAt });
      await enviarEventosObservabilidadDictado();
    }
  }, [arrancarGrabacion, arrancarReconocedor, observarDictado]);

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
    if (archivado) {
      setError("Esta captura ya está archivada y sellada. Pulsa Limpiar para iniciar una captura nueva.");
      return;
    }
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
    if (!sesionIdRef.current) sesionIdRef.current = generarSesionId();
    setGuardando(true);
    const saveStartedAt = Date.now();
    observarDictado("GUARDADO_DICTADO_INICIADO", { outcome: "PENDING", metrics: { chars_current: texto.length, part_count: partesSubidasRef.current.length } });
    void enviarEventosObservabilidadDictado();
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
          observarDictado("GUARDADO_DICTADO_FALLIDO", { severity: "ERROR", outcome: "FAILURE", reasonCode: "http_" + rv.status, durationMs: Date.now() - saveStartedAt, metrics: { http_status: rv.status, chars_current: texto.length, part_count: partesSubidasRef.current.length } });
          setError(String(dv?.detail || "Error desconocido") + " " + String(dv?.causa ?? ""));
        } else {
          observarDictado("GUARDADO_DICTADO_COMPLETADO", { outcome: "SUCCESS", durationMs: Date.now() - saveStartedAt, metrics: { response_ok: true, chars_current: texto.length, part_count: partesSubidasRef.current.length } });
          setArchivado(true);
          setResultado((dv?.idempotent ? "volcado ya archivado " : "archivado ") + String(dv?.chars) + " caracteres, sha " + String(dv?.sha256).slice(0, 8) + (audioUrl ? `, con audio (${partes.length} partes)` : ", sin audio"));
          setAviso("Captura sellada. La revisión y las correcciones se hacen en Volcados; pulsa Limpiar para empezar una captura nueva.");
        }
      } catch (err) {
        observarDictado("GUARDADO_DICTADO_FALLIDO", { severity: "ERROR", outcome: "FAILURE", reasonCode: "network_error", durationMs: Date.now() - saveStartedAt, metrics: { chars_current: texto.length, part_count: partesSubidasRef.current.length } });
        setError("Error de red al guardar: " + String(err));
      }
    } catch (e) {
      observarDictado("GUARDADO_DICTADO_FALLIDO", { severity: "ERROR", outcome: "FAILURE", reasonCode: "save_preparation_failed", durationMs: Date.now() - saveStartedAt });
      setError(String(e));
    } finally {
      setGuardando(false);
      await enviarEventosObservabilidadDictado();
    }
  }, [archivado, texto, titulo, pulidosOk, observarDictado]);


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
      const utf8NameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      let downloadName = nameMatch?.[1] || "audio-original";
      if (utf8NameMatch?.[1]) {
        try {
          downloadName = decodeURIComponent(utf8NameMatch[1]);
        } catch {
          // El nombre ASCII seguro sigue disponible como fallback.
        }
      }
      link.download = downloadName;
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
    if (archivado) {
      setError("Esta captura ya está archivada. Pulsa Limpiar antes de adjuntar audio a una captura nueva.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
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
          fuenteAudio: "audio_archivo",
          nombreOriginal: typeof data.originalName === "string" && data.originalName.trim() ? data.originalName : file.name,
          mimeType: typeof data.mimeType === "string" && data.mimeType.trim() ? data.mimeType : file.type,
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
    observarDictado("CAPTURA_LIMPIADA", { outcome: "SUCCESS", metrics: { source_mode: modoEntradaRef.current, chars_before: texto.length, part_count: partesSubidasRef.current.length } });
    void enviarEventosObservabilidadDictado();
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
    setArchivado(false);
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
  }, [enviarChromeCommand, observarDictado, texto]);

  const iniciarEdicionInSitu = useCallback(() => {
    if (editando || cerrandoEdicionRef.current) return;
    if (modoEntradaRef.current === "chrome_live_caption" && estado === "dictando") {
      observarDictado("EDICION_IN_SITU_BLOQUEADA", { severity: "WARN", outcome: "SKIPPED", reasonCode: "chrome_capture_must_stop_first", metrics: { source_mode: "chrome_live_caption", active: true } });
      setAviso("Detén la captura Chrome antes de editar el texto.");
      return;
    }
    textoAntesEdicionRef.current = texto;
    const dictadoActivo = estado === "dictando" || activoRef.current;
    observarDictado("EDICION_IN_SITU_INICIADA", { outcome: "PENDING", metrics: { was_dictating: dictadoActivo, chars_before: texto.length, segment_count: segmentosRef.current.length, source_mode: modoEntradaRef.current } });
    estabaDictandoRef.current = dictadoActivo;
    setEstabaDictando(dictadoActivo);
    setEditando(true);
    if (dictadoActivo) pausarParaEdicionInSitu();
  }, [editando, estado, pausarParaEdicionInSitu, texto, observarDictado]);

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
    const editStartedAt = Date.now();
    observarDictado("EDICION_IN_SITU_CIERRE_INICIADO", { outcome: "PENDING", metrics: { confirmed: forzarConfirmacion, was_dictating: debeReanudar, chars_before: textoAntesEdicionRef.current.length, chars_after: texto.length } });
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
      observarDictado(forzarConfirmacion ? "EDICION_IN_SITU_CONFIRMADA" : "EDICION_IN_SITU_CANCELADA", { outcome: "SUCCESS", durationMs: Date.now() - editStartedAt, metrics: { confirmed: forzarConfirmacion, was_dictating: debeReanudar, chars_before: textoAntesEdicionRef.current.length, chars_after: texto.length } });
    } catch (cause) {
      observarDictado("EDICION_IN_SITU_CIERRE_FALLIDO", { severity: "ERROR", outcome: "FAILURE", reasonCode: "edit_finalize_failed", durationMs: Date.now() - editStartedAt, metrics: { confirmed: forzarConfirmacion, was_dictating: debeReanudar } });
      throw cause;
    } finally {
      setEditando(false);
      estabaDictandoRef.current = false;
      setEstabaDictando(false);
      cerrandoEdicionRef.current = false;
      await enviarEventosObservabilidadDictado();
    }
  }, [aplicarEdicionInSitu, reanudarTrasEdicionInSitu, texto, observarDictado]);

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

  return (
    <>
      <div style={{ width: "100%", maxWidth: 1240, minWidth: 0, margin: "0 auto", padding: "16px 24px 0", boxSizing: "border-box" }}>
        
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