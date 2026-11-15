import { auth } from "@/auth";
import { cifrarStream } from "@/lib/server/cripto";
import { getDb } from "@/lib/server/neon";
import { putEncryptedObjectStream } from "@/lib/server/object-storage";
import { createHash, randomUUID } from "node:crypto";
import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const EXPECTED = {
  rows: "11413",
  minRevisionId: "000632d8-0500-4819-9f4e-dfc63d35cb02",
  maxRevisionId: "fffa2e53-d767-4d8d-b69a-e56a9809a088",
  oldest: "2026-10-17T18:38:45.451Z",
  newest: "2026-11-13T23:25:51.849Z",
} as const;
const CONFIRM = "BACKUP_AND_TRUNCATE_DICTADO_CHECKPOINTS";
const BACKUP_PATH = "backups/dictado_checkpoint/checkpoints_backup_historico-11413-fffa2e53d7674d8db69ae56a9809a088.jsonl.gz.khc";
const PAGE_SIZE = 100;

type Baseline = {
  row_count: string;
  min_revision_id: string | null;
  max_revision_id: string | null;
  oldest: Date | string | null;
  newest: Date | string | null;
};

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

async function operatorSession() {
  const session = await auth();
  const email = String(session?.user?.email || "").trim().toLowerCase();
  const allowed = String(
    process.env.VAULT_AGENT_ALLOWED_EMAIL || process.env.EP_ALLOWED_EMAIL || "",
  ).trim().toLowerCase();
  return email && allowed && email === allowed ? email : null;
}

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function baselineMatches(row: Baseline) {
  return (
    row.row_count === EXPECTED.rows &&
    row.min_revision_id === EXPECTED.minRevisionId &&
    row.max_revision_id === EXPECTED.maxRevisionId &&
    iso(row.oldest) === EXPECTED.oldest &&
    iso(row.newest) === EXPECTED.newest
  );
}


async function* gzipStream(source: AsyncIterable<Uint8Array>): AsyncGenerator<Buffer> {
  const input = Readable.from(source);
  const gzip = createGzip({ level: 3 });
  const output = new PassThrough();
  const pumping = pipeline(input, gzip, output);
  let completed = false;
  try {
    for await (const chunk of output) yield Buffer.from(chunk);
    await pumping;
    completed = true;
  } finally {
    if (!completed) {
      input.destroy();
      gzip.destroy();
      output.destroy();
      await pumping.catch(() => undefined);
    }
  }
}

function line(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value) + "\n", "utf8");
}

