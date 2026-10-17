"use client";
import type { CapturaSnapshot } from "../custodia/contrato";
// Non-extractable device key, not E2E and not protection against same-origin XSS.
// IndexedDB quota/private-mode errors MUST reach the UI. Never claim durability on failure.
const DB = "khora-custodia-v1";
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("records"); r.result.createObjectStore("keys"); };
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
async function read(db: IDBDatabase, store: string, id: string): Promise<any> {
  return new Promise((resolve, reject) => { const r = db.transaction(store).objectStore(store).get(id); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
async function put(db: IDBDatabase, store: string, id: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readwrite"); t.objectStore(store).put(value, id);
    t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error || new Error("local_transaction_aborted"));
  });
}
const keyPromises = new Map<string, Promise<CryptoKey>>();
async function key(db: IDBDatabase, owner: string): Promise<CryptoKey> {
  const existing = await read(db, "keys", owner); if (existing) return existing;
  if (!keyPromises.has(owner)) keyPromises.set(owner, (async () => {
    const k = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    // add, not put: competing tabs must not replace the key protecting existing records.
    try { await new Promise<void>((resolve, reject) => { const t = db.transaction("keys", "readwrite"); t.objectStore("keys").add(k, owner); t.oncomplete = () => resolve(); t.onabort = () => reject(t.error); }); }
    catch { const winner = await read(db, "keys", owner); if (winner) return winner; throw new Error("local_key_unavailable"); }
    return k;
  })());
  return keyPromises.get(owner)!;
}
async function save(owner: string, id: string, bytes: ArrayBuffer, meta: Record<string, unknown>) {
  if (!owner) throw new Error("local_owner_not_ready");
  const db = await open();
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12)); const k = await key(db, owner);
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(owner + ":" + id) }, k, bytes);
    await put(db, "records", owner + ":" + id, { ...meta, owner, id, iv, data });
  } finally { db.close(); }
}
export async function guardarSnapshotLocal(owner: string, snapshot: CapturaSnapshot, immutableCut = false): Promise<void> {
  const bytes=new TextEncoder().encode(JSON.stringify(snapshot)).buffer;
  if(immutableCut){await save(owner,"revision:"+snapshot.sessionId+":"+snapshot.revisionId,bytes,{kind:"revision",at:snapshot.clientAt});return;}
  await save(owner, "snapshot:" + snapshot.sessionId, bytes, { kind: "snapshot", at: snapshot.clientAt });
}
export async function guardarAudioLocal(owner: string, sessionId: string, part: number, blob: Blob, meta: Record<string, unknown>): Promise<void> {
  await save(owner, `audio:${sessionId}:${part}`, await blob.arrayBuffer(), { kind: "audio", sessionId, part, mime: blob.type, ...meta });
}
export async function recuperarLocal(owner: string): Promise<{ snapshots: CapturaSnapshot[]; audios: { sessionId: string; part: number; blob: Blob; meta: any }[] }> {
  const db = await open();
  try {
    const rows: any[] = await new Promise((resolve, reject) => { const r = db.transaction("records").objectStore("records").getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const result: { snapshots: CapturaSnapshot[]; audios: { sessionId: string; part: number; blob: Blob; meta: any }[] } = { snapshots: [], audios: [] };
    const k = await key(db, owner);
    for (const row of rows.filter(r => r.owner === owner)) {
      const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: row.iv, additionalData: new TextEncoder().encode(owner + ":" + row.id) }, k, row.data);
      if (row.kind === "snapshot" || row.kind === "revision") result.snapshots.push(JSON.parse(new TextDecoder().decode(bytes)));
      else result.audios.push({ sessionId: row.sessionId, part: row.part, blob: new Blob([bytes], { type: row.mime }), meta: row });
    }
    result.snapshots.sort((a,b) => b.clientAt - a.clientAt); return result;
  } finally { db.close(); }
}
export async function confirmarAudioLocal(owner: string, sessionId: string, part: number): Promise<void> {
  const db = await open(); try { await new Promise<void>((resolve, reject) => { const t = db.transaction("records", "readwrite"); t.objectStore("records").delete(owner + `:audio:${sessionId}:${part}`); t.oncomplete = () => resolve(); t.onabort = () => reject(t.error); }); } finally { db.close(); }
}
export async function cerrarSnapshotLocal(owner: string, sessionId: string): Promise<void> {
  const db = await open(); try { await new Promise<void>((resolve, reject) => { const t = db.transaction("records", "readwrite"); t.objectStore("records").delete(owner + ":snapshot:" + sessionId); t.oncomplete = () => resolve(); t.onabort = () => reject(t.error); }); } finally { db.close(); }
}
