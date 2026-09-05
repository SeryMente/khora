// @l0 L0-002-R · @req PIPELINE/REQ-3,UI-02/RESKIN,UI-PIPELINE-FIX/REQ-1,UI-TRANSICION-REVISION/REQ-1,REVISION-COCKPIT/REQ-1 · @acr ACR-1.2 · @req TRACE-SESSION/010 · @req TITULOS-LLM/REQ-2
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  PipelineView,
  PipelineViewState,
} from "../../components/shared/PipelineView";
import {
  globalTimeForPart,
  resolveGlobalSeek,
} from "../../../lib/audio-playback";

export default function VolcadosPage() {
  const [pipelineItems, setPipelineItems] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [filter, setFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
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
  const [fallbackDurationMs, setFallbackDurationMs] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekSecondsRef = useRef<number | null>(null);
  const resumeAfterLoadRef = useRef(false);

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
      setCurrentPartIndex(safePosition);
      setAudioSourceUrl(part.download_path);
      setAudioError(null);
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
      if (samePart && audio) {
        audio.currentTime = seek.localSeconds;
        setCurrentTimeMs(targetMs);
        return;
      }
      loadAudioPosition(seek.position, seek.localSeconds, isPlaying);
    },
    [currentPartIndex, isPlaying, loadAudioPosition, manifiestoPartes],
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
    setManifiestoPartes([]);
    setAudioSourceUrl("");
    try {
      const resManif = await fetch(`/api/audio/${id}/manifiesto`);
      if (resManif.ok) {
        const dataManif = await resManif.json();
        setManifiestoPartes(dataManif.partes || []);
        if (dataManif.partes && dataManif.partes.length > 0) {
          setCurrentPartIndex(1);
          setAudioSourceUrl(dataManif.partes[0].download_path);
        } else {
          setAudioError(
            "El manifiesto no contiene partes de audio reproducibles.",
          );
        }
      } else {
        setManifiestoPartes([]);
        setAudioSourceUrl(`/api/audio/${id}`);
        setAudioError(
          "No se pudo cargar el manifiesto; se intentará la fuente de audio consolidada.",
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

  const selectVolcadoItem = async (id: string) => {
    setSelectedId(id);
    setIngestaResult(null);
    setDrawerSubTab("cockpit");

    const item = pipelineItems.find((i) => i.id === id);
    if (item) {
      setSelectedItem(item);
    }

    try {
      const res = await fetch("/api/versiones?id=" + id);
      const data = await res.json();
      if (res.ok && Array.isArray(data.versiones)) {
        const latestVersionNum = data.versiones.reduce(
          (max: number, v: any) => Math.max(max, Number(v.version)),
          1,
        );
        const activeVer = data.versiones.find(
          (v: any) => Number(v.version) === latestVersionNum,
        );
        if (activeVer) {
          setEditableTexto(activeVer.texto || "");
        }
        await loadCockpitData(id, latestVersionNum);
      } else {
        setEditableTexto("");
      }
    } catch (err) {
      console.error("Error loading versions:", err);
    }
  };

  useEffect(() => {
    async function init() {
      const items = await fetchPipeline();
      if (items && items.length > 0 && !selectedId) {
        await selectVolcadoItem(items[0].id);
      }
    }
    void init();
  }, [fetchPipeline]);

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
        body: JSON.stringify({ id: selectedId, texto: editableTexto }),
      });
      if (res.ok) {
        await fetchPipeline();
        await selectVolcadoItem(selectedId);
      }
    } catch (err: any) {
      alert("Error de red: " + err.message);
    }
  };

  const handleIngestApproved = async () => {
    if (
      !selectedItem ||
      !selectedItem.version_aprobada ||
      !selectedItem.sha256_aprobado
    )
      return;
    setIngesting(true);
    setIngestaResult(null);
    try {
      const formData = new FormData();
      formData.append("volcado_id", selectedItem.id);
      formData.append("version", String(selectedItem.version_aprobada));
      formData.append("sha256", selectedItem.sha256_aprobado);

      const res = await fetch("/api/ingesta", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok || res.status === 201 || res.status === 200) {
        setIngestaResult({
          success: true,
          io_id: data.io_id || "Generado",
          details: data,
        });
        setSelectedItem({
          ...selectedItem,
          estado: "ingerido",
          io_id: data.io_id || "Generado",
        });
        await fetchPipeline();
      } else {
        setIngestaResult({
          success: false,
          error: data.error || data.detail || "Error en la ingesta del kernel",
        });
      }
    } catch (err: any) {
      setIngestaResult({
        success: false,
        error: "Error de red: " + err.message,
      });
    } finally {
      setIngesting(false);
    }
  };

  const state: PipelineViewState = {
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
            "La fuente de audio no pudo cargarse o no es reproducible.",
          );
        }}
      />
      <PipelineView
        state={state}
        actions={{
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
