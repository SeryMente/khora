import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getMcpReadOnlyDb } from "./mcp-db";
import { descifrarTexto } from "./cripto";
import { leerBlobVerificado } from "./audio-mp3";

type Db = { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> };
type CursorKind = "catalog" | "revisions";
type CursorPayload = {
  v: 1;
  kind: CursorKind;
  actor: string;
  sessionId?: string;
  fingerprint: string;
  activity?: string;
  sessionCursor?: string;
  savedAt?: string;
  revisionId?: string;
};
type Manifest = {
  status: "DECLARED" | "LEGACY_INFERRED" | "INVALID" | "UNREADABLE" | "NOT_DECLARED";
  declaredParts: number | null;
  source: string;
};
const PAGE = 20;
const MAX = 100;
const MAX_INTEGRITY_PAGE = 50;
const MAX_PART_METADATA_ROWS = 10000;
const MAX_DECLARED_PARTS = 2147483647;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/i;
const ARCHIVE = "LEFT JOIN LATERAL (" +
  " SELECT v.id::text AS id, v.folio::text AS folio, v.usuario" +
  " FROM volcado v WHERE v.id=s.volcado_id OR v.session_id=s.session_id" +
  " ORDER BY (v.id=s.volcado_id) DESC, v.id DESC LIMIT 1" +
  ") v ON TRUE";
const OWNER = "COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$1";

function limitOf(value: unknown, fallback = PAGE, maximum = MAX): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error("limite_invalido");
  }
  return value;
}

function afterOf(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > MAX_DECLARED_PARTS) {
    throw new Error("cursor_invalido");
  }
  return value;
}

function cursorSecret(): string {
  const value = process.env.MCP_JWT_SECRET || "";
  if (value.length < 32) throw new Error("custodia_cursor_config_invalid");
  return value;
}

function encodeCursor(payload: CursorPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", cursorSecret()).update(body).digest("base64url");
  return body + "." + signature;
}

function decodeCursor(
  raw: unknown,
  kind: CursorKind,
  actor: string,
  sessionId?: string,
): CursorPayload | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string" || raw.length < 16 || raw.length > 2048) throw new Error("cursor_invalido");
  try {
    const parts = raw.split(".");
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) {
      throw new Error("invalid");
    }
    const expected = createHmac("sha256", cursorSecret()).update(parts[0]).digest();
    const supplied = Buffer.from(parts[1], "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("invalid");
    const value = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as Partial<CursorPayload>;
    if (
      value.v !== 1 ||
      value.kind !== kind ||
      value.actor !== actor ||
      (sessionId !== undefined && value.sessionId !== sessionId) ||
      typeof value.fingerprint !== "string" ||
      !/^[0-9a-f]{32}$/.test(value.fingerprint)
    ) throw new Error("invalid");
    if (kind === "catalog") {
      if (typeof value.activity !== "string" || !Number.isFinite(Date.parse(value.activity)) ||
          typeof value.sessionCursor !== "string" || !value.sessionCursor || value.sessionCursor.length > 200) {
        throw new Error("invalid");
      }
    } else if (typeof value.savedAt !== "string" || !Number.isFinite(Date.parse(value.savedAt)) ||
      typeof value.revisionId !== "string" || !UUID.test(value.revisionId)) {
      throw new Error("invalid");
    }
    return value as CursorPayload;
  } catch (error) {
    if (error instanceof Error && error.message === "custodia_cursor_config_invalid") throw error;
    throw new Error("cursor_invalido");
  }
}

function iso(value: unknown): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function clientIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0 || numeric > 8640000000000000) return null;
  const date = new Date(numeric);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeCount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
}

async function owns(db: Db, actor: string, sessionId: string): Promise<boolean> {
  if (typeof sessionId !== "string" || !sessionId || sessionId.length > 200 || !actor || actor.length > 320) {
    throw new Error("sesion_invalida");
  }
  const result = await db.query(
    "SELECT s.session_id FROM dictado_session s " + ARCHIVE +
    " WHERE s.session_id=$1 AND " + OWNER + " LIMIT 1",
    [sessionId, actor],
  );
  return result.rows.length === 1;
}

