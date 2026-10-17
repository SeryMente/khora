import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import { asegurarCustodiaContinua } from "@/lib/server/custodia-schema";
import { cifrarTexto, descifrarTexto } from "@/lib/server/cripto";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { catalogoRecuperacion, recuperarCheckpoint } from "@/lib/server/custodia-recuperacion";
import { evaluarCustodiaAudio } from "@/lib/audio/custodia";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Snapshot = z.object({ sessionId: z.string().uuid(), revisionId: z.string().uuid().optional(), clientAt: z.number().int().nonnegative().optional(), texto: z.string().max(2_000_000), parcial: z.string().max(100_000).default(""), titulo: z.string().max(500).default(""), fuenteEntrada: z.enum(["texto","microfono","chrome_live_caption","audio_archivo"]).default("texto"), duracionSeg: z.number().nonnegative().default(0), audioPartes: z.array(z.unknown()).max(10000).default([]), corteAudio:z.object({hastaParte:z.number().int().positive(),finMs:z.number().nonnegative()}).optional(), recuperadaDe:z.object({sessionId:z.string().uuid(),revisionId:z.string().uuid()}).optional() });
export async function POST(req: NextRequest) {
  const email = (await auth())?.user?.email;
  if (!email) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  if(req.nextUrl.searchParams.get("recover")==="1"){await asegurarCustodiaContinua();return recuperarCheckpoint(req,email);}
  const parsed = Snapshot.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "checkpoint_invalido" }, { status: 400 });
  const s = { ...parsed.data, revisionId: parsed.data.revisionId || randomUUID(), clientAt: parsed.data.clientAt ?? Date.now() };
  const text = s.texto + (s.parcial ? "\n\n" + s.parcial : "");
  const sha = createHash("sha256").update(text).digest("hex");
  await asegurarCustodiaContinua(); const c = await getDb().connect();
  try {
    await c.query("BEGIN");
    await c.query("INSERT INTO dictado_session(session_id,estado,custodia_owner) VALUES($1,'checkpoint',$2) ON CONFLICT(session_id) DO NOTHING", [s.sessionId,email]);
    const owner = await c.query("SELECT s.*,v.usuario AS volcado_usuario FROM dictado_session s LEFT JOIN volcado v ON v.id=s.volcado_id WHERE s.session_id=$1 FOR UPDATE OF s", [s.sessionId]);
    const row = owner.rows[0]; const actual = row?.custodia_owner || row?.checkpoint_usuario || row?.volcado_usuario;
    if (actual && actual !== email) { await c.query("ROLLBACK"); return NextResponse.json({ error: "sesion_ajena" }, { status: 403 }); }
    if (row?.estado === "complete") { await c.query("ROLLBACK"); return NextResponse.json({ error: "sesion_sellada", id: row.volcado_id }, { status: 409 }); }
    if(s.corteAudio){
      const parts=await c.query("SELECT part_index,bytes,sha256,estado_verificacion,end_ms FROM dictado_audio_parte WHERE session_id=$1 AND part_index<=$2 ORDER BY part_index",[s.sessionId,s.corteAudio.hastaParte]);
      if(s.audioPartes.length!==s.corteAudio.hastaParte||!evaluarCustodiaAudio(parts.rows,s.corteAudio.hastaParte).ok||Number(parts.rows.at(-1)?.end_ms)!==s.corteAudio.finMs){await c.query("ROLLBACK");return NextResponse.json({error:"corte_audio_no_verificado"},{status:409});}
    }
    const inserted = await c.query("INSERT INTO dictado_checkpoint(revision_id,session_id,usuario,client_at,texto,sha256,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(revision_id) DO NOTHING RETURNING revision_id", [s.revisionId,s.sessionId,email,s.clientAt,cifrarTexto(text),sha,cifrarTexto(JSON.stringify(s))]);
    if (!inserted.rowCount) {
      const old = await c.query("SELECT session_id,usuario,sha256,snapshot FROM dictado_checkpoint WHERE revision_id=$1", [s.revisionId]);
      if (old.rows[0]?.session_id !== s.sessionId || old.rows[0]?.usuario !== email || old.rows[0]?.sha256 !== sha || descifrarTexto(old.rows[0]?.snapshot || "") !== JSON.stringify(s)) throw new Error("checkpoint_revision_conflict");
    }
    // Every revision is preserved. An out-of-order request cannot replace a newer checkpoint.
    await c.query(`UPDATE dictado_session SET custodia_owner=$2,checkpoint_usuario=$2,checkpoint_text=$3,checkpoint_sha256=$4,checkpoint_en=now(),actualizado_en=now(),estado='checkpoint' WHERE session_id=$1 AND NOT EXISTS(SELECT 1 FROM dictado_checkpoint WHERE session_id=$1 AND client_at>$5)`,[s.sessionId,email,cifrarTexto(text),sha,s.clientAt]);
    await c.query("COMMIT");
    return NextResponse.json({ ok: true, sessionId:s.sessionId, revisionId:s.revisionId, sha256:sha, chars:text.length }, { headers: { "Cache-Control":"no-store" } });
  } catch { await c.query("ROLLBACK").catch(() => undefined); return NextResponse.json({ error:"checkpoint_fallido" },{status:500}); }
  finally { c.release(); }
}
export async function GET(req: NextRequest) {
  const email = (await auth())?.user?.email;
  if (!email) return NextResponse.json({error:"no_autenticado"},{status:401});
  try {
    await asegurarCustodiaContinua();
    if(req.nextUrl.searchParams.get("bootstrap")==="1")return NextResponse.json({owner:email},{headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
    const db=getDb();
    if(req.nextUrl.searchParams.get("catalog")==="1"||req.nextUrl.searchParams.get("revisions")==="1")return catalogoRecuperacion(req,email);
    const requested=req.nextUrl.searchParams.get("sessionId");
    if(requested){const sealed=await db.query("SELECT s.volcado_id FROM dictado_session s LEFT JOIN volcado v ON v.id=s.volcado_id WHERE s.session_id=$1 AND s.estado='complete' AND COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$2",[requested,email]);if(sealed.rows.length)return NextResponse.json({owner:email,sealed:true,id:sealed.rows[0].volcado_id,recovery:null},{headers:{"Cache-Control":"no-store"}});}

    const r=await db.query(`SELECT s.session_id,s.checkpoint_text,s.checkpoint_sha256,s.checkpoint_en,s.actualizado_en,c.snapshot FROM dictado_session s LEFT JOIN LATERAL(SELECT snapshot FROM dictado_checkpoint WHERE session_id=s.session_id AND usuario=$1 ORDER BY client_at DESC,creado_en DESC LIMIT 1)c ON true WHERE COALESCE(s.custodia_owner,s.checkpoint_usuario)=$1 AND s.estado<>'complete' AND ($2::text IS NULL OR s.session_id=$2) ORDER BY COALESCE(s.checkpoint_en::timestamptz,s.actualizado_en) DESC LIMIT 1`,[email,requested]);
    if(!r.rows.length) return NextResponse.json({owner:email,recovery:null},{headers:{"Cache-Control":"no-store"}});
    const row=r.rows[0]; const snapshot=row.snapshot?JSON.parse(descifrarTexto(row.snapshot)):{};
    const texto=row.checkpoint_text?descifrarTexto(row.checkpoint_text):"";
    if(row.checkpoint_sha256 && createHash("sha256").update(texto).digest("hex")!==row.checkpoint_sha256) throw new Error("integridad");
    const parts=await db.query("SELECT part_index AS parte,blob_url AS url,bytes,sha256,fuente_audio AS \"fuenteAudio\",original_name AS \"nombreOriginal\",mime_type AS \"mimeType\",start_ms,end_ms,duracion_ms,(estado_verificacion='verificado') AS verificado FROM dictado_audio_parte WHERE session_id=$1 ORDER BY part_index",[row.session_id]);
    return NextResponse.json({owner:email,recovery:{...snapshot,sessionId:row.session_id,texto:snapshot.texto??texto,parcial:snapshot.parcial??"",sha256:row.checkpoint_sha256,audioPartes:parts.rows,checkpointEn:row.checkpoint_en}},{headers:{"Cache-Control":"no-store"}});
  } catch {return NextResponse.json({error:"recovery_fallido"},{status:500});}
}
