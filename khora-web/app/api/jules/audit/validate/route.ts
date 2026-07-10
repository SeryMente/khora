import { NextRequest, NextResponse } from "next/server";
import { validateDraft } from "@/lib/server/auditValidator";

export async function POST(req: NextRequest) {
  try {
    const draft = await req.json();

    if (!draft) {
      return NextResponse.json(
        { error: "Se requiere el cuerpo de la petición (JSON) con el borrador." },
        { status: 400 }
      );
    }

    const results = validateDraft(draft);

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno al validar el borrador estructural." },
      { status: 500 }
    );
  }
}
