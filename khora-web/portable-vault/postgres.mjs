/** Candidate only: not imported by an active Khora route. No implicit migrations. */
import pg from 'pg';
import {PgStore,VaultService,VaultError} from './core.mjs';
import {createHandler} from './http.mjs';
import {createOpeningHandler} from './bridge.mjs';
export function postgresConfig(raw){
 let url;try{url=new URL(raw);}catch{throw new VaultError('database_not_configured',503);}
 if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||url.hostname==='localhost'||url.hostname==='base')throw new VaultError('database_not_configured',503);
 // pg URL ssl flags must not silently override certificate verification.
 for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(k);
 return {connectionString:url.toString(),ssl:{rejectUnauthorized:true},max:4,connectionTimeoutMillis:8000,query_timeout:15000,statement_timeout:15000};
}
export function candidateRuntime({authenticate,env=process.env}){
 // No endpoint can use a request-supplied subject as a session substitute.
 if(typeof authenticate!=='function')throw new VaultError('trusted_session_adapter_required',503);
 const allowed=env.PORTABLE_VAULT_ALLOWED_SUBJECT;
 if(!allowed||!env.PORTABLE_VAULT_ORIGIN)throw new VaultError('identity_policy_not_configured',503);
 const key=Buffer.from(env.PORTABLE_VAULT_CUSTODY_KEY_B64||'','base64');
 if(key.length!==32)throw new VaultError('custody_key_missing',503);
 const pool=new pg.Pool(postgresConfig(env.DATABASE_URL)),store=new PgStore(pool),service=new VaultService(store,key);
 const handler=createHandler({service,origin:env.PORTABLE_VAULT_ORIGIN,enabled:env.PORTABLE_VAULT_ENABLED==='reviewed',authenticate:async req=>{
  const p=await authenticate(req);return p?.subject===allowed?p:null;
 }});
 const openingHandler=createOpeningHandler({service,origin:env.PORTABLE_VAULT_ORIGIN,enabled:env.PORTABLE_VAULT_ENABLED==='reviewed'});
 return {handler,openingHandler,initializeSchema:()=>store.initialize(),close:async()=>{await pool.end();key.fill(0);}};
}