async function* exportCheckpointJsonl(
  client: { query: (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  baseline: Baseline,
  stats: { rows: number; bytes: number; plaintextSha256: string | null },
): AsyncGenerator<Buffer> {
  const digest = createHash("sha256");
  const manifest = line({
    type: "manifest",
    format: "khora-dictado-checkpoint-jsonl-v1",
    source_table: "public.dictado_checkpoint",
    exported_at: new Date().toISOString(),
    row_count: baseline.row_count,
    min_revision_id: baseline.min_revision_id,
    max_revision_id: baseline.max_revision_id,
    oldest: iso(baseline.oldest),
    newest: iso(baseline.newest),
    columns: ["revision_id", "session_id", "usuario", "client_at", "texto", "sha256", "snapshot", "creado_en"],
  });
  digest.update(manifest);
  stats.bytes += manifest.length;
  yield manifest;

  let lastRevision: string | null = null;
  while (true) {
    const result = lastRevision
      ? await client.query(
          `SELECT revision_id::text AS revision_id, session_id, usuario, client_at, texto, sha256, snapshot, creado_en::text AS creado_en
           FROM public.dictado_checkpoint
           WHERE revision_id > $1::uuid
           ORDER BY revision_id ASC
           LIMIT $2`,
          [lastRevision, PAGE_SIZE],
        )
      : await client.query(
          `SELECT revision_id::text AS revision_id, session_id, usuario, client_at, texto, sha256, snapshot, creado_en::text AS creado_en
           FROM public.dictado_checkpoint
           ORDER BY revision_id ASC
           LIMIT $1`,
          [PAGE_SIZE],
        );

    if (!result.rows.length) break;
    for (const row of result.rows) {
      const record = line({ type: "checkpoint", data: row });
      digest.update(record);
      stats.bytes += record.length;
      stats.rows += 1;
      lastRevision = String(row.revision_id);
      yield record;
    }
  }

  if (stats.rows !== Number(baseline.row_count)) {
    throw new Error("checkpoint_backup_export_count_mismatch");
  }
  const trailer = line({ type: "end", exported_rows: stats.rows });
  digest.update(trailer);
  stats.bytes += trailer.length;
  stats.plaintextSha256 = digest.digest("hex");
  yield trailer;
}

export async function GET() {
  if (!(await operatorSession())) return new NextResponse("No autorizado", { status: 401 });
  const db = getDb();
  const result = await db.query(
    `SELECT count(*)::text AS row_count,
       (SELECT revision_id::text FROM public.dictado_checkpoint ORDER BY revision_id ASC LIMIT 1) AS min_revision_id,
       (SELECT revision_id::text FROM public.dictado_checkpoint ORDER BY revision_id DESC LIMIT 1) AS max_revision_id,
       min(creado_en) AS oldest, max(creado_en) AS newest
     FROM public.dictado_checkpoint`,
  );
  const current = result.rows[0] as Baseline;
  if (!baselineMatches(current)) {
    return reply({ error: "baseline_no_coincide", row_count: current.row_count, operation_enabled: false }, 409);
  }

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Respaldo histórico de checkpoints</title></head>
<body style="font:16px system-ui;max-width:760px;margin:48px auto;padding:0 20px;color:#172033">
<h1>Respaldo histórico de Custodia</h1>
<p>Conjunto autorizado: <strong>${EXPECTED.rows} filas</strong> en <code>public.dictado_checkpoint</code>.</p>
<p>Se exportarán todas las columnas en JSONL, se comprimirán y cifrarán con KHC2/AES-256-GCM, se cargarán como un único objeto multipart en B2 y se descargarán nuevamente para cotejar longitud y SHA-256.</p>
<p><strong>Solo después del read-back íntegro</strong> se ejecutará <code>TRUNCATE TABLE public.dictado_checkpoint</code>. Si cambia la huella del conjunto, falla la carga o difiere el read-back, el proceso abortará y conservará las filas originales.</p>
<form method="post">
<input type="hidden" name="expectedRows" value="${EXPECTED.rows}">
<input type="hidden" name="confirm" value="${CONFIRM}">
<button type="submit" style="padding:14px 20px;font-size:16px;background:#172033;color:white;border:0;border-radius:8px;cursor:pointer">Respaldar, verificar y liberar los checkpoints</button>
</form>
</body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await operatorSession())) return reply({ error: "no_autorizado" }, 401);
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).origin !== req.nextUrl.origin) return reply({ error: "origen_no_permitido" }, 403);

  const form = await req.formData().catch(() => null);
  if (!form || form.get("confirm") !== CONFIRM || form.get("expectedRows") !== EXPECTED.rows) {
    return reply({ error: "confirmacion_invalida" }, 400);
  }

  const client = await getDb().connect();
  let transactionOpen = false;
  let truncateCommitAttempted = false;
  let truncateCommitted = false;
  let backup: Awaited<ReturnType<typeof putEncryptedObjectStream>> | null = null;
  let exportStats = { rows: 0, bytes: 0, plaintextSha256: null as string | null };

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SET LOCAL lock_timeout = '30000ms'");
    // SHARE blocks new INSERT/UPDATE/DELETE while preserving ordinary SELECT access.
    await client.query("LOCK TABLE public.dictado_checkpoint IN SHARE MODE");

    const baselineResult = await client.query(
      `SELECT count(*)::text AS row_count,
         (SELECT revision_id::text FROM public.dictado_checkpoint ORDER BY revision_id ASC LIMIT 1) AS min_revision_id,
         (SELECT revision_id::text FROM public.dictado_checkpoint ORDER BY revision_id DESC LIMIT 1) AS max_revision_id,
         min(creado_en) AS oldest, max(creado_en) AS newest
       FROM public.dictado_checkpoint`,
    );
    const baseline = baselineResult.rows[0] as Baseline;
    if (!baselineMatches(baseline)) throw new Error("checkpoint_backup_baseline_changed");

    const compressed = gzipStream(exportCheckpointJsonl(client, baseline, exportStats));
    const encrypted = cifrarStream(compressed);
    backup = await putEncryptedObjectStream(
      BACKUP_PATH,
      encrypted,
      { contentType: "application/octet-stream" },
    );

    if (
      exportStats.rows !== Number(EXPECTED.rows) ||
      !exportStats.plaintextSha256 ||
      backup.readbackVerified !== true ||
      backup.bytes <= 0 ||
      !/^[a-f0-9]{64}$/i.test(backup.sha256)
    ) throw new Error("checkpoint_backup_readback_gate_failed");

    // Upgrade the same transaction's table lock only after the B2 read-back is proven.
    await client.query("LOCK TABLE public.dictado_checkpoint IN ACCESS EXCLUSIVE MODE");
    const finalCount = await client.query("SELECT count(*)::text AS row_count FROM public.dictado_checkpoint");
    if (finalCount.rows[0]?.row_count !== EXPECTED.rows) {
      throw new Error("checkpoint_backup_count_changed_before_truncate");
    }

    await client.query("TRUNCATE TABLE public.dictado_checkpoint");
    const insideCount = await client.query("SELECT count(*)::text AS row_count FROM public.dictado_checkpoint");
    if (insideCount.rows[0]?.row_count !== "0") {
      throw new Error("checkpoint_truncate_postcondition_failed");
    }
    truncateCommitAttempted = true;
    await client.query("COMMIT");
    truncateCommitted = true;
    transactionOpen = false;

    const after = await client.query(
      `SELECT count(*)::text AS row_count,
         pg_total_relation_size('public.dictado_checkpoint')::text AS relation_bytes
       FROM public.dictado_checkpoint`,
    );

    let writeProbe = false;
    let writeProbeError: string | null = null;
    try {
      await client.query("BEGIN");
      const probeSessionId = randomUUID();
      const probeRevisionId = randomUUID();
      const probeOwner = "khora-checkpoint-storage-probe@invalid";
      const probeText = "khora-neon-storage-write-probe";
      await client.query(
        "INSERT INTO public.dictado_session(session_id, estado, custodia_owner) VALUES($1, 'checkpoint', $2)",
        [probeSessionId, probeOwner],
      );
      await client.query(
        `INSERT INTO public.dictado_checkpoint
          (revision_id, session_id, usuario, client_at, texto, sha256, snapshot)
         VALUES($1, $2, $3, $4, $5, $6, $7)`,
        [
          probeRevisionId,
          probeSessionId,
          probeOwner,
          Date.now(),
          probeText,
          createHash("sha256").update(probeText).digest("hex"),
          JSON.stringify({ probe: true }),
        ],
      );
      await client.query("ROLLBACK");
      writeProbe = true;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      writeProbeError = (error as Error & { code?: string }).code || "write_probe_failed";
    }

    const afterProbe = await client.query(
      "SELECT count(*)::text AS row_count FROM public.dictado_checkpoint",
    );
    const rowsCurrent = String(afterProbe.rows[0]?.row_count ?? "unknown");
    const result = {
      ok: true,
      backed_up_rows: exportStats.rows,
      backup_bytes: backup.bytes,
      backup_sha256: backup.sha256,
      backup_plaintext_bytes: exportStats.bytes,
      backup_plaintext_sha256: exportStats.plaintextSha256,
      backup_b2_key: backup.pathname,
      backup_part_count: backup.partCount,
      backup_readback_verified: backup.readbackVerified,
      truncate_committed: true,
      rows_after_truncate_in_transaction: "0",
      rows_current: rowsCurrent,
      relation_bytes_after_truncate: after.rows[0]?.relation_bytes ?? null,
      neon_write_probe: writeProbe ? "PASS_ROLLED_BACK" : "FAIL",
      neon_write_probe_error_code: writeProbeError,
    };
    return reply(result, rowsCurrent === "0" && writeProbe ? 200 : 207);
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => undefined);
    const code = (error as Error & { code?: string }).code || null;
    const message = error instanceof Error ? error.message : "checkpoint_backup_failed";
    let actualRows: string | null = null;
    try {
      const check = await client.query("SELECT count(*)::text AS row_count FROM public.dictado_checkpoint");
      actualRows = String(check.rows[0]?.row_count ?? "unknown");
    } catch {
      actualRows = null;
    }
    const committedByReadback = truncateCommitAttempted && actualRows === "0";
    const knownCommitted = truncateCommitted || committedByReadback;
    const knownPreserved = actualRows === EXPECTED.rows;
    const status = message === "checkpoint_backup_baseline_changed" ? 409 : 500;
    return reply({
      ok: false,
      error: message,
      sqlstate: code,
      truncate_committed: knownCommitted ? true : truncateCommitAttempted ? "unknown" : false,
      truncate_outcome: knownCommitted ? "committed" : knownPreserved ? "rolled_back_preserved" : "unknown",
      original_rows_preserved: knownPreserved,
      rows_after_error: actualRows,
      backup: {
        b2_key: backup?.pathname || BACKUP_PATH,
        bytes: backup?.bytes ?? null,
        sha256: backup?.sha256 ?? null,
        readback_verified: backup?.readbackVerified ?? false,
      },
      exported_rows_before_failure: exportStats.rows,
    }, status);
  } finally {
    client.release();
  }
}
