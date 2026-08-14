// @l0 L0-002-R · @req PIPELINE-OBSERVABILITY/REQ-1 · @req TRACE-SESSION/010
import { getDb } from "./neon";
import { descifrarTexto } from "./cripto";
import { driver as neo4jDriver, auth as neo4jAuth } from "neo4j-driver";

export interface PipelineVolcado {
  id: string;
  folio: number | null;
  session_id: string | null;
  session_estado: string | null;
  audio_status: "disponible" | "encontrado_no_vinculado" | "incompleto" | "no_recuperable";
  partes_count: number;
  blob_paths: string[];
  estado: string;
  version_original: number;
  version_actual: number;
  version_aprobada: number | null;
  sha256_original: string | null;
  sha256_aprobada: string | null;
  audio: {
    present: boolean;
    complete: boolean | "unknown";
    bytes: number;
    duration_sec: number;
  };
  transcription: {
    present: boolean;
    chars: number;
    sha256: string;
  };
  ingesta: {
    status: "success" | "failed" | "pending";
    io_id: string | null;
    attempts: number;
    last_attempt: string | null;
    last_error: string | null;
  };
  graph: {
    entities: number;
    relations: number;
  };
  integrity: {
    status: "sync" | "text_without_audio" | "audio_without_text" | "audio_partial" | "text_edited" | "broken_provenance" | "unknown";
    flags: string[];
  };
}

export interface PipelineAggregatedResult {
  total: number;
  counts: {
    archivado: number;
    pendiente_revision: number;
    en_revision: number;
    listo_ingesta: number;
    ingerido: number;
    fallido: number;
  };
  integrity: {
    sync: number;
    text_without_audio: number;
    audio_without_text: number;
    audio_partial: number;
    text_edited: number;
    broken_provenance: number;
    unknown: number;
  };
  volcados: PipelineVolcado[];
}

export async function verificarInformationObjectNeo4j(ioId: string): Promise<{ exists: boolean | "unknown"; details: any | null }> {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    return { exists: "unknown", details: null };
  }

  let driverInstance;
  try {
    driverInstance = neo4jDriver(uri, neo4jAuth.basic(user, password));
    const session = driverInstance.session();
    try {
      const res = await session.run(
        "MATCH (io:InformationObject {io_id: $ioId}) RETURN io.volcado_id AS volcado_id, io.version AS version, io.sha256 AS sha256 LIMIT 1",
        { ioId }
      );
      if (res.records.length > 0) {
        const rec = res.records[0];
        return {
          exists: true,
          details: {
            volcado_id: rec.get("volcado_id"),
            version: rec.get("version") ? Number(rec.get("version")) : null,
            sha256: rec.get("sha256")
          }
        };
      } else {
        return { exists: false, details: null };
      }
    } finally {
      await session.close();
    }
  } catch (err) {
    console.warn("Error consultando Neo4j:", err);
    return { exists: "unknown", details: null };
  } finally {
    if (driverInstance) {
      await driverInstance.close();
    }
  }
}

