// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import "./setup";
import { test, describe } from "node:test";
import assert from "node:assert";

process.env.X_KHORA_KEY = "0123456789abcdef0123456789abcdef";

import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { evaluarCompuertaAprobacion } from "../../lib/server/compuerta";

describe("Linguistic Findings & Server Gate Evaluator", () => {
  test("evaluarCompuertaAprobacion devuelve canApprove true y gate_hash cuando no hay bloqueadores", async () => {
    const mockDb = {
      query: async (sql: string) => {
        if (sql.includes("FROM volcado WHERE id")) {
          return {
            rows: [
              {
                id: "test-uuid",
                estado: "en_revision",
                texto: "cifrado_mock",
                sha256: "sha_mock",
                version_aprobada: null,
                session_id: null,
                audio_url: null,
                audio_partes: null,
              },
            ],
          };
        }
        if (sql.includes("FROM volcado_version WHERE volcado_id")) {
          return {
            rows: [
              {
                version: 1,
                sha256: "sha_mock",
                texto: "cifrado_mock",
              },
            ],
          };
        }
        if (sql.includes("FROM volcado_incidente")) {
          return { rows: [] };
        }
        if (sql.includes("FROM volcado_hallazgo")) {
          return { rows: [] };
        }
        return { rows: [] };
      },
      connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
    };

    setDbForTesting(mockDb as any);

    try {
      const res = await evaluarCompuertaAprobacion("test-uuid", "operador@khora.dev");

      assert.strictEqual(res.canApprove, true);
      assert.strictEqual(res.version, 1);
      assert.strictEqual(res.sha256, "sha_mock");
      assert.ok(res.gate_hash);
      assert.strictEqual(res.blockers.length, 0);
    } finally {
      resetDbForTesting();
    }
  });
});
