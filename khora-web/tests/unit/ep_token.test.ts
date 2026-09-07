import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { signJwt, verifyJwt, verifyJwtDetailed } from "../../lib/server/jwt.js";

const secret = "test-ep-secret-must-have-at-least-32-characters";
function encode(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function customToken(header: unknown, payload: unknown): string {
  const head = encode(header); const body = encode(payload);
  const signature = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${signature}`;
}

test("EP token conserva audience, session y scopes", () => {
  const now = Math.floor(Date.now() / 1000);
  const token = signJwt({ iss: "khora-ep", sub: "test@example.com", aud: "https://khora.example/api/ep", scope: "ep:bootstrap ep:logs:write ep:logs:read", gen: 1, iat: now, exp: now + 60, jti: "jti-1", sid: "00000000-0000-0000-0000-000000000001", typ: "ep-session" }, secret);
  const payload = verifyJwt(token, secret);
  assert.equal(payload?.aud, "https://khora.example/api/ep"); assert.equal(payload?.sid, "00000000-0000-0000-0000-000000000001"); assert.match(payload?.scope || "", /ep:logs:read/);
});

test("JWT rechaza firma alterada en tiempo constante", () => {
  const now = Math.floor(Date.now() / 1000);
  const token = signJwt({ iss: "i", sub: "s", aud: "a", scope: "x", gen: 1, iat: now, exp: now + 60, jti: "j" }, secret);
  const altered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
  assert.deepEqual(verifyJwtDetailed(altered, secret), { ok: false, error: "invalid_signature" }); assert.equal(verifyJwt(altered, secret), null);
});

test("JWT rechaza algoritmo distinto aun con firma valida", () => {
  const now = Math.floor(Date.now() / 1000);
  const token = customToken({ alg: "none", typ: "JWT" }, { iss: "i", sub: "s", aud: "a", scope: "x", gen: 1, iat: now, exp: now + 60, jti: "j" });
  assert.deepEqual(verifyJwtDetailed(token, secret), { ok: false, error: "invalid_header" });
});

test("JWT rechaza expiracion exacta y formatos no canonicos", () => {
  const now = Math.floor(Date.now() / 1000);
  const expired = signJwt({ iss: "i", sub: "s", aud: "a", scope: "x", gen: 1, iat: now - 10, exp: now, jti: "j" }, secret);
  assert.deepEqual(verifyJwtDetailed(expired, secret), { ok: false, error: "expired" }); assert.deepEqual(verifyJwtDetailed("not-a-jwt", secret), { ok: false, error: "invalid_format" });
});
