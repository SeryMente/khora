// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { getDb } from "../lib/server/neon";
import { asegurarTabla, prepararVolcadoParaRevision } from "../lib/server/volcados";

export async function repararVolcadosHistoricos(opciones?: { limite?: number }): Promise<{
  procesados: number;
  exitos: number;
  fallos: number;
  detalles: Array<{ id: string; exito: boolean; error?: string }>;
}> {
  await asegurarTabla();
  const db = getDb();
  const limite = opciones?.limite ?? 500;

  const res = await db.query(
    "SELECT id FROM volcado WHERE estado = 'archivado' ORDER BY recibido_en ASC LIMIT $1",
    [limite]
  );

  const volcados = res.rows as Array<{ id: string }>;
  let exitos = 0;
  let fallos = 0;
  const detalles: Array<{ id: string; exito: boolean; error?: string }> = [];

  for (const v of volcados) {
    try {
      await prepararVolcadoParaRevision(v.id, "migración_historica");
      exitos++;
      detalles.push({ id: v.id, exito: true });
    } catch (e: any) {
      fallos++;
      detalles.push({ id: v.id, exito: false, error: String(e?.message ?? e) });
    }
  }

  return {
    procesados: volcados.length,
    exitos,
    fallos,
    detalles,
  };
}

if (require.main === module) {
  repararVolcadosHistoricos()
    .then((res) => {
      console.log(`[repararVolcadosHistoricos] Procesados: ${res.procesados}, Éxitos: ${res.exitos}, Fallos: ${res.fallos}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[repararVolcadosHistoricos] Error fatal:", err);
      process.exit(1);
    });
}
