'use client';

import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import mapDataJson from '../../map/map-data.json';
import { CustomNode, MapNodeData } from './CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

// Map spacing constants
const X_SPACING = 350;
const Y_SPACING = 250;

export default function MapaPage() {
  const { nodes, edges } = useMemo(() => {
    // Hard filter for nodes that are NOT explicitly unauthorized
    const validNodesData = mapDataJson.nodes.filter(
      (node) => node.authorized !== false
    );

    const validNodeIds = new Set(validNodesData.map((n) => n.id));

    // Create React Flow nodes using stable layout from map-data.json
    const flowNodes = validNodesData.map((node) => ({
      id: node.id,
      type: 'custom',
      position: {
        x: node.layout.level * X_SPACING,
        y: node.layout.order * Y_SPACING,
      },
      data: {
        condicion: node.condicion,
        pregunta: node.pregunta,
        alternativas: node.alternativas,
        consecuencia: node.consecuencia,
        estado: node.estado,
        layout: node.layout,
        set: node.set,
        marks: node.marks,
        authorized: node.authorized,
      } as MapNodeData,
    }));

    // Only keep edges where both source and target exist and are valid
    const flowEdges = mapDataJson.edges.filter(
      (edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
    );

    return { nodes: flowNodes, edges: flowEdges };
  }, []);

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm z-10 border-b border-gray-200">
        <h1 className="text-xl font-bold tracking-wider uppercase text-gray-800">Mapa Visual de Ramificaciones</h1>
        <p className="text-sm text-gray-500">Gramática visual v0 - Layout estable</p>
      </header>

      <div className="flex-1" data-testid="react-flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          className="bg-gray-100"
        >
          <Background color="#ccc" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
