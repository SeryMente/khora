// @l0 L0-002 · @req KPI-01/PANEL_VIEW · @acr ACR-1.1,ACR-2.1,ACR-3.1
"use client";

import React, { useState } from "react";
import {
  Activity,
  Zap,
  Clock,
  Gauge,
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  Layers,
  HelpCircle,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { Info } from "lucide-react";
import {
  generarPowerShellInstalacionOllama,
  copiarAlPortapapeles,
  diagnosticarConexionOllama,
  DiagnosticoOllamaResult,
} from "@/lib/client/ollamaLocal";
import { PerfilProveedor } from "./ConsultaView";
import {
  FRONTIER_BENCHMARKS_CONFIG,
  FrontierBenchmarkConfig,
} from "@/lib/config/frontier_benchmarks";
import {
  MODEL_CATALOG_CONFIG,
  ModelCatalogConfig,
  resolverModeloYVentanaLocal,
} from "@/lib/config/model_catalog";
import { logTelemetryEvent } from "@/lib/telemetry";

export interface ProfileKpiResult {
  perfil: PerfilProveedor;
  modeloOverride?: string;
  estado: "idle" | "generando" | "exito" | "error";
  contenido: string;
  errorMsg?: string;
  ttftMs: number | null;
  durationMs: number | null;
  realTokens: number | null;
  charCount: number;
  tps: number | null;
  isExactTokens: boolean;
  origenModel?: string;
}

export interface KpiPanelViewState {
  promptInput: string;
  selectedProfiles: PerfilProveedor[];
  resultados: Record<PerfilProveedor, ProfileKpiResult>;
  generandoGlobal: boolean;
  sinPerfilesConfigurados: boolean;
  benchmarksConfig?: FrontierBenchmarkConfig;
  catalogConfig?: ModelCatalogConfig;
}

export interface KpiPanelViewActions {
  onPromptInputChange?: (val: string) => void;
  onProfileToggle?: (perfil: PerfilProveedor, selected: boolean) => void;
  onSubmitComparacion?: (e: React.FormEvent) => void;
  onEjecutarFanOut?: (prompt: string, perfiles: PerfilProveedor[]) => Promise<void>;
}

export function KpiPanelView({
  state,
  actions = {},
}: {
  state: KpiPanelViewState;
  actions?: KpiPanelViewActions;
}) {
  const {
    promptInput,
    selectedProfiles,
    resultados,
    generandoGlobal,
    sinPerfilesConfigurados,
    benchmarksConfig = FRONTIER_BENCHMARKS_CONFIG,
    catalogConfig = MODEL_CATALOG_CONFIG,
  } = state;

  const [copiadoLocal, setCopiadoLocal] = useState(false);
  const [diagnosticoLocal, setDiagnosticoLocal] = useState<DiagnosticoOllamaResult | null>(null);
  const [comprobandoLocal, setComprobandoLocal] = useState(false);
  const [mostrarInfoLocal, setMostrarInfoLocal] = useState(false);

  const localConfig = catalogConfig.perfiles.find((p) => p.perfilId === "local");
  const modelosLocalesList = localConfig?.modelosLocales || [];

  const resueltoLocal = resolverModeloYVentanaLocal(
    resultados.local?.modeloOverride || "",
    diagnosticoLocal?.modelosInstalados || [],
    modelosLocalesList
  );

  const handleCopiarComandoKpi = async () => {
    const origen = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const cmd = generarPowerShellInstalacionOllama(resueltoLocal.modeloResuelto, origen);
    const exito = await copiarAlPortapapeles(cmd);
    if (exito) {
      setCopiadoLocal(true);
      setTimeout(() => setCopiadoLocal(false), 3000);
    }
  };

  const handleVerificarEstadoLocal = async () => {
    setComprobandoLocal(true);
    const diag = await diagnosticarConexionOllama(resueltoLocal.modeloResuelto);
    setDiagnosticoLocal(diag);
    setComprobandoLocal(false);
  };

  React.useEffect(() => {
    if (selectedProfiles.includes("local")) {
      handleVerificarEstadoLocal();
    }
  }, [selectedProfiles.includes("local"), resueltoLocal.modeloResuelto]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actions.onSubmitComparacion) {
      actions.onSubmitComparacion(e);
    } else if (actions.onEjecutarFanOut && promptInput.trim() && selectedProfiles.length > 0) {
      actions.onEjecutarFanOut(promptInput.trim(), selectedProfiles);
    }
  };

  const perfilesList: PerfilProveedor[] = ["groq", "gemini", "open_source", "local"];

  const hayErrorParcial = Object.values(resultados).some(
    (r) => selectedProfiles.includes(r.perfil) && r.estado === "error"
  );
  const hayExitoParcial = Object.values(resultados).some(
    (r) => selectedProfiles.includes(r.perfil) && r.estado === "exito"
  );

  return (
    <main
      data-ui-id="kpi.container"
      className="w-full flex justify-center p-4 py-8 pb-24 font-mono min-h-screen"
      style={{ background: "var(--khora-bg)", color: "var(--khora-ink)" }}
    >
      <div className="w-full max-w-6xl flex flex-col space-y-8">
        {/* Encabezado Principal */}
        <header
          data-ui-id="kpi.header"
          className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4"
          style={{ borderColor: "var(--khora-border)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Activity size={28} style={{ color: "var(--khora-accent)" }} />
              <h1 className="text-2xl font-bold uppercase tracking-wider">
                Panel de KPIs & Benchmarks LLM
              </h1>
            </div>
            <p className="text-xs opacity-70 mt-1">
              Medición de rendimiento empírico (TTFT, TPS) en paralelo (fan-out) y contraste contra modelos de frontera.
            </p>
          </div>
        </header>

        {/* Degradación Total: Ningún perfil configurado */}
        {sinPerfilesConfigurados && (
          <div
            data-ui-id="kpi.degraded-banner"
            role="alert"
            className="p-4 border rounded flex items-start gap-3 text-xs"
            style={{
              borderColor: "rgba(234, 179, 8, 0.4)",
              background: "rgba(234, 179, 8, 0.08)",
            }}
          >
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold uppercase text-amber-400">
                Panel Degradado: Sin Perfiles Configurados
              </span>
              <p className="opacity-90">
                Ningún perfil de proveedor LLM posee credenciales válidas en las variables de entorno del servidor (`KHORA_PERFIL_*`). Ingrese sus credenciales para habilitar la inferencia en vivo.
              </p>
            </div>
          </div>
        )}

        {/* Banner Informativo Proactivo de Diagnóstico en 4 Estados para Perfil Local */}
        {selectedProfiles.includes("local") && (
          <div
            className="p-4 border rounded space-y-3 text-xs font-mono"
            style={{
              borderColor:
                diagnosticoLocal?.estado === "listo"
                  ? "rgba(16, 185, 129, 0.4)"
                  : diagnosticoLocal?.estado === "sin_modelo"
                  ? "rgba(234, 179, 8, 0.4)"
                  : "rgba(239, 68, 68, 0.4)",
              background:
                diagnosticoLocal?.estado === "listo"
                  ? "rgba(16, 185, 129, 0.08)"
                  : diagnosticoLocal?.estado === "sin_modelo"
                  ? "rgba(234, 179, 8, 0.08)"
                  : "rgba(239, 68, 68, 0.08)",
            }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-blue-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-blue-400 block">
                      Perfil Local Activo (Ollama Directo Browser → http://localhost:11434)
                    </span>
                    <button
                      type="button"
                      onClick={() => setMostrarInfoLocal(!mostrarInfoLocal)}
                      className="text-blue-300 hover:text-blue-100 transition-colors"
                      title="¿Por qué es distinto el perfil local?"
                    >
                      <HelpCircle size={15} />
                    </button>
                  </div>
                  <span className="opacity-90 font-semibold block">
                    Estado:{" "}
                    {diagnosticoLocal?.estado === "listo" && (
                      <span className="text-emerald-400 font-bold">🟢 LISTO — Ollama activo con modelo disponible</span>
                    )}
                    {diagnosticoLocal?.estado === "sin_modelo" && (
                      <span className="text-amber-400 font-bold">⚠️ MODELO NO DESCARGADO — Ollama corriendo pero falta el modelo</span>
                    )}
                    {diagnosticoLocal?.estado === "no_instalado" && (
                      <span className="text-red-400 font-bold">🔴 NO CONECTADO — Ollama no instalado o no iniciado</span>
                    )}
                    {diagnosticoLocal?.estado === "error" && (
                      <span className="text-red-400 font-bold">❌ ERROR TÉCNICO — Falla en respuesta de Ollama</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleVerificarEstadoLocal}
                  disabled={comprobandoLocal}
                  className="px-2.5 py-1.5 font-bold uppercase rounded border text-[11px] bg-stone-800 border-stone-600 text-stone-200 hover:bg-stone-700"
                >
                  {comprobandoLocal ? "Comprobando..." : "Recomprobar"}
                </button>

                <div className="flex flex-col items-end">
                  <span className="text-[10px] opacity-80 text-blue-200 font-mono mb-1">
                    Pega este comando en PowerShell, espera a que termine, y vuelve aquí para recargar el estado.
                  </span>
                  <button
                    type="button"
                    onClick={handleCopiarComandoKpi}
                    className="px-3 py-1.5 font-bold uppercase rounded border text-xs flex items-center gap-1.5 transition-colors bg-blue-900/40 border-blue-600 text-blue-200 hover:bg-blue-800/50"
                  >
                    {copiadoLocal ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiadoLocal ? "¡Comando Copiado!" : "Copiar comando PowerShell"}
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Didáctico Explicativo del Perfil Local */}
            {mostrarInfoLocal && (
              <div className="p-3 border rounded bg-stone-900/90 border-blue-500/30 space-y-2 text-[11px]">
                <div className="font-bold text-blue-300 uppercase flex items-center gap-1.5">
                  <Info size={14} /> ¿Por qué el perfil 'local' es distinto?
                </div>
                <ul className="list-disc list-inside space-y-1 opacity-90 leading-relaxed">
                  <li>
                    <strong>Llamada directa desde el navegador:</strong> Las peticiones de inferencia salen directamente desde tu navegador hacia <code className="bg-black/40 px-1 rounded">http://localhost:11434</code> sin pasar por el servidor ni intermediarios de API.
                  </li>
                  <li>
                    <strong>Sin credenciales requeridas:</strong> No se transmiten API keys ni secretos al servidor de Khora para las consultas locales.
                  </li>
                  <li>
                    <strong>Rendimiento dependiente de tu hardware:</strong> Las métricas de velocidad (TTFT y TPS) dependen enteramente de la potencia de tu tarjeta gráfica (GPU/VRAM) y memoria RAM.
                  </li>
                </ul>
              </div>
            )}

            {diagnosticoLocal && (
              <div className="p-2.5 rounded bg-black/20 border border-white/5 space-y-1 text-[11px]">
                <p className="opacity-90">
                  <strong>Detalle:</strong> {diagnosticoLocal.mensaje}
                </p>
                <p className="opacity-80">
                  <strong>Acción sugerida:</strong> {diagnosticoLocal.accionSugerida}
                </p>
                {diagnosticoLocal.modelosInstalados.length > 0 && (
                  <p className="opacity-70 text-[10px]">
                    <strong>Modelos detectados en tu máquina:</strong> {diagnosticoLocal.modelosInstalados.join(", ")}
                  </p>
                )}
              </div>
            )}

            {resueltoLocal.modeloResuelto.startsWith("gpt-oss") && (
              <p className="text-[11px] text-amber-300 opacity-90 border-t border-blue-500/20 pt-2">
                ⚠️ <strong>Advertencia hardware:</strong> gpt-oss en cuantización MXFP4 cae a ejecución por CPU si la GPU no posee soporte completo para aceleración MXFP4.
              </p>
            )}
          </div>
        )}

        {/* Formulario de Fan-Out Multi-Perfil */}
        <section
          className="p-5 border rounded space-y-4"
          style={{
            borderColor: "var(--khora-border)",
            background: "var(--khora-surface)",
          }}
        >
          <form
            data-ui-id="kpi.form-input"
            onSubmit={handleFormSubmit}
            className="space-y-4"
          >
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-bold uppercase opacity-80 flex items-center gap-2">
                <Zap size={14} style={{ color: "var(--khora-accent)" }} />
                Prompt para Comparación Simultánea (Fan-Out)
              </label>
              <textarea
                data-ui-id="kpi.input-prompt"
                value={promptInput}
                onChange={(e) => actions.onPromptInputChange?.(e.target.value)}
                placeholder="Escribe el prompt que se enviará en paralelo a todos los perfiles seleccionados..."
                rows={3}
                disabled={generandoGlobal}
                className="w-full p-3 border rounded shadow-sm text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                style={{
                  borderColor: "var(--khora-border)",
                  background: "var(--khora-bg)",
                  color: "var(--khora-ink)",
                }}
              />
            </div>

            {/* Selección de Perfiles Participantes */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t" style={{ borderColor: "var(--khora-border)" }}>
              <div
                data-ui-id="kpi.profile-checkboxes"
                className="flex items-center gap-4 flex-wrap text-xs font-mono"
              >
                <span className="font-bold uppercase opacity-70">Perfiles Activos:</span>
                {perfilesList.map((p) => {
                  const isChecked = selectedProfiles.includes(p);
                  return (
                    <label
                      key={p}
                      className="flex items-center gap-1.5 cursor-pointer select-none font-bold uppercase"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          actions.onProfileToggle?.(p, e.target.checked)
                        }
                        disabled={generandoGlobal}
                        className="rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                      <span>{p}</span>
                    </label>
                  );
                })}
              </div>

              <button
                data-ui-id="kpi.btn-comparar"
                type="submit"
                disabled={
                  generandoGlobal ||
                  !promptInput.trim() ||
                  selectedProfiles.length === 0
                }
                className="px-5 py-2.5 font-bold uppercase rounded shadow-sm flex items-center gap-2 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--khora-accent)",
                  color: "var(--khora-bg)",
                }}
              >
                {generandoGlobal ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                {generandoGlobal ? "Midiendo..." : "Comparar en Paralelo"}
              </button>
            </div>
          </form>
        </section>

        {/* Banner de Fallo Parcial */}
        {hayErrorParcial && hayExitoParcial && (
          <div
            data-ui-id="kpi.error-banner"
            role="alert"
            className="p-3 border rounded flex items-center justify-between gap-2 text-xs text-amber-300 border-amber-800/50 bg-amber-950/20 flex-wrap"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>
                Fallo parcial detectado: Uno o más perfiles respondieron con error, pero el panel continúa operativo visualizando los demás resultados.
              </span>
            </div>

            {resultados.local?.estado === "error" && (
              <button
                type="button"
                onClick={handleCopiarComandoKpi}
                className="px-3 py-1 font-bold uppercase rounded border text-[11px] flex items-center gap-1 bg-amber-950 border-amber-700 text-amber-200 hover:bg-amber-900"
              >
                {copiadoLocal ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copiadoLocal ? "¡Comando Copiado!" : "Copiar comando de instalación PowerShell"}
              </button>
            )}
          </div>
        )}

        {/* Grid de Resultados Lado a Lado (Comparación en Paralelo) */}
        <section
          data-ui-id="kpi.results-grid"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {perfilesList.map((p) => {
            const isSelected = selectedProfiles.includes(p);
            const res = resultados[p] || {
              perfil: p,
              estado: "idle",
              contenido: "",
              ttftMs: null,
              durationMs: null,
              realTokens: null,
              charCount: 0,
              tps: null,
              isExactTokens: false,
            };

            if (!isSelected) {
              return (
                <article
                  key={p}
                  data-ui-id="kpi.card-result"
                  className="p-4 border rounded space-y-2 text-xs opacity-40 border-dashed"
                  style={{ borderColor: "var(--khora-border)" }}
                >
                  <div className="font-bold uppercase tracking-wider text-center py-6">
                    Perfil {p} (Inactivo)
                  </div>
                </article>
              );
            }

            return (
              <article
                key={p}
                data-ui-id="kpi.card-result"
                className="p-4 border rounded flex flex-col justify-between space-y-4 text-xs transition-colors"
                style={{
                  borderColor:
                    res.estado === "error"
                      ? "rgba(239, 68, 68, 0.5)"
                      : "var(--khora-border)",
                  background: "var(--khora-surface)",
                }}
              >
                {/* Header de Tarjeta */}
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--khora-border)" }}>
                  <div className="flex items-center gap-2">
                    <Cpu size={16} style={{ color: "var(--khora-accent)" }} />
                    <span className="font-bold uppercase tracking-wider">
                      {p}
                    </span>
                  </div>

                  {/* Badges de Estado */}
                  <span className="flex items-center gap-1 font-bold text-[10px] uppercase">
                    {res.estado === "idle" && (
                      <span className="opacity-60">Esperando</span>
                    )}
                    {res.estado === "generando" && (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> Streaming
                      </span>
                    )}
                    {res.estado === "exito" && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Completado
                      </span>
                    )}
                    {res.estado === "error" && (
                      <span className="text-red-400 flex items-center gap-1">
                        <XCircle size={12} /> Error
                      </span>
                    )}
                  </span>
                </div>

                {/* Métricas Principales (TTFT, TPS, Duración, Tokens) */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded bg-stone-900/40 border border-white/5">
                  {/* TTFT */}
                  <div data-ui-id="kpi.metric-ttft" className="space-y-0.5">
                    <span className="text-[10px] uppercase opacity-60 flex items-center gap-1">
                      <Clock size={10} /> TTFT
                    </span>
                    <p className="font-bold text-sm text-emerald-400">
                      {res.ttftMs !== null ? `${res.ttftMs} ms` : "—"}
                    </p>
                  </div>

                  {/* TPS */}
                  <div data-ui-id="kpi.metric-tps" className="space-y-0.5">
                    <span className="text-[10px] uppercase opacity-60 flex items-center gap-1">
                      <Gauge size={10} /> TPS
                    </span>
                    <p className="font-bold text-sm text-emerald-400">
                      {res.tps !== null ? (
                        <>
                          {res.tps.toFixed(1)}{" "}
                          <span className="text-[9px] font-normal opacity-70">
                            tok/s ({res.isExactTokens ? "real" : "estimado"})
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>

                  {/* Duración */}
                  <div data-ui-id="kpi.metric-duration" className="space-y-0.5">
                    <span className="text-[10px] uppercase opacity-60">Duración</span>
                    <p className="font-mono text-xs opacity-90">
                      {res.durationMs !== null ? `${(res.durationMs / 1000).toFixed(2)} s` : "—"}
                    </p>
                  </div>

                  {/* Tokens */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase opacity-60">Tokens</span>
                    <p className="font-mono text-xs opacity-90">
                      {res.realTokens !== null ? (
                        <span title="Tokens reales del proveedor">{res.realTokens} (real)</span>
                      ) : res.charCount > 0 ? (
                        <span title="Estimación basada en char_count/4">
                          {Math.ceil(res.charCount / 4)} (estimado)
                        </span>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </div>

                {/* Área de Texto o Error */}
                <div className="flex-1 min-h-[140px] max-h-[250px] overflow-y-auto p-2 border rounded font-sans text-xs whitespace-pre-wrap leading-relaxed space-y-2" style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }}>
                  {res.estado === "error" ? (
                    <div className="text-red-400 font-mono text-[11px] space-y-2">
                      <strong>Detalle de Error:</strong>
                      <p>{res.errorMsg || "Error al conectar con el perfil."}</p>
                      {p === "local" && (
                        <button
                          type="button"
                          onClick={handleCopiarComandoKpi}
                          className="mt-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded border flex items-center gap-1 bg-red-950 border-red-700 text-red-200 hover:bg-red-900"
                        >
                          {copiadoLocal ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          {copiadoLocal ? "¡Comando Copiado!" : "Copiar comando PowerShell"}
                        </button>
                      )}
                    </div>
                  ) : res.contenido ? (
                    res.contenido
                  ) : (
                    <span className="opacity-40 italic font-mono text-[11px]">
                      {res.estado === "generando" ? "Recibiendo tokens..." : "Esperando inicio de prueba..."}
                    </span>
                  )}
                </div>

                {/* Origen Declarado */}
                {res.origenModel && (
                  <div className="text-[10px] font-mono opacity-60 text-right truncate">
                    Origen: {res.origenModel}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {/* Tabla de Referencia de Benchmarks de Frontera */}
        <section
          data-ui-id="kpi.benchmarks-table"
          className="p-5 border rounded space-y-4"
          style={{
            borderColor: "var(--khora-border)",
            background: "var(--khora-surface)",
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--khora-border)" }}>
            <h2 className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
              <Layers size={18} style={{ color: "var(--khora-accent)" }} />
              Tabla de Referencia: Benchmarks de Frontera vs. Uso Empírico
            </h2>
            <span className="text-[10px] opacity-60 font-mono">
              Config v{benchmarksConfig.version}
            </span>
          </div>

          <p className="text-xs opacity-75 leading-relaxed">
            Comparativa estática mantenida en configuración contra los modelos comerciales de frontera líderes. Las métricas TTFT y TPS de tus perfiles locales/gratuitos se miden en vivo arriba.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b uppercase text-[10px] opacity-70" style={{ borderColor: "var(--khora-border)" }}>
                  <th className="p-2.5">Modelo / Proveedor</th>
                  <th className="p-2.5 text-center">Tipo</th>
                  {Object.entries(benchmarksConfig.definicionMetricas).map(([key, info]) => (
                    <th key={key} className="p-2.5 text-right">
                      {info.nombre} ({info.unidad})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--khora-border)" }}>
                {/* Modelos de Frontera Estáticos */}
                {benchmarksConfig.modelosFrontera.map((m) => (
                  <tr key={m.nombreModelo} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 font-bold">
                      {m.nombreModelo}{" "}
                      <span className="text-[10px] font-normal opacity-60">({m.proveedor})</span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Frontera
                      </span>
                    </td>
                    {Object.keys(benchmarksConfig.definicionMetricas).map((metricKey) => (
                      <td key={metricKey} className="p-2.5 text-right font-mono">
                        {m.puntuaciones[metricKey] !== undefined
                          ? m.puntuaciones[metricKey]
                          : "—"}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Filas Empíricas Medidas en la Sesión Activa */}
                {perfilesList.map((p) => {
                  const res = resultados[p];
                  if (!res || res.estado !== "exito") return null;
                  return (
                    <tr key={`empirico-${p}`} className="bg-emerald-950/10 hover:bg-emerald-950/20">
                      <td className="p-2.5 font-bold text-emerald-400">
                        Perfil {p}{" "}
                        <span className="text-[10px] font-normal opacity-70">(Medición Local)</span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Empírico
                        </span>
                      </td>
                      {Object.keys(benchmarksConfig.definicionMetricas).map((metricKey) => {
                        let valStr = "—";
                        if (metricKey === "TTFT_ms" && res.ttftMs !== null) {
                          valStr = `${res.ttftMs}`;
                        } else if (metricKey === "TPS" && res.tps !== null) {
                          valStr = `${res.tps.toFixed(1)}`;
                        }
                        return (
                          <td key={metricKey} className="p-2.5 text-right font-mono font-bold text-emerald-400">
                            {valStr}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Catálogo de Modelos & Capacidades */}
        <section
          data-ui-id="kpi.catalog-section"
          className="p-5 border rounded space-y-4"
          style={{
            borderColor: "var(--khora-border)",
            background: "var(--khora-surface)",
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--khora-border)" }}>
            <h2 className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
              <Database size={18} style={{ color: "var(--khora-accent)" }} />
              Catálogo Estático de Modelos & Capacidades
            </h2>
            <span className="text-[10px] opacity-60 font-mono">
              Catálogo v{catalogConfig.version}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {catalogConfig.perfiles.map((item) => (
              <div
                key={item.perfilId}
                className="p-4 border rounded space-y-3 text-xs"
                style={{
                  borderColor: "var(--khora-border)",
                  background: "var(--khora-bg)",
                }}
              >
                <div className="font-bold text-sm uppercase text-emerald-400 border-b pb-1" style={{ borderColor: "var(--khora-border)" }}>
                  {item.nombreProveedor}
                </div>

                {item.perfilId === "local" ? (
                  <div className="space-y-1 text-[11px]">
                    <div>
                      <span className="opacity-60">Modelo Activo:</span>{" "}
                      <strong className="font-mono text-emerald-400">{resueltoLocal.modeloResuelto}</strong>
                      <span className="text-[10px] block opacity-75 font-mono">({resueltoLocal.descripcionFuente})</span>
                    </div>
                    <div>
                      <span className="opacity-60">Ventana Contexto:</span>{" "}
                      <strong className="font-mono">
                        {resueltoLocal.ventanaContextoTokens !== null
                          ? `${resueltoLocal.ventanaContextoTokens.toLocaleString()} tokens`
                          : "No especificado"}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-[11px]">
                    <div>
                      <span className="opacity-60">Modelo por Defecto:</span>{" "}
                      <strong className="font-mono">{item.modeloDefecto}</strong>
                    </div>
                    <div>
                      <span className="opacity-60">Ventana Contexto:</span>{" "}
                      <strong className="font-mono">
                        {item.ventanaContextoTokens !== undefined
                          ? `${item.ventanaContextoTokens.toLocaleString()} tokens`
                          : "—"}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Badges de Capacidades */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase opacity-60 block">Capacidades:</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(item.capacidades).map(([capKey, capVal]) => (
                      <span
                        key={capKey}
                        className="px-2 py-0.5 rounded text-[10px] font-mono border bg-stone-800 border-stone-700 text-stone-300"
                      >
                        {capKey}: {String(capVal)}
                      </span>
                    ))}
                  </div>
                </div>

                {item.notas && (
                  <p className="text-[10px] opacity-70 italic border-t pt-2" style={{ borderColor: "var(--khora-border)" }}>
                    {item.notas}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
