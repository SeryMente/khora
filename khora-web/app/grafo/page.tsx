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
  isNew?: boolean; // Capa 3: Delta
}

interface GraphEdgeData {
  weight: number;
  origen: string;
  timestamp: string;
  verificacion: string;
  isNew?: boolean; // Capa 3: Delta
}

// --- Layout Determinista (Dagre) ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Estimamos tamaño según centralidad para el layout,
    // pero limitamos para no desbordar
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

  // Capa 3: Resaltado si es nuevo
  const deltaStyles = data.isNew ? "ring-4 ring-yellow-400 animate-pulse" : "";
  const selectedStyles = selected ? "ring-4 ring-black" : "";

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white text-xs p-2 text-center shadow-lg transition-all duration-500 ${deltaStyles} ${selectedStyles}`}
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

  // Estado de las capas
  const [layer2Active, setLayer2Active] = useState(true);
  const [layer3Active, setLayer3Active] = useState(false);

  // Elemento seleccionado (Capa 4)
  const [selectedElement, setSelectedElement] = useState<{ type: 'node' | 'edge', data: any } | null>(null);

  // Fecha de la "ingesta anterior"
  const [lastIngestDate] = useState<Date>(new Date(Date.now() - 24 * 60 * 60 * 1000)); // Ayer por defecto

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grafo");
      if (!res.ok) throw new Error("Error fetching graph data");
      const data = await res.json();

      const initialNodes: Node[] = data.nodes.map((n: any) => ({
        id: n.id,
        type: "custom",
        position: { x: 0, y: 0 }, // Inicial, se calcula después
        data: {
          summary: n.summary,
          community: n.community,
          level: n.level,
          centrality: n.centrality,
          origen: n.origen,
          timestamp: n.timestamp,
          verificacion: n.verificacion,
          // Capa 3 lógica inicial
          isNew: new Date(n.timestamp) > lastIngestDate,
        },
      }));

      const initialEdges: Edge[] = data.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: true, // Animación sutil de transición, requerida por principio de proyección
        style: { strokeWidth: 1 + (e.weight || 0) * 2 }, // Capa 2: Grosor de arista
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          weight: e.weight,
          origen: e.origen,
          timestamp: e.timestamp,
          verificacion: e.verificacion,
          isNew: new Date(e.timestamp) > lastIngestDate,
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
  }, [lastIngestDate, setNodes, setEdges]);

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
          // Si Capa 2 inactiva (puramente teórica, por defecto está activa),
          // podríamos resetear colores/tamaños aquí, pero la tarea dice que C1 es default y C2 es codificación.
          // Para no romper la animacion rastreable, dejamos la C2 on/off
          centrality: layer2Active ? ndata.centrality : 0,
          community: layer2Active ? ndata.community : 0,
          isNew: layer3Active ? ndata.isNew : false,
        }
      }
    });
  }, [nodes, layer2Active, layer3Active]);

  const visibleEdges = useMemo(() => {
    return edges.map(e => {
      const edata = e.data as unknown as GraphEdgeData;
      return {
        ...e,
        style: {
          strokeWidth: layer2Active ? 1 + (edata.weight || 0) * 2 : 2,
          stroke: layer3Active && edata.isNew ? "#eab308" : "#b1b1b7"
        },
        animated: true, // Mantenemos la transición animada siempre
      }
    });
  }, [edges, layer2Active, layer3Active]);

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
          <p className="text-sm text-gray-500">Vista de 4 Capas (Zoom Semántico)</p>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={layer2Active}
              onChange={e => setLayer2Active(e.target.checked)}
              className="rounded"
            />
            <span>Capa 2: Codificación Visual</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={layer3Active}
              onChange={e => setLayer3Active(e.target.checked)}
              className="rounded"
            />
            <span>Capa 3: Delta</span>
          </label>
        </div>
      </header>

      <div className="flex-1 relative">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            El grafo está vacío. (Válido para ACR-1.1 si DB está vacía)
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
            className="bg-gray-100 transition-all duration-700" // Animaciones suaves de layout
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

                  {layer3Active && selectedElement.data.isNew && (
                    <div className="bg-yellow-50 text-yellow-800 p-2 rounded text-xs font-semibold border border-yellow-200">
                      ✨ Elemento nuevo en la última ingesta
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
