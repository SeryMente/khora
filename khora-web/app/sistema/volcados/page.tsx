// @l0 L0-002-R · @req PIPELINE/REQ-3,UI-02/RESKIN,UI-PIPELINE-FIX/REQ-1,UI-TRANSICION-REVISION/REQ-1,REVISION-COCKPIT/REQ-1 · @acr ACR-1.2 · @req TRACE-SESSION/010
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import * as Icons from "lucide-react";

type PipelineItem = {
  id: string;
  folio: number | null;
  session_id: string | null;
  session_estado: string | null;
  audio_status: "disponible" | "encontrado_no_vinculado" | "incompleto" | "no_recuperable" | "no_aplica";
  partes_count: number;
  blob_paths: string[];
  titulo: string | null;
  recibido_en: string;
  estado: string;
  io_id: string | null;
  ultimo_error: string | null;
  chars: number;
  audio_url: string | null;
  audio_bytes: number | null;
  duracion_seg: number | null;
  version_aprobada: number | null;
  sha256_aprobado: string | null;
  aprobador: string | null;
  aprobado_en: string | null;
  total_versiones: number;
  version_actual: number;
  nodos_count: number;
  aristas_count: number;
  integrity: string;
  audioStatus: string;
  audio?: {
    present: boolean;
    complete: boolean | string;
    bytes: number;
    duration_sec: number;
  };
};

type Volcado = {
  id: string;
  folio: number;
  texto: string;
  sha256: string;
  chars: number;
  titulo: string | null;
  origen: string;
  recibido_en: string;
  estado: string;
  io_id: string | null;
  intentos: number;
  ultimo_error: string | null;
};

type AudioParteManifiesto = {
  part_index: number;
  start_ms: number;
  end_ms: number;
  duracion_ms: number;
  bytes: number;
  sha256: string | null;
  verificado: boolean;
  download_path: string;
};

type PalabraTiming = {
  palabra: string;
  char_inicio: number;
  char_fin: number;
  start_ms: number;
  end_ms: number;
  part_index: number;
  fuente_timing: "word_exact" | "segment_interpolated";
  confianza: number;
};

type Incidente = {
  id: string;
  volcado_id: string;
  tipo: string;
  severidad: "alta" | "media" | "baja";
  origen: string;
  estado: "abierto" | "reconocido" | "resuelto" | "reabierto";
  primera_deteccion: string;
  ultima_deteccion: string;
  codigo_resolucion: string | null;
  evidencia: Record<string, any>;
};

type Hallazgo = {
  id: string;
  familia: "correccion_aplicable" | "observacion_editorial";
  posicion: { inicio: number; fin: number };
  texto_original: string;
  sugerencia: string;
  regla: string;
  tipo_categoria: string;
  severidad: "alta" | "media" | "baja";
  estado: "pendiente" | "aceptada" | "rechazada" | "resuelta";
  explicacion?: string;
};

type GateDecision = {
  canApprove: boolean;
  version: number;
  sha256: string;
  gate_hash: string;
  blockers: Array<{ code: string; message: string; count?: number }>;
  warnings: Array<{ code: string; message: string }>;
  counts: {
    errores_tipograficos_pendientes: number;
    correcciones_lingüisticas_pendientes: number;
    observaciones_sintacticas_pendientes: number;
    incidentes_operativos_abiertos: number;
  };
};

