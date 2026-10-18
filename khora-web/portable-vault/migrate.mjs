/** Explicit predeployment operation. NEVER imported/called by a request handler. */
import {candidateRuntime} from './postgres.mjs';
if(process.env.PORTABLE_VAULT_MIGRATION!=='reviewed'){
 console.error('SAFE_STOP: migration_not_authorized');process.exitCode=1;
}else{
 let runtime;
 try{runtime=candidateRuntime({authenticate:async()=>null});await runtime.initializeSchema();console.log('SCHEMA_INITIALIZED');}
 catch{console.error('SAFE_STOP: migration_failed');process.exitCode=1;}
 finally{if(runtime)await runtime.close();}
}
