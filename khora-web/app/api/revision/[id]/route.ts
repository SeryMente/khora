// @l0 L0-002-R · @req PIPELINE/REQ-3 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getDb } from "../../../../lib/server/neon";
import { asegurarEsquema } from "../../../../lib/server/correcciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    await asegurarEsquema();
    const db = getDb();

    // Query both volcado and volcado_revision
    const volcadoRes = await db.query("SELECT estado, titulo FROM volcado WHERE id = $1", [id]);
    if (volcadoRes.rows.length === 0) {
      return NextResponse.json({ error: "volcado no encontrado" }, { status: 404 });
    }

    const revRes = await db.query("SELECT * FROM volcado_revision WHERE volcado_id = $1", [id]);
    if (revRes.rows.length === 0) {
      return NextResponse.json({
        volcado_id: id,
        version_aprobada: null,
        sha256_aprobado: null,
        aprobado_en: null,
        aprobador: null,
        estado: volcadoRes.rows[0].estado
      });
    }

    const rev = revRes.rows[0] as any;
    return NextResponse.json({
      volcado_id: id,
      version_aprobada: rev.version_aprobada,
      sha256_aprobado: rev.sha256_aprobado ? rev.sha256_aprobado.trim() : null,
      aprobado_en: rev.aprobado_en,
      aprobador: rev.aprobador,
      estado: rev.estado
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Error reading revision data", details: e.message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { version, sha256 } = body;

    if (version === undefined || !sha256) {
      return NextResponse.json({ error: "Faltan parametros version y sha256" }, { status: 400 });
    }

    await asegurarEsquema();
    const db = getDb();

    // Upsert volcado_revision
    await db.query(`
      INSERT INTO volcado_revision (volcado_id, version_aprobada, sha256_aprobado, aprobado_en, aprobador, estado)
      VALUES ($1, $2, $3, NOW(), $4, 'listo_ingesta')
      ON CONFLICT (volcado_id) DO UPDATE
      SET version_aprobada = EXCLUDED.version_aprobada,
          sha256_aprobado = EXCLUDED.sha256_aprobado,
          aprobado_en = NOW(),
          aprobador = EXCLUDED.aprobador,
          estado = 'listo_ingesta'
    `, [id, version, sha256, session.user.email]);

    // Update main volcado status to 'listo_ingesta'
    await db.query("UPDATE volcado SET estado = 'listo_ingesta' WHERE id = $1", [id]);

    return NextResponse.json({
      success: true,
      version_aprobada: version,
      sha256_aprobado: sha256,
      aprobador: session.user.email,
      estado: "listo_ingesta"
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Error updating revision data", details: e.message }, { status: 500 });
  }
}
