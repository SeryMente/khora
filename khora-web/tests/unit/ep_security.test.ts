import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon.js";
import { createEpSessionToken, getEpAuthFailure, getEpConfig } from "../../lib/server/ep.js";
import { POST as postEpTokenRoute } from "../../app/api/ep/token/route.js";
import middleware from "../../middleware";
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
    assert.equal(decoded.launchMode, "normal");

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
        query: async (sql: string, params: any[]) => ({ rowCount: 1, rows: [{ cnt: 0 }] }),
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
    const reqWin = new NextRequest("https://khora-preview.vercel.app/api/ep/token", {
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
    assert.equal(bodyWin.launcher.version, "4");
    assert.equal(bodyWin.mode, "normal");
    assert.equal(bodyWin.launcher.mode, "normal");
    assert.equal(bodyWin.launcher.hostToolPolicy, "allow-verified-host");
    assert.equal(bodyWin.launcher.platform, "windows");
    assert.equal(bodyWin.launcher.status, "supported");
    assert.equal(bodyWin.launcher.execution, "windows-powershell-5.1-child-process-dpapi");
    assert.equal(bodyWin.apiBase, "https://khora.example.com/api/ep");
    assert.equal(bodyWin.command.includes(bodyWin.token), false);
    assert.equal(bodyWin.launcher.command.includes(bodyWin.token), false);
    assert.doesNotMatch(bodyWin.command, /ScriptBlock/);
    assert.doesNotMatch(bodyWin.command, /-KhoraToken\s+\$k/);
    assert.doesNotMatch(bodyWin.command, /-LaunchMode/);
    assert.match(bodyWin.command, /khora-bootstrap-/);
    assert.match(bodyWin.command, /\.ps1/);
    assert.match(bodyWin.command, /WriteAllText/);
    assert.match(bodyWin.command, /KhoraTokenFile/);
    assert.match(bodyWin.command, /ConvertFrom-SecureString/);
    assert.match(bodyWin.command, /finally/);
    assert.match(bodyWin.command, /Set-Clipboard -Value ' '/);
    assert.match(bodyWin.command, /WindowsPowerShell\\v1\.0\\powershell\.exe/);
    assert.match(bodyWin.command, /X-Khora-Launch-Mode/);
    assert.match(bodyWin.command, /KHORA_LAUNCH_MODE_MISMATCH/);

    // 4. Clean-host mode is explicitly rejected with 400 Bad Request (unsupported_launch_mode).
    const reqClean = new NextRequest("https://khora.example.com/api/ep/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "windows", mode: "clean-host" }),
    });

    const resClean = await postEpTokenRoute(reqClean);
    assert.equal(resClean.status, 400);
    const bodyClean = await resClean.json();
    assert.equal(bodyClean.error, "unsupported_launch_mode");

    // 5. Unknown launch mode is rejected before token creation.
    const reqUnknownMode = new NextRequest("https://khora.example.com/api/ep/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "windows", mode: "container-ish" }),
    });
    const resUnknownMode = await postEpTokenRoute(reqUnknownMode);
    assert.equal(resUnknownMode.status, 400);
    assert.equal((await resUnknownMode.json()).error, "unsupported_launch_mode");

    // 6. Empty/missing platform and mode default to normal Windows.
    const reqEmpty = new NextRequest("https://khora.example.com/api/ep/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resEmpty = await postEpTokenRoute(reqEmpty);
    assert.equal(resEmpty.status, 200);
    const bodyEmpty = await resEmpty.json();
    assert.equal(bodyEmpty.launcher.platform, "windows");
    assert.equal(bodyEmpty.mode, "normal");
  } finally {
    resetDbForTesting();
  }
});

test("EP Security: public authentication codes never expose internal errors", () => {
  assert.deepEqual(getEpAuthFailure(new Error("invalid_signature")), { code: "invalid_signature", status: 401 });
  assert.deepEqual(getEpAuthFailure(new Error("password=secret database host")), { code: "authentication_unavailable", status: 503 });
});

test("EP Security UI isolates Entorno Persistente as a submodule and keeps credentials ephemeral", () => {
  const page = readFileSync(new URL("../../app/sistema/seguridad/page.tsx", import.meta.url), "utf8");
  const source = readFileSync(new URL("../../app/components/ep/EntornoPersistentePanel.tsx", import.meta.url), "utf8");
  assert.match(page, /"entorno-persistente"/);
  assert.match(page, /<EntornoPersistentePanel \/>/);
  assert.match(source, /copyCommand/);
  assert.match(source, /copyTokenStrict/);
  assert.match(source, /Reintentar copiar token/);
  assert.match(source, /Token preparado\. Regresa a PowerShell y presiona Enter/);
  assert.doesNotMatch(source, /Prueba de máquina limpia/);
  assert.doesNotMatch(source, /ignora herramientas del host/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /console\.(log|debug|info)\s*\(/);
});

test("EP Security: Middleware 308 redirect opens the Entorno Persistente submodule", async () => {
  const req = new NextRequest("https://khora.example.com/sistema/entorno-persistente");
  const res = (await (middleware as any)(req, {} as any)) as any;

  assert.ok(res);
  assert.equal(res.status, 308);
  assert.equal(res.headers.get("location"), "https://khora.example.com/sistema/seguridad?tab=entorno-persistente");
});
