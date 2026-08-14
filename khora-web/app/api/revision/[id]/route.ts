// @l0 L0-002-R · @req REVISION/REQ-1
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getDb } from "../../../../lib/server/neon";
import { descifrarTexto } from "../../../../lib/server/cripto";
import { asegurarEsquema } from "../../../../lib/server/correcciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { detail: "no autenticado" },
      { status: 401 }
    );
  }

  try {
    const { id } = await ctx.params;

    await asegurarEsquema();

    const db = getDb();

    const r = await db.query(
      "SELECT * FROM volcado WHERE id = $1",
      [id]
    );

    if (r.rows.length === 0) {
      return NextResponse.json(
        { detail: "volcado no encontrado" },
        { status: 404 }
      );
    }

    const volcado: any = r.rows[0];

    // Obtener versiones del volcado.
    const versRes = await db.query(
      `SELECT
         version,
         texto,
         sha256,
         chars,
         motivo,
         creado_en
       FROM volcado_version
       WHERE volcado_id = $1
       ORDER BY version ASC`,
      [id]
    );

    const versiones = versRes.rows.map((v: any) => ({
      ...v,
      texto: descifrarTexto(String(v.texto ?? "")),
    }));

    // Obtener historial de auditoría de revisión/ingesta.
    const audRes = await db.query(
      `SELECT
         id,
         accion,
         estado_anterior,
         estado_nuevo,
         version,
         sha256,
         usuario,
         created_at
       FROM volcado_revision_auditoria
       WHERE volcado_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    const historial = audRes.rows;

    // Obtener deltas/correcciones.
    const corrRes = await db.query(
      `SELECT
         antes,
         despues,
         version_desde,
         version_hasta,
         creado_en
       FROM correccion
       WHERE volcado_id = $1
       ORDER BY creado_en ASC`,
      [id]
    );

    const deltas = corrRes.rows;

    const vOriginal =
      versiones.find(
        (v: any) => Number(v.version) === 1
      ) || null;

    const vActual =
      versiones.length > 0
        ? versiones[versiones.length - 1]
        : null;

    // Validar integridad.
    const audio_present = !!volcado.audio_url;

    const transcription_present =
      versiones.length > 0 || !!volcado.texto;

    const audio_complete = audio_present
      ? "unknown"
      : false;

    const has_edits =
      versiones.length > 1 ||
      Number(volcado.ediciones ?? 0) > 0;

    const has_approved_version =
      volcado.version_aprobada !== null;

    const respuesta = {
      estado: volcado.estado,

      version_original: vOriginal,

      version_actual: vActual,

      version_aprobada:
        volcado.version_aprobada ?? null,

      sha256_aprobado:
        volcado.sha256_aprobado
          ? String(volcado.sha256_aprobado).trim()
          : null,

      aprobado_en:
        volcado.aprobado_en ?? null,

      aprobador:
        volcado.aprobador ?? null,

      historial,

      deltas,

      audio: {
        url: volcado.audio_url || null,
        bytes: volcado.audio_bytes || null,
        duracion_seg:
          volcado.duracion_seg || null,
      },

      integridad: {
        audio_present,
        transcription_present,
        audio_complete,
        has_edits,
        has_approved_version,
      },
    };

    return NextResponse.json(respuesta);
  } catch (e: any) {
    return NextResponse.json(
      {
        detail:
          "no se pudo leer el estado de revision",
        causa: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id } = await ctx.params;

    const body = await req.json();

    const { version, sha256 } = body;

    if (version === undefined || !sha256) {
      return NextResponse.json(
        {
          error:
            "Faltan parametros version y sha256",
        },
        { status: 400 }
      );
    }

    await asegurarEsquema();

    const db = getDb();

    // Verificar que el volcado existe.
    const volcadoRes = await db.query(
      "SELECT id FROM volcado WHERE id = $1",
      [id]
    );

    if (volcadoRes.rows.length === 0) {
      return NextResponse.json(
        { error: "volcado no encontrado" },
        { status: 404 }
      );
    }

    // Registrar/aprobar la versión para ingesta.
    await db.query(
      `
      INSERT INTO volcado_revision (
        volcado_id,
        version_aprobada,
        sha256_aprobado,
        aprobado_en,
        aprobador,
        estado
      )
      VALUES (
        $1,
        $2,
        $3,
        NOW(),
        $4,
        'listo_ingesta'
      )
      ON CONFLICT (volcado_id)
      DO UPDATE SET
        version_aprobada = EXCLUDED.version_aprobada,
        sha256_aprobado = EXCLUDED.sha256_aprobado,
        aprobado_en = NOW(),
        aprobador = EXCLUDED.aprobador,
        estado = 'listo_ingesta'
      `,
      [
        id,
        version,
        sha256,
        session.user.email,
      ]
    );

    // Actualizar el estado operativo principal del volcado.
    await db.query(
      `
      UPDATE volcado
      SET
        estado = 'listo_ingesta',
        version_aprobada = $2,
        sha256_aprobado = $3,
        aprobado_en = NOW(),
        aprobador = $4
      WHERE id = $1
      `,
      [
        id,
        version,
        sha256,
        session.user.email,
      ]
    );

    // Registrar la aprobación en auditoría.
    await db.query(
      `
      INSERT INTO volcado_revision_auditoria (
        id,
        volcado_id,
        accion,
        estado_anterior,
        estado_nuevo,
        version,
        sha256,
        usuario
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      `,
      [
        crypto.randomUUID(),
        id,
        "revision_aprobada",
        "en_revision",
        "listo_ingesta",
        version,
        sha256,
        session.user.email,
      ]
    );

    return NextResponse.json({
      success: true,
      version_aprobada: version,
      sha256_aprobado: sha256,
      aprobador: session.user.email,
      estado: "listo_ingesta",
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        detail:
          "no se pudo aprobar la revision",
        causa: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}