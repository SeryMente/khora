/**
 * Resumable, non-destructive Vercel Blob -> Backblaze B2 backfill.
 * Default mode is read-only. Applying requires --apply --confirm=KHORA_BLOB_TO_B2.
 * This script never deletes a source Blob object.
 */
import { createHash } from "node:crypto";
import { list as listVercelBlobs } from "@vercel/blob";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "pg";
import { descifrarBytes } from "../lib/server/cripto";
import { b2ObjectUrl, safeObjectKey } from "../lib/storage/object-reference";
import { createB2Client, storageLocation } from "../lib/server/object-storage";

const CONFIRM = "KHORA_BLOB_TO_B2";
const PAGE_SIZE = 1000;
const MAX_ENCRYPTED_BYTES = 512 * 1024 * 1024;

type RefRow = {
  source_url: string;
  clear_sha256: string | null;
  clear_bytes: string | number | null;
  ref_kind: string;
};
type Candidate = {
  url: string;
  sha256: string | null;
  bytes: number | null;
  occurrences: number;
  kinds: Set<string>;
  hashes: Set<string>;
  lengths: Set<number>;
};
type Summary = {
  mode: "dry-run" | "apply";
  physicalBlobObjects: number;
  databaseReferenceOccurrences: number;
  distinctSourceUrls: number;
  eligible: number;
  quarantined: number;
  missingFromBlobListing: number;
  copiedAndVerified: number;
  referencesUpdated: number;
  alreadyCompleted: number;
  failed: number;
  errors: Record<string, number>;
};

