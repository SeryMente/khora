// @l0 L0-002 · @req PIPELINE/REQ-3,UI-PIPELINE-FIX/REQ-1 · Componente Presentacional Compartido de Pipeline / Mesa de Revisión
"use client";

import { useState } from "react";
import * as Icons from "lucide-react";

export function renderAudioStatusBadge(status: string) {
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
}

export type PipelineViewState = {
  pipelineItems: any[];
  resumen: any;
  loadingPipeline: boolean;
  filter: string;
  searchQuery: string;
  selectedId: string | null;
  selectedItem: any | null;
  drawerSubTab: "cockpit" | "trace";
  viewMode: "lectura" | "edicion";
  editableTexto: string;
  generatingTitle: boolean;
  titleError: string | null;
  manifiestoPartes: any[];
  currentPartIndex: number;
  audioSourceUrl: string;
  currentTimeMs: number;
  duracionTotalMs: number;
  isPlaying: boolean;
  audioError: string | null;
  hallazgos: any[];
  activeHallazgoIndex: number;
  incidentes: any[];
  gateDecision: any;
  loadingGate: boolean;
  holdProgress: number;
  isHolding: boolean;
  showAccessibleModal: boolean;
  accessibleConfirmText: string;
  approvingVersion: boolean;
  showAudioResolveModal: boolean;
  selectedAudioResolveCode: string;
  ingesting: boolean;
  ingestaResult: any;
};

export type PipelineViewActions = {
  onFilterChange?: (filter: string) => void;
  onSearchChange?: (query: string) => void;
  onSelectVolcado?: (id: string) => void;
  onSetDrawerSubTab?: (tab: "cockpit" | "trace") => void;
  onSetViewMode?: (mode: "lectura" | "edicion") => void;
  onEditableTextoChange?: (val: string) => void;
  onRegenerarTitulo?: () => void;
  onTitularTarjeta?: (id: string, e: React.MouseEvent) => void;
  onSaveEdits?: () => void;
  onResolveHallazgo?: (accion: "aceptar" | "rechazar") => void;
  onStartHolding?: () => void;
  onStopHolding?: () => void;
  onExecuteApproval?: () => void;
  onOpenAudioResolveModal?: () => void;
  onResolveAudioIncident?: () => void;
  onIngestApproved?: () => void;
  onGlobalSeek?: (targetMs: number) => void;
  onTogglePlayPause?: () => void;
  onManualPartChange?: (index: number) => void;
  onSetShowAccessibleModal?: (show: boolean) => void;
  onSetAccessibleConfirmText?: (val: string) => void;
  onSetShowAudioResolveModal?: (show: boolean) => void;
  onSetSelectedAudioResolveCode?: (val: string) => void;
};

