import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon.js";
import { createEpSessionToken, getEpConfig } from "../../lib/server/ep.js";
import { POST as postEpTokenRoute } from "../../app/api/ep/token/route.js";
import middleware from "../../middleware.ts";
import { NextRequest } from "next/server";
import { verifyJwt } from "../../lib/server/jwt.js";

process.env.EP_BOOTSTRAP_JWT_SECRET = "test-ep-secret-must-have-at-least-32-characters";
process.env.EP_ALLOWED_EMAIL = "test@example.com";
process.env.EP_CANONICAL_URL = "https://khora.example.com/api/ep";

test("EP Security: Token creation, audience, scopes and command secrecy", async () => {
  let dbTokens: Array<{ jti_hash: string; usuario: string; revocado_en: Date | null; emitido_en: Date }> = [];
  let dbSessions: Array<{ id: string; usuario: string; estado: string }> = [];

  const mockDbPool = {
    connect: async () => {
      return {
        query: async (sql: string, params: any[]) => {
          if (sql.includes("BEGIN") || sql.includes("COMMIT") || sql.includes("ROLLBACK")) {
            return;
          }
          if (sql.includes("SELECT COUNT(*)::int AS cnt FROM ep_bootstrap_tokens")) {
            const count = dbTokens.filter(t => t.usuario === params[0]).length;
            return { rowCount: 1, rows: [{ cnt: count }] };
          }
          if (sql.includes("UPDATE ep_bootstrap_tokens SET revocado_en=NOW()")) {
            for (const t of dbTokens) {
              if (t.usuario === params[0] && !t.revocado_en) {
                t.revocado_en = new Date();
              }
            }
            return { rowCount: dbTokens.length, rows: [] };
          }
          if (sql.includes("UPDATE ep_sessions SET estado='superseded'")) {
            for (const s of dbSessions) {
              if (s.usuario === params[0]) {
                s.estado = "superseded";
              }
            }
            return { rowCount: dbSessions.length, rows: [] };
          }
          if (sql.includes("INSERT INTO ep_sessions")) {
            dbSessions.push({ id: params[0], usuario: params[1], estado: "active" });
            return { rowCount: 1, rows: [] };
          }
          if (sql.includes("INSERT INTO ep_bootstrap_tokens")) {
            dbTokens.push({ jti_hash: params[0], usuario: params[2], revocado_en: null, emitido_en: new Date() });
            return { rowCount: 1, rows: [] };
          }
          return { rowCount: 0, rows: [] };
        },
        release: () => {},
      };
    },
    query: async () => ({ rowCount: 0, rows: [] }),
  };

  setDbForTesting(mockDbPool);

  try {
    const email = "test@example.com";
    const origin = "https://khora.example.com";

    const result = await createEpSessionToken(email, origin);
    assert.ok(result.token);
    assert.ok(result.payload.sid);

    // Verify JWT payload claims
    const config = getEpConfig(origin);
    const decoded = verifyJwt(result.token, config.secret) as any;
    assert.ok(decoded);
    assert.equal(decoded.iss, "khora-ep");
    assert.equal(decoded.aud, "https://khora.example.com/api/ep");
    assert.equal(decoded.sub, email);
    assert.equal(decoded.scope, "ep:bootstrap ep:logs:write ep:logs:read");
    assert.equal(decoded.typ, "ep-session");

    // Revocation check: Issue second token, verify prior token revoked
    const result2 = await createEpSessionToken(email, origin);
    assert.ok(result2.token);
    assert.notEqual(result.token, result2.token);
    assert.ok(dbTokens[0].revocado_en !== null);
    assert.equal(dbSessions[0].estado, "superseded");
  } finally {
    resetDbForTesting();
  }
});

