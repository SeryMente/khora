/** Persist stable locators only; signed capabilities never enter PostgreSQL. */
export type B2Location = { bucket: string; region: string };

export function b2Endpoint(region: string): string {
  if (!/^[a-z]{2}-[a-z]+-\d{3}$/.test(region)) throw new Error("storage_region_invalid");
  return `https://s3.${region}.backblazeb2.com`;
}

export function safeObjectKey(key: string): string {
  if (!key.startsWith("khora/") || key.length > 1000 || !/^[A-Za-z0-9._/-]+$/.test(key)
    || key.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("storage_key_invalid");
  }
  return key;
}

export function b2ObjectUrl(key: string, location: B2Location): string {
  if (!/^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(location.bucket)) throw new Error("storage_bucket_invalid");
  return `${b2Endpoint(location.region)}/${location.bucket}/${safeObjectKey(key)}`;
}

export function parseB2ObjectUrl(value: string, location: B2Location): string | null {
  try {
    const url = new URL(value);
    const endpoint = new URL(b2Endpoint(location.region));
    if (url.protocol !== "https:" || url.host !== endpoint.host || url.username || url.password
      || url.search || url.hash || value !== url.href || /%|\\\\/.test(value)) return null;
    const prefix = `/${location.bucket}/`;
    return url.pathname.startsWith(prefix) ? safeObjectKey(url.pathname.slice(prefix.length)) : null;
  } catch {
    return null;
  }
}

export function legacyBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && !url.hash && !url.search && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isKnownStoredObjectUrl(value: string, location: B2Location): boolean {
  return legacyBlobUrl(value) || parseB2ObjectUrl(value, location) !== null;
}

export function stagingKeyForSession(key: string, sessionId: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(sessionId)
    && safeObjectKey(key).startsWith(`khora/staging/audio/${sessionId}/`)
    && /^[-a-zA-Z0-9.]+\.khstaging$/.test(key.split("/").at(-1) || "");
}
