import { encolarTrabajosCaptura } from "./custodia-trabajos";
// @l0 L0-002-R · @req FIX-DICTADO/D2-D8 · @req TRACE-SESSION/010 · @req REVISION-COCKPIT/REQ-1 · @req FIX-DICTADO/D13 · @req SISTEMA-MENU/E4
import { randomUUID, createHash } from "crypto";
import { getDb } from "./neon";
import { asegurarTabla, prepararVolcadoParaRevision } from "./volcados";
import { cifrarTexto, descifrarTexto } from "./cripto";
import { registrarEvento } from "./eventos";
import { evaluarCustodiaAudio } from "../audio/custodia";

const ALTERS = [
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS audio_url TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS audio_bytes INTEGER",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS duracion_seg INTEGER",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT $$texto$$",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS pulido_aplicado BOOLEAN DEFAULT false",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS audio_partes JSONB",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS session_id TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS estado_transcripcion TEXT",
  "ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS fuente_audio TEXT DEFAULT 'microphone'",
  "ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS original_name TEXT",
  "ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS mime_type TEXT",
];

const SESSION_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS dictado_session (
    session_id TEXT PRIMARY KEY,
    volcado_id UUID REFERENCES volcado(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'uploading',
    total_partes INTEGER,
    duracion_seg INTEGER,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    cerrado_en TIMESTAMPTZ,
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS dictado_session_volcado_id_uniq
ON dictado_session (volcado_id)
WHERE volcado_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dictado_audio_parte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES dictado_session(session_id) ON DELETE CASCADE,
    volcado_id UUID REFERENCES volcado(id) ON DELETE SET NULL,
    part_index INTEGER NOT NULL,
    blob_url TEXT NOT NULL,
    blob_path TEXT,
    bytes INTEGER NOT NULL,
    sha256 TEXT,
    fuente_audio TEXT NOT NULL DEFAULT 'microphone',
    original_name TEXT,
    mime_type TEXT,
    estado TEXT NOT NULL DEFAULT 'uploaded',
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    start_ms INTEGER,
    end_ms INTEGER,
    duracion_ms INTEGER,
    estado_verificacion TEXT DEFAULT 'pendiente',
    CONSTRAINT dictado_audio_parte_session_part_uniq UNIQUE (session_id, part_index)
);

CREATE INDEX IF NOT EXISTS dictado_audio_parte_session_id_idx ON dictado_audio_parte (session_id);
CREATE INDEX IF NOT EXISTS dictado_audio_parte_volcado_id_idx ON dictado_audio_parte (volcado_id);
`;

const EXTENDED_COLUMNS_SQL = `
ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS start_ms INTEGER;
ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS end_ms INTEGER;
ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS duracion_ms INTEGER;
ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS estado_verificacion TEXT DEFAULT 'pendiente';
`;

let columnasListas = false;

export async function asegurarColumnasDictado(): Promise<void> {
  if (columnasListas) return;
  const db = getDb();
  try {
    await db.query("SELECT audio_url, audio_bytes, duracion_seg, fuente, pulido_aplicado, audio_partes, session_id, estado_transcripcion FROM volcado LIMIT 0");
    await db.query("SELECT session_id, volcado_id, estado, total_partes, duracion_seg FROM dictado_session LIMIT 0");
    await db.query("SELECT session_id, volcado_id, part_index, blob_url, blob_path, bytes, sha256, fuente_audio, start_ms, end_ms, duracion_ms, estado_verificacion, original_name, mime_type FROM dictado_audio_parte LIMIT 0");
    columnasListas = true;
    return;
  } catch {
    // Instalaciones antiguas: ejecutar la compatibilidad DDL una sola vez.
  }
  await asegurarTabla();
  // Las tablas de sesión/partes deben existir antes de aplicar ALTER TABLE:
  // una instalación nueva también entra por este camino de compatibilidad.
  await db.query(SESSION_TABLES_SQL);
  for (const sql of ALTERS) {
    await db.query(sql);
  }
  await db.query(EXTENDED_COLUMNS_SQL);
  columnasListas = true;
}

export type AudioParte = {
  parte: number;
  url: string;
  bytes: number;
  path?: string;
  sha256?: string;
  fuenteAudio?: "microphone" | "chrome_tab" | "audio_archivo";
  nombreOriginal?: string | null;
  mimeType?: string | null;
  start_ms?: number;
  end_ms?: number;
  duracion_ms?: number;
  estadoVerificacion?: "pendiente" | "verificado";
  verificado?: boolean;
};

export type EntradaDictado = {
  tituloAutomatico?: boolean;
  texto: string;
  sessionId?: string | null;
  titulo?: string | null;
  audioUrl?: string | null;
  audioBytes?: number | null;
  duracionSeg?: number | null;
  pulidoAplicado?: boolean;
  usuario?: string | null;
  audioPartes?: AudioParte[] | null;
  estadoTranscripcion?: string | null;
  fuenteEntrada?: "texto" | "microfono" | "chrome_live_caption" | "audio_archivo" | null;
};

export async function registrarParteAudio(params: {
  sessionId: string;
  partIndex: number;
  blobUrl: string;
  blobPath?: string;
  bytes: number;
  sha256?: string;
  fuenteAudio?: "microphone" | "chrome_tab" | "audio_archivo";
  nombreOriginal?: string | null;
  mimeType?: string | null;
  startMs?: number;
  endMs?: number;
  duracionMs?: number;
  estadoVerificacion?: "pendiente" | "verificado";
}) {
  await asegurarColumnasDictado();
  const pool = getDb();

  if (!params.sessionId.trim()) throw new Error("Custodia inválida: falta sessionId.");
  if (!Number.isInteger(params.partIndex) || params.partIndex < 1) {
    throw new Error("Custodia inválida: partIndex debe iniciar en 1 y ser entero.");
  }
  if (!Number.isSafeInteger(params.bytes) || params.bytes <= 0) {
    throw new Error("Custodia inválida: la parte no contiene bytes verificables.");
  }
  if (!/^[0-9a-f]{64}$/i.test(String(params.sha256 ?? ""))) {
    throw new Error("Custodia inválida: cada parte debe tener SHA-256 verificado.");
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    // Una sesión archivada queda sellada: no admite nuevas partes.
    const sesion = await db.query(
      `INSERT INTO dictado_session (session_id, estado, actualizado_en)
       VALUES ($1, 'uploading', NOW())
       ON CONFLICT (session_id) DO UPDATE SET actualizado_en = NOW()
       WHERE dictado_session.volcado_id IS NULL
         AND dictado_session.estado <> 'complete'
       RETURNING session_id`,
      [params.sessionId]
    );
    if (typeof sesion.rowCount === "number" && sesion.rowCount === 0) {
      throw new Error("Custodia sellada: la sesión ya se vinculó a un volcado; no se puede añadir ni sustituir audio.");
    }

    await db.query("SELECT session_id FROM dictado_session WHERE session_id=$1 FOR UPDATE", [params.sessionId]);
    // Reintentar un upload solo puede reemplazar la ubicación del mismo contenido.
    // Otra huella/bytes en el mismo índice es un conflicto; jamás sobrescribir el original.
    const parte = await db.query(
      `INSERT INTO dictado_audio_parte
         (session_id, part_index, blob_url, blob_path, bytes, sha256, fuente_audio, estado_verificacion, start_ms, end_ms, duracion_ms, original_name, mime_type)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
       WHERE EXISTS (
         SELECT 1 FROM dictado_session s
         WHERE s.session_id = $1 AND s.volcado_id IS NULL AND s.estado <> 'complete'
       )
       ON CONFLICT (session_id, part_index) DO UPDATE
       SET blob_url = EXCLUDED.blob_url,
           blob_path = EXCLUDED.blob_path,
           estado_verificacion = EXCLUDED.estado_verificacion,
           start_ms = COALESCE(EXCLUDED.start_ms, dictado_audio_parte.start_ms),
           end_ms = COALESCE(EXCLUDED.end_ms, dictado_audio_parte.end_ms),
           duracion_ms = COALESCE(EXCLUDED.duracion_ms, dictado_audio_parte.duracion_ms),
           original_name = COALESCE(dictado_audio_parte.original_name, EXCLUDED.original_name),
           mime_type = COALESCE(dictado_audio_parte.mime_type, EXCLUDED.mime_type),
           uploaded_at = NOW()
       WHERE dictado_audio_parte.bytes = EXCLUDED.bytes
         AND lower(dictado_audio_parte.sha256) = lower(EXCLUDED.sha256)
         AND dictado_audio_parte.fuente_audio = EXCLUDED.fuente_audio
         AND COALESCE(dictado_audio_parte.original_name, EXCLUDED.original_name) = COALESCE(EXCLUDED.original_name, dictado_audio_parte.original_name)
         AND COALESCE(dictado_audio_parte.mime_type, EXCLUDED.mime_type) = COALESCE(EXCLUDED.mime_type, dictado_audio_parte.mime_type)
         AND EXISTS (
           SELECT 1 FROM dictado_session s
           WHERE s.session_id = EXCLUDED.session_id
             AND s.volcado_id IS NULL AND s.estado <> 'complete'
         )
       RETURNING part_index`,
      [
        params.sessionId,
        params.partIndex,
        params.blobUrl,
        params.blobPath ?? null,
        params.bytes,
        params.sha256!.toLowerCase(),
        params.fuenteAudio ?? "microphone",
        params.estadoVerificacion ?? "pendiente",
        params.startMs ?? null,
        params.endMs ?? null,
        params.duracionMs ?? null,
        params.nombreOriginal?.trim() || null,
        params.mimeType?.trim().toLowerCase() || null,
      ]
    );
    if (typeof parte.rowCount === "number" && parte.rowCount === 0) {
      throw new Error(
        `Conflicto de custodia en la parte ${params.partIndex}: ya existe contenido con otra huella/bytes, o la sesión quedó sellada. El original no se sobrescribió.`,
      );
    }

    await db.query("COMMIT");
    await registrarEvento({
      fase: "dictado",
      eventId: "DIC-002",
      estado: "OK",
      mensaje: `Parte de audio ${params.partIndex} registrada exitosamente para la sesión ${params.sessionId}`,
      detalle: {
        sessionId: params.sessionId,
        partIndex: params.partIndex,
        bytes: params.bytes,
        sha256: params.sha256,
        startMs: params.startMs,
        endMs: params.endMs,
      },
      correlacionId: params.sessionId,
    });
  } catch (err) {
    await db.query("ROLLBACK").catch(()=>undefined);
    await registrarEvento({
      fase: "dictado",
      eventId: "DIC-002",
      estado: "FAIL",
      mensaje: `Fallo al registrar parte de audio ${params.partIndex} en sesión ${params.sessionId}: ${String(err)}`,
      detalle: { error: String(err), params },
      correlacionId: params.sessionId,
    });
    throw err;
  } finally { db.release(); }
}

function normalizarFirmaPartesAudio(partes: any): string {
  let lista: any[] = [];
  if (Array.isArray(partes)) {
    lista = partes;
  } else if (typeof partes === "string" && partes.trim()) {
    try {
      const parsed = JSON.parse(partes);
      if (Array.isArray(parsed)) lista = parsed;
    } catch {
      throw new Error("Custodia rota: el manifiesto de partes archivado no es JSON válido.");
    }
  }

  return JSON.stringify(
    lista
      .map((p) => ({
        parte: Number(p.parte ?? p.part_index),
        bytes: Number(p.bytes),
        sha256: String(p.sha256 ?? "").trim().toLowerCase(),
        fuenteAudio: p.fuenteAudio === "audio_archivo" || p.fuente_audio === "audio_archivo" ? "audio_archivo" : p.fuenteAudio === "chrome_tab" || p.fuente_audio === "chrome_tab" ? "chrome_tab" : "microphone",
        nombreOriginal: String(p.nombreOriginal ?? p.original_name ?? "").trim() || null,
        mimeType: String(p.mimeType ?? p.mime_type ?? "").trim().toLowerCase() || null,
        start_ms: p.start_ms ?? p.startMs ?? null,
        end_ms: p.end_ms ?? p.endMs ?? null,
        duracion_ms: p.duracion_ms ?? p.duracionMs ?? null,
      }))
      .sort((a, b) => a.parte - b.parte),
  );
}

async function guardarDictadoConSesion(
  entrada: EntradaDictado,
  sessionId: string,
  sha: string,
  correlacionId: string,
) {
  const db = getDb();
  const idNuevo = randomUUID();
  const client = await db.connect();
  let enTransaccion = false;
  let volcadoIdParaEvento: string = idNuevo;
  let retorno: { id: string; sha256: string; chars: number; sessionId: string; idempotent: boolean; estado?: string } | null = null;
  let preparar = false;

  try {
    await client.query("BEGIN");
    enTransaccion = true;

    // Materializar la fila de sesión y bloquearla. Dos POST concurrentes con el
    // mismo sessionId quedan serializados antes de decidir si crean un volcado.
    await client.query(
      `INSERT INTO dictado_session (session_id, estado, actualizado_en)
       VALUES ($1, 'uploading', NOW())
       ON CONFLICT (session_id) DO NOTHING`,
      [sessionId],
    );
    const sesionRes = await client.query(
      "SELECT session_id, volcado_id, estado FROM dictado_session WHERE session_id = $1 FOR UPDATE",
      [sessionId],
    );
    if (sesionRes.rows.length === 0) {
      throw new Error("Custodia rota: no se pudo bloquear la sesión de captura.");
    }

    const partesRes = await client.query(
      `SELECT part_index, bytes, sha256, fuente_audio, estado_verificacion, start_ms, end_ms, duracion_ms, original_name, mime_type
       FROM dictado_audio_parte WHERE session_id = $1 ORDER BY part_index ASC`,
      [sessionId],
    );
    const partesPersistidas = partesRes.rows ?? [];
    const partesRecibidas = entrada.audioPartes ?? [];

    // Nunca aceptar audio declarado por el navegador si no existe y está verificado
    // en el almacén canónico vinculado a esa sesión.
    if (partesPersistidas.length !== partesRecibidas.length) {
      throw new Error(
        `Custodia rota: la sesión registra ${partesPersistidas.length} partes pero el archivado recibió ${partesRecibidas.length}.`,
      );
    }
    if (partesPersistidas.length > 0 || partesRecibidas.length > 0) {
      const custodiaPersistida = evaluarCustodiaAudio(
        partesPersistidas.map((p: any) => ({
          part_index: Number(p.part_index),
          bytes: Number(p.bytes),
          sha256: p.sha256 ?? null,
          estado_verificacion: p.estado_verificacion ?? null,
        })),
        partesPersistidas.length,
      );
      if (!custodiaPersistida.ok) throw new Error(custodiaPersistida.motivo);
    }
    if (
      normalizarFirmaPartesAudio(partesPersistidas) !==
      normalizarFirmaPartesAudio(partesRecibidas)
    ) {
      throw new Error("Custodia rota: las partes presentadas no coinciden con el manifiesto verificado de la sesión.");
    }

    const volcadoVinculado = sesionRes.rows[0].volcado_id as string | null;
    if (volcadoVinculado) {
      const existenteRes = await client.query(
        `SELECT id, texto, texto_original, sha256, chars, audio_partes, estado, session_id
         FROM volcado WHERE id = $1 FOR UPDATE`,
        [volcadoVinculado],
      );
      if (existenteRes.rows.length === 0) {
        throw new Error("Custodia rota: la sesión apunta a un volcado que no existe; no se creará otro automáticamente.");
      }
      const existente = existenteRes.rows[0] as any;
      volcadoIdParaEvento = String(existente.id);
      const textoExistente = descifrarTexto(String(existente.texto ?? ""));
      const shaTextoExistente = createHash("sha256").update(textoExistente, "utf8").digest("hex");
      if (shaTextoExistente !== String(existente.sha256 ?? "").trim().toLowerCase()) {
        throw new Error("Custodia rota: el texto archivado ya no coincide con su SHA-256 sellado.");
      }
      if (
        String(existente.session_id ?? "") !== sessionId ||
        createHash("sha256").update(descifrarTexto(String(existente.texto_original ?? existente.texto ?? "")), "utf8").digest("hex") !== sha ||
        normalizarFirmaPartesAudio(existente.audio_partes) !== normalizarFirmaPartesAudio(partesRecibidas)
      ) {
        throw new Error(
          "Conflicto de idempotencia: sessionId ya está archivado con otro texto o manifiesto de audio. El original se conserva; edita desde Volcados o inicia una captura nueva.",
        );
      }

      const versionRes = await client.query(
        "SELECT version FROM volcado_version WHERE volcado_id = $1 AND version = 1",
        [volcadoVinculado],
      );
      preparar =
        existente.estado === "archivado" || existente.estado === "pendiente_revision";
      retorno = {
        id: String(existente.id),
        sha256: sha,
        chars: entrada.texto.length,
        sessionId,
        idempotent: true,
        estado: String(existente.estado),
      };
    } else {
      if (String(sesionRes.rows[0].estado ?? "") === "complete") {
        throw new Error("Custodia rota: sesión marcada completa sin volcado vinculado; se requiere reconciliación, no un archivado nuevo.");
      }
      await client.query(
        `INSERT INTO volcado
         (id, texto, sha256, chars, titulo, origen, driver, usuario, estado, fuente, audio_url, audio_bytes, duracion_seg, pulido_aplicado, audio_partes, session_id, estado_transcripcion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          idNuevo,
          cifrarTexto(entrada.texto),
          sha,
          entrada.texto.length,
          entrada.titulo ?? null,
          "web",
          entrada.fuenteEntrada === "chrome_live_caption" ? "chrome_live_caption" : entrada.fuenteEntrada === "audio_archivo" ? "audio_archivo" : entrada.fuenteEntrada === "texto" ? "texto" : "dictado",
          entrada.usuario ?? null,
          "archivado",
          entrada.fuenteEntrada === "texto" ? "texto" : "dictado",
          entrada.audioUrl ?? null,
          entrada.audioBytes ?? null,
          entrada.duracionSeg ?? null,
          entrada.pulidoAplicado === true,
          entrada.audioPartes ? JSON.stringify(entrada.audioPartes) : null,
          sessionId,
          entrada.estadoTranscripcion ?? null,
        ],
      );

      const totalPartes = partesRecibidas.length > 0 ? partesRecibidas.length : null;
      const vinculoRes = await client.query(
        `UPDATE dictado_session
         SET volcado_id = $1, estado = 'complete',
             total_partes = COALESCE($3, total_partes),
             duracion_seg = COALESCE($4, duracion_seg),
             cerrado_en = NOW(), actualizado_en = NOW()
         WHERE session_id = $2 AND volcado_id IS NULL`,
        [idNuevo, sessionId, totalPartes, entrada.duracionSeg ?? null],
      );
      if (typeof vinculoRes.rowCount === "number" && vinculoRes.rowCount !== 1) {
        throw new Error("Custodia rota: no se pudo vincular la sesión con un único volcado.");
      }
      await client.query(
        "UPDATE dictado_audio_parte SET volcado_id = $1 WHERE session_id = $2",
        [idNuevo, sessionId],
      );
      retorno = {
        id: idNuevo,
        sha256: sha,
        chars: entrada.texto.length,
        sessionId,
        idempotent: false,
        estado: "archivado",
      };
      preparar = true;
    }

    if(entrada.usuario)await encolarTrabajosCaptura(client,{
      sessionId,usuario:entrada.usuario,tituloAutomatico:entrada.tituloAutomatico===true,
      volcado_id:retorno!.id,version:1,sha256:sha,texto:entrada.texto,
      titulo:entrada.titulo??null,caracteres:entrada.texto.length,
      audio:entrada.audioUrl??null,partesAudio:partesPersistidas.length,pulidoAplicado:entrada.pulidoAplicado===true,
    });
    await client.query("COMMIT");
    enTransaccion = false;
  } catch (err) {
    if (enTransaccion) await client.query("ROLLBACK").catch(() => undefined);
    await registrarEvento({
      fase: "dictado",
      eventId: "DIC-001",
      estado: "FAIL",
      mensaje: `Fallo al custodiar el dictado: ${String(err)}`,
      detalle: { error: String(err), sessionId },
      volcadoId: volcadoIdParaEvento,
      sha256: sha,
      correlacionId,
    }).catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  if (!retorno) throw new Error("Custodia rota: no se produjo un resultado de archivado.");
  if (preparar) {
    const prepared = await prepararVolcadoParaRevision(retorno.id, entrada.usuario, { onFailure: "keep_captura" });
    retorno.estado = prepared.estado;
  }
  await registrarEvento({
    fase: "dictado",
    eventId: "DIC-001",
    estado: "OK",
    mensaje: retorno.idempotent
      ? "Reintento de archivado resuelto contra el volcado original; no se creó una copia."
      : "Dictado archivado e inicializado exitosamente para revisión",
    detalle: {
      volcadoId: retorno.id,
      sessionId,
      chars: retorno.chars,
      idempotent: retorno.idempotent,
      pulidoAplicado: entrada.pulidoAplicado,
    },
    volcadoId: retorno.id,
    version: 1,
    sha256: retorno.sha256,
    correlacionId,
  });

  return {
    id: retorno.id,
    sha256: retorno.sha256,
    chars: retorno.chars,
    sessionId,
    idempotent: retorno.idempotent,
  };
}

