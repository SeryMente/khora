// @l0 L0-002-R · @req PIPELINE/REQ-3,UI-02/RESKIN,UI-PIPELINE-FIX/REQ-1 · @acr ACR-1.2 · @req TRACE-SESSION/010
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import * as Icons from "lucide-react";

type PipelineItem = {
  id: string;
  folio: number | null;
  session_id: string | null;
  session_estado: string | null;
  audio_status: "disponible" | "encontrado_no_vinculado" | "incompleto" | "no_recuperable";
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

type Par = {
  antes: string;
  despues: string;
};

export default function VolcadosPage() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "volcados">("pipeline");

  // Pipeline states
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [filter, setFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item in Drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [drawerSubTab, setDrawerSubTab] = useState<"trace" | "revision">("trace");

  // Revision / Editor states
  const [editableTexto, setEditableTexto] = useState("");
  const [versiones, setVersiones] = useState<any[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [savingVersion, setSavingVersion] = useState(false);
  const [approvingVersion, setApprovingVersion] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestaResult, setIngestaResult] = useState<any>(null);

  // Delta states
  const [selectedDeltaFrom, setSelectedDeltaFrom] = useState<number>(1);
  const [deltaPairs, setDeltaPairs] = useState<Par[]>([]);
  const [loadingDelta, setLoadingDelta] = useState(false);

  // Volcados archiving tab states
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [guardandoVolcado, setGuardandoVolcado] = useState(false);
  const [volcadosError, setVolcadosError] = useState<string | null>(null);
  const [volcadosAviso, setVolcadosAviso] = useState<string | null>(null);
  const [volcadosItems, setVolcadosItems] = useState<Volcado[]>([]);

  // Drawer focus trap ref
  const drawerRef = useRef<HTMLDivElement>(null);

  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Theme support local state
  const [themeMode, setThemeMode] = useState("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("khora-theme");
      if (stored) setThemeMode(stored);
    }
  }, []);

  // Helper for rendering Audio Status Badges
  const renderAudioStatusBadge = (status: string) => {
    switch (status) {
      case "disponible":
        return <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-1">🟢 Audio disponible</span>;
      case "encontrado_no_vinculado":
        return <span className="text-yellow-400 font-semibold text-[10px] flex items-center gap-1">🟡 Audio no vinculado</span>;
      case "incompleto":
case "incompleto":
case "audio_parcial":
case "audio_partial":
  return <span className="text-amber-500 font-semibold text-[10px] flex items-center gap-1">🟠 Audio incompleto</span>;
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
        const items = data.volcados || data.items || [];
        setPipelineItems(items);
        setResumen({
          total: data.total ?? data.resumen?.total ?? 0,
          en_revision: data.counts?.en_revision ?? data.resumen?.en_revision ?? 0,
          pendiente_revision: data.counts?.pendiente_revision ?? data.resumen?.pendiente_revision ?? 0,
          listo_ingesta: data.counts?.listo_ingesta ?? data.resumen?.listo_ingesta ?? 0,
          ingerido: data.counts?.ingerido ?? data.resumen?.ingerido ?? 0,
          anomalies: data.integrity ? ((data.total ?? 0) - (data.integrity?.sync ?? 0)) : (data.resumen?.anomalies ?? 0),
          sin_audio: data.integrity?.text_without_audio ?? data.resumen?.sin_audio ?? 0,
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

  // Fetch Legacy Volcados list
  const fetchLegacyVolcados = useCallback(async () => {
    try {
      const res = await fetch("/api/volcado");
      const data = await res.json();
      if (res.ok) {
        setVolcadosItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const items = await fetchPipeline();
      if (items && items.length > 0 && !selectedId) {
        await selectVolcadoItem(items[0].id, true);
      }
    }
    void init();
    void fetchLegacyVolcados();
  }, [fetchPipeline, fetchLegacyVolcados]);

  // Handle volcado selection
  const selectVolcadoItem = async (id: string, skipMobileToggle?: boolean) => {
    setSelectedId(id);
    setIngestaResult(null);
    setDrawerSubTab("trace");
    setDeltaPairs([]);
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

        setSelectedDeltaFrom(Math.max(1, latestVersionNum - 1));
      } else {
        setVersiones([]);
        setEditableTexto("");
      }
    } catch (err) {
      console.error("Error loading versions:", err);
    }
  };

  const changeSelectedVersion = (vNum: number) => {
    setSelectedVersionNum(vNum);
    const ver = versiones.find((v) => v.version === vNum);
    if (ver) {
      setEditableTexto(ver.texto || "");
    }
    setSelectedDeltaFrom(Math.max(1, vNum - 1));
    setDeltaPairs([]);
  };

  const fetchDeltaDiff = async () => {
    if (!selectedId || !selectedVersionNum) return;
    setLoadingDelta(true);
    try {
      const res = await fetch(
        `/api/revision/delta?id=${selectedId}&from=${selectedDeltaFrom}&to=${selectedVersionNum}`
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.pares)) {
        setDeltaPairs(data.pares);
      } else {
        setDeltaPairs([]);
      }
    } catch (err) {
      console.error("Error fetching delta diff:", err);
    } finally {
      setLoadingDelta(false);
    }
  };

  useEffect(() => {
    if (selectedId && selectedVersionNum) {
      void fetchDeltaDiff();
    }
  }, [selectedVersionNum, selectedDeltaFrom, selectedId]);

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

  const handleApproveVersion = async () => {
    if (!selectedId || !selectedVersionNum) return;
    const currentVer = versiones.find((v) => Number(v.version) === Number(selectedVersionNum));
    if (!currentVer) return;

    setApprovingVersion(true);
    try {
      const res = await fetch(`/api/revision/${selectedId}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: selectedVersionNum,
          sha256: currentVer.sha256,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchPipeline();
        if (selectedItem) {
          setSelectedItem({
            ...selectedItem,
            estado: "listo_ingesta",
            version_aprobada: selectedVersionNum,
            sha256_aprobado: currentVer.sha256,
          });
        }
      } else {
        alert("Error al aprobar: " + (data.error || data.detail || "Desconocido"));
      }
    } catch (err: any) {
      alert("Error de red: " + err.message);
    } finally {
      setApprovingVersion(false);
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

  useEffect(() => {
    if (!selectedId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setSelectedItem(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  const filteredPipelineItems = pipelineItems.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titulo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.folio ? String(item.folio).includes(searchQuery) : false) ||
      (item.session_id || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "todos") return true;
    if (filter === "attention") {
      return item.audio_status !== "disponible" || item.estado === "fallido";
    }
    if (filter === "archivados") return item.estado === "archivado";
    if (filter === "revision") return item.estado === "en_revision" || item.estado === "pendiente_revision";
    if (filter === "listos") return item.estado === "listo_ingesta";
    if (filter === "ingeridos") return item.estado === "ingerido";
    if (filter === "fallidos") return item.estado === "fallido";
    if (filter === "sin_audio") return item.audio_status === "no_recuperable";

    return true;
  });

  useEffect(() => {
    if (activeTab === "pipeline" && !loadingPipeline) {
      const stillExists = filteredPipelineItems.some((it) => it.id === selectedId);
      if (!stillExists && filteredPipelineItems.length > 0) {
        void selectVolcadoItem(filteredPipelineItems[0].id, true);
      } else if (filteredPipelineItems.length === 0) {
        setSelectedId(null);
        setSelectedItem(null);
      }
    }
  }, [filter, searchQuery, pipelineItems, activeTab, loadingPipeline]);

  const handleArchivarLegacy = async () => {
    if (texto.trim().length === 0) {
      setVolcadosError("no hay texto que archivar");
      return;
    }
    setGuardandoVolcado(true);
    setVolcadosError(null);
    setVolcadosAviso(null);
    try {
      const res = await fetch("/api/volcado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, titulo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVolcadosError((data.detail ?? "archivo fallido") + (data.causa ? " :: " + data.causa : ""));
        return;
      }
      setVolcadosAviso("archivado " + String(data.sha256).slice(0, 8) + " · " + data.chars + " caracteres");
      setTexto("");
      setTitulo("");
      await fetchLegacyVolcados();
      await fetchPipeline();
    } catch (e: any) {
      setVolcadosError(e?.message ?? String(e));
    } finally {
      setGuardandoVolcado(false);
    }
  };

  return (
    <div
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-6"
      style={{ color: "var(--khora-ink)", paddingBottom: "6rem" }}
    >
      {/* Header section with reskinned tokens */}
      <div className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ borderColor: "var(--khora-border)" }}>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icons.Layers size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
            Archivo de Volcados
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--khora-accent)" }}>
            Control de ingestas, correcciones de transcripción y trazabilidad completa de sesión y audio.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex border rounded-none overflow-hidden" style={{ borderColor: "var(--khora-border)" }}>
          <button
            onClick={() => setActiveTab("pipeline")}
            className="px-4 py-2 text-xs uppercase tracking-wider font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: activeTab === "pipeline" ? "var(--khora-accent)" : "transparent",
              color: activeTab === "pipeline" ? "var(--khora-bg)" : "var(--khora-ink)",
            }}
          >
            Pipeline Tower
          </button>
          <button
            onClick={() => setActiveTab("volcados")}
            className="px-4 py-2 text-xs uppercase tracking-wider font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: activeTab === "volcados" ? "var(--khora-accent)" : "transparent",
              color: activeTab === "volcados" ? "var(--khora-bg)" : "var(--khora-ink)",
            }}
          >
            Archivo Manual
          </button>
        </div>
      </div>

      {activeTab === "pipeline" ? (
        <div className="space-y-6">
          {/* CONTROL TOWER VIEW */}

          {/* Aggregated Counters summary cards */}
          {resumen && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div
                className="p-3 border flex flex-col justify-between"
                style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
              >
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Total volcados</span>
                <span className="text-2xl font-bold mt-1">{resumen.total}</span>
              </div>
              <div
                className="p-3 border flex flex-col justify-between"
                style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
              >
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">En revisión</span>
                <span className="text-2xl font-bold mt-1" style={{ color: "var(--khora-accent)" }}>
                  {resumen.en_revision + resumen.pendiente_revision}
                </span>
              </div>
              <div
                className="p-3 border flex flex-col justify-between"
                style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
              >
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Listos / Ingesta</span>
                <span className="text-2xl font-bold mt-1 text-amber-500">
                  {resumen.listo_ingesta}
                </span>
              </div>
              <div
                className="p-3 border flex flex-col justify-between"
                style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
              >
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Grafo / Ingeridos</span>
                <span className="text-2xl font-bold mt-1 text-emerald-500">
                  {resumen.ingerido}
                </span>
              </div>
              <div
                className="p-3 border flex flex-col justify-between col-span-2 md:col-span-1"
                style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
              >
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Atención / Anomalías</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-red-500">{resumen.anomalies}</span>
                  <span className="text-xs opacity-60">({resumen.sin_audio} sin audio)</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Oriented Filter Buttons & Search */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilter("todos")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity"
                style={{
                  backgroundColor: filter === "todos" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "todos" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter("attention")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity flex items-center gap-1"
                style={{
                  backgroundColor: filter === "attention" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "attention" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                <Icons.AlertCircle size={12} /> Requiere atención
              </button>
              <button
                onClick={() => setFilter("revision")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity"
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
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity"
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
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity"
                style={{
                  backgroundColor: filter === "ingeridos" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "ingeridos" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Ingeridos
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por Folio, UUID, Session..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-8 pr-3 py-1.5 text-xs border rounded-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
                style={{
                  backgroundColor: "var(--khora-surface)",
                  borderColor: "var(--khora-border)",
                  color: "var(--khora-ink)",
                }}
              />
              <Icons.Search className="absolute left-2.5 top-2.5 text-xs opacity-60 w-3.5 h-3.5" />
            </div>
          </div>

          {/* Layout Master-Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] items-stretch">
            {/* LEFT INDEX COLUMN */}
            <div className={`lg:col-span-5 flex flex-col space-y-3 ${mobileShowDetail ? "hidden lg:flex" : "flex"}`}>
              <div className="flex justify-between items-baseline border-b pb-1 mb-1" style={{ borderColor: "var(--khora-border)" }}>
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Volcados Disponibles</span>
                <span className="text-[10px] font-mono opacity-60">{filteredPipelineItems.length} items</span>
              </div>

              {loadingPipeline ? (
                <div className="p-8 text-center text-xs opacity-60 border" style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}>
                  Cargando torre de control de volcados...
                </div>
              ) : filteredPipelineItems.length === 0 ? (
                <div className="p-8 text-center text-xs opacity-60 border" style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}>
                  Ningún volcado coincide con el filtro activo.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[700px] pr-1">
                  {filteredPipelineItems.map((item) => {
                    const isSelected = selectedId === item.id;
                    const duration = item.audio?.duration_sec || item.duracion_seg || 0;
                    const partesNum = item.partes_count || 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => selectVolcadoItem(item.id)}
                        className={`p-3 border cursor-pointer transition-all flex flex-col space-y-2 rounded-none hover:bg-zinc-800/10 ${
                          isSelected ? "bg-zinc-800/30 ring-1 ring-[var(--khora-accent)]" : "bg-[var(--khora-surface)]"
                        }`}
                        style={{
                          borderColor: isSelected ? "var(--khora-accent)" : "var(--khora-border)"
                        }}
                      >
                        {/* Title / Folio / Id bar */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.folio && (
                                <span className="font-mono text-[10px] px-1 py-0.5 bg-zinc-800 border border-zinc-700 text-amber-400 font-bold shrink-0">
                                  #{item.folio}
                                </span>
                              )}
                              <h3 className="font-bold text-[11px] truncate">{item.titulo || "Sin título"}</h3>
                            </div>
                            <span className="text-[9px] font-mono opacity-50 block mt-0.5">UUID: {item.id}</span>
                          </div>
                          <span className="text-[9px] opacity-60 font-mono shrink-0">
                            {new Date(item.recibido_en).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Audio Status & Graph / Anomaly Badges Line */}
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/10 font-mono text-[10px]">
<div className="flex items-center justify-between pt-1 border-t border-zinc-800/10 font-mono text-[10px]">
  {renderAudioStatusBadge(item.audio_status || item.integrity)}
  <span className="opacity-70 text-[9px]">
    {item.nodos_count > 0 || item.aristas_count > 0 ? `${item.nodos_count}n / ${item.aristas_count}r · ` : ""}
    {partesNum} {partesNum === 1 ? "parte" : "partes"} · {duration}s
  </span>
</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT DETAIL COLUMN */}
            <div className={`lg:col-span-7 flex flex-col space-y-4 ${!mobileShowDetail ? "hidden lg:flex" : "flex"}`}>
              {selectedId && selectedItem ? (
                <div
                  ref={drawerRef}
                  className="border p-4 shadow-none flex flex-col space-y-6 h-full rounded-none"
                  style={{
                    backgroundColor: "var(--khora-surface)",
                    borderColor: "var(--khora-border)",
                  }}
                >
                  {/* Detail Header */}
                  <div className="border-b pb-3 flex justify-between items-center" style={{ borderColor: "var(--khora-border)" }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMobileShowDetail(false)}
                          className="lg:hidden p-1 mr-1 border rounded-none cursor-pointer"
                          style={{ borderColor: "var(--khora-border)" }}
                        >
                          <Icons.ChevronLeft className="w-4 h-4 text-zinc-400" />
                        </button>
                        <span className="text-[10px] font-mono tracking-widest uppercase opacity-60">
                          Trazabilidad Operacional y Audio
                        </span>
                      </div>
                      <h2 className="text-sm font-bold font-mono">
                        {selectedItem.folio ? `Folio #${selectedItem.folio} — ` : ""}{selectedItem.titulo || selectedItem.id}
                      </h2>
                    </div>

                    {/* Sub Tab Buttons */}
                    <div className="flex border rounded-none overflow-hidden shrink-0" style={{ borderColor: "var(--khora-border)" }}>
                      <button
                        onClick={() => setDrawerSubTab("trace")}
                        className="px-3 py-1.5 text-[10px] uppercase font-semibold cursor-pointer"
                        style={{
                          backgroundColor: drawerSubTab === "trace" ? "var(--khora-accent)" : "transparent",
                          color: drawerSubTab === "trace" ? "var(--khora-bg)" : "var(--khora-ink)",
                        }}
                      >
                        Trace
                      </button>
                      <button
                        onClick={() => setDrawerSubTab("revision")}
                        className="px-3 py-1.5 text-[10px] uppercase font-semibold cursor-pointer"
                        style={{
                          backgroundColor: drawerSubTab === "revision" ? "var(--khora-accent)" : "transparent",
                          color: drawerSubTab === "revision" ? "var(--khora-bg)" : "var(--khora-ink)",
                        }}
                      >
                        Revisión
                      </button>
                    </div>
                  </div>

                  {/* Detail Content */}
                  <div className="flex-1 space-y-6 overflow-y-auto">
                    {drawerSubTab === "trace" ? (
                      <div className="space-y-6">
                        {/* Audio and Session Metadata Box */}
                        <div className="p-3 border space-y-3 font-mono text-xs rounded-none bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
                          <div className="flex justify-between items-center border-b pb-1 border-zinc-800">
                            <span className="text-[10px] uppercase tracking-wider opacity-60">Estado de Audio</span>
                            {renderAudioStatusBadge(selectedItem.audio_status)}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div><span className="opacity-60">Folio:</span> #{selectedItem.folio || "N/A"}</div>
                            <div><span className="opacity-60">Session ID:</span> {selectedItem.session_id ? selectedItem.session_id.slice(0, 12) + "..." : "Sin sesión"}</div>
                            <div><span className="opacity-60">Estado Sesión:</span> {selectedItem.session_estado || "completo"}</div>
                            <div><span className="opacity-60">Partes:</span> {selectedItem.partes_count || 0}</div>
                            <div><span className="opacity-60">Bytes Audio:</span> {selectedItem.audio?.bytes || selectedItem.audio_bytes || 0} B</div>
                            <div><span className="opacity-60">Duración:</span> {selectedItem.audio?.duration_sec || selectedItem.duracion_seg || 0} seg</div>
                          </div>
                          {selectedItem.blob_paths && selectedItem.blob_paths.length > 0 && (
                            <div className="border-t pt-2 border-zinc-800 text-[10px] space-y-1">
                              <span className="opacity-60 block">Ruta(s) de Blobs:</span>
                              {selectedItem.blob_paths.map((p, idx) => (
                                <div key={idx} className="truncate text-zinc-400 bg-zinc-900/80 p-1 border border-zinc-800">{p}</div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* TRACE MAP */}
                        <div className="text-xs uppercase font-mono tracking-widest opacity-65 border-b pb-1 mb-2" style={{ borderColor: "var(--khora-border)" }}>
<div className="text-xs uppercase font-mono tracking-widest opacity-65 border-b pb-1 mb-2" style={{ borderColor: "var(--khora-border)" }}>
  Árbol de Trazabilidad (Traceability Tree Map)
</div>
                        </div>

                        <div className="relative pl-6 border-l-2 space-y-6" style={{ borderColor: "var(--khora-border)" }}>
                          {/* 🎙 CAPTURA */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}>
                              <Icons.Mic className="w-2.5 h-2.5 text-zinc-400" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-xs flex items-center gap-1.5">
                                🎙 Captura <span className="text-emerald-500">✓ Registrado</span>
                              </h4>
                              <div className="text-[11px] opacity-75 space-y-0.5 font-mono">
                                <div>Fecha: {new Date(selectedItem.recibido_en).toLocaleString()}</div>
                                <div>Session ID: {selectedItem.session_id || "N/A"}</div>
                              </div>
                            </div>
                          </div>

                          {/* 💾 ARCHIVO */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}>
                              <Icons.Save className="w-2.5 h-2.5 text-zinc-400" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-xs">
                                💾 Archivo <span className="text-emerald-500">✓ Persistido</span>
                              </h4>
                              <div className="text-[11px] opacity-75 space-y-0.5 font-mono">
                                <div>Total caracteres: {selectedItem.chars}</div>
                                <div>UUID: {selectedItem.id}</div>
                              </div>
                            </div>
                          </div>

                          {/* 📝 TRANSCRIPCION */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}>
                              <Icons.FileText className="w-2.5 h-2.5 text-zinc-400" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-xs">
<h4 className="font-bold text-xs">
  📝 Transcripción <span className="text-emerald-500">✓ Registrada</span>
</h4>
<div className="text-[11px] opacity-75 space-y-0.5 font-mono">
  <div>Versión actual: v{selectedItem.version_actual || 1}</div>
</div>
                            </div>
                          </div>

                          {/* ✓ APROBACION */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}>
                              <Icons.CheckCircle className="w-2.5 h-2.5 text-zinc-400" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-xs">
                                ✓ Aprobación{" "}
                                {selectedItem.version_aprobada ? (
                                  <span className="text-emerald-500">✓ Aprobado v{selectedItem.version_aprobada}</span>
                                ) : (
<span className="text-amber-500">○ Pendiente</span>
                                )}
                              </h4>
                            </div>
                          </div>

                          {/* ⚙ INGESTA */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}>
                              <Icons.Settings className="w-2.5 h-2.5 text-zinc-400" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-xs">
                                ⚙ Ingesta{" "}
                                {selectedItem.estado === "ingerido" ? (
                                  <span className="text-emerald-500">✓ Ingerido</span>
                                ) : selectedItem.estado === "fallido" ? (
                                  <span className="text-red-500">✕ Error en ingesta</span>
                                ) : (
                                  <span className="text-orange-500">○ En espera</span>
                                )}
                              </h4>
                            </div>
                          </div>

                          {/* ◎ GRAFO PKG PROYECCIONES */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}>
                              <Icons.Share2 className="w-2.5 h-2.5 text-zinc-400" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-xs">◎ Grafo PKG Proyecciones</h4>
                              <div className="text-[11px] opacity-75 font-mono">
                                Nodos: {selectedItem.nodos_count || 0} · Aristas: {selectedItem.aristas_count || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* REVISION AND EDIT VIEW */}
                        {!selectedItem.version_aprobada && (
                          <div className="p-2.5 bg-amber-900/30 text-amber-300 border border-amber-800/50 text-xs font-mono">
                            Bloqueado para Ingesta: Requiere aprobación explícita de versión.
                          </div>
                        )}

                        <div className="p-3 border space-y-2 rounded-none" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-border)" }}>
                          <div className="flex justify-between items-center text-[10px] font-mono tracking-wider opacity-60 uppercase">
                            <span>Reproducción de Audio</span>
                            {renderAudioStatusBadge(selectedItem.audio_status)}
                          </div>
                          {selectedItem.audio_status !== "no_recuperable" ? (
                            <div className="space-y-1.5">
                              <audio
                                src={`/api/audio/${selectedItem.id}`}
                                controls
                                preload="metadata"
                                className="w-full h-8"
                              />
                              <p className="text-[10px] opacity-70 font-mono">
                                Duración: {selectedItem.audio?.duration_sec || selectedItem.duracion_seg || 0} segundos · Partes: {selectedItem.partes_count || 1}
                              </p>
                            </div>
                          ) : (
                            <div className="text-red-400 italic text-xs">
                              Audio no disponible o inaccesible para reproducción.
                            </div>
                          )}
                        </div>

                        {/* Version Selector for edits */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono">Editar versión:</span>
                          <select
                            value={selectedVersionNum}
                            onChange={(e) => changeSelectedVersion(Number(e.target.value))}
                            className="p-1 border rounded-none text-xs font-mono"
                            style={{
                              backgroundColor: "var(--khora-bg)",
                              borderColor: "var(--khora-border)",
                              color: "var(--khora-ink)",
                            }}
                          >
                            {versiones.map((v) => (
                              <option key={v.version} value={v.version}>
                                Versión {v.version} {selectedItem.version_aprobada === v.version ? "★" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Editable Text Area */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono tracking-wider uppercase opacity-60 block">
                            Transcripción Editable
                          </label>
                          <textarea
                            value={editableTexto}
                            onChange={(e) => setEditableTexto(e.target.value)}
                            className="w-full p-2.5 border rounded-none font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
                            rows={8}
                            style={{
                              backgroundColor: "var(--khora-bg)",
                              color: "var(--khora-ink)",
                              borderColor: "var(--khora-border)",
                            }}
                          />
                        </div>

                        {/* Delta section */}
{deltaPairs.length > 0 && (
  <div className="space-y-1">
    <label className="text-[10px] font-mono tracking-wider uppercase opacity-60 block">
      Delta Changes
    </label>
    {deltaPairs.map((p, i) => (
      <div key={i} className="text-xs font-mono p-2 border border-zinc-800 bg-zinc-950/40">
        <div className="text-red-400">− {p.antes}</div>
        <div className="text-emerald-400">+ {p.despues}</div>
      </div>
    ))}
  </div>
)}

{/* Ingest warning if not approved */}
{selectedItem.estado !== "listo_ingesta" && selectedItem.estado !== "ingerido" && (
  <div className="text-amber-400 text-xs font-mono p-2 border border-amber-500/30 bg-amber-500/10">
    Bloqueado para Ingesta: Requiere aprobación explícita de versión.
  </div>
)}

{selectedItem.estado === "listo_ingesta" && (
  <button
    onClick={handleIngestApproved}
    disabled={ingesting}
    className="w-full py-2 border font-bold text-xs bg-emerald-500 text-zinc-950 border-emerald-400 hover:opacity-90"
  >
    {ingesting ? "Ingiriendo..." : "Ingerir versión aprobada"}
  </button>
)}

{selectedItem.estado === "ingerido" && (
  <div className="text-emerald-400 text-xs font-mono p-2 border border-emerald-500/30 bg-emerald-500/10">
    ✓ INGESTADO — io_id: {selectedItem.io_id || "Generado"}
  </div>
)}

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleSaveEdits}
                            disabled={savingVersion || !editableTexto.trim()}
                            className="px-3 py-2 border rounded-none font-semibold text-xs cursor-pointer flex items-center justify-center gap-1 bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 transition-colors"
                          >
                            <Icons.Save size={14} />
                            {savingVersion ? "Guardando..." : "Guardar versión"}
                          </button>

                          <button
                            onClick={handleApproveVersion}
                            disabled={approvingVersion || !selectedVersionNum}
                            className="px-3 py-2 border rounded-none font-semibold text-xs cursor-pointer flex items-center justify-center gap-1"
                            style={{
                              backgroundColor: "var(--khora-accent)",
                              color: "var(--khora-bg)",
                              borderColor: "var(--khora-accent)",
                            }}
                          >
                            <Icons.CheckCircle size={14} />
                            {approvingVersion ? "Aprobando..." : `Aprobar v${selectedVersionNum}`}
                          </button>
                        </div>

                        {/* Ingestion Action if Approved */}
                        {selectedItem.version_aprobada && (
                          <div className="p-3 border space-y-2 bg-emerald-950/20 border-emerald-800/40 text-xs font-mono">
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                              <span>✓ VERSIÓN APROBADA v{selectedItem.version_aprobada}</span>
                              {selectedItem.estado === "ingerido" && <span className="text-emerald-300">✓ INGESTADO</span>}
                            </div>

                            {selectedItem.io_id && (
                              <div className="text-[11px] text-emerald-300">
                                io_id: {selectedItem.io_id}
                              </div>
                            )}

                            <button
                              onClick={handleIngestApproved}
                              disabled={ingesting}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors"
                            >
                              {ingesting ? "Ingiriendo..." : "Ingerir en Grafo PKG"}
                            </button>

                            {ingestaResult && (
                              <div className={`p-2 text-[11px] border ${ingestaResult.success ? "border-emerald-600 bg-emerald-900/40 text-emerald-200" : "border-red-600 bg-red-900/40 text-red-200"}`}>
                                {ingestaResult.success ? `Ingesta completada. io_id: ${ingestaResult.io_id}` : `Error: ${ingestaResult.error}`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border p-8 text-center text-xs opacity-60 flex items-center justify-center h-full rounded-none" style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}>
                  Selecciona un volcado de la lista para ver su trazabilidad y operaciones.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ARCHIVE MANUAL & LEGACY INVENTORY VIEW */}
          <div className="lg:col-span-1 space-y-4">
            <div
              className="border p-4 space-y-4 rounded-none shadow-none"
              style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
            >
              <h3 className="text-xs uppercase tracking-widest font-bold border-b pb-1 opacity-70">
                Archivador Verbatim
              </h3>
              <input
                className="w-full p-2.5 border rounded-none text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
                style={{
                  backgroundColor: "var(--khora-bg)",
                  color: "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="titulo opcional"
                disabled={guardandoVolcado}
              />
              <textarea
                className="w-full p-2.5 border rounded-none font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
                style={{
                  backgroundColor: "var(--khora-bg)",
                  color: "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
                rows={10}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="pega aqui el volcado, tan largo como quieras"
                disabled={guardandoVolcado}
              />
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handleArchivarLegacy}
                  disabled={guardandoVolcado || texto.trim().length === 0}
                  className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold text-xs"
                  style={{
                    backgroundColor: "var(--khora-accent)",
                    color: "var(--khora-bg)",
                    borderColor: "var(--khora-accent)",
                  }}
                >
                  <Icons.Save size={14} />
                  {guardandoVolcado ? "archivando..." : "Archivar volcado"}
                </button>
                <span className="text-[10px] font-mono flex items-center gap-1 opacity-70">
                  <Icons.Type size={12} />
                  {texto.length} car
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="border p-4 rounded-none space-y-4" style={{ borderColor: "var(--khora-border)" }}>
              <div className="flex justify-between items-baseline border-b pb-1">
                <h3 className="text-xs uppercase tracking-widest font-bold opacity-70">
                  Inventario Histórico
                </h3>
                <span className="text-[10px] font-mono opacity-60">
                  {volcadosItems.length} items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--khora-border)" }}>
                      <th className="pb-2 font-semibold">Folio</th>
                      <th className="pb-2 font-semibold">Recibido</th>
                      <th className="pb-2 font-semibold">Título</th>
                      <th className="pb-2 font-semibold">Chars</th>
                      <th className="pb-2 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volcadosItems.map((v) => (
                      <tr key={v.id} className="border-b last:border-b-0">
                        <td className="py-2.5 font-mono">#{v.folio}</td>
                        <td className="py-2.5">{new Date(v.recibido_en).toLocaleDateString()}</td>
                        <td className="py-2.5 truncate max-w-[150px] font-semibold">{v.titulo || "—"}</td>
                        <td className="py-2.5 font-mono">{v.chars}</td>
                        <td className="py-2.5">
                          <span className="border border-zinc-700 bg-zinc-800/40 text-[10px] font-mono px-1 py-0.5">
                            {v.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
