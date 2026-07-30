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
  // Capa 2: Color por comunidad, tamaño por centralidad
  const communityColors = [
    "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
  ];
  const bgColor = communityColors[(data.community || 0) % communityColors.length];

  const baseSize = 100;
  const sizeMultiplier = 1 + (data.centrality || 0) * 0.5;
  const size = Math.min(baseSize * sizeMultiplier, 300);

  const selectedStyles = selected ? "ring-4 ring-black" : "";

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white text-xs p-2 text-center shadow-lg transition-all duration-500 ${selectedStyles}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        border: "2px solid rgba(255,255,255,0.2)"
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
      return {
        ...e,
        style: {
          strokeWidth: layer2Active ? 1 + (edata.weight || 0) * 2 : 2,
          stroke: "#b1b1b7"
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

  if (loading && nodes.length === 0) return <div className="p-8">Cargando proyecciones del grafo...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="w-full h-screen relative bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white p-4 shadow-sm z-10 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-gray-800">Grafo PKG - Proyección Leiden</h1>
          <p className="text-sm text-gray-500">Vista de Entidades</p>
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          >
            Vista Lista
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`px-3 py-1 rounded text-sm transition ${viewMode === 'graph' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          >
            Vista Grafo
          </button>

          {viewMode === 'graph' && (
            <label className="flex items-center space-x-2 text-sm cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={layer2Active}
                onChange={e => setLayer2Active(e.target.checked)}
                className="rounded"
              />
              <span>Capa 2: Codificación Visual</span>
            </label>
          )}
        </div>
      </header>

      <div className="flex-1 relative overflow-auto">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            El grafo está vacío. (Válido para ACR-1.1 si DB está vacía)
          </div>
        ) : (
          viewMode === 'list' ? (
            <div className="p-8 max-w-5xl mx-auto space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-6">Lista Accesible de Nodos</h2>
              {nodes.map(node => {
                const data = node.data as unknown as GraphNodeData;
                return (
                  <div key={node.id} className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-col gap-2">
                    <p className="font-medium text-gray-800">{data.summary}</p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Comunidad: {data.community}</span>
                      <span>Nivel: {data.level}</span>
                      <span>Centralidad: {data.centrality}</span>
                      <span>Origen: {data.origen}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        data.verificacion === 'Suficiente' ? 'bg-green-100 text-green-800' :
                        data.verificacion === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
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
              className="bg-gray-100 transition-all duration-700"
            >
              <Background color="#ccc" gap={16} />
              <Controls />

              {/* Capa 4: Inspección */}
              {selectedElement && (
                <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-80 max-h-[80vh] overflow-auto z-50">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b">
                    <h3 className="font-bold text-gray-800">
                      {selectedElement.type === 'node' ? 'Inspección de Comunidad' : 'Inspección de Relación'}
                    </h3>
                    <button onClick={() => setSelectedElement(null)} className="text-gray-500 hover:text-black">✕</button>
                  </div>

                  <div className="space-y-3 text-sm">
                    {selectedElement.type === 'node' && (
                      <>
                        <div>
                          <span className="font-semibold block text-gray-600">Resumen (Zoom Semántico)</span>
                          <p className="mt-1">{selectedElement.data.summary}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="font-semibold text-gray-600">Comunidad:</span> {selectedElement.data.community}</div>
                          <div><span className="font-semibold text-gray-600">Nivel:</span> {selectedElement.data.level}</div>
                          <div><span className="font-semibold text-gray-600">Centralidad:</span> {selectedElement.data.centrality}</div>
                        </div>
                      </>
                    )}

                    {selectedElement.type === 'edge' && (
                      <div>
                        <span className="font-semibold block text-gray-600">Peso de Arista</span>
                        <p className="mt-1">{selectedElement.data.weight}</p>
                      </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded border">
                      <span className="font-semibold block text-gray-600 mb-2">Procedencia (Capa 4)</span>
                      <div className="break-all space-y-1">
                        <p><span className="text-gray-500">Origen:</span> {selectedElement.data.origen}</p>
                        <p><span className="text-gray-500">Timestamp:</span> {selectedElement.data.timestamp}</p>
                        <p>
                          <span className="text-gray-500">Verificación:</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            selectedElement.data.verificacion === 'Suficiente' ? 'bg-green-100 text-green-800' :
                            selectedElement.data.verificacion === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
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
