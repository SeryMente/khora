/** Persist locators, never signed URLs or credentials. Legacy reads remain explicit. */
export type B2Location = { bucket: string; region: string };
export function b2Endpoint(region: string): string {
  if (!/^[a-z]{2}-[a-z]+-\d{3}$/.test(region)) throw new Error('storage_region_invalid');
  return `https://s3.${region}.backblazeb2.com`;
}
export function safeObjectKey(key: string): string {
  if (!key.startsWith('khora/') || key.length > 1000 || !/^[A-Za-z0-9._/-]+$/.test(key)
    || key.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('storage_key_invalid');
  return key;
}
export function b2ObjectUrl(key: string, c: B2Location): string {
  if (!/^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(c.bucket)) throw new Error('storage_bucket_invalid');
  return `${b2Endpoint(c.region)}/${c.bucket}/${safeObjectKey(key)}`;
}
export function parseB2ObjectUrl(value: string, c: B2Location): string | null {
  try {
    const u = new URL(value), endpoint = new URL(b2Endpoint(c.region));
    if (u.protocol !== 'https:' || u.host !== endpoint.host || u.username || u.password || u.search || u.hash
      || value !== u.href || /%|\\/.test(value)) return null;
    const prefix = `/${c.bucket}/`;
    return u.pathname.startsWith(prefix) ? safeObjectKey(u.pathname.slice(prefix.length)) : null;
  } catch { return null; }
}
export function legacyBlobUrl(value: string): boolean {
  try { const u = new URL(value);return u.protocol === 'https:' && !u.username && !u.password && !u.port
    && !u.hash && !u.search && u.hostname.endsWith('.blob.vercel-storage.com'); } catch { return false; }
}
export function stagingKeyForSession(key: string, sessionId: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(sessionId) && safeObjectKey(key).startsWith(`khora/staging/audio/${sessionId}/`)
    && /^[-a-zA-Z0-9.]+\.khstaging$/.test(key.split('/').at(-1) || '');
}
