import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { cifrarBytes, descifrarBytes } from "@/lib/server/cripto";
import { takeoutDbConfig } from "./db-config.mjs";
import { createAuthTransactionStore } from "./auth-store.mjs";
import { refreshDriveAuthorization, DRIVE_SCOPE } from "./google-auth.mjs";
import { bindTakeoutStore } from "./b2-store";
import type { TransferReceipt } from "./transfer.mjs";

const ownerHash = (owner: string) => createHash("sha256").update(owner).digest("hex");
const sourceHash = (id: string) => createHash("sha256").update(id).digest("hex");
let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

function db() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("TAKEOUT_DB_NOT_CONFIGURED");
    pool = new Pool(takeoutDbConfig(url));
  }
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS khora_takeout_oauth_transactions (
 owner_hash text NOT NULL, state_hash text NOT NULL, sealed bytea NOT NULL,
 expires_at_ms bigint NOT NULL, PRIMARY KEY(owner_hash,state_hash));
CREATE TABLE IF NOT EXISTS khora_takeout_google_grants (
 owner_hash text PRIMARY KEY, sealed bytea NOT NULL, revision bigint NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS khora_takeout_jobs (
 id uuid PRIMARY KEY, owner_hash text NOT NULL, source_hash text NOT NULL,
 status text NOT NULL, phase text NOT NULL, active boolean NOT NULL DEFAULT true,
 sealed bytea NOT NULL, version bigint NOT NULL DEFAULT 1, run_id text,
 error_code text, cancel_requested boolean NOT NULL DEFAULT false,
 lease_owner uuid, lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS khora_takeout_jobs_one_active_source
 ON khora_takeout_jobs(owner_hash,source_hash) WHERE active;
CREATE INDEX IF NOT EXISTS khora_takeout_jobs_owner_created
 ON khora_takeout_jobs(owner_hash,created_at DESC);
CREATE TABLE IF NOT EXISTS khora_takeout_sources (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES khora_takeout_jobs(id) ON DELETE RESTRICT,
 owner_hash text NOT NULL, entry_index integer NOT NULL, sealed bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,entry_index));
CREATE INDEX IF NOT EXISTS khora_takeout_sources_job ON khora_takeout_sources(job_id,entry_index);
DELETE FROM khora_takeout_oauth_transactions WHERE expires_at_ms <= (extract(epoch from now())*1000)::bigint;
`;

export async function ensureTakeoutSchema() {
  if (!schemaReady) schemaReady = db().query(SCHEMA).then(() => undefined).catch((e) => { schemaReady = undefined; throw e; });
  return schemaReady;
}

export function googleConfig() {
  const clientId = process.env.TAKEOUT_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.TAKEOUT_GOOGLE_CLIENT_SECRET || "";
  const allowedOrigin = process.env.TAKEOUT_ALLOWED_ORIGIN || "https://khora-web.vercel.app";
  return { clientId, clientSecret, allowedOrigin, redirectUri: `${allowedOrigin}/api/takeout/google/callback` };
}

function seal(kind: string, owner: string, id: string, value: unknown) {
  return cifrarBytes(Buffer.from(JSON.stringify({ v: 1, kind, owner, id, value }), "utf8"));
}
function open<T>(sealed: Buffer, kind: string, id: string, expectedOwner?: string): { owner: string; value: T } {
  if (!Buffer.isBuffer(sealed) || sealed.length < 33 || sealed.subarray(0, 4).toString("ascii") !== "KHC1") throw new Error("TAKEOUT_ENVELOPE_INVALID");
  let parsed: { v: number; kind: string; owner: string; id: string; value: T };
  try { parsed = JSON.parse(descifrarBytes(sealed).toString("utf8")); } catch { throw new Error("TAKEOUT_ENVELOPE_INVALID"); }
  if (parsed?.v !== 1 || parsed.kind !== kind || parsed.id !== id || typeof parsed.owner !== "string" || (expectedOwner && parsed.owner !== expectedOwner)) throw new Error("TAKEOUT_BINDING_INVALID");
  return { owner: parsed.owner, value: parsed.value };
}

export function authTransactionStore(owner: string) {
  return createAuthTransactionStore({
    query: (text: string, values: unknown[]) => db().query(text, values),
    encrypt: async (value: Buffer) => cifrarBytes(value), decrypt: async (value: Buffer) => descifrarBytes(value),
    authorize: async (candidate: string) => candidate === owner,
  });
}

export type StoredGrant = { owner: string; scope: typeof DRIVE_SCOPE; client_id: string; access_token: string; expires_at: number; refresh_token: string };
export async function saveGrant(owner: string, grant: Omit<StoredGrant, "owner" | "client_id"> & Partial<Pick<StoredGrant,"client_id">>) {
  await ensureTakeoutSchema();
  const value: StoredGrant = { ...grant, owner, client_id: googleConfig().clientId } as StoredGrant;
  if (value.scope !== DRIVE_SCOPE || !value.refresh_token || !value.access_token) throw new Error("TAKEOUT_GRANT_INVALID");
  await db().query(`INSERT INTO khora_takeout_google_grants(owner_hash,sealed,revision,updated_at) VALUES($1,$2,1,now())
    ON CONFLICT(owner_hash) DO UPDATE SET sealed=EXCLUDED.sealed,revision=khora_takeout_google_grants.revision+1,updated_at=now()`, [ownerHash(owner), seal("google_grant", owner, ownerHash(owner), value)]);
}
export async function loadGrant(owner: string): Promise<{ grant: StoredGrant; revision: number } | null> {
  await ensureTakeoutSchema();
  const r = await db().query("SELECT sealed,revision FROM khora_takeout_google_grants WHERE owner_hash=$1", [ownerHash(owner)]);
  if (r.rowCount !== 1) return null;
  const value = open<StoredGrant>(r.rows[0].sealed, "google_grant", ownerHash(owner), owner).value;
  return { grant: value, revision: Number(r.rows[0].revision) };
}
async function freshGrant(owner: string) {
  for (let attempt=0; attempt<3; attempt++) {
    const current = await loadGrant(owner); if (!current) throw new Error("TAKEOUT_GOOGLE_NOT_CONNECTED");
    if (current.grant.expires_at > Date.now()+60_000) return current.grant;
    const next = await refreshDriveAuthorization({ owner, grant: { owner, scope: current.grant.scope, client_id: current.grant.client_id, refresh_token: current.grant.refresh_token }, config: googleConfig() });
    const value: StoredGrant = { owner, client_id: googleConfig().clientId, ...next };
    const updated = await db().query("UPDATE khora_takeout_google_grants SET sealed=$1,revision=revision+1,updated_at=now() WHERE owner_hash=$2 AND revision=$3 RETURNING revision", [seal("google_grant", owner, ownerHash(owner), value), ownerHash(owner), current.revision]);
    if (updated.rowCount === 1) return value;
  }
  throw new Error("TAKEOUT_GRANT_REFRESH_CONFLICT");
}
export const getFreshAccessToken = async (owner: string) => (await freshGrant(owner)).access_token;

export type JobState = { owner: string; receipt: TransferReceipt; verifyCheckpoint: unknown | null; parseCursor: unknown | null; sourceCount: number; extractedBytes: number };
export type PublicJob = { id: string; status: string; phase: string; error: string | null; runId: string | null; createdAt: string; updatedAt: string; progress: { bytes: number; total: number; entries: number } };
const maxArchiveBytes = () => {
  const n = Number(process.env.TAKEOUT_MAX_ARCHIVE_BYTES || 512*1024*1024);
  return Number.isSafeInteger(n) && n > 0 && n <= 50*1024**3 ? n : 512*1024*1024;
};
export const takeoutArchiveLimit = maxArchiveBytes;

export async function createJob(owner: string, receipt: TransferReceipt) {
  await ensureTakeoutSchema();
  if (receipt.owner !== owner || receipt.size > maxArchiveBytes()) throw new Error("TAKEOUT_ZERO_COST_SIZE_LIMIT");
  const id = receipt.job_id;
  const state: JobState = { owner, receipt, verifyCheckpoint: null, parseCursor: null, sourceCount: 0, extractedBytes: 0 };
  try {
    await db().query(`INSERT INTO khora_takeout_jobs(id,owner_hash,source_hash,status,phase,sealed) VALUES($1,$2,$3,'queued','transfer',$4)`, [id, ownerHash(owner), sourceHash(receipt.file_id), seal("job", owner, id, state)]);
    return { id, existing: false };
  } catch (e: any) {
    if (e?.code !== "23505") throw e;
    const r=await db().query("SELECT id FROM khora_takeout_jobs WHERE owner_hash=$1 AND source_hash=$2 AND active=true",[ownerHash(owner),sourceHash(receipt.file_id)]);
    if(r.rowCount!==1)throw e; return { id:String(r.rows[0].id), existing:true };
  }
}
export async function attachRun(owner: string, id: string, runId: string) {
  const r=await db().query("UPDATE khora_takeout_jobs SET run_id=$1,status='running',updated_at=now() WHERE id=$2 AND owner_hash=$3 AND run_id IS NULL RETURNING id",[runId,id,ownerHash(owner)]);
  return r.rowCount===1;
}
export async function failJobStart(owner:string,id:string){await db().query("UPDATE khora_takeout_jobs SET status='failed',phase='failed',active=false,error_code='WORKFLOW_START_FAILED',updated_at=now() WHERE id=$1 AND owner_hash=$2 AND run_id IS NULL",[id,ownerHash(owner)]);}

function publicJob(row:any,state:JobState):PublicJob{return {id:String(row.id),status:row.status,phase:row.phase,error:row.error_code||null,runId:row.run_id||null,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString(),progress:{bytes:state.receipt.next_offset,total:state.receipt.size,entries:state.sourceCount}};}
export async function listJobs(owner:string){await ensureTakeoutSchema();const r=await db().query("SELECT * FROM khora_takeout_jobs WHERE owner_hash=$1 ORDER BY created_at DESC LIMIT 50",[ownerHash(owner)]);return r.rows.map((row:any)=>publicJob(row,open<JobState>(row.sealed,"job",String(row.id),owner).value));}
export async function getJob(owner:string,id:string){await ensureTakeoutSchema();const r=await db().query("SELECT * FROM khora_takeout_jobs WHERE id=$1 AND owner_hash=$2",[id,ownerHash(owner)]);if(r.rowCount!==1)return null;const row=r.rows[0],state=open<JobState>(row.sealed,"job",id,owner).value;const s=await db().query("SELECT id,entry_index,sealed FROM khora_takeout_sources WHERE job_id=$1 AND owner_hash=$2 ORDER BY entry_index LIMIT 1000",[id,ownerHash(owner)]);return {job:publicJob(row,state),sources:s.rows.map((x:any)=>({id:String(x.id),...open<any>(x.sealed,"source",String(x.id),owner).value,text:undefined}))};}
export async function getSource(owner:string,id:string){await ensureTakeoutSchema();const r=await db().query("SELECT sealed FROM khora_takeout_sources WHERE id=$1 AND owner_hash=$2",[id,ownerHash(owner)]);return r.rowCount===1?{id,...open<any>(r.rows[0].sealed,"source",id,owner).value}:null;}
export async function reviewSource(owner:string,id:string,decision:"retained_for_triage"|"dismissed") {await ensureTakeoutSchema();const c=await db().connect();try{await c.query("BEGIN");const r=await c.query("SELECT sealed FROM khora_takeout_sources WHERE id=$1 AND owner_hash=$2 FOR UPDATE",[id,ownerHash(owner)]);if(r.rowCount!==1){await c.query("ROLLBACK");return false;}const value=open<any>(r.rows[0].sealed,"source",id,owner).value;value.review={decision,actor:owner,at:new Date().toISOString()};await c.query("UPDATE khora_takeout_sources SET sealed=$1,updated_at=now() WHERE id=$2",[seal("source",owner,id,value),id]);await c.query("COMMIT");return true;}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}}
export async function cancelJob(owner:string,id:string){await ensureTakeoutSchema();const r=await db().query("UPDATE khora_takeout_jobs SET cancel_requested=true,status=CASE WHEN status IN ('completed','failed','canceled') THEN status ELSE 'canceling' END,updated_at=now() WHERE id=$1 AND owner_hash=$2 RETURNING id",[id,ownerHash(owner)]);return r.rowCount===1;}

async function claimJob(id:string){await ensureTakeoutSchema();const token=randomUUID();const r=await db().query(`UPDATE khora_takeout_jobs SET lease_owner=$2,lease_until=now()+interval '90 seconds',updated_at=now()
 WHERE id=$1 AND active=true AND (lease_until IS NULL OR lease_until<now()) RETURNING *`,[id,token]);if(r.rowCount!==1)return null;const row=r.rows[0],opened=open<JobState>(row.sealed,"job",id);if(ownerHash(opened.owner)!==row.owner_hash)throw new Error("TAKEOUT_BINDING_INVALID");return {token,row,state:opened.value as JobState,owner:opened.owner,version:Number(row.version)};}
async function release(id:string,token:string){await db().query("UPDATE khora_takeout_jobs SET lease_owner=NULL,lease_until=NULL WHERE id=$1 AND lease_owner=$2",[id,token]);}
async function saveClaim(claim:any,state:JobState,status:string,phase:string,active=true,error:string|null=null){const r=await db().query(`UPDATE khora_takeout_jobs SET sealed=$1,status=$2,phase=$3,active=$4,error_code=$5,version=version+1,lease_owner=NULL,lease_until=NULL,updated_at=now() WHERE id=$6 AND lease_owner=$7 AND version=$8 RETURNING version`,[seal("job",claim.owner,claim.row.id,state),status,phase,active,error,claim.row.id,claim.token,claim.version]);if(r.rowCount!==1)throw new Error("TAKEOUT_JOB_CAS_CONFLICT");}
export type StepResult={done:boolean;busy?:boolean;status:string;phase:string};
export async function processTakeoutJobStep(id:string,finalAttempt=false):Promise<StepResult>{
 const claim=await claimJob(id);if(!claim)return {done:false,busy:true,status:"running",phase:"busy"};
 try{
  const {advanceTransferChunk}=await import("./transfer.mjs");const {verifyArchiveStep,parseZipStep}=await import("./bounded-pipeline.mjs");
  if(claim.row.cancel_requested){await saveClaim(claim,claim.state,"canceled","canceled",false);return {done:true,status:"canceled",phase:"canceled"};}
  const store=bindTakeoutStore(async(owner,prefix)=>owner===claim.owner&&prefix===`khora/takeout/${ownerHash(owner)}/${id}`);
  if(claim.state.receipt.status==="transferring"){
   const token=await getFreshAccessToken(claim.owner);claim.state.receipt=await advanceTransferChunk({receipt:claim.state.receipt,owner:claim.owner,accessToken:token,store});
   const phase=claim.state.receipt.status==="downloaded"?"verify":"transfer";await saveClaim(claim,claim.state,"running",phase);return {done:false,status:"running",phase};
  }
  if(claim.state.receipt.status==="downloaded"){
   const v=await verifyArchiveStep({receipt:claim.state.receipt,owner:claim.owner,store,checkpoint:claim.state.verifyCheckpoint});claim.state.receipt=v.receipt;claim.state.verifyCheckpoint=v.checkpoint;
   const phase=v.done?"parse":"verify";await saveClaim(claim,claim.state,"running",phase);return {done:false,status:"running",phase};
  }
  const parsed=await parseZipStep({receipt:claim.state.receipt,owner:claim.owner,store,cursor:claim.state.parseCursor});
  for(const source of parsed.sources){const sid=randomUUID();const value={jobId:id,entry:source.entry,name:source.name,bytes:source.bytes,sha256:source.sha256,text:source.text,status:"private_unreviewed_text",review:null,archiveSha256:claim.state.receipt.archive_sha256};await db().query("INSERT INTO khora_takeout_sources(id,job_id,owner_hash,entry_index,sealed) VALUES($1,$2,$3,$4,$5) ON CONFLICT(job_id,entry_index) DO NOTHING",[sid,id,ownerHash(claim.owner),source.entry,seal("source",claim.owner,sid,value)]);}
  claim.state.parseCursor=parsed.cursor;claim.state.sourceCount=parsed.cursor.units;claim.state.extractedBytes=parsed.cursor.expanded;
  if(parsed.done){await saveClaim(claim,claim.state,"completed","review",false);return {done:true,status:"completed",phase:"review"};}
  await saveClaim(claim,claim.state,"running","parse");return {done:false,status:"running",phase:"parse"};
 }catch(e:any){const code=typeof e?.code==="string"?e.code:(typeof e?.message==="string"&&/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:"TAKEOUT_PROCESSING_FAILED");if(finalAttempt){try{await saveClaim(claim,claim.state,"failed","failed",false,code)}catch{await release(id,claim.token)}return {done:true,status:"failed",phase:"failed"};}await release(id,claim.token);throw new Error(code);}
}
