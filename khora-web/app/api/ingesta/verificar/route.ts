// @l0 L0-002 · @req CORA-02/REQ-1 · @acr ACR-1.1 · @ua —
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { verificarCircuitoCompletoNeo4j } from "../../../../lib/server/grafo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { io_id } = await req.json();
    if (!io_id || typeof io_id !== "string") {
      return NextResponse.json({ error: "io_id is required" }, { status: 400 });
    }

    const verification = await verificarCircuitoCompletoNeo4j(io_id);
    return NextResponse.json(verification);
  } catch (error: any) {
    return NextResponse.json({ error: "Verification failed", details: error.message }, { status: 500 });
  }
}
