// @l0 L0-002 §4 · @req MCP-TEST-01/REQ-1
import test from "node:test";
import assert from "node:assert/strict";
import { signJwt, verifyJwt, verifyPkceS256 } from "../../lib/server/jwt.js";
import { foldAccents } from "../../lib/server/mcp-tools.js";

test("JWT signing and verification", () => {
  const secret = "test-mcp-jwt-secret-12345678901234";
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "http://localhost:3000",
    sub: "operador@khora.app",
    aud: "http://localhost:3000/api/mcp",
    scope: "volcados:read",
    gen: 1,
    exp: now + 3600,
    iat: now,
    jti: "test-jti-1",
  };

  const token = signJwt(payload, secret);
  assert.ok(token);
  assert.equal(token.split(".").length, 3);

  const decoded = verifyJwt(token, secret);
  assert.ok(decoded);
  assert.equal(decoded?.sub, "operador@khora.app");
  assert.equal(decoded?.gen, 1);

  // Invalid secret
  const badDecoded = verifyJwt(token, "wrong-secret");
  assert.equal(badDecoded, null);

  // Expired token
  const expiredPayload = { ...payload, exp: now - 10 };
  const expiredToken = signJwt(expiredPayload, secret);
  assert.equal(verifyJwt(expiredToken, secret), null);
});

test("PKCE S256 verifier and challenge validation", () => {
  // Verifier and challenge example
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  // SHA256 of verifier base64url encoded
  const crypto = require("node:crypto");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  assert.equal(verifyPkceS256(verifier, challenge), true);
  assert.equal(verifyPkceS256("wrong_verifier", challenge), false);
});

test("foldAccents preserves character index map", () => {
  const original = "El volcáñ está activo en la región de Michoacán.";
  const folded = foldAccents(original);

  assert.equal(original.length, folded.length);
  assert.equal(folded, "el volcan esta activo en la region de michoacan.");

  const matchPos = folded.indexOf("volcan");
  assert.notEqual(matchPos, -1);
  assert.equal(original.substring(matchPos, matchPos + 6), "volcáñ");
});
