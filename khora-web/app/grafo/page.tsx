// @l0 L0-002 §2 · @req VIZ-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3,ACR-1.4,ACR-1.5,ACR-2.1
"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { GrafoViewState, GrafoNode, GrafoEdge } from "../components/shared/GrafoView";

const GrafoViewClient = dynamic(
  () => import("../components/shared/GrafoView").then((mod) => mod.GrafoView),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-screen w-full flex-col font-mono"
        style={{ backgroundColor: "var(--khora-bg)", color: "var(--khora-ink)" }}
      >
        <header
          className="border-b p-4"
          style={{ backgroundColor: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
        >
          <h1 className="text-xl font-bold tracking-wider">Grafo PKG - Proyección Leiden</h1>
          <p className="text-sm opacity-70">Cargando proyecciones del grafo...</p>
        </header>
      </div>
    ),
  }
);

export default function GrafoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs opacity-60 font-mono">Cargando Grafo PKG...</div>}>
      <GrafoContent />
    </Suspense>
  );
}

function GrafoContent() {
  const searchParams = useSearchParams();
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
      const ioId = searchParams?.get("io_id") || searchParams?.get("ioId") || "";
      const volcadoId = searchParams?.get("volcado_id") || searchParams?.get("volcadoId") || "";
      const limit = searchParams?.get("limit") || "";

      const queryParts: string[] = [];
      if (ioId) queryParts.push(`io_id=${encodeURIComponent(ioId)}`);
      if (volcadoId) queryParts.push(`volcado_id=${encodeURIComponent(volcadoId)}`);
      if (limit) queryParts.push(`limit=${encodeURIComponent(limit)}`);

      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
      const res = await fetch(`/api/grafo${queryString}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Fallo al consultar el grafo`);
      }

      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error al conectar con Neo4j Aura");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

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
    <GrafoViewClient
      state={state}
      actions={{
        onSetViewMode: setViewMode,
        onSetLayer2Active: setLayer2Active,
        onSelectElement: setSelectedElement,
      }}
    />
  );
}
