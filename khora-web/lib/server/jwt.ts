// @l0 L0-002 §4 · @req MCP-JWT-01/REQ-1
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

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

export type JwtVerificationError = "invalid_format" | "invalid_header" | "invalid_signature" | "invalid_payload" | "expired";
export type JwtVerificationResult = { ok: true; payload: JwtPayload } | { ok: false; error: JwtVerificationError };

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecodeBuffer(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    const decoded = Buffer.from(normalized, "base64");
    return base64UrlEncode(decoded) === value ? decoded : null;
  } catch { return null; }
}

export function signJwt(payload: JwtPayload, secret: string): string {
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(signatureInput).digest();
  return `${signatureInput}.${base64UrlEncode(signature)}`;
}

export function verifyJwtDetailed(token: string, secret: string): JwtVerificationResult {
  if (typeof token !== "string" || token.length < 16 || token.length > 16_384) return { ok: false, error: "invalid_format" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "invalid_format" };
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const headerBytes = base64UrlDecodeBuffer(encodedHeader);
  const payloadBytes = base64UrlDecodeBuffer(encodedPayload);
  const signatureBytes = base64UrlDecodeBuffer(encodedSignature);
  if (!headerBytes || !payloadBytes || !signatureBytes) return { ok: false, error: "invalid_format" };

  let header: unknown;
  try { header = JSON.parse(headerBytes.toString("utf8")); } catch { return { ok: false, error: "invalid_header" }; }
  if (!header || typeof header !== "object" || (header as { alg?: unknown }).alg !== "HS256" || (header as { typ?: unknown }).typ !== "JWT") {
    return { ok: false, error: "invalid_header" };
  }

  const expected = createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest();
  if (signatureBytes.length !== expected.length || !timingSafeEqual(signatureBytes, expected)) return { ok: false, error: "invalid_signature" };

  let payload: unknown;
  try { payload = JSON.parse(payloadBytes.toString("utf8")); } catch { return { ok: false, error: "invalid_payload" }; }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, error: "invalid_payload" };
  const candidate = payload as Partial<JwtPayload>;
  if (!Number.isSafeInteger(candidate.exp) || !Number.isSafeInteger(candidate.iat) || typeof candidate.iss !== "string" || typeof candidate.sub !== "string" || typeof candidate.aud !== "string" || typeof candidate.scope !== "string" || typeof candidate.jti !== "string") {
    return { ok: false, error: "invalid_payload" };
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if ((candidate.exp as number) <= nowSeconds) return { ok: false, error: "expired" };
  return { ok: true, payload: candidate as JwtPayload };
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  const result = verifyJwtDetailed(token, secret);
  return result.ok ? result.payload : null;
}

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  try {
    if (!verifier || !challenge) return false;
    const computed = base64UrlEncode(createHash("sha256").update(verifier).digest());
    const actualBuffer = Buffer.from(computed);
    const expectedBuffer = Buffer.from(challenge);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  } catch { return false; }
}
