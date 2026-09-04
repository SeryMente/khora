// @l0 L0-002 §2 · @req VIZ-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3,ACR-1.4,ACR-1.5,ACR-2.1
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { GrafoView, GrafoViewState, GrafoNode, GrafoEdge } from "../components/shared/GrafoView";

export default function GrafoPage() {
  const [nodes, setNodes] = useState<GrafoNode[]>([]);
  const [edges, setEdges] = useState<GrafoEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "graph">("list");
  const [layer2Active, setLayer2Active] = useState(true);
  const [selectedElement, setSelectedElement] = useState<{ type: "node" | "edge"; data: any } | null>(null);

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grafo");
      if (!res.ok) throw new Error("Error fetching graph data");
      const data = await res.json();

      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  const state: GrafoViewState = {
    nodes,
    edges,
    loading,
    error,
    viewMode,
    layer2Active,
    selectedElement,
  };

  return (
    <GrafoView
      state={state}
      actions={{
        onSetViewMode: setViewMode,
        onSetLayer2Active: setLayer2Active,
        onSelectElement: setSelectedElement,
      }}
    />
  );
}