test("EP Security: DB Rate limit enforcement (5 tokens per 15 mins)", async () => {
  let emitCount = 0;

  const mockDbPool = {
    connect: async () => {
      return {
        query: async (sql: string) => {
          if (sql.includes("BEGIN") || sql.includes("COMMIT") || sql.includes("ROLLBACK")) {
            return;
          }
          if (sql.includes("SELECT COUNT(*)::int AS cnt FROM ep_bootstrap_tokens")) {
            return { rowCount: 1, rows: [{ cnt: emitCount }] };
          }
          if (sql.includes("INSERT INTO ep_bootstrap_tokens")) {
            emitCount++;
            return { rowCount: 1, rows: [] };
          }
          return { rowCount: 1, rows: [] };
        },
        release: () => {},
      };
    },
    query: async () => ({ rowCount: 0, rows: [] }),
  };

  setDbForTesting(mockDbPool);

  try {
    const email = "test@example.com";
    const origin = "https://khora.example.com";

    // First 5 emissions succeed
    for (let i = 0; i < 5; i++) {
      const res = await createEpSessionToken(email, origin);
      assert.ok(res.token);
    }

    // 6th emission throws rate_limit_exceeded
    await assert.rejects(
      async () => {
        await createEpSessionToken(email, origin);
      },
      (err: Error) => err.message.includes("rate_limit_exceeded")
    );
  } finally {
    resetDbForTesting();
  }
});

test("EP Security: POST /api/ep/token platform parameter handling and command secrecy", async () => {
  const mockDbPool = {
    connect: async () => {
      return {
        query: async () => ({ rowCount: 1, rows: [{ cnt: 0 }] }),
        release: () => {},
      };
    },
    query: async () => ({ rowCount: 0, rows: [] }),
  };

  setDbForTesting(mockDbPool);

  try {
    // 1. Unsupported platform "linux" -> 400 Bad Request with unsupported_platform
    const reqLinux = new NextRequest("https://khora.example.com/api/ep/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "linux" }),
    });

    const resLinux = await postEpTokenRoute(reqLinux);
    assert.equal(resLinux.status, 400);
    const bodyLinux = await resLinux.json();
    assert.equal(bodyLinux.error, "unsupported_platform");

    // 2. Unsupported platform "macos" -> 400 Bad Request
    const reqMac = new NextRequest("https://khora.example.com/api/ep/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "macos" }),
    });

    const resMac = await postEpTokenRoute(reqMac);
    assert.equal(resMac.status, 400);
    const bodyMac = await resMac.json();
    assert.equal(bodyMac.error, "unsupported_platform");

    // 3. Supported platform "windows" -> 200 OK with launcher contract
    const reqWin = new NextRequest("https://khora.example.com/api/ep/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "windows" }),
    });

    const resWin = await postEpTokenRoute(reqWin);
    assert.equal(resWin.status, 200);
    assert.equal(resWin.headers.get("Cache-Control"), "no-store");
    assert.equal(resWin.headers.get("Pragma"), "no-cache");

    const bodyWin = await resWin.json();
    assert.ok(bodyWin.token);
    assert.ok(bodyWin.sessionId);
    assert.ok(bodyWin.command);
    assert.ok(bodyWin.launcher);
    assert.equal(bodyWin.launcher.id, "windows-powershell");
    assert.equal(bodyWin.launcher.platform, "windows");
    assert.equal(bodyWin.launcher.status, "supported");

    // Command secrecy invariant: Command MUST NOT contain the token
    assert.equal(bodyWin.command.includes(bodyWin.token), false);
    assert.equal(bodyWin.launcher.command.includes(bodyWin.token), false);

    // 4. Empty/missing platform defaults to "windows"
    const reqEmpty = new NextRequest("https://khora.example.com/api/ep/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resEmpty = await postEpTokenRoute(reqEmpty);
    assert.equal(resEmpty.status, 200);
    const bodyEmpty = await resEmpty.json();
    assert.equal(bodyEmpty.launcher.platform, "windows");
  } finally {
    resetDbForTesting();
  }
});

test("EP Security: Middleware 308 redirect from /sistema/entorno-persistente to /sistema/seguridad#entorno-persistente", async () => {
  const req = new NextRequest("https://khora.example.com/sistema/entorno-persistente");
  const res = (await middleware(req as any)) as any;

  assert.ok(res);
  assert.equal(res.status, 308);
  assert.equal(res.headers.get("location"), "https://khora.example.com/sistema/seguridad#entorno-persistente");
});
