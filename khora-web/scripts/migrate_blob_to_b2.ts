/**
 * Resumable, non-destructive Vercel Blob -> Backblaze B2 backfill.
 * Test-only E2E migrator. Requires an isolated Neon branch/database and dedicated
 * Vercel Blob + Backblaze B2 test stores. It never targets production.
 * Applying additionally requires --apply --target-branch=custodia-b2-migration-test-20261031
 * --confirm=KHORA_BLOB_TO_B2_NONPROD. This script never deletes a source Blob object.
 */
import { createHash } from "node:crypto";
import { list as listVercelBlobs } from "@vercel/blob";
import { Pool } from "pg";
import { descifrarBytes } from "../lib/server/cripto";
import { legacyBlobUrl } from "../lib/storage/object-reference";
import {
  inspectB2ReadOnly,
  listB2Objects,
  putMigratedEncryptedObject,
  storageLocation,
} from "../lib/server/object-storage";

const CONFIRM = "KHORA_BLOB_TO_B2_NONPROD";
const REQUIRED_BRANCH = "custodia-b2-migration-test-20261031";
const REQUIRED_DATABASE = "custodia_b2_e2e";
const REQUIRED_DATABASE_HOST = "ep-cool-pond-ahenbh4b.c-3.us-east-1.aws.neon.tech";
const REQUIRED_B2_BUCKET_PREFIX = "khora-custodia-e2e-";
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
  incompleteMetadata: number;
  kinds: Set<string>;
  hashes: Set<string>;
  lengths: Set<number>;
};
type Summary = {
  mode: "dry-run" | "apply";
  physicalBlobObjects: number;
  physicalB2Objects: number;
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
function assertIsolatedE2ETarget(): void {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED_required");
  if (process.env.NEON_BRANCH !== REQUIRED_BRANCH
    || arg("target-branch") !== REQUIRED_BRANCH) {
    throw new Error("migration_branch_not_allowlisted");
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error("migration_database_url_invalid");
  }
  const databasePath = databaseUrl.pathname.startsWith("/") ? databaseUrl.pathname.slice(1) : databaseUrl.pathname;
  const databaseName = decodeURIComponent(databasePath);
  if (databaseUrl.hostname !== REQUIRED_DATABASE_HOST || databaseName !== REQUIRED_DATABASE) {
    throw new Error("migration_database_target_not_allowlisted");
  }

  if (process.env.KHORA_BLOB_B2_E2E !== "1") {
    throw new Error("migration_e2e_environment_marker_required");
  }
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "";
  const expectedStoreId = process.env.KHORA_BLOB_B2_SOURCE_STORE_ID || "";
  const tokenStoreId = blobToken.split("_")[3] || "";
  if (!blobToken.startsWith("vercel_blob_rw_") || !expectedStoreId
    || tokenStoreId !== expectedStoreId) {
    throw new Error("migration_blob_test_store_mismatch");
  }

  const location = storageLocation();
  const expectedBucket = process.env.KHORA_B2_EXPECTED_TEST_BUCKET || "";
  const keyId = process.env.KHORA_B2_MASTER_APPLICATION_KEY_ID || process.env.KHORA_B2_KEY_ID || "";
  const applicationKey = process.env.KHORA_B2_MASTER_APPLICATION_KEY || process.env.KHORA_B2_APPLICATION_KEY || "";
  if (!location.bucket || !location.bucketId || !keyId || !applicationKey
    || !expectedBucket || location.bucket !== expectedBucket
    || !location.bucket.startsWith(REQUIRED_B2_BUCKET_PREFIX)) {
    throw new Error("migration_b2_test_bucket_mismatch");
  }
  if (process.env.KHORA_OBJECT_STORAGE !== "b2") throw new Error("migration_b2_not_enabled");
  if (process.env.KHORA_B2_MIGRATION_ENV !== "nonproduction") {
    throw new Error("migration_nonproduction_marker_required");
  }
}

function numberValue(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
function addError(summary: Summary, code: string) {
  summary.errors[code] = (summary.errors[code] || 0) + 1;
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
      SELECT v.audio_url, COALESCE(p.elem->>'sha256', v.sha256),
             CASE
               WHEN COALESCE(p.elem->>'bytes',v.audio_bytes::text,'') ~ '^[1-9][0-9]{0,18}
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
      SELECT elem->>'url', elem->>'sha256',
             CASE
               WHEN COALESCE(elem->>'bytes','') ~ '^[1-9][0-9]{0,18}
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
  const result = await pool.query(sql);
  const rows = result.rows as RefRow[];
  const candidates = new Map<string, Candidate>();
  for (const row of rows) {
    if (!row.source_url) continue;
    let item = candidates.get(row.source_url);
    if (!item) {
      item = {
        url: row.source_url, sha256: null, bytes: null, occurrences: 0, incompleteMetadata: 0,
        kinds: new Set<string>(), hashes: new Set<string>(), lengths: new Set<number>(),
      };
      candidates.set(row.source_url, item);
    }
    item.occurrences += 1;
    item.kinds.add(row.ref_kind);
    if (row.clear_sha256 && /^[a-f0-9]{64}$/i.test(row.clear_sha256)) {
      item.hashes.add(row.clear_sha256.toLowerCase());
    } else {
      item.incompleteMetadata += 1;
    }
    const bytes = numberValue(row.clear_bytes);
    if (bytes !== null) item.lengths.add(bytes);
    else item.incompleteMetadata += 1;
  }
  for (const item of candidates.values()) {
    if (item.hashes.size === 1) item.sha256 = [...item.hashes][0];
    if (item.lengths.size === 1) item.bytes = [...item.lengths][0];
  }
  return candidates;
}

function quarantineReason(item: Candidate): string | null {
  if (!legacyBlobUrl(item.url)) return "source_url_not_allowlisted";
  if (item.hashes.size > 1 || item.lengths.size > 1) return "metadata_conflict";
  if (item.incompleteMetadata > 0 || !item.sha256 || !item.bytes) return "metadata_incomplete";
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

async function copyAndVerify(
  item: Candidate,
  sourceEncrypted: Buffer,
): Promise<{ url: string; encryptedHash: string; encryptedBytes: number; reused: boolean }> {
  const sourceUrlHash = hash(item.url);
  const copy = await putMigratedEncryptedObject(sourceUrlHash, sourceEncrypted);
  const expectedEncryptedHash = hash(sourceEncrypted);
  if (copy.encryptedSha256 !== expectedEncryptedHash || copy.encryptedBytes !== sourceEncrypted.length) {
    throw new Error("b2_encrypted_readback_mismatch");
  }
  const clear = descifrarBytes(sourceEncrypted);
  if (clear.length !== item.bytes || hash(clear) !== item.sha256) {
    throw new Error("b2_cleartext_integrity_mismatch");
  }
  return {
    url: copy.url,
    encryptedHash: copy.encryptedSha256,
    encryptedBytes: copy.encryptedBytes,
    reused: copy.reused,
  };
}

async function updateReferences(
  pool: Pool,
  item: Candidate,
  destinationUrl: string,
  destinationPath: string,
  encryptedHash: string,
  encryptedBytes: number,
): Promise<number> {
  const sourceUrlHash = hash(item.url);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [sourceUrlHash]);
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

    // Lock the current reference rows and verify the inventory snapshot before repointing.
    for (const table of ["dictado_audio_parte", "dictado_mp3", "dictado_mp3_historial"]) {
      await db.query("SELECT 1 FROM " + table + " WHERE blob_url=$1 FOR UPDATE", [item.url]);
    }
    await db.query(
      `
        SELECT 1 FROM volcado v
        WHERE v.audio_url=$1 OR (
          jsonb_typeof(v.audio_partes)='array' AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(v.audio_partes) elem WHERE elem->>'url'=$1
          )
        )
        FOR UPDATE
      `,
      [item.url],
    );
    const countReferencesSql = `
      SELECT
        (SELECT count(*)::bigint FROM dictado_audio_parte WHERE blob_url=$1) AS audio_parts,
        (SELECT count(*)::bigint FROM dictado_mp3 WHERE blob_url=$1) AS mp3,
        (SELECT count(*)::bigint FROM dictado_mp3_historial WHERE blob_url=$1) AS mp3_history,
        (SELECT count(*)::bigint FROM volcado WHERE audio_url=$1) AS volcado_audio_url,
        (SELECT count(*)::bigint
          FROM volcado v
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(v.audio_partes)='array' THEN v.audio_partes ELSE '[]'::jsonb END
          ) elem
          WHERE elem->>'url'=$1
        ) AS volcado_audio_parts
    `;
    const beforeCounts = await db.query(countReferencesSql, [item.url]);
    const destinationBefore = await db.query(countReferencesSql, [destinationUrl]);
    const expectedReferences = Object.values(beforeCounts.rows[0] || {})
      .reduce<number>((sum, value) => sum + Number(value || 0), 0);
    const destinationReferencesBefore = Object.values(destinationBefore.rows[0] || {})
      .reduce<number>((sum, value) => sum + Number(value || 0), 0);
    if (expectedReferences !== item.occurrences) {
      throw new Error("migration_reference_inventory_changed");
    }

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

    await db.query(
      "UPDATE dictado_audio_parte SET blob_url=$2,blob_path=$3 WHERE blob_url=$1",
      [item.url,destinationUrl,destinationPath],
    );
    for (const table of ["dictado_mp3", "dictado_mp3_historial"]) {
      await db.query("UPDATE " + table + " SET blob_url=$2 WHERE blob_url=$1", [item.url,destinationUrl]);
    }
    await db.query(
      `
        UPDATE volcado v SET
          audio_url=CASE WHEN v.audio_url=$1 THEN $2 ELSE v.audio_url END,
          audio_partes=CASE
            WHEN jsonb_typeof(v.audio_partes)='array' THEN (
              SELECT COALESCE(jsonb_agg(
                CASE WHEN elem->>'url'=$1 THEN
                  jsonb_set(
                    CASE WHEN elem ? 'pathname'
                      THEN jsonb_set(
                        CASE WHEN elem ? 'path'
                          THEN jsonb_set(elem,'{path}',to_jsonb($3::text),true)
                          ELSE elem END,
                        '{pathname}',to_jsonb($3::text),true
                      )
                      WHEN elem ? 'path' THEN jsonb_set(elem,'{path}',to_jsonb($3::text),true)
                      ELSE elem END,
                    '{url}',to_jsonb($2::text),true
                  )
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
      [item.url,destinationUrl,destinationPath],
    );
    const afterCounts = await db.query(countReferencesSql, [item.url]);
    const destinationAfter = await db.query(countReferencesSql, [destinationUrl]);
    const remainingReferences = Object.values(afterCounts.rows[0] || {})
      .reduce<number>((sum, value) => sum + Number(value || 0), 0);
    const destinationReferencesAfter = Object.values(destinationAfter.rows[0] || {})
      .reduce<number>((sum, value) => sum + Number(value || 0), 0);
    if (remainingReferences !== 0) {
      throw new Error("migration_source_references_remaining");
    }
    if (destinationReferencesAfter - destinationReferencesBefore !== expectedReferences) {
      throw new Error("migration_destination_reference_count_mismatch");
    }
    // Count pointer occurrences (including multiple JSONB entries), not affected parent rows.
    const updated = expectedReferences;
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

const MIGRATION_LEDGER_SQL = `
CREATE TABLE IF NOT EXISTS public.custodia_blob_b2_migration (
  source_url_sha256 CHAR(64) PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  destination_url TEXT,
  source_clear_sha256 CHAR(64),
  source_clear_bytes BIGINT,
  source_encrypted_sha256 CHAR(64),
  source_encrypted_bytes BIGINT,
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'quarantined', 'copied_verified', 'references_updated', 'failed')),
  reference_occurrences BIGINT NOT NULL DEFAULT 0,
  updated_references BIGINT NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT custodia_blob_b2_migration_hashes_valid
    CHECK (
      source_url_sha256 ~ '^[a-f0-9]{64}$'
      AND (source_clear_sha256 IS NULL OR source_clear_sha256 ~ '^[a-f0-9]{64}$')
      AND (source_encrypted_sha256 IS NULL OR source_encrypted_sha256 ~ '^[a-f0-9]{64}$')
    )
);
CREATE INDEX IF NOT EXISTS custodia_blob_b2_migration_state_idx
  ON public.custodia_blob_b2_migration (state, updated_at);
`;

async function main() {
  const apply = flag("apply");
  assertIsolatedE2ETarget();
  if (apply && arg("confirm") !== CONFIRM) throw new Error("apply_requires_confirm_flag");
  if (apply && (!process.env.X_KHORA_KEY || process.env.X_KHORA_KEY.length < 16)) {
    throw new Error("X_KHORA_KEY_required");
  }

  const rawLimit = arg("limit");
  const limit = rawLimit ? Number(rawLimit) : Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("limit_invalid");

  const storage = await inspectB2ReadOnly();
  if (!storage.accountVerified || !storage.masterKeyVerified || !storage.bucketVerified
    || !storage.bucketPrivate || !storage.sseB2) {
    throw new Error("migration_b2_readonly_preflight_failed");
  }
  const b2Objects = await listB2Objects("khora/dictado/");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    max: 2,
    connectionTimeoutMillis: 15000,
    statement_timeout: 120000,
    application_name: "khora-custodia-blob-b2-nonprod",
  });
  const summary: Summary = {
    mode: apply ? "apply" : "dry-run",
    physicalBlobObjects: 0,
    physicalB2Objects: b2Objects.length,
    databaseReferenceOccurrences: 0,
    distinctSourceUrls: 0,
    eligible: 0,
    quarantined: 0,
    missingFromBlobListing: 0,
    copiedAndVerified: 0,
    referencesUpdated: 0,
    alreadyCompleted: 0,
    failed: 0,
    errors: {},
  };
  try {
    if (apply) await pool.query(MIGRATION_LEDGER_SQL);
    const table = await pool.query("SELECT to_regclass('public.custodia_blob_b2_migration') AS migration_table");
    if (apply && !table.rows[0]?.migration_table) throw new Error("migration_ledger_unavailable");

    if (table.rows[0]?.migration_table) {
      const completed = await pool.query(
        "SELECT count(*)::bigint AS n FROM public.custodia_blob_b2_migration WHERE state='references_updated'",
      );
      summary.alreadyCompleted = Number(completed.rows[0]?.n || 0);
    }

    const refs = await loadReferences(pool);
    summary.distinctSourceUrls = refs.size;
    for (const item of refs.values()) summary.databaseReferenceOccurrences += item.occurrences;

    const physical = await listEveryBlob();
    summary.physicalBlobObjects = physical.size;
    let processed = 0;
    const ordered = [...refs.values()].sort((a, b) => a.url.localeCompare(b.url));
    for (const item of ordered) {
      if (table.rows[0]?.migration_table) {
        const already = await pool.query(
          "SELECT state FROM public.custodia_blob_b2_migration WHERE source_url_sha256=$1",
          [hash(item.url)],
        );
        if (already.rows[0]?.state === "references_updated") continue;
      }

      const reason = quarantineReason(item);
      if (reason) {
        summary.quarantined += 1;
        addError(summary, reason);
        if (apply) await recordState(pool, item, "quarantined", reason);
        continue;
      }
      if (!physical.has(item.url)) {
        summary.missingFromBlobListing += 1;
        addError(summary, "blob_object_not_in_complete_listing");
        if (apply) await recordState(pool, item, "quarantined", "blob_object_not_in_complete_listing");
        continue;
      }

      summary.eligible += 1;
      if (processed >= limit) continue;
      processed += 1;
      if (!apply) continue;

      try {
        const encrypted = await fetchEncryptedBlob(item.url);
        const sourcePhysicalSize = physical.get(item.url)?.size;
        if (!Number.isSafeInteger(sourcePhysicalSize) || sourcePhysicalSize !== encrypted.length) {
          throw new Error("source_encrypted_size_mismatch");
        }
        const clear = descifrarBytes(encrypted);
        if (clear.length !== item.bytes || hash(clear) !== item.sha256) {
          throw new Error("source_cleartext_integrity_mismatch");
        }
        const copy = await copyAndVerify(item, encrypted);
        summary.copiedAndVerified += 1;
        if (copy.reused) summary.alreadyCompleted += 1;
        summary.referencesUpdated += await updateReferences(
          pool, item, copy.url, copy.pathname, copy.encryptedHash, copy.encryptedBytes,
        );
      } catch (error) {
        summary.failed += 1;
        const code = errorCode(error);
        addError(summary, code);
        await recordState(pool, item, "failed", code).catch(() => undefined);
      }
    }

    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    if (summary.failed || summary.quarantined || summary.missingFromBlobListing) process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ error: errorCode(error) }) + "\n");
  process.exitCode = 1;
});
