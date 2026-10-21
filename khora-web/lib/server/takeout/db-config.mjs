/** Dedicated Takeout PostgreSQL configuration. Does not connect, migrate, read
 * production secrets or alter the shared getDb. Do not log the returned config.
 * Stronger TLS than sslmode=require; no localhost/plaintext fallback.
 */
import {TransferError} from './transfer.mjs';
const stop=()=>{throw new TransferError('TAKEOUT_DB_CONFIGURATION_REJECTED')};
export function takeoutDbConfig(connectionString){
 if(typeof connectionString!=='string'||connectionString.length>8192||/[\x00-\x20\x7f]/.test(connectionString))stop();
 let u;try{u=new URL(connectionString)}catch{stop()}
 if(!['postgres:','postgresql:'].includes(u.protocol)||!u.username||!u.password||u.hash||!u.pathname||u.pathname==='/'||!u.hostname.endsWith('.neon.tech')||!/^[a-z0-9.-]+\.neon\.tech$/.test(u.hostname)||u.hostname.split('.').some(x=>!x||x==='-'||x.startsWith('-')||x.endsWith('-'))||(u.port&&u.port!=='5432'))stop();
 // pg replaces the entire ssl object when these URL options are present.
 // Only remove a recognized sslmode because it is upgraded to verified TLS.
 // Custom certificate paths, weaker options, duplicate options and unsupported
 // channel_binding=require are rejected, not silently downgraded.
 const keys=[...u.searchParams.keys()];
 if(new Set(keys).size!==keys.length||keys.some(k=>k!=='sslmode'))stop();
 if(u.searchParams.has('sslmode')&&!['require','verify-ca','verify-full'].includes(u.searchParams.get('sslmode')))stop();
 u.searchParams.delete('sslmode');
 return {
  connectionString:u.toString(),ssl:{rejectUnauthorized:true,servername:u.hostname},
  max:2,connectionTimeoutMillis:8000,idleTimeoutMillis:10000,
  query_timeout:20000,statement_timeout:20000,application_name:'khora-takeout',
  allowExitOnIdle:true
 };
}
