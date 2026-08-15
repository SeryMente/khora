// @l0 L0-002 §4 · @req MCP-TOOL-01/REQ-1
import { getMcpReadOnlyDb } from "./mcp-db";
import { descifrarTexto } from "./cripto";

/**
 * Mapeo 1:1 para plegar acentos preservando exactamente las posiciones de los índices
 */
export function foldAccents(text: string): string {
  const map: Record<string, string> = {
    á: "a",
    é: "e",
    í: "i",
    ó: "o",
    ú: "u",
    ü: "u",
    Á: "a",
    É: "e",
    Í: "i",
    Ó: "o",
    Ú: "u",
    Ü: "u",
    ñ: "n",
    Ñ: "n",
  };
  let res = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    res += map[ch] || ch.toLowerCase();
  }
  return res;
}

/**
 * Obtiene dinámicamente las columnas de una tabla usando information_schema
 */
async function obtenerColumnasTabla(tabla: string): Promise<string[]> {
  const db = getMcpReadOnlyDb();
  const res = await db.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = $1
     ORDER BY ordinal_position`,
    [tabla]
  );
  return res.rows.map((r) => r.column_name);
}

/**
 * Resuelve folio o UUID a UUID de volcado
 */
async function resolverVolcadoId(idOFolio: string): Promise<string | null> {
  const db = getMcpReadOnlyDb();
  if (/^\d+$/.test(idOFolio.trim())) {
    const res = await db.query<{ id: string }>(
      `SELECT id FROM volcado WHERE folio = $1`,
      [parseInt(idOFolio.trim(), 10)]
    );
    return res.rowCount && res.rows[0] ? res.rows[0].id : null;
  }
  return idOFolio;
}

// 1. khora_resumen
export async function toolKhoraResumen(args: {
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
}) {
  const db = getMcpReadOnlyDb();
  const where: string[] = [];
  const params: any[] = [];

  if (args.fecha_inicio) {
    params.push(args.fecha_inicio);
    where.push(`recibido_en >= $${params.length}`);
  }
  if (args.fecha_fin) {
    params.push(args.fecha_fin);
    where.push(`recibido_en <= $${params.length}`);
  }
  if (args.estado) {
    params.push(args.estado);
    where.push(`estado = $${params.length}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `
    SELECT estado, count(*)::int AS n, coalesce(sum(chars), 0)::int AS chars
    FROM volcado
    ${whereClause}
    GROUP BY estado
    ORDER BY estado
  `;

  const res = await db.query(sql, params);
  const total = res.rows.reduce(
    (acc, row) => ({
      n: acc.n + Number(row.n),
      chars: acc.chars + Number(row.chars),
    }),
    { n: 0, chars: 0 }
  );

  return {
    por_estado: res.rows,
    total,
    filtros_aplicados: args,
  };
}

