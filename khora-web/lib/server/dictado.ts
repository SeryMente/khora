// @l0 L0-002-R · @req FIX-DICTADO/D2-D8 · @req TRACE-SESSION/010
import { randomUUID, createHash } from "crypto";
import { getDb } from "./neon";
import { asegurarTabla } from "./volcados";
import { crearVersion } from "./correcciones";
import { cifrarTexto } from "./cripto";

const ALTERS = [
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS audio_url TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS audio_bytes INTEGER",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS duracion_seg INTEGER",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT $$texto$$",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS pulido_aplicado BOOLEAN DEFAULT false",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS audio_partes JSONB",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS session_id TEXT",
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
    estado TEXT NOT NULL DEFAULT 'uploaded',
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT dictado_audio_parte_session_part_uniq UNIQUE (session_id, part_index)
);

CREATE INDEX IF NOT EXISTS dictado_audio_parte_session_id_idx ON dictado_audio_parte (session_id);
CREATE INDEX IF NOT EXISTS dictado_audio_parte_volcado_id_idx ON dictado_audio_parte (volcado_id);
`;

let columnasListas = false;

export async function asegurarColumnasDictado(): Promise<void> {
  if (columnasListas) return;
  await asegurarTabla();
  const db = getDb();
  for (const sql of ALTERS) {
    await db.query(sql);
  }
  await db.query(SESSION_TABLES_SQL);
  columnasListas = true;
}

export type AudioParte = {
  parte: number;
  url: string;
  bytes: number;
  path?: string;
  sha256?: string;
};

export type EntradaDictado = {
  texto: string;
  sessionId?: string | null;
  titulo?: string | null;
  audioUrl?: string | null;
  audioBytes?: number | null;
  duracionSeg?: number | null;
  pulidoAplicado?: boolean;
  usuario?: string | null;
  audioPartes?: AudioParte[] | null;
};

export async function registrarParteAudio(params: {
  sessionId: string;
  partIndex: number;
  blobUrl: string;
  blobPath?: string;
  bytes: number;
  sha256?: string;
}) {
  await asegurarColumnasDictado();
  const db = getDb();

  // Asegurar sesión
  await db.query(
    `INSERT INTO dictado_session (session_id, estado, actualizado_en)
     VALUES ($1, 'uploading', NOW())
     ON CONFLICT (session_id) DO UPDATE SET actualizado_en = NOW()`,
    [params.sessionId]
  );

  // Registrar/Actualizar parte
  await db.query(
    `INSERT INTO dictado_audio_parte (session_id, part_index, blob_url, blob_path, bytes, sha256)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (session_id, part_index) DO UPDATE
     SET blob_url = EXCLUDED.blob_url,
         blob_path = EXCLUDED.blob_path,
         bytes = EXCLUDED.bytes,
         sha256 = EXCLUDED.sha256,
         uploaded_at = NOW()`,
    [
      params.sessionId,
      params.partIndex,
      params.blobUrl,
      params.blobPath ?? null,
      params.bytes,
      params.sha256 ?? null,
    ]
  );
}

export async function guardarDictado(entrada: EntradaDictado) {
  await asegurarColumnasDictado();
  const db = getDb();
  const id = randomUUID();
  const sha = createHash("sha256").update(entrada.texto, "utf8").digest("hex");

  const sessionId = entrada.sessionId?.trim() || null;

  await db.query(
    `INSERT INTO volcado
     (id, texto, sha256, chars, titulo, origen, driver, usuario, estado, fuente, audio_url, audio_bytes, duracion_seg, pulido_aplicado, audio_partes, session_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      id,
      cifrarTexto(entrada.texto),
      sha,
      entrada.texto.length,
      entrada.titulo ?? null,
      "web",
      "dictado",
      entrada.usuario ?? null,
      "archivado",
      "dictado",
      entrada.audioUrl ?? null,
      entrada.audioBytes ?? null,
      entrada.duracionSeg ?? null,
      entrada.pulidoAplicado === true,
      entrada.audioPartes ? JSON.stringify(entrada.audioPartes) : null,
      sessionId,
    ]
  );

  await crearVersion(id, entrada.texto, "transcripcion original del dictado");

  // Si existe sessionId, vincularlo bidireccionalmente y actualizar estado
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

  return { id, sha256: sha, chars: entrada.texto.length, sessionId };
}
