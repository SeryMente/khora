// @l0 L0-002 · @req VIZ-01/REQ-1 · Componente Presentacional Compartido de Grafo
"use client";

import React, { useMemo, useState } from "react";
import { layoutPublishedCommunities, CARD_WIDTH, CARD_HEIGHT } from "../../../lib/graph-presentation";
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
  communityId?: string | null;
  communityRevision?: string | null;
  level: number;
  centrality: number;
  origen: string;
  timestamp: string;
  verificacion: string;
};

export type GrafoEvidence = {subject:string;predicate:string;object:string;quote:string;attribution:string;modality:string;event_time:string;start:number;end:number;source:{volcado_id:string;version:number;sha256:string}};
export type GrafoEdge = {
  evidence?: GrafoEvidence;
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
  "#5E9FE8",
  "#72BC8F",
  "#EAC26B",
  "#BF8EDA",
  "#38BDF8",
  "#DE9255",
  "#DF84A8",
];

type FlowNodeData = {
  graphNode: GrafoNode;
  layer2Active: boolean;
  communityLabel: string;
  colorIndex: number;
  onSelect?: (node: GrafoNode) => void;
};

function communityColor(community: number): string {
  const normalized = Math.abs(Math.trunc(community || 0));
  return COMMUNITY_PALETTE[normalized % COMMUNITY_PALETTE.length];
}

type FlowNode = Node<FlowNodeData>;

