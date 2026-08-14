// @l0 L0-002-R · @req TRACE-SESSION/010 · @req FORENSIC-REC/01
import { ejecutarReconciliacionForense } from "../lib/server/reconciliation";

async function main() {
  const args = process.argv.slice(2);
  const applyFlag = args.includes("--apply");
  const modo = applyFlag ? "APPLY" : "DRY_RUN";

  console.log(`====================================================`);
  console.log(`HERRAMIENTA DE RECONCILIACIÓN FORENSE DE AUDIOS/VOLCADOS`);
  console.log(`MODO: ${modo}`);
  console.log(`====================================================\n`);

  const resultado = await ejecutarReconciliacionForense(modo);

  console.log(`Fecha de auditoría: ${resultado.timestamp}`);
  console.log(`Total Volcados analizados: ${resultado.totalVolcados}`);
  console.log(`Total Sesiones analizadas: ${resultado.totalSessions}`);
  console.log(`Total Blobs físicos: ${resultado.totalBlobs}`);
  console.log(`\nDesglose de Clasificación:`);
  console.log(` - EXACT_MATCH:     ${resultado.classifications.EXACT_MATCH}`);
  console.log(` - PROBABLE_MATCH:  ${resultado.classifications.PROBABLE_MATCH}`);
  console.log(` - AMBIGUOUS:       ${resultado.classifications.AMBIGUOUS}`);
  console.log(` - NO_MATCH:        ${resultado.classifications.NO_MATCH}`);
  console.log(` - CORRUPT:         ${resultado.classifications.CORRUPT}`);
  console.log(` - MISSING:         ${resultado.classifications.MISSING}`);

  if (resultado.preStateReportFile) {
    console.log(`\nReporte de Pre-Estado Guardado en: ${resultado.preStateReportFile}`);
  }

  console.log(`\n--- Resumen de Ítemes ---`);
  for (const item of resultado.items) {
    if (item.classification !== "NO_MATCH") {
      console.log(`[${item.classification}] Volcado: ${item.folio ?? item.volcadoId ?? "N/A"} | Session: ${item.sessionId ?? "N/A"}`);
      console.log(`  Evidencia: ${item.evidence}`);
      console.log(`  Acción: ${item.proposedAction} ${item.applied ? "(APLICADO)" : ""}\n`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error ejecutando reconciliación forense:", err);
  process.exit(1);
});