// 2. khora_listar_volcados
export async function toolKhoraListarVolcados(args: {
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  orden?: "ASC" | "DESC";
  limite?: number;
  offset?: number;
}) {
  const db = getMcpReadOnlyDb();
  const columnas = await obtenerColumnasTabla("volcado");
  const selectCols = columnas.length > 0 ? columnas.map((c) => `"${c}"`).join(", ") : "*";

  const where: string[] = [];
  const params: any[] = [];

  if (args.estado) {
    params.push(args.estado);
    where.push(`estado = $${params.length}`);
  }
  if (args.fecha_inicio) {
    params.push(args.fecha_inicio);
    where.push(`recibido_en >= $${params.length}`);
  }
  if (args.fecha_fin) {
    params.push(args.fecha_fin);
    where.push(`recibido_en <= $${params.length}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const dir = args.orden === "ASC" ? "ASC" : "DESC";
  const limite = Math.min(Math.max(args.limite || 20, 1), 100);
  const offset = Math.max(args.offset || 0, 0);

  params.push(limite);
  const limIdx = params.length;
  params.push(offset);
  const offIdx = params.length;

  const sql = `
    SELECT ${selectCols}
    FROM volcado
    ${whereClause}
    ORDER BY recibido_en ${dir}
    LIMIT $${limIdx} OFFSET $${offIdx}
  `;

  const res = await db.query(sql, params);

  const items = res.rows.map((row: any) => {
    let textoPlano = "";
    let errorDescifrado = false;

    try {
      textoPlano = descifrarTexto(String(row.texto || ""));
    } catch (e) {
      errorDescifrado = true;
    }

    const { texto, ...resto } = row;

    return {
      ...resto,
      error_descifrado: errorDescifrado,
      extracto: errorDescifrado
        ? "[ERROR DE DESCIFRADO]"
        : textoPlano.substring(0, 300) + (textoPlano.length > 300 ? "..." : ""),
      total_caracteres: textoPlano.length,
    };
  });

  return {
    volcados: items,
    limite,
    offset,
    total_retornados: items.length,
  };
}

// 3. khora_leer_volcado
export async function toolKhoraLeerVolcado(args: {
  id: string; // Folio o UUID
  version?: number;
}) {
  const db = getMcpReadOnlyDb();
  const volcadoId = await resolverVolcadoId(args.id);

  if (!volcadoId) {
    throw new Error(`Volcado con identificador o folio '${args.id}' no fue encontrado.`);
  }

  // Leer volcado principal con SELECT dinámico
  const columnas = await obtenerColumnasTabla("volcado");
  const selectCols = columnas.length > 0 ? columnas.map((c) => `"${c}"`).join(", ") : "*";

  const res = await db.query(`SELECT ${selectCols} FROM volcado WHERE id = $1`, [volcadoId]);
  if (res.rowCount === 0) {
    throw new Error(`Volcado '${volcadoId}' no encontrado.`);
  }

  const volcado = res.rows[0];

  if (args.version !== undefined && args.version !== null) {
    // Buscar versión específica
    const vRes = await db.query(
      `SELECT version, texto, sha256, motivo, creado_en, usuario
       FROM volcado_version
       WHERE volcado_id = $1 AND version = $2`,
      [volcadoId, args.version]
    );

    if (vRes.rowCount === 0) {
      throw new Error(`Versión ${args.version} del volcado '${args.id}' no existe.`);
    }

    const vRow = vRes.rows[0];
    let textoVersion = "";
    try {
      textoVersion = descifrarTexto(String(vRow.texto || ""));
    } catch (e) {
      textoVersion = "[ERROR DE DESCIFRADO]";
    }

    return {
      volcado_id: volcado.id,
      folio: volcado.folio,
      titulo: volcado.titulo,
      version: vRow.version,
      texto: textoVersion, // Servido Verbatim
      sha256: vRow.sha256,
      motivo: vRow.motivo,
      creado_en: vRow.creado_en,
      usuario: vRow.usuario,
      es_version_historica: true,
    };
  }

  // Servir versión actual
  let textoPlano = "";
  let errorDescifrado = false;
  try {
    textoPlano = descifrarTexto(String(volcado.texto || ""));
  } catch (e) {
    errorDescifrado = true;
    textoPlano = "[ERROR DE DESCIFRADO]";
  }

  const { texto, ...metadata } = volcado;

  return {
    ...metadata,
    texto: textoPlano, // Servido Verbatim
    error_descifrado: errorDescifrado,
  };
}

// 4. khora_buscar_volcados
export async function toolKhoraBuscarVolcados(args: {
  busqueda: string;
  limite?: number;
  offset?: number;
}) {
  if (!args.busqueda || !args.busqueda.trim()) {
    throw new Error("El parámetro 'busqueda' no puede estar vacío.");
  }

  const db = getMcpReadOnlyDb();
  const columnas = await obtenerColumnasTabla("volcado");
  const selectCols = columnas.length > 0 ? columnas.map((c) => `"${c}"`).join(", ") : "*";

  const limite = Math.min(Math.max(args.limite || 20, 1), 100);
  const offset = Math.max(args.offset || 0, 0);

  // Obtener volcados para filtrado y búsqueda de acentos en memoria
  const res = await db.query(`SELECT ${selectCols} FROM volcado ORDER BY recibido_en DESC`);

  const busquedaFolded = foldAccents(args.busqueda.trim());
  const resultados: any[] = [];

  for (const row of res.rows) {
    let textoPlano = "";
    try {
      textoPlano = descifrarTexto(String(row.texto || ""));
    } catch (e) {
      continue; // Unreadable rows are skipped or reported
    }

    const textoFolded = foldAccents(textoPlano);
    const matchIdx = textoFolded.indexOf(busquedaFolded);

    if (matchIdx !== -1) {
      // Extraer fragmento usando el índice exacto preservado por foldAccents
      const start = Math.max(0, matchIdx - 100);
      const end = Math.min(textoPlano.length, matchIdx + busquedaFolded.length + 100);
      const fragmento =
        (start > 0 ? "..." : "") +
        textoPlano.substring(start, end) +
        (end < textoPlano.length ? "..." : "");

      const { texto, ...metadata } = row;
      resultados.push({
        ...metadata,
        coincidencia_posicion: matchIdx,
        fragmento,
      });
    }
  }

  const paginados = resultados.slice(offset, offset + limite);

  return {
    busqueda: args.busqueda,
    total_coincidencias: resultados.length,
    limite,
    offset,
    resultados: paginados,
  };
}

// 5. khora_versiones_volcado
export async function toolKhoraVersionesVolcado(args: {
  volcado_id: string; // Folio o UUID
}) {
  const db = getMcpReadOnlyDb();
  const id = await resolverVolcadoId(args.volcado_id);

  if (!id) {
    throw new Error(`Volcado con identificador o folio '${args.volcado_id}' no encontrado.`);
  }

  // Verificar existencia de volcado y versión aprobada
  const vRes = await db.query(
    `SELECT id, folio, titulo, estado, version_aprobada, sha256_aprobado, aprobado_en, aprobador
     FROM volcado WHERE id = $1`,
    [id]
  );

  if (vRes.rowCount === 0) {
    throw new Error(`Volcado '${args.volcado_id}' no encontrado.`);
  }

  const volcado = vRes.rows[0];

  // Consultar historial de versiones si existe la tabla volcado_version
  let versiones: any[] = [];
  try {
    const verRes = await db.query(
      `SELECT version, sha256, motivo, creado_en, usuario
       FROM volcado_version
       WHERE volcado_id = $1
       ORDER BY version ASC`,
      [id]
    );
    versiones = verRes.rows.map((r) => ({
      ...r,
      es_aprobada: volcado.version_aprobada === r.version,
    }));
  } catch (e) {
    // Si volcado_version no tuviera registros aún
    versiones = [];
  }

  // Consultar auditoría de revisiones
  let auditoria: any[] = [];
  try {
    const audRes = await db.query(
      `SELECT accion, estado_anterior, estado_nuevo, version, sha256, usuario, created_at
       FROM volcado_revision_auditoria
       WHERE volcado_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    auditoria = audRes.rows;
  } catch (e) {
    auditoria = [];
  }

  return {
    volcado_id: volcado.id,
    folio: volcado.folio,
    titulo: volcado.titulo,
    estado_actual: volcado.estado,
    version_aprobada: volcado.version_aprobada,
    aprobador: volcado.aprobador,
    aprobado_en: volcado.aprobado_en,
    versiones,
    auditoria,
  };
}
