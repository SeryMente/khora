// @l0 L0-002 · @req VIZ-01/REQ-1 · Componente Presentacional Compartido de Grafo
"use client";

import React, { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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
  type?: string;
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

const COMMUNITY_PALETTE = [
  "#64748B",
  "#818CF8",
  "#14B8A6",
  "#F59E0B",
  "#E879F9",
  "#38BDF8",
  "#A3E635",
  "#FB7185",
];

type FlowNodeData = {
  graphNode: GrafoNode;
  layer2Active: boolean;
  onSelect?: (node: GrafoNode) => void;
};

function communityColor(community: number): string {
  const normalized = Math.abs(Math.trunc(community || 0));
  return COMMUNITY_PALETTE[normalized % COMMUNITY_PALETTE.length];
}

type FlowNode = Node<FlowNodeData>;

function GraphNode({ data }: NodeProps<FlowNode>) {
  const node = data.graphNode;
  const color = data.layer2Active ? communityColor(node.community) : "#64748B";
  const scale = Math.max(0.88, Math.min(1.3, 0.9 + Number(node.centrality || 1) * 0.08));

  return (
    <div
      data-ui-id="grafo.flow-node"
      className="relative rounded-xl border px-2 py-2 shadow-lg"
      style={{
        width: 230 * scale,
        minHeight: 92,
        background: "var(--khora-surface)",
        color: "var(--khora-ink)",
        borderColor: color,
        boxShadow: `0 0 0 1px ${color}33, 0 8px 24px rgba(0,0,0,.22)`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0" style={{ background: color }} />
      <button
        type="button"
        aria-label={"Inspeccionar nodo: " + node.summary}
        className="block w-full rounded-lg px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"
        onClick={(event) => {
          event.stopPropagation();
          data.onSelect?.(node);
        }}
      >
        <span className="mb-2 block truncate text-xs font-bold" title={node.summary}>
          {node.summary}
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] opacity-75">
          <span>Comunidad {node.community}</span>
          <span>Nivel {node.level}</span>
          <span>Centralidad {node.centrality}</span>
        </span>
        <span className="mt-2 block truncate text-[9px] opacity-60" title={node.origen}>
          {node.verificacion} · {node.origen}
        </span>
      </button>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0" style={{ background: color }} />
    </div>
  );
}

const nodeTypes = { graphNode: GraphNode };

export function GrafoView({
  state,
  actions = {},
}: {
  state: GrafoViewState;
  actions?: GrafoViewActions;
  isReviewMode?: boolean;
}) {
  const { nodes, edges, loading, error, viewMode, layer2Active, selectedElement } = state;

  const flowNodes = useMemo<Node<FlowNodeData>[]>(() => {
    const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(nodes.length, 1))));
    return nodes.map((node, index) => ({
      id: node.id,
      type: "graphNode",
      position: {
        x: (index % columns) * 300,
        y: Math.floor(index / columns) * 150,
      },
      data: {
        graphNode: node,
        layer2Active,
        onSelect: (selected) => actions.onSelectElement?.({ type: "node", data: selected }),
      },
    }));
  }, [actions, layer2Active, nodes]);

  const flowEdges = useMemo<Edge[]>(() => {
    const valid = new Set(nodes.map((node) => node.id));
    return edges
      .filter((edge) => valid.has(edge.source) && valid.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.type || "RELATION",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        animated: false,
        style: { stroke: "var(--khora-accent)", strokeWidth: Math.max(1, Math.min(4, edge.weight || 1)) },
        labelStyle: { fill: "var(--khora-ink)", fontSize: 9 },
        labelBgStyle: { fill: "var(--khora-surface)", fillOpacity: 0.85 },
      }));
  }, [edges, nodes]);

  const inspectionContent = selectedElement ? (
    <>
      <div className="mb-4 flex items-center justify-between border-b border-zinc-700 pb-2 text-xs">
        <h3 className="font-bold uppercase">
          {selectedElement.type === "node" ? "Inspección de Comunidad" : "Inspección de Relación"}
        </h3>
        <button
          type="button"
          onClick={() => actions.onSelectElement?.(null)}
          className="cursor-pointer opacity-80 hover:opacity-100"
          aria-label="Cerrar inspección"
        >
          ✕
        </button>
      </div>

      {selectedElement.type === "node" ? (
        <div className="space-y-3 text-xs">
          <div>
            <span className="block opacity-70">Resumen</span>
            <p className="mt-1">{selectedElement.data.summary}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><span className="opacity-70">Comunidad:</span> {selectedElement.data.community}</div>
            <div><span className="opacity-70">Nivel:</span> {selectedElement.data.level}</div>
            <div><span className="opacity-70">Centralidad:</span> {selectedElement.data.centrality}</div>
          </div>
          <div className="rounded border border-zinc-700 bg-zinc-950 p-3">
            <span className="mb-1 block font-semibold opacity-70">Procedencia</span>
            <p>Origen: {selectedElement.data.origen}</p>
            <p>Timestamp: {selectedElement.data.timestamp}</p>
            <p>Verificación: {selectedElement.data.verificacion}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <div><span className="opacity-70">Relación:</span> {selectedElement.data.type || "RELATION"}</div>
          <div><span className="opacity-70">Peso:</span> {selectedElement.data.weight}</div>
          <div><span className="opacity-70">Origen:</span> {selectedElement.data.origen}</div>
          <div><span className="opacity-70">Timestamp:</span> {selectedElement.data.timestamp}</div>
          <div><span className="opacity-70">Verificación:</span> {selectedElement.data.verificacion}</div>
        </div>
      )}
    </>
  ) : null;

  const inspectionPanel = selectedElement ? (
    <Panel
      position="top-right"
      className="!m-4 !w-80 !rounded-lg !border !border-zinc-700 !p-4 !shadow-xl"
      style={{ backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}
      data-ui-id="grafo.panel-inspection"
    >
      {inspectionContent}
    </Panel>
  ) : null;

  const listInspectionPanel = selectedElement && viewMode === "list" ? (
    <aside
      data-ui-id="grafo.panel-inspection"
      className="mx-auto mt-4 w-full max-w-5xl rounded-lg border p-4 shadow-xl"
      style={{ backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", borderColor: "var(--khora-border)" }}
      aria-label="Inspección de elemento seleccionado"
    >
      {inspectionContent}
    </aside>
  ) : null;

  return (
    <div
      data-ui-id="grafo.container"
      className="flex min-h-screen w-full flex-col overflow-hidden font-mono"
      style={{ backgroundColor: "var(--khora-bg)", color: "var(--khora-ink)" }}
    >
      <header
        data-ui-id="grafo.header"
        className="z-10 flex items-center justify-between border-b p-4 shadow-sm"
        style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
      >
        <div>
          <h1 className="text-xl font-bold tracking-wider" style={{ color: "var(--khora-ink)" }}>
            Grafo PKG - Proyección Leiden
          </h1>
          <p className="text-sm opacity-70">Vista de Entidades y Relaciones</p>
        </div>

        <div data-ui-id="grafo.view-toggle" className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => actions.onSetViewMode?.("list")}
            className="cursor-pointer rounded px-3 py-1 text-sm font-medium transition"
            style={
              viewMode === "list"
                ? { backgroundColor: "var(--khora-accent)", color: "var(--khora-bg)" }
                : { backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", border: "1px solid rgba(128,128,128,.5)" }
            }
          >
            Vista Lista
          </button>
          <button
            type="button"
            onClick={() => actions.onSetViewMode?.("graph")}
            className="cursor-pointer rounded px-3 py-1 text-sm font-medium transition"
            style={
              viewMode === "graph"
                ? { backgroundColor: "var(--khora-accent)", color: "var(--khora-bg)" }
                : { backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", border: "1px solid rgba(128,128,128,.5)" }
            }
          >
            Vista Grafo
          </button>

          {viewMode === "graph" && (
            <label className="ml-4 flex cursor-pointer items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={layer2Active}
                onChange={(event) => actions.onSetLayer2Active?.(event.target.checked)}
                className="rounded"
              />
              <span>Capa 2: Codificación Visual</span>
            </label>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1">
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
          <>
            <div data-ui-id="grafo.node-list" className="max-w-5xl mx-auto space-y-4 overflow-auto p-4">
              <h2 className="mb-4 text-lg font-semibold">Lista Accesible de Nodos</h2>
              {nodes.map((node) => (
                <button
                  type="button"
                  key={node.id}
                  onClick={() => actions.onSelectElement?.({ type: "node", data: node })}
                  aria-label={"Inspeccionar nodo: " + node.summary}
                  className="flex w-full cursor-pointer flex-col gap-2 rounded border p-4 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"
                  style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
                >
                  <p className="font-medium">{node.summary}</p>
                  <div className="flex flex-wrap gap-4 text-xs opacity-80">
                    <span>Comunidad: {node.community}</span>
                    <span>Nivel: {node.level}</span>
                    <span>Centralidad: {node.centrality}</span>
                    <span>Origen: {node.origen}</span>
                    <span>{node.verificacion}</span>
                  </div>
                </button>
              ))}
            </div>
            {listInspectionPanel}
          </>
        ) : (
          <div
            data-ui-id="grafo.flow-view"
            className="relative h-[calc(100vh-92px)] min-h-[560px] w-full"
          >
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.15}
              maxZoom={2}
              onEdgeClick={(event, edge) => {
                event.stopPropagation();
                const selected = edges.find((candidate) => candidate.id === edge.id);
                if (selected) actions.onSelectElement?.({ type: "edge", data: selected });
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={22} size={1} color="rgba(140,148,160,.16)" />
              <Controls position="bottom-left" />
              {inspectionPanel}
            </ReactFlow>
          </div>
        )}
      </main>
    </div>
  );
}
