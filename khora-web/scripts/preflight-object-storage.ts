/** Read-only production gate: account identity and private bucket identity. */
import { inspectB2ReadOnly } from '../lib/server/object-storage';
const required=process.env.KHORA_B2_PREFLIGHT==='1';
async function main(){
 if(!required){console.log('[storage-preflight] skipped; KHORA_B2_PREFLIGHT is not enabled');return;}
 try {
  const status=await inspectB2ReadOnly();
  if(!status.accountVerified||!status.masterKeyVerified||!status.bucketVerified||!status.bucketPrivate)throw new Error('storage_b2_identity_or_privacy_check_failed');
  console.log(`[storage-preflight] native_auth=PASS master_key=PASS bucket_identity=PASS bucket_private=PASS sse_b2_default=${status.sseB2?'PASS':'NOT_ATTESTED'}`);
  console.log('[storage-preflight] read_only_gate=PASS; no objects, bucket settings, CORS rules, credentials or source data were changed');
 } catch(error) {
  const code=error instanceof Error&&/^storage_[a-z0-9_]+$/.test(error.message)?error.message:'storage_b2_readonly_preflight_failed';
  console.error(`[storage-preflight] blocked code=${code}`);throw new Error('storage_preflight_failed');
 }
}
main().catch(()=>{console.error('[storage-preflight] deployment blocked; read-only checks did not mutate B2');process.exitCode=1;});