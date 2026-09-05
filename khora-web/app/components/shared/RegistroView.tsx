// @l0 L0-002 · @req SISTEMA-MENU/E5 · Componente Presentacional Compartido de Visor de Eventos
"use client";

import { ScrollText, Clipboard, RefreshCw, Filter, Layers, ChevronDown, ChevronRight, AlertTriangle, Database, ShieldAlert } from "lucide-react";

export type EventoSistema = {
  id: number;
  fase: string;
  event_id: string;
  estado: "START" | "OK" | "FAIL" | "INFO" | "SKIP";
  mensaje: string;
  detalle: Record<string, unknown> | null;
  volcado_id: string | null;
  version: number | null;
  sha256: string | null;
  correlacion_id: string | null;
  servidor_en: string;
  cliente_en: string | null;
  hash_anterior: string | null;
  event_hash: string | null;
};

export type RegistroViewState = {
  eventos: EventoSistema[];
  ndjsonRaw: string;
  loading: boolean;
  reintentando?: boolean;
  error: string | null;
  reasonCode?: string | null;
  correlationId?: string | null;
  faseFiltro: string;
  agruparPorCorrelacion: boolean;
  mensajeCopiar: string;
  expandedDetails: Record<number, boolean>;
};

export type RegistroViewActions = {
  onFaseFiltroChange?: (fase: string) => void;
  onAgruparChange?: (agrupar: boolean) => void;
  onCopiarNdjson?: () => void;
  onReload?: () => void;
  onToggleDetail?: (id: number) => void;
};

