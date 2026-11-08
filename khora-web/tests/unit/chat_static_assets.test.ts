import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { openWebUIPath } from "../../lib/chat-routes";

test("Open WebUI interface, API and static assets remain on the authenticated upstream proxy", () => {
  for (const p of [
    "/", "/api/version", "/api/config", "/api/v1/chats",
    "/_app/immutable/nodes/a.js", "/assets/fonts/Inter-Variable.ttf",
    "/licenses/encryption/THIRD_PARTY_LICENSES.txt", "/static/loader.js",
    "/c/12345678-1234-1234-1234-123456789abc",
  ]) assert.equal(openWebUIPath(p), true, p);
  for (const p of ["/sistema", "/api/chat", "/api/auth/session", "/api/ingesta",
    "/api/v1/functions", "/api/v1/memories", "/assets/../private", "/assets/%2e%2e/private"]) {
    assert.equal(openWebUIPath(p), false, p);
  }
  const middleware = fs.readFileSync("middleware.ts", "utf8");
  assert.ok(middleware.indexOf("!req.auth") < middleware.indexOf("if (process.env.KHORA_CHAT_ENABLED"));
  assert.match(middleware, /pathname === "\/chat\/frame"/);
  assert.match(middleware, /pathname === "\/api\/version"/);
  assert.match(middleware, /pathname === "\/manifest\\.json"/);
  assert.match(middleware, /contextSensitiveUpstreamRoute && isOpenWebUIRootNavigation/);
  assert.match(middleware, /referer.pathname !== "\/"/);
  assert.match(middleware, /isOpenWebUIRootNavigation/);
  assert.match(middleware, /NextResponse\.rewrite\(destino\)/);
  assert.doesNotMatch(middleware, /bundledOpenWebUIAsset/);
});

test("Cora keeps its own shell around the Open WebUI iframe", () => {
  const page = fs.readFileSync("app/chat/page.tsx", "utf8");
  assert.match(page, /<iframe/);
  assert.match(page, /src="\/chat\/frame"/);
  assert.match(page, /title="Open WebUI"/);
  const fallback = fs.readFileSync("app/chat/frame/page.tsx", "utf8");
  assert.match(fallback, /no está habilitado/);
});
