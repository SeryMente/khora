// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import { resolverHallazgo, EstadoHallazgo } from "@/lib/server/asistenteRevision";
import { guardarEdicion } from "@/lib/server/correcciones";

export const runtime = "nodejs";

import { descifrarTexto, cifrarTexto } from "@/lib/server/cripto";
import { createHash, randomUUID } from "crypto";
import { evaluarCompuertaAprobacion } from "@/lib/server/compuerta";

function sha256de(t: string): string {
  return createHash("sha256").update(t, "utf8").digest("hex");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; hId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  const db = getDb();
  const client = await db.connect();

  try {
    const { id, hId } = await ctx.params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const accion = String(body?.accion || "aceptar"); // aceptar | rechazar
    const isNumeric = /^\d+$/.test(id.trim());

    await client.query("BEGIN");

    // 1. Resolver ID del volcado
    const volcadoRes = await client.query(
      isNumeric
        ? "SELECT id, estado FROM volcado WHERE folio = $1 FOR UPDATE"
        : "SELECT id, estado FROM volcado WHERE id::text = $1 FOR UPDATE",
      [isNumeric ? parseInt(id.trim(), 10) : id.trim()]
    );

    if (volcadoRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ detail: "Volcado no encontrado" }, { status: 404 });
    }

    const realVolcadoId = volcadoRes.rows[0].id;

    // 2. Bloquear y consultar hallazgo
    const hallazgoRes = await client.query(
      `SELECT id, volcado_id, version, char_inicio, char_fin, texto_original, sugerencia, estado
       FROM volcado_hallazgo WHERE id = $1 FOR UPDATE`,
      [hId]
    );

    if (hallazgoRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ detail: "Hallazgo no encontrado" }, { status: 404 });
    }

    const h = hallazgoRes.rows[0];
    if (h.volcado_id !== realVolcadoId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ detail: "El hallazgo no pertenece al volcado de la ruta" }, { status: 409 });
    }

    if (h.estado !== "pendiente") {
      await client.query("ROLLBACK");
      return NextResponse.json({ detail: `El hallazgo ya fue procesado con estado '${h.estado}'` }, { status: 409 });
    }

    // 3. Bloquear y consultar versión vigente
    const verRes = await client.query(
      `SELECT version, texto, sha256 FROM volcado_version
       WHERE volcado_id = $1 ORDER BY version DESC LIMIT 1 FOR UPDATE`,
      [realVolcadoId]
    );

    if (verRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ detail: "No existe versión en volcado_version" }, { status: 404 });
    }

    const versionVigenteObj = verRes.rows[0];
    const versionVigenteNum = Number(versionVigenteObj.version);

    if (Number(h.version) !== versionVigenteNum) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { detail: `El hallazgo es de la versión ${h.version}, pero la versión vigente es ${versionVigenteNum}` },
        { status: 409 }
      );
    }

    if (accion === "rechazar") {
      await client.query(
        `UPDATE volcado_hallazgo
         SET estado = 'rechazada', resuelto_por = $2, resuelto_en = NOW(), codigo_resolucion = 'rechazado_por_operador'
         WHERE id = $1`,
        [hId, session.user.email]
      );

      await client.query("COMMIT");
      const compuerta = await evaluarCompuertaAprobacion(realVolcadoId);
      return NextResponse.json({ success: true, estado: "rechazada", compuerta });
    }

    // Accion == "aceptar"
    // Descifrar el texto plano de la versión vigente
    const textoPlanoVigente = descifrarTexto(versionVigenteObj.texto || "");
    const posInicio = Number(h.char_inicio);
    const posFin = Number(h.char_fin);

    if (posInicio < 0 || posFin > textoPlanoVigente.length || posInicio >= posFin) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { detail: "Los offsets del hallazgo están fuera de rango respecto a la versión vigente." },
        { status: 409 }
      );
    }

    const fragmentoOriginal = textoPlanoVigente.slice(posInicio, posFin);
    if (fragmentoOriginal !== h.texto_original) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          detail: `Incoincidencia de texto original: se esperaba '${h.texto_original}' pero se encontró '${fragmentoOriginal}' en offsets [${posInicio}, ${posFin}].`,
        },
        { status: 409 }
      );
    }

    // Aplicar la corrección al texto plano
    const textoCorregido = textoPlanoVigente.slice(0, posInicio) + h.sugerencia + textoPlanoVigente.slice(posFin);
    const nuevaVersionNum = versionVigenteNum + 1;
    const nuevoSha = sha256de(textoCorregido);
    const textoCifrado = cifrarTexto(textoCorregido);

    // Persistir nueva versión en volcado_version (singular)
    await client.query(
      `INSERT INTO volcado_version (id, volcado_id, version, texto, sha256, chars, motivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        realVolcadoId,
        nuevaVersionNum,
        textoCifrado,
        nuevoSha,
        textoCorregido.length,
        `resolucion_hallazgo:${h.regla}`,
      ]
    );

    // Actualizar volcado principal a en_revision e invalidar aprobaciones previas
    await client.query(
      `UPDATE volcado
       SET texto = $2, sha256 = $3, chars = $4, estado = 'en_revision',
           version_aprobada = NULL, sha256_aprobado = NULL, aprobado_en = NULL, aprobador = NULL,
           editado_en = NOW(), ediciones = COALESCE(ediciones, 0) + 1
       WHERE id = $1`,
      [realVolcadoId, textoCifrado, nuevoSha, textoCorregido.length]
    );

    // Registrar en auditoría
    await client.query(
      `INSERT INTO volcado_revision_auditoria
       (id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        realVolcadoId,
        "hallazgo_resuelto_nueva_version",
        volcadoRes.rows[0].estado,
        "en_revision",
        nuevaVersionNum,
        nuevoSha,
        session.user.email,
      ]
    );

    // Marcar el hallazgo como resuelto SOLO DESPUÉS de confirmar la nueva versión cifrada
    await client.query(
      `UPDATE volcado_hallazgo
       SET estado = 'resuelta', resuelto_por = $2, resuelto_en = NOW(), codigo_resolucion = 'aplicado_en_nueva_version'
       WHERE id = $1`,
      [hId, session.user.email]
    );

    await client.query("COMMIT");

    // Recalcular compuerta / gate_hash
    const compuerta = await evaluarCompuertaAprobacion(realVolcadoId);

    return NextResponse.json({
      success: true,
      estado: "resuelta",
      nueva_version: nuevaVersionNum,
      sha256: nuevoSha,
      compuerta,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ detail: String(err?.message ?? err) }, { status: 500 });
  } finally {
    client.release();
  }
}