export default function VolcadosPage() {
  const activeTab = "pipeline" as const;

  // Pipeline states
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [filter, setFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item in Drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [drawerSubTab, setDrawerSubTab] = useState<"cockpit" | "trace">("cockpit");

  // Cockpit Mode (Reading vs Editing)
  const [viewMode, setViewMode] = useState<"lectura" | "edicion">("lectura");
  const [editableTexto, setEditableTexto] = useState("");
  const [versiones, setVersiones] = useState<any[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [savingVersion, setSavingVersion] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);

  // Audio Sync & Playback states
  const [manifiestoPartes, setManifiestoPartes] = useState<AudioParteManifiesto[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(1);
  const [audioSourceUrl, setAudioSourceUrl] = useState<string>("");
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [palabrasTiming, setPalabrasTiming] = useState<PalabraTiming[]>([]);
  const [activePalabraIdx, setActivePalabraIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Findings Navigation states
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [activeHallazgoIndex, setActiveHallazgoIndex] = useState<number>(0);

  // Incident & Gate states
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [gateDecision, setGateDecision] = useState<GateDecision | null>(null);
  const [loadingGate, setLoadingGate] = useState<boolean>(false);

  // High Friction Approval states
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [showAccessibleModal, setShowAccessibleModal] = useState<boolean>(false);
  const [accessibleConfirmText, setAccessibleConfirmText] = useState<string>("");
  const [approvingVersion, setApprovingVersion] = useState<boolean>(false);
  const [showAudioResolveModal, setShowAudioResolveModal] = useState<boolean>(false);
  const [selectedAudioResolveCode, setSelectedAudioResolveCode] = useState<string>("aceptado_sin_audio");

  // Ingestion state
  const [ingesting, setIngesting] = useState(false);
  const [ingestaResult, setIngestaResult] = useState<any>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<any>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Helper for rendering Audio Status Badges
  const renderAudioStatusBadge = (status: string) => {
    switch (status) {
      case "disponible":
        return <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-1">🟢 Audio disponible</span>;
      case "encontrado_no_vinculado":
        return <span className="text-yellow-400 font-semibold text-[10px] flex items-center gap-1">🟡 Audio no vinculado</span>;
      case "incompleto":
      case "audio_parcial":
        return <span className="text-amber-500 font-semibold text-[10px] flex items-center gap-1">🟠 Audio incompleto</span>;
      case "no_aplica":
        return <span className="text-sky-400 font-semibold text-[10px] flex items-center gap-1">⚪ Entrada manual · Audio no esperado</span>;
      case "no_recuperable":
      default:
        return <span className="text-red-400 font-semibold text-[10px] flex items-center gap-1">🔴 Audio no recuperable</span>;
    }
  };

  // Fetch Pipeline Data
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

  useEffect(() => {
    async function init() {
      const items = await fetchPipeline();
      if (items && items.length > 0 && !selectedId) {
        await selectVolcadoItem(items[0].id, true);
      }
    }
    void init();
  }, [fetchPipeline]);

  // Cargar datos de Cockpit, Manifiesto, Incidentes y Gate
  const loadCockpitData = async (id: string, versionNum: number) => {
    setLoadingGate(true);
    try {
      // 1. Cargar Manifiesto de Audio
      const resManif = await fetch(`/api/audio/${id}/manifiesto`);
      if (resManif.ok) {
        const dataManif = await resManif.json();
        setManifiestoPartes(dataManif.partes || []);
        if (dataManif.partes && dataManif.partes.length > 0) {
          setCurrentPartIndex(1);
          setAudioSourceUrl(dataManif.partes[0].download_path);
        }
      } else {
        setManifiestoPartes([]);
        setAudioSourceUrl(`/api/audio/${id}`);
      }

      // 2. Cargar Gate de Aprobación
      const resGate = await fetch(`/api/revision/${id}/compuerta`);
      if (resGate.ok) {
        const dataGate = await resGate.json();
        setGateDecision(dataGate);
      }

      // 3. Cargar Incidentes
      const resInc = await fetch(`/api/revision/${id}/incidentes`);
      if (resInc.ok) {
        const dataInc = await resInc.json();
        setIncidentes(dataInc.incidentes || []);
      } else {
        setIncidentes([]);
      }

      // 4. Cargar Hallazgos Lingüísticos
      const resHal = await fetch(`/api/revision/${id}/hallazgos?version=${versionNum}`);
      if (resHal.ok) {
        const dataHal = await resHal.json();
        const pending = (dataHal.hallazgos || []).filter((h: Hallazgo) => h.estado === "pendiente");
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

  // Handle volcado selection
  const selectVolcadoItem = async (id: string, skipMobileToggle?: boolean) => {
    setSelectedId(id);
    setIngestaResult(null);
    setDrawerSubTab("cockpit");
    if (!skipMobileToggle) {
      setMobileShowDetail(true);
    }

    const item = pipelineItems.find((i) => i.id === id);
    if (item) {
      setSelectedItem(item);
    }

    try {
      const res = await fetch("/api/versiones?id=" + id);
      const data = await res.json();
      if (res.ok && Array.isArray(data.versiones)) {
        setVersiones(data.versiones);
        const latestVersionNum = data.versiones.reduce((max: number, v: any) => Math.max(max, Number(v.version)), 1);
        setSelectedVersionNum(latestVersionNum);

        const activeVer = data.versiones.find((v: any) => Number(v.version) === latestVersionNum);
        if (activeVer) {
          setEditableTexto(activeVer.texto || "");
        }

        await loadCockpitData(id, latestVersionNum);
      } else {
        setVersiones([]);
        setEditableTexto("");
      }
    } catch (err) {
      console.error("Error loading versions:", err);
    }
  };

  const handleRegenerarTitulo = async () => {
    if (!editableTexto.trim()) return;
    setGeneratingTitle(true);
    try {
      const res = await fetch("/api/dictado-archivo/titulo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: editableTexto }),
      });
      const data = await res.json();
      if (res.ok && data.title && selectedId) {
        if (selectedItem) {
          setSelectedItem({ ...selectedItem, titulo: data.title });
        }
        await fetchPipeline();
      }
    } catch (err) {
      console.error("Error regenerando título:", err);
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedId || !editableTexto.trim()) return;
    setSavingVersion(true);
    try {
      const res = await fetch("/api/edicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, texto: editableTexto }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchPipeline();
        await selectVolcadoItem(selectedId);
      } else {
        alert("Error al guardar: " + (data.detail || data.error || "Desconocido"));
      }
    } catch (err: any) {
      alert("Error de red: " + err.message);
    } finally {
      setSavingVersion(false);
    }
  };

  const handleResolveHallazgo = async (accion: "aceptar" | "rechazar") => {
    if (!selectedId || hallazgos.length === 0) return;
    const currentH = hallazgos[activeHallazgoIndex];
    if (!currentH) return;

    try {
      const res = await fetch(`/api/revision/${selectedId}/hallazgos/${currentH.id}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      if (res.ok) {
        await fetchPipeline();
        await selectVolcadoItem(selectedId);
      }
    } catch (err) {
      console.error("Error resolviendo hallazgo:", err);
    }
  };

  // High Friction Hold Button Handler
  const startHolding = () => {
    if (!gateDecision?.canApprove || approvingVersion) return;
    setIsHolding(true);
    let current = 0;
    holdTimerRef.current = setInterval(() => {
      current += 10;
      setHoldProgress(current);
      if (current >= 100) {
        clearInterval(holdTimerRef.current);
        void executeApproval();
      }
    }, 200);
  };

  const stopHolding = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
  };

  const executeApproval = async () => {
    if (!selectedId || !gateDecision) return;
    setApprovingVersion(true);
    try {
      const res = await fetch(`/api/revision/${selectedId}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: gateDecision.version,
          sha256: gateDecision.sha256,
          gate_hash: gateDecision.gate_hash,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAccessibleModal(false);
        await fetchPipeline();
        if (selectedItem) {
          setSelectedItem({
            ...selectedItem,
            estado: "listo_ingesta",
            version_aprobada: gateDecision.version,
            sha256_aprobado: gateDecision.sha256,
          });
        }
        await loadCockpitData(selectedId, gateDecision.version);
      } else {
        alert("Error al aprobar: " + (data.detail || data.error || "Desconocido"));
        await loadCockpitData(selectedId, gateDecision.version);
      }
    } catch (err: any) {
      alert("Error de red: " + err.message);
    } finally {
      setApprovingVersion(false);
      setHoldProgress(0);
      setIsHolding(false);
    }
  };

  const [resolvingAudioIncident, setResolvingAudioIncident] = useState(false);
  const [audioIncidentError, setAudioIncidentError] = useState<string | null>(null);

  // Abrir Modal de Resolución de Incidente de Audio (nunca retorna silenciosamente)
  const handleOpenAudioResolveModal = async () => {
    if (!selectedId) return;
    setAudioIncidentError(null);
    setResolvingAudioIncident(true);

    try {
      let openInc = incidentes.find(
        (i) => (i.tipo === "audio_no_recuperable" || i.tipo === "audio_no_vinculado" || i.tipo === "audio_incompleto" || i.tipo === "audio_parcial") && i.estado !== "resuelto"
      );

      if (!openInc) {
        // Cargar incidentes actualizados del servidor
        const resInc = await fetch(`/api/revision/${selectedId}/incidentes`);
        if (resInc.ok) {
          const dataInc = await resInc.json();
          const list = dataInc.incidentes || [];
          setIncidentes(list);
          openInc = list.find(
            (i: Incidente) => (i.tipo === "audio_no_recuperable" || i.tipo === "audio_no_vinculado" || i.tipo === "audio_incompleto" || i.tipo === "audio_parcial") && i.estado !== "resuelto"
          );
        }
      }

      if (!openInc) {
        // Reportar inconsistencia y mostrar error recuperable si no existía registrado
        await fetch(`/api/revision/${selectedId}/incidentes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "audio_no_recuperable",
            severidad: "alta",
            origen: "mesa_revision_ui",
            evidencia: { motivo: "Inconsistencia detectada en UI de revisión sin incidente previo registrado" },
          }),
        });

        // Recargar incidentes
        const resInc2 = await fetch(`/api/revision/${selectedId}/incidentes`);
        if (resInc2.ok) {
          const dataInc2 = await resInc2.json();
          setIncidentes(dataInc2.incidentes || []);
        }
      }

      setShowAudioResolveModal(true);
    } catch (err: any) {
      setAudioIncidentError("Error al verificar incidentes de audio: " + err.message);
    } finally {
      setResolvingAudioIncident(false);
    }
  };

  // Resolver Incidente con Código Específico
  const handleResolveAudioIncident = async () => {
    if (!selectedId) return;
    setResolvingAudioIncident(true);
    setAudioIncidentError(null);

    const incAudio = incidentes.find(
      (i) => (i.tipo === "audio_no_recuperable" || i.tipo === "audio_no_vinculado" || i.tipo === "audio_incompleto" || i.tipo === "audio_parcial") && i.estado !== "resuelto"
    );

    if (!incAudio) {
      setAudioIncidentError("No existe un incidente de audio abierto para resolver en este volcado.");
      setResolvingAudioIncident(false);
      return;
    }

    try {
      const res = await fetch(`/api/revision/${selectedId}/incidentes/${incAudio.id}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoResolucion: selectedAudioResolveCode,
        }),
      });

      const data = await res.json().catch(() => ({ detail: "Respuesta no-JSON del servidor" }));

      if (res.ok) {
        setShowAudioResolveModal(false);
        await fetchPipeline();
        await loadCockpitData(selectedId, selectedVersionNum);
      } else {
        setAudioIncidentError(`Error HTTP ${res.status}: ${data.detail || data.error || "Desconocido"}`);
      }
    } catch (err: any) {
      setAudioIncidentError("Error de red: " + err.message);
    } finally {
      setResolvingAudioIncident(false);
    }
  };

  const handleIngestApproved = async () => {
    if (!selectedItem || !selectedItem.version_aprobada || !selectedItem.sha256_aprobado) return;
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
        await fetchPipeline();
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

  const activeHallazgo = hallazgos[activeHallazgoIndex];

  // Render highlighted prose text securely without dangerouslySetInnerHTML
  const renderProseConResalte = (textoFuente: string, hallazgoActual?: Hallazgo) => {
    if (!hallazgoActual || hallazgoActual.posicion.inicio === undefined) {
      return <span>{textoFuente}</span>;
    }

    const start = hallazgoActual.posicion.inicio;
    const end = hallazgoActual.posicion.fin;

    if (start < 0 || end > textoFuente.length || start >= end) {
      return <span>{textoFuente}</span>;
    }

    const antes = textoFuente.slice(0, start);
    const marcado = textoFuente.slice(start, end);
    const despues = textoFuente.slice(end);

    return (
      <span className="font-serif leading-relaxed text-base">
        {antes}
        <mark className="bg-amber-400/30 text-amber-200 px-1 py-0.5 rounded font-bold underline decoration-amber-400">
          {marcado}
        </mark>
        {despues}
      </span>
    );
  };

  const filteredPipelineItems = pipelineItems.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titulo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.folio ? String(item.folio).includes(searchQuery) : false) ||
      (item.session_id || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "todos") return true;
    if (filter === "attention") return item.audio_status !== "disponible" || item.estado === "fallido";
    if (filter === "revision") return item.estado === "en_revision" || item.estado === "pendiente_revision";
    if (filter === "listos") return item.estado === "listo_ingesta";
    if (filter === "ingeridos") return item.estado === "ingerido";

    return true;
  });

  return (
    <div
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-6"
      style={{ color: "var(--khora-ink)", paddingBottom: "6rem" }}
    >
      {/* Header section */}
      <div className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ borderColor: "var(--khora-border)" }}>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icons.Layers size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
            Mesa de Revisión Sincrónica
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--khora-accent)" }}>
            Lectura cómoda, sincronización audio ↔ texto, corrección lingüística y compuerta de aprobación autoritativa.
          </p>
        </div>
      </div>

      <div className="space-y-6">
          {/* Summary Cards */}
          {resumen && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 border flex flex-col justify-between bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Total volcados</span>
                <span className="text-2xl font-bold mt-1">{resumen.total}</span>
              </div>
              <div className="p-3 border flex flex-col justify-between bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">En revisión</span>
                <span className="text-2xl font-bold mt-1" style={{ color: "var(--khora-accent)" }}>
                  {resumen.en_revision + resumen.pendiente_revision}
                </span>
              </div>
              <div className="p-3 border flex flex-col justify-between bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Listos / Ingesta</span>
                <span className="text-2xl font-bold mt-1 text-amber-500">{resumen.listo_ingesta}</span>
              </div>
              <div className="p-3 border flex flex-col justify-between bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Grafo / Ingeridos</span>
                <span className="text-2xl font-bold mt-1 text-emerald-500">{resumen.ingerido}</span>
              </div>
              <div className="p-3 border flex flex-col justify-between col-span-2 md:col-span-1 bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Incidentes Abiertos</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-red-500">{gateDecision?.counts?.incidentes_operativos_abiertos ?? resumen.anomalies}</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilter("todos")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer"
                style={{
                  backgroundColor: filter === "todos" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "todos" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter("revision")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer"
                style={{
                  backgroundColor: filter === "revision" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "revision" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Revisión
              </button>
              <button
                onClick={() => setFilter("listos")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer"
                style={{
                  backgroundColor: filter === "listos" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "listos" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Listos
              </button>
              <button
                onClick={() => setFilter("ingeridos")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer"
                style={{
                  backgroundColor: filter === "ingeridos" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "ingeridos" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Ingeridos
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por Folio, UUID, Titulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-8 pr-3 py-1.5 text-xs border rounded-none focus:outline-none"
                style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)", color: "var(--khora-ink)" }}
              />
              <Icons.Search className="absolute left-2.5 top-2.5 text-xs opacity-60 w-3.5 h-3.5" />
            </div>
          </div>

          {/* Master Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
            {/* Left Column Index */}
            <div className={`lg:col-span-4 flex flex-col space-y-2 ${mobileShowDetail ? "hidden lg:flex" : "flex"}`}>
              {filteredPipelineItems.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => selectVolcadoItem(item.id)}
                    className={`p-3 border cursor-pointer flex flex-col space-y-1.5 rounded-none transition-all ${
                      isSelected ? "bg-zinc-800/40 ring-1 ring-[var(--khora-accent)]" : "bg-[var(--khora-surface)]"
                    }`}
                    style={{ borderColor: isSelected ? "var(--khora-accent)" : "var(--khora-border)" }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.folio && (
                          <span className="font-mono text-[10px] px-1 py-0.5 bg-zinc-800 text-amber-400 font-bold shrink-0">
                            #{item.folio}
                          </span>
                        )}
                        <h3 className="font-bold text-xs truncate">{item.titulo || "Sin título"}</h3>
                      </div>
                      <span className="text-[9px] font-mono border px-1 uppercase opacity-80">{item.estado}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      {renderAudioStatusBadge(item.audio_status)}
                      <span className="opacity-60">{new Date(item.recibido_en).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column Synchronous Revision Cockpit */}
            <div className={`lg:col-span-8 flex flex-col space-y-4 ${!mobileShowDetail ? "hidden lg:flex" : "flex"}`}>
              {selectedId && selectedItem ? (
                <div ref={drawerRef} className="border p-5 flex flex-col space-y-6 h-full bg-zinc-950/60" style={{ borderColor: "var(--khora-border)" }}>
                  {/* Cockpit Header Bar with Progress */}
                  <div className="border-b pb-4 space-y-3" style={{ borderColor: "var(--khora-border)" }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">Mesa de Revisión Sincrónica</span>
                        <h2 className="text-base font-bold font-mono flex items-center gap-2">
                          {selectedItem.folio ? `Folio #${selectedItem.folio} — ` : ""}{selectedItem.titulo || selectedItem.id}
                          <button
                            onClick={handleRegenerarTitulo}
                            disabled={generatingTitle}
                            title="Regenerar título con IA"
                            className="p-1 hover:bg-zinc-800 rounded text-amber-400 cursor-pointer"
                          >
                            <Icons.Sparkles size={14} />
                          </button>
                        </h2>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDrawerSubTab("cockpit")}
                          className="px-3 py-1 text-xs font-mono uppercase border cursor-pointer"
                          style={{
                            backgroundColor: drawerSubTab === "cockpit" ? "var(--khora-accent)" : "transparent",
                            color: drawerSubTab === "cockpit" ? "var(--khora-bg)" : "var(--khora-ink)",
                          }}
                        >
                          Cockpit
                        </button>
                        <button
                          onClick={() => setDrawerSubTab("trace")}
                          className="px-3 py-1 text-xs font-mono uppercase border cursor-pointer"
                          style={{
                            backgroundColor: drawerSubTab === "trace" ? "var(--khora-accent)" : "transparent",
                            color: drawerSubTab === "trace" ? "var(--khora-bg)" : "var(--khora-ink)",
                          }}
                        >
                          Trace
                        </button>
                      </div>
                    </div>

                    {/* Category Counters Header */}
                    {gateDecision?.counts && (
                      <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono pt-2">
                        <div className="p-2 border bg-zinc-900/60 border-zinc-800">
                          <div className="opacity-60 text-[9px] uppercase">Tipografía</div>
                          <div className="font-bold text-amber-400">{gateDecision.counts.errores_tipograficos_pendientes}</div>
                        </div>
                        <div className="p-2 border bg-zinc-900/60 border-zinc-800">
                          <div className="opacity-60 text-[9px] uppercase">Lingüística</div>
                          <div className="font-bold text-sky-400">{gateDecision.counts.correcciones_lingüisticas_pendientes}</div>
                        </div>
                        <div className="p-2 border bg-zinc-900/60 border-zinc-800">
                          <div className="opacity-60 text-[9px] uppercase">Sintaxis</div>
                          <div className="font-bold text-purple-400">{gateDecision.counts.observaciones_sintacticas_pendientes}</div>
                        </div>
                        <div className="p-2 border bg-zinc-900/60 border-zinc-800">
                          <div className="opacity-60 text-[9px] uppercase">Incidentes</div>
                          <div className="font-bold text-red-400">{gateDecision.counts.incidentes_operativos_abiertos}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {drawerSubTab === "cockpit" ? (
                    <div className="flex-1 space-y-6">
                      {/* Audio Resolution Banner if audio is unrecoverable or unlinked */}
                      {(selectedItem.audio_status === "no_recuperable" || selectedItem.audio_status === "encontrado_no_vinculado" || selectedItem.audio_status === "incompleto") && (
                        <div className="p-3 border border-red-500/40 bg-red-950/20 text-xs font-mono flex justify-between items-center">
                          <div className="text-red-300">
                            🔴 Causa de audio detectada: {selectedItem.audio_status}. Se requiere resolución explícita del operador para habilitar la aprobación.
                          </div>
                          <button
                            onClick={handleOpenAudioResolveModal}
                            disabled={resolvingAudioIncident}
                            className="px-3 py-1 bg-red-600 text-white font-bold hover:bg-red-500 cursor-pointer text-xs disabled:opacity-50"
                          >
                            {resolvingAudioIncident ? "Cargando..." : "Resolver Incidente Audio"}
                          </button>
                        </div>
                      )}

                      {/* Main Reading Column (68-76 chars) and Lateral Drawer */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Reading Column */}
                        <div className="lg:col-span-8 space-y-3">
                          <div className="flex justify-between items-center text-xs font-mono opacity-60 uppercase">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setViewMode("lectura")}
                                className={`px-2 py-0.5 border ${viewMode === "lectura" ? "bg-amber-400 text-zinc-950 font-bold" : ""}`}
                              >
                                Modo Lectura
                              </button>
                              <button
                                onClick={() => setViewMode("edicion")}
                                className={`px-2 py-0.5 border ${viewMode === "edicion" ? "bg-amber-400 text-zinc-950 font-bold" : ""}`}
                              >
                                Modo Edición
                              </button>
                            </div>
                            <span>{editableTexto.length} car</span>
                          </div>

                          {viewMode === "lectura" ? (
                            <div className="p-6 border bg-zinc-900/40 border-zinc-800 rounded-none max-w-prose min-h-[280px]">
                              {renderProseConResalte(editableTexto, activeHallazgo)}
                            </div>
                          ) : (
                            <textarea
                              value={editableTexto}
                              onChange={(e) => setEditableTexto(e.target.value)}
                              rows={12}
                              className="w-full p-4 border font-mono text-sm leading-relaxed rounded-none focus:outline-none focus:ring-1 focus:ring-[var(--khora-accent)] max-w-prose"
                              style={{
                                backgroundColor: "var(--khora-bg)",
                                color: "var(--khora-ink)",
                                borderColor: "var(--khora-border)",
                              }}
                            />
                          )}

                          <div className="flex justify-between items-center pt-1">
                            <button
                              onClick={handleSaveEdits}
                              disabled={savingVersion || !editableTexto.trim()}
                              className="px-4 py-2 border font-mono text-xs font-bold bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 cursor-pointer flex items-center gap-1.5"
                            >
                              <Icons.Save size={14} />
                              {savingVersion ? "Guardando..." : "Guardar Nueva Versión"}
                            </button>
                          </div>
                        </div>

                        {/* Side Panel: Interactive Findings Navigation */}
                        <div className="lg:col-span-4 space-y-4">
                          <h3 className="text-xs font-mono uppercase font-bold tracking-wider opacity-70 border-b pb-1">
                            Navegador de Hallazgos ({hallazgos.length > 0 ? `${activeHallazgoIndex + 1} de ${hallazgos.length}` : "0 de 0"})
                          </h3>

                          {hallazgos.length > 0 && activeHallazgo ? (
                            <div className="p-3 border bg-zinc-900 border-zinc-800 space-y-3 font-mono text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-amber-300">{activeHallazgo.regla}</span>
                                <span className="uppercase text-[9px] border px-1 border-amber-500/40">{activeHallazgo.tipo_categoria}</span>
                              </div>

                              <div className="space-y-1">
                                <div className="text-zinc-400">Texto original: <strong className="text-red-400">"{activeHallazgo.texto_original}"</strong></div>
                                <div className="text-zinc-300">Sugerencia: <strong className="text-emerald-400">"{activeHallazgo.sugerencia}"</strong></div>
                                {activeHallazgo.explicacion && <p className="text-[11px] opacity-70 italic">{activeHallazgo.explicacion}</p>}
                              </div>

                              {/* Findings Navigation Controls */}
                              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setActiveHallazgoIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={activeHallazgoIndex === 0}
                                    className="p-1 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                                  >
                                    <Icons.ChevronLeft size={14} />
                                  </button>
                                  <button
                                    onClick={() => setActiveHallazgoIndex((prev) => Math.min(hallazgos.length - 1, prev + 1))}
                                    disabled={activeHallazgoIndex >= hallazgos.length - 1}
                                    className="p-1 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                                  >
                                    <Icons.ChevronRight size={14} />
                                  </button>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleResolveHallazgo("rechazar")}
                                    className="px-2 py-1 bg-red-950 text-red-300 border border-red-800 font-bold cursor-pointer text-[11px]"
                                  >
                                    Rechazar
                                  </button>
                                  <button
                                    onClick={() => handleResolveHallazgo("aceptar")}
                                    className="px-2 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold cursor-pointer text-[11px]"
                                  >
                                    Aceptar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 border bg-zinc-900/40 border-zinc-800 text-xs font-mono opacity-50 italic">
                              Sin hallazgos pendientes en esta versión.
                            </div>
                          )}

                          {/* Blockers List */}
                          {gateDecision && gateDecision.blockers.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono text-red-400 uppercase font-bold">Bloqueadores de Aprobación:</span>
                              {gateDecision.blockers.map((b, idx) => (
                                <div key={idx} className="p-2 border border-red-800/60 bg-red-950/30 text-xs font-mono text-red-300">
                                  ❌ {b.message}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sticky Bottom Audio Player Bar */}
                      <div className="p-3 border bg-zinc-900 border-zinc-800 space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="font-bold flex items-center gap-1">
                            <Icons.Volume2 size={14} /> Reproductor de Audio (Parte {currentPartIndex} / {manifiestoPartes.length || 1})
                          </span>
                          {renderAudioStatusBadge(selectedItem.audio_status)}
                        </div>

                        {selectedItem.audio_status !== "no_recuperable" && selectedItem.audio_status !== "no_aplica" ? (
                          <div className="space-y-2">
                            <audio
                              ref={audioRef}
                              src={audioSourceUrl}
                              controls
                              preload="metadata"
                              className="w-full h-8"
                            />
                            {manifiestoPartes.length > 1 && (
                              <div className="flex justify-between items-center text-xs font-mono">
                                <button
                                  disabled={currentPartIndex <= 1}
                                  onClick={() => {
                                    const nextIdx = currentPartIndex - 1;
                                    setCurrentPartIndex(nextIdx);
                                    if (manifiestoPartes[nextIdx - 1]) {
                                      setAudioSourceUrl(manifiestoPartes[nextIdx - 1].download_path);
                                    }
                                  }}
                                  className="px-2 py-1 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40"
                                >
                                  Parte anterior
                                </button>
                                <span>Parte {currentPartIndex} de {manifiestoPartes.length}</span>
                                <button
                                  disabled={currentPartIndex >= manifiestoPartes.length}
                                  onClick={() => {
                                    const nextIdx = currentPartIndex + 1;
                                    setCurrentPartIndex(nextIdx);
                                    if (manifiestoPartes[nextIdx - 1]) {
                                      setAudioSourceUrl(manifiestoPartes[nextIdx - 1].download_path);
                                    }
                                  }}
                                  className="px-2 py-1 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40"
                                >
                                  Parte siguiente
                                </button>
                              </div>
                            )}
                            <div className="text-[11px] font-mono text-zinc-400">
                              {palabrasTiming.length > 0 ? `Sincronizado (${palabrasTiming.length} marcas)` : "sin marcas temporales"}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-mono opacity-60 italic">Audio no disponible para reproducción.</div>
                        )}
                      </div>

                      {/* Authoritative Approval Section with High Friction */}
                      <div className="p-4 border bg-zinc-900/60 border-zinc-800 space-y-4 font-mono">
                        <div className="flex justify-between items-center border-b pb-2 border-zinc-800">
                          <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider">Compuerta de Aprobación Server-Side</h4>
                            <span className="text-[10px] opacity-60">hash: {gateDecision?.gate_hash || "evaluando..."}</span>
                          </div>

                          {selectedItem.estado === "listo_ingesta" || selectedItem.estado === "ingerido" ? (
                            <span className="text-xs font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-950/40 px-2 py-1">
                              ✓ APROBADO v{selectedItem.version_aprobada}
                            </span>
                          ) : (
                            <span className={`text-xs font-bold px-2 py-1 border ${gateDecision?.canApprove ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/40" : "text-red-400 border-red-500/40 bg-red-950/40"}`}>
                              {gateDecision?.canApprove ? "Habilitado para Aprobación" : "Bloqueado"}
                            </span>
                          )}
                        </div>

                        {/* Actions line */}
                        {selectedItem.estado !== "listo_ingesta" && selectedItem.estado !== "ingerido" && (
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3 items-center">
                              {/* Continuous Hold Button (2 Seconds) */}
                              <button
                                onMouseDown={startHolding}
                                onMouseUp={stopHolding}
                                onMouseLeave={stopHolding}
                                onTouchStart={startHolding}
                                onTouchEnd={stopHolding}
                                disabled={!gateDecision?.canApprove || approvingVersion}
                                className="relative overflow-hidden w-full sm:w-2/3 py-3 font-bold text-xs border uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                style={{
                                  backgroundColor: "var(--khora-accent)",
                                  color: "var(--khora-bg)",
                                  borderColor: "var(--khora-accent)",
                                }}
                              >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                  <Icons.CheckCircle size={16} />
                                  {approvingVersion
                                    ? "Aprobando..."
                                    : isHolding
                                    ? `Mantén presionado (${holdProgress}%)`
                                    : `Mantén presionado 2s para Aprobar v${selectedVersionNum}`}
                                </span>
                                <div
                                  className="absolute left-0 top-0 bottom-0 bg-emerald-400/50 transition-all duration-75"
                                  style={{ width: `${holdProgress}%` }}
                                />
                              </button>

                              {/* Accessible Modal Alternative */}
                              <button
                                onClick={() => setShowAccessibleModal(true)}
                                disabled={!gateDecision?.canApprove || approvingVersion}
                                className="w-full sm:w-1/3 py-3 border font-semibold text-xs uppercase tracking-wider border-zinc-700 bg-zinc-800 hover:bg-zinc-700 cursor-pointer disabled:opacity-40"
                              >
                                Alternativa Teclado
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Single Ingestion Action */}
                        {(selectedItem.estado === "listo_ingesta" || selectedItem.version_aprobada) && (
                          <div className="pt-2 border-t border-zinc-800 space-y-2">
                            <button
                              onClick={handleIngestApproved}
                              disabled={ingesting}
                              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              {ingesting ? "Ingiriendo en Grafo..." : "Ingerir versión aprobada"}
                            </button>

                            {ingestaResult && (
                              <div className={`p-2.5 text-xs font-mono border ${ingestaResult.success ? "border-emerald-600 bg-emerald-950/60 text-emerald-300" : "border-red-600 bg-red-950/60 text-red-300"}`}>
                                {ingestaResult.success ? `✓ Ingesta exitosa — io_id: ${ingestaResult.io_id}` : `Error: ${ingestaResult.error}`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* TRACE SUBTAB */
                    <div className="space-y-4 font-mono text-xs">
                      <div className="p-3 border bg-zinc-950/40 border-zinc-800 space-y-2">
                        <span className="text-[10px] uppercase tracking-wider opacity-60 block">Metadatos de Sesión</span>
                        <div>UUID: {selectedItem.id}</div>
                        <div>Folio: #{selectedItem.folio || "N/A"}</div>
                        <div>Versión Aprobada: {selectedItem.version_aprobada ? `v${selectedItem.version_aprobada}` : "Ninguna"}</div>
                        <div>SHA256: {selectedItem.sha256_aprobado || "N/A"}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border p-8 text-center text-xs opacity-60 flex items-center justify-center h-full">
                  Selecciona un volcado para abrir la Mesa de Revisión.
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Audio Resolution Modal */}
      {showAudioResolveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="border p-6 max-w-md w-full bg-zinc-950 border-zinc-700 space-y-4 font-mono text-xs">
            <h3 className="text-sm font-bold uppercase text-red-400">Resolución de Incidente de Audio</h3>
            <p className="text-zinc-300">
              Selecciona la causa explícita para resolver la ausencia de audio en este volcado:
            </p>
            <select
              value={selectedAudioResolveCode}
              onChange={(e) => setSelectedAudioResolveCode(e.target.value)}
              className="w-full p-2 border bg-zinc-900 border-zinc-700 text-zinc-200"
            >
              <option value="aceptado_sin_audio">aceptado_sin_audio (Aceptar conscientemente sin audio)</option>
              <option value="audio_recuperado">audio_recuperado (Audio recuperado)</option>
              <option value="captura_irrecuperable_confirmada">captura_irrecuperable_confirmada (Irrecuperable confirmado)</option>
              <option value="falso_positivo">falso_positivo (Falso positivo)</option>
            </select>
            {audioIncidentError && (
              <div className="p-2 border border-red-600 bg-red-950/60 text-red-300">
                {audioIncidentError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAudioResolveModal(false)} className="px-3 py-1.5 border border-zinc-700">Cancelar</button>
              <button
                onClick={handleResolveAudioIncident}
                disabled={resolvingAudioIncident}
                className="px-3 py-1.5 bg-red-600 text-white font-bold disabled:opacity-50"
              >
                {resolvingAudioIncident ? "Resolviendo..." : "Resolver Incidente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Approval Modal */}
      {showAccessibleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="border p-6 max-w-md w-full bg-zinc-950 border-zinc-700 space-y-4 font-mono text-xs">
            <h3 className="text-sm font-bold uppercase text-amber-400">Confirmación Accesible de Aprobación</h3>
            <p className="text-zinc-300">
              Escribe exactamente <strong className="text-emerald-400">APROBAR v{selectedVersionNum}</strong> para confirmar la autorización:
            </p>
            <input
              type="text"
              value={accessibleConfirmText}
              onChange={(e) => setAccessibleConfirmText(e.target.value)}
              placeholder={`APROBAR v${selectedVersionNum}`}
              className="w-full p-2 border bg-zinc-900 border-zinc-700 text-zinc-100"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAccessibleModal(false)} className="px-3 py-1.5 border border-zinc-700">Cancelar</button>
              <button
                disabled={accessibleConfirmText !== `APROBAR v${selectedVersionNum}` || approvingVersion}
                onClick={executeApproval}
                className="px-4 py-1.5 bg-emerald-500 text-zinc-950 font-bold disabled:opacity-40"
              >
                {approvingVersion ? "Aprobando..." : "Confirmar Aprobación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
