// @l0 L0-002-R · @req PIPELINE/REQ-3,UI-02/RESKIN,UI-PIPELINE-FIX/REQ-1,UI-TRANSICION-REVISION/REQ-1,REVISION-COCKPIT/REQ-1 · @acr ACR-1.2 · @req TRACE-SESSION/010 · @req TITULOS-LLM/REQ-2
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  PipelineView,
  PipelineViewState,
} from "../../components/shared/PipelineView";
import {
  explainAudioHttpFailure,
  globalTimeForPart,
  resolveGlobalSeek,
} from "../../../lib/audio-playback";
import CustodiaUnlock from "../../components/os/CustodiaUnlock";
import { AudioVaultLockedError, downloadCustodiaMp3 } from "../../../lib/client/export-audio-mp3";

export default function CustodiaPage({ legacyEditorEntry = false }: { legacyEditorEntry?: boolean } = {}) {
  const searchParams = useSearchParams();
  const archiveView = searchParams.get("vista") === "archivo";
  const [pipelineItems, setPipelineItems] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [filter, setFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [selectedVersionSha256, setSelectedVersionSha256] = useState<string | null>(null);
  const [versionSelectionError, setVersionSelectionError] = useState<string | null>(null);
  const [drawerSubTab, setDrawerSubTab] = useState<"cockpit" | "trace">(
    "cockpit",
  );

  const [viewMode, setViewMode] = useState<"lectura" | "edicion">("lectura");
  const [editableTexto, setEditableTexto] = useState("");
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [manifiestoPartes, setManifiestoPartes] = useState<any[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(1);
  const [audioSourceUrl, setAudioSourceUrl] = useState<string>("");
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [exportingMp3, setExportingMp3] = useState(false);
  const [fallbackDurationMs, setFallbackDurationMs] = useState<number>(0);
  const [vaultLocked, setVaultLocked] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);
  const pendingDownloadId = useRef<string | null>(null);
  const currentSelectedId = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekSecondsRef = useRef<number | null>(null);
  const resumeAfterLoadRef = useRef(false);
  const validatedAudioSourceRef = useRef<string | null>(null);

  const manifestDurationMs = manifiestoPartes.reduce(
    (acc, p) => acc + (p.duracion_ms || 0),
    0,
  );
  const duracionTotalMs = manifestDurationMs || fallbackDurationMs;

  const loadAudioPosition = useCallback(
    (position: number, localSeconds = 0, autoplay = false) => {
      if (manifiestoPartes.length === 0) return;
      const safePosition = Math.min(
        Math.max(position, 1),
        manifiestoPartes.length,
      );
      const part = manifiestoPartes[safePosition - 1];
      pendingSeekSecondsRef.current = Math.max(0, localSeconds);
      resumeAfterLoadRef.current = autoplay;
      validatedAudioSourceRef.current = null;
      setCurrentPartIndex(safePosition);
      if (part.availability === "temporarily_unavailable") {
        setAudioSourceUrl("");
        setIsPlaying(false);
        setAudioError("Parte histórica en Vercel Blob: temporalmente no disponible. Recuperación/migración pendiente; el archivo no se considera perdido ni dañado.");
      } else {
        setAudioSourceUrl(part.download_path);
        setAudioError(null);
      }
    },
    [manifiestoPartes],
  );

  const toggleAudioPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audioSourceUrl) {
      setAudioError(
        "El audio figura disponible, pero no existe una fuente reproducible.",
      );
      setIsPlaying(false);
      return;
    }

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      if (validatedAudioSourceRef.current !== audioSourceUrl) {
        const response = await fetch(audioSourceUrl, {
          headers: { Range: "bytes=0-1" },
          cache: "no-store",
        });
        if (response.status === 423) setVaultLocked(true);
        const failure = await explainAudioHttpFailure(response);
        if (failure) {
          setIsPlaying(false);
          setAudioError(failure);
          return;
        }
        validatedAudioSourceRef.current = audioSourceUrl;
      }
      await audio.play();
    } catch (err: any) {
      setIsPlaying(false);
      setAudioError(
        `No se pudo iniciar la reproducción: ${err?.message || "fuente de audio inválida"}`,
      );
    }
  }, [audioSourceUrl]);

  const seekAudioGlobally = useCallback(
    (targetMs: number) => {
      if (manifiestoPartes.length === 0) return;
      const seek = resolveGlobalSeek(manifiestoPartes, targetMs);
      const audio = audioRef.current;
      const samePart = seek.position === currentPartIndex;
      if (samePart && audio && audioSourceUrl) {
        audio.currentTime = seek.localSeconds;
        setCurrentTimeMs(targetMs);
        return;
      }
      loadAudioPosition(seek.position, seek.localSeconds, isPlaying);
    },
    [audioSourceUrl, currentPartIndex, isPlaying, loadAudioPosition, manifiestoPartes],
  );

  const [hallazgos, setHallazgos] = useState<any[]>([]);
  const [activeHallazgoIndex, setActiveHallazgoIndex] = useState<number>(0);

  const [incidentes, setIncidentes] = useState<any[]>([]);
  const [gateDecision, setGateDecision] = useState<any>(null);
  const [loadingGate, setLoadingGate] = useState<boolean>(false);

  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [showAccessibleModal, setShowAccessibleModal] =
    useState<boolean>(false);
  const [accessibleConfirmText, setAccessibleConfirmText] =
    useState<string>("");
  const [approvingVersion, setApprovingVersion] = useState<boolean>(false);
  const [showAudioResolveModal, setShowAudioResolveModal] =
    useState<boolean>(false);
  const [selectedAudioResolveCode, setSelectedAudioResolveCode] =
    useState<string>("aceptado_sin_audio");

  const [ingesting, setIngesting] = useState(false);
  const [ingestaResult, setIngestaResult] = useState<any>(null);

  const fetchPipeline = useCallback(async () => {
    setLoadingPipeline(true);
    try {
      const res = await fetch("/api/volcados/pipeline");
      const data = await res.json();
      if (res.ok) {
        const items = data.volcados ?? [];
        setPipelineItems(items);
        setResumen({
          total: data.total ?? 0,
          en_revision: data.counts?.en_revision ?? 0,
          pendiente_revision: data.counts?.pendiente_revision ?? 0,
          listo_ingesta: data.counts?.listo_ingesta ?? 0,
          ingerido: data.counts?.ingerido ?? 0,
          anomalies: (data.total ?? 0) - (data.integrity?.sync ?? 0),
          sin_audio: data.integrity?.text_without_audio ?? 0,
        });
        return items;
      }
    } catch (err) {
      console.error("Error loading pipeline:", err);
    } finally {
      setLoadingPipeline(false);
    }
    return [];
  }, []);

  const loadCockpitData = async (id: string, versionNum: number) => {
    setLoadingGate(true);
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentTimeMs(0);
    setFallbackDurationMs(0);
    setAudioError(null);
    validatedAudioSourceRef.current = null;
    setManifiestoPartes([]);
    setAudioSourceUrl("");
    try {
      const resManif = await fetch(`/api/audio/${id}/manifiesto`, {
        cache: "no-store",
      });
      const dataManif = await resManif.json().catch(() => ({}));
      if (currentSelectedId.current !== id) return;
      if (resManif.status === 423) setVaultLocked(true);
      if (resManif.ok) {
        setManifiestoPartes(dataManif.partes || []);
        if (dataManif.partes && dataManif.partes.length > 0) {
          const firstPlayableIndex = dataManif.partes.findIndex(
            (part: any) => part.availability !== "temporarily_unavailable",
          );
          if (firstPlayableIndex >= 0) {
            setCurrentPartIndex(firstPlayableIndex + 1);
            setAudioSourceUrl(dataManif.partes[firstPlayableIndex].download_path);
          } else {
            setCurrentPartIndex(1);
            setAudioSourceUrl("");
            setAudioError("Todo el audio de esta captura está en Vercel Blob histórico y permanece temporalmente no disponible. La recuperación/migración está pendiente; el texto y sus revisiones siguen disponibles.");
          }
        } else {
          setAudioError(
            "El manifiesto no contiene partes de audio reproducibles.",
          );
        }
      } else {
        setManifiestoPartes([]);
        setAudioSourceUrl("");
        setAudioError(
          (typeof dataManif?.detail === "string" && dataManif.detail) ||
            (resManif.status === 423
              ? "Bóveda cerrada: desbloquéala antes de reproducir el audio."
              : null) ||
            "No se pudo cargar el manifiesto de audio.",
        );
      }

      const resGate = await fetch(`/api/revision/${id}/compuerta`);
      if (resGate.ok) {
        const dataGate = await resGate.json();
        setGateDecision(dataGate);
      }

      const resInc = await fetch(`/api/revision/${id}/incidentes`);
      if (resInc.ok) {
        const dataInc = await resInc.json();
        setIncidentes(dataInc.incidentes || []);
      } else {
        setIncidentes([]);
      }

      const resHal = await fetch(
        `/api/revision/${id}/hallazgos?version=${versionNum}`,
      );
      if (resHal.ok) {
        const dataHal = await resHal.json();
        const pending = (dataHal.hallazgos || []).filter(
          (h: any) => h.estado === "pendiente",
        );
        setHallazgos(pending);
        setActiveHallazgoIndex(0);
      } else {
        setHallazgos([]);
      }
    } catch (err) {
      console.error("Error loading Cockpit data:", err);
    } finally {
      setLoadingGate(false);
    }
  };

  const selectVolcadoItem = async (
    id: string,
    requestedVersion: number | null = null,
    inventory = pipelineItems,
  ) => {
    currentSelectedId.current = id;
    pendingDownloadId.current = null;
    setPendingDownload(false);
    setSelectedId(id);
    setIngestaResult(null);
    setVersionSelectionError(null);
    setSelectedVersionNumber(null);
    setSelectedVersionSha256(null);
    setDrawerSubTab("cockpit");

    const item = inventory.find((i) => i.id === id);
    setSelectedItem(item ?? null);

    try {
      const res = await fetch("/api/versiones?id=" + encodeURIComponent(id), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.versiones) || data.versiones.length === 0) {
        setEditableTexto("");
        setVersionSelectionError(
          "No existe un historial de versiones verificable para este registro. No se elegirá otra versión por omisión.",
        );
        return;
      }

      const versions = data.versiones as Array<{ version: number | string; texto?: string | null; sha256?: string | null }>;
      const availableNumbers = versions.map((v) => Number(v.version)).filter((v) => Number.isInteger(v) && v > 0);
      const resolvedVersion = requestedVersion === null
        ? Math.max(...availableNumbers)
        : requestedVersion;
      const activeVer = versions.find((v) => Number(v.version) === resolvedVersion);
      if (!Number.isInteger(resolvedVersion) || resolvedVersion < 1 || !activeVer) {
        setEditableTexto("");
        setVersionSelectionError(
          `La versión solicitada v${requestedVersion} no existe para este registro. No se sustituirá por la última versión.`,
        );
        return;
      }

      const sha = String(activeVer.sha256 ?? "").trim().toLowerCase();
      setSelectedVersionNumber(resolvedVersion);
      setSelectedVersionSha256(sha || null);
      setEditableTexto(activeVer.texto || "");
      if (!/^[0-9a-f]{64}$/.test(sha)) {
        setVersionSelectionError(
          `La versión abierta v${resolvedVersion} no tiene un SHA-256 válido; la ingesta queda bloqueada.`,
        );
      }
      await loadCockpitData(id, resolvedVersion);
    } catch (err) {
      setEditableTexto("");
      setVersionSelectionError(
        `No se pudo cargar la versión abierta; no se seleccionará otra automáticamente. ${err instanceof Error ? err.message : String(err)}`,
      );
      console.error("Error loading versions:", err);
    }
  };

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const requestedId = params.get("volcado_id") || params.get("id");
      const versionValue = params.get("version");
      const requestedVersion = versionValue === null ? null : Number(versionValue);

      if (
        versionValue !== null &&
        (!requestedId || !Number.isInteger(requestedVersion) || Number(requestedVersion) < 1)
      ) {
        setVersionSelectionError(
          "La URL debe identificar el registro y una versión entera positiva. No se inferirá la versión.",
        );
        return;
      }

      const items = await fetchPipeline();
      if (!items || items.length === 0) return;

      if (requestedId) {
        if (!items.some((item: { id: string }) => item.id === requestedId)) {
          setVersionSelectionError(
            "El registro solicitado no está presente en el inventario. No se abrirá otro registro por omisión.",
          );
          return;
        }
        await selectVolcadoItem(requestedId, requestedVersion, items);
        return;
      }

      if (!selectedId) await selectVolcadoItem(items[0].id, null, items);
    }
    void init();
  }, [fetchPipeline]);

  const handleExportMp3 = useCallback(async () => {
    if (!selectedId || exportingMp3) return;
    if (Number(selectedItem?.storage_summary?.legacy_pending_count || 0) > 0) {
      setAudioError("No se puede reconstruir el MP3 completo mientras haya partes históricas de Vercel Blob pendientes de recuperación.");
      return;
    }
    setExportingMp3(true); setAudioError(null);
    try {
      const result = await downloadCustodiaMp3({ id: selectedId,
        filename: 'khora-custodia-' + (selectedItem?.folio || selectedId) + '.mp3',
        isCurrent: () => currentSelectedId.current === selectedId });
      if (currentSelectedId.current !== selectedId) return;
      if (result.status === 'queued') setAudioError('MP3 solicitado. El original se conserva; vuelve a descargar cuando termine la conversión.');
      if (result.status === 'downloaded' && !result.complete) setAudioError('Se descargó un corte hasta la parte ' + result.parts + '; la captura sigue abierta.');
    } catch (err) {
      if (currentSelectedId.current !== selectedId) return;
      if (err instanceof AudioVaultLockedError) {
        pendingDownloadId.current = selectedId; setPendingDownload(true); setVaultLocked(true);
      }
      setAudioError(err instanceof Error ? err.message : 'No se pudo descargar el MP3 conservado.');
    } finally { setExportingMp3(false); }
  }, [exportingMp3, selectedId, selectedItem?.folio, selectedItem?.storage_summary?.legacy_pending_count]);

  const handleRegenerarTitulo = async () => {
    if (!selectedId) return;
    setGeneratingTitle(true);
    setTitleError(null);
    try {
      const res = await fetch("/api/dictado-archivo/titulo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          texto: editableTexto || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.title) {
        if (selectedItem) {
          setSelectedItem({ ...selectedItem, titulo: data.title });
        }
        await fetchPipeline();
      } else {
        setTitleError(
          data.detail || data.error || "No se pudo generar el título",
        );
      }
    } catch (err: any) {
      setTitleError("Error de red: " + (err?.message ?? String(err)));
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedId || !editableTexto.trim()) return;
    try {
      const res = await fetch("/api/edicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, texto: editableTexto,versionBase:selectedVersionNumber,sha256Base:selectedVersionSha256,motivoDelta:"enmienda_contenido" }),
      });
      if (res.ok) {
        const items=await fetchPipeline();
        await selectVolcadoItem(selectedId,null,items);
      } else { const d=await res.json().catch(()=>({}));alert(d.detail||d.causa||"No se guardaron los cambios; conserva tu texto y recarga la versión."); }
    } catch (err: any) {
      alert("Error de red: " + err.message);
    }
  };

  const holdTimerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const stopHolding=()=>{if(holdTimerRef.current)clearInterval(holdTimerRef.current);holdTimerRef.current=null;setIsHolding(false);setHoldProgress(0);};
  useEffect(()=>()=>{if(holdTimerRef.current)clearInterval(holdTimerRef.current);},[]);
  useEffect(()=>{if(holdTimerRef.current)clearInterval(holdTimerRef.current);holdTimerRef.current=null;setIsHolding(false);setHoldProgress(0);setAccessibleConfirmText("");setShowAccessibleModal(false);},[selectedId,selectedVersionNumber]);
  const executeApproval=async()=>{
    if(!selectedId||!selectedVersionNumber||approvingVersion)return;
    if(gateDecision?.canApprove!==true){setAudioError("La compuerta de revisión no permite aprobar.");return;}
    setApprovingVersion(true);
    try{const r=await fetch(`/api/volcado/${selectedId}/aprobar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:selectedVersionNumber,sha256:selectedVersionSha256})});const d=await r.json();if(!r.ok)throw new Error(d.error||d.detail||"Aprobación rechazada");setShowAccessibleModal(false);const items=await fetchPipeline();await selectVolcadoItem(selectedId,selectedVersionNumber,items);}
    catch(e){setAudioError(String((e as Error).message));}finally{setApprovingVersion(false);stopHolding();}
  };
  const startHolding=()=>{stopHolding();setIsHolding(true);const started=Date.now();holdTimerRef.current=setInterval(()=>{const progress=Math.min(100,Math.floor((Date.now()-started)/20));setHoldProgress(progress);if(progress>=100){stopHolding();void executeApproval();}},50);};
  const resolveHallazgo=async(accion:"aceptar"|"rechazar")=>{
    const h=hallazgos[activeHallazgoIndex];if(!selectedId||!h)return;
    try{const r=await fetch(`/api/revision/${selectedId}/hallazgos/${h.id}/resolver`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accion})});const d=await r.json();if(!r.ok)throw new Error(d.detail||"No se resolvió el hallazgo");const items=await fetchPipeline();await selectVolcadoItem(selectedId,null,items);}catch(e){setAudioError(String((e as Error).message));}
  };
  const resolveAudio=async()=>{
    const incident=incidentes.find(i=>String(i.tipo).includes("audio")&&i.estado!=="resuelto");if(!selectedId||!incident)return;
    try{const r=await fetch(`/api/revision/${selectedId}/incidentes/${incident.id}/resolver`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({codigoResolucion:selectedAudioResolveCode})});const d=await r.json();if(!r.ok)throw new Error(d.detail||"No se resolvió el incidente");setShowAudioResolveModal(false);await loadCockpitData(selectedId,selectedVersionNumber||1);}catch(e){setAudioError(String((e as Error).message));}
  };

  const handleIngestApproved = async () => {
    const openedVersion = selectedVersionNumber;
    const openedSha = String(selectedVersionSha256 ?? "").trim().toLowerCase();
    const approvedVersion = Number(selectedItem?.version_aprobada ?? 0);
    const approvedSha = String(selectedItem?.sha256_aprobada ?? "").trim().toLowerCase();

    if (!selectedItem || openedVersion === null || !/^[0-9a-f]{64}$/.test(openedSha)) {
      setIngestaResult({
        success: false,
        error: "No existe una versión abierta con SHA-256 verificable. No se enviará la versión aprobada por sustitución.",
      });
      return;
    }
    if (approvedVersion !== openedVersion || approvedSha !== openedSha) {
      setIngestaResult({
        success: false,
        error: `La versión abierta v${openedVersion} no coincide exactamente con la versión ratificada. No se enviará otra versión.`,
      });
      return;
    }
    if (!["listo_ingesta", "fallido", "ingerido"].includes(String(selectedItem.estado))) {
      setIngestaResult({
        success: false,
        error: `La versión abierta no puede ingerirse desde el estado actual: ${String(selectedItem.estado)}.`,
      });
      return;
    }

    setIngesting(true);
    setIngestaResult(null);
    try {
      const formData = new FormData();
      formData.append("volcado_id", selectedItem.id);
      formData.append("version", String(openedVersion));
      formData.append("sha256", openedSha);

      const res = await fetch("/api/ingesta", { method: "POST", body: formData });
      const data = await res.json();
      const ioId = typeof data?.io_id === "string" ? data.io_id.trim() : "";

      if (res.ok && ioId.length > 0) {
        setIngestaResult({ success: true, io_id: ioId, details: data });
        setSelectedItem({ ...selectedItem, estado: "ingerido", io_id: ioId });
        await fetchPipeline();
      } else {
        setIngestaResult({
          success: false,
          error: data.error || data.detail || (!res.ok
            ? "Error en la ingesta del kernel"
            : "La ingesta devolvió éxito HTTP sin un io_id persistido; el resultado no se declarará exitoso."),
        });
      }
    } catch (err: any) {
      setIngestaResult({
        success: false,
        error: "Error de red: " + (err?.message ?? String(err)),
      });
    } finally {
      setIngesting(false);
    }
  };

  const state: PipelineViewState = {
    legacyEditorEntry,
    selectedVersionNumber,
    selectedVersionSha256,
    versionSelectionError,
    pipelineItems,
    resumen,
    loadingPipeline,
    filter,
    searchQuery,
    selectedId,
    selectedItem,
    drawerSubTab,
    viewMode,
    editableTexto,
    generatingTitle,
    titleError,
    manifiestoPartes,
    currentPartIndex,
    audioSourceUrl,
    currentTimeMs,
    duracionTotalMs,
    isPlaying,
    audioError,
    exportingMp3,
    hallazgos,
    activeHallazgoIndex,
    incidentes,
    gateDecision,
    loadingGate,
    holdProgress,
    isHolding,
    showAccessibleModal,
    accessibleConfirmText,
    approvingVersion,
    showAudioResolveModal,
    selectedAudioResolveCode,
    ingesting,
    ingestaResult,
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={audioSourceUrl || undefined}
        preload="metadata"
        className="sr-only"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          if (
            manifiestoPartes.length === 0 &&
            Number.isFinite(audio.duration)
          ) {
            setFallbackDurationMs(Math.max(0, audio.duration * 1000));
          }
          const pending = pendingSeekSecondsRef.current;
          if (pending !== null && Number.isFinite(audio.duration)) {
            audio.currentTime = Math.min(
              pending,
              Math.max(0, audio.duration - 0.01),
            );
          }
          pendingSeekSecondsRef.current = null;
          if (resumeAfterLoadRef.current) {
            resumeAfterLoadRef.current = false;
            void audio.play().catch((err: any) => {
              setIsPlaying(false);
              setAudioError(
                `No se pudo continuar la reproducción: ${err?.message || "fuente de audio inválida"}`,
              );
            });
          }
        }}
        onTimeUpdate={(event) => {
          setCurrentTimeMs(
            globalTimeForPart(
              manifiestoPartes,
              currentPartIndex,
              event.currentTarget.currentTime,
            ),
          );
        }}
        onPlay={() => {
          setIsPlaying(true);
          setAudioError(null);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (currentPartIndex < manifiestoPartes.length) {
            loadAudioPosition(currentPartIndex + 1, 0, true);
          } else {
            setIsPlaying(false);
            setCurrentTimeMs(duracionTotalMs);
          }
        }}
        onError={() => {
          setIsPlaying(false);
          setAudioError(
            (current) =>
              current ||
              "La fuente de audio no pudo cargarse o no es reproducible.",
          );
        }}
      />
      {vaultLocked && <CustodiaUnlock
        pendingDownload={pendingDownload}
        onCancel={() => { pendingDownloadId.current = null; setPendingDownload(false); }}
        onUnlocked={async () => {
          const id = selectedId;
          if (!id || currentSelectedId.current !== id) return;
          const resumeDownload = pendingDownloadId.current === id;
          pendingDownloadId.current = null;
          setPendingDownload(false);
          setVaultLocked(false);
          setAudioError(null);
          await loadCockpitData(id, selectedVersionNumber ?? 1);
          if (resumeDownload && currentSelectedId.current === id) await handleExportMp3();
        }}
      />}
      <PipelineView
        title={archiveView ? "Archivo" : "Custodia"}
        state={state}
        actions={{
          onResolveHallazgo: resolveHallazgo,
          onStartHolding: startHolding,
          onStopHolding: stopHolding,
          onExecuteApproval: executeApproval,
          onOpenAudioResolveModal: () => setShowAudioResolveModal(true),
          onResolveAudioIncident: resolveAudio,
          onFilterChange: setFilter,
          onSearchChange: setSearchQuery,
          onSelectVolcado: selectVolcadoItem,
          onSetDrawerSubTab: setDrawerSubTab,
          onSetViewMode: setViewMode,
          onEditableTextoChange: setEditableTexto,
          onRegenerarTitulo: handleRegenerarTitulo,
          onSaveEdits: handleSaveEdits,
          onIngestApproved: handleIngestApproved,
          onGlobalSeek: seekAudioGlobally,
          onTogglePlayPause: toggleAudioPlayback,
          onExportMp3: handleExportMp3,
          onManualPartChange: (position) =>
            loadAudioPosition(position, 0, isPlaying),
          onSetShowAccessibleModal: setShowAccessibleModal,
          onSetAccessibleConfirmText: setAccessibleConfirmText,
          onSetShowAudioResolveModal: setShowAudioResolveModal,
          onSetSelectedAudioResolveCode: setSelectedAudioResolveCode,
        }}
      />
    </>
  );
}