function arg(name: string): string | undefined {
  const prefix = "--" + name + "=";
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}
function flag(name: string): boolean {
  return process.argv.includes("--" + name);
}
function hash(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}
function errorCode(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return /^[a-z0-9_:-]{1,80}$/i.test(value) ? value : "migration_unexpected_error";
}
function numberValue(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
function addError(summary: Summary, code: string) {
  summary.errors[code] = (summary.errors[code] || 0) + 1;
}
async function bodyBuffer(body: unknown): Promise<Buffer> {
  if (!body || typeof body !== "object" || !("transformToByteArray" in body)
    || typeof (body as { transformToByteArray?: unknown }).transformToByteArray !== "function") {
    throw new Error("b2_response_body_invalid");
  }
  const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  return Buffer.from(bytes);
}

async function listEveryBlob(): Promise<Map<string, { pathname: string; size: number }>> {
  const found = new Map<string, { pathname: string; size: number }>();
  let cursor: string | undefined;
  let pages = 0;
  do {
    const page = await listVercelBlobs({ limit: PAGE_SIZE, cursor });
    for (const blob of page.blobs || []) {
      if (typeof blob.url === "string" && typeof blob.pathname === "string") {
        found.set(blob.url, { pathname: blob.pathname, size: Number(blob.size || 0) });
      }
    }
    pages += 1;
    if (pages > 100) throw new Error("vercel_blob_listing_page_limit");
    if (page.hasMore && (!page.cursor || page.cursor === cursor)) {
      throw new Error("vercel_blob_listing_cursor_invalid");
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return found;
}

async function loadReferences(pool: Pool): Promise<Map<string, Candidate>> {
  const sql = `
    WITH refs AS (
      SELECT blob_url AS source_url, sha256 AS clear_sha256, bytes::bigint AS clear_bytes,
             'dictado_audio_parte'::text AS ref_kind
      FROM dictado_audio_parte WHERE blob_url IS NOT NULL
      UNION ALL
      SELECT blob_url, sha256, bytes::bigint, 'dictado_mp3'
      FROM dictado_mp3 WHERE blob_url IS NOT NULL
      UNION ALL
      SELECT blob_url, sha256, bytes::bigint, 'dictado_mp3_historial'
      FROM dictado_mp3_historial WHERE blob_url IS NOT NULL
      UNION ALL
      SELECT v.audio_url, p.elem->>'sha256', NULLIF(p.elem->>'bytes','')::bigint, 'volcado.audio_url'
      FROM volcado v
      LEFT JOIN LATERAL (
        SELECT elem
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(v.audio_partes)='array' THEN v.audio_partes ELSE '[]'::jsonb END
        ) elem
        WHERE elem->>'url'=v.audio_url
        ORDER BY CASE WHEN COALESCE(elem->>'parte',elem->>'part_index','1')='1' THEN 0 ELSE 1 END
        LIMIT 1
      ) p ON true
      WHERE v.audio_url IS NOT NULL
      UNION ALL
      SELECT elem->>'url', elem->>'sha256', NULLIF(elem->>'bytes','')::bigint, 'volcado.audio_partes'
      FROM volcado v
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(v.audio_partes)='array' THEN v.audio_partes ELSE '[]'::jsonb END
      ) elem
      WHERE elem->>'url' IS NOT NULL
    )
    SELECT source_url, clear_sha256, clear_bytes, ref_kind
    FROM refs
    WHERE source_url LIKE 'https://%.blob.vercel-storage.com/%'
    ORDER BY source_url, ref_kind
  `;
  const result = await pool.query<RefRow>(sql);
  const candidates = new Map<string, Candidate>();
  for (const row of result.rows) {
    if (!row.source_url) continue;
    let item = candidates.get(row.source_url);
    if (!item) {
      item = {
        url: row.source_url, sha256: null, bytes: null, occurrences: 0,
        kinds: new Set<string>(), hashes: new Set<string>(), lengths: new Set<number>(),
      };
      candidates.set(row.source_url, item);
    }
    item.occurrences += 1;
    item.kinds.add(row.ref_kind);
    if (row.clear_sha256 && /^[a-f0-9]{64}$/i.test(row.clear_sha256)) item.hashes.add(row.clear_sha256.toLowerCase());
    const bytes = numberValue(row.clear_bytes);
    if (bytes !== null) item.lengths.add(bytes);
  }
  for (const item of candidates.values()) {
    if (item.hashes.size === 1) item.sha256 = [...item.hashes][0];
    if (item.lengths.size === 1) item.bytes = [...item.lengths][0];
  }
  return candidates;
}

function quarantineReason(item: Candidate): string | null {
  if (item.hashes.size > 1 || item.lengths.size > 1) return "metadata_conflict";
  if (!item.sha256 || !item.bytes) return "metadata_incomplete";
  return null;
}

async function fetchEncryptedBlob(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error("vercel_blob_read_http_" + response.status);
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > MAX_ENCRYPTED_BYTES) throw new Error("vercel_blob_object_size_invalid");
  if (data.subarray(0, 4).toString("ascii") !== "KHC1") throw new Error("source_not_khc1_encrypted");
  return data;
}

async function verifyB2Object(
  client: ReturnType<typeof createB2Client>,
  key: string,
  item: Candidate,
  expectedEncryptedHash: string,
): Promise<void> {
  const location = storageLocation();
  const response = await client.send(new GetObjectCommand({ Bucket: location.bucket, Key: key }));
  const encrypted = await bodyBuffer(response.Body);
  if (hash(encrypted) !== expectedEncryptedHash) throw new Error("b2_encrypted_sha_mismatch");
  if (encrypted.subarray(0, 4).toString("ascii") !== "KHC1") throw new Error("b2_object_not_khc1");
  const clear = descifrarBytes(encrypted);
  if (clear.length !== item.bytes || hash(clear) !== item.sha256) {
    throw new Error("b2_cleartext_integrity_mismatch");
  }
}

async function copyAndVerify(
  client: ReturnType<typeof createB2Client>,
  item: Candidate,
  sourceEncrypted: Buffer,
): Promise<{ url: string; encryptedHash: string; encryptedBytes: number }> {
  const location = storageLocation();
  const sourceUrlHash = hash(item.url);
  const encryptedHash = hash(sourceEncrypted);
  const key = safeObjectKey("khora/migrated/vercel-blob/" + sourceUrlHash + ".khc");
  let exists = false;
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: location.bucket, Key: key }));
    exists = true;
    if (Number(head.ContentLength) !== sourceEncrypted.length) {
      throw new Error("existing_b2_object_length_conflict");
    }
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    const name = (error as { name?: string })?.name || "";
    if (status !== 404 && name !== "NotFound" && name !== "NoSuchKey") throw error;
  }
  if (!exists) {
    await client.send(new PutObjectCommand({
      Bucket: location.bucket,
      Key: key,
      Body: sourceEncrypted,
      ContentLength: sourceEncrypted.length,
      ContentType: "application/octet-stream",
      ServerSideEncryption: "AES256",
      Metadata: {
        "khora-source-url-sha256": sourceUrlHash,
        "khora-clear-sha256": item.sha256 || "",
      },
    }));
  }
  await verifyB2Object(client, key, item, encryptedHash);
  return { url: b2ObjectUrl(key, location), encryptedHash, encryptedBytes: sourceEncrypted.length };
}

