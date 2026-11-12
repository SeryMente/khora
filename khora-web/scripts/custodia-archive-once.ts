import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { descifrarBytes, descifrarTexto } from "../lib/server/cripto";
import { getDb } from "../lib/server/neon";
import { describeStoredObject, fetchStoredObject, inspectB2ReadOnly } from "../lib/server/object-storage";
import { reclamarSesion } from "../lib/server/custodia-schema";
import { guardarDictado, type AudioParte } from "../lib/server/dictado";
import { generarTituloDeUltimoRecurso } from "../lib/server/titulos";

const CUTOFF = "2026-11-12T00:00:00.000Z";
const EXPECTED = { sessions: 95, pending: 79, linked: 16, unowned: 87, otherOwners: 6 };
const EXPECTED_BLOBS = {
  control: "72d441e6bc2a25d15166d22d20c1261eb17d2efe",
  archiveAuthorization: "df972b836f06cbd475e7d8d10782d1796f0c646e",
  recoveryInstruction: "829929da20a6dd7efc03d580c80a95b5f1d2cca1",
  b2Authorization: "4f3abd8e4b2912062d3e87b9b66402bf4adf5d6d",
};
const MODE = process.env.CUSTODIA_ARCHIVE_MODE || "audit";

type Snapshot = {
  sessionId?: string;
  texto?: string;
  parcial?: string;
  titulo?: string;
  fuenteEntrada?: string;
  duracionSeg?: number;
  audioPartes?: unknown[];
  estadoTranscripcion?: string | null;
  pulidoAplicado?: boolean;
  [key: string]: unknown;
};

type SessionRow = {
  session_id: string;
  estado: string;
  creado_en: string;
  total_partes: number | null;
  duracion_seg: number | null;
  checkpoint_text: string | null;
  checkpoint_sha256: string | null;
  checkpoint_text_cipher: string | null;
  checkpoint_row_sha256: string | null;
  snapshot_cipher: string | null;
  checkpoint_revision_id: string | null;
  checkpoint_client_at: number | null;
};

type AudioRow = {
  session_id: string;
  part_index: number;
  blob_url: string;
  blob_path: string | null;
  bytes: number;
  sha256: string;
  fuente_audio: string;
  original_name: string | null;
  mime_type: string | null;
  start_ms: number | null;
  end_ms: number | null;
  duracion_ms: number | null;
  estado_verificacion: string;
};

const summary: Record<string, number> = {
  historicalPending: 0,
  historicalAlreadyLinked: 0,
  liveSessionsExcluded: 0,
  archived: 0,
  idempotent: 0,
  readbackVerified: 0,
  candidateTextOnly: 0,
  candidateB2: 0,
  skippedEmptyText: 0,
  skippedPartialOrConflict: 0,
  skippedNoCheckpoint: 0,
  skippedBadHash: 0,
  skippedDialogo: 0,
  skippedBlobLegacy: 0,
  skippedUnknownProvider: 0,
  skippedB2Gap: 0,
  skippedB2Manifest: 0,
  skippedB2Readback: 0,
  skippedStateOrOwner: 0,
  failed: 0,
  b2ObjectsReadback: 0,
};