function readManifest(snapshotValue: unknown): Manifest {
  if (typeof snapshotValue !== "string" || snapshotValue.length === 0) {
    return { status: "UNREADABLE", declaredParts: null, source: "SNAPSHOT_MISSING" };
  }
  let value: any;
  try {
    const text = descifrarTexto(snapshotValue);
    value = JSON.parse(text);
  } catch {
    return { status: "UNREADABLE", declaredParts: null, source: "SNAPSHOT_DECRYPT_OR_PARSE_FAILED" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { status: "INVALID", declaredParts: null, source: "SNAPSHOT_NOT_OBJECT" };
  }
  if (value.corteAudio !== undefined && value.corteAudio !== null) {
    const raw = value.corteAudio && typeof value.corteAudio === "object" ? value.corteAudio.hastaParte : undefined;
    const count = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_DECLARED_PARTS) {
      return { status: "INVALID", declaredParts: null, source: "corteAudio.hastaParte" };
    }
    return { status: "DECLARED", declaredParts: count, source: "corteAudio.hastaParte" };
  }
  if (Array.isArray(value.audioPartes)) {
    if (value.audioPartes.length > MAX_DECLARED_PARTS) {
      return { status: "INVALID", declaredParts: null, source: "legacy.audioPartes.length" };
    }
    return { status: "LEGACY_INFERRED", declaredParts: value.audioPartes.length, source: "legacy.audioPartes.length" };
  }
  return { status: "NOT_DECLARED", declaredParts: null, source: "NO_PART_MANIFEST" };
}

function revisionPartStats(manifest: Manifest, parts: any[], complete: boolean) {
  const count = manifest.declaredParts;
  if (!complete) {
    return {
      storedParts: null,
      recordedVerifiedParts: null,
      pendingParts: null,
      missingPartsFromTable: null,
      unexpectedStoredParts: null,
      invalidStoredIndexes: null,
      syncStatus: "PART_METADATA_LIMIT_EXCEEDED",
    };
  }
  if (count === null) {
    return {
      storedParts: null,
      recordedVerifiedParts: null,
      pendingParts: null,
      missingPartsFromTable: null,
      unexpectedStoredParts: null,
      invalidStoredIndexes: null,
      syncStatus: "SNAPSHOT_UNVERIFIABLE",
    };
  }
  const valid = parts.filter((part) => Number.isSafeInteger(Number(part.part_index)) && Number(part.part_index) >= 1 && Number(part.part_index) <= count);
  const invalid = parts.filter((part) => !Number.isSafeInteger(Number(part.part_index)) || Number(part.part_index) < 1);
  const extra = parts.filter((part) => Number.isSafeInteger(Number(part.part_index)) && Number(part.part_index) > count);
  const verified = valid.filter((part) => part.estado_verificacion === "verificado").length;
  const pending = valid.length - verified;
  const missing = Math.max(0, count - valid.length);
  let status: string;
  if (invalid.length > 0 || extra.length > 0) status = "UNVERIFIABLE_INDEX_ANOMALY";
  else if (missing > 0) status = "PARTS_MISSING_FROM_TABLE";
  else if (count === 0 && parts.length === 0) status = manifest.status === "DECLARED" ? "NO_AUDIO_DECLARED" : "LEGACY_ZERO_PARTS";
  else if (count === verified) status = "SYNCED_RECORDED_NOT_REVERIFIED";
  else status = "INTEGRITY_PENDING";
  return {
    storedParts: valid.length,
    recordedVerifiedParts: verified,
    pendingParts: pending,
    missingPartsFromTable: missing,
    unexpectedStoredParts: extra.length,
    invalidStoredIndexes: invalid.length,
    syncStatus: status,
  };
}

