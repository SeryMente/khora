// @l0 L0-003 · @req GRAFO/TABLAS
import { NextResponse } from "next/server";
import {
  obtenerGrafoNeo4j,
  Neo4jNoConfiguradoError,
  Neo4jInalcanzableError,
} from "@/lib/server/grafo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ioId = searchParams.get("io_id") || searchParams.get("ioId");
    const volcadoId = searchParams.get("volcado_id") || searchParams.get("volcadoId");
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : 500;

    const { nodes, edges } = await obtenerGrafoNeo4j({
      ioId,
      volcadoId,
      limit: isNaN(limit) ? 500 : limit,
    });

    return NextResponse.json({ nodes, edges });
  } catch (error: any) {
    console.error("Neo4j-backed graph query error:", error);

    if (error instanceof Neo4jNoConfiguradoError || error?.code === "NEO4J_UNCONFIGURED") {
      return NextResponse.json(
        {
          error: error.message || "Credenciales de Neo4j no configuradas",
          code: "NEO4J_UNCONFIGURED",
        },
        { status: 503 }
      );
    }

    if (error instanceof Neo4jInalcanzableError || error?.code === "NEO4J_UNREACHABLE") {
      return NextResponse.json(
        {
          error: error.message || "No se pudo conectar a Neo4j Aura",
          code: "NEO4J_UNREACHABLE",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Error inesperado al consultar el grafo en Neo4j", detail: String(error) },
      { status: 500 }
    );
  }
}
