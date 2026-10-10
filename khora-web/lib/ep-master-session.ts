const MAX_TTL_SECONDS = 15 * 60;

type EpMasterSessionPayload = {
  iss: "khora-ep-master";
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  nonce: string;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch { return null; }
}

async function sessionKey(): Promise<CryptoKey | null> {
  const secret = process.env.EP_BOOTSTRAP_JWT_SECRET || "";
  if (secret.length < 32) return null;
  const root = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const derived = await crypto.subtle.sign("HMAC", root, new TextEncoder().encode("khora-ep-master-session-key-v1"));
  return crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function allowedEmail(): string {
  return (process.env.EP_ALLOWED_EMAIL || process.env.MCP_ALLOWED_EMAIL || "").trim().toLowerCase();
}

function cookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-khora-ep-master" : "khora-ep-master";
}

export async function createEpMasterSession(emailInput: string, origin: string): Promise<{ cookieName: string; value: string; maxAge: number } | null> {
  const email = emailInput.trim().toLowerCase();
  const allowed = allowedEmail();
  const key = await sessionKey();
  let url: URL;
  try { url = new URL(origin); } catch { return null; }
  if (!key || !email || !allowed || email !== allowed || url.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
  const now = Math.floor(Date.now() / 1000);
  const payload: EpMasterSessionPayload = {
    iss: "khora-ep-master",
    sub: email,
    aud: url.origin,
    iat: now,
    exp: now + MAX_TTL_SECONDS,
    nonce: toBase64Url(crypto.getRandomValues(new Uint8Array(24))),
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded)));
  return { cookieName: cookieName(), value: encoded + "." + toBase64Url(signature), maxAge: MAX_TTL_SECONDS };
}

export async function readEpMasterEmail(request: Request, expectedOrigin?: string): Promise<string | null> {
  const found = (request.headers.get("cookie") || "").split(";").map((item) => item.trim()).find((item) => item.startsWith(cookieName() + "="));
  if (!found) return null;
  const token = found.slice(cookieName().length + 1);
  if (!token || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const payloadBytes = fromBase64Url(parts[0]);
  const signature = fromBase64Url(parts[1]);
  const key = await sessionKey();
  if (!payloadBytes || !signature || !key) return null;
  let verified = false;
  const signatureBuffer = new Uint8Array(signature.byteLength);
  signatureBuffer.set(signature);
  try { verified = await crypto.subtle.verify("HMAC", key, signatureBuffer.buffer as ArrayBuffer, new TextEncoder().encode(parts[0])); } catch { return null; }
  if (!verified) return null;
  let payload: EpMasterSessionPayload;
  try { payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as EpMasterSessionPayload; } catch { return null; }
  const now = Math.floor(Date.now() / 1000);
  const allowed = allowedEmail();
  let origin = "";
  try { origin = new URL(expectedOrigin || request.url).origin; } catch { return null; }
  if (
    payload.iss !== "khora-ep-master" ||
    !allowed ||
    payload.sub !== allowed ||
    payload.aud !== origin ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    payload.iat > now + 30 ||
    payload.exp <= now ||
    payload.exp - payload.iat !== MAX_TTL_SECONDS ||
    typeof payload.nonce !== "string" ||
    payload.nonce.length < 20
  ) return null;
  try { if (process.env.NODE_ENV === "production" && new URL(origin).protocol !== "https:") return null; } catch { return null; }
  return payload.sub;
}

export function epMasterCookieOptions(maxAge: number) {
  return {
    name: cookieName(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: Math.max(0, Math.min(MAX_TTL_SECONDS, Math.floor(maxAge))),
  };
}
