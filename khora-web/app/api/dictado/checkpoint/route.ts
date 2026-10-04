import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import { asegurarColumnasDictado } from "@/lib/server/dictado";
import { cifrarTexto, descifrarTexto } from "@/lib/server/cripto";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureCheckpointColumns() {
  await asegurarColumnasDictado();
  const db = getDb();
  await db.query("ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_text TEXT");
  await db.query("ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_sha256 TEXT");
  await db.query("ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_usuario TEXT");
  await db.query("ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_en TEXT");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email ? String(session.user.email) : "";
  if (!email) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  try {
    await ensureCheckpointColumns();
    const body = await req.json();
    const sessionId = String(body?.sessionId ?? "").trim();
    const texto = String(body?.texto ?? "");
    if (!sessionId || !texto.trim()) return NextResponse.json({ error: "checkpoint_invalido" }, { status: 400 });
    const sha = createHash("sha256").update(texto, "utf8").digest("hex");
    await getDb().query(
      "INSERT INTO dictado_session (session_id, estado, checkpoint_text, checkpoint_sha256, checkpoint_usuario, checkpoint_en, actualizado_en) VALUES ($1,'checkpoint',$2,$3,$4,NOW(),NOW()) ON CONFLICT (session_id) DO UPDATE SET checkpoint_text=EXCLUDED.checkpoint_text, checkpoint_sha256=EXCLUDED.checkpoint_sha256, checkpoint_usuario=EXCLUDED.checkpoint_usuario, checkpoint_en=NOW(), actualizado_en=NOW(), estado=CASE WHEN dictado_session.estado='complete' THEN dictado_session.estado ELSE 'checkpoint' END",
      [sessionId, cifrarTexto(texto), sha, email],
    );
    return NextResponse.json({ ok: true, sessionId, sha256: sha, chars: texto.length });
  } catch (error) {
    return NextResponse.json({ error: "checkpoint_fallido", detail: String(error) }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  const email = session?.user?.email ? String(session.user.email) : "";
  if (!email) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  try {
    await ensureCheckpointColumns();
    const res = await getDb().query(
      "SELECT session_id, checkpoint_text, checkpoint_sha256, checkpoint_en, actualizado_en FROM dictado_session WHERE checkpoint_usuario=$1 AND estado <> 'complete' AND checkpoint_text IS NOT NULL ORDER BY COALESCE(checkpoint_en, actualizado_en) DESC LIMIT 1",
      [email],
    );
    if (!res.rows.length) return NextResponse.json({ recovery: null });
    const row = res.rows[0];
    const texto = descifrarTexto(String(row.checkpoint_text));
    const sha = createHash("sha256").update(texto, "utf8").digest("hex");
    if (sha !== String(row.checkpoint_sha256)) return NextResponse.json({ error: "checkpoint_integridad_rota" }, { status: 409 });
    return NextResponse.json({ recovery: { sessionId: row.session_id, texto, sha256: sha, checkpointEn: row.checkpoint_en, actualizadoEn: row.actualizado_en } });
  } catch (error) {
    return NextResponse.json({ error: "recovery_fallido", detail: String(error) }, { status: 500 });
  }
}