export async function toolKhoraCustodiaCatalogo(
  actor: string,
  args: { limite?: number; cursor?: string },
  db: Db = getMcpReadOnlyDb(),
) {
  const limit = limitOf(args.limite);
  const cursor = decodeCursor(args.cursor, "catalog", actor);
  const activity = "COALESCE(s.creado_en,to_timestamp(0))";
  const sql =
    "WITH owned AS (" +
    " SELECT s.session_id,s.estado,s.total_partes,s.creado_en,s.actualizado_en,s.cerrado_en," +
    " v.id::text AS volcado_id,v.folio,COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario) AS effective_owner," +
    " " + activity + " AS actividad,lr.revision_id,lr.creado_en AS revision_en,lr.sha256 AS revision_sha256," +
    " rc.total AS revisiones,rc.signature AS revision_signature,pa.total AS partes,pa.verificadas,pa.pendientes,pa.bytes,pa.signature AS part_signature," +
    " m.estado AS mp3_estado,m.captura_completa,m.source_parts,m.actualizado_en AS mp3_en" +
    " FROM dictado_session s " + ARCHIVE +
    " LEFT JOIN LATERAL (" +
    "  SELECT revision_id::text AS revision_id,creado_en,sha256 FROM dictado_checkpoint" +
    "  WHERE session_id=s.session_id AND usuario=$1" +
    "  ORDER BY creado_en DESC,revision_id DESC LIMIT 1" +
    " ) lr ON TRUE" +
    " LEFT JOIN LATERAL (" +
    "  SELECT count(*)::int AS total,md5(COALESCE(string_agg(jsonb_build_array(revision_id,creado_en,client_at,sha256)::text,E'\\n' ORDER BY creado_en DESC,revision_id DESC),'')) AS signature" +
    "  FROM dictado_checkpoint WHERE session_id=s.session_id AND usuario=$1" +
    " ) rc ON TRUE" +
    " LEFT JOIN LATERAL (" +
    "  SELECT count(*)::int AS total,count(*) FILTER(WHERE estado_verificacion='verificado')::int AS verificadas," +
    "   count(*) FILTER(WHERE estado_verificacion IS DISTINCT FROM 'verificado')::int AS pendientes," +
    "   COALESCE(sum(bytes),0)::bigint AS bytes," +
    "   md5(COALESCE(string_agg(jsonb_build_array(part_index,bytes,sha256,estado_verificacion)::text,E'\\n' ORDER BY part_index),'')) AS signature" +
    "  FROM dictado_audio_parte WHERE session_id=s.session_id" +
    " ) pa ON TRUE" +
    " LEFT JOIN dictado_mp3 m ON m.session_id=s.session_id" +
    " WHERE " + OWNER +
    "), summary AS (" +
    " SELECT count(*)::int AS total," +
    " md5(COALESCE(string_agg(jsonb_build_array(session_id,estado,total_partes,creado_en,actualizado_en,cerrado_en,volcado_id,effective_owner," +
    " revisiones,revision_signature,revision_id,revision_sha256,partes,verificadas,pendientes,bytes,part_signature," +
    " mp3_estado,captura_completa,source_parts,mp3_en)::text,E'\\n' ORDER BY session_id),'')) AS fingerprint FROM owned" +
    "), page AS (" +
    " SELECT * FROM owned WHERE ($2::timestamptz IS NULL OR (actividad,session_id)<($2::timestamptz,$3::text))" +
    " ORDER BY actividad DESC,session_id DESC LIMIT $4" +
    ") SELECT summary.total,summary.fingerprint,page.* FROM summary LEFT JOIN page ON TRUE";
  const query = await db.query(sql, [
    actor,
    cursor?.activity ?? null,
    cursor?.sessionCursor ?? null,
    limit + 1,
  ]);
  const meta = query.rows[0] || {};
  const totalItems = safeCount(meta.total) ?? 0;
  const fingerprint = typeof meta.fingerprint === "string" ? meta.fingerprint : "";
  if (!/^[0-9a-f]{32}$/.test(fingerprint)) throw new Error("catalogo_fingerprint_unavailable");
  if (cursor && cursor.fingerprint !== fingerprint) throw new Error("catalogo_cambio_durante_paginacion");
  const allRows = query.rows.filter((row: any) => row.session_id !== null && row.session_id !== undefined);
  const hasMore = allRows.length > limit;
  const rows = allRows.slice(0, limit);
  const last = rows.at(-1);
  const nextCursor = hasMore && last ? encodeCursor({
    v: 1,
    kind: "catalog",
    actor,
    fingerprint,
    activity: iso(last.actividad) || new Date(0).toISOString(),
    sessionCursor: String(last.session_id),
  }) : null;

  return {
    items: rows.map((row: any) => ({
      sessionId: String(row.session_id),
      state: String(row.estado),
      createdAt: iso(row.creado_en),
      updatedAt: iso(row.actualizado_en),
      closedAt: iso(row.cerrado_en),
      archive: row.volcado_id ? { id: String(row.volcado_id), folio: row.folio == null ? null : String(row.folio) } : null,
      latestRevision: row.revision_id ? { revisionId: String(row.revision_id), savedAt: iso(row.revision_en) } : null,
      revisionCount: safeCount(row.revisiones),
      declaredTotalParts: safeCount(row.total_partes),
      audio: {
        storedParts: safeCount(row.partes),
        recordedVerifiedParts: safeCount(row.verificadas),
        pendingParts: safeCount(row.pendientes),
        bytesTotal: row.bytes == null ? "0" : String(row.bytes),
        recordedVerificationSemantics: "estado_verificacion almacenado; no equivale a una nueva lectura del Blob",
      },
      mp3: row.mp3_estado ? {
        state: String(row.mp3_estado),
        captureComplete: row.captura_completa === true,
        sourceParts: safeCount(row.source_parts),
        updatedAt: iso(row.mp3_en),
      } : { state: "NOT_REGISTERED", captureComplete: false, sourceParts: null, updatedAt: null },
    })),
    page: {
      limit,
      totalItems,
      hasMore,
      nextCursor,
      fingerprintPinned: true,
      fingerprintStatus: cursor ? "MATCHED_WITH_PREVIOUS_PAGE" : "BASELINE_CREATED",
      lastPage: !hasMore,
      consumerMustVerify: ["cursor continuity", "unique sessionId count", "aggregated items equals totalItems"],
    },
    universe: {
      ownerRule: "COALESCE(custodia_owner,checkpoint_usuario,linked_archive_owner)=authenticated_actor",
      includes: ["incomplete", "sealed_linked_to_archive", "without_checkpoint", "without_audio_parts"],
      excludes: ["title", "preview", "text", "snapshot", "blob_url", "audio_bytes", "credentials"],
      consistency: "One SQL statement snapshot per page; signed fingerprint detects relevant metadata drift between pages. It does not hold a cross-request database transaction snapshot.",
    },
  };
}

