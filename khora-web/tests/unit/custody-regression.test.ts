// @l0 L0-002-R · @req L0-003/CUSTODIA · @acr CUSTODY-IDEMPOTENCY/01
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

process.env.X_KHORA_KEY = "0123456789abcdef0123456789abcdef";

import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { cifrarTexto } from "../../lib/server/cripto";
import { guardarDictado, registrarParteAudio } from "../../lib/server/dictado";

const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

type FakeState = {
  session: any;
  parts: any[];
  volume: any | null;
  versions: any[];
  log: Array<{ sql: string; params: any[]; channel: "pool" | "client" }>;
  volumeInsertCount: number;
};

function makeDb(state: FakeState) {
  const run = async (channel: "pool" | "client", sql: string, params: any[] = []): Promise<any> => {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    state.log.push({ sql: normalized, params, channel });

    if (normalized.includes("insert into dictado_session")) {
      if (!state.session) {
        state.session = { session_id: params[0], volcado_id: null, estado: "uploading" };
      }
      return { rows: [{ session_id: state.session.session_id }], rowCount: 1 };
    }

    if (normalized.includes("select session_id, volcado_id, estado from dictado_session")) {
      return { rows: state.session ? [{ ...state.session }] : [], rowCount: state.session ? 1 : 0 };
    }

    if (normalized.includes("select * from volcado where id = $1 for update")) {
      const row = state.volume ? {
        ...state.volume, folio: 1, titulo: "Custody regression", origen: "web",
        driver: "dictado", usuario: "custody-test", recibido_en: new Date(),
        io_id: null, intentos: 0, ultimo_error: null, ultimo_intento: null,
        version_aprobada: null,
      } : null;
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }

    if (normalized.includes("select coalesce(max(version), 0)::int as ultima")) {
      const versions = state.versions.filter((v) => v.volcado_id === params[0]);
      return { rows: [{ ultima: versions.reduce((max, v) => Math.max(max, Number(v.version)), 0) }], rowCount: 1 };
    }

    if (normalized.includes("select part_index, bytes, sha256, fuente_audio, estado_verificacion")) {
      return { rows: state.parts.map((p) => ({ ...p })), rowCount: state.parts.length };
    }

    if (normalized.includes("select id, texto, sha256, chars, audio_partes, estado, session_id from volcado")) {
      return { rows: state.volume ? [{ ...state.volume }] : [], rowCount: state.volume ? 1 : 0 };
    }

    if (normalized.includes("select version from volcado_version")) {
      return { rows: state.versions.map((v) => ({ ...v })), rowCount: state.versions.length };
    }

    if (normalized.startsWith("insert into volcado_version ")) {
      state.versions.push({
        id: params[0], volcado_id: params[1], version: params[2],
        texto: params[3], sha256: params[4], chars: params[5], motivo: params[6],
      });
      return { rows: [], rowCount: 1 };
    }

    if (normalized.startsWith("insert into volcado ")) {
      state.volumeInsertCount += 1;
      const row = {
        id: params[0],
        texto: params[1],
        sha256: params[2],
        chars: params[3],
        titulo: params[4],
        origen: params[5],
        driver: params[6],
        usuario: params[7],
        estado: "archivado",
        io_id: null,
        audio_partes: params[14],
        session_id: params[15],
        folio: 1,
        recibido_en: new Date(),
        version_aprobada: null,
      };
      state.volume = row;
      return { rows: [row], rowCount: 1 };
    }

    if (normalized.startsWith("update volcado set estado = 'archivado'")) {
      if (state.volume) {
        state.volume.estado = "archivado";
        state.volume.ultimo_error = params[1] ?? null;
      }
      return { rows: [], rowCount: state.volume ? 1 : 0 };
    }

    if (normalized.startsWith("select id, folio, texto, sha256, chars, titulo, origen, driver, usuario, recibido_en, estado, io_id, intentos, ultimo_error, ultimo_intento, version_aprobada from volcado where id = $1")) {
      return { rows: state.volume ? [{
        ...state.volume,
        folio: 1,
        io_id: null,
        intentos: 0,
        ultimo_error: state.volume.ultimo_error ?? null,
        ultimo_intento: null,
        version_aprobada: null,
      }] : [], rowCount: state.volume ? 1 : 0 };
    }

    if (normalized.startsWith("update volcado set estado = 'pendiente_revision'")) {
      if (state.volume) state.volume.estado = "pendiente_revision";
      return { rows: [], rowCount: 1 };
    }

    if (normalized.startsWith("update volcado set estado = 'en_revision'")) {
      if (!state.volume) return { rows: [], rowCount: 0 };
      state.volume.estado = "en_revision";
      return { rows: [{
        id: state.volume.id, folio: 1, texto: state.volume.texto, sha256: state.volume.sha256,
        chars: state.volume.chars, titulo: state.volume.titulo, origen: state.volume.origen,
        driver: state.volume.driver, usuario: state.volume.usuario, recibido_en: new Date(),
        estado: "en_revision", io_id: null, intentos: 0, ultimo_error: null,
        ultimo_intento: null, version_aprobada: null,
      }], rowCount: 1 };
    }

    if (normalized.includes("insert into dictado_audio_parte")) {
      const [sessionId, partIndex, blobUrl, blobPath, bytes, sha256, source, verified, startMs, endMs, durationMs, originalName, mimeType] = params;
      const existing = state.parts.find((p) => p.session_id === sessionId && p.part_index === partIndex);
      if (existing && (
        Number(existing.bytes) !== Number(bytes) ||
        String(existing.sha256).toLowerCase() !== String(sha256).toLowerCase() ||
        existing.fuente_audio !== source ||
        (existing.original_name ?? originalName ?? null) !== (originalName ?? existing.original_name ?? null) ||
        (existing.mime_type ?? mimeType ?? null) !== (mimeType ?? existing.mime_type ?? null)
      )) {
        return { rows: [], rowCount: 0 };
      }
      if (existing) {
        existing.blob_url = blobUrl;
        existing.blob_path = blobPath;
        existing.estado_verificacion = verified;
        existing.original_name = existing.original_name ?? originalName ?? null;
        existing.mime_type = existing.mime_type ?? mimeType ?? null;
      } else {
        state.parts.push({
          session_id: sessionId, part_index: partIndex, blob_url: blobUrl,
          blob_path: blobPath, bytes, sha256, fuente_audio: source,
          estado_verificacion: verified, start_ms: startMs, end_ms: endMs,
          duracion_ms: durationMs, original_name: originalName ?? null, mime_type: mimeType ?? null,
        });
      }
      return { rows: [{ part_index: partIndex }], rowCount: 1 };
    }

    if (normalized.includes("update dictado_session") && normalized.includes("set volcado_id = $1")) {
      if (state.session && !state.session.volcado_id) {
        state.session.volcado_id = params[0];
        state.session.estado = "complete";
        return { rows: [{ ...state.session }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (normalized.includes("update dictado_audio_parte set volcado_id")) {
      state.parts.forEach((p) => { if (p.session_id === params[1]) p.volcado_id = params[0]; });
      return { rows: [], rowCount: state.parts.length };
    }

    // Event chain and read-only schema checks use additional SQL; they do not affect
    // the archive/session state modeled by these regression tests.
    return { rows: [], rowCount: 0 };
  };

  return {
    query: (sql: string, params: any[] = []) => run("pool", sql, params),
    connect: async () => ({
      query: (sql: string, params: any[] = []) => run("client", sql, params),
      release: () => undefined,
    }),
  };
}

function seedLinkedArchive(texto: string, sessionId = "session-archive-001") {
  const volcadoId = "a7b8fef4-6b0c-4db0-8c47-8ce1a99d48a1";
  const state: FakeState = {
    session: { session_id: sessionId, volcado_id: volcadoId, estado: "complete" },
    parts: [],
    volume: {
      id: volcadoId,
      texto: cifrarTexto(texto),
      sha256: hash(texto),
      chars: texto.length,
      audio_partes: null,
      session_id: sessionId,
      estado: "en_revision",
    },
    versions: [{ version: 1 }],
    log: [],
    volumeInsertCount: 0,
  };
  return { state, volcadoId, sessionId };
}

test("CUSTODY-01: retrying the same session returns the sealed volcado instead of inserting a duplicate", async () => {
  const texto = "Original inmutable del operador.";
  const { state, volcadoId, sessionId } = seedLinkedArchive(texto);
  setDbForTesting(makeDb(state) as any);
  try {
    const result = await guardarDictado({ texto, sessionId, usuario: "custody-test@example.invalid" });
    assert.equal(result.id, volcadoId);
    assert.equal(result.idempotent, true);
    assert.equal(state.volumeInsertCount, 0);
    assert.equal(state.volume?.id, volcadoId);
    assert.equal(state.volume?.sha256, hash(texto));
  } finally {
    resetDbForTesting();
  }
});

test("CUSTODY-02: a retry that changes text under an archived session is rejected and leaves the original untouched", async () => {
  const textoOriginal = "Original inmutable del operador.";
  const { state, volcadoId, sessionId } = seedLinkedArchive(textoOriginal);
  const originalCiphertext = state.volume.texto;
  const originalSha = state.volume.sha256;
  setDbForTesting(makeDb(state) as any);
  try {
    await assert.rejects(
      () => guardarDictado({ texto: "Texto distinto que intenta sustituir el original.", sessionId }),
      /Conflicto de idempotencia/,
    );
    assert.equal(state.volumeInsertCount, 0);
    assert.equal(state.volume.id, volcadoId);
    assert.equal(state.volume.texto, originalCiphertext);
    assert.equal(state.volume.sha256, originalSha);
  } finally {
    resetDbForTesting();
  }
});

test("CUSTODY-03: client-declared verified audio without a matching server manifest cannot be archived", async () => {
  const sessionId = "session-without-stored-parts";
  const state: FakeState = {
    session: { session_id: sessionId, volcado_id: null, estado: "uploading" },
    parts: [],
    volume: null,
    versions: [],
    log: [],
    volumeInsertCount: 0,
  };
  setDbForTesting(makeDb(state) as any);
  try {
    await assert.rejects(
      () => guardarDictado({
        texto: "Texto con audio que no existe en custodia del servidor.",
        sessionId,
        fuenteEntrada: "microfono",
        audioPartes: [{
          parte: 1,
          url: "https://blob.invalid/fake.webm.khc",
          bytes: 1024,
          sha256: "b".repeat(64),
          estadoVerificacion: "verificado",
          verificado: true,
        }],
      }),
      /la sesión registra 0 partes pero el archivado recibió 1/,
    );
    assert.equal(state.volumeInsertCount, 0);
    assert.equal(state.volume, null);
    assert.equal(state.session.volcado_id, null);
  } finally {
    resetDbForTesting();
  }
});

test("CUSTODY-04: a stored transcript that no longer matches its sealed SHA cannot pass idempotency checks", async () => {
  const texto = "Original inmutable del operador.";
  const { state, sessionId } = seedLinkedArchive(texto);
  state.volume.sha256 = "f".repeat(64);
  setDbForTesting(makeDb(state) as any);
  try {
    await assert.rejects(
      () => guardarDictado({ texto, sessionId }),
      /el texto archivado ya no coincide con su SHA-256 sellado/,
    );
    assert.equal(state.volumeInsertCount, 0);
  } finally {
    resetDbForTesting();
  }
});

test("CUSTODY-05: retrying an audio part with different bytes/hash is rejected without replacing the first part", async () => {
  const state: FakeState = {
    session: { session_id: "session-part-001", volcado_id: null, estado: "uploading" },
    parts: [],
    volume: null,
    versions: [],
    log: [],
    volumeInsertCount: 0,
  };
  setDbForTesting(makeDb(state) as any);
  try {
    const original = {
      sessionId: "session-part-001",
      partIndex: 1,
      blobUrl: "https://blob.invalid/part-original.webm.khc",
      blobPath: "dictado/session-part-001/1.webm.khc",
      bytes: 1024,
      sha256: "c".repeat(64),
      fuenteAudio: "microphone" as const,
      estadoVerificacion: "verificado" as const,
    };
    await registrarParteAudio(original);
    await assert.rejects(
      () => registrarParteAudio({ ...original, blobUrl: "https://blob.invalid/part-replacement.webm.khc", bytes: 2048, sha256: "d".repeat(64) }),
      /Conflicto de custodia en la parte 1/,
    );
    assert.equal(state.parts.length, 1);
    assert.equal(state.parts[0].blob_url, original.blobUrl);
    assert.equal(state.parts[0].bytes, original.bytes);
    assert.equal(state.parts[0].sha256, original.sha256);
  } finally {
    resetDbForTesting();
  }
});

test("CUSTODY-06: text-only capture with a stable session ID archives without inventing an audio requirement", async () => {
  const sessionId = "session-text-only-001";
  const texto = "Texto manual que debe poder archivarse sin audio.";
  const state: FakeState = {
    session: null,
    parts: [],
    volume: null,
    versions: [],
    log: [],
    volumeInsertCount: 0,
  };
  setDbForTesting(makeDb(state) as any);
  try {
    const result = await guardarDictado({
      texto,
      sessionId,
      fuenteEntrada: "texto",
      usuario: "custody-test@example.invalid",
    });
    assert.equal(result.sessionId, sessionId);
    assert.equal(result.idempotent, false);
    assert.equal(state.volumeInsertCount, 1);
    assert.equal(state.session?.volcado_id, result.id);
    assert.equal(state.session?.estado, "complete");
    assert.equal(state.volume?.estado, "en_revision");
    assert.equal(state.volume?.sha256, hash(texto));
    assert.equal(state.parts.length, 0);
    assert.equal(state.versions.length, 1);
  } finally {
    resetDbForTesting();
  }
});


test("CUSTODY-08: verified imported audio can be archived even when transcription is empty", async () => {
  const sessionId = "session-imported-audio-008";
  const audioBytes = Buffer.from("synthetic-original-audio");
  const audioSha = createHash("sha256").update(audioBytes).digest("hex");
  const audioUrl = "https://blob.invalid/imported-audio.mp3.khc";
  const state: FakeState = {
    session: { session_id: sessionId, volcado_id: null, estado: "uploading" },
    parts: [],
    volume: null,
    versions: [],
    log: [],
    volumeInsertCount: 0,
  };
  setDbForTesting(makeDb(state) as any);
  try {
    await registrarParteAudio({
      sessionId,
      partIndex: 1,
      blobUrl: audioUrl,
      blobPath: `dictado/${sessionId}/1.mp3.khc`,
      bytes: audioBytes.length,
      sha256: audioSha,
      fuenteAudio: "audio_archivo",
      nombreOriginal: "entrada-prueba.mp3",
      mimeType: "audio/mpeg",
      estadoVerificacion: "verificado",
    });
    const result = await guardarDictado({
      texto: "",
      sessionId,
      fuenteEntrada: "audio_archivo",
      audioUrl,
      audioBytes: audioBytes.length,
      estadoTranscripcion: "fallido",
      audioPartes: [{
        parte: 1,
        url: audioUrl,
        bytes: audioBytes.length,
        sha256: audioSha,
        fuenteAudio: "audio_archivo",
        nombreOriginal: "entrada-prueba.mp3",
        mimeType: "audio/mpeg",
        estadoVerificacion: "verificado",
        verificado: true,
      }],
      usuario: "custody-test@example.invalid",
    });
    assert.equal(result.sessionId, sessionId);
    assert.equal(state.volumeInsertCount, 1);
    assert.equal(state.session?.volcado_id, result.id);
    assert.equal(state.session?.estado, "complete");
    assert.equal(state.volume?.sha256, hash(""));
    assert.equal(state.volume?.driver, "audio_archivo");
    assert.equal(state.parts.length, 1);
    assert.equal(state.parts[0].sha256, audioSha);
    assert.equal(state.parts[0].estado_verificacion, "verificado");
    assert.equal(state.parts[0].original_name, "entrada-prueba.mp3");
    assert.equal(state.parts[0].mime_type, "audio/mpeg");
    assert.equal(state.versions.length, 0, "an empty transcript must not fabricate a version");
  } finally {
    resetDbForTesting();
  }
});

test("CUSTODY-09: Ingreso exposes export only for verified imported audio and server re-verifies the original", () => {
  const workspace = readFileSync(resolve(process.cwd(), "app/components/ingreso/IngresoWorkspace.tsx"), "utf8");
  assert.match(workspace, /fuenteEntradaSesionRef\.current === "audio_archivo"/);
  assert.ok(workspace.includes("onExportarAudio: exportarAudioOriginal"));
  assert.ok(workspace.includes("audioExportable:"));

  const exportRoute = readFileSync(resolve(process.cwd(), "app/api/audio/sesion/[id]/exportar/route.ts"), "utf8");
  assert.ok(exportRoute.includes("evaluarCustodiaAudio"));
  assert.ok(exportRoute.includes("descifrarBytes"));
  assert.match(exportRoute, /sha !== String\(part\.sha256/);
  assert.ok(exportRoute.includes("desbloqueoVigente"));
});



test("CUSTODY-11: transcript network failure must return the verified original locator", () => {
  const importer = readFileSync(resolve(process.cwd(), "lib/client/import-audio-file.ts"), "utf8");
  const catchStart = importer.indexOf("catch (cause)", importer.indexOf("transcribeStoredSession"));
  const catchEnd = importer.indexOf("\n  return {", catchStart);
  assert.ok(catchStart >= 0 && catchEnd > catchStart);
  const handler = importer.slice(catchStart, catchEnd);
  assert.ok(handler.includes("audioUrl: stored.audioUrl"));
  assert.ok(handler.includes("verificado: stored.verificado === true"));
  assert.ok(handler.includes('estadoTranscripcion: "fallido"'));
});

test("CUSTODY-12: original export works from verified import custody before or after archive", () => {
  const exportRoute = readFileSync(resolve(process.cwd(), "app/api/audio/sesion/[id]/exportar/route.ts"), "utf8");
  assert.ok(exportRoute.includes("p.fuente_audio"));
  assert.ok(exportRoute.includes("p.original_name"));
  assert.ok(exportRoute.includes("p.mime_type"));
  assert.ok(exportRoute.includes("LEFT JOIN dictado_session"));
  assert.ok(exportRoute.includes('parts[0].fuente_audio !== "audio_archivo" && parts[0].driver !== "audio_archivo"'));
  assert.ok(exportRoute.includes("parts.length !== 1"));
  assert.ok(exportRoute.includes("const audio = buffers[0]"));
  assert.ok(exportRoute.includes("evaluarCustodiaAudio"));
  assert.ok(exportRoute.includes("createHash(\"sha256\")"));
});



test("CUSTODY-14: archived captures stay sealed and text-only saves receive stable session IDs", () => {
  const workspace = readFileSync(resolve(process.cwd(), "app/components/ingreso/IngresoWorkspace.tsx"), "utf8");
  const saveStart = workspace.indexOf("const guardar = useCallback");
  const exportStart = workspace.indexOf("const exportarAudioOriginal", saveStart);
  const saveHandler = workspace.slice(saveStart, exportStart);
  assert.ok(saveHandler.includes("if (archivado)"));
  assert.ok(saveHandler.includes("if (!sesionIdRef.current) sesionIdRef.current = generarSesionId()"));
  assert.ok(saveHandler.includes("setArchivado(true)"));
  assert.ok(saveHandler.includes("setAviso("));
  assert.ok(saveHandler.includes("[archivado, texto, titulo, pulidosOk, observarDictado]"));

  const attachStart = workspace.indexOf("const handleAdjuntarAudio");
  const cleanStart = workspace.indexOf("const limpiar", attachStart);
  const attachHandler = workspace.slice(attachStart, cleanStart);
  assert.ok(attachHandler.includes("if (archivado)"));
  assert.ok(attachHandler.includes("Pulsa Limpiar antes de adjuntar audio"));
});

test("CUSTODY-15: browser download honors the preserved UTF-8 filename from the server", () => {
  const workspace = readFileSync(resolve(process.cwd(), "app/components/ingreso/IngresoWorkspace.tsx"), "utf8");
  assert.ok(workspace.includes("filename\\*=UTF-8"));
  assert.ok(workspace.includes("decodeURIComponent(utf8NameMatch[1])"));
  assert.ok(workspace.includes("link.download = downloadName"));
});

test("CUSTODY-13: fresh installations create custody tables before applying compatibility ALTERs", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/server/dictado.ts"), "utf8");
  const ensureStart = source.indexOf("export async function asegurarColumnasDictado");
  const createTables = source.indexOf("await db.query(SESSION_TABLES_SQL);", ensureStart);
  const applyAlters = source.indexOf("for (const sql of ALTERS)", ensureStart);
  assert.ok(ensureStart >= 0);
  assert.ok(createTables > ensureStart);
  assert.ok(applyAlters > createTables);
  assert.ok(source.includes("ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS original_name TEXT"));
  assert.ok(source.includes("ALTER TABLE dictado_audio_parte ADD COLUMN IF NOT EXISTS mime_type TEXT"));
});

test("CUSTODY-10: stale ingestion failures cannot overwrite a newer approved version", () => {
  const route = readFileSync(resolve(process.cwd(), "app/api/ingesta/route.ts"), "utf8");
  const failureHandler = route.slice(route.indexOf("async function persistirFalloIngesta"), route.indexOf("export async function POST"));
  assert.ok(failureHandler.includes("versionActual !== args.version"));
  assert.ok(failureHandler.includes("shaActual !== args.sha256.toLowerCase()"));
  assert.ok(failureHandler.includes("AND version_aprobada = $3"));
  assert.ok(failureHandler.includes("AND lower(sha256_aprobado) = $4"));
});

test("CUSTODY-07: verification failures never delete stored audio and staging is deleted only after verified linkage", () => {
  const audioRoute = readFileSync(resolve(process.cwd(), "app/api/audio/route.ts"), "utf8");
  assert.doesNotMatch(audioRoute, /del\s*\(\s*subido\.url/);
  assert.match(audioRoute, /recuperable:\s*true/);
  assert.match(audioRoute, /verificado:\s*false/);

  const importRoute = readFileSync(resolve(process.cwd(), "app/api/audio/importar/procesar/route.ts"), "utf8");
  assert.doesNotMatch(importRoute, /del\s*\(\s*stored\.url/);
  assert.match(importRoute, /stagingCanBeDeleted\s*=\s*true/);
  assert.match(importRoute, /if \(stagingUrl && stagingCanBeDeleted\)/);
  assert.match(importRoute, /audioUrl:\s*stored\.url/);
  assert.match(importRoute, /recuperable:\s*true/);

  const importedTranscription = readFileSync(resolve(process.cwd(), "app/api/transcribir/archivo/route.ts"), "utf8");
  assert.match(importedTranscription, /descifrarBytes\(Buffer\.from\(await verificacion\.arrayBuffer\(\)\)\)/);
  assert.match(importedTranscription, /estadoVerificacion:\s*"verificado"/);
  assert.match(importedTranscription, /audioUrl:\s*subido\.url/);
});


test("CUSTODY-16: session transcription endpoint requires an authenticated user", () => {
  const route = readFileSync(resolve(process.cwd(), "app/api/transcribir/sesion/route.ts"), "utf8");
  assert.ok(route.includes('import { auth } from "@/auth"'));
  assert.ok(route.includes("const session = await auth()"));
  assert.ok(route.includes("if (!session?.user?.email)"));
  assert.ok(route.includes("status: 401"));
  assert.ok(route.indexOf("const session = await auth()") < route.indexOf("transcribirSesion({"));
});


test("CUSTODY-17: Ingesta UI consumes the canonical pipeline digest key", () => {
  const page = readFileSync(resolve(process.cwd(), "app/sistema/volcados/page.tsx"), "utf8");
  const view = readFileSync(resolve(process.cwd(), "app/components/shared/PipelineView.tsx"), "utf8");
  assert.ok(page.includes("selectedItem?.sha256_aprobada"));
  assert.ok(view.includes("selectedItem.sha256_aprobada"));
  assert.ok(!page.includes("selectedItem?.sha256_aprobado"));
  assert.ok(!view.includes("selectedItem.sha256_aprobado"));
});