export async function obtenerPipelineAggregated(): Promise<PipelineAggregatedResult> {
  const db = getDb();

  // Bulk query all volcados
  const vRes = await db.query(`
    SELECT
      id, folio, session_id, texto, texto_original, sha256, chars, titulo, origen, driver, usuario,
      recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento,
      audio_url, audio_bytes, duracion_seg, fuente, pulido_aplicado, audio_partes, version_aprobada
    FROM volcado
    ORDER BY recibido_en DESC
  `);

  const volcados = vRes.rows;
  if (volcados.length === 0) {
    return {
      total: 0,
      counts: { archivado: 0, pendiente_revision: 0, en_revision: 0, listo_ingesta: 0, ingerido: 0, fallido: 0 },
      integrity: { sync: 0, text_without_audio: 0, audio_without_text: 0, audio_partial: 0, text_edited: 0, broken_provenance: 0, unknown: 0 },
      volcados: []
    };
  }

  const ids = volcados.map((v: any) => v.id);

  // Bulk query versions
  const verRes = await db.query(
    "SELECT volcado_id, version, sha256, chars, creado_en FROM volcado_version WHERE volcado_id = ANY($1) ORDER BY version ASC",
    [ids]
  );
  const versionsMap = new Map<string, any[]>();
  for (const row of verRes.rows) {
    if (!versionsMap.has(row.volcado_id)) {
      versionsMap.set(row.volcado_id, []);
    }
    versionsMap.get(row.volcado_id)!.push(row);
  }

  // Bulk query sessions
  const sRes = await db.query("SELECT session_id, volcado_id, estado, total_partes FROM dictado_session");
  const sessionMap = new Map<string, any>();
  for (const s of sRes.rows) {
    sessionMap.set(s.session_id, s);
    if (s.volcado_id) sessionMap.set(s.volcado_id, s);
  }

  // Bulk query dictado_audio_parte
  const pRes = await db.query("SELECT session_id, volcado_id, part_index, blob_url, blob_path, bytes FROM dictado_audio_parte");
  const partesMap = new Map<string, any[]>();
  for (const p of pRes.rows) {
    const key = p.session_id || p.volcado_id;
    if (key) {
      const listP = partesMap.get(key) || [];
      listP.push(p);
      partesMap.set(key, listP);
    }
  }

  // Bulk query PG graph nodes count
  const nRes = await db.query(
    "SELECT volcado_id, count(*)::int AS n FROM nodos WHERE volcado_id = ANY($1) GROUP BY volcado_id",
    [ids]
  );
  const nodesCountMap = new Map<string, number>();
  for (const row of nRes.rows) {
    nodesCountMap.set(row.volcado_id, row.n);
  }

  // Bulk query PG graph edges count
  const eRes = await db.query(
    "SELECT volcado_id, count(*)::int AS n FROM aristas WHERE volcado_id = ANY($1) GROUP BY volcado_id",
    [ids]
  );
  const edgesCountMap = new Map<string, number>();
  for (const row of eRes.rows) {
    edgesCountMap.set(row.volcado_id, row.n);
  }

  const processedVolcados: PipelineVolcado[] = [];
  const counts = { archivado: 0, pendiente_revision: 0, en_revision: 0, listo_ingesta: 0, ingerido: 0, fallido: 0 };
  const integrityCounts = { sync: 0, text_without_audio: 0, audio_without_text: 0, audio_partial: 0, text_edited: 0, broken_provenance: 0, unknown: 0 };

  for (const v of volcados) {
    const vId = String(v.id);
    const vers = versionsMap.get(vId) || [];

    const versionOriginal = 1;
    const versionActual = vers.length > 0 ? Math.max(...vers.map((vr: any) => vr.version)) : 1;
    const versionAprobada = v.version_aprobada !== null ? Number(v.version_aprobada) : null;

    const v1 = vers.find((vr: any) => vr.version === 1);
    const sha256Original = v1 ? v1.sha256 : v.sha256;

    let sha256Aprobada: string | null = null;
    if (versionAprobada !== null) {
      const vAprobada = vers.find((vr: any) => vr.version === versionAprobada);
      sha256Aprobada = vAprobada ? vAprobada.sha256 : null;
    }

    // Audio parts & session details
    const sessionId = v.session_id ? String(v.session_id).trim() : null;
    const sesionObj = sessionId ? sessionMap.get(sessionId) : sessionMap.get(vId);

    let audioPartesJson: any[] = [];
    if (v.audio_partes) {
      try {
        audioPartesJson = typeof v.audio_partes === "string" ? JSON.parse(v.audio_partes) : v.audio_partes;
      } catch (e) {}
    }

    const partesDb = (sessionId ? partesMap.get(sessionId) : null) || partesMap.get(vId) || [];
    const blobPaths = Array.from(new Set([
      ...partesDb.map((p) => p.blob_path || p.blob_url),
      ...(Array.isArray(audioPartesJson) ? audioPartesJson.map((p) => p.url) : []),
      ...(v.audio_url ? [v.audio_url] : []),
    ])).filter(Boolean);

    const partesCount = Math.max(partesDb.length, Array.isArray(audioPartesJson) ? audioPartesJson.length : 0);
    const hasAudio = !!v.audio_url || partesCount > 0;
    const hasText = !!v.texto && descifrarTexto(v.texto).trim().length > 0;

    let audioBytes = v.audio_bytes !== null ? Number(v.audio_bytes) : 0;
    if (audioBytes === 0 && partesDb.length > 0) {
      audioBytes = partesDb.reduce((sum: number, p: any) => sum + (p.bytes || 0), 0);
    } else if (audioBytes === 0 && Array.isArray(audioPartesJson)) {
      audioBytes = audioPartesJson.reduce((sum: number, p: any) => sum + (p.bytes || 0), 0);
    }

    // Determine precise Audio Status Badge:
    let audioStatus: "disponible" | "encontrado_no_vinculado" | "incompleto" | "no_recuperable" = "no_recuperable";
    if (hasAudio && (sessionId || v.audio_url)) {
      if (sesionObj?.total_partes && partesCount < sesionObj.total_partes) {
        audioStatus = "incompleto";
      } else {
        audioStatus = "disponible";
      }
    } else if (hasAudio && !sessionId) {
      audioStatus = "encontrado_no_vinculado";
    } else if (!hasAudio && (v.duracion_seg > 0 || v.audio_bytes > 0)) {
      audioStatus = "no_recuperable";
    } else {
      audioStatus = "no_recuperable";
    }

    let status: "sync" | "text_without_audio" | "audio_without_text" | "audio_partial" | "text_edited" | "broken_provenance" | "unknown" = "sync";
    const flags: string[] = [];

    if (v.estado === "ingerido" && !v.io_id) {
      status = "broken_provenance";
      flags.push("Estado 'ingerido' pero io_id está ausente");
    }

    if (status === "sync") {
      if (hasText && !hasAudio) {
        status = "text_without_audio";
        flags.push("Texto presente pero no hay audio");
      } else if (hasAudio && !hasText) {
        status = "audio_without_text";
        flags.push("Audio presente pero no hay texto");
      }
    }

    const isEdited = v.ediciones > 0 || (v.texto_original && v.texto_original !== v.texto) || (vers.length > 1);
    if (status === "sync" && isEdited) {
      status = "text_edited";
      flags.push("El texto actual difiere de la transcripción original");
    }

    const est = v.estado as keyof typeof counts;
    if (counts[est] !== undefined) {
      counts[est]++;
    } else {
      counts.archivado++;
    }

    integrityCounts[status]++;

    processedVolcados.push({
      id: vId,
      folio: v.folio ? Number(v.folio) : null,
      session_id: sessionId,
      session_estado: sesionObj?.estado || null,
      audio_status: audioStatus,
      partes_count: partesCount,
      blob_paths: blobPaths,
      estado: v.estado,
      version_original: versionOriginal,
      version_actual: versionActual,
      version_aprobada: versionAprobada,
      sha256_original: sha256Original,
      sha256_aprobada: sha256Aprobada,
      audio: {
        present: hasAudio,
        complete: audioStatus === "disponible",
        bytes: audioBytes,
        duration_sec: v.duracion_seg !== null ? Number(v.duracion_seg) : 0
      },
      transcription: {
        present: hasText,
        chars: v.chars !== null ? Number(v.chars) : 0,
        sha256: v.sha256
      },
      ingesta: {
        status: v.estado === "ingerido" ? "success" : v.estado === "fallido" ? "failed" : "pending",
        io_id: v.io_id,
        attempts: v.intentos !== null ? Number(v.intentos) : 0,
        last_attempt: v.ultimo_intento ? new Date(v.ultimo_intento).toISOString() : null,
        last_error: v.ultimo_error
      },
      graph: {
        entities: nodesCountMap.get(vId) || 0,
        relations: edgesCountMap.get(vId) || 0
      },
      integrity: {
        status,
        flags
      }
    });
  }

  return {
    total: volcados.length,
    counts,
    integrity: integrityCounts,
    volcados: processedVolcados
  };
}

