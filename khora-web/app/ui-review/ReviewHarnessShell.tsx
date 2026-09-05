// @l0 L0-002 · @req UI-REVIEW/SHELL · Harness WebAgnóstico de Revisión Visual
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SCREENS, UI_REVIEW_SCENARIOS, getAllScenariosForScreen } from "@/lib/ui-review/registry";
import { ScreenId, ViewportMode, VIEWPORTS, ReviewContextInfo } from "@/lib/ui-review/types";
import { ReviewFixtureAdapter } from "@/lib/ui-review/adapters";
import {
  buildIngresoState,
  buildPipelineState,
  buildRegistroState,
  buildGrafoState,
} from "@/lib/ui-review/states";
import { IngresoView } from "@/app/components/shared/IngresoView";
import { PipelineView } from "@/app/components/shared/PipelineView";
import { RegistroView } from "@/app/components/shared/RegistroView";
import { GrafoView } from "@/app/components/shared/GrafoView";
import * as Icons from "lucide-react";

const adapter = new ReviewFixtureAdapter();

export function ReviewHarnessShell({ initialScreen }: { initialScreen?: ScreenId }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentScreen: ScreenId = useMemo(() => {
    if (initialScreen) return initialScreen;
    const parts = (pathname || "").split("/").filter(Boolean);
    if (parts.length >= 2 && SCREENS.includes(parts[1] as ScreenId)) {
      return parts[1] as ScreenId;
    }
    return "ingreso";
  }, [pathname, initialScreen]);

  const availableScenarios = useMemo(() => getAllScenariosForScreen(currentScreen), [currentScreen]);

  const currentScenarioName = searchParams?.get("scenario") || availableScenarios[0]?.scenario || "idle";
  const viewportMode: ViewportMode = (searchParams?.get("viewport") as ViewportMode) || "desktop";

  const currentScenarioDef = useMemo(() => {
    return (
      availableScenarios.find((s) => s.scenario === currentScenarioName) ||
      availableScenarios[0]
    );
  }, [availableScenarios, currentScenarioName]);

  const [selectedUiId, setSelectedUiId] = useState<string | undefined>(undefined);
  const [copyMsg, setCopyMsg] = useState<string>("");

  // Data states for fixtures
  const [volcados, setVolcados] = useState<any[]>([]);
  const [volcado, setVolcado] = useState<any>(null);
  const [gateDecision, setGateDecision] = useState<any>(null);
  const [incidentes, setIncidentes] = useState<any[]>([]);
  const [hallazgos, setHallazgos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [grafoData, setGrafoData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load fixture data when screen or scenario changes
  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setFetchError(null);
      try {
        const [vs, v, gate, incs, hals, evts, g] = await Promise.all([
          adapter.getVolcados(currentScenarioName).catch((e) => { setFetchError(e.message); return []; }),
          adapter.getVolcadoById("v-sintetico-001", currentScenarioName).catch(() => null),
          adapter.getGateDecision("v-sintetico-001", currentScenarioName).catch(() => null),
          adapter.getIncidentes("v-sintetico-001", currentScenarioName).catch(() => []),
          adapter.getHallazgos("v-sintetico-001", currentScenarioName).catch(() => []),
          adapter.getEventos(currentScenarioName).catch((e) => { setFetchError(e.message); return []; }),
          adapter.getGrafoData(currentScenarioName).catch((e) => { setFetchError(e.message); return { nodes: [], edges: [] }; }),
        ]);

        if (active) {
          setVolcados(vs);
          setVolcado(v);
          setGateDecision(gate);
          setIncidentes(incs);
          setHallazgos(hals);
          setEventos(evts);
          setGrafoData(g);
        }
      } catch (err: any) {
        if (active) setFetchError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => { active = false; };
  }, [currentScreen, currentScenarioName]);

  const updateUrl = (screen: ScreenId, scenario: string, viewport: ViewportMode) => {
    const params = new URLSearchParams();
    params.set("scenario", scenario);
    params.set("viewport", viewport);
    router.push(`/ui-review/${screen}?${params.toString()}`);
  };

  const handleScreenChange = (screen: ScreenId) => {
    const scenarios = getAllScenariosForScreen(screen);
    const defaultScenario = scenarios[0]?.scenario || "idle";
    updateUrl(screen, defaultScenario, viewportMode);
  };

  const handleScenarioChange = (scenario: string) => {
    updateUrl(currentScreen, scenario, viewportMode);
  };

  const handleViewportChange = (mode: ViewportMode) => {
    updateUrl(currentScreen, currentScenarioName, mode);
  };

  const copyContextInfo = async () => {
    const info: ReviewContextInfo = {
      base_url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      release_sha: process.env.NEXT_PUBLIC_RELEASE_SHA || "dev-commit",
      source_fingerprint: "fingerprint-review-harness",
      screen: currentScreen,
      scenario: currentScenarioName,
      viewport: viewportMode,
      selected_ui_id: selectedUiId,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
      setCopyMsg("Contexto copiado al portapapeles");
      setTimeout(() => setCopyMsg(""), 3000);
    } catch {
      setCopyMsg("Error al copiar");
    }
  };

  const viewportConfig = VIEWPORTS[viewportMode];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Banner Fail-Closed & Context Indicator */}
      <header className="bg-amber-500 text-zinc-950 px-4 py-2 text-xs font-mono font-bold flex flex-wrap justify-between items-center gap-2 border-b border-amber-600 shadow-md">
        <div className="flex items-center gap-2">
          <Icons.ShieldCheck size={18} />
          <span>UI REVIEW · datos sintéticos · solo lectura</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="opacity-90">Pantalla: <strong>{currentScreen}</strong> | Escenario: <strong>{currentScenarioName}</strong></span>
          <button
            onClick={copyContextInfo}
            className="px-2.5 py-1 bg-zinc-950 text-amber-400 font-bold hover:bg-zinc-900 border border-amber-400 cursor-pointer text-[11px] flex items-center gap-1"
          >
            <Icons.Copy size={12} />
            Copiar contexto
          </button>
          {copyMsg && <span className="text-zinc-950 underline">{copyMsg}</span>}
        </div>
      </header>

      {/* Harness Control Panel */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 space-y-3 font-mono text-xs">
        {/* Screen Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold opacity-70 uppercase tracking-wider text-[11px] mr-2">Pantalla:</span>
          {SCREENS.map((s) => (
            <button
              key={s}
              onClick={() => handleScreenChange(s)}
              className={`px-3 py-1.5 border font-bold uppercase cursor-pointer transition-all ${
                currentScreen === s
                  ? "bg-amber-400 text-zinc-950 border-amber-400"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Scenario Selector & Viewport Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="font-bold opacity-70 uppercase tracking-wider text-[11px]">Escenario:</span>
            <select
              value={currentScenarioName}
              onChange={(e) => handleScenarioChange(e.target.value)}
              className="px-3 py-1.5 border bg-zinc-950 border-zinc-700 text-zinc-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {availableScenarios.map((sc) => (
                <option key={sc.scenario} value={sc.scenario}>
                  {sc.title} ({sc.scenario})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold opacity-70 uppercase tracking-wider text-[11px]">Viewport:</span>
            <div className="flex border border-zinc-700">
              <button
                onClick={() => handleViewportChange("desktop")}
                className={`px-3 py-1 flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                  viewportMode === "desktop" ? "bg-amber-400 text-zinc-950" : "bg-zinc-800 text-zinc-300"
                }`}
              >
                <Icons.Monitor size={14} /> Desktop (1440×900)
              </button>
              <button
                onClick={() => handleViewportChange("mobile")}
                className={`px-3 py-1 flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                  viewportMode === "mobile" ? "bg-amber-400 text-zinc-950" : "bg-zinc-800 text-zinc-300"
                }`}
              >
                <Icons.Smartphone size={14} /> Mobile (390×844)
              </button>
            </div>
          </div>
        </div>

        {/* Scenario Description & ui_ids list */}
        {currentScenarioDef && (
          <div className="p-3 border border-zinc-800 bg-zinc-950/80 rounded space-y-1.5 text-[11px]">
            <div className="flex justify-between items-start">
              <strong className="text-amber-400">{currentScenarioDef.title}</strong>
              <span className="opacity-60 text-[10px]">Elegible UI IDs ({currentScenarioDef.ui_ids.length})</span>
            </div>
            <p className="text-zinc-300">{currentScenarioDef.description}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {currentScenarioDef.ui_ids.map((id) => (
                <button
                  key={id}
                  onClick={() => setSelectedUiId(id === selectedUiId ? undefined : id)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                    selectedUiId === id
                      ? "bg-amber-400 text-zinc-950 border-amber-400 font-bold"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Screen Preview Frame */}
      <main className="flex-1 flex justify-center items-start p-4 bg-zinc-950 overflow-auto">
        <div
          style={{
            width: viewportMode === "desktop" ? "100%" : `${viewportConfig.width}px`,
            maxWidth: `${viewportConfig.width}px`,
            minHeight: `${viewportConfig.height}px`,
          }}
          className="border border-zinc-800 bg-[var(--khora-bg)] text-[var(--khora-ink)] shadow-2xl transition-all duration-300 relative"
        >
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-amber-400">
              Cargando escenario sintético...
            </div>
          ) : (
            <RenderCurrentScreen
              screen={currentScreen}
              scenario={currentScenarioName}
              volcados={volcados}
              volcado={volcado}
              gateDecision={gateDecision}
              incidentes={incidentes}
              hallazgos={hallazgos}
              eventos={eventos}
              grafoData={grafoData}
              fetchError={fetchError}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function RenderCurrentScreen({
  screen,
  scenario,
  volcados,
  volcado,
  gateDecision,
  incidentes,
  hallazgos,
  eventos,
  grafoData,
  fetchError,
}: {
  screen: ScreenId;
  scenario: string;
  volcados: any[];
  volcado: any;
  gateDecision: any;
  incidentes: any[];
  hallazgos: any[];
  eventos: any[];
  grafoData: { nodes: any[]; edges: any[] };
  fetchError: string | null;
}) {
  switch (screen) {
    case "ingreso":
      return (
        <IngresoView isReviewMode state={buildIngresoState(scenario, fetchError)} />
      );

    case "archivo":
    case "revision":
    case "aprobacion":
    case "ingesta":
      return (
        <PipelineView isReviewMode state={buildPipelineState(scenario, fetchError)} />
      );

    case "registro":
      return (
        <RegistroView isReviewMode state={buildRegistroState(scenario, fetchError)} />
      );

    case "grafo":
      return (
        <GrafoView isReviewMode state={buildGrafoState(scenario, fetchError)} />
      );

    default:
      return <div className="p-8 text-xs font-mono opacity-60">Pantalla no reconocida</div>;
  }
}
