// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { describe, it, expect, beforeEach, vi } from "vitest";

process.env.X_KHORA_KEY = "0123456789abcdef0123456789abcdef";

import { setDbForTesting } from "../../lib/server/neon";
import { evaluarCompuertaAprobacion } from "../../lib/server/compuerta";

describe("Linguistic Findings & Server Gate Evaluator", () => {
  beforeEach(() => {
    setDbForTesting({
      query: vi.fn(async (sql: string) => {
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
      }),
      connect: vi.fn(async () => ({ query: vi.fn(async () => ({ rows: [] })), release: vi.fn() })),
    } as any);
  });

  it("evaluarCompuertaAprobacion devuelve canApprove true y gate_hash cuando no hay bloqueadores", async () => {
    const res = await evaluarCompuertaAprobacion("test-uuid", "operador@khora.dev");

    expect(res.canApprove).toBe(true);
    expect(res.version).toBe(1);
    expect(res.sha256).toBe("sha_mock");
    expect(res.gate_hash).toBeDefined();
    expect(res.blockers.length).toBe(0);
  });
});
