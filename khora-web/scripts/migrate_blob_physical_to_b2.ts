/**
 * Complete non-destructive physical inventory and byte-preserving copy of Vercel Blob to KHORA B2.
 * Dry-run is default. Applying requires --apply --confirm=KHORA_BLOB_PHYSICAL_TO_B2.
 * Does not update Neon references and never deletes or overwrites a Blob source.
 */
import { createHash, randomUUID } from "node:crypto";
import { get as getVercelBlob, list as listVercelBlobs } from "@vercel/blob";
import { Pool } from "pg";
import { legacyBlobUrl } from "../lib/storage/object-reference";
import { inspectB2ReadOnly, putBlobMigrationManifest, putMigratedBlobObject } from "../lib/server/object-storage";

const CONFIRM = "KHORA_BLOB_PHYSICAL_TO_B2";
const PAGE_SIZE = 1000;
const MAX_PAGES = 10_000;
const MAX_OBJECT_BYTES = 512 * 1024 * 1024;
const DEFAULT_CONCURRENCY = 2;

type PhysicalBlob = { url: string; pathname: string; size: number; uploadedAt: string; etag: string | null };
type ReferenceInfo = { occurrences: number; kinds: Set<string> };
type ReferenceIndex = { byUrl: Map<string, ReferenceInfo>; distinctUrls: number; occurrences: number };
type ManifestEntry = {
  sourceUrlSha256: string; sourcePathSha256: string; sourceSize: number; sourceSha256: string | null;
  sourceEtag: string | null; contentType: string | null; isKhc1Envelope: boolean | null;
  referenceOccurrences: number; referenceKinds: string[]; destinationUrl: string | null;
  destinationSha256: string | null; status: "copied_verified" | "already_verified" | "dry_run" | "failed";
  errorCode: string | null;
};
type Summary = {
  mode: "dry-run" | "apply"; runId: string; inventoryComplete: boolean; copyComplete: boolean;
  inventoryPages: number; physicalBlobObjects: number; distinctDatabaseBlobUrls: number;
  databaseReferenceOccurrences: number; physicalObjectsWithReferences: number;
  physicalObjectsWithoutReferences: number; databaseUrlsMissingFromPhysicalInventory: number;
  selectedForThisRun: number; sourceReadAndHashed: number; copiedAndVerified: number;
  alreadyPresentAndVerified: number; failed: number; errors: Record<string, number>; manifestUrl: string | null;
};

function arg(name: string): string | undefined {
  const prefix = "--" + name + "=";
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}
function flag(name: string): boolean { return process.argv.includes("--" + name); }
function sha256(value: Buffer | string): string { return createHash("sha256").update(value).digest("hex"); }
function safeErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/suspend/i.test(message)) return "blob_store_suspended";
  if (/403|forbidden|blocked/i.test(message)) return "blob_read_forbidden";
  if (/429|rate.?limit/i.test(message)) return "blob_service_rate_limited";
  return /^[a-z0-9_:-]{1,80}$/i.test(message) ? message : "migration_unexpected_error";
}
function addError(summary: Summary, code: string): void { summary.errors[code] = (summary.errors[code] || 0) + 1; }
function makeRunId(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "") + "-" + randomUUID();
}
function readInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || (name === "limit" && parsed === 0)) {
    throw new Error("migration_" + name + "_invalid");
  }
  return parsed;
}
function blobAccess(url: string): "private" | "public" {
  return new URL(url).hostname.toLowerCase().includes(".private.blob.") ? "private" : "public";
}

