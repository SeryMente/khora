import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import { descifrarTexto } from "@/lib/server/cripto";
import { transcribirAudioConGroq } from "@/lib/server/transcribir";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCES = ["microphone", "chrome_tab"] as const;
const MAX_WAV_BYTES = 208044;
const MAX_MULTIPART_BYTES = 256 * 1024;
function invalid(detail: string, status = 400) { return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function POST(request: NextRequest) {
  const owner = (await auth())?.user?.email;
  if (!owner) return invalid("no_autenticado", 401);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_MULTIPART_BYTES) return invalid("ventana_solicitud_demasiado_grande", 413);
  const form = await request.formData().catch(() => null);
  if (!form) return invalid("multipart_invalido");
  const sessionId = String(form.get("sessionId") || "");
  const source = String(form.get("fuente") || "");
  const sequence = Number(form.get("sequence"));
  const startMs = Number(form.get("startMs"));
  const endMs = Number(form.get("endMs"));
  const file = form.get("audio");
  if (!UUID.test(sessionId) || !(SOURCES as readonly string[]).includes(source) ||
      !Number.isSafeInteger(sequence) || sequence < 1 || sequence > 10000 ||
      !Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 ||
      Math.abs(startMs - (sequence - 1) * 6000) > 5 || endMs <= startMs ||
      endMs > startMs + 6500.5 || !(file instanceof Blob)) return invalid("ventana_metadata_invalida");
  if (!file.size || file.size !== MAX_WAV_BYTES) return invalid("ventana_tamano_invalido");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE" ||
      bytes.toString("ascii", 12, 16) !== "fmt " || bytes.readUInt16LE(20) !== 1 ||
      bytes.readUInt16LE(22) !== 1 || bytes.readUInt32LE(24) !== 16000 ||
      bytes.readUInt16LE(34) !== 16 || bytes.toString("ascii", 36, 40) !== "data" ||
      bytes.readUInt32LE(40) !== bytes.length - 44 || bytes.length - 44 !== 208000) return invalid("wav_pcm16k_invalido");

  try {
    const db = getDb();
    const found = await db.query(
      "SELECT c.snapshot FROM dictado_session s LEFT JOIN LATERAL (SELECT snapshot FROM dictado_checkpoint WHERE session_id=s.session_id AND usuario=$2 ORDER BY client_at DESC, creado_en DESC LIMIT 1) c ON true WHERE s.session_id=$1 AND COALESCE(s.custodia_owner,s.checkpoint_usuario)=$2",
      [sessionId, owner],
    );
    if (!found.rows.length) return invalid("sesion_no_disponible", 404);
    const snapshot = JSON.parse(descifrarTexto(String(found.rows[0].snapshot || "")));
    const manifest = snapshot.dialogo;
    if (snapshot.fuenteEntrada !== "dialogo" || manifest?.version !== 1 ||
        !["preparando", "grabando"].includes(manifest.estado)) return invalid("sesion_dialogo_no_activa", 409);

    const result = await transcribirAudioConGroq(bytes, "dialogo-" + source + "-" + sequence + ".wav", {
      verboseJson: true, language: null, preserveVerbatim: true, allowEmpty: true,
      mimeType: "audio/wav", model: "whisper-large-v3",
    });
    if (!result.exito) {
      if (result.statusCode === 429) return NextResponse.json({ detail: "groq_rate_limited" }, {
        status: 429, headers: { "Retry-After": result.retryAfter || "1", "Cache-Control": "no-store" },
      });
      return invalid("transcripcion_temporalmente_no_disponible", 502);
    }
    const segmentos = (result.segmentos || []).filter((segment) =>
      typeof segment.text === "string" && segment.text.trim() &&
      Number.isFinite(segment.start) && Number.isFinite(segment.end) &&
      segment.end >= segment.start && segment.start >= 0 && segment.end <= 6.51
    ).map((segment) => ({
      start_ms: Math.max(startMs, Math.round(startMs + segment.start * 1000)),
      end_ms: Math.min(endMs, Math.round(startMs + segment.end * 1000)),
      texto: segment.text.trim(),
    })).filter((segment) => segment.end_ms >= segment.start_ms);
    return NextResponse.json({ fuente: source, sequence, segmentos, modelo: "whisper-large-v3" }, {
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  } catch {
    return invalid("dialogo_live_fallido", 503);
  }
}
