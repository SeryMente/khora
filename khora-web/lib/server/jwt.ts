// @l0 L0-002 §4 · @req MCP-JWT-01/REQ-1
import { createHmac } from "node:crypto";

export interface JwtPayload {
  iss: string;
  sub: string;
  aud: string;
  scope: string;
  gen: number;
  exp: number;
  iat: number;
  jti: string;
  [key: string]: any;
}

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str) : str;
  return buf.toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export function signJwt(payload: JwtPayload, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac("sha256", secret)
    .update(signatureInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = base64UrlEncode(
      createHmac("sha256", secret).update(signatureInput).digest()
    );

    if (encodedSignature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;

    // Verify expiration
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  try {
    const hash = createHmac("sha256", "")
      .update(verifier)
      .digest(); // wait, PKCE S256 uses standard SHA-256 digest of verifier in base64url format
  } catch (e) {}

  const crypto = require("node:crypto");
  const computedHash = crypto.createHash("sha256").update(verifier).digest();
  const computedChallenge = base64UrlEncode(computedHash);

  return computedChallenge === challenge;
}