async function listEveryBlob(): Promise<{ blobs: PhysicalBlob[]; pages: number }> {
  const found = new Map<string, PhysicalBlob>();
  let cursor: string | undefined;
  let pages = 0;
  do {
    const page = await listVercelBlobs({ limit: PAGE_SIZE, cursor });
    for (const blob of page.blobs || []) {
      if (typeof blob.url !== "string" || !legacyBlobUrl(blob.url)
        || typeof blob.pathname !== "string" || !Number.isSafeInteger(Number(blob.size)) || Number(blob.size) < 0) {
        throw new Error("blob_inventory_entry_invalid");
      }
      const item: PhysicalBlob = {
        url: blob.url, pathname: blob.pathname, size: Number(blob.size),
        uploadedAt: blob.uploadedAt instanceof Date ? blob.uploadedAt.toISOString() : new Date(blob.uploadedAt).toISOString(),
        etag: typeof blob.etag === "string" ? blob.etag : null,
      };
      const prior = found.get(item.url);
      if (prior && (prior.pathname !== item.pathname || prior.size !== item.size)) {
        throw new Error("blob_inventory_duplicate_conflict");
      }
      found.set(item.url, item);
    }
    pages += 1;
    if (pages > MAX_PAGES) throw new Error("blob_inventory_page_limit");
    if (page.hasMore && (!page.cursor || page.cursor === cursor)) throw new Error("blob_inventory_cursor_invalid");
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return { blobs: [...found.values()].sort((a, b) => a.url.localeCompare(b.url)), pages };
}

async function loadReferenceIndex(): Promise<ReferenceIndex> {
  const connectionString = process.env.KHORA_READONLY_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("database_readonly_connection_required");
  const pool = new Pool({
    connectionString, max: 1, connectionTimeoutMillis: 15_000, statement_timeout: 120_000,
    application_name: "khora-blob-b2-physical-inventory-readonly",
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const sql = [
      "WITH refs AS (",
      " SELECT blob_url AS source_url, 'dictado_audio_parte'::text AS ref_kind FROM dictado_audio_parte WHERE blob_url IS NOT NULL",
      " UNION ALL SELECT blob_url, 'dictado_mp3' FROM dictado_mp3 WHERE blob_url IS NOT NULL",
      " UNION ALL SELECT blob_url, 'dictado_mp3_historial' FROM dictado_mp3_historial WHERE blob_url IS NOT NULL",
      " UNION ALL SELECT audio_url, 'volcado.audio_url' FROM volcado WHERE audio_url IS NOT NULL",
      " UNION ALL SELECT elem->>'url', 'volcado.audio_partes'",
      " FROM volcado v CROSS JOIN LATERAL jsonb_array_elements(",
      "   CASE WHEN jsonb_typeof(v.audio_partes)='array' THEN v.audio_partes ELSE '[]'::jsonb END",
      " ) elem WHERE elem->>'url' IS NOT NULL",
      ")",
      "SELECT source_url, ref_kind, count(*)::bigint AS occurrences",
      "FROM refs WHERE source_url LIKE 'https://%.blob.vercel-storage.com/%'",
      "GROUP BY source_url, ref_kind ORDER BY source_url, ref_kind",
    ].join("\n");
    const result = await client.query(sql);
    await client.query("COMMIT");
    const byUrl = new Map<string, ReferenceInfo>();
    let occurrences = 0;
    for (const row of result.rows as Array<{source_url:string;ref_kind:string;occurrences:string|number}>) {
      if (!legacyBlobUrl(row.source_url)) continue;
      const count = Number(row.occurrences);
      if (!Number.isSafeInteger(count) || count < 1) throw new Error("database_reference_count_invalid");
      let ref = byUrl.get(row.source_url);
      if (!ref) { ref = { occurrences: 0, kinds: new Set<string>() }; byUrl.set(row.source_url, ref); }
      ref.occurrences += count;
      ref.kinds.add(row.ref_kind);
      occurrences += count;
    }
    return { byUrl, distinctUrls: byUrl.size, occurrences };
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    throw new Error("database_reference_inventory_failed");
  } finally {
    client.release();
    await pool.end();
  }
}

async function readSourceBlob(item: PhysicalBlob): Promise<{bytes:Buffer;contentType:string|null}> {
  const result = await getVercelBlob(item.url, { access: blobAccess(item.url) });
  if (!result || result.statusCode !== 200 || !result.stream) throw new Error("blob_source_read_failed");
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (bytes.length !== item.size) throw new Error("blob_source_size_mismatch");
  return { bytes, contentType: typeof result.blob.contentType === "string" ? result.blob.contentType : null };
}

async function processBlob(item:PhysicalBlob,refs:ReferenceInfo|undefined,apply:boolean,summary:Summary):Promise<ManifestEntry> {
  const sourceUrlSha256 = sha256(item.url), sourcePathSha256 = sha256(item.pathname);
  let sourceSha:string|null=null, contentType:string|null=null, isKhc1Envelope:boolean|null=null;
  try {
    if (item.size > MAX_OBJECT_BYTES) throw new Error("migration_object_size_unsupported");
    const source = await readSourceBlob(item);
    summary.sourceReadAndHashed += 1;
    sourceSha = sha256(source.bytes);
    contentType = source.contentType;
    isKhc1Envelope = source.bytes.subarray(0,4).toString("ascii") === "KHC1";
    if (!apply) {
      return {sourceUrlSha256,sourcePathSha256,sourceSize:source.bytes.length,sourceSha256:sourceSha,sourceEtag:item.etag,
        contentType,isKhc1Envelope,referenceOccurrences:refs?.occurrences||0,referenceKinds:refs?[...refs.kinds].sort():[],
        destinationUrl:null,destinationSha256:null,status:"dry_run",errorCode:null};
    }
    const stored=await putMigratedBlobObject(sourceUrlSha256,source.bytes,contentType||"application/octet-stream");
    if(stored.bytes!==source.bytes.length||stored.sha256!==sourceSha)throw new Error("migration_destination_readback_mismatch");
    if(stored.reused)summary.alreadyPresentAndVerified+=1;else summary.copiedAndVerified+=1;
    return {sourceUrlSha256,sourcePathSha256,sourceSize:source.bytes.length,sourceSha256:sourceSha,sourceEtag:item.etag,
      contentType,isKhc1Envelope,referenceOccurrences:refs?.occurrences||0,referenceKinds:refs?[...refs.kinds].sort():[],
      destinationUrl:stored.url,destinationSha256:stored.sha256,status:stored.reused?"already_verified":"copied_verified",errorCode:null};
  } catch(error) {
    summary.failed+=1;
    const code=safeErrorCode(error);addError(summary,code);
    return {sourceUrlSha256,sourcePathSha256,sourceSize:item.size,sourceSha256:sourceSha,sourceEtag:item.etag,
      contentType,isKhc1Envelope,referenceOccurrences:refs?.occurrences||0,referenceKinds:refs?[...refs.kinds].sort():[],
      destinationUrl:null,destinationSha256:null,status:"failed",errorCode:code};
  }
}

async function runPool<T>(items:T[],concurrency:number,worker:(item:T,index:number)=>Promise<void>):Promise<void> {
  let next=0;
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
    while(true){const index=next++;if(index>=items.length)return;await worker(items[index],index);}
  }));
}