const ESTADO_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  OK: { icon: "✅", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  FAIL: { icon: "❌", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
  INFO: { icon: "ℹ️", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  SKIP: { icon: "⏭️", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  START: { icon: "▶️", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
};

const FASE_COLORS: Record<string, string> = {
  dictado: "#ec4899",
  transcripcion: "#8b5cf6",
  revision: "#3b82f6",
  manejo: "#10b981",
  autorizacion: "#f59e0b",
  ingesta: "#06b6d4",
  grafo: "#6366f1",
  captura: "#14b8a6",
};

export function RegistroView({
  state,
  actions = {},
  isReviewMode = false,
}: {
  state: RegistroViewState;
  actions?: RegistroViewActions;
  isReviewMode?: boolean;
}) {
  const {
    eventos,
    loading,
    reintentando,
    error,
    reasonCode,
    correlationId,
    faseFiltro,
    agruparPorCorrelacion,
    mensajeCopiar,
    expandedDetails,
  } = state;

  const eventosAgrupados = eventos.reduce<Record<string, EventoSistema[]>>((acc, evt) => {
    const key = evt.correlacion_id || "sin_correlacion";
    if (!acc[key]) acc[key] = [];
    acc[key].push(evt);
    return acc;
  }, {});

  const renderDiagnosticError = () => {
    let title = "Error de Sistema";
    let explanation = "Se produjo una anomalía al consultar el registro de eventos.";
    let icon = <AlertTriangle size={28} className="text-amber-500" />;

    if (reasonCode === "DB_UNREACHABLE") {
      title = "Base de Datos No Disponible";
      explanation = "No se pudo establecer conexión con el almacén de datos persistente. Por favor, intente de nuevo.";
      icon = <Database size={28} className="text-red-400" />;
    } else if (reasonCode === "EVENT_SCHEMA_MISSING") {
      title = "Esquema No Preparado (Tabla Ausente)";
      explanation = "El esquema de eventos no se encuentra instalado en la base de datos. Se requiere ejecutar la migración correspondiente.";
      icon = <AlertTriangle size={28} className="text-amber-400" />;
    } else if (reasonCode === "EVENT_SCHEMA_OUTDATED") {
      title = "Esquema Obsoleto";
      explanation = "La estructura de la tabla de eventos requiere actualización de columnas. Aplique las migraciones pendientes.";
      icon = <AlertTriangle size={28} className="text-amber-400" />;
    } else if (reasonCode === "EVENT_STORE_FORBIDDEN" || error?.includes("401") || error?.includes("403")) {
      title = "Acceso No Autorizado";
      explanation = "No tiene permisos suficientes para consultar el registro de eventos.";
      icon = <ShieldAlert size={28} className="text-red-500" />;
    }

    return (
      <div
        data-ui-id="registro.error-state"
        role="status"
        aria-live="polite"
        className="p-6 border rounded space-y-4 text-xs font-mono"
        style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}
      >
        <div className="flex items-start gap-3">
          {icon}
          <div className="space-y-1 flex-1">
            <h2 className="text-sm font-bold uppercase tracking-wide text-red-400">{title}</h2>
            <p className="opacity-80 leading-relaxed">{explanation}</p>
            {reasonCode && (
              <div className="flex items-center gap-2 mt-2">
                <span className="font-bold opacity-60">Código de diagnóstico:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-stone-800 text-amber-300 border border-stone-700">
                  {reasonCode}
                </span>
              </div>
            )}
            {correlationId && (
              <p className="opacity-60 text-[10px]">
                Correlación: <code className="text-emerald-400">{correlationId}</code>
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t" style={{ borderColor: "var(--khora-border)" }}>
          <button
            data-ui-id="registro.btn-reintentar"
            onClick={() => actions.onReload?.()}
            disabled={reintentando}
            className="flex items-center gap-2 px-4 py-2 font-bold uppercase border rounded hover:opacity-80 transition-colors disabled:opacity-50"
            style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }}
          >
            <RefreshCw size={14} className={reintentando ? "animate-spin" : ""} />
            {reintentando ? "Reintentando..." : "Reintentar"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <main
      data-ui-id="registro.container"
      className="w-full flex justify-center p-4 py-12 font-mono min-h-screen"
      style={{ background: "var(--khora-bg)", color: "var(--khora-ink)" }}
    >
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <header data-ui-id="registro.header" className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4" style={{ borderColor: "var(--khora-border)" }}>
          <div>
            <div className="flex items-center gap-2">
              <ScrollText size={32} style={{ color: "var(--khora-accent)" }} />
              <h1 className="text-2xl font-bold uppercase tracking-wider">Sistema — Visor de Eventos</h1>
            </div>
            <p className="text-xs opacity-70 mt-1">
              Registro continuo de eventos, trazabilidad forense por fase y cadena de integridad hash.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-ui-id="registro.btn-copiar"
              onClick={() => actions.onCopiarNdjson?.()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border rounded hover:opacity-80 transition-colors"
              style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}
            >
              <Clipboard size={16} /> Copiar todo (NDJSON)
            </button>
            <button
              onClick={() => actions.onReload?.()}
              disabled={loading || reintentando}
              className="p-2 border rounded hover:opacity-80 transition-colors disabled:opacity-50"
              style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}
              title="Actualizar registro"
              aria-label="Actualizar registro"
            >
              <RefreshCw size={16} className={loading || reintentando ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {mensajeCopiar && (
          <div
            role="status"
            aria-live="polite"
            className="p-2 text-xs border rounded flex items-center gap-2"
            style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}
          >
            <span>{mensajeCopiar}</span>
          </div>
        )}

        {/* Control Bar */}
        <div data-ui-id="registro.filter-bar" className="flex flex-wrap items-center justify-between gap-4 p-3 border rounded" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
          <div className="flex items-center gap-3 text-xs">
            <Filter size={16} style={{ color: "var(--khora-accent)" }} />
            <label htmlFor="fase-filtro-select" className="font-bold uppercase">Fase:</label>
            <select
              id="fase-filtro-select"
              value={faseFiltro}
              onChange={(e) => actions.onFaseFiltroChange?.(e.target.value)}
              className="p-1 border rounded bg-transparent font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              style={{ borderColor: "var(--khora-border)", color: "var(--khora-ink)" }}
            >
              <option value="todas">Todas las fases</option>
              <option value="dictado">Dictado</option>
              <option value="transcripcion">Transcripción</option>
              <option value="revision">Revisión</option>
              <option value="manejo">Manejo</option>
              <option value="autorizacion">Autorización</option>
              <option value="ingesta">Ingesta</option>
              <option value="grafo">Grafo</option>
              <option value="captura">Captura</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Layers size={16} style={{ color: "var(--khora-accent)" }} />
            <label className="flex items-center gap-1.5 cursor-pointer font-bold uppercase">
              <input
                type="checkbox"
                checked={agruparPorCorrelacion}
                onChange={(e) => actions.onAgruparChange?.(e.target.checked)}
                className="rounded focus:ring-emerald-500"
              />
              Agrupar por correlacion_id
            </label>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div
            data-ui-id="registro.loading-state"
            role="status"
            aria-live="polite"
            className="p-8 text-center text-xs opacity-60 border rounded"
            style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}
          >
            {reintentando ? "Reintentando consulta del registro..." : "Cargando registro de eventos..."}
          </div>
        ) : error ? (
          renderDiagnosticError()
        ) : eventos.length === 0 ? (
          <div data-ui-id="registro.empty-state" className="p-8 text-center text-xs opacity-60 border rounded" style={{ borderColor: "var(--khora-border)" }}>
            No se encontraron eventos en el registro.
          </div>
        ) : agruparPorCorrelacion ? (
          <div data-ui-id="registro.events-list" className="space-y-6">
            {Object.entries(eventosAgrupados).map(([correlacionId, grupoEvts]) => (
              <section key={correlacionId} className="border rounded p-4 space-y-3" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
                <header className="border-b pb-2 flex justify-between items-center text-xs">
                  <span className="font-bold opacity-80">
                    Correlación: <code className="text-emerald-400">{correlacionId}</code>
                  </span>
                  <span className="opacity-60">{grupoEvts.length} eventos</span>
                </header>
                <div className="space-y-2">
                  {grupoEvts.map((evt) => (
                    <ItemEvento key={evt.id} evt={evt} expanded={!!expandedDetails[evt.id]} onToggle={() => actions.onToggleDetail?.(evt.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div data-ui-id="registro.events-list" className="space-y-2">
            {eventos.map((evt) => (
              <ItemEvento key={evt.id} evt={evt} expanded={!!expandedDetails[evt.id]} onToggle={() => actions.onToggleDetail?.(evt.id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ItemEvento({ evt, expanded, onToggle }: { evt: EventoSistema; expanded: boolean; onToggle: () => void }) {
  const cfg = ESTADO_CONFIG[evt.estado] || ESTADO_CONFIG.INFO;
  const faseColor = FASE_COLORS[evt.fase] || "var(--khora-accent)";

  return (
    <div
      data-ui-id="registro.event-item"
      className="border rounded text-xs transition-colors focus-within:ring-1 focus-within:ring-emerald-500"
      style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}
    >
      <button
        type="button"
        className="w-full text-left p-3 flex items-start justify-between gap-3 focus:outline-none"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-2.5 flex-1">
          <span className="text-base select-none">{cfg.icon}</span>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white"
                style={{ background: faseColor }}
              >
                {evt.fase}
              </span>
              <strong className="font-bold">{evt.event_id}</strong>
              <span className="opacity-60 text-[11px]">
                {new Date(evt.servidor_en).toLocaleString("es-MX")}
              </span>
              {evt.volcado_id && (
                <span className="opacity-70 text-[10px] border px-1 rounded" style={{ borderColor: "var(--khora-border)" }}>
                  volcado: {evt.volcado_id.slice(0, 8)}...
                </span>
              )}
            </div>
            <p className="font-medium text-sm leading-snug">{evt.mensaje}</p>
          </div>
        </div>

        <div className="p-1 opacity-60 hover:opacity-100">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t space-y-2 font-mono text-[11px]" style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 opacity-80 border-b pb-2" style={{ borderColor: "var(--khora-border)" }}>
            <div><strong>ID:</strong> {evt.id}</div>
            <div><strong>Estado:</strong> {evt.estado}</div>
            <div><strong>Correlación ID:</strong> {evt.correlacion_id || "N/A"}</div>
            <div><strong>Volcado ID:</strong> {evt.volcado_id || "N/A"} (v{evt.version || 1})</div>
            <div><strong>Hash Anterior:</strong> <code className="break-all">{evt.hash_anterior}</code></div>
            <div><strong>Event Hash:</strong> <code className="break-all">{evt.event_hash}</code></div>
          </div>

          <div>
            <strong className="block mb-1 opacity-80">Detalle estructurado (JSON):</strong>
            <pre className="p-2 border rounded overflow-x-auto whitespace-pre-wrap break-all text-[10px]" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
              {evt.detalle ? JSON.stringify(evt.detalle, null, 2) : "(sin detalle)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
