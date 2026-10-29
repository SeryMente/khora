/**
 * Real SQL in isolated PostgreSQL/WASM. Uses synthetic auth, data, and encrypted
 * Blob bodies only. It never touches production services or claims concurrency.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import {
  cifrarBytes,
  cifrarTexto,
  descifrarBytes,
  descifrarTexto,
} from "../../lib/server/cripto";

const OWNER = "test@example.com";
const BLOB_HOST = "https://khora-test.blob.vercel-storage.com";
const sha256 = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");

async function main() {
  const entry = process.env.PGLITE_MODULE;
  if (!entry) throw new Error("PGLITE_MODULE required");

  process.env.PLAYWRIGHT_TEST_RUN = "1";
  process.env.AUTH_SECRET = "khora-custodia-integration-test-secret-only";
  process.env.X_KHORA_KEY = "a".repeat(64);
  process.env.AUTH_URL = "http://localhost";
  (globalThis as any).AsyncLocalStorage ??= AsyncLocalStorage;

  const { NextRequest } = await import("next/server");
  const { workUnitAsyncStorage } = await import(
    "next/dist/server/app-render/work-unit-async-storage.external"
  );
  const { workAsyncStorage } = await import(
    "next/dist/server/app-render/work-async-storage.external"
  );
  const { PGlite } = await import(pathToFileURL(entry).href);
  const pg = new PGlite();
  let checks = 0;

  const query = async (sql: string, params?: any[]) => {
    try {
      if (!params?.length && sql.includes(";")) {
        const result = (await pg.exec(sql)).at(-1) || { rows: [] };
        return { ...result, rowCount: result.affectedRows ?? result.rows.length };
      }
      const result = await pg.query(sql, params);
      return { ...result, rowCount: result.affectedRows ?? result.rows.length };
    } catch (error) {
      // SQL and synthetic parameters only; no real dictation or credentials are used here.
      console.error("[custodia pglite SQL failure]", JSON.stringify({
        sql,
        params,
        error: String(error),
      }));
      throw error;
    }
  };
  setDbForTesting({ query, connect: async () => ({ query, release() {} }) });

  // The verifier must read encrypted Blob bodies, decrypt them, and check size/hash.
  // This deterministic local fetch mock makes absent, truncated, and corrupt objects testable.
  const originalFetch = globalThis.fetch;
  const blobObjects = new Map<string, Buffer>();
  const blobOverrides = new Map<string, { status: number; body?: Buffer }>();
  const blobReads: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = input instanceof URL
      ? input.href
      : input instanceof Request
        ? input.url
        : String(input);
    blobReads.push(url);
    const override = blobOverrides.get(url);
    if (override) {
      return new Response(
        override.body ? new Uint8Array(override.body) : null,
        { status: override.status },
      );
    }
    const body = blobObjects.get(url);
    return body
      ? new Response(new Uint8Array(body), { status: 200 })
      : new Response(null, { status: 404 });
  }) as typeof fetch;

  try {
    const tokenTime = Math.floor(Date.now() / 1000);
    const token = {
      email: OWNER,
      name: "Custodia Integration Test",
      sub: "custodia-test-owner",
      iat: tokenTime,
      exp: tokenTime + 3600,
      jti: "custodia-integration-test",
    };
    const secret = process.env.AUTH_SECRET!;
    const plainCookie = "authjs.session-token";
    const secureCookie = "__Secure-authjs.session-token";
    const [plainToken, secureToken] = await Promise.all([
      encode({ token, secret, salt: plainCookie }),
      encode({ token, secret, salt: secureCookie }),
    ]);
    const cookie = `${plainCookie}=${plainToken}; ${secureCookie}=${secureToken}`;

    const { POST, GET } = await import("../../app/api/dictado/checkpoint/route");
    const url = "http://localhost/api/dictado/checkpoint";
    const withRequestContext = <T>(
      request: NextRequest,
      handler: (request: NextRequest) => Promise<T>,
    ): Promise<T> => {
      const workStore = { route: "/api/dictado/checkpoint", forceStatic: false, dynamicShouldError: false };
      const workUnitStore = {
        type: "request",
        phase: "render",
        headers: request.headers,
        asyncApiPromises: undefined,
      };
      return workAsyncStorage.run(workStore as any, () =>
        workUnitAsyncStorage.run(workUnitStore as any, () => handler(request)),
      );
    };
    const post = (body: any, recover = false, origin = "http://localhost") => {
      const request = new NextRequest(url + (recover ? "?recover=1" : ""), {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          origin,
          "content-type": "application/json",
          cookie,
          host: "localhost",
        },
      });
      return withRequestContext(request, POST);
    };
    const get = (queryString: string) => {
      const request = new NextRequest(url + queryString, {
        headers: { cookie, host: "localhost" },
      });
      return withRequestContext(request, GET);
    };

    const volcadoSource = await readFile("lib/server/volcados.ts", "utf8");
    const ddl = volcadoSource.match(/"(CREATE TABLE IF NOT EXISTS volcado \([^\n]+?)"\.replace/)![1]
      .replace("(%ARCHIVADO%)", "'archivado'");
    await pg.exec(ddl);
    const dictadoSource = await readFile("lib/server/dictado.ts", "utf8");
    await pg.exec(dictadoSource.match(/const SESSION_TABLES_SQL = `([\s\S]*?)`;/)![1]);
    for (const match of dictadoSource.match(/const ALTERS = \[([\s\S]*?)\];/)![1].matchAll(/"([^"]+)"/g)) {
      await pg.exec(match[1]);
    }
    for (const file of ["030_custodia_continua.sql", "031_custodia_reconciliacion.sql"]) {
      await pg.exec(await readFile("db/migrations/" + file, "utf8"));
    }
    const { asegurarCustodiaContinua } = await import("../../lib/server/custodia-schema");
    await asegurarCustodiaContinua();

    const bootstrapResponse = await get("?bootstrap=1");
    assert.equal(bootstrapResponse.status, 200, await bootstrapResponse.clone().text());
    assert.deepEqual(await bootstrapResponse.json(), { owner: OWNER });
    assert.ok(bootstrapResponse.headers.get("cache-control")?.includes("no-store"));
    checks++;

    const clearParts = [
      Buffer.from("synthetic audio part one - no private content"),
      Buffer.from("synthetic audio part two - no private content"),
      Buffer.from("synthetic audio part three - no private content"),
    ];
    const metadata = clearParts.map((bytes, index) => {
      const url = `${BLOB_HOST}/encrypted-${index + 1}`;
      blobObjects.set(url, cifrarBytes(bytes));
      return {
        parte: index + 1,
        bytes: bytes.length,
        sha256: sha256(bytes),
        verificado: true,
        url,
      };
    });

    const source = randomUUID();
    const initialRevision = randomUUID();
    const snapshot = {
      sessionId: source,
      revisionId: initialRevision,
      clientAt: 1000,
      texto: "Texto original conservado 😀",
      parcial: "pendiente",
      titulo: "Prueba",
      fuenteEntrada: "microfono",
      duracionSeg: 10,
      audioPartes: metadata.slice(0, 2),
      corteAudio: { hastaParte: 2, finMs: 10000 },
    };

    // A first text-only checkpoint exists before the audio is recorded.
    assert.equal((await post({
      ...snapshot,
      corteAudio: undefined,
      audioPartes: [],
    })).status, 200);

    for (const part of metadata) {
      await pg.query(
        `INSERT INTO dictado_audio_parte
          (session_id, part_index, blob_url, bytes, sha256, fuente_audio, mime_type, estado,
           start_ms, end_ms, duracion_ms, estado_verificacion)
         VALUES ($1, $2, $3, $4, $5, 'microphone', 'audio/webm', 'almacenado',
                 $6, $7, 5000, 'verificado')`,
        [source, part.parte, part.url, part.bytes, part.sha256, (part.parte - 1) * 5000, part.parte * 5000],
      );
    }

    snapshot.revisionId = randomUUID();
    assert.equal((await post(snapshot)).status, 200);
    checks++;

    assert.equal((await post({
      ...snapshot,
      revisionId: randomUUID(),
      corteAudio: { hastaParte: 2, finMs: 9999 },
    })).status, 409);
    assert.equal((await post({
      ...snapshot,
      revisionId: randomUUID(),
      audioPartes: [],
    })).status, 409);
    checks++;

    // Successful recovery checks the physical source objects, inserts only the
    // selected prefix, reads back the destination manifest, then re-verifies bytes.
    const target = randomUUID();
    const selection = { sourceSessionId: source, revisionId: snapshot.revisionId, sessionId: target };
    let response = await post(selection, true);
    assert.equal(response.status, 200, await response.clone().text());
    const recovered = await response.json();
    assert.equal(recovered.recovery.texto, snapshot.texto);
    assert.equal(recovered.recovery.audioPartes.length, 2);
    assert.equal(recovered.recovery.recuperadaDe.revisionId, snapshot.revisionId);
    assert.notEqual(recovered.recovery.revisionId, snapshot.revisionId);
    assert.equal(blobReads.filter((value) => value === metadata[0].url).length, 2);
    assert.equal(blobReads.filter((value) => value === metadata[1].url).length, 2);
    checks++;

    const storedRows = await pg.query(
      "SELECT session_id, part_index, blob_url FROM dictado_audio_parte ORDER BY session_id, part_index",
    );
    assert.equal(storedRows.rows.length, 5);
    assert.equal(storedRows.rows.filter((row: any) => row.session_id === source).length, 3);
    assert.equal(storedRows.rows.find((row: any) => row.session_id === target).blob_url, metadata[0].url);
    const originalCheckpoint = (await pg.query(
      "SELECT snapshot FROM dictado_checkpoint WHERE revision_id = $1",
      [snapshot.revisionId],
    )).rows[0];
    assert.equal(JSON.parse(descifrarTexto(originalCheckpoint.snapshot)).sessionId, source);
    checks++;

    response = await post(selection, true);
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).idempotent, true);
    assert.equal((await pg.query(
      "SELECT * FROM dictado_audio_parte WHERE session_id = $1",
      [target],
    )).rows.length, 2);
    checks++;

    // Missing, truncated, and hash-mismatched Blob objects must roll back before
    // a destination session or audio row is created; source rows remain untouched.
    const originalUrl = metadata[0].url;
    const missingUrl = `${BLOB_HOST}/missing-part`;
    await pg.query(
      "UPDATE dictado_audio_parte SET blob_url = $2 WHERE session_id = $1 AND part_index = 1",
      [source, missingUrl],
    );
    const missingTarget = randomUUID();
    response = await post({ ...selection, sessionId: missingTarget }, true);
    assert.equal(response.status, 503);
    assert.equal((await pg.query("SELECT 1 FROM dictado_session WHERE session_id = $1", [missingTarget])).rows.length, 0);
    assert.equal((await pg.query("SELECT 1 FROM dictado_audio_parte WHERE session_id = $1", [missingTarget])).rows.length, 0);
    await pg.query(
      "UPDATE dictado_audio_parte SET blob_url = $2 WHERE session_id = $1 AND part_index = 1",
      [source, originalUrl],
    );
    checks++;

    const truncatedUrl = `${BLOB_HOST}/truncated-part`;
    blobOverrides.set(truncatedUrl, { status: 200, body: cifrarBytes(Buffer.from("truncated")) });
    await pg.query(
      "UPDATE dictado_audio_parte SET blob_url = $2 WHERE session_id = $1 AND part_index = 1",
      [source, truncatedUrl],
    );
    const truncatedTarget = randomUUID();
    response = await post({ ...selection, sessionId: truncatedTarget }, true);
    assert.equal(response.status, 503);
    assert.equal((await pg.query("SELECT 1 FROM dictado_session WHERE session_id = $1", [truncatedTarget])).rows.length, 0);
    await pg.query(
      "UPDATE dictado_audio_parte SET blob_url = $2 WHERE session_id = $1 AND part_index = 1",
      [source, originalUrl],
    );
    blobOverrides.delete(truncatedUrl);
    checks++;

    const wrongHash = "b".repeat(64);


    await pg.query(
      "UPDATE dictado_audio_parte SET sha256 = $2 WHERE session_id = $1 AND part_index = 1",
      [source, wrongHash],
    );
    const wrongHashTarget = randomUUID();
    response = await post({ ...selection, sessionId: wrongHashTarget }, true);
    assert.equal(response.status, 503);
    assert.equal((await pg.query("SELECT 1 FROM dictado_session WHERE session_id = $1", [wrongHashTarget])).rows.length, 0);
    await pg.query(
      "UPDATE dictado_audio_parte SET sha256 = $2 WHERE session_id = $1 AND part_index = 1",
      [source, metadata[0].sha256],
    );
    checks++;

    // Legacy snapshots can have zero or absent corteAudio while rows still hold
    // verified originals. Recovery preserves their parts but removes false pairing.
    const createLegacySession = async (zeroCut: boolean) => {
      const sessionId = randomUUID();
      const revisionId = randomUUID();
      const text = zeroCut ? "legacy with an explicit empty cut" : "legacy without a cut";
      const legacy: Record<string, any> = {
        sessionId,
        revisionId,
        clientAt: Date.now(),
        texto: text,
        parcial: "",
        titulo: "Legacy",
        fuenteEntrada: "microfono",
        duracionSeg: 10,
        audioPartes: [],
      };
      if (zeroCut) legacy.corteAudio = { hastaParte: 0, finMs: 0 };
      const textHash = sha256(Buffer.from(text));
      await pg.query(
        `INSERT INTO dictado_session
          (session_id, estado, custodia_owner, checkpoint_usuario, checkpoint_en, checkpoint_text, checkpoint_sha256)
         VALUES ($1, 'checkpoint', $2, $2, now(), $3, $4)`,
        [sessionId, OWNER, cifrarTexto(text), textHash],
      );
      await pg.query(
        `INSERT INTO dictado_checkpoint (revision_id, session_id, usuario, client_at, texto, sha256, snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [revisionId, sessionId, OWNER, legacy.clientAt, cifrarTexto(text), textHash, cifrarTexto(JSON.stringify(legacy))],
      );
      await pg.query(
        `INSERT INTO dictado_audio_parte
          (session_id, part_index, blob_url, blob_path, bytes, sha256, fuente_audio, original_name,
           mime_type, estado, start_ms, end_ms, duracion_ms, estado_verificacion)
         SELECT $1, part_index, blob_url, blob_path, bytes, sha256, fuente_audio, original_name,
                mime_type, estado, start_ms, end_ms, duracion_ms, estado_verificacion
         FROM dictado_audio_parte WHERE session_id = $2 AND part_index <= 2`,
        [sessionId, source],
      );
      return { sessionId, revisionId, text };
    };

    for (const zeroCut of [true, false]) {
      const legacy = await createLegacySession(zeroCut);
      const legacyTarget = randomUUID();
      response = await post({
        sourceSessionId: legacy.sessionId,
        revisionId: legacy.revisionId,
        sessionId: legacyTarget,
      }, true);
      assert.equal(response.status, 200, await response.clone().text());
      const recovery = (await response.json()).recovery;
      assert.equal(recovery.texto, legacy.text);
      assert.equal(recovery.audioPartes.length, 2);
      assert.equal(recovery.corteAudio, undefined, "legacy audio must not be falsely marked synchronized");
      assert.equal((await pg.query(
        "SELECT count(*)::int AS n FROM dictado_audio_parte WHERE session_id = $1",
        [legacyTarget],
      )).rows[0].n, 2);
      checks++;
    }

    // Ownership, origin, cursor paging, and sealed-session guards remain enforced.
    assert.equal((await post(selection, true, "https://hostile.invalid")).status, 403);
    assert.equal((await post({ ...selection, sessionId: source }, true)).status, 400);
    checks++;

    const other = randomUUID();
    await pg.query(
      "INSERT INTO dictado_session(session_id, custodia_owner) VALUES ($1, 'other@example.com')",
      [other],
    );
    assert.equal((await get("?revisions=1&sessionId=" + other)).status, 404);
    assert.equal((await post({
      sourceSessionId: other,
      revisionId: snapshot.revisionId,
      sessionId: randomUUID(),
    }, true)).status, 404);
    checks++;

    const catalogResponse = await get("?catalog=1");
    assert.equal(catalogResponse.status, 200);
    const catalog = await catalogResponse.json();
    assert.equal(catalog.owner, OWNER);
    assert.equal(catalog.items.find((item: any) => item.sessionId === source).audioParts, 2);
    assert.equal(catalog.items.find((item: any) => item.sessionId === source).storedAudioParts, 3);
    assert.ok(!catalog.items.some((item: any) => item.sessionId === other));
    assert.equal((await get("?catalog=1&cursor=invalid")).status, 400);
    checks++;

    const versionsResponse = await get("?revisions=1&sessionId=" + source);
    assert.equal(versionsResponse.status, 200);
    assert.equal((await versionsResponse.json()).items.length, 2);
    checks++;

    await pg.exec("ALTER TABLE dictado_session ALTER COLUMN checkpoint_en TYPE TEXT USING checkpoint_en::text");
    const legacyCatalog = await get("?catalog=1");
    assert.equal(legacyCatalog.status, 200, "legacy checkpoint_en TEXT must not break catalog");
    assert.equal((await legacyCatalog.json()).items.find((item: any) => item.sessionId === source).audioParts, 2);
    await pg.exec("ALTER TABLE dictado_session ALTER COLUMN checkpoint_en TYPE TIMESTAMPTZ USING checkpoint_en::timestamptz");
    checks++;

    await pg.query(
      "UPDATE dictado_audio_parte SET estado_verificacion = 'pendiente' WHERE session_id = $1 AND part_index = 2",
      [source],
    );
    assert.equal((await post({
      ...selection,
      sessionId: randomUUID(),
    }, true)).status, 409);
    await pg.query(
      "UPDATE dictado_audio_parte SET estado_verificacion = 'verificado' WHERE session_id = $1",
      [source],
    );
    checks++;

    await pg.query("UPDATE dictado_session SET estado = 'complete' WHERE session_id = $1", [target]);
    assert.equal((await post(selection, true)).status, 409);
    await pg.query("UPDATE dictado_session SET estado = 'complete' WHERE session_id = $1", [source]);
    assert.equal((await post({ ...selection, sessionId: randomUUID() }, true)).status, 409);
    checks++;

    const audio = Buffer.from("synthetic audio bytes, no private content");
    assert.deepEqual(descifrarBytes(cifrarBytes(audio)), audio);
    checks++;

    console.log(JSON.stringify({
      status: "PASS",
      checks,
      realSQL: true,
      engine: "PostgreSQL/PGlite WASM",
      blobVerification: "synthetic encrypted objects; accessible, missing, truncated, wrong hash",
      productionServices: false,
      concurrentConnections: false,
    }));
  } finally {
    globalThis.fetch = originalFetch;
    resetDbForTesting();
    await pg.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
