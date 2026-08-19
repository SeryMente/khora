// @l0 L0-002-R · Script idempotente de backfill para títulos nulos o genéricos

import { getDb } from "../lib/server/neon";
import { generarTituloEstructurado, asignarTituloVolcado } from "../lib/server/titulos";
import { descifrarTexto } from "../lib/server/cripto";

export async function backfillTitulos(opciones?: { dryRun?: boolean; limit?: number }) {
  const dryRun = opciones?.dryRun ?? false;
  const limit = opciones?.limit ?? 50;

  const db = getDb();
  const res = await db.query(
    `SELECT id, folio, texto, titulo FROM volcado
     WHERE titulo IS NULL OR TRIM(titulo) = '' OR LOWER(TRIM(titulo)) = 'sin título' OR LOWER(TRIM(titulo)) = 'sin titulo'
     ORDER BY recibido_en DESC LIMIT $1`,
    [limit]
  );

  const volcadosSinTitulo = res.rows;
  console.log(`Encontrados ${volcadosSinTitulo.length} volcados sin título válido. Dry-run: ${dryRun}`);

  let generadosGroq = 0;
  let generadosFallback = 0;
  let fallidos = 0;

  for (const v of volcadosSinTitulo) {
    const textoClaro = descifrarTexto(v.texto || "");
    if (!textoClaro.trim()) {
      fallidos++;
      continue;
    }

    try {
      const resTitulo = await generarTituloEstructurado(textoClaro);
      if (resTitulo.fallback_used) {
        generadosFallback++;
      } else {
        generadosGroq++;
      }

      console.log(`[Volcado #${v.folio || v.id}] Título generado (${resTitulo.model}): "${resTitulo.title}"`);

      if (!dryRun) {
        await asignarTituloVolcado(v.id, resTitulo.title, "backfill_titulos");
      }
    } catch (e) {
      fallidos++;
      console.error(`Error generando título para volcado ${v.id}:`, e);
    }
  }

  return { total: volcadosSinTitulo.length, generadosGroq, generadosFallback, fallidos, dryRun };
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
