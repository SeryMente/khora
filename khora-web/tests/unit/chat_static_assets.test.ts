import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bundledOpenWebUIAsset, nativeDefaultAvatarPath, openWebUIPath } from "../../lib/chat-routes";

test("only official asset namespaces bypass the upstream proxy, never authentication", () => {
  for (const p of ["/_app/immutable/nodes/a.js", "/assets/fonts/Inter-Variable.ttf", "/licenses/encryption/THIRD_PARTY_LICENSES.txt"]) {
    assert.equal(bundledOpenWebUIAsset(p), true);
    assert.equal(openWebUIPath(p), true);
  }
  for (const p of ["/api/config", "/api/v1/chats", "/sistema", "/assets/../private", "/assets/%2e%2e/private", "/static/loader.js"]) {
    assert.equal(bundledOpenWebUIAsset(p), false);
  }
  const middleware = fs.readFileSync("middleware.ts", "utf8");
  assert.ok(middleware.indexOf("!req.auth") < middleware.indexOf("!bundledOpenWebUIAsset(pathname)"));
  assert.match(middleware, /NextResponse\.rewrite\(destino\)/);
});

test("prebuild pins the identical official wheel and never copies its backend or tenant config", () => {
  const script = fs.readFileSync("scripts/prepare-openwebui-static.mjs", "utf8");
  assert.ok(script.includes("6d716039a5c15ecdb1db12f99dd9c79ea5c86d3d7bbd9a67054dd26f1f534747"));
  assert.match(script, /await verifyWheel\(file\)/);
  assert.match(script, /UPSTREAM_STATIC_COLLISION/);
  assert.match(script, /LICENSE_HISTORY/);
  assert.doesNotMatch(script, /process\.env\.(?:KHORA_API_KEY|DATABASE_URL|AUTH_SECRET)/);
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.ok(pkg.scripts.prebuild.startsWith("node scripts/prepare-openwebui-static.mjs &&"));
});

test("generic avatar transport never grants native profile or identity access", () => {
  const p='/api/v1/users/814209db-8c1e-49f0-afcd-87a4208c66fe/profile/image';
  assert.equal(nativeDefaultAvatarPath(p),true);
  assert.equal(openWebUIPath(p),false);
  assert.equal(bundledOpenWebUIAsset('/user.png'),true);
  for(const p of ['/api/v1/users/admin/profile/image','/api/v1/users/814209db-8c1e-49f0-afcd-87a4208c66fe','/api/v1/users/../profile/image']) assert.equal(nativeDefaultAvatarPath(p),false);
  const middleware=fs.readFileSync('middleware.ts','utf8');
  assert.ok(middleware.indexOf('!req.auth') < middleware.indexOf('nativeDefaultAvatarPath(pathname)'));
  assert.match(middleware,/\['GET', 'HEAD'\]\.includes\(req.method\)/);
  assert.match(middleware,/new URL\('\/user.png', req.nextUrl.origin\)/);
});
