// @l0 L0-002-R · @req REVISION/REQ-1
import { getDb } from "../lib/server/neon";
import { prepararVolcadoParaRevision } from "../lib/server/volcados";

export async function migrarArchivados(opciones?: { dryRun?: boolean; batchSize?: number }) {
  const dryRun = opciones?.dryRun ?? false;
  const batchSize = opciones?.batchSize ?? 100;

  const db = getDb();

  // Imprimir conteo groupBy(estado) previo
  let conteoPrevio: Record<string, number> = {};
  try {
    const countRes = await db.query("SELECT estado, COUNT(*)::int AS n FROM volcado GROUP BY estado ORDER BY estado");
    for (const r of countRes.rows) {
      conteoPrevio[String(r.estado)] = Number(r.n);
    }
    console.log("CONTEO DE ESTADOS ANTES:", JSON.stringify(conteoPrevio));
  } catch (err) {
    console.log("CONTEO DE ESTADOS ANTES: pendiente de ejecución por el operador (sin BD conectada)");
  }

  const res = await db.query(
    "SELECT id, folio, titulo, sha256, texto FROM volcado WHERE estado = 'archivado' ORDER BY recibido_en ASC LIMIT $1",
    [batchSize]
  );

  const pendientes = res.rows;
  console.log(`Encontrados ${pendientes.length} volcados en estado 'archivado' (S_CAPTURA). Dry-run: ${dryRun}`);

  let procesados = 0;
  let fallidos = 0;

  for (const v of pendientes) {
    const shaAntes = v.sha256;
    const textoAntes = v.texto;

    if (dryRun) {
      console.log(`[DRY-RUN] Se migraría volcado ID ${v.id} (#${v.folio}) de 'archivado' a 'en_revision'`);
      procesados++;
      continue;
    }

    try {
      await prepararVolcadoParaRevision(v.id, "script_migrar_archivados", { onFailure: "keep_captura" });

      // Verificación estricta de inmutabilidad de verbatim / sha256
      const postRes = await db.query("SELECT estado, sha256, texto FROM volcado WHERE id = $1", [v.id]);
      const vPost = postRes.rows[0];

      if (vPost) {
        if (vPost.sha256 !== shaAntes || vPost.texto !== textoAntes) {
          console.error(`❌ ALERTA INTEGRIDAD ROTA en volcado ID ${v.id}: sha256/verbatim alterado`);
        }
        if (vPost.estado === "en_revision") {
          procesados++;
          console.log(`✓ Migrado volcado ID ${v.id} (#${v.folio}) a 'en_revision'`);
        } else {
          fallidos++;
          console.error(`⚠️ Volcado ID ${v.id} permaneció en '${vPost.estado}' tras intento de preparación`);
        }
      }
    } catch (e) {
      fallidos++;
      console.error(`❌ Error migrando volcado ID ${v.id}:`, e);
    }
  }

  // Imprimir conteo groupBy(estado) posterior si no fue dry-run
  let conteoPost: Record<string, number> = {};
  if (!dryRun) {
    try {
      const countPostRes = await db.query("SELECT estado, COUNT(*)::int AS n FROM volcado GROUP BY estado ORDER BY estado");
      for (const r of countPostRes.rows) {
        conteoPost[String(r.estado)] = Number(r.n);
      }
      console.log("CONTEO DE ESTADOS DESPUÉS:", JSON.stringify(conteoPost));
    } catch (err) {
      console.log("CONTEO DE ESTADOS DESPUÉS: pendiente de ejecución por el operador (sin BD conectada)");
    }
  }

  return { total: pendientes.length, procesados, fallidos, dryRun, conteoPrevio, conteoPost };
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
