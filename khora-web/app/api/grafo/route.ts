// @l0 L0-003 · @req GRAFO/TABLAS
import { NextResponse } from "next/server";
import { obtenerNodos, obtenerAristas } from "@/lib/server/grafo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const rawNodes = await obtenerNodos();
    const rawEdges = await obtenerAristas();

    const nodes = rawNodes.map((n) => ({
      id: n.id,
      summary: n.summary || "Sin resumen",
      community: typeof n.community === "number" ? n.community : 0,
      level: typeof n.level === "number" ? n.level : 0,
      centrality: typeof n.centrality === "number" ? n.centrality : 1.0,
      origen: n.origen || "Desconocido",
      timestamp: n.timestamp || new Date().toISOString(),
      verificacion: n.verificacion || "Pendiente",
    }));

    const edges = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      weight: typeof e.weight === "number" ? e.weight : 1.0,
      origen: e.origen || "Desconocido",
      timestamp: e.timestamp || new Date().toISOString(),
      verificacion: e.verificacion || "Pendiente",
    }));

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("Postgres-backed graph query error:", error);
    return NextResponse.json({ error: "Failed to fetch graph data from Postgres" }, { status: 500 });
  }
}
