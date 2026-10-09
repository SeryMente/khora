// @l0 L0-002-R · @req L0-003/CUSTODIA · @acr CUSTODY-IDEMPOTENCY/01
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

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

    if (normalized.includes("select part_index, bytes, sha256, fuente_audio, estado_verificacion")) {
      return { rows: state.parts.map((p) => ({ ...p })), rowCount: state.parts.length };
    }

    if (normalized.includes("select id, texto, sha256, chars, audio_partes, estado, session_id from volcado")) {
      return { rows: state.volume ? [{ ...state.volume }] : [], rowCount: state.volume ? 1 : 0 };
    }

    if (normalized.includes("select version from volcado_version")) {
      return { rows: state.versions.map((v) => ({ ...v })), rowCount: state.versions.length };
    }

    if (normalized.startsWith("insert into volcado ")) {
      state.volumeInsertCount += 1;
      const row = {
        id: params[0],
        texto: params[1],
        sha256: params[2],
        chars: params[3],
        audio_partes: params[14],
        session_id: params[15],
        estado: "archivado",
      };
      state.volume = row;
      return { rows: [row], rowCount: 1 };
    }

    if (normalized.includes("insert into dictado_audio_parte")) {
      const [sessionId, partIndex, blobUrl, blobPath, bytes, sha256, source, verified, startMs, endMs, durationMs] = params;
      const existing = state.parts.find((p) => p.session_id === sessionId && p.part_index === partIndex);
      if (existing && (
        Number(existing.bytes) !== Number(bytes) ||
        String(existing.sha256).toLowerCase() !== String(sha256).toLowerCase() ||
        existing.fuente_audio !== source
      )) {
        return { rows: [], rowCount: 0 };
      }
      if (existing) {
        existing.blob_url = blobUrl;
        existing.blob_path = blobPath;
        existing.estado_verificacion = verified;
      } else {
        state.parts.push({
          session_id: sessionId, part_index: partIndex, blob_url: blobUrl,
          blob_path: blobPath, bytes, sha256, fuente_audio: source,
          estado_verificacion: verified, start_ms: startMs, end_ms: endMs,
          duracion_ms: durationMs,
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