export async function toolKhoraCustodiaRevisiones(
  actor: string,
  args: { session_id: string; limite?: number; cursor?: string },
  db: Db = getMcpReadOnlyDb(),
) {
  const sessionId = args.session_id;
  if (!(await owns(db, actor, sessionId))) throw new Error("sesion_no_encontrada_o_no_autorizada");
  const limit = limitOf(args.limite);
  const cursor = decodeCursor(args.cursor, "revisions", actor, sessionId);
  const sql =
    "WITH revisions AS (" +
    " SELECT revision_id::text,creado_en,client_at,sha256 FROM dictado_checkpoint WHERE session_id=$1 AND usuario=$2" +
    "), summary AS (" +
    " SELECT count(*)::int AS total,md5(COALESCE(string_agg(jsonb_build_array(revision_id,creado_en,client_at,sha256)::text,E'\\n' ORDER BY creado_en DESC,revision_id DESC),'')) AS fingerprint FROM revisions" +
    "), page AS (" +
    " SELECT revision_id::text,creado_en,client_at,snapshot FROM dictado_checkpoint" +
    " WHERE session_id=$1 AND usuario=$2 AND ($3::timestamptz IS NULL OR (creado_en,revision_id)<($3::timestamptz,$4::uuid))" +
    " ORDER BY creado_en DESC,revision_id DESC LIMIT $5" +
    ") SELECT summary.total,summary.fingerprint,page.* FROM summary LEFT JOIN page ON TRUE";
  const [revisionResult, partResult] = await Promise.all([
    db.query(sql, [sessionId, actor, cursor?.savedAt ?? null, cursor?.revisionId ?? null, limit + 1]),
    db.query(
      "SELECT part_index,estado_verificacion,count(*) OVER() AS total_rows FROM dictado_audio_parte WHERE session_id=$1 ORDER BY part_index LIMIT $2",
      [sessionId, MAX_PART_METADATA_ROWS + 1],
    ),
  ]);
  const meta = revisionResult.rows[0] || {};
  const totalItems = safeCount(meta.total) ?? 0;
  const fingerprint = typeof meta.fingerprint === "string" ? meta.fingerprint : "";
  if (!/^[0-9a-f]{32}$/.test(fingerprint)) throw new Error("revisiones_fingerprint_unavailable");
  if (cursor && cursor.fingerprint !== fingerprint) throw new Error("revisiones_cambio_durante_paginacion");
  const rawRows = revisionResult.rows.filter((row: any) => row.revision_id !== null && row.revision_id !== undefined);
  const hasMore = rawRows.length > limit;
  const rows = rawRows.slice(0, limit);
  const last = rows.at(-1);
  const allParts = partResult.rows;
  const partTotal = safeCount(allParts[0]?.total_rows) ?? allParts.length;
  const partMetadataComplete = partTotal <= MAX_PART_METADATA_ROWS;
  const usableParts = partMetadataComplete ? allParts : [];
  const items = rows.map((row: any) => {
    const manifest = readManifest(row.snapshot);
    const stats = revisionPartStats(manifest, usableParts, partMetadataComplete);
    return {
      revisionId: String(row.revision_id),
      savedAt: iso(row.creado_en),
      savedAtSemantics: "hora de persistencia/recepción del servidor",
      clientAt: clientIso(row.client_at),
      clientAtSemantics: "reloj del cliente; no es hora de recepción ni prueba física del evento",
      manifest: { status: manifest.status, source: manifest.source, declaredParts: manifest.declaredParts },
      ...stats,
      recordedVerificationSemantics: "recordedVerifiedParts cuenta filas marcadas verificado; no implica relectura criptográfica actual",
      snapshotContentsReturned: false,
    };
  });
  const nextCursor = hasMore && last ? encodeCursor({
    v: 1,
    kind: "revisions",
    actor,
    sessionId,
    fingerprint,
    savedAt: iso(last.creado_en) || new Date(0).toISOString(),
    revisionId: String(last.revision_id),
  }) : null;
  return {
    sessionId,
    items,
    page: {
      limit,
      totalItems,
      hasMore,
      nextCursor,
      fingerprintPinned: true,
      fingerprintStatus: cursor ? "MATCHED_WITH_PREVIOUS_PAGE" : "BASELINE_CREATED",
      lastPage: !hasMore,
      consumerMustVerify: ["cursor continuity", "unique revisionId count", "aggregated items equals totalItems"],
    },
    partMetadata: {
      rowsObserved: partMetadataComplete ? partTotal : null,
      complete: partMetadataComplete,
      recordedVerificationOnly: true,
      note: partMetadataComplete ? "La clasificación es metadata almacenada, no una lectura Blob actual." : "Se superó el límite de metadata; los contadores se declaran no verificables.",
    },
    excludes: ["title", "preview", "text", "snapshot", "blob_url", "audio_bytes", "credentials"],
  };
}

