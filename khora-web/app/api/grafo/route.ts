// @l0 L0-003 · @req GRAFO/TABLAS
import { NextResponse } from "next/server";
import { obtenerProyeccionGrafo } from "@/lib/server/grafo-proyeccion";
import { Neo4jNoConfiguradoError, Neo4jInalcanzableError } from "@/lib/server/grafo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ioId = searchParams.get("io_id") || searchParams.get("ioId");
    const volcadoId = searchParams.get("volcado_id") || searchParams.get("volcadoId");
    const rawLimit = searchParams.get("limit");
    const requestedLimit = rawLimit === null ? 500 : Number(rawLimit);
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
      return NextResponse.json({ error: "El parámetro limit debe ser un entero positivo", code: "INVALID_LIMIT" }, { status: 400 });
    }

    const projection = await obtenerProyeccionGrafo({ ioId, volcadoId, limit: requestedLimit });
    return NextResponse.json(projection);
  } catch (error: any) {
    console.error("Neo4j-backed graph query error:", error);
    if (error instanceof Neo4jNoConfiguradoError || error?.code === "NEO4J_UNCONFIGURED") {
      return NextResponse.json({ error: error.message || "Credenciales de Neo4j no configuradas", code: "NEO4J_UNCONFIGURED" }, { status: 503 });
    }
    if (error instanceof Neo4jInalcanzableError || error?.code === "NEO4J_UNREACHABLE") {
      return NextResponse.json({ error: error.message || "No se pudo conectar a Neo4j Aura", code: "NEO4J_UNREACHABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "Error inesperado al consultar el grafo en Neo4j", detail: String(error), code: "GRAPH_QUERY_FAILED" }, { status: 500 });
  }
}
