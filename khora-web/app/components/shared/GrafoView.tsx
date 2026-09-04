// @l0 L0-002 · @req VIZ-01/REQ-1 · Componente Presentacional Compartido de Grafo
"use client";

import React from "react";

export type GrafoNode = {
  id: string;
  summary: string;
  community: number;
  level: number;
  centrality: number;
  origen: string;
  timestamp: string;
  verificacion: string;
};

export type GrafoEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  origen: string;
  timestamp: string;
  verificacion: string;
};

export type GrafoViewState = {
  nodes: GrafoNode[];
  edges: GrafoEdge[];
  loading: boolean;
  error: string | null;
  viewMode: "list" | "graph";
  layer2Active: boolean;
  selectedElement: { type: "node" | "edge"; data: any } | null;
};

export type GrafoViewActions = {
  onSetViewMode?: (mode: "list" | "graph") => void;
  onSetLayer2Active?: (active: boolean) => void;
  onSelectElement?: (element: { type: "node" | "edge"; data: any } | null) => void;
};

export function GrafoView({
  state,
  actions = {},
  isReviewMode = false,
}: {
  state: GrafoViewState;
  actions?: GrafoViewActions;
  isReviewMode?: boolean;
}) {
  const { nodes, edges, loading, error, viewMode, layer2Active, selectedElement } = state;

  return (
    <div
      data-ui-id="grafo.container"
      style={{ backgroundColor: "var(--khora-bg)", color: "var(--khora-ink)" }}
      className="w-full min-h-screen relative flex flex-col overflow-hidden font-mono"
    >
      <header
        data-ui-id="grafo.header"
        style={{ backgroundColor: "var(--khora-surface)", borderBottom: "1px solid rgba(128, 128, 128, 0.3)" }}
        className="p-4 shadow-sm z-10 flex justify-between items-center"
      >
        <div>
          <h1 style={{ color: "var(--khora-ink)" }} className="text-xl font-bold tracking-wider">
            Grafo PKG - Proyección Leiden
          </h1>
          <p style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="text-sm">
            Vista de Entidades y Relaciones
          </p>
        </div>

        <div data-ui-id="grafo.view-toggle" className="flex gap-4 items-center">
          <button
            onClick={() => actions.onSetViewMode?.("list")}
            style={
              viewMode === "list"
                ? { backgroundColor: "var(--khora-accent)", color: "var(--khora-bg)" }
                : { backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", border: "1px solid rgba(128, 128, 128, 0.5)" }
            }
            className="px-3 py-1 rounded text-sm transition cursor-pointer font-medium"
          >
            Vista Lista
          </button>
          <button
            onClick={() => actions.onSetViewMode?.("graph")}
            style={
              viewMode === "graph"
                ? { backgroundColor: "var(--khora-accent)", color: "var(--khora-bg)" }
                : { backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", border: "1px solid rgba(128, 128, 128, 0.5)" }
            }
            className="px-3 py-1 rounded text-sm transition cursor-pointer font-medium"
          >
            Vista Grafo
          </button>

          {viewMode === "graph" && (
            <label style={{ color: "var(--khora-ink)" }} className="flex items-center space-x-2 text-sm cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={layer2Active}
                onChange={(e) => actions.onSetLayer2Active?.(e.target.checked)}
                className="rounded accent-zinc-500"
              />
              <span>Capa 2: Codificación Visual</span>
            </label>
          )}
        </div>
      </header>

      <div className="flex-1 relative overflow-auto p-4">
        {loading ? (
          <div data-ui-id="grafo.loading-state" className="p-8 text-center text-xs opacity-60">
            Cargando proyecciones del grafo...
          </div>
        ) : error ? (
          <div data-ui-id="grafo.error-state" className="p-8 text-center text-xs text-red-400">
            Error: {error}
          </div>
        ) : nodes.length === 0 ? (
          <div data-ui-id="grafo.empty-state" className="p-8 text-center text-xs opacity-60">
            El grafo está vacío.
          </div>
        ) : viewMode === "list" ? (
          <div data-ui-id="grafo.node-list" className="p-4 max-w-5xl mx-auto space-y-4">
            <h2 className="text-lg font-semibold mb-4">Lista Accesible de Nodos</h2>
            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => actions.onSelectElement?.({ type: "node", data: node })}
                style={{ backgroundColor: "var(--khora-surface)", border: "1px solid rgba(128, 128, 128, 0.3)" }}
                className="p-4 rounded shadow-sm flex flex-col gap-2 cursor-pointer hover:border-amber-400"
              >
                <p className="font-medium">{node.summary}</p>
                <div className="flex flex-wrap gap-4 text-xs opacity-80">
                  <span>Comunidad: {node.community}</span>
                  <span>Nivel: {node.level}</span>
                  <span>Centralidad: {node.centrality}</span>
                  <span>Origen: {node.origen}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] border border-zinc-600 bg-zinc-900">
                    {node.verificacion}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div data-ui-id="grafo.flow-view" className="p-4 space-y-4">
            <div className="p-4 border border-amber-500/40 bg-amber-950/20 text-xs text-amber-300">
              Vista diagramática del Grafo (Nodos: {nodes.length}, Aristas: {edges.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => actions.onSelectElement?.({ type: "node", data: n })}
                  className="p-3 border border-zinc-700 bg-zinc-900 rounded cursor-pointer hover:border-amber-400"
                >
                  <div className="font-bold text-xs">{n.summary}</div>
                  <div className="text-[10px] opacity-70 mt-1">Comunidad: {n.community} · Centralidad: {n.centrality}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedElement && (
          <div
            data-ui-id="grafo.panel-inspection"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              border: "1px solid rgba(128, 128, 128, 0.4)",
            }}
            className="fixed top-20 right-8 p-4 rounded-lg shadow-xl w-80 max-h-[80vh] overflow-auto z-50 text-xs"
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-700">
              <h3 className="font-bold uppercase">
                {selectedElement.type === "node" ? "Inspección de Comunidad" : "Inspección de Relación"}
              </h3>
              <button onClick={() => actions.onSelectElement?.(null)} className="cursor-pointer hover:opacity-75">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {selectedElement.type === "node" && (
                <>
                  <div>
                    <span className="font-semibold block opacity-70">Resumen</span>
                    <p className="mt-1 font-mono">{selectedElement.data.summary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="opacity-70">Comunidad:</span> {selectedElement.data.community}</div>
                    <div><span className="opacity-70">Nivel:</span> {selectedElement.data.level}</div>
                    <div><span className="opacity-70">Centralidad:</span> {selectedElement.data.centrality}</div>
                  </div>
                </>
              )}

              {selectedElement.type === "edge" && (
                <div>
                  <span className="font-semibold block opacity-70">Peso de Arista</span>
                  <p className="mt-1 font-mono">{selectedElement.data.weight}</p>
                </div>
              )}

              <div className="p-3 rounded border border-zinc-700 bg-zinc-950">
                <span className="font-semibold block mb-1 opacity-70">Procedencia</span>
                <p>Origen: {selectedElement.data.origen}</p>
                <p>Timestamp: {selectedElement.data.timestamp}</p>
                <p>Verificación: {selectedElement.data.verificacion}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