export async function obtenerPipelineDetalle(id: string): Promise<any> {
  const db = getDb();

  const vRes = await db.query(
    `SELECT
      id, folio, session_id, texto, texto_original, sha256, chars, titulo, origen, driver, usuario,
      recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento,
      audio_url, audio_bytes, duracion_seg, fuente, pulido_aplicado, audio_partes, version_aprobada
     FROM volcado WHERE id::text = $1 OR folio::text = $1`,
    [id]
  );

  if (vRes.rows.length === 0) {
    return null;
  }

  const v = vRes.rows[0];

  v.texto = descifrarTexto(v.texto || "");
  if (v.texto_original) {
    v.texto_original = descifrarTexto(v.texto_original);
  }

  const verRes = await db.query(
    "SELECT id, version, texto, sha256, chars, motivo, creado_en FROM volcado_version WHERE volcado_id = $1 ORDER BY version ASC",
    [v.id]
  );
  const versiones = verRes.rows.map((vr: any) => ({
    ...vr,
    texto: descifrarTexto(vr.texto || "")
  }));

  const corRes = await db.query(
    "SELECT id, antes, despues, version_desde, version_hasta, creado_en FROM correccion WHERE volcado_id = $1 ORDER BY creado_en ASC",
    [v.id]
  );
  const correcciones = corRes.rows;

  const nodesRes = await db.query("SELECT * FROM nodos WHERE volcado_id = $1", [v.id]);
  const edgesRes = await db.query("SELECT * FROM aristas WHERE volcado_id = $1", [v.id]);

  const nodes = nodesRes.rows;
  const edges = edgesRes.rows;

  let neo4jVerified: { exists: boolean | "unknown"; details: any | null } = { exists: "unknown", details: null };
  if (v.io_id) {
    neo4jVerified = await verificarInformationObjectNeo4j(v.io_id);
  }

  const listData = await obtenerPipelineAggregated();
  const vEnriched = listData.volcados.find((p: any) => p.id === v.id);

  return {
    volcado: v,
    versiones,
    correcciones,
    procedencia: {
      volcado_id: v.id,
      folio: v.folio,
      session_id: v.session_id,
      version_original: vEnriched?.version_original ?? 1,
      version_actual: vEnriched?.version_actual ?? 1,
      version_aprobada: vEnriched?.version_aprobada ?? null,
      sha256_original: vEnriched?.sha256_original ?? null,
      sha256_aprobada: vEnriched?.sha256_aprobada ?? null,
      io_id: v.io_id,
      information_object: neo4jVerified,
      graph: {
        entities: nodes.length,
        relations: edges.length,
        nodes,
        edges
      },
      integrity: vEnriched?.integrity ?? { status: "unknown", flags: [] }
    }
  };
}
