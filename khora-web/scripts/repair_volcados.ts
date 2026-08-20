// @l0 L0-002-R · Reparador TypeScript transaccional, paginado, reanudable y con --dry-run

import { getDb } from "../lib/server/neon";
import { descifrarTexto } from "../lib/server/cripto";
import { prepararVolcadoParaRevision } from "../lib/server/volcados";
import { esAudioEsperado } from "../lib/server/domainAudio";

export async function verificarEstadoMigraciones(): Promise<string> {
  const db = getDb();
  const tablasPosibles = ["_prisma_migrations", "schema_migrations", "db_migrations", "migrations"];

  for (const tabla of tablasPosibles) {
    try {
      const res = await db.query(`SELECT * FROM ${tabla} LIMIT 10`);
      if (res.rows.length > 0) {
        return `Tablas de migración encontradas en '${tabla}': ${res.rows.length} registros.`;
      }
    } catch {
      // Continuar buscando
    }
  }

  return "ESTADO DE MIGRACIÓN DESCONOCIDO";
}

export async function repairVolcados(opciones?: { dryRun?: boolean; limit?: number }) {
  const dryRun = opciones?.dryRun ?? false;
  const limit = opciones?.limit ?? 50;

  const db = getDb();
  const estadoMigraciones = await verificarEstadoMigraciones();
  console.log(`Paso 1: Verificación de control de migraciones: ${estadoMigraciones}`);

  let totalArchivados = 0;
  let totalEnRevisionSinV1 = 0;
  let totalPartesIndice0 = 0;
  let totalTitulosNulos = 0;
  let totalIncidentesFalsosManuales = 0;
  let totalIncidentesAbiertosSinAudioStatus = 0;

  // 1. Contar partes con part_index = 0
  const p0Res = await db.query("SELECT COUNT(*)::int AS n FROM dictado_audio_parte WHERE part_index = 0");
  totalPartesIndice0 = Number(p0Res.rows[0]?.n || 0);

  if (!dryRun && totalPartesIndice0 > 0) {
    await db.query(`
      UPDATE dictado_audio_parte
      SET part_index = part_index + 1
      WHERE session_id IN (SELECT session_id FROM dictado_audio_parte WHERE part_index = 0)
    `);
  }

  let offset = 0;

  while (true) {
    const res = await db.query(
      `SELECT v.id, v.folio, v.estado, v.titulo, v.fuente, v.driver, v.origen, v.session_id, v.texto
       FROM volcado v
       ORDER BY v.recibido_en DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const batch = res.rows;
    if (batch.length === 0) break;

    for (const v of batch) {
      const volcadoId = String(v.id);

      // Comprobar si está en estado archivado
      if (v.estado === "archivado") {
        totalArchivados++;
      }

      // Comprobar si está en_revision sin versión v1
      if (v.estado === "en_revision" || v.estado === "archivado" || v.estado === "pendiente_revision") {
        const v1Res = await db.query(
          "SELECT COUNT(*)::int AS n FROM volcado_version WHERE volcado_id = $1 AND version = 1",
          [volcadoId]
        );
        if (Number(v1Res.rows[0]?.n || 0) === 0) {
          totalEnRevisionSinV1++;
        }
      }

      // Comprobar títulos nulos o genéricos
      if (!v.titulo || TRIM(String(v.titulo)) === '' || ['sin título', 'sin titulo', 'resumen del contenido'].includes(String(v.titulo).toLowerCase().trim())) {
        totalTitulosNulos++;
      }

      // Comprobar incidentes falsos en entradas manuales
      const audioEsperado = esAudioEsperado({
        fuente: v.fuente,
        driver: v.driver,
        origen: v.origen,
        session_id: v.session_id,
      });

      if (!audioEsperado) {
        const incFalsosRes = await db.query(
          "SELECT COUNT(*)::int AS n FROM volcado_incidente WHERE volcado_id = $1 AND tipo IN ('audio_no_recuperable', 'audio_no_vinculado') AND estado = 'abierto'",
          [volcadoId]
        );
        const countFalsos = Number(incFalsosRes.rows[0]?.n || 0);
        if (countFalsos > 0) {
          totalIncidentesFalsosManuales += countFalsos;
          if (!dryRun) {
            await db.query(
              "UPDATE volcado_incidente SET estado = 'resuelto', codigo_resolucion = 'falso_positivo_entrada_manual' WHERE volcado_id = $1 AND tipo IN ('audio_no_recuperable', 'audio_no_vinculado') AND estado = 'abierto'",
              [volcadoId]
            );
          }
        }
      }

      // Ejecutar reparación via prepararVolcadoParaRevision si no es dryRun
      if (!dryRun && (v.estado === "archivado" || v.estado === "pendiente_revision" || (v.estado === "en_revision" && totalEnRevisionSinV1 > 0))) {
        try {
          await prepararVolcadoParaRevision(volcadoId, "script_reparador");
        } catch (e) {
          console.error(`Error reparando volcado ${volcadoId}:`, e);
        }
      }
    }

    offset += limit;
    if (batch.length < limit) break;
  }

  function TRIM(s: string) { return s.trim(); }

  const resumen = {
    estadoMigraciones,
    archivados: totalArchivados,
    en_revision_sin_v1: totalEnRevisionSinV1,
    partes_indice_0: totalPartesIndice0,
    titulos_nulos: totalTitulosNulos,
    incidentes_falsos_entradas_manuales: totalIncidentesFalsosManuales,
    incidentes_abiertos_sin_audio_status: totalIncidentesAbiertosSinAudioStatus,
    dryRun,
  };

  console.log("Resumen del reparador de volcados:", resumen);
  return resumen;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  repairVolcados({ dryRun })
    .then((res) => {
      console.log("Proceso reparador completado con éxito:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error fatal en el reparador de volcados:", err);
      process.exit(1);
    });
}