function integrityReason(code: string): string {
  switch (code) {
    case "audio_integridad_rota": return "SHA256_OR_LENGTH_MISMATCH";
    case "blob_host_no_permitido": return "BLOB_HOST_NOT_ALLOWED";
    case "audio_manifest_invalido": return "METADATA_INVALID";
    case "audio_demasiado_grande": return "OBJECT_EXCEEDS_VERIFICATION_LIMIT";
    case "blob_no_encontrado": return "BLOB_NOT_FOUND";
    case "blob_inaccesible": return "BLOB_ACCESS_UNAVAILABLE_OR_TRANSIENT";
    default: return "BLOB_READ_FAILED_OR_REDIRECT_REJECTED";
  }
}

async function verifyRegisteredPart(
  partIndex: number,
  row: any,
  readBlob: typeof leerBlobVerificado,
) {
  const storedVerificationState = typeof row?.estado_verificacion === "string" ? row.estado_verificacion : null;
  const bytes = safeCount(row?.bytes);
  const sha = typeof row?.sha256 === "string" ? row.sha256.toLowerCase() : null;
  if (typeof row?.blob_url !== "string" || !row.blob_url.trim()) {
    return {
      partIndex,
      registration: "REGISTERED_WITHOUT_BLOB_REFERENCE",
      storedVerificationState,
      expectedBytes: bytes,
      expectedSha256: sha,
      status: "MISSING",
      reason: "BLOB_REFERENCE_MISSING",
      blobRead: "NOT_ATTEMPTED",
    };
  }
  if (bytes === null || bytes <= 0 || !sha || !SHA.test(sha)) {
    return {
      partIndex,
      registration: "REGISTERED",
      storedVerificationState,
      expectedBytes: bytes,
      expectedSha256: sha,
      status: "UNVERIFIABLE",
      reason: "METADATA_INVALID",
      blobRead: "NOT_ATTEMPTED",
    };
  }
  let clear: Buffer | null = null;
  try {
    clear = await readBlob(String(row.blob_url), bytes, sha);
    const actualSha = createHash("sha256").update(clear).digest("hex");
    if (clear.length !== bytes || actualSha !== sha) {
      return {
        partIndex,
        registration: "REGISTERED",
        storedVerificationState,
        expectedBytes: bytes,
        expectedSha256: sha,
        status: "MISMATCH",
        reason: "SHA256_OR_LENGTH_MISMATCH",
        blobRead: "COMPLETED",
      };
    }
    return {
      partIndex,
      registration: "REGISTERED",
      storedVerificationState,
      expectedBytes: bytes,
      expectedSha256: sha,
      status: "VERIFIED",
      reason: null,
      blobRead: "COMPLETED",
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return {
      partIndex,
      registration: "REGISTERED",
      storedVerificationState,
      expectedBytes: bytes,
      expectedSha256: sha,
      status: code === "audio_integridad_rota" ? "MISMATCH" : code === "blob_no_encontrado" ? "MISSING" : "UNVERIFIABLE",
      reason: integrityReason(code),
      blobRead: "FAILED",
    };
  } finally {
    clear?.fill(0);
  }
}

export async function toolKhoraCustodiaVerificarIntegridad(
  actor: string,
  args: { session_id: string; limite?: number; despues_de_parte?: number },
  db: Db = getMcpReadOnlyDb(),
  readBlob: typeof leerBlobVerificado = leerBlobVerificado,
) {
  const sessionId = args.session_id;
  if (!(await owns(db, actor, sessionId))) throw new Error("sesion_no_encontrada_o_no_autorizada");
  const limit = limitOf(args.limite, 20, MAX_INTEGRITY_PAGE);
  const after = afterOf(args.despues_de_parte);
  const latest = await db.query(
    "SELECT revision_id::text,creado_en,snapshot FROM dictado_checkpoint WHERE session_id=$1 AND usuario=$2 ORDER BY creado_en DESC,revision_id DESC LIMIT 1",
    [sessionId, actor],
  );
  const manifest = readManifest(latest.rows[0]?.snapshot);
  const declared = manifest.declaredParts;
  let rows: any[] = [];
  let hasMore = false;
  let nextAfterPart: number | null = null;
  let registeredPartsTotal: number | null = null;
  let invalidPartIndexes: number | null = null;
  let unexpectedStoredParts: number | null = null;
  let pageBasis: "declared_manifest" | "registered_rows" = "registered_rows";

  if (declared !== null && manifest.status !== "INVALID" && manifest.status !== "UNREADABLE") {
    if (after > declared) throw new Error("cursor_fuera_de_rango");
    pageBasis = "declared_manifest";
    const start = after + 1;
    const end = Math.min(declared, after + limit);
    const query = await db.query(
      "WITH expected AS (SELECT generate_series($2::int,$3::int) AS part_index)," +
      " stats AS (" +
      "  SELECT count(*)::int AS stored_total," +
      "   count(*) FILTER(WHERE part_index<1)::int AS invalid_indexes," +
      "   count(*) FILTER(WHERE part_index>$4::int)::int AS extra_parts" +
      "  FROM dictado_audio_parte WHERE session_id=$1" +
      " ) SELECT stats.stored_total,stats.invalid_indexes,stats.extra_parts,expected.part_index AS part_index,p.part_index AS stored_part_index," +
      " p.bytes,p.sha256,p.blob_url,p.estado_verificacion" +
      " FROM stats LEFT JOIN expected ON TRUE" +
      " LEFT JOIN dictado_audio_parte p ON p.session_id=$1 AND p.part_index=expected.part_index" +
      " ORDER BY expected.part_index",
      [sessionId, start, end, declared],
    );
    const meta = query.rows[0] || {};
    registeredPartsTotal = safeCount(meta.stored_total) ?? 0;
    invalidPartIndexes = safeCount(meta.invalid_indexes) ?? 0;
    unexpectedStoredParts = safeCount(meta.extra_parts) ?? 0;
    rows = query.rows.filter((row: any) => row.part_index !== null && row.part_index !== undefined);
    hasMore = end < declared;
    nextAfterPart = hasMore ? end : null;
  } else {
    const query = await db.query(
      "SELECT part_index,part_index AS stored_part_index,bytes,sha256,blob_url,estado_verificacion,count(*) OVER() AS total_rows" +
      " FROM dictado_audio_parte WHERE session_id=$1 AND part_index>$2 ORDER BY part_index LIMIT $3",
      [sessionId, after, limit + 1],
    );
    const total = safeCount(query.rows[0]?.total_rows);
    const all = query.rows;
    hasMore = all.length > limit;
    rows = all.slice(0, limit);
    registeredPartsTotal = total;
    const last = rows.at(-1);
    nextAfterPart = hasMore && last ? Number(last.part_index) : null;
    if (total !== null) {
      const anomalies = await db.query(
        "SELECT count(*) FILTER(WHERE part_index<1)::int AS invalid_indexes FROM dictado_audio_parte WHERE session_id=$1",
        [sessionId],
      );
      invalidPartIndexes = safeCount(anomalies.rows[0]?.invalid_indexes) ?? 0;
    }
  }

  const items: any[] = [];
  for (const row of rows) {
    const partIndex = Number(row.part_index);
    if (pageBasis === "declared_manifest" && (row.stored_part_index === null || row.stored_part_index === undefined)) {
      items.push({
        partIndex,
        registration: "ABSENT_FROM_TABLE",
        storedVerificationState: null,
        expectedBytes: null,
        expectedSha256: null,
        status: "MISSING",
        reason: "PART_ROW_MISSING",
        blobRead: "NOT_ATTEMPTED",
      });
      continue;
    }
    if (!Number.isSafeInteger(partIndex) || partIndex < 1) {
      items.push({
        partIndex: Number.isFinite(partIndex) ? partIndex : null,
        registration: "REGISTERED_INDEX_INVALID",
        storedVerificationState: typeof row.estado_verificacion === "string" ? row.estado_verificacion : null,
        expectedBytes: safeCount(row.bytes),
        expectedSha256: typeof row.sha256 === "string" ? row.sha256.toLowerCase() : null,
        status: "UNVERIFIABLE",
        reason: "PART_INDEX_NOT_1_BASED_OR_INVALID",
        blobRead: "NOT_ATTEMPTED",
      });
    } else {
      items.push(await verifyRegisteredPart(partIndex, row, readBlob));
    }
  }

  if (pageBasis === "declared_manifest") items.sort((a, b) => Number(a.partIndex) - Number(b.partIndex));

  const statuses = items.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const currentPageEnd = pageBasis === "declared_manifest" ? Math.min(declared ?? 0, after + limit) : null;
  return {
    sessionId,
    checkedAt: new Date().toISOString(),
    manifest: {
      status: manifest.status,
      source: manifest.source,
      declaredParts: declared,
      declarationConfidence: manifest.status === "DECLARED" ? "EXPLICIT_CUT" : manifest.status === "LEGACY_INFERRED" ? "LEGACY_ARRAY_LENGTH" : "UNKNOWN",
    },
    items,
    summary: {
      registeredPartsTotal,
      invalidPartIndexes,
      unexpectedStoredParts,
      currentPageStatusCounts: statuses,
      recordedVerificationIsNotCurrentVerification: true,
    },
    page: {
      limit,
      basis: pageBasis,
      afterPart: after,
      hasMore,
      nextAfterPart,
      currentPageEnd,
      consumerMustVerify: ["continue until hasMore=false", "no duplicated partIndex", "declared indexes 1..N are each classified exactly once"],
    },
    legend: {
      VERIFIED: "Blob leído/descifrado y longitud/SHA-256 comprobados en esta llamada",
      MISSING: "Parte declarada sin fila en tabla, referencia Blob ausente o proveedor respondió 404; el motivo distingue el caso",
      MISMATCH: "La lectura actual produjo bytes cuya longitud o SHA-256 no coincide con el manifiesto",
      UNVERIFIABLE: "No fue posible demostrar integridad; incluye errores de red, acceso, redirect, descifrado o metadata inválida",
      SYNCED: "No se usa como resultado de esta herramienta: una marca almacenada no sustituye la verificación física actual",
    },
    excludes: ["blob_url", "clear_bytes", "audio_base64", "snapshot", "transcript", "credentials"],
  };
}
