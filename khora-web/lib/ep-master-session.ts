const COOKIE_NAME = "__Host-khora-ep-master";
const SESSION_ISSUER = "khora-ep-master";
const MAX_SESSION_TTL_SECONDS = 30 * 60;

type MasterSessionPayload = {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function masterSubject(): string {
  return (process.env.EP_ALLOWED_EMAIL || "").trim().toLowerCase();
}

async function signingKey(): Promise<CryptoKey | null> {
  const secret = process.env.EP_MASTER_SESSION_SECRET || "";
  if (secret.length < 32) return null;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createEpMasterSessionToken(origin: string): Promise<{ token: string; expiresAt: number } | null> {
  const email = masterSubject();
  const key = await signingKey();
  let parsedOrigin: URL;
  try { parsedOrigin = new URL(origin); } catch { return null; }
  if (!email || !key || parsedOrigin.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
  const now = Math.floor(Date.now() / 1000);
  const requestedTtl = Number(process.env.EP_MASTER_SESSION_TTL_SECONDS || "900");
  const ttl = Math.max(300, Math.min(MAX_SESSION_TTL_SECONDS, Number.isFinite(requestedTtl) ? requestedTtl : 900));
  const payload: MasterSessionPayload = {
    iss: SESSION_ISSUER,
    sub: email,
    aud: parsedOrigin.origin,
    iat: now,
    exp: now + ttl,
    jti: base64UrlEncode(crypto.getRandomValues(new Uint8Array(24))),
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)));
  return { token: encodedPayload + "." + base64UrlEncode(signature), expiresAt: payload.exp };
}

export async function readEpMasterEmail(request: Request, expectedOrigin?: string): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const encodedCookie = cookieHeader.split(";").map((item) => item.trim()).find((item) => item.startsWith(COOKIE_NAME + "="));
  if (!encodedCookie) return null;
  const token = encodedCookie.slice(COOKIE_NAME.length + 1);
  if (!token || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const payloadBytes = base64UrlDecode(parts[0]);
  const signature = base64UrlDecode(parts[1]);
  const key = await signingKey();
  if (!payloadBytes || !signature || !key) return null;
  let validSignature = false;
  try { validSignature = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(parts[0])); } catch { return null; }
  if (!validSignature) return null;
  let payload: MasterSessionPayload;
  try { payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as MasterSessionPayload; } catch { return null; }
  const now = Math.floor(Date.now() / 1000);
  const email = masterSubject();
  let requestOrigin = "";
  try { requestOrigin = new URL(expectedOrigin || request.url).origin; } catch { return null; }
  if (
    !email ||
    payload.iss !== SESSION_ISSUER ||
    payload.sub !== email ||
    payload.aud !== requestOrigin ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    payload.iat > now + 60 ||
    payload.exp <= now ||
    payload.exp - payload.iat > MAX_SESSION_TTL_SECONDS ||
    typeof payload.jti !== "string" ||
    payload.jti.length < 20
  ) return null;
  if (process.env.NODE_ENV === "production" && new URL(requestOrigin).protocol !== "https:") return null;
  return email;
}

export function epMasterCookieOptions(maxAgeSeconds: number) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: Math.max(0, Math.min(MAX_SESSION_TTL_SECONDS, Math.floor(maxAgeSeconds))),
  };
}

export function clearEpMasterCookieValue(): string {
  return COOKIE_NAME + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" + (process.env.NODE_ENV === "production" ? "; Secure" : "");
}
