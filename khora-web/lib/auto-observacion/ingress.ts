/** Bound real streamed bytes, not the untrusted Content-Length header. */
export async function readEventBatch(request: Request, limit = 65536): Promise<{ items: unknown[]; key: string | null }> {
  if (Number(request.headers.get("content-length")) > limit) throw new Error("PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error("PAYLOAD_TOO_LARGE"); } chunks.push(part.value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body: unknown; try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new Error("INVALID_JSON"); }
  if (!body || typeof body !== "object") throw new Error("INVALID_EVENT_BATCH");
  const object = body as Record<string, unknown>;
  const items = Array.isArray(body) ? body : Array.isArray(object.events) ? object.events : Array.isArray(object.items) ? object.items : [object];
  if (!items.length || items.length > 100 || items.some(x => !x || typeof x !== "object" || Array.isArray(x))) throw new Error("INVALID_EVENT_BATCH");
  const key = request.headers.get("x-idempotency-key") || request.headers.get("idempotency-key") || object.idempotency_key || null;
  if (key !== null && (typeof key !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(key))) throw new Error("INVALID_IDEMPOTENCY_KEY");
  return { items, key: key as string | null };
}
