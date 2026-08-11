// @l0 L0-002-R · @req PIPELINE/REQ-3,UI-02/RESKIN · @acr ACR-1.2
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import * as Icons from "lucide-react";

type PipelineItem = {
  id: string;
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
};

type Volcado = {
  id: string;
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
  const [selectedLegacyVolcado, setSelectedLegacyVolcado] = useState<Volcado | null>(null);

  // Drawer focus trap ref
  const drawerRef = useRef<HTMLDivElement>(null);

  // Theme support local state
  const [themeMode, setThemeMode] = useState("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("khora-theme");
      if (stored) setThemeMode(stored);
    }
  }, []);

  // Fetch Pipeline Data
  const fetchPipeline = useCallback(async () => {
    setLoadingPipeline(true);
    try {
      const res = await fetch("/api/volcados/pipeline");
      const data = await res.json();
      if (res.ok) {
        setPipelineItems(data.items || []);
        setResumen(data.resumen || null);
      }
    } catch (err) {
      console.error("Error loading pipeline:", err);
    } finally {
      setLoadingPipeline(false);
    }
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
    void fetchPipeline();
    void fetchLegacyVolcados();
  }, [fetchPipeline, fetchLegacyVolcados]);

  // Handle volcado selection
  const selectVolcadoItem = async (id: string) => {
    setSelectedId(id);
    setIngestaResult(null);
    setDrawerSubTab("trace");
    setDeltaPairs([]);

    // Find in current pipeline items
    const item = pipelineItems.find((i) => i.id === id);
    if (item) {
      setSelectedItem(item);
    }

    // Load versions
    try {
      const res = await fetch("/api/versiones?id=" + id);
      const data = await res.json();
      if (res.ok && Array.isArray(data.versiones)) {
        setVersiones(data.versiones);
        // Default to editing the latest available version
        const latestVersionNum = data.versiones.reduce((max: number, v: any) => Math.max(max, Number(v.version)), 1);
        setSelectedVersionNum(latestVersionNum);

        const activeVer = data.versiones.find((v: any) => Number(v.version) === latestVersionNum);
        if (activeVer) {
          setEditableTexto(activeVer.texto || "");
        }

        // Set from-version for delta calculations (default to predecessor)
        setSelectedDeltaFrom(Math.max(1, latestVersionNum - 1));
      } else {
        setVersiones([]);
        setEditableTexto("");
      }
    } catch (err) {
      console.error("Error loading versions:", err);
    }
  };

  // Switch edited version
  const changeSelectedVersion = (vNum: number) => {
    setSelectedVersionNum(vNum);
    const ver = versiones.find((v) => v.version === vNum);
    if (ver) {
      setEditableTexto(ver.texto || "");
    }
    setSelectedDeltaFrom(Math.max(1, vNum - 1));
    setDeltaPairs([]);
  };

  // Fetch Delta Diffs
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

  // Save edits as a new version
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
        // Reload versions & pipeline
        await fetchPipeline();
        // Update selected item status to 'en_revision'
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

  // Approve a version
  const handleApproveVersion = async () => {
    console.log("handleApproveVersion clicked: selectedId =", selectedId, "selectedVersionNum =", selectedVersionNum);
    console.log("versiones list =", JSON.stringify(versiones));
    if (!selectedId || !selectedVersionNum) return;
    const currentVer = versiones.find((v) => Number(v.version) === Number(selectedVersionNum));
    console.log("found currentVer =", JSON.stringify(currentVer));
    if (!currentVer) return;

    setApprovingVersion(true);
    try {
      const res = await fetch(`/api/revision/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: selectedVersionNum,
          sha256: currentVer.sha256,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Reload
        await fetchPipeline();
        // Update selected state locally
        if (selectedItem) {
          setSelectedItem({
            ...selectedItem,
            estado: "listo_ingesta",
            version_aprobada: selectedVersionNum,
            sha256_aprobado: currentVer.sha256,
          });
        }
      } else {
        alert("Error al aprobar: " + (data.error || "Desconocido"));
      }
    } catch (err: any) {
      alert("Error de red: " + err.message);
    } finally {
      setApprovingVersion(false);
    }
  };

  // Ingest approved version
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
        // Update local item details immediately
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

  // Keyboard Escape and Focus Trap inside the Drawer
  useEffect(() => {
    if (!selectedId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setSelectedItem(null);
      }
    };

    const getFocusables = () => {
      if (!drawerRef.current) return [];
      return Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    };

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleTab);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleTab);
    };
  }, [selectedId]);

  // Filter pipeline items
  const filteredPipelineItems = pipelineItems.filter((item) => {
    // Search query matches title, id, or io_id
    const matchesSearch =
      searchQuery === "" ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titulo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.io_id || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "todos") return true;
    if (filter === "attention") {
      return (
        item.integrity !== "sync" ||
        item.estado === "fallido"
      );
    }
    if (filter === "archivados") return item.estado === "archivado";
    if (filter === "revision") return item.estado === "en_revision" || item.estado === "pendiente_revision";
    if (filter === "listos") return item.estado === "listo_ingesta";
    if (filter === "ingeridos") return item.estado === "ingerido";
    if (filter === "fallidos") return item.estado === "fallido";
    if (filter === "anomalies") return item.integrity !== "sync";
    if (filter === "sin_audio") return item.integrity === "text_without_audio";
    if (filter === "modificados") return item.integrity === "text_edited";

    return true;
  });

  // Legacy Archiving logic
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
      setVolcadosAviso("archivado " + String(data.sha256).slice(0, 8) + " · " + data.chars + " caracteres · el texto ya esta a salvo");
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

  const selectLegacyVolcadoItem = async (v: Volcado) => {
    setSelectedLegacyVolcado(v);
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
            Control de ingestas, correcciones de transcripción y trazabilidad completa del ciclo de vida.
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
                onClick={() => setFilter("archivados")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity"
                style={{
                  backgroundColor: filter === "archivados" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "archivados" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Archivados
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
              <button
                onClick={() => setFilter("anomalies")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity"
                style={{
                  backgroundColor: filter === "anomalies" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "anomalies" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Anomalías
              </button>
              <button
                onClick={() => setFilter("sin_audio")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity"
                style={{
                  backgroundColor: filter === "sin_audio" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "sin_audio" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Sin audio
              </button>
              <button
                onClick={() => setFilter("modificados")}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity"
                style={{
                  backgroundColor: filter === "modificados" ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === "modificados" ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                Modificados
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por ID, título..."
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

          {/* Density-optimized Control Tower table */}
          <div className="overflow-x-auto border rounded-none shadow-none" style={{ borderColor: "var(--khora-border)" }}>
            <table className="w-full text-left text-xs border-collapse">
              <thead style={{ backgroundColor: "var(--khora-surface)" }}>
                <tr className="border-b" style={{ borderColor: "var(--khora-border)" }}>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">Identificador</th>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">Título / Vista Previa</th>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">Recibido</th>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">Estado Pipeline</th>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">Audio</th>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">Revisión</th>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">Integridad</th>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">io_id</th>
                  <th className="p-3 font-semibold uppercase tracking-wider opacity-70">Grafo PG</th>
                </tr>
              </thead>
              <tbody>
                {loadingPipeline ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs opacity-60">
                      Cargando torre de control de volcados...
                    </td>
                  </tr>
                ) : filteredPipelineItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs opacity-60">
                      Ningún volcado coincide con el filtro activo.
                    </td>
                  </tr>
                ) : (
                  filteredPipelineItems.map((item) => {
                    const isSelected = selectedId === item.id;

                    // Compute pipeline status badge color & label
                    let stateColor = "text-zinc-400 border-zinc-400/20 bg-zinc-400/5";
                    let stateLabel = item.estado;
                    if (item.estado === "archivado") {
                      stateColor = "text-blue-400 border-blue-400/20 bg-blue-400/5";
                      stateLabel = "🎙 Archivador";
                    } else if (item.estado === "en_revision" || item.estado === "pendiente_revision") {
                      stateColor = "text-purple-400 border-purple-400/20 bg-purple-400/5";
                      stateLabel = "✎ Revisión";
                    } else if (item.estado === "listo_ingesta") {
                      stateColor = "text-amber-400 border-amber-400/20 bg-amber-400/5";
                      stateLabel = "⚙ Listo";
                    } else if (item.estado === "ingerido") {
                      stateColor = "text-emerald-400 border-emerald-400/20 bg-emerald-400/5";
                      stateLabel = "◎ Ingerido";
                    } else if (item.estado === "fallido") {
                      stateColor = "text-red-400 border-red-400/20 bg-red-400/5";
                      stateLabel = "✕ Fallido";
                    }

                    // Compute audio status icon & text
                    let audioIcon = <Icons.VolumeX className="w-3.5 h-3.5 text-red-500" />;
                    let audioText = "Sin audio";
                    if (item.audioStatus === "audio_texto") {
                      audioIcon = <Icons.Volume2 className="w-3.5 h-3.5 text-emerald-500" />;
                      audioText = "Audio+Texto";
                    } else if (item.audioStatus === "texto_sin_audio") {
                      audioIcon = <Icons.VolumeX className="w-3.5 h-3.5 text-orange-500" />;
                      audioText = "Sin audio";
                    } else if (item.audioStatus === "audio_sin_texto") {
                      audioIcon = <Icons.Volume2 className="w-3.5 h-3.5 text-red-500" />;
                      audioText = "Sin texto";
                    } else if (item.audioStatus === "audio_parcial") {
                      audioIcon = <Icons.Volume1 className="w-3.5 h-3.5 text-orange-500" />;
                      audioText = "Parcial";
                    }

                    // Compute integrity state colors
                    let integrityColor = "text-zinc-400 border-zinc-400/20 bg-zinc-400/5";
                    let integrityLabel = "Desconocida";
                    if (item.integrity === "sync") {
                      integrityColor = "text-emerald-400 border-emerald-400/20 bg-emerald-400/5";
                      integrityLabel = "🟢 Sincronizado";
                    } else if (item.integrity === "text_edited") {
                      integrityColor = "text-yellow-400 border-yellow-400/20 bg-yellow-400/5";
                      integrityLabel = "🟡 Modificado";
                    } else if (
                      item.integrity === "text_without_audio" ||
                      item.integrity === "audio_without_text" ||
                      item.integrity === "audio_partial"
                    ) {
                      integrityColor = "text-orange-400 border-orange-400/20 bg-orange-400/5";
                      integrityLabel = "🟠 Incompleto";
                    } else if (item.integrity === "broken_provenance") {
                      integrityColor = "text-red-400 border-red-400/20 bg-red-400/5";
                      integrityLabel = "🔴 Inconsistente";
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => selectVolcadoItem(item.id)}
                        className={`border-b last:border-b-0 hover:bg-zinc-800/20 cursor-pointer transition-colors ${
                          isSelected ? "bg-zinc-800/30" : ""
                        }`}
                        style={{ borderColor: "var(--khora-border)" }}
                      >
                        <td className="p-3 font-mono font-semibold text-[11px] whitespace-nowrap">
                          {item.id.slice(0, 8)}...
                        </td>
                        <td className="p-3 max-w-[200px] truncate font-medium">
                          {item.titulo ? (
                            <span className="block truncate font-semibold text-[11px]">{item.titulo}</span>
                          ) : (
                            <span className="italic opacity-60">Sin título</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap opacity-75">
                          {new Date(item.recibido_en).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border text-[10px] font-mono rounded-none uppercase ${stateColor}`}>
                            {stateLabel}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {audioIcon}
                            <span>{audioText}</span>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {item.version_aprobada ? (
                            <span className="text-emerald-500 font-bold flex items-center gap-1">
                              <Icons.Check className="w-3.5 h-3.5" /> v{item.version_aprobada}
                            </span>
                          ) : (
                            <span className="font-mono text-zinc-500 text-[10px]">v{item.version_actual} actual</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 border text-[10px] font-mono rounded-none uppercase ${integrityColor}`}>
                            {integrityLabel}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] whitespace-nowrap opacity-75">
                          {item.io_id ? item.io_id.slice(0, 8) + "..." : "—"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {item.nodos_count > 0 || item.aristas_count > 0 ? (
                            <span className="font-mono text-[10px] border border-blue-500/20 bg-blue-500/5 text-blue-400 px-1.5 py-0.5">
                              {item.nodos_count}n / {item.aristas_count}r
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right Sliding Drawer */}
          {selectedId && selectedItem && (
            <div
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl shadow-2xl flex flex-col border-l transition-transform duration-200"
              style={{
                backgroundColor: "var(--khora-surface)",
                borderColor: "var(--khora-border)",
              }}
              ref={drawerRef}
            >
              {/* Drawer Header */}
              <div
                className="p-4 border-b flex justify-between items-center"
                style={{ borderColor: "var(--khora-border)" }}
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-widest uppercase opacity-60">
                    DETALLE DEL PIPELINE
                  </span>
                  <h2 className="text-sm font-bold font-mono">
                    {selectedItem.id}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  {/* Sub Tab Buttons */}
                  <div className="flex border rounded-none overflow-hidden" style={{ borderColor: "var(--khora-border)" }}>
                    <button
                      onClick={() => setDrawerSubTab("trace")}
                      className="px-3 py-1 text-[10px] uppercase font-semibold cursor-pointer"
                      style={{
                        backgroundColor: drawerSubTab === "trace" ? "var(--khora-accent)" : "transparent",
                        color: drawerSubTab === "trace" ? "var(--khora-bg)" : "var(--khora-ink)",
                      }}
                    >
                      Trace
                    </button>
                    <button
                      onClick={() => setDrawerSubTab("revision")}
                      className="px-3 py-1 text-[10px] uppercase font-semibold cursor-pointer"
                      style={{
                        backgroundColor: drawerSubTab === "revision" ? "var(--khora-accent)" : "transparent",
                        color: drawerSubTab === "revision" ? "var(--khora-bg)" : "var(--khora-ink)",
                      }}
                    >
                      Revisión
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedId(null);
                      setSelectedItem(null);
                    }}
                    className="p-1 rounded cursor-pointer hover:bg-zinc-800 transition-colors focus-visible:outline focus-visible:outline-2"
                  >
                    <Icons.X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {drawerSubTab === "trace" ? (
                  <div className="space-y-6">
                    {/* TRACE VIEW (Chronological Sequence) */}
                    <div className="text-xs uppercase font-mono tracking-widest opacity-65 border-b pb-1 mb-2" style={{ borderColor: "var(--khora-border)" }}>
                      Traceability Tree Map
                    </div>

                    <div className="relative pl-6 border-l-2 space-y-6" style={{ borderColor: "var(--khora-border)" }}>
                      {/* 🎙 CAPTURA */}
                      <div className="relative">
                        <div
                          className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border"
                          style={{
                            backgroundColor: "var(--khora-bg)",
                            borderColor: "var(--khora-accent)",
                          }}
                        >
                          <Icons.Mic className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs flex items-center gap-1.5">
                            🎙 Captura <span className="text-emerald-500">✓ Completado</span>
                          </h4>
                          <div className="text-[11px] opacity-75 space-y-0.5 font-mono">
                            <div>Fecha: {new Date(selectedItem.recibido_en).toLocaleString()}</div>
                            <div>Origen: cora-ui (web)</div>
                          </div>
                        </div>
                      </div>

                      {/* 💾 ARCHIVO */}
                      <div className="relative">
                        <div
                          className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border"
                          style={{
                            backgroundColor: "var(--khora-bg)",
                            borderColor: "var(--khora-accent)",
                          }}
                        >
                          <Icons.Save className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs">
                            💾 Archivo <span className="text-emerald-500">✓ Salvaguardado</span>
                          </h4>
                          <div className="text-[11px] opacity-75 space-y-0.5 font-mono">
                            <div>Total caracteres: {selectedItem.chars}</div>
                            <div>Integridad: Verbatim Append-only</div>
                          </div>
                        </div>
                      </div>

                      {/* 📝 TRANSCRIPCIÓN */}
                      <div className="relative">
                        <div
                          className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border"
                          style={{
                            backgroundColor: "var(--khora-bg)",
                            borderColor: "var(--khora-accent)",
                          }}
                        >
                          <Icons.FileText className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs">
                            📝 Transcripción <span className="text-emerald-500">✓ Versión Inicial v1</span>
                          </h4>
                          <div className="text-[11px] opacity-75 space-y-0.5 font-mono">
                            {selectedItem.audio_url ? (
                              <>
                                <div className="text-emerald-500">✓ Grabación disponible</div>
                                <div>Duración: {selectedItem.duracion_seg} segundos</div>
                              </>
                            ) : (
                              <div className="text-orange-500">⚠ Grabación ausente</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ✎ HISTORIAL / REVISIÓN */}
                      <div className="relative">
                        <div
                          className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border"
                          style={{
                            backgroundColor: "var(--khora-bg)",
                            borderColor: "var(--khora-accent)",
                          }}
                        >
                          <Icons.GitCommit className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs">
                            ✎ Historial de Versiones
                          </h4>
                          <div className="text-[11px] opacity-75 space-y-1 font-mono">
                            <div>Total versiones: {selectedItem.total_versiones}</div>
                            {versiones.length > 0 && (
                              <div className="border border-zinc-700/40 p-1.5 mt-1 bg-zinc-800/10 space-y-0.5 max-h-32 overflow-y-auto">
                                {versiones.map((v) => (
                                  <div key={v.version} className="flex justify-between">
                                    <span>v{v.version} ({v.chars} car)</span>
                                    <span className="opacity-60">{String(v.sha256).slice(0, 8)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ✓ APROBACIÓN */}
                      <div className="relative">
                        <div
                          className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border"
                          style={{
                            backgroundColor: "var(--khora-bg)",
                            borderColor: "var(--khora-accent)",
                          }}
                        >
                          <Icons.CheckCircle className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs flex items-center gap-1">
                            ✓ Aprobación{" "}
                            {selectedItem.version_aprobada ? (
                              <span className="text-emerald-500">✓ v{selectedItem.version_aprobada} Aprobada</span>
                            ) : (
                              <span className="text-orange-500">○ Pendiente de aprobación</span>
                            )}
                          </h4>
                          {selectedItem.version_aprobada && (
                            <div className="text-[11px] opacity-75 space-y-0.5 font-mono">
                              <div>Aprobador: {selectedItem.aprobador}</div>
                              <div>Fecha: {new Date(selectedItem.aprobado_en!).toLocaleString()}</div>
                              <div className="break-all font-semibold">Hash: {selectedItem.sha256_aprobado}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ⚙ INGESTA */}
                      <div className="relative">
                        <div
                          className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border"
                          style={{
                            backgroundColor: "var(--khora-bg)",
                            borderColor: "var(--khora-accent)",
                          }}
                        >
                          <Icons.Settings className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs">
                            ⚙ Ingesta{" "}
                            {selectedItem.estado === "ingerido" ? (
                              <span className="text-emerald-500">✓ Ingerido exitosamente</span>
                            ) : selectedItem.estado === "fallido" ? (
                              <span className="text-red-500">✕ Error en ingesta</span>
                            ) : (
                              <span className="text-orange-500">○ En espera</span>
                            )}
                          </h4>
                          {selectedItem.ultimo_error && (
                            <div className="text-[11px] text-red-400 font-mono mt-1 border border-red-500/10 p-1.5 bg-red-500/5">
                              {selectedItem.ultimo_error}
                            </div>
                          )}
                          {selectedItem.io_id && (
                            <div className="text-[11px] opacity-75 font-mono">
                              io_id: {selectedItem.io_id}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ◎ GRAFO PKG */}
                      <div className="relative">
                        <div
                          className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border"
                          style={{
                            backgroundColor: "var(--khora-bg)",
                            borderColor: "var(--khora-accent)",
                          }}
                        >
                          <Icons.Activity className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs">
                            ◎ Grafo PKG Proyecciones
                          </h4>
                          <div className="text-[11px] opacity-75 font-mono">
                            {selectedItem.nodos_count > 0 ? (
                              <div className="text-emerald-500 font-semibold space-y-0.5">
                                <div>✓ Nodos creados: {selectedItem.nodos_count}</div>
                                <div>✓ Aristas creadas: {selectedItem.aristas_count}</div>
                              </div>
                            ) : (
                              <div className="text-zinc-500">Sin representación física en el grafo aún.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* REVISION AND EDIT VIEW */}

                    {/* Audio controller section */}
                    <div className="p-3 border space-y-2 rounded-none" style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-border)" }}>
                      <div className="flex justify-between items-center text-[10px] font-mono tracking-wider opacity-60 uppercase">
                        <span>Grabación Asociada</span>
                        <span>{selectedItem.audio_url ? "✓ Audio disponible" : "Sin Grabación"}</span>
                      </div>
                      {selectedItem.audio_url ? (
                        <div className="space-y-1.5">
                          <audio
                            src={`/api/audio/${selectedItem.id}`}
                            controls
                            preload="metadata"
                            className="w-full h-8"
                          />
                          <p className="text-[10px] opacity-70">
                            Duración: {selectedItem.duracion_seg || "?"} segundos · Tamaño:{" "}
                            {selectedItem.audio_bytes ? Math.round(selectedItem.audio_bytes / 1024) + " KB" : "?"}
                          </p>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic text-xs">
                          No hay audio en vivo registrado para este volcado.
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
                        rows={10}
                        style={{
                          backgroundColor: "var(--khora-bg)",
                          color: "var(--khora-ink)",
                          borderColor: "var(--khora-border)",
                        }}
                      />
                    </div>

                    {/* Delta View diff */}
                    {versiones.length > 1 && (
                      <div className="border p-3 space-y-2 rounded-none" style={{ borderColor: "var(--khora-border)" }}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">
                            Delta Changes
                          </span>
                          <div className="flex items-center gap-1 text-[11px]">
                            <span>Comparar con:</span>
                            <select
                              value={selectedDeltaFrom}
                              onChange={(e) => setSelectedDeltaFrom(Number(e.target.value))}
                              className="p-0.5 border rounded-none font-mono text-[10px]"
                              style={{
                                backgroundColor: "var(--khora-bg)",
                                borderColor: "var(--khora-border)",
                                color: "var(--khora-ink)",
                              }}
                            >
                              {versiones
                                .filter((v) => v.version !== selectedVersionNum)
                                .map((v) => (
                                  <option key={v.version} value={v.version}>
                                    v{v.version}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        {loadingDelta ? (
                          <div className="text-[10px] opacity-60 font-mono">Calculando pares delta...</div>
                        ) : deltaPairs.length === 0 ? (
                          <div className="text-[10px] opacity-55 font-mono">Sin diferencias entre v{selectedDeltaFrom} y v{selectedVersionNum}.</div>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto border border-zinc-700/20 p-2 font-mono text-[10px]">
                            {deltaPairs.map((p, idx) => (
                              <div key={idx} className="border-b last:border-b-0 py-1 space-y-0.5 border-zinc-700/10">
                                {p.antes && (
                                  <div className="text-red-500 bg-red-500/10 px-1 font-mono">
                                    − {p.antes}
                                  </div>
                                )}
                                {p.despues && (
                                  <div className="text-green-500 bg-green-500/10 px-1 font-mono">
                                    + {p.despues}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
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

                    {/* Approved version warning block */}
                    {selectedItem.version_aprobada ? (
                      <div className="border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                          <Icons.CheckCircle size={16} />
                          <span>v{selectedItem.version_aprobada} APROBADA</span>
                        </div>
                        <p className="text-[11px] opacity-80">
                          Esta versión está lista para ser ingerida en la base de datos de conocimiento del kernel.
                        </p>
                        <button
                          onClick={handleIngestApproved}
                          disabled={ingesting}
                          className="w-full px-3 py-2 border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-black font-semibold text-xs cursor-pointer transition-colors"
                        >
                          {ingesting ? "Ingiriendo en Kernel..." : `[ Ingerir versión v${selectedItem.version_aprobada} ]`}
                        </button>
                      </div>
                    ) : (
                      <div className="border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 flex items-start gap-2">
                        <Icons.AlertCircle size={16} className="shrink-0" />
                        <div>
                          <strong>Bloqueado para Ingesta:</strong> Debes aprobar una versión antes de mandarla al grafo del kernel.
                        </div>
                      </div>
                    )}

                    {/* Ingestion results panel */}
                    {ingestaResult && (
                      <div
                        className={`p-3 border text-xs space-y-1 ${
                          ingestaResult.success
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-red-500/30 bg-red-500/10 text-red-400"
                        }`}
                      >
                        {ingestaResult.success ? (
                          <>
                            <div className="font-bold flex items-center gap-1 text-[11px]">
                              <Icons.CheckCircle size={14} /> ✓ INGESTADO
                            </div>
                            <div className="font-mono text-[10px]">io_id: {ingestaResult.io_id}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold flex items-center gap-1 text-[11px]">
                              <Icons.AlertCircle size={14} /> Error en Ingesta
                            </div>
                            <p className="font-mono text-[10px]">{ingestaResult.error}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ARCHIVE MANUAL & LEGACY INVENTORY VIEW */}

          {/* Left Column: Formulario de Archivo */}
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

              {volcadosError && (
                <div
                  className="p-2 border text-xs flex items-start gap-2"
                  style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-bg)" }}
                >
                  <Icons.AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                  <span>{volcadosError}</span>
                </div>
              )}
              {volcadosAviso && (
                <div
                  className="p-2 border text-xs flex items-start gap-2"
                  style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-bg)" }}
                >
                  <Icons.CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                  <span>{volcadosAviso}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Existing Inventario List & Details */}
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
                      <th className="pb-2 font-semibold">Recibido</th>
                      <th className="pb-2 font-semibold">Título</th>
                      <th className="pb-2 font-semibold">Chars</th>
                      <th className="pb-2 font-semibold">Estado</th>
                      <th className="pb-2 font-semibold">SHA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volcadosItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-zinc-500">
                          Sin volcados todavía
                        </td>
                      </tr>
                    ) : (
                      volcadosItems.map((v) => {
                        const isSelected = selectedLegacyVolcado?.id === v.id;
                        return (
                          <tr
                            key={v.id}
                            onClick={() => selectLegacyVolcadoItem(v)}
                            className={`border-b last:border-b-0 hover:bg-zinc-800/20 cursor-pointer ${
                              isSelected ? "bg-zinc-800/30" : ""
                            }`}
                            style={{ borderColor: "var(--khora-border)" }}
                          >
                            <td className="py-2.5">{new Date(v.recibido_en).toLocaleDateString()}</td>
                            <td className="py-2.5 truncate max-w-[150px] font-semibold">{v.titulo || "—"}</td>
                            <td className="py-2.5 font-mono">{v.chars}</td>
                            <td className="py-2.5">
                              <span className="border border-zinc-700 bg-zinc-800/40 text-[10px] font-mono px-1 py-0.5">
                                {v.estado}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-zinc-500">{v.sha256.slice(0, 8)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {selectedLegacyVolcado && (
                <div
                  className="border p-4 space-y-3 rounded-none"
                  style={{ backgroundColor: "var(--khora-bg)", borderColor: "var(--khora-border)" }}
                >
                  <div className="border-b pb-1">
                    <span className="text-[10px] font-mono block opacity-60">ID: {selectedLegacyVolcado.id}</span>
                    <strong className="text-xs">Detalles del texto</strong>
                  </div>
                  <pre className="text-[10px] font-mono whitespace-pre-wrap p-2 border bg-zinc-950 border-zinc-800/60 leading-relaxed max-h-48 overflow-y-auto">
                    {selectedLegacyVolcado.texto}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