async function main():Promise<void> {
  const apply=flag("apply");
  const metadataOnly=flag("metadata-only");
  const sourceProbe=flag("source-probe");
  if(metadataOnly&&sourceProbe)throw new Error("migration_probe_mode_conflict");
  if((metadataOnly||sourceProbe)&&apply)throw new Error("migration_probe_cannot_apply");
  if(apply&&arg("confirm")!==CONFIRM)throw new Error("apply_requires_confirm_flag");
  if(!process.env.BLOB_READ_WRITE_TOKEN&&!process.env.VERCEL_OIDC_TOKEN)throw new Error("vercel_blob_authentication_required");
  const offset=readInt(arg("offset"),0,"offset");
  const limit=readInt(arg("limit"),Number.MAX_SAFE_INTEGER,"limit");
  const concurrency=readInt(arg("concurrency"),DEFAULT_CONCURRENCY,"concurrency");
  if(concurrency<1||concurrency>4)throw new Error("migration_concurrency_invalid");
  const runId=arg("run-id")||makeRunId();
  if(!/^[0-9]{8}T[0-9]{6}Z-[0-9a-f-]{36}$/i.test(runId))throw new Error("migration_run_id_invalid");

  const summary:Summary={
    mode:apply?"apply":"dry-run",runId,inventoryComplete:false,copyComplete:false,inventoryPages:0,
    physicalBlobObjects:0,distinctDatabaseBlobUrls:0,databaseReferenceOccurrences:0,
    physicalObjectsWithReferences:0,physicalObjectsWithoutReferences:0,databaseUrlsMissingFromPhysicalInventory:0,
    selectedForThisRun:0,sourceReadAndHashed:0,copiedAndVerified:0,alreadyPresentAndVerified:0,failed:0,errors:{},manifestUrl:null,
  };
  const storage=apply?await inspectB2ReadOnly():null;
  if(apply&&(!storage?.accountVerified||!storage.masterKeyVerified||!storage.bucketVerified||!storage.bucketPrivate||!storage.sseB2)){
    throw new Error("migration_b2_preflight_failed");
  }

  const inventory=await listEveryBlob();
  summary.inventoryPages=inventory.pages;
  summary.physicalBlobObjects=inventory.blobs.length;
  if(metadataOnly){
    const totalBytes=inventory.blobs.reduce((sum,item)=>sum+item.size,0);
    process.stdout.write(JSON.stringify({mode:"metadata-only",inventoryPages:inventory.pages,
      physicalBlobObjects:inventory.blobs.length,totalBytes,storeAccess:"not inferred from URLs",
      sourceWrites:0,destinationWrites:0,neonWrites:0},null,2)+"\\n");
    return;
  }
  if(sourceProbe){
    const selectedProbe=inventory.blobs.slice(offset,offset+limit);
    const errors:Record<string,number>={};
    let sourceRead=0,sourceBytes=0;
    await runPool(selectedProbe,concurrency,async(item)=>{
      try{const data=await readSourceBlob(item);sourceRead+=1;sourceBytes+=data.bytes.length;sha256(data.bytes);}
      catch(error){const code=safeErrorCode(error);errors[code]=(errors[code]||0)+1;}
    });
    process.stdout.write(JSON.stringify({mode:"source-probe",inventoryPages:inventory.pages,
      physicalBlobObjects:inventory.blobs.length,offset,selected:selectedProbe.length,
      sourceRead,sourceReadFailed:selectedProbe.length-sourceRead,sourceBytes,errors,
      sourceWrites:0,destinationWrites:0,neonWrites:0},null,2)+"\\n");
    return;
  }
  const referenceIndex=await loadReferenceIndex();
  summary.distinctDatabaseBlobUrls=referenceIndex.distinctUrls;
  summary.databaseReferenceOccurrences=referenceIndex.occurrences;
  const physicalUrls=new Set(inventory.blobs.map(item=>item.url));
  summary.physicalObjectsWithReferences=inventory.blobs.filter(item=>referenceIndex.byUrl.has(item.url)).length;
  summary.physicalObjectsWithoutReferences=summary.physicalBlobObjects-summary.physicalObjectsWithReferences;
  summary.databaseUrlsMissingFromPhysicalInventory=[...referenceIndex.byUrl.keys()].filter(url=>!physicalUrls.has(url)).length;

  const selected=inventory.blobs.slice(offset,offset+limit);
  summary.selectedForThisRun=selected.length;
  const entries:ManifestEntry[]=new Array(selected.length);
  await runPool(selected,concurrency,async(item,index)=>{entries[index]=await processBlob(item,referenceIndex.byUrl.get(item.url),apply,summary);});

  summary.inventoryComplete=summary.failed===0&&summary.databaseUrlsMissingFromPhysicalInventory===0
    &&offset===0&&selected.length===inventory.blobs.length;
  summary.copyComplete=apply&&summary.inventoryComplete
    &&summary.copiedAndVerified+summary.alreadyPresentAndVerified===inventory.blobs.length;

  if(apply){
    const manifest={
      schema:"khora-blob-b2-physical-manifest/v1",runId,generatedAt:new Date().toISOString(),source:"Vercel Blob",
      destination:{provider:"Backblaze B2",bucket:"KHORA private bucket",verifiedBy:"native B2 GET read-back / SHA-256 / byte length"},
      inventory:{
        pages:summary.inventoryPages,physicalObjects:summary.physicalBlobObjects,databaseBlobUrls:summary.distinctDatabaseBlobUrls,
        databaseReferenceOccurrences:summary.databaseReferenceOccurrences,referencedPhysicalObjects:summary.physicalObjectsWithReferences,
        unreferencedPhysicalObjects:summary.physicalObjectsWithoutReferences,
        databaseUrlsMissingFromPhysicalInventory:summary.databaseUrlsMissingFromPhysicalInventory,
        offset,selected:summary.selectedForThisRun,inventoryComplete:summary.inventoryComplete,copyComplete:summary.copyComplete,
      },
      objects:entries,originals:"retained; no delete or overwrite operation is performed",
    };
    try{
      const stored=await putBlobMigrationManifest(runId,Buffer.from(JSON.stringify(manifest),"utf8"));
      summary.manifestUrl=stored.url;
    }catch{
      summary.failed+=1;addError(summary,"migration_manifest_write_failed");summary.copyComplete=false;
    }
  }
  process.stdout.write(JSON.stringify(summary,null,2)+"\n");
  if(summary.failed>0||summary.databaseUrlsMissingFromPhysicalInventory>0||(apply&&!summary.copyComplete))process.exitCode=2;
}

main().catch(error=>{
  process.stderr.write(JSON.stringify({error:safeErrorCode(error)})+"\n");
  process.exitCode=1;
});
