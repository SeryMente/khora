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
  const bytes=await blob.arrayBuffer();const sha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
  await save(owner, `audio:${sessionId}:${part}`, bytes, { ...meta, kind:"audio",sessionId,part,mime:blob.type,bytes:blob.size,sha256 });
}
export async function recuperarLocal(owner: string): Promise<{ snapshots: CapturaSnapshot[]; audios: { sessionId: string; part: number; blob: Blob; meta: any }[] }> {
  const db = await open();
  try {
    const rows: any[] = await new Promise((resolve, reject) => { const r = db.transaction("records").objectStore("records").getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const result: { snapshots: CapturaSnapshot[]; audios: { sessionId: string; part: number; blob: Blob; meta: any }[] } = { snapshots: [], audios: [] };
    const k = await key(db, owner);
    const closed = new Set(rows.filter(r=>r.owner===owner&&r.kind==="archived_snapshot").map(r=>r.sessionId));
    for (const row of rows.filter(r => r.owner === owner && ["snapshot","revision","audio"].includes(r.kind))) {
      const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: row.iv, additionalData: new TextEncoder().encode(owner + ":" + row.id) }, k, row.data);
      if (row.kind === "snapshot" || row.kind === "revision") result.snapshots.push(JSON.parse(new TextDecoder().decode(bytes)));
      else if(row.kind==="audio"&&row.sha256&&Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("")!==row.sha256)throw Error("local_audio_integrity");
      else if (row.kind === "audio") result.audios.push({ sessionId: row.sessionId, part: row.part, blob: new Blob([bytes], { type: row.mime }), meta: row });
    }
    result.snapshots=result.snapshots.filter(s=>!closed.has(s.sessionId));
    result.snapshots.sort((a,b) => b.clientAt - a.clientAt); return result;
  } finally { db.close(); }
}
/** ACKs annotate retention; neither function erases ciphertext or audio. */
async function annotate(owner:string,id:string,meta:Record<string,unknown>):Promise<void>{
 const db=await open();try{await new Promise<void>((resolve,reject)=>{
  const t=db.transaction("records","readwrite"),store=t.objectStore("records"),q=store.get(owner+":"+id);
  q.onsuccess=()=>{if(q.result)store.put({...q.result,...meta},owner+":"+id);};
  t.oncomplete=()=>resolve();t.onabort=()=>reject(t.error||Error("local_annotation_aborted"));t.onerror=()=>reject(t.error);
 });}finally{db.close();}
}
export async function confirmarAudioLocal(owner:string,sessionId:string,part:number):Promise<void>{
 await annotate(owner,`audio:${sessionId}:${part}`,{remoteConfirmedAt:Date.now()});
}
export async function cerrarSnapshotLocal(owner:string,sessionId:string):Promise<void>{
 await annotate(owner,"snapshot:"+sessionId,{kind:"archived_snapshot",sessionId,sealedAt:Date.now()});
}

export type IntencionEditorialLocal = {
  sessionId: string;
  intent: import("../custodia/editorial").PublicationIntent;
  receipt?: {volcado_id:string;version:number;sha256:string};
  draft?: {title:string;body:string;date:string;obfuscated:boolean};
  request?: import("../custodia/editorial").RevisionEditorial;
  prepared?: {digest:string};
  obfuscatedExposure?:boolean;
};
const editorialWrites=new Map<string,Promise<void>>();
export async function guardarIntencionEditorialLocal(owner:string, value:IntencionEditorialLocal):Promise<void> {
  const id=owner+":"+value.sessionId;
  const next=(editorialWrites.get(id)||Promise.resolve()).catch(()=>undefined).then(async()=>{
    const previous=(await recuperarIntencionesEditorialesLocal(owner)).find(x=>x.sessionId===value.sessionId&&x.intent.publicationId===value.intent.publicationId);
    const merged={...previous,...value,draft:previous?.draft||value.draft};
    await save(owner,"publication:"+value.sessionId,new TextEncoder().encode(JSON.stringify(merged)).buffer,{kind:"publication",at:Date.now()});
  });
  editorialWrites.set(id,next);
  try{await next;}finally{if(editorialWrites.get(id)===next)editorialWrites.delete(id);}
}
export async function recuperarIntencionesEditorialesLocal(owner:string):Promise<IntencionEditorialLocal[]> {
  if(!owner)throw Error("local_owner_not_ready");
  const db=await open();
  try {
    const rows:any[]=await new Promise((resolve,reject)=>{const q=db.transaction("records").objectStore("records").getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
    const k=await key(db,owner); const result:IntencionEditorialLocal[]=[];
    for(const row of rows.filter(r=>r.owner===owner&&r.kind==="publication")) {
      const bytes=await crypto.subtle.decrypt({name:"AES-GCM",iv:row.iv,additionalData:new TextEncoder().encode(owner+":"+row.id)},k,row.data);
      result.push(JSON.parse(new TextDecoder().decode(bytes)));
    }
    return result;
  } finally {db.close();}
}