export async function guardarDictado(entrada: EntradaDictado) {
  await asegurarColumnasDictado();
  const db = getDb();

  const sessionId = typeof entrada.sessionId === "string" ? entrada.sessionId.trim() || null : null;
  if (!sessionId) throw new Error("Custodia inválida: toda captura requiere sessionId.");
  const correlacionId = sessionId || randomUUID();
  const requiereAudioVerificado =
    Boolean(sessionId) &&
    (entrada.fuenteEntrada === "microfono" || entrada.fuenteEntrada === "chrome_live_caption" || entrada.fuenteEntrada === "audio_archivo");

  if (requiereAudioVerificado) {
    if (!Array.isArray(entrada.audioPartes) || entrada.audioPartes.length === 0) {
      throw new Error("No se puede archivar el dictado: la sesión tiene captura de voz pero no tiene partes de audio.");
    }

    const custodia = evaluarCustodiaAudio(
      entrada.audioPartes.map((p) => ({
        part_index: Number(p.parte),
        bytes: Number(p.bytes),
        sha256: p.sha256 ?? null,
        estado_verificacion: p.estadoVerificacion ?? (p.verificado === true ? "verificado" : null),
      })),
      entrada.audioPartes.length,
    );

    if (!custodia.ok) {
      throw new Error(custodia.motivo);
    }
  }

  const sha = createHash("sha256").update(entrada.texto, "utf8").digest("hex");
  if (sessionId) {
    return guardarDictadoConSesion(entrada, sessionId, sha, correlacionId);
  }

  const id = randomUUID();

  try {
    await db.query(
      `INSERT INTO volcado
       (id, texto, sha256, chars, titulo, origen, driver, usuario, estado, fuente, audio_url, audio_bytes, duracion_seg, pulido_aplicado, audio_partes, session_id, estado_transcripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        id,
        cifrarTexto(entrada.texto),
        sha,
        entrada.texto.length,
        entrada.titulo ?? null,
        "web",
        entrada.fuenteEntrada === "chrome_live_caption" ? "chrome_live_caption" : entrada.fuenteEntrada === "audio_archivo" ? "audio_archivo" : entrada.fuenteEntrada === "texto" ? "texto" : "dictado",
        entrada.usuario ?? null,
        "archivado",
        entrada.fuenteEntrada === "texto" ? "texto" : "dictado",
        entrada.audioUrl ?? null,
        entrada.audioBytes ?? null,
        entrada.duracionSeg ?? null,
        entrada.pulidoAplicado === true,
        entrada.audioPartes ? JSON.stringify(entrada.audioPartes) : null,
        sessionId,
        entrada.estadoTranscripcion ?? null,
      ]
    );

    if (sessionId) {
      const totalPartes = Array.isArray(entrada.audioPartes) ? entrada.audioPartes.length : null;

      await db.query(
        `INSERT INTO dictado_session (session_id, volcado_id, estado, total_partes, duracion_seg, cerrado_en, actualizado_en)
         VALUES ($1, $2, 'complete', $3, $4, NOW(), NOW())
         ON CONFLICT (session_id) DO UPDATE SET
           volcado_id = EXCLUDED.volcado_id,
           estado = 'complete',
           total_partes = COALESCE(EXCLUDED.total_partes, dictado_session.total_partes),
           duracion_seg = COALESCE(EXCLUDED.duracion_seg, dictado_session.duracion_seg),
           cerrado_en = NOW(),
           actualizado_en = NOW()`,
        [sessionId, id, totalPartes, entrada.duracionSeg ?? null]
      );

      await db.query(
        `UPDATE dictado_audio_parte SET volcado_id = $1 WHERE session_id = $2`,
        [id, sessionId]
      );
    }

    await prepararVolcadoParaRevision(id, entrada.usuario, { onFailure: "keep_captura" });

    await registrarEvento({
      fase: "dictado",
      eventId: "DIC-001",
      estado: "OK",
      mensaje: `Dictado archivado e inicializado exitosamente para revisión`,
      detalle: {
        volcadoId: id,
        sessionId,
        chars: entrada.texto.length,
        pulidoAplicado: entrada.pulidoAplicado,
      },
      volcadoId: id,
      version: 1,
      sha256: sha,
      correlacionId,
    });

    return { id, sha256: sha, chars: entrada.texto.length, sessionId, idempotent: false };
  } catch (err) {
    await registrarEvento({
      fase: "dictado",
      eventId: "DIC-001",
      estado: "FAIL",
      mensaje: `Fallo al guardar dictado: ${String(err)}`,
      detalle: { error: String(err), sessionId },
      volcadoId: id,
      sha256: sha,
      correlacionId,
    });
    throw err;
  }
}
