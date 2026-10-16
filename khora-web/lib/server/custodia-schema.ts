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
CREATE TABLE IF NOT EXISTS dictado_mp3 (session_id TEXT PRIMARY KEY REFERENCES dictado_session(session_id),estado TEXT NOT NULL DEFAULT 'pendiente',source_sha256 TEXT,blob_url TEXT,sha256 TEXT,bytes BIGINT,duracion_seg DOUBLE PRECISION,intentos INTEGER NOT NULL DEFAULT 0,lease_until TIMESTAMPTZ,ultimo_error TEXT,actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now());`);
  })().catch(e => { ready = undefined; throw e; });
  await ready;
}

export async function reclamarSesion(sessionId:string,email:string) {
  if(!/^[0-9a-f-]{36}$/i.test(sessionId))throw new Error("session_id_invalido");
  await asegurarCustodiaContinua();
  const r=await getDb().query(`INSERT INTO dictado_session(session_id,estado,custodia_owner) VALUES($1,'uploading',$2) ON CONFLICT(session_id) DO UPDATE SET custodia_owner=COALESCE(dictado_session.custodia_owner,dictado_session.checkpoint_usuario,EXCLUDED.custodia_owner) WHERE COALESCE(dictado_session.custodia_owner,dictado_session.checkpoint_usuario,(SELECT usuario FROM volcado WHERE id=dictado_session.volcado_id),EXCLUDED.custodia_owner)=$2 RETURNING session_id`,[sessionId,email]);
  if(!r.rows.length)throw new Error("sesion_ajena");
}