function GraphNode({ data }: NodeProps<FlowNode>) {
  const node = data.graphNode;
  const color = data.layer2Active ? communityColor(data.colorIndex) : "#64748B";

  return (
    <div
      data-ui-id="grafo.flow-node"
      className="relative rounded-lg border px-2 py-2"
      style={{
        width: CARD_WIDTH,
        minHeight: CARD_HEIGHT,
        background: "var(--khora-surface)",
        color: "var(--khora-ink)",
        boxShadow: "0 2px 6px rgba(0,0,0,.12)",
        borderColor: `${color}99`,
        borderLeft: `3px solid ${color}`,
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
        <span className="mb-2 block truncate text-sm font-bold" title={node.summary}>
          {node.summary}
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-80">
          <span>{data.communityLabel}</span>
        </span>
        <span className="mt-2 block truncate text-xs opacity-70" title={node.origen}>
          Estado técnico: {node.verificacion}
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
  compact = false,
  emptyMessage,
}: {
  state: GrafoViewState;
  actions?: GrafoViewActions;
  isReviewMode?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}) {
  const { nodes, edges, loading, error, viewMode, layer2Active, selectedElement } = state;

  const layout = useMemo(() => layoutPublishedCommunities(nodes, edges), [nodes, edges]);
  const [query,setQuery] = useState("");
  const [scope,setScope] = useState("initial");
  const groups = useMemo(() => {
    const counts = new Map<string,number>();
    for(const n of nodes) if(n.communityId) counts.set(n.communityId,(counts.get(n.communityId)||0)+1);
    return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  },[nodes]);
  const activeScope = scope === "initial" ? (nodes.length>40 ? groups[0]?.[0]||"all" : "all") : (scope==="all"||groups.some(([id])=>id===scope)?scope:"all");
  const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase();
  const visibleNodes = useMemo(() => {
    if(query.trim()) {
      const hits=new Set(nodes.filter(n=>normalize(n.summary).includes(normalize(query.trim()))).map(n=>n.id));
      const neighbors=new Set(hits);
      for(const e of edges) if(hits.has(e.source)||hits.has(e.target)){neighbors.add(e.source);neighbors.add(e.target);}
      return nodes.filter(n=>neighbors.has(n.id));
    }
    return activeScope==="all"?nodes:nodes.filter(n=>n.communityId===activeScope);
  },[nodes,edges,query,activeScope]);
  const visibleIds = new Set(visibleNodes.map(n=>n.id));
  const visibleEdges = edges.filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target));
  const focusLayout = useMemo(()=>layoutPublishedCommunities(visibleNodes,visibleEdges),[visibleNodes,edges]);
  const focusKey = query.trim()+":"+activeScope+":"+visibleNodes.length;
  function evidenceBlock(edge:GrafoEdge){return edge.evidence ? <section key={edge.id} className="mt-3 border-t pt-3 text-sm" style={{borderColor:"var(--khora-border)"}}>
    <p className="font-medium">{edge.evidence.subject} → {edge.evidence.predicate} → {edge.evidence.object}</p>
    <blockquote className="mt-2 border-l-2 pl-3 whitespace-pre-wrap">{edge.evidence.quote}</blockquote>
    <p className="mt-2 opacity-75">{edge.evidence.attribution} · {edge.evidence.modality} · {edge.evidence.event_time}</p>
    <details className="mt-2"><summary className="cursor-pointer">Ver anclaje en el original</summary><p className="mt-2 break-all">Fuente {edge.evidence.source.volcado_id} · versión {edge.evidence.source.version} · posiciones {edge.evidence.start}–{edge.evidence.end} (UTF-16) · hash {edge.evidence.source.sha256}</p></details>
  </section> : null;}
  const selectedRelations = selectedElement?.type==="node" ? edges.filter(e=>e.source===selectedElement.data.id||e.target===selectedElement.data.id) : [];

  const flowNodes = useMemo<Node<FlowNodeData>[]>(() => visibleNodes.map(node => ({
    id: node.id,
    type: "graphNode",
    position: focusLayout.positions.get(node.id)!,
    data: {graphNode:node,layer2Active,communityLabel:layout.presentation.get(node.id)!.label,
      colorIndex:layout.presentation.get(node.id)!.colorIndex,
      onSelect:(selected:GrafoNode) => actions.onSelectElement?.({type:"node",data:selected})},
  })), [actions, layer2Active, visibleNodes, layout, focusLayout]);

  const flowEdges = useMemo<Edge[]>(() => {
    const valid = new Set(visibleNodes.map((node) => node.id));
    return edges
      .filter((edge) => valid.has(edge.source) && valid.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: selectedElement?.type === "edge" && selectedElement.data.id === edge.id ? (edge.type || "RELATION") : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        animated: false,
        style: { stroke: selectedElement?.type === "edge" && selectedElement.data.id === edge.id ? "var(--khora-ink)" : "var(--khora-accent)", opacity: selectedElement?.type === "edge" && selectedElement.data.id !== edge.id ? .25 : .65, strokeWidth: Math.max(1.2, Math.min(2.5, Math.sqrt(edge.weight || 1))) },
        labelStyle: { fill: "var(--khora-ink)", fontSize: 12 },
        labelBgStyle: { fill: "var(--khora-surface)", fillOpacity: 0.85 },
      }));
  }, [edges, visibleNodes, selectedElement]);

  const inspectionContent = selectedElement ? (
    <>
      <div className="mb-4 flex items-center justify-between border-b border-zinc-700 pb-2 text-xs">
        <h3 className="font-bold uppercase">
          {selectedElement.type === "node" ? "Inspección de entidad" : "Inspección de Relación"}
        </h3>
        <button
          type="button"
          onClick={() => actions.onSelectElement?.(null)}
          className="flex h-11 w-11 items-center justify-center rounded opacity-80 hover:opacity-100 focus-visible:ring-2"
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><span className="opacity-70">Comunidad:</span> {layout.presentation.get(selectedElement.data.id)?.label}</div>
            <div><span className="opacity-70">Nivel:</span> {selectedElement.data.level}</div>
            <div><span className="opacity-70">Centralidad:</span> {selectedElement.data.centrality}</div>
          </div>
          <div className="rounded border border-zinc-700 bg-zinc-950 p-3">
            <span className="mb-1 block font-semibold opacity-70">Procedencia</span>
            <p>Identificador de comunidad: {selectedElement.data.communityId || "Sin membresía publicada"}</p>
            <p>Revisión: {selectedElement.data.communityRevision || "No disponible"}</p>
            <p>Origen: {selectedElement.data.origen}</p>
            <p>Timestamp: {selectedElement.data.timestamp}</p>
            <p>Estado técnico: {selectedElement.data.verificacion}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <div><span className="opacity-70">Relación:</span> {selectedElement.data.type || "RELATION"}</div>
          <div><span className="opacity-70">Peso:</span> {selectedElement.data.weight}</div>
          <div><span className="opacity-70">Origen:</span> {selectedElement.data.origen}</div>
          <div><span className="opacity-70">Timestamp:</span> {selectedElement.data.timestamp}</div>
          <div><span className="opacity-70">Estado técnico:</span> {selectedElement.data.verificacion}</div>
        </div>
      )}
      {selectedElement.type === "edge" ? evidenceBlock(selectedElement.data) : <section><h4 className="mt-4 text-sm font-semibold">Relaciones y texto de origen ({selectedRelations.length})</h4>{selectedRelations.map(evidenceBlock)}</section>}
      <p className="mt-4 text-sm opacity-80">El estado técnico no acredita ratificación humana. Los grupos describen la partición publicada, no rasgos de la persona.</p>
    </>
  ) : null;

  const inspectionPanel = selectedElement ? (
    <Panel
      position="top-right"
      className="!m-3 !rounded-lg !border !border-zinc-700 !p-4 !shadow-xl break-words"
      style={{ backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", width:"min(440px, calc(100vw - 24px))", maxHeight:"65dvh", overflowY:"auto", overflowWrap:"anywhere", pointerEvents:"all" }}
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
      className={compact ? "graph-canvas-shell flex w-full flex-col overflow-hidden font-sans" : "flex min-h-screen w-full flex-col overflow-hidden font-sans"}
      style={{ backgroundColor: "var(--khora-bg)", color: "var(--khora-ink)" }}
    >
      <header
        data-ui-id="grafo.header"
        className="z-10 flex flex-col gap-4 border-b p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
        style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
      >
        {!compact&&<div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl" style={{ color: "var(--khora-ink)" }}>
            Grafo PKG - Proyección Leiden
          </h1>
          <p className="text-sm opacity-70">Vista de Entidades y Relaciones</p>
        </div>}

        <div data-ui-id="grafo.view-toggle" className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => actions.onSetViewMode?.("list")}
            aria-pressed={viewMode === "list"}
            className="min-h-11 cursor-pointer rounded px-3 py-2 text-sm font-medium transition"
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
            aria-pressed={viewMode === "graph"}
            className="min-h-11 cursor-pointer rounded px-3 py-2 text-sm font-medium transition"
            style={
              viewMode === "graph"
                ? { backgroundColor: "var(--khora-accent)", color: "var(--khora-bg)" }
                : { backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", border: "1px solid rgba(128,128,128,.5)" }
            }
          >
            Vista Grafo
          </button>

          {viewMode === "graph" && (
            <label className="flex min-h-11 w-full cursor-pointer items-center gap-2 text-sm sm:w-auto sm:pl-2">
              <input
                type="checkbox"
                checked={layer2Active}
                onChange={(event) => actions.onSetLayer2Active?.(event.target.checked)}
                className="rounded"
              />
              <span>Colorear comunidades</span>
            </label>
          )}
        </div>
      </header>

      <div className={compact ? "min-h-0 flex-1" : "min-h-0 flex-1 pb-24"}>
        {loading ? (
          <div data-ui-id="grafo.loading-state" className="graph-centered-state p-8 text-center text-sm opacity-80">
            Cargando proyecciones del grafo...
          </div>
        ) : error ? (
          <div data-ui-id="grafo.error-state" className="p-8 text-center text-xs text-red-400">
            Error: {error}
          </div>
        ) : nodes.length === 0 ? (
          <div data-ui-id="grafo.empty-state" className="graph-centered-state p-8 text-center text-sm opacity-80">
            <h2 className="mb-2 text-lg font-medium">Aún no hay entidades para mostrar</h2>
            <p>{emptyMessage || "El grafo está vacío. No se han encontrado entidades para esta consulta; no se generan ejemplos personales."}</p>
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
                  className="flex w-full break-words cursor-pointer flex-col gap-2 rounded border p-4 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"
                  style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
                >
                  <p className="font-medium">{node.summary}</p>
                  <div className="flex flex-wrap gap-4 text-xs opacity-80">
                    <span>{layout.presentation.get(node.id)?.label}</span>
                    <span>Nivel: {node.level}</span>
                    <span>Centralidad: {node.centrality}</span>
                    <span>Origen: {node.origen}</span>
                    <span>Estado técnico: {node.verificacion}</span>
                  </div>
                </button>
              ))}
            </div>
            {listInspectionPanel}
          </>
        ) : (
          <div
            data-ui-id="grafo.flow-view"
            className="relative h-[65dvh] min-h-[400px] w-full"
          >
            <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2 text-sm" style={{borderColor:"var(--khora-border)"}}>
              <label className="flex items-center gap-2">Explorar <select aria-label="Comunidad a explorar" value={activeScope} onChange={e=>{setScope(e.target.value);setQuery("");actions.onSelectElement?.(null);}} className="min-h-11 max-w-[220px] rounded border px-2" style={{background:"var(--khora-surface)",color:"var(--khora-ink)",borderColor:"var(--khora-border)"}}><option value="all">Mapa completo · {nodes.length} entidades</option>{groups.map(([id,count])=><option key={id} value={id}>{layout.presentation.get(nodes.find(n=>n.communityId===id)!.id)?.label} · {count} entidades</option>)}</select></label>
              <label className="flex items-center gap-2">Buscar <input aria-label="Buscar en todo el grafo" placeholder="Palabra o expresión" value={query} onChange={e=>{setQuery(e.target.value);actions.onSelectElement?.(null);}} className="min-h-11 w-48 rounded border px-3" style={{background:"var(--khora-surface)",color:"var(--khora-ink)",borderColor:"var(--khora-border)"}} /></label>
              <span role="status" className="opacity-75">{visibleNodes.length} de {nodes.length} entidades · {visibleEdges.length} relaciones visibles</span>
              <span className="opacity-70" title="La búsqueda abarca todas las entidades y muestra también sus vecinos directos. Elegir una comunidad solo cambia la vista: no modifica los datos ni la partición.">Buscar incluye conexiones directas. Selecciona para leer el sustento.</span>
            </div>
            {visibleNodes.length===0 && <p className="p-4 text-sm">No hay coincidencias. Prueba otra expresión; los datos no se han modificado.</p>}
            <ReactFlow
              key={focusKey}
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.05}
              maxZoom={2}
              onEdgeClick={(event, edge) => {
                event.stopPropagation();
                const selected = edges.find((candidate) => candidate.id === edge.id);
                if (selected) actions.onSelectElement?.({ type: "edge", data: selected });
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={28} size={1} color="rgba(140,148,160,.12)" />
              <Controls position="bottom-left" showInteractive={false} />
              {inspectionPanel}
            </ReactFlow>
          </div>
        )}
      </div>
    </div>
  );
}
