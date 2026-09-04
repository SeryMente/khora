// @l0 L0-002-R · @req REVISION/REQ-1
import { getDb } from "../lib/server/neon";
import { prepararVolcadoParaRevision } from "../lib/server/volcados";

export async function migrarArchivados(opciones?: { dryRun?: boolean; batchSize?: number }) {
  const dryRun = opciones?.dryRun ?? false;
  const batchSize = opciones?.batchSize ?? 100;

  const db = getDb();

  // Imprimir conteo groupBy(estado) previo
  let conteoPrevio: Record<string, number> = {};
  let huerfanosV1Previo = 0;

  try {
    const countRes = await db.query("SELECT estado, COUNT(*)::int AS n FROM volcado GROUP BY estado ORDER BY estado");
    for (const r of countRes.rows) {
      conteoPrevio[String(r.estado)] = Number(r.n);
    }
    const huerfanosRes = await db.query(
      "SELECT COUNT(*)::int AS n FROM volcado v WHERE v.estado = 'en_revision' AND NOT EXISTS (SELECT 1 FROM volcado_version vv WHERE vv.volcado_id = v.id AND vv.version = 1)"
    );
    huerfanosV1Previo = Number(huerfanosRes.rows[0]?.n || 0);

    console.log("CONTEO DE ESTADOS ANTES:", JSON.stringify(conteoPrevio));
    console.log("HUÉRFANOS V1 EN REVISIÓN ANTES:", huerfanosV1Previo);
  } catch (err) {
    console.log("CONTEO DE ESTADOS ANTES: pendiente de ejecución por el operador (sin BD conectada)");
  }

  let totalElegibles = 0;
  let procesados = 0;
  let fallidos = 0;

  while (true) {
    // Buscar filas elegibles: estado 'archivado' o 'en_revision' sin v1
    const res = await db.query(
      `SELECT v.id, v.folio, v.estado, v.sha256, v.texto, v.chars
       FROM volcado v
       WHERE v.estado = 'archivado'
          OR (v.estado = 'en_revision' AND NOT EXISTS (SELECT 1 FROM volcado_version vv WHERE vv.volcado_id = v.id AND vv.version = 1))
       ORDER BY v.recibido_en ASC
       LIMIT $1`,
      [batchSize]
    );

    const pendientes = res.rows;
    if (pendientes.length === 0) {
      break;
    }

    if (totalElegibles === 0) {
      totalElegibles = pendientes.length;
    } else {
      totalElegibles += pendientes.length;
    }

    console.log(`Lote de ${pendientes.length} volcados elegibles. Dry-run: ${dryRun}`);

    for (const v of pendientes) {
      const shaAntes = String(v.sha256);
      const textoAntes = String(v.texto);
      const charsAntes = Number(v.chars);

      if (dryRun) {
        console.log(`[DRY-RUN] Se procesaría volcado ID ${v.id} (#${v.folio}) estado '${v.estado}'`);
        procesados++;
        continue;
      }

      try {
        await prepararVolcadoParaRevision(v.id, "script_migrar_archivados", { onFailure: "keep_captura" });

        // Verificación estricta de inmutabilidad de verbatim / sha256 / chars
        const postRes = await db.query("SELECT estado, sha256, texto, chars FROM volcado WHERE id = $1", [v.id]);
        const vPost = postRes.rows[0];

        if (vPost) {
          if (String(vPost.sha256) !== shaAntes || String(vPost.texto) !== textoAntes || Number(vPost.chars) !== charsAntes) {
            fallidos++;
            console.error(`❌ BARRERA INTEGRIDAD VIOLADA en volcado ID ${v.id}: sha256/texto/chars alterado`);
            continue;
          }

          const v1Res = await db.query(
            "SELECT COUNT(*)::int AS n FROM volcado_version WHERE volcado_id = $1 AND version = 1",
            [v.id]
          );
          const tieneV1 = Number(v1Res.rows[0]?.n || 0) > 0;

          if (vPost.estado === "en_revision" && tieneV1) {
            procesados++;
            console.log(`✓ Procesado volcado ID ${v.id} (#${v.folio}) a 'en_revision' con v1`);
          } else {
            fallidos++;
            console.error(`⚠️ Volcado ID ${v.id} no quedó en 'en_revision' con v1 (estado=${vPost.estado}, v1=${tieneV1})`);
          }
        }
      } catch (e: any) {
        fallidos++;
        console.error(`❌ Error procesando volcado ID ${v.id}:`, String(e?.message ?? e));
      }
    }

    if (dryRun) {
      // En dry-run no iteramos infinitamente ya que la consulta de la BD devolverá el mismo lote sin mutar
      break;
    }
  }

  // Imprimir conteo groupBy(estado) posterior si no fue dry-run
  let conteoPost: Record<string, number> = {};
  let huerfanosV1Post = 0;

  if (!dryRun) {
    try {
      const countPostRes = await db.query("SELECT estado, COUNT(*)::int AS n FROM volcado GROUP BY estado ORDER BY estado");
      for (const r of countPostRes.rows) {
        conteoPost[String(r.estado)] = Number(r.n);
      }
      const huerfanosPostRes = await db.query(
        "SELECT COUNT(*)::int AS n FROM volcado v WHERE v.estado = 'en_revision' AND NOT EXISTS (SELECT 1 FROM volcado_version vv WHERE vv.volcado_id = v.id AND vv.version = 1)"
      );
      huerfanosV1Post = Number(huerfanosPostRes.rows[0]?.n || 0);

      console.log("CONTEO DE ESTADOS DESPUÉS:", JSON.stringify(conteoPost));
      console.log("HUÉRFANOS V1 EN REVISIÓN DESPUÉS:", huerfanosV1Post);
    } catch (err) {
      console.log("CONTEO DE ESTADOS DESPUÉS: pendiente de ejecución por el operador (sin BD conectada)");
    }
  }

  return { total: totalElegibles, procesados, fallidos, dryRun, conteoPrevio, conteoPost, huerfanosV1Previo, huerfanosV1Post };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  migrarArchivados({ dryRun })
    .then((r) => {
      console.log("Resumen de migración:", r);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error fatal en migración:", err);
      process.exit(1);
    });
}
