// @l0 L0-002-R · Script idempotente de backfill para títulos nulos o genéricos · @req TITULOS-LLM/REQ-2

import { getDb } from "../lib/server/neon";
import { generarTituloConGarantia, asignarTituloVolcado } from "../lib/server/titulos";
import { descifrarTexto } from "../lib/server/cripto";

export async function backfillTitulos(opciones?: { dryRun?: boolean; limit?: number }) {
  const dryRun = opciones?.dryRun ?? false;
  const limit = opciones?.limit ?? 50;

  const db = getDb();
  let totalProcesados = 0;
  let generadosGroq = 0;
  let generadosFallback = 0;
  let generadosUltimoRecurso = 0;
  let fallidos = 0;
  let offset = 0;

  while (true) {
    const res = await db.query(
      `SELECT id, folio, texto, titulo FROM volcado
       WHERE titulo IS NULL OR TRIM(titulo) = '' OR LOWER(TRIM(titulo)) IN ('sin título', 'sin titulo', 'resumen del contenido', 'dictado sin contenido')
       ORDER BY recibido_en DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const batch = res.rows;
    if (batch.length === 0) break;

    console.log(`Lote de ${batch.length} volcados sin título válido (OFFSET ${offset}). Dry-run: ${dryRun}`);

    for (const v of batch) {
      totalProcesados++;
      const textoClaro = descifrarTexto(v.texto || "");

      try {
        const resTitulo = await generarTituloConGarantia(textoClaro, v.folio);

        if (resTitulo.nivel === "ia") {
          generadosGroq++;
        } else if (resTitulo.nivel === "fallback_determinista") {
          generadosFallback++;
        } else {
          generadosUltimoRecurso++;
        }

        console.log(`[Volcado #${v.folio || v.id}] Título generado (${resTitulo.model} / ${resTitulo.nivel}): "${resTitulo.title}"`);

        if (!dryRun) {
          await asignarTituloVolcado(v.id, resTitulo.title, "backfill_titulos");
        }
      } catch (e) {
        fallidos++;
        console.error(`Error generando título para volcado ${v.id}:`, e);
      }
    }

    offset += limit;
    if (batch.length < limit) break;
  }

  return {
    totalProcesados,
    generadosGroq,
    generadosFallback,
    generadosUltimoRecurso,
    fallidos,
    dryRun,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  backfillTitulos({ dryRun })
    .then((res) => {
      console.log("Resumen de backfill de títulos:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error fatal en backfill de títulos:", err);
      process.exit(1);
    });
}