async function updateReferences(
  pool: Pool,
  item: Candidate,
  destinationUrl: string,
  encryptedHash: string,
  encryptedBytes: number,
): Promise<number> {
  const sourceUrlHash = hash(item.url);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const existing = await db.query(
      "SELECT source_url,source_clear_sha256,source_encrypted_sha256,state FROM custodia_blob_b2_migration WHERE source_url_sha256=$1 FOR UPDATE",
      [sourceUrlHash],
    );
    if (existing.rows[0]?.state === "references_updated") {
      await db.query("COMMIT");
      return 0;
    }
    if (existing.rows[0] && (
      existing.rows[0].source_url !== item.url
      || (existing.rows[0].source_clear_sha256 && existing.rows[0].source_clear_sha256 !== item.sha256)
      || (existing.rows[0].source_encrypted_sha256 && existing.rows[0].source_encrypted_sha256 !== encryptedHash)
    )) throw new Error("migration_ledger_source_conflict");

    await db.query(
      `
        INSERT INTO custodia_blob_b2_migration
          (source_url_sha256,source_url,destination_url,source_clear_sha256,source_clear_bytes,
           source_encrypted_sha256,source_encrypted_bytes,state,reference_occurrences,attempts,last_error_code,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'copied_verified',$8,1,NULL,now())
        ON CONFLICT (source_url_sha256) DO UPDATE SET
          destination_url=EXCLUDED.destination_url,
          source_clear_sha256=EXCLUDED.source_clear_sha256,
          source_clear_bytes=EXCLUDED.source_clear_bytes,
          source_encrypted_sha256=EXCLUDED.source_encrypted_sha256,
          source_encrypted_bytes=EXCLUDED.source_encrypted_bytes,
          state='copied_verified',
          reference_occurrences=EXCLUDED.reference_occurrences,
          attempts=custodia_blob_b2_migration.attempts+1,
          last_error_code=NULL,
          updated_at=now()
      `,
      [sourceUrlHash,item.url,destinationUrl,item.sha256,item.bytes,encryptedHash,encryptedBytes,item.occurrences],
    );

    let updated = 0;
    for (const table of ["dictado_audio_parte", "dictado_mp3", "dictado_mp3_historial"]) {
      const result = await db.query("UPDATE " + table + " SET blob_url=$2 WHERE blob_url=$1", [item.url,destinationUrl]);
      updated += result.rowCount || 0;
    }
    const volcado = await db.query(
      `
        UPDATE volcado v SET
          audio_url=CASE WHEN v.audio_url=$1 THEN $2 ELSE v.audio_url END,
          audio_partes=CASE
            WHEN jsonb_typeof(v.audio_partes)='array' THEN (
              SELECT COALESCE(jsonb_agg(
                CASE WHEN elem->>'url'=$1
                  THEN jsonb_set(elem,'{url}',to_jsonb($2::text),true)
                  ELSE elem END
                ORDER BY ord
              ),'[]'::jsonb)
              FROM jsonb_array_elements(v.audio_partes) WITH ORDINALITY AS item(elem,ord)
            )
            ELSE v.audio_partes
          END
        WHERE v.audio_url=$1 OR (
          jsonb_typeof(v.audio_partes)='array' AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(v.audio_partes) item WHERE item->>'url'=$1
          )
        )
      `,
      [item.url,destinationUrl],
    );
    updated += volcado.rowCount || 0;
    await db.query(
      "UPDATE custodia_blob_b2_migration SET state='references_updated',updated_references=$2,updated_at=now() WHERE source_url_sha256=$1",
      [sourceUrlHash,updated],
    );
    await db.query("COMMIT");
    return updated;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    db.release();
  }
}

async function recordState(
  pool: Pool,
  item: Candidate,
  state: "quarantined" | "failed",
  code: string,
) {
  await pool.query(
    `
      INSERT INTO custodia_blob_b2_migration
        (source_url_sha256,source_url,source_clear_sha256,source_clear_bytes,state,
         reference_occurrences,attempts,last_error_code,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,1,$7,now())
      ON CONFLICT (source_url_sha256) DO UPDATE SET
        state=CASE WHEN custodia_blob_b2_migration.state='references_updated'
                   THEN 'references_updated' ELSE EXCLUDED.state END,
        reference_occurrences=EXCLUDED.reference_occurrences,
        attempts=custodia_blob_b2_migration.attempts+1,
        last_error_code=EXCLUDED.last_error_code,
        updated_at=now()
    `,
    [hash(item.url),item.url,item.sha256,item.bytes,state,item.occurrences,code],
  );
}

