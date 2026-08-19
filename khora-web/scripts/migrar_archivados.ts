// @l0 L0-002-R · @req REVISION/REQ-1
import { getDb } from "../lib/server/neon";
import { prepararVolcadoParaRevision } from "../lib/server/volcados";

export async function migrarArchivados(opciones?: { dryRun?: boolean; batchSize?: number }) {
  const dryRun = opciones?.dryRun ?? false;
  const batchSize = opciones?.batchSize ?? 50;

  const db = getDb();
  const res = await db.query(
    "SELECT id, folio, titulo FROM volcado WHERE estado = 'archivado' ORDER BY recibido_en ASC LIMIT $1",
    [batchSize]
  );

  const pendientes = res.rows;
  console.log(`Encontrados ${pendientes.length} volcados en estado 'archivado'. Dry-run: ${dryRun}`);

  let procesados = 0;
  let fallidos = 0;

  for (const v of pendientes) {
    if (dryRun) {
      console.log(`[DRY-RUN] Se migraría volcado ID ${v.id} (#${v.folio}) a 'en_revision'`);
      procesados++;
      continue;
    }

    try {
      await prepararVolcadoParaRevision(v.id, "script_migrar_archivados");
      procesados++;
      console.log(`✓ Migrado volcado ID ${v.id} (#${v.folio}) a 'en_revision'`);
    } catch (e) {
      fallidos++;
      console.error(`❌ Error migrando volcado ID ${v.id}:`, e);
    }
  }

  return { total: pendientes.length, procesados, fallidos, dryRun };
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