export function PipelineView({
  state,
  actions = {},
  isReviewMode = false,
}: {
  state: PipelineViewState;
  actions?: PipelineViewActions;
  isReviewMode?: boolean;
}) {
  const {
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
    currentTimeMs,
    duracionTotalMs,
    isPlaying,
    audioError,
    hallazgos,
    activeHallazgoIndex,
    gateDecision,
    holdProgress,
    isHolding,
    showAccessibleModal,
    accessibleConfirmText,
    approvingVersion,
    showAudioResolveModal,
    selectedAudioResolveCode,
    ingesting,
    ingestaResult,
  } = state;

  const activeHallazgo = hallazgos[activeHallazgoIndex];

  const formatMs = (ms: number): string => {
    if (!ms || isNaN(ms) || ms < 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const filteredItems = pipelineItems.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titulo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.folio ? String(item.folio).includes(searchQuery) : false);

    if (!matchesSearch) return false;
    if (filter === "todos") return true;
    if (filter === "revision") return item.estado === "en_revision" || item.estado === "pendiente_revision";
    if (filter === "listos") return item.estado === "listo_ingesta";
    if (filter === "ingeridos") return item.estado === "ingerido";
    if (filter === "archivados") return item.estado === "archivado";
    return true;
  });

  return (
    <div
      data-ui-id="pipeline.container"
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
          <div data-ui-id="pipeline.summary" className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 border flex flex-col justify-between bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
              <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Total volcados</span>
              <span className="text-2xl font-bold mt-1">{resumen.total}</span>
            </div>
            <div className="p-3 border flex flex-col justify-between bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
              <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">En revisión</span>
              <span className="text-2xl font-bold mt-1" style={{ color: "var(--khora-accent)" }}>
                {(resumen.en_revision || 0) + (resumen.pendiente_revision || 0)}
              </span>
            </div>
            <div className="p-3 border flex flex-col justify-between bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
              <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Listos / Ingesta</span>
              <span className="text-2xl font-bold mt-1 text-amber-500">{resumen.listo_ingesta || 0}</span>
            </div>
            <div className="p-3 border flex flex-col justify-between bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
              <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Grafo / Ingeridos</span>
              <span className="text-2xl font-bold mt-1 text-emerald-500">{resumen.ingerido || 0}</span>
            </div>
            <div className="p-3 border flex flex-col justify-between col-span-2 md:col-span-1 bg-zinc-950/40" style={{ borderColor: "var(--khora-border)" }}>
              <span className="text-[10px] font-mono tracking-wider uppercase opacity-60">Incidentes Abiertos</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-red-500">{gateDecision?.counts?.incidentes_operativos_abiertos ?? resumen.anomalies ?? 0}</span>
              </div>
            </div>
          </div>
        )}

        {titleError && (
          <div className="p-3 border border-red-500/40 bg-red-950/20 text-xs font-mono text-red-300 flex justify-between items-center">
            <span>⚠️ {titleError}</span>
          </div>
        )}

        {/* Filters & Search */}
        <div data-ui-id="pipeline.filters" className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="flex flex-wrap gap-1.5">
            {["todos", "revision", "listos", "ingeridos", "archivados"].map((f) => (
              <button
                key={f}
                onClick={() => actions.onFilterChange?.(f)}
                className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border cursor-pointer capitalize"
                style={{
                  backgroundColor: filter === f ? "var(--khora-accent)" : "var(--khora-surface)",
                  color: filter === f ? "var(--khora-bg)" : "var(--khora-ink)",
                  borderColor: "var(--khora-border)",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por Folio, UUID, Titulo..."
              value={searchQuery}
              onChange={(e) => actions.onSearchChange?.(e.target.value)}
              className="w-full md:w-64 pl-8 pr-3 py-1.5 text-xs border rounded-none focus:outline-none"
              style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)", color: "var(--khora-ink)" }}
            />
            <Icons.Search className="absolute left-2.5 top-2.5 text-xs opacity-60 w-3.5 h-3.5" />
          </div>
        </div>

        {/* Master Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Left Column Index */}
          <div data-ui-id="pipeline.list" className="lg:col-span-4 flex flex-col space-y-2">
            {loadingPipeline ? (
              <div data-ui-id="pipeline.loading-state" className="p-8 text-center text-xs opacity-60 border" style={{ borderColor: "var(--khora-border)" }}>
                Cargando lista de volcados...
              </div>
            ) : filteredItems.length === 0 ? (
              <div data-ui-id="pipeline.empty-state" className="p-8 text-center text-xs opacity-60 border" style={{ borderColor: "var(--khora-border)" }}>
                No hay volcados disponibles para el filtro seleccionado.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    data-ui-id="pipeline.item-card"
                    onClick={() => actions.onSelectVolcado?.(item.id)}
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
              })
            )}
          </div>

          {/* Right Column Synchronous Revision Cockpit */}
          <div data-ui-id="pipeline.drawer" className="lg:col-span-8 flex flex-col space-y-4">
            {selectedId && selectedItem ? (
              <div className="border p-5 flex flex-col space-y-6 h-full bg-zinc-950/60" style={{ borderColor: "var(--khora-border)" }}>
                {/* Cockpit Header Bar */}
                <div data-ui-id="revision.cockpit-header" className="border-b pb-4 space-y-3" style={{ borderColor: "var(--khora-border)" }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">Mesa de Revisión Sincrónica</span>
                      <h2 className="text-base font-bold font-mono flex items-center gap-2">
                        {selectedItem.folio ? `Folio #${selectedItem.folio} — ` : ""}{selectedItem.titulo || selectedItem.id}
                        <button
                          onClick={() => actions.onRegenerarTitulo?.()}
                          disabled={generatingTitle}
                          title="Regenerar título con IA"
                          className="p-1 hover:bg-zinc-800 rounded text-amber-400 cursor-pointer disabled:opacity-50"
                        >
                          <Icons.Sparkles size={14} className={generatingTitle ? "animate-spin" : ""} />
                        </button>
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => actions.onSetDrawerSubTab?.("cockpit")}
                        className="px-3 py-1 text-xs font-mono uppercase border cursor-pointer"
                        style={{
                          backgroundColor: drawerSubTab === "cockpit" ? "var(--khora-accent)" : "transparent",
                          color: drawerSubTab === "cockpit" ? "var(--khora-bg)" : "var(--khora-ink)",
                        }}
                      >
                        Cockpit
                      </button>
                      <button
                        onClick={() => actions.onSetDrawerSubTab?.("trace")}
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
                    {/* Audio Incident Banner */}
                    {(selectedItem.audio_status === "no_recuperable" || selectedItem.audio_status === "encontrado_no_vinculado" || selectedItem.audio_status === "incompleto") && (
                      <div data-ui-id="revision.banner-incidente" className="p-3 border border-red-500/40 bg-red-950/20 text-xs font-mono flex justify-between items-center">
                        <div className="text-red-300">
                          🔴 Causa de audio detectada: {selectedItem.audio_status}. Se requiere resolución explícita del operador para habilitar la aprobación.
                        </div>
                        <button
                          data-ui-id="revision.btn-resolver-incidente"
                          onClick={() => actions.onOpenAudioResolveModal?.()}
                          className="px-3 py-1 bg-red-600 text-white font-bold hover:bg-red-500 cursor-pointer text-xs disabled:opacity-50"
                        >
                          Resolver Incidente Audio
                        </button>
                      </div>
                    )}

                    {/* Main Reading / Editing View */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-8 space-y-3">
                        <div className="flex justify-between items-center text-xs font-mono opacity-60 uppercase">
                          <div className="flex gap-2">
                            <button
                              onClick={() => actions.onSetViewMode?.("lectura")}
                              className={`px-2 py-0.5 border ${viewMode === "lectura" ? "bg-amber-400 text-zinc-950 font-bold" : ""}`}
                            >
                              Modo Lectura
                            </button>
                            <button
                              onClick={() => actions.onSetViewMode?.("edicion")}
                              className={`px-2 py-0.5 border ${viewMode === "edicion" ? "bg-amber-400 text-zinc-950 font-bold" : ""}`}
                            >
                              Modo Edición
                            </button>
                          </div>
                          <span>{editableTexto.length} car</span>
                        </div>

                        {viewMode === "lectura" ? (
                          <div data-ui-id="revision.reading-prose" className="p-6 border bg-zinc-900/40 border-zinc-800 rounded-none max-w-prose min-h-[280px]">
                            <span className="font-serif leading-relaxed text-base">{editableTexto}</span>
                          </div>
                        ) : (
                          <textarea
                            data-ui-id="revision.textarea-editor"
                            value={editableTexto}
                            onChange={(e) => actions.onEditableTextoChange?.(e.target.value)}
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
                            data-ui-id="revision.btn-guardar-version"
                            onClick={() => actions.onSaveEdits?.()}
                            disabled={!editableTexto.trim()}
                            className="px-4 py-2 border font-mono text-xs font-bold bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 cursor-pointer flex items-center gap-1.5"
                          >
                            <Icons.Save size={14} />
                            Guardar Nueva Versión
                          </button>
                        </div>
                      </div>

                      {/* Side Panel: Findings */}
                      <div data-ui-id="revision.hallazgos-nav" className="lg:col-span-4 space-y-4">
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

                            <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                              <div className="flex gap-2">
                                <button
                                  data-ui-id="revision.btn-rechazar-hallazgo"
                                  onClick={() => actions.onResolveHallazgo?.("rechazar")}
                                  className="px-2 py-1 bg-red-950 text-red-300 border border-red-800 font-bold cursor-pointer text-[11px]"
                                >
                                  Rechazar
                                </button>
                                <button
                                  data-ui-id="revision.btn-aceptar-hallazgo"
                                  onClick={() => actions.onResolveHallazgo?.("aceptar")}
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
                          <div data-ui-id="approval.blockers-list" className="space-y-2">
                            <span className="text-[10px] font-mono text-red-400 uppercase font-bold">Bloqueadores de Aprobación:</span>
                            {gateDecision.blockers.map((b: any, idx: number) => (
                              <div key={idx} className="p-2 border border-red-800/60 bg-red-950/30 text-xs font-mono text-red-300">
                                ❌ {b.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audio Player Bar */}
                    <div data-ui-id="revision.audio-player" className="p-3 border bg-zinc-900 border-zinc-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="font-bold flex items-center gap-1">
                          <Icons.Volume2 size={14} /> Reproductor Continuo (Parte {currentPartIndex} / {manifiestoPartes.length || 1})
                        </span>
                        {renderAudioStatusBadge(selectedItem.audio_status)}
                      </div>

                      {audioError && (
                        <div className="p-2 border border-red-500/50 bg-red-950/30 text-xs font-mono text-red-300">
                          ⚠️ {audioError}
                        </div>
                      )}

                      {selectedItem.audio_status !== "no_recuperable" && selectedItem.audio_status !== "no_aplica" ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <button
                              data-ui-id="revision.btn-play-pause"
                              onClick={() => actions.onTogglePlayPause?.()}
                              className="p-2 border border-amber-500/50 bg-amber-950/30 hover:bg-amber-900/50 text-amber-400 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              {isPlaying ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
                              {isPlaying ? "Pausar" : "Reproducir"}
                            </button>

                            <span className="text-xs font-mono text-zinc-300 shrink-0">
                              {formatMs(currentTimeMs)} / {formatMs(duracionTotalMs)}
                            </span>

                            <input
                              data-ui-id="revision.audio-seek-slider"
                              type="range"
                              min={0}
                              max={duracionTotalMs || 100}
                              value={currentTimeMs}
                              onChange={(e) => actions.onGlobalSeek?.(Number(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-700 rounded-none"
                            />
                          </div>

                          <div className="flex justify-between items-center text-xs font-mono pt-1 border-t border-zinc-800">
                            <button
                              disabled={currentPartIndex <= 1}
                              onClick={() => actions.onManualPartChange?.(currentPartIndex - 1)}
                              className="px-2 py-1 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                            >
                              Parte anterior
                            </button>
                            <span className="opacity-80">
                              Parte {currentPartIndex} de {manifiestoPartes.length || 1}
                            </span>
                            <button
                              disabled={currentPartIndex >= manifiestoPartes.length}
                              onClick={() => actions.onManualPartChange?.(currentPartIndex + 1)}
                              className="px-2 py-1 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                            >
                              Parte siguiente
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-mono opacity-60 italic">Audio no disponible para reproducción.</div>
                      )}
                    </div>

                    {/* Authoritative Approval Section */}
                    <div data-ui-id="approval.gate" className="p-4 border bg-zinc-900/60 border-zinc-800 space-y-4 font-mono">
                      <div className="flex justify-between items-center border-b pb-2 border-zinc-800">
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider">Compuerta de Aprobación Server-Side</h4>
                          <span className="text-[10px] opacity-60">hash: {gateDecision?.gate_hash || "evaluando..."}</span>
                        </div>

                        {selectedItem.estado === "listo_ingesta" || selectedItem.estado === "ingerido" ? (
                          <span data-ui-id="approval.badge-approved" className="text-xs font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-950/40 px-2 py-1">
                            ✓ APROBADO v{selectedItem.version_aprobada || 1}
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2 py-1 border ${gateDecision?.canApprove ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/40" : "text-red-400 border-red-500/40 bg-red-950/40"}`}>
                            {gateDecision?.canApprove ? "Habilitado para Aprobación" : "Bloqueado"}
                          </span>
                        )}
                      </div>

                      {selectedItem.estado !== "listo_ingesta" && selectedItem.estado !== "ingerido" && (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3 items-center">
                            <button
                              data-ui-id="approval.hold-button"
                              onMouseDown={() => actions.onStartHolding?.()}
                              onMouseUp={() => actions.onStopHolding?.()}
                              onMouseLeave={() => actions.onStopHolding?.()}
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
                                  : "Mantén presionado 2s para Aprobar"}
                              </span>
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-emerald-400/50 transition-all duration-75"
                                style={{ width: `${holdProgress}%` }}
                              />
                            </button>

                            <button
                              data-ui-id="approval.keyboard-btn"
                              onClick={() => actions.onSetShowAccessibleModal?.(true)}
                              disabled={!gateDecision?.canApprove || approvingVersion}
                              className="w-full sm:w-1/3 py-3 border font-semibold text-xs uppercase tracking-wider border-zinc-700 bg-zinc-800 hover:bg-zinc-700 cursor-pointer disabled:opacity-40"
                            >
                              Alternativa Teclado
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Ingestion Section */}
                      <div data-ui-id="ingesta.container" className="pt-2 border-t border-zinc-800 space-y-2">
                        {(selectedItem.estado === "listo_ingesta" || selectedItem.version_aprobada) && (
                          <button
                            data-ui-id="ingesta.btn-ingerir"
                            onClick={() => actions.onIngestApproved?.()}
                            disabled={ingesting}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            {ingesting ? "Ingiriendo en Grafo..." : "Ingerir versión aprobada"}
                          </button>
                        )}

                        {ingesting && (
                          <div data-ui-id="ingesta.status-running" className="p-2 text-xs font-mono text-amber-300">
                            Ejecutando propuesta de ingesta en el grafo de conocimiento...
                          </div>
                        )}

                        {ingestaResult && ingestaResult.success && (
                          <div data-ui-id="ingesta.result-success" className="p-2.5 text-xs font-mono border border-emerald-600 bg-emerald-950/60 text-emerald-300">
                            ✓ Ingesta exitosa — io_id: {ingestaResult.io_id}
                          </div>
                        )}

                        {ingestaResult && !ingestaResult.success && (
                          <div data-ui-id="ingesta.result-failure" className="p-2.5 text-xs font-mono border border-red-600 bg-red-950/60 text-red-300">
                            Error: {ingestaResult.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
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
              onChange={(e) => actions.onSetSelectedAudioResolveCode?.(e.target.value)}
              className="w-full p-2 border bg-zinc-900 border-zinc-700 text-zinc-200"
            >
              <option value="aceptado_sin_audio">aceptado_sin_audio (Aceptar conscientemente sin audio)</option>
              <option value="audio_recuperado">audio_recuperado (Audio recuperado)</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => actions.onSetShowAudioResolveModal?.(false)} className="px-3 py-1.5 border border-zinc-700">Cancelar</button>
              <button
                onClick={() => actions.onResolveAudioIncident?.()}
                className="px-3 py-1.5 bg-red-600 text-white font-bold"
              >
                Resolver Incidente
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
              Escribe exactamente <strong className="text-emerald-400">APROBAR v1</strong> para confirmar la autorización:
            </p>
            <input
              type="text"
              value={accessibleConfirmText}
              onChange={(e) => actions.onSetAccessibleConfirmText?.(e.target.value)}
              placeholder="APROBAR v1"
              className="w-full p-2 border bg-zinc-900 border-zinc-700 text-zinc-100"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => actions.onSetShowAccessibleModal?.(false)} className="px-3 py-1.5 border border-zinc-700">Cancelar</button>
              <button
                disabled={accessibleConfirmText !== "APROBAR v1" || approvingVersion}
                onClick={() => actions.onExecuteApproval?.()}
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