async function main() {
  const apply = flag("apply");
  if (apply && arg("confirm") !== CONFIRM) throw new Error("apply_requires_confirm_flag");
  if (!process.env.DATABASE_URL_UNPOOLED) throw new Error("DATABASE_URL_UNPOOLED_required");
  if (!process.env.X_KHORA_KEY || process.env.X_KHORA_KEY.length < 16) throw new Error("X_KHORA_KEY_required");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN_required");
  if (apply && (!process.env.KHORA_B2_BUCKET_NAME || !process.env.KHORA_B2_KEY_ID
    || !process.env.KHORA_B2_APPLICATION_KEY)) throw new Error("b2_credentials_required");

  const rawLimit = arg("limit");
  const limit = rawLimit ? Number(rawLimit) : Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("limit_invalid");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, max: 2, connectionTimeoutMillis: 15000 });
  let b2: ReturnType<typeof createB2Client> | null = null;
  const summary: Summary = {
    mode: apply ? "apply" : "dry-run",
    physicalBlobObjects: 0, databaseReferenceOccurrences: 0, distinctSourceUrls: 0,
    eligible: 0, quarantined: 0, missingFromBlobListing: 0, copiedAndVerified: 0,
    referencesUpdated: 0, alreadyCompleted: 0, failed: 0, errors: {},
  };
  try {
    const table = await pool.query("SELECT to_regclass('public.custodia_blob_b2_migration') AS migration_table");
    if (!table.rows[0]?.migration_table) throw new Error("migration_035_not_applied");

    const completed = await pool.query("SELECT count(*)::bigint AS n FROM custodia_blob_b2_migration WHERE state='references_updated'");
    summary.alreadyCompleted = Number(completed.rows[0]?.n || 0);

    const refs = await loadReferences(pool);
    summary.distinctSourceUrls = refs.size;
    for (const item of refs.values()) summary.databaseReferenceOccurrences += item.occurrences;

    const physical = await listEveryBlob();
    summary.physicalBlobObjects = physical.size;
    let processed = 0;
    const ordered = [...refs.values()].sort((a,b) => a.url.localeCompare(b.url));
    for (const item of ordered) {
      const already = await pool.query(
        "SELECT state FROM custodia_blob_b2_migration WHERE source_url_sha256=$1",
        [hash(item.url)],
      );
      if (already.rows[0]?.state === "references_updated") continue;

      const reason = quarantineReason(item);
      if (reason) {
        summary.quarantined += 1;
        addError(summary,reason);
        if (apply) await recordState(pool,item,"quarantined",reason);
        continue;
      }
      if (!physical.has(item.url)) {
        summary.missingFromBlobListing += 1;
        addError(summary,"blob_object_not_in_complete_listing");
        if (apply) await recordState(pool,item,"quarantined","blob_object_not_in_complete_listing");
        continue;
      }

      summary.eligible += 1;
      if (processed >= limit) continue;
      processed += 1;
      if (!apply) continue;

      try {
        const encrypted = await fetchEncryptedBlob(item.url);
        const clear = descifrarBytes(encrypted);
        if (clear.length !== item.bytes || hash(clear) !== item.sha256) {
          throw new Error("source_cleartext_integrity_mismatch");
        }
        if (!b2) b2 = createB2Client();
        const copy = await copyAndVerify(b2,item,encrypted);
        summary.copiedAndVerified += 1;
        summary.referencesUpdated += await updateReferences(pool,item,copy.url,copy.encryptedHash,copy.encryptedBytes);
      } catch (error) {
        summary.failed += 1;
        const code = errorCode(error);
        addError(summary,code);
        await recordState(pool,item,"failed",code).catch(() => undefined);
      }
    }

    process.stdout.write(JSON.stringify(summary,null,2) + "\n");
    if (summary.failed || summary.quarantined || summary.missingFromBlobListing) process.exitCode = 2;
  } finally {
    if (b2) b2.destroy();
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ error: errorCode(error) }) + "\n");
  process.exitCode = 1;
});