function fail(reason: string): never {
  throw new Error(reason);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(value: Buffer): string {
  return createHash("sha1")
    .update("blob " + value.length + "\0")
    .update(value)
    .digest("hex");
}

function fingerprint(sessionId: string): string {
  return sha256(sessionId).slice(0, 12);
}

function canonicalPart(part: any) {
  const rawSource = String(part?.fuenteAudio ?? part?.fuente_audio ?? "");
  const fuenteAudio =
    rawSource === "audio_archivo" ? "audio_archivo" :
    rawSource === "chrome_tab" ? "chrome_tab" : "microphone";
  const name = String(part?.nombreOriginal ?? part?.original_name ?? "").trim();
  const mime = String(part?.mimeType ?? part?.mime_type ?? "").trim().toLowerCase();
  return {
    parte: Number(part?.parte ?? part?.part_index),
    bytes: Number(part?.bytes),
    sha256: String(part?.sha256 ?? "").trim().toLowerCase(),
    fuenteAudio,
    nombreOriginal: name || null,
    mimeType: mime || null,
    start_ms: part?.start_ms ?? part?.startMs ?? null,
    end_ms: part?.end_ms ?? part?.endMs ?? null,
    duracion_ms: part?.duracion_ms ?? part?.duracionMs ?? null,
  };
}

function signature(parts: any[]): string {
  return JSON.stringify(parts.map(canonicalPart).sort((a, b) => a.parte - b.parte));
}

function parseSnapshot(cipher: string | null): Snapshot | null {
  if (!cipher) return null;
  const parsed = JSON.parse(descifrarTexto(cipher));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("snapshot_invalid");
  return parsed as Snapshot;
}

async function assertAuthorization() {
  const root = resolve(process.cwd(), "..");
  const paths = {
    control: resolve(root, "frentes/custodia/CONTROL-RESPONSABILIDAD.json"),
    archive: resolve(root, "frentes/custodia/originales/INSTRUCCION-AUTORIZACION-ARCHIVO-PRODUCTION-20261110.md"),
    recovery: resolve(root, "frentes/custodia/originales/INSTRUCCION-ARCHIVO-RECUPERABILIDAD-20261110.md"),
    b2: resolve(root, "frentes/custodia/originales/INSTRUCCION-B2-KHORA-Y-BACKFILL-BLOB-20261109.md"),
  };
  const [controlBytes, archiveBytes, recoveryBytes, b2Bytes] = await Promise.all([
    readFile(paths.control), readFile(paths.archive), readFile(paths.recovery), readFile(paths.b2),
  ]);
  const hashes = {
    control: gitBlobSha1(controlBytes),
    archiveAuthorization: gitBlobSha1(archiveBytes),
    recoveryInstruction: gitBlobSha1(recoveryBytes),
    b2Authorization: gitBlobSha1(b2Bytes),
  };
  for (const key of Object.keys(EXPECTED_BLOBS) as (keyof typeof EXPECTED_BLOBS)[]) {
    if (hashes[key] !== EXPECTED_BLOBS[key]) fail("authorization_document_hash_mismatch");
  }

  const control = JSON.parse(controlBytes.toString("utf8"));
  if (control.generation !== 11) fail("control_generation_mismatch");
  const auth = control.authorization_addenda?.find((x: any) => x.event === "CUSTODIA-ARCHIVE-AUTH-20261110");
  const b2Auth = control.authorization_addenda?.find((x: any) => x.event === "CUSTODIA-B2-KHORA-20261109-01a1c28e-d442-7297-911a-c7b0b5da5be1");
  if (!auth || !b2Auth) fail("authorization_addendum_missing");
  if (auth.original?.path !== "frentes/custodia/originales/INSTRUCCION-AUTORIZACION-ARCHIVO-PRODUCTION-20261110.md") fail("archive_authorization_reference_mismatch");
  if (b2Auth.original?.blob_sha !== EXPECTED_BLOBS.b2Authorization) fail("b2_authorization_reference_mismatch");

  const archiveText = archiveBytes.toString("utf8");
  const recoveryText = recoveryBytes.toString("utf8");
  if (!archiveText.includes("Si tienes las autorizaciones que necesias.")) fail("operator_authorization_literal_missing");
  if (!archiveText.includes("Neon Production") || !archiveText.includes("216 fragmentos")) fail("archive_authorization_scope_missing");
  if (!recoveryText.includes("ARCHIVAR TODOS LOS REGISTROS") ||
      !recoveryText.includes("Audio: No localizado") ||
      !recoveryText.includes("Procedencia: No verificada")) fail("recovery_instruction_scope_missing");
}

async function resolveOwner(db: ReturnType<typeof getDb>): Promise<string> {
  const ownership = await db.query(
    "WITH own AS (" +
    " SELECT s.session_id,s.volcado_id,COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario) owner_email" +
    " FROM public.dictado_session s LEFT JOIN public.volcado v ON v.id=s.volcado_id" +
    " WHERE s.creado_en < $4::timestamptz" +
    "), stats AS (" +
    " SELECT owner_email,count(*)::int sessions," +
    " count(*) FILTER(WHERE volcado_id IS NULL)::int pending," +
    " count(*) FILTER(WHERE volcado_id IS NOT NULL)::int linked" +
    " FROM own WHERE owner_email IS NOT NULL GROUP BY owner_email" +
    "), token_stats AS (" +
    " SELECT usuario," +
    " count(*) FILTER(WHERE expira_en>NOW() AND rotado_a IS NULL AND scope ~ '(^|[[:space:]])volcados:read([[:space:]]|$)')::int active_read," +
    " count(*) FILTER(WHERE expira_en>NOW() AND rotado_a IS NULL AND scope ~* '(dictado:write|custodia:|volcados:write)')::int active_write" +
    " FROM public.oauth_refresh_tokens GROUP BY usuario" +
    ")" +
    " SELECT s.owner_email,s.sessions,s.pending,s.linked,t.active_read,t.active_write" +
    " FROM stats s JOIN token_stats t ON t.usuario=s.owner_email" +
    " WHERE s.sessions=$1 AND s.pending=$2 AND s.linked=$3 AND t.active_read>0 AND t.active_write=0",
    [EXPECTED.sessions, EXPECTED.pending, EXPECTED.linked, CUTOFF]
  );
  if (ownership.rows.length !== 1) fail("owner_identity_not_unambiguous");

  const exclusions = await db.query(
    "WITH own AS (" +
    " SELECT s.session_id,s.volcado_id,COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario) owner_email" +
    " FROM public.dictado_session s LEFT JOIN public.volcado v ON v.id=s.volcado_id" +
    " WHERE s.creado_en < $1::timestamptz" +
    ")" +
    " SELECT count(*) FILTER(WHERE owner_email IS NULL)::int unowned," +
    " count(*) FILTER(WHERE owner_email IS NOT NULL AND owner_email<>$2)::int other_owners," +
    " count(*)::int total FROM own",
    [CUTOFF, ownership.rows[0].owner_email]
  );
  if (Number(exclusions.rows[0]?.unowned) !== EXPECTED.unowned ||
      Number(exclusions.rows[0]?.other_owners) !== EXPECTED.otherOwners ||
      Number(exclusions.rows[0]?.total) !== EXPECTED.sessions + EXPECTED.unowned + EXPECTED.otherOwners) {
    fail("ownership_exclusions_changed");
  }

  const live = await db.query(
    "SELECT count(*)::int AS sessions," +
    " count(*) FILTER(WHERE volcado_id IS NULL)::int AS pending" +
    " FROM (" +
    " SELECT s.session_id,s.volcado_id,COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario) owner_email" +
    " FROM public.dictado_session s LEFT JOIN public.volcado v ON v.id=s.volcado_id" +
    " WHERE s.creado_en >= $1::timestamptz" +
    ") x WHERE owner_email=$2",
    [CUTOFF, ownership.rows[0].owner_email]
  );
  summary.liveSessionsExcluded = Number(live.rows[0]?.sessions ?? 0);
  summary.historicalPending = EXPECTED.pending;
  summary.historicalAlreadyLinked = EXPECTED.linked;
  return String(ownership.rows[0].owner_email);
}

async function readbackAudio(rows: AudioRow[]): Promise<AudioParte[]> {
  const result: AudioParte[] = [];
  for (const row of rows) {
    if (row.estado_verificacion !== "verificado") fail("audio_metadata_not_verified");
    if (!Number.isSafeInteger(Number(row.bytes)) || Number(row.bytes) <= 0) fail("audio_bytes_invalid");
    if (!/^[0-9a-f]{64}$/i.test(String(row.sha256 ?? ""))) fail("audio_sha256_invalid");
    if (describeStoredObject(String(row.blob_url)).storage_provider !== "backblaze_b2") fail("audio_provider_not_b2");

    const response = await fetchStoredObject(String(row.blob_url));
    if (!response.ok) fail("b2_readback_http_failure");
    const encrypted = Buffer.from(await response.arrayBuffer());
    if (encrypted.length < 32 || encrypted.subarray(0, 4).toString("ascii") !== "KHC1") fail("b2_envelope_invalid");

    const plaintext = descifrarBytes(encrypted);
    const digest = sha256(plaintext);
    if (plaintext.length !== Number(row.bytes) || digest !== String(row.sha256).trim().toLowerCase()) {
      fail("b2_readback_integrity_mismatch");
    }

    const rawSource = String(row.fuente_audio ?? "");
    const source = rawSource === "audio_archivo" ? "audio_archivo" :
      rawSource === "chrome_tab" ? "chrome_tab" : "microphone";
    result.push({
      parte: Number(row.part_index),
      url: String(row.blob_url),
      path: row.blob_path ?? undefined,
      bytes: plaintext.length,
      sha256: digest,
      fuenteAudio: source,
      nombreOriginal: row.original_name ?? null,
      mimeType: row.mime_type ?? null,
      start_ms: row.start_ms ?? undefined,
      end_ms: row.end_ms ?? undefined,
      duracion_ms: row.duracion_ms ?? undefined,
      estadoVerificacion: "verificado",
      verificado: true,
    });
  }
  return result.sort((a, b) => a.parte - b.parte);
}

async function verifyWritten(
  db: ReturnType<typeof getDb>,
  id: string,
  sessionId: string,
  ownerEmail: string,
  textValue: string,
  parts: AudioParte[],
): Promise<boolean> {
  const r = await db.query(
    "SELECT v.id::text id,v.texto,v.sha256,v.chars,v.usuario,v.session_id," +
    " v.audio_partes,s.volcado_id::text linked_id,s.estado session_state," +
    " (SELECT count(*)::int FROM public.dictado_audio_parte p WHERE p.session_id=s.session_id) manifest_count," +
    " (SELECT count(*)::int FROM public.dictado_audio_parte p WHERE p.session_id=s.session_id AND p.volcado_id=v.id) linked_parts" +
    " FROM public.volcado v JOIN public.dictado_session s ON s.session_id=v.session_id" +
    " WHERE v.id=$1::uuid AND s.session_id=$2",
    [id, sessionId]
  );
  if (r.rows.length !== 1) return false;
  const row = r.rows[0];
  const clear = descifrarTexto(String(row.texto ?? ""));
  if (clear !== textValue) return false;
  if (String(row.sha256).trim().toLowerCase() !== sha256(textValue)) return false;
  if (Number(row.chars) !== textValue.length) return false;
  if (row.usuario !== ownerEmail || row.session_id !== sessionId) return false;
  if (row.linked_id !== id || row.session_state !== "complete") return false;
  if (Number(row.manifest_count) !== parts.length || Number(row.linked_parts) !== parts.length) return false;
  const stored = Array.isArray(row.audio_partes) ? row.audio_partes : [];
  return signature(stored) === signature(parts);
}

async function main() {
  if (MODE !== "audit" && MODE !== "execute") fail("invalid_mode");
  await assertAuthorization();

  const required = [
    "DATABASE_URL",
    "X_KHORA_KEY",
    "KHORA_OBJECT_STORAGE",
    "KHORA_B2_MASTER_APPLICATION_KEY_ID",
    "KHORA_B2_MASTER_APPLICATION_KEY",
    "KHORA_B2_BUCKET_NAME",
    "KHORA_B2_BUCKET_ID",
  ];
  if (required.some((name) => !process.env[name])) fail("production_runtime_environment_incomplete");
  if (process.env.KHORA_OBJECT_STORAGE !== "b2") fail("b2_not_selected");

  const b2 = await inspectB2ReadOnly();
  if (!b2.accountVerified || !b2.masterKeyVerified || !b2.bucketVerified || !b2.bucketPrivate || !b2.sseB2) {
    fail("b2_readonly_preflight_failed");
  }

  const db = getDb();
  try {
    const ownerEmail = await resolveOwner(db);
    const rows = await db.query(
      "SELECT s.session_id,s.estado,s.creado_en,s.total_partes,s.duracion_seg,s.checkpoint_text,s.checkpoint_sha256," +
      " cp.revision_id::text checkpoint_revision_id,cp.client_at checkpoint_client_at," +
      " cp.texto checkpoint_text_cipher,cp.sha256 checkpoint_row_sha256,cp.snapshot snapshot_cipher" +
      " FROM public.dictado_session s" +
      " LEFT JOIN public.volcado v ON v.id=s.volcado_id" +
      " LEFT JOIN LATERAL (" +
      "  SELECT revision_id,client_at,texto,sha256,snapshot FROM public.dictado_checkpoint" +
      "  WHERE session_id=s.session_id AND usuario=$1 ORDER BY client_at DESC,creado_en DESC LIMIT 1" +
      " ) cp ON true" +
      " WHERE COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$1" +
      " AND s.volcado_id IS NULL AND s.creado_en < $2::timestamptz" +
      " ORDER BY s.actualizado_en ASC,s.session_id ASC",
      [ownerEmail, CUTOFF]
    );
    const sessions = rows.rows as SessionRow[];
    if (sessions.length !== EXPECTED.pending) fail("historical_pending_universe_changed");

    const sessionIds = sessions.map((s) => s.session_id);
    const partRows = await db.query(
      "SELECT session_id,part_index,blob_url,blob_path,bytes,sha256,fuente_audio,original_name,mime_type," +
      " start_ms,end_ms,duracion_ms,estado_verificacion" +
      " FROM public.dictado_audio_parte WHERE session_id=ANY($1::text[]) ORDER BY session_id,part_index",
      [sessionIds]
    );
    const bySession = new Map<string, AudioRow[]>();
    for (const p of partRows.rows as AudioRow[]) {
      const list = bySession.get(p.session_id) ?? [];
      list.push(p);
      bySession.set(p.session_id, list);
    }

    for (const session of sessions) {
      const sessionId = String(session.session_id);
      const short = fingerprint(sessionId);
      if (!/^[0-9a-f-]{36}$/i.test(sessionId) || session.estado === "complete") {
        summary.skippedStateOrOwner++;
        continue;
      }

      const audioRows = (bySession.get(sessionId) ?? []).sort((a, b) => Number(a.part_index) - Number(b.part_index));
      let snapshot: Snapshot | null = null;
      let sessionText: string | null = null;
      let revisionText: string | null = null;
      try {
        if (session.checkpoint_text) sessionText = descifrarTexto(session.checkpoint_text);
        if (session.checkpoint_text_cipher) revisionText = descifrarTexto(session.checkpoint_text_cipher);
        snapshot = parseSnapshot(session.snapshot_cipher);
      } catch {
        summary.skippedNoCheckpoint++;
        continue;
      }

      const textValues = [sessionText, revisionText, typeof snapshot?.texto === "string" ? snapshot.texto : null]
        .filter((value): value is string => value !== null);
      if (!textValues.length) {
        summary.skippedNoCheckpoint++;
        continue;
      }
      if (textValues.some((value) => value !== textValues[0])) {
        summary.skippedPartialOrConflict++;
        continue;
      }
      const textValue = textValues[0];
      const hashes = [session.checkpoint_sha256, session.checkpoint_row_sha256]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim().toLowerCase());
      if (new Set(hashes).size > 1 || hashes.some((value) => value !== sha256(textValue))) {
        summary.skippedBadHash++;
        continue;
      }
      if (snapshot?.sessionId && snapshot.sessionId !== sessionId) {
        summary.skippedPartialOrConflict++;
        continue;
      }
      if (!textValue.trim() && audioRows.length === 0) {
        summary.skippedEmptyText++;
        continue;
      }

      let parts: AudioParte[] = [];
      let audioBytes = 0;
      let source: "texto" | "microfono" | "chrome_live_caption" | "audio_archivo" | null = null;

      if (audioRows.length > 0) {
        const indices = audioRows.map((p) => Number(p.part_index));
        if (indices.some((value, index) => value !== index + 1) ||
            (session.total_partes !== null && Number(session.total_partes) !== audioRows.length)) {
          summary.skippedB2Gap++;
          continue;
        }
        const providerKinds = new Set(audioRows.map((p) => describeStoredObject(String(p.blob_url)).storage_provider));
        if (providerKinds.size !== 1) {
          summary.skippedUnknownProvider++;
          continue;
        }
        const provider = [...providerKinds][0];
        if (provider !== "backblaze_b2") {
          if (provider === "vercel_blob_legacy") summary.skippedBlobLegacy++;
          else summary.skippedUnknownProvider++;
          continue;
        }
        if (Array.isArray(snapshot?.audioPartes) && snapshot!.audioPartes!.length > 0 &&
            signature(snapshot!.audioPartes!) !== signature(audioRows)) {
          summary.skippedB2Manifest++;
          continue;
        }
        try {
          parts = await readbackAudio(audioRows);
          summary.b2ObjectsReadback += parts.length;
        } catch {
          summary.skippedB2Readback++;
          console.log(JSON.stringify({ event: "custodia_b2_readback_failed", session: short }));
          continue;
        }
        audioBytes = parts.reduce((sum, p) => sum + Number(p.bytes), 0);
        if (parts.every((p) => p.fuenteAudio === "audio_archivo")) source = "audio_archivo";
        else if (parts.some((p) => p.fuenteAudio === "chrome_tab")) source = "chrome_live_caption";
        else source = "microfono";
        summary.candidateB2++;
      } else {
        const declared = String(snapshot?.fuenteEntrada ?? "");
        if (declared === "texto") source = "texto";
        else if (declared === "dialogo") {
          summary.skippedDialogo++;
          continue;
        } else {
          // Text retained, audio absent. Null source records dictation provenance as unverified.
          source = null;
        }
        summary.candidateTextOnly++;
      }

      if (MODE === "audit") {
        console.log(JSON.stringify({
          event: "custodia_archive_candidate",
          session: short,
          source: source ?? "dictado_unverified_source",
          audioParts: parts.length,
          chars: textValue.length,
          checkpointRevision: session.checkpoint_revision_id ? 1 : 0,
        }));
        continue;
      }

      const title = typeof snapshot?.titulo === "string" && snapshot.titulo.trim()
        ? snapshot.titulo.trim() : generarTituloDeUltimoRecurso(textValue);
      const duration = Number(snapshot?.duracionSeg ?? session.duracion_seg ?? 0);
      const input = {
        texto: textValue,
        sessionId,
        titulo: title,
        tituloAutomatico: false,
        audioUrl: null,
        audioBytes: parts.length ? audioBytes : null,
        duracionSeg: Number.isFinite(duration) && duration > 0 ? duration : null,
        pulidoAplicado: snapshot?.pulidoAplicado === true,
        usuario: ownerEmail,
        audioPartes: parts.length ? parts : null,
        fuenteEntrada: source,
        estadoTranscripcion: typeof snapshot?.estadoTranscripcion === "string"
          ? snapshot.estadoTranscripcion
          : parts.length ? "recuperado_con_audio_original" : "audio_no_localizado_procedencia_no_verificada",
      };

      try {
        await reclamarSesion(sessionId, ownerEmail);
        const saved = await guardarDictado(input);
        const verified = await verifyWritten(db, saved.id, sessionId, ownerEmail, textValue, parts);
        if (!verified) {
          summary.failed++;
          console.log(JSON.stringify({ event: "custodia_archive_readback_failed", session: short }));
          continue;
        }
        if (saved.idempotent) summary.idempotent++;
        else summary.archived++;
        summary.readbackVerified++;
        console.log(JSON.stringify({
          event: "custodia_archive_session_verified",
          session: short,
          audioParts: parts.length,
          chars: textValue.length,
          idempotent: saved.idempotent === true,
        }));
      } catch {
        summary.failed++;
        console.log(JSON.stringify({ event: "custodia_archive_session_failed", session: short }));
      }
    }

    console.log(JSON.stringify({
      event: "custodia_archive_summary",
      mode: MODE,
      cutoff: CUTOFF,
      ownerScope: "derived_from_neon_owner_columns_and_existing_oauth_read_scope",
      b2Preflight: "PASS",
      ...summary,
    }));
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main().catch(() => {
  console.error(JSON.stringify({ event: "custodia_archive_abort", reason: "authorization_or_integrity_gate_failed" }));
  process.exitCode = 1;
});
