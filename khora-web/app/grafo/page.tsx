// @l0 L0-002 §2 · @req VIZ-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3,ACR-1.4,ACR-1.5,ACR-2.1
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

// --- Tipos ---
interface GraphNodeData {
  summary: string;
  community: number;
  level: number;
  centrality: number;
  origen: string;
  timestamp: string;
  verificacion: string;
}

interface GraphEdgeData {
  weight: number;
  origen: string;
  timestamp: string;
  verificacion: string;
}

// --- Layout Determinista (Dagre) ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    const data = node.data as unknown as GraphNodeData;
    const baseSize = 100;
    const sizeMultiplier = 1 + (data?.centrality || 0) * 0.5;
    const size = Math.min(baseSize * sizeMultiplier, 300);
    dagreGraph.setNode(node.id, { width: size, height: size });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const data = node.data as unknown as GraphNodeData;
    const baseSize = 100;
    const sizeMultiplier = 1 + (data?.centrality || 0) * 0.5;
    const size = Math.min(baseSize * sizeMultiplier, 300);

    return {
      ...node,
      targetPosition: (isHorizontal ? "left" : "top") as any,
      sourcePosition: (isHorizontal ? "right" : "bottom") as any,
      position: {
        x: nodeWithPosition.x - size / 2,
        y: nodeWithPosition.y - size / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Componente Nodo Personalizado ---
const CustomGraphNode = ({ data, selected }: { data: GraphNodeData; selected: boolean }) => {
  // Capa 2: Grayscale per community
  const communityGrays = [
    "#1c1d1f", "#2d3748", "#4a5568", "#718096", "#a0aec0", "#cbd5e0", "#e2e8f0", "#7f8c8d"
  ];
  const bgColor = communityGrays[(data.community || 0) % communityGrays.length];

  const baseSize = 100;
  const sizeMultiplier = 1 + (data.centrality || 0) * 0.5;
  const size = Math.min(baseSize * sizeMultiplier, 300);

  return (
    <div
      className="rounded-full flex items-center justify-center text-white text-xs p-2 text-center shadow-lg transition-all duration-300"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        border: selected ? "3px solid var(--khora-accent)" : "2px solid rgba(128,128,128,0.5)",
        boxShadow: selected ? "0 0 10px var(--khora-accent)" : "none"
      }}
    >
      <div className="line-clamp-4 overflow-hidden pointer-events-none">
        {data.summary}
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomGraphNode,
};

export default function GrafoPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  // Estado de las capas
  const [layer2Active, setLayer2Active] = useState(true);

  // Elemento seleccionado (Capa 4)
  const [selectedElement, setSelectedElement] = useState<{ type: 'node' | 'edge', data: any } | null>(null);

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grafo");
      if (!res.ok) throw new Error("Error fetching graph data");
      const data = await res.json();

      const initialNodes: Node[] = data.nodes.map((n: any) => ({
        id: n.id,
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          summary: n.summary,
          community: n.community,
          level: n.level,
          centrality: n.centrality,
          origen: n.origen,
          timestamp: n.timestamp,
          verificacion: n.verificacion,
        },
      }));

      const initialEdges: Edge[] = data.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        style: { strokeWidth: 1 + (e.weight || 0) * 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          weight: e.weight,
          origen: e.origen,
          timestamp: e.timestamp,
          verificacion: e.verificacion,
        },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Aplicar filtros visuales basados en las capas activas sin regenerar los datos
  const visibleNodes = useMemo(() => {
    return nodes.map(n => {
      const ndata = n.data as unknown as GraphNodeData;
      return {
        ...n,
        data: {
          ...n.data,
          centrality: layer2Active ? ndata.centrality : 0,
          community: layer2Active ? ndata.community : 0,
        }
      }
    });
  }, [nodes, layer2Active]);

  const visibleEdges = useMemo(() => {
    return edges.map(e => {
      const edata = e.data as unknown as GraphEdgeData;
      const strokeColor = e.selected ? "var(--khora-accent)" : "rgba(128, 128, 128, 0.6)";
      return {
        ...e,
        style: {
          strokeWidth: layer2Active ? 1 + (edata.weight || 0) * 2 : 2,
          stroke: strokeColor
        },
      }
    });
  }, [edges, layer2Active]);

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedElement({ type: 'node', data: node.data });
  };

  const onEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    setSelectedElement({ type: 'edge', data: edge.data });
  };

  const onPaneClick = () => {
    setSelectedElement(null);
  };

  if (loading && nodes.length === 0) {
    return (
      <div
        style={{ backgroundColor: "var(--khora-bg)", color: "var(--khora-ink)" }}
        className="p-8 w-full h-screen"
      >
        Cargando proyecciones del grafo...
      </div>
    );
  }
  if (error) {
    return (
      <div
        style={{ backgroundColor: "var(--khora-bg)", color: "var(--khora-ink)" }}
        className="p-8 w-full h-screen"
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: "var(--khora-bg)", color: "var(--khora-ink)" }}
      className="w-full h-screen relative flex flex-col overflow-hidden"
    >
      <header
        style={{ backgroundColor: "var(--khora-surface)", borderBottom: "1px solid rgba(128, 128, 128, 0.3)" }}
        className="p-4 shadow-sm z-10 flex justify-between items-center"
      >
        <div>
          <h1 style={{ color: "var(--khora-ink)" }} className="text-xl font-bold tracking-wider">
            Grafo PKG - Proyección Leiden
          </h1>
          <p style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="text-sm">
            Vista de Entidades
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={() => setViewMode('list')}
            style={
              viewMode === 'list'
                ? { backgroundColor: "var(--khora-accent)", color: "var(--khora-bg)" }
                : { backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", border: "1px solid rgba(128, 128, 128, 0.5)" }
            }
            className="px-3 py-1 rounded text-sm transition cursor-pointer font-medium"
          >
            Vista Lista
          </button>
          <button
            onClick={() => setViewMode('graph')}
            style={
              viewMode === 'graph'
                ? { backgroundColor: "var(--khora-accent)", color: "var(--khora-bg)" }
                : { backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)", border: "1px solid rgba(128, 128, 128, 0.5)" }
            }
            className="px-3 py-1 rounded text-sm transition cursor-pointer font-medium"
          >
            Vista Grafo
          </button>

          {viewMode === 'graph' && (
            <label style={{ color: "var(--khora-ink)" }} className="flex items-center space-x-2 text-sm cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={layer2Active}
                onChange={e => setLayer2Active(e.target.checked)}
                className="rounded accent-zinc-500"
              />
              <span>Capa 2: Codificación Visual</span>
            </label>
          )}
        </div>
      </header>

      <div className="flex-1 relative overflow-auto">
        {nodes.length === 0 ? (
          <div style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="absolute inset-0 flex items-center justify-center">
            El grafo está vacío. (Válido para ACR-1.1 si DB está vacía)
          </div>
        ) : (
          viewMode === 'list' ? (
            <div className="p-8 max-w-5xl mx-auto space-y-4">
              <h2 style={{ color: "var(--khora-ink)" }} className="text-lg font-semibold mb-6">Lista Accesible de Nodos</h2>
              {nodes.map(node => {
                const data = node.data as unknown as GraphNodeData;
                return (
                  <div
                    key={node.id}
                    style={{ backgroundColor: "var(--khora-surface)", border: "1px solid rgba(128, 128, 128, 0.3)" }}
                    className="p-4 rounded shadow-sm flex flex-col gap-2"
                  >
                    <p style={{ color: "var(--khora-ink)" }} className="font-medium">{data.summary}</p>
                    <div style={{ color: "var(--khora-ink)", opacity: 0.8 }} className="flex gap-4 text-sm">
                      <span>Comunidad: {data.community}</span>
                      <span>Nivel: {data.level}</span>
                      <span>Centralidad: {data.centrality}</span>
                      <span>Origen: {data.origen}</span>
                      <span
                        style={{
                          border: "1px solid rgba(128, 128, 128, 0.5)",
                          backgroundColor: "var(--khora-bg)",
                          color: "var(--khora-ink)"
                        }}
                        className="px-2 py-0.5 rounded text-xs"
                      >
                        {data.verificacion}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ReactFlow
              nodes={visibleNodes}
              edges={visibleEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.1}
              maxZoom={2}
              style={{ backgroundColor: "var(--khora-bg)" }}
              className="transition-all duration-700"
            >
              <Background color="var(--khora-accent)" gap={16} />
              <Controls />

              {/* Capa 4: Inspección */}
              {selectedElement && (
                <Panel
                  position="top-right"
                  style={{
                    backgroundColor: "var(--khora-surface)",
                    color: "var(--khora-ink)",
                    border: "1px solid rgba(128, 128, 128, 0.4)"
                  }}
                  className="p-4 rounded-lg shadow-xl w-80 max-h-[80vh] overflow-auto z-50"
                >
                  <div
                    style={{ borderBottom: "1px solid rgba(128, 128, 128, 0.3)" }}
                    className="flex justify-between items-center mb-4 pb-2"
                  >
                    <h3 style={{ color: "var(--khora-ink)" }} className="font-bold">
                      {selectedElement.type === 'node' ? 'Inspección de Comunidad' : 'Inspección de Relación'}
                    </h3>
                    <button
                      onClick={() => setSelectedElement(null)}
                      style={{ color: "var(--khora-ink)" }}
                      className="cursor-pointer hover:opacity-75"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-sm">
                    {selectedElement.type === 'node' && (
                      <>
                        <div>
                          <span style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="font-semibold block">
                            Resumen (Zoom Semántico)
                          </span>
                          <p style={{ color: "var(--khora-ink)" }} className="mt-1">
                            {selectedElement.data.summary}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="font-semibold">Comunidad:</span> {selectedElement.data.community}
                          </div>
                          <div>
                            <span style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="font-semibold">Nivel:</span> {selectedElement.data.level}
                          </div>
                          <div>
                            <span style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="font-semibold">Centralidad:</span> {selectedElement.data.centrality}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedElement.type === 'edge' && (
                      <div>
                        <span style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="font-semibold block">
                          Peso de Arista
                        </span>
                        <p style={{ color: "var(--khora-ink)" }} className="mt-1">
                          {selectedElement.data.weight}
                        </p>
                      </div>
                    )}

                    <div
                      style={{
                        backgroundColor: "var(--khora-bg)",
                        border: "1px solid rgba(128, 128, 128, 0.3)"
                      }}
                      className="p-3 rounded"
                    >
                      <span style={{ color: "var(--khora-ink)", opacity: 0.7 }} className="font-semibold block mb-2">
                        Procedencia (Capa 4)
                      </span>
                      <div className="break-all space-y-1">
                        <p><span style={{ color: "var(--khora-ink)", opacity: 0.7 }}>Origen:</span> {selectedElement.data.origen}</p>
                        <p><span style={{ color: "var(--khora-ink)", opacity: 0.7 }}>Timestamp:</span> {selectedElement.data.timestamp}</p>
                        <p>
                          <span style={{ color: "var(--khora-ink)", opacity: 0.7 }}>Verificación:</span>
                          <span
                            style={{
                              border: "1px solid rgba(128, 128, 128, 0.5)",
                              backgroundColor: "var(--khora-surface)",
                              color: "var(--khora-ink)"
                            }}
                            className="ml-2 px-2 py-0.5 rounded text-xs"
                          >
                            {selectedElement.data.verificacion}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}
            </ReactFlow>
          )
        )}
      </div>
    </div>
  );
}
