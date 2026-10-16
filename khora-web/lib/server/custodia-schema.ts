import { asegurarColumnasDictado } from "./dictado";
import { getDb } from "./neon";
let ready: Promise<void> | undefined;
export async function asegurarCustodiaContinua() {
  if (!ready) ready = (async () => {
    await asegurarColumnasDictado(); const db = getDb();
    await db.query(`ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS custodia_owner TEXT;
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_text TEXT;
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_sha256 TEXT;
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_usuario TEXT;
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_en TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS dictado_checkpoint (revision_id UUID PRIMARY KEY,session_id TEXT NOT NULL REFERENCES dictado_session(session_id),usuario TEXT NOT NULL,client_at BIGINT NOT NULL,texto TEXT NOT NULL,sha256 TEXT NOT NULL,snapshot TEXT NOT NULL,creado_en TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS dictado_checkpoint_owner_idx ON dictado_checkpoint(usuario,creado_en DESC);
CREATE INDEX IF NOT EXISTS dictado_checkpoint_session_idx ON dictado_checkpoint(session_id,client_at DESC);
CREATE TABLE IF NOT EXISTS dictado_mp3 (session_id TEXT PRIMARY KEY REFERENCES dictado_session(session_id),estado TEXT NOT NULL DEFAULT 'pendiente',source_sha256 TEXT,blob_url TEXT,sha256 TEXT,bytes BIGINT,duracion_seg DOUBLE PRECISION,intentos INTEGER NOT NULL DEFAULT 0,lease_until TIMESTAMPTZ,ultimo_error TEXT,actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now());
-- Additive: never delete captures, source audio, snapshots or derived revisions.
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS lease_id UUID;
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS source_manifest TEXT;
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS source_parts INTEGER;
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS captura_completa BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS siguiente_intento TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS dictado_mp3_historial (
 id UUID PRIMARY KEY, session_id TEXT NOT NULL REFERENCES dictado_session(session_id),
 source_manifest TEXT NOT NULL, source_parts INTEGER NOT NULL, captura_completa BOOLEAN NOT NULL,
 blob_url TEXT NOT NULL, sha256 TEXT NOT NULL, bytes BIGINT NOT NULL, duracion_seg DOUBLE PRECISION NOT NULL,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(session_id, source_manifest)
);
CREATE TABLE IF NOT EXISTS dictado_custodia_trabajo (
 clave TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES dictado_session(session_id),
 usuario TEXT NOT NULL, tipo TEXT NOT NULL CHECK(tipo IN ('titulo','espejo')),
 payload TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente', intentos INTEGER NOT NULL DEFAULT 0,
 lease_id UUID, lease_until TIMESTAMPTZ, siguiente_intento TIMESTAMPTZ NOT NULL DEFAULT now(),
 ultimo_error TEXT, resultado TEXT, creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dictado_custodia_due_idx ON dictado_custodia_trabajo(usuario,siguiente_intento) WHERE estado <> 'completo';
`);
  })().catch(e => { ready = undefined; throw e; });
  await ready;
}

export async function reclamarSesion(sessionId:string,email:string) {
  if(!/^[0-9a-f-]{36}$/i.test(sessionId))throw new Error("session_id_invalido");
  await asegurarCustodiaContinua();
  const r=await getDb().query(`INSERT INTO dictado_session(session_id,estado,custodia_owner) VALUES($1,'uploading',$2) ON CONFLICT(session_id) DO UPDATE SET custodia_owner=COALESCE(dictado_session.custodia_owner,dictado_session.checkpoint_usuario,EXCLUDED.custodia_owner) WHERE COALESCE(dictado_session.custodia_owner,dictado_session.checkpoint_usuario,(SELECT usuario FROM volcado WHERE id=dictado_session.volcado_id),EXCLUDED.custodia_owner)=$2 RETURNING session_id`,[sessionId,email]);
  if(!r.rows.length)throw new Error("sesion_ajena");
}